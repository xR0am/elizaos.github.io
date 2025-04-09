import { db } from "@/lib/data/db";
import { rawIssues, issueComments } from "@/lib/data/schema";
import { sql } from "drizzle-orm";
import {
  ensureUsersExist,
  ensureLabelsExist,
  storeIssueLabels,
} from "./mutations";
import { createStep } from "../types";
import { IngestionPipelineContext } from "./context";
import { RepositoryConfig } from "@/lib/pipelines/pipelineConfig";

/**
 * Step to fetch and store issues for a repository
 */
export const fetchAndStoreIssues = createStep(
  "Issues",
  async (
    { repository }: { repository: RepositoryConfig },
    context: IngestionPipelineContext,
  ) => {
    const { github, logger, dateRange } = context;
    const { repoId } = repository;

    logger?.info(`Starting issue ingestion for ${repoId}`);

    try {
      // Fetch issues from GitHub
      const options = {
        startDate: dateRange?.startDate,
        endDate: dateRange?.endDate,
      };

      const issues = await github.fetchIssues(repository, options);
      logger?.info(`Fetched ${issues.length} issues for ${repoId}`);

      // Filter out undefined values
      const validIssues = issues.filter(
        (issue): issue is NonNullable<typeof issue> => issue !== undefined,
      );

      if (validIssues.length === 0) {
        logger?.info(
          `No issues found for ${repoId} in the specified date range`,
        );
        return { repository, count: 0 };
      }

      // Collect all users that need to be created/updated
      const userData = new Map<string, { avatarUrl?: string }>();
      for (const issue of validIssues) {
        // Issue author
        if (issue.author?.login) {
          userData.set(issue.author.login, {
            avatarUrl: issue.author.avatarUrl || undefined,
          });
        }

        // Comment authors
        issue.comments?.nodes?.forEach((comment) => {
          if (comment.author?.login) {
            userData.set(comment.author.login, {
              avatarUrl: comment.author.avatarUrl || undefined,
            });
          }
        });
      }

      // Ensure all users exist in a single batch operation
      await ensureUsersExist(userData, context.config.botUsers);

      // Process all labels first
      const allLabels = validIssues.flatMap(
        (issue) => issue.labels?.nodes || [],
      );
      await ensureLabelsExist(allLabels);

      // Batch insert issues
      if (validIssues.length > 0) {
        const issuesToInsert = validIssues.map((issue) => ({
          id: issue.id,
          number: issue.number,
          title: issue.title,
          body: issue.body ?? "",
          state: issue.state,
          locked: issue.locked ? 1 : 0,
          author: issue.author?.login || "unknown",
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt,
          closedAt: issue.closedAt || null,
          repository: repoId,
        }));

        await db
          .insert(rawIssues)
          .values(issuesToInsert)
          .onConflictDoUpdate({
            target: rawIssues.id,
            set: {
              state: sql`excluded.state`,
              locked: sql`excluded.locked`,
              updatedAt: sql`excluded.updated_at`,
              closedAt: sql`excluded.closed_at`,
            },
          });

        // Store Issue-Label relationships
        for (const issue of validIssues) {
          const labelIds = issue.labels?.nodes?.map((label) => label.id) || [];
          await storeIssueLabels(issue.id, labelIds);
        }
      }

      // Batch insert issue comments
      for (const issue of validIssues) {
        if (issue.comments?.nodes?.length) {
          const commentsToInsert = issue.comments.nodes.map((comment) => ({
            id: comment.id,
            issueId: issue.id,
            body: comment.body ?? "",
            createdAt: comment.createdAt || issue.updatedAt,
            updatedAt: comment.updatedAt,
            author: comment.author?.login || "unknown",
          }));

          await db
            .insert(issueComments)
            .values(commentsToInsert)
            .onConflictDoUpdate({
              target: [issueComments.id],
              set: {
                body: sql`excluded.body`,
                updatedAt: sql`excluded.updated_at`,
              },
            });
        }
      }

      logger?.info(
        `Successfully stored ${validIssues.length} issues for ${repoId}`,
      );
      return { repository, count: validIssues.length };
    } catch (error) {
      logger?.error(`Error fetching issues for ${repoId}`, {
        error: String(error),
      });
      throw new Error(
        `Failed to fetch issues: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  },
);
