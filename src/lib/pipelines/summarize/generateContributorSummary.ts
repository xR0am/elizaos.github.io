import { createStep, pipe, mapStep } from "../types";
import { SummarizerPipelineContext } from "./context";
import { generateAISummaryForContributor } from "./aiSummary";
import { getContributorMetrics } from "./queries";
import { IntervalType, TimeInterval, toDateString } from "@/lib/date-utils";
import { storeDailySummary } from "./mutations";
import { db } from "@/lib/data/db";
import { userSummaries } from "@/lib/data/schema";
import { eq, and } from "drizzle-orm";
import { isNotNullOrUndefined } from "@/lib/typeHelpers";
import { getActiveContributorsInInterval } from "../getActiveContributors";

/**
 * Check if a summary already exists for a user on a specific date and interval type
 */
async function checkExistingSummary(
  username: string,
  date: string | Date,
  intervalType: IntervalType,
): Promise<boolean> {
  const existingSummary = await db.query.userSummaries.findFirst({
    where: and(
      eq(userSummaries.username, username),
      eq(userSummaries.date, toDateString(date)),
      eq(userSummaries.intervalType, intervalType),
    ),
  });

  return existingSummary !== undefined && existingSummary.summary !== "";
}

/**
 * Generate summaries for all active contributors in a repository for a specific time interval
 */
const generateContributorSummariesForInterval = createStep(
  "ContributorSummaries",
  async (
    {
      interval,
      repoId,
      username,
    }: { interval: TimeInterval; repoId: string | undefined; username: string },
    context: SummarizerPipelineContext,
  ) => {
    const { logger, aiSummaryConfig, overwrite } = context;

    if (!aiSummaryConfig.enabled) {
      return null;
    }
    // Query parameters for this interval
    const dateRange = {
      startDate: toDateString(interval.intervalStart),
      endDate: toDateString(interval.intervalEnd),
    };

    try {
      // Check if summary already exists (skip if overwrite is true)
      if (!overwrite) {
        const summaryExists = await checkExistingSummary(
          username,
          dateRange.startDate,
          interval.intervalType,
        );
        if (summaryExists) {
          logger?.debug(
            `${interval.intervalType} summary already exists for ${username} on ${dateRange.startDate}, skipping generation`,
          );
          return;
        }
      }

      // Get metrics for this contributor
      const metrics = await getContributorMetrics({
        username,
        repository: repoId,
        dateRange,
      });

      const summary = await generateAISummaryForContributor(
        metrics,
        aiSummaryConfig,
        interval.intervalType,
      );

      if (!summary) {
        logger?.debug(
          `No activity for ${username} on ${dateRange.startDate}, skipping summary generation`,
        );
        return;
      }
      // Store summary in the database with interval type
      await storeDailySummary(
        username,
        toDateString(interval.intervalStart),
        summary,
        interval.intervalType,
      );

      logger?.info(
        `Generated and stored ${interval.intervalType} summary for ${username}`,
        {
          summary,
        },
      );
      return {
        username,
        summary,
      };
    } catch (error) {
      logger?.error(`Error processing contributor ${username}`, {
        error: (error as Error).message,
      });
    }
  },
);

export const generateContributorSummaries = pipe(
  getActiveContributorsInInterval,
  ({ interval, repoId, contributors }) =>
    contributors.map((contributor) => ({
      interval,
      repoId,
      username: contributor.username,
    })),
  mapStep(generateContributorSummariesForInterval),
  (results) => {
    return results.filter(isNotNullOrUndefined);
  },
);
