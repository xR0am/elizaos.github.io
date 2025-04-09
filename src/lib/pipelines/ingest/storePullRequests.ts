import { db } from "@/lib/data/db";
import {
  rawPullRequests,
  rawPullRequestFiles,
  rawCommits,
  prReviews,
  prComments,
} from "@/lib/data/schema";
import { sql } from "drizzle-orm";
import {
  ensureUsersExist,
  ensureLabelsExist,
  storePRLabels,
} from "./mutations";
import { createStep } from "../types";
import { IngestionPipelineContext } from "./context";
import { RepositoryConfig } from "@/lib/pipelines/pipelineConfig";

/**
 * Step to fetch and store pull requests for a repository
 */
export const fetchAndStorePullRequests = createStep(
  "PullRequests",
  async (
    { repository }: { repository: RepositoryConfig },
    context: IngestionPipelineContext,
  ) => {
    const { github, logger, dateRange } = context;
    const { repoId } = repository;

    // Record the ingestion start time
    logger?.info(
      `Starting PR ingestion for ${repoId}. Date range: ${dateRange?.startDate} to ${dateRange?.endDate}`,
    );

    try {
      // Fetch pull requests from GitHub
      const options = {
        startDate: dateRange?.startDate,
        endDate: dateRange?.endDate,
      };

      const prs = await github.fetchPullRequests(repository, options);
      logger?.info(`Fetched ${prs.length} PRs for ${repoId}`);

      // Filter out undefined values
      const validPRs = prs.filter(
        (pr): pr is NonNullable<typeof pr> => pr !== undefined,
      );

      if (validPRs.length === 0) {
        logger?.info(`No PRs found for ${repoId} in the specified date range`);
        return { repository, count: 0 };
      }

      logger?.debug(`Processing ${validPRs.length} valid PRs for ${repoId}`);

      // Collect all users that need to be created/updated
      const userData = new Map<string, { avatarUrl?: string }>();
      for (const pr of validPRs) {
        // PR author
        if (pr.author?.login) {
          userData.set(pr.author.login, {
            avatarUrl: pr.author.avatarUrl || undefined,
          });
        }

        // Review authors
        pr.reviews?.nodes?.forEach((review) => {
          if (review.author?.login) {
            userData.set(review.author.login, {
              avatarUrl: review.author.avatarUrl || undefined,
            });
          }
        });

        // Comment authors
        pr.comments?.nodes?.forEach((comment) => {
          if (comment.author?.login) {
            userData.set(comment.author.login, {
              avatarUrl: comment.author.avatarUrl || undefined,
            });
          }
        });

        // Commit authors
        pr.commits?.nodes?.forEach((node) => {
          if (node.commit.author.user?.login) {
            userData.set(node.commit.author.user.login, {
              avatarUrl: node.commit.author.user.avatarUrl || undefined,
            });
          }
        });
      }

      logger?.debug(`Ensuring ${userData.size} users exist in the database...`);
      // Ensure all users exist in a single batch operation
      await ensureUsersExist(userData, context.config.botUsers);

      // Process all labels first
      const allLabels = validPRs.flatMap((pr) => pr.labels?.nodes || []);
      logger?.debug(`Processing ${allLabels.length} labels...`);
      await ensureLabelsExist(allLabels);

      // Batch insert PRs
      if (validPRs.length > 0) {
        logger?.debug(`Storing ${validPRs.length} PRs in the database...`);
        const prsToInsert = validPRs.map((pr) => ({
          id: pr.id,
          number: pr.number,
          title: pr.title,
          body: pr.body ?? "",
          state: pr.state,
          merged: pr.merged ? 1 : 0,
          author: pr.author?.login || "unknown",
          createdAt: pr.createdAt,
          updatedAt: pr.updatedAt,
          closedAt: pr.closedAt || null,
          mergedAt: pr.mergedAt || null,
          repository: repoId,
          headRefOid: pr.headRefOid,
          baseRefOid: pr.baseRefOid,
          additions: pr.additions,
          deletions: pr.deletions,
          changedFiles: pr.changedFiles,
        }));

        await db
          .insert(rawPullRequests)
          .values(prsToInsert)
          .onConflictDoUpdate({
            target: rawPullRequests.id,
            set: {
              state: sql`excluded.state`,
              merged: sql`excluded.merged`,
              updatedAt: sql`excluded.updated_at`,
              closedAt: sql`excluded.closed_at`,
              mergedAt: sql`excluded.merged_at`,
              additions: sql`excluded.additions`,
              deletions: sql`excluded.deletions`,
              changedFiles: sql`excluded.changed_files`,
            },
          });

        // Store PR-Label relationships
        for (const pr of validPRs) {
          const labelIds = pr.labels?.nodes?.map((label) => label.id) || [];
          await storePRLabels(pr.id, labelIds);
        }
      }

      // Batch insert PR files
      let totalFiles = 0;
      for (const pr of validPRs) {
        if (pr.files?.nodes?.length) {
          totalFiles += pr.files.nodes.length;
          const filesToInsert = pr.files.nodes.map((file) => ({
            id: `${pr.id}_${file.path}`,
            prId: pr.id,
            path: file.path,
            additions: file.additions,
            deletions: file.deletions,
            changeType: file.changeType,
          }));

          await db
            .insert(rawPullRequestFiles)
            .values(filesToInsert)
            .onConflictDoUpdate({
              target: rawPullRequestFiles.id,
              set: {
                additions: sql`excluded.additions`,
                deletions: sql`excluded.deletions`,
                changeType: sql`excluded.changeType`,
              },
            });
        }
      }
      logger?.debug(`Processed ${totalFiles} PR files`);

      // Batch insert commits
      let totalCommits = 0;
      for (const pr of validPRs) {
        if (pr.commits?.nodes?.length) {
          totalCommits += pr.commits.nodes.length;
          const commitsToInsert = pr.commits.nodes.map((node) => ({
            oid: node.commit.oid,
            message: node.commit.message,
            messageHeadline: node.commit.messageHeadline,
            committedDate: node.commit.committedDate,
            authorName: node.commit.author.name,
            authorEmail: node.commit.author.email,
            authorDate: node.commit.author.date,
            author: node.commit.author.user?.login,
            repository: repoId,
            additions: node.commit.additions,
            deletions: node.commit.deletions,
            changedFiles: node.commit.changedFiles,
            pullRequestId: pr.id,
          }));

          await db
            .insert(rawCommits)
            .values(commitsToInsert)
            .onConflictDoUpdate({
              target: [rawCommits.oid],
              set: {
                message: sql`excluded.message`,
                messageHeadline: sql`excluded.message_headline`,
                author: sql`excluded.author`,
                additions: sql`excluded.additions`,
                deletions: sql`excluded.deletions`,
                changedFiles: sql`excluded.changed_files`,
              },
            });
        }
      }
      logger?.debug(`Processed ${totalCommits} commits`);

      // Batch insert reviews
      let totalReviews = 0;
      for (const pr of validPRs) {
        if (pr.reviews?.nodes?.length) {
          totalReviews += pr.reviews.nodes.length;
          const reviewsToInsert = pr.reviews.nodes.map((review) => ({
            id: review.id,
            prId: pr.id,
            state: review.state,
            body: review.body ?? "",
            createdAt: review.createdAt || pr.updatedAt,
            author: review.author?.login || "unknown",
          }));

          await db
            .insert(prReviews)
            .values(reviewsToInsert)
            .onConflictDoUpdate({
              target: [prReviews.id],
              set: {
                state: sql`excluded.state`,
                body: sql`excluded.body`,
                createdAt: sql`excluded.created_at`,
              },
            });
        }
      }
      logger?.debug(`Processed ${totalReviews} reviews`);

      // Batch insert PR comments
      let totalComments = 0;
      for (const pr of validPRs) {
        if (pr.comments?.nodes?.length) {
          totalComments += pr.comments.nodes.length;
          const commentsToInsert = pr.comments.nodes.map((comment) => ({
            id: comment.id,
            prId: pr.id,
            body: comment.body ?? "",
            createdAt: comment.createdAt || pr.updatedAt,
            updatedAt: comment.updatedAt,
            author: comment.author?.login || "unknown",
          }));

          await db
            .insert(prComments)
            .values(commentsToInsert)
            .onConflictDoUpdate({
              target: [prComments.id],
              set: {
                body: sql`excluded.body`,
                updatedAt: sql`excluded.updated_at`,
              },
            });
        }
      }
      logger?.debug(`Processed ${totalComments} comments`);
      logger?.info(`Successfully stored ${validPRs.length} PRs for ${repoId}`);
      return { repository, count: validPRs.length };
    } catch (error) {
      logger?.error(`Error fetching PRs for ${repoId}`, {
        error: String(error),
      });
      throw new Error(
        `Failed to fetch PRs: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  },
);
