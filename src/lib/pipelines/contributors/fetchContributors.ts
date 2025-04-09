import { createStep } from "../types";
import { ContributorPipelineContext } from "./context";
import {
  users,
  rawPullRequests,
  rawIssues,
  prComments,
  prReviews,
} from "@/lib/data/schema";
import { db } from "@/lib/data/db";
import { sql, eq, and, gte, lte, or } from "drizzle-orm";
import { isNotNullOrUndefined } from "@/lib/typeHelpers";

/**
 * Fetch all contributors for a repository
 */
export const fetchContributors = createStep(
  "fetchContributors",
  async (
    { repoId }: { repoId: string },
    { logger, dateRange }: ContributorPipelineContext,
  ) => {
    // Filter for contributors active in the date range, if provided
    const dateConditions = dateRange?.startDate
      ? {
          pr: or(
            and(
              gte(rawPullRequests.createdAt, dateRange.startDate),
              dateRange.endDate
                ? lte(rawPullRequests.createdAt, dateRange.endDate)
                : sql`1=1`,
            ),
            and(
              gte(rawPullRequests.mergedAt, dateRange.startDate),
              dateRange.endDate
                ? lte(rawPullRequests.mergedAt, dateRange.endDate)
                : sql`1=1`,
            ),
          ),
          issue: and(
            gte(rawIssues.createdAt, dateRange.startDate),
            dateRange.endDate
              ? lte(rawIssues.createdAt, dateRange.endDate)
              : sql`1=1`,
          ),
          prComment: and(
            gte(prComments.createdAt, dateRange.startDate),
            dateRange.endDate
              ? lte(prComments.createdAt, dateRange.endDate)
              : sql`1=1`,
          ),
          prReview: and(
            gte(prReviews.createdAt, dateRange.startDate),
            dateRange.endDate
              ? lte(prReviews.createdAt, dateRange.endDate)
              : sql`1=1`,
          ),
        }
      : null;

    // Fetch all contributors using separate optimized queries and run them in parallel
    const [prAuthors, issueAuthors, prCommentAuthors, prReviewAuthors] =
      await Promise.all([
        // PR authors, excluding bots
        db
          .select({ username: rawPullRequests.author })
          .from(rawPullRequests)
          .innerJoin(users, eq(rawPullRequests.author, users.username))
          .where(
            and(
              eq(rawPullRequests.repository, repoId),
              eq(users.isBot, 0),
              ...(dateConditions ? [dateConditions.pr] : []),
            ),
          )
          .all(),

        // Issue authors, excluding bots
        db
          .select({ username: rawIssues.author })
          .from(rawIssues)
          .innerJoin(users, eq(rawIssues.author, users.username))
          .where(
            and(
              eq(rawIssues.repository, repoId),
              eq(users.isBot, 0),
              ...(dateConditions ? [dateConditions.issue] : []),
            ),
          )
          .all(),

        // PR comment authors, excluding bots
        db
          .select({ username: prComments.author })
          .from(prComments)
          .innerJoin(users, eq(prComments.author, users.username))
          .innerJoin(rawPullRequests, eq(prComments.prId, rawPullRequests.id))
          .where(
            and(
              eq(rawPullRequests.repository, repoId),
              eq(users.isBot, 0),
              ...(dateConditions ? [dateConditions.prComment] : []),
            ),
          )
          .all(),

        // PR review authors, excluding bots
        db
          .select({ username: prReviews.author })
          .from(prReviews)
          .innerJoin(users, eq(prReviews.author, users.username))
          .innerJoin(rawPullRequests, eq(prReviews.prId, rawPullRequests.id))
          .where(
            and(
              eq(rawPullRequests.repository, repoId),
              eq(users.isBot, 0),
              ...(dateConditions ? [dateConditions.prReview] : []),
            ),
          )
          .all(),
      ]);

    // Combine all results and remove duplicates
    const allContributors = [
      ...prAuthors,
      ...issueAuthors,
      ...prCommentAuthors,
      ...prReviewAuthors,
    ];
    // Use a Set to deduplicate usernames
    const uniqueUsernames = [
      ...new Set(allContributors.map((c) => c.username)),
    ];

    logger?.info(
      `Retrieved ${uniqueUsernames.length} contributors from the repository`,
      { repoId, dateRange },
    );

    return uniqueUsernames.filter(isNotNullOrUndefined).map((username) => ({
      username,
      repoId,
    }));
  },
);
