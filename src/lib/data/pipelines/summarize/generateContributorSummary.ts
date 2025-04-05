import * as path from "path";
import * as fs from "fs/promises";
import { createStep, pipe, mapStep } from "../types";
import { SummarizerPipelineContext } from "./context";
import { generateContributorSummary } from "./aiSummary";
import { getActiveContributors, getContributorMetrics } from "./queries";
import { generateTimeIntervals } from "../generateTimeIntervals";
import {
  generateIntervalName,
  IntervalType,
  TimeInterval,
  toDateString,
} from "@/lib/date-utils";
import { fetchContributors } from "../contributors/fetchContributors";
import { storeDailySummary } from "./mutations";
import { db } from "../../db";
import { userSummaries } from "../../schema";
import { eq, and } from "drizzle-orm";
import { isNotNullOrUndefined } from "@/lib/typeHelpers";

/**
 * Check if a summary already exists for a user on a specific date and interval type
 */
async function checkExistingSummary(
  username: string,
  date: string,
  intervalType: IntervalType
): Promise<boolean> {
  const existingSummary = await db.query.userSummaries.findFirst({
    where: and(
      eq(userSummaries.username, username),
      eq(userSummaries.date, date),
      eq(userSummaries.intervalType, intervalType)
    ),
  });

  return existingSummary !== undefined && existingSummary.summary !== "";
}

/**
 * Generate summaries for all active contributors in a repository for a specific time interval
 */
export const generateContributorSummariesForInterval = createStep(
  "ContributorSummaries",
  async (
    {
      interval,
      repoId,
      username,
    }: { interval: TimeInterval; repoId: string; username: string },
    context: SummarizerPipelineContext
  ) => {
    const { logger, aiSummaryConfig, overwrite } = context;

    if (!aiSummaryConfig.enabled) {
      return null;
    }

    const intervalLogger = logger
      ?.child(interval.intervalType)
      .child(toDateString(interval.intervalStart));

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
          interval.intervalType
        );
        if (summaryExists) {
          intervalLogger?.info(
            `${interval.intervalType} summary already exists for ${username} on ${dateRange.startDate}, skipping generation`
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

      const summary = await generateContributorSummary(
        metrics,
        aiSummaryConfig,
        interval.intervalType
      );

      if (!summary) {
        intervalLogger?.debug(
          `No activity for ${username} on ${dateRange.startDate}, skipping summary generation`
        );
        return;
      }
      // Store summary in the database with interval type
      await storeDailySummary(
        username,
        toDateString(interval.intervalStart),
        summary,
        interval.intervalType
      );

      intervalLogger?.info(
        `Generated and stored ${interval.intervalType} summary for ${username}`,
        {
          summary,
        }
      );
      return summary;
    } catch (error) {
      intervalLogger?.error(`Error processing contributor ${username}`, {
        error: (error as Error).message,
      });
    }
  }
);

/**
 * Pipeline for generating weekly contributor summaries
 */
export const generateWeeklyContributorSummaries = pipe(
  generateTimeIntervals<{ repoId: string; username: string }>("week"),
  mapStep(generateContributorSummariesForInterval),
  createStep("Filter null results", (results, context) => {
    return results.filter(isNotNullOrUndefined);
  })
);

/**
 * Pipeline for generating monthly contributor summaries
 */
export const generateMonthlyContributorSummaries = pipe(
  generateTimeIntervals<{ repoId: string; username: string }>("month"),
  mapStep(generateContributorSummariesForInterval),
  createStep("Filter null results", (results, context) => {
    return results.filter(isNotNullOrUndefined);
  })
);
