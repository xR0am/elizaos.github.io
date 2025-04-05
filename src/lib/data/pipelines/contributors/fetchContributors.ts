import { createStep, RepoPipelineContext } from "../types";
import { ContributorPipelineContext } from "./context";
import {
  users,
  rawPullRequests,
  rawIssues,
  rawCommits,
  prComments,
  issueComments,
  prReviews,
} from "../../schema";
import { db } from "../../db";
import { sql, eq, and, ne } from "drizzle-orm";
import { isNotNullOrUndefined } from "@/lib/typeHelpers";

/**
 * Fetch all contributors for a repository
 */
export const fetchContributors = createStep(
  "fetchContributors",
  async (
    { repoId }: { repoId: string },
    { logger }: ContributorPipelineContext
  ) => {
    // Fetch all contributors using separate optimized queries and run them in parallel
    const [prAuthors, issueAuthors, prCommentAuthors, prReviewAuthors] =
      await Promise.all([
        // PR authors, excluding bots
        db
          .select({ username: rawPullRequests.author })
          .from(rawPullRequests)
          .innerJoin(users, eq(rawPullRequests.author, users.username))
          .where(
            and(eq(rawPullRequests.repository, repoId), eq(users.isBot, 0))
          )
          .all(),

        // Issue authors, excluding bots
        db
          .select({ username: rawIssues.author })
          .from(rawIssues)
          .innerJoin(users, eq(rawIssues.author, users.username))
          .where(and(eq(rawIssues.repository, repoId), eq(users.isBot, 0)))
          .all(),

        // PR comment authors, excluding bots
        db
          .select({ username: prComments.author })
          .from(prComments)
          .innerJoin(users, eq(prComments.author, users.username))
          .innerJoin(rawPullRequests, eq(prComments.prId, rawPullRequests.id))
          .where(
            and(eq(rawPullRequests.repository, repoId), eq(users.isBot, 0))
          )
          .all(),

        // PR review authors, excluding bots
        db
          .select({ username: prReviews.author })
          .from(prReviews)
          .innerJoin(users, eq(prReviews.author, users.username))
          .innerJoin(rawPullRequests, eq(prReviews.prId, rawPullRequests.id))
          .where(
            and(eq(rawPullRequests.repository, repoId), eq(users.isBot, 0))
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
      { repoId }
    );

    return uniqueUsernames.filter(isNotNullOrUndefined).map((username) => ({
      username,
      repoId,
    }));
  }
);
