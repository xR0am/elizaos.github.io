import { createStep, pipe, mapStep } from "../types";
import { SummarizerPipelineContext } from "./context";
import {
  generateRepoSummary,
  generateAggregatedRepoSummary,
} from "./aiRepoSummary";
import { generateTimeIntervals } from "../generateTimeIntervals";
import { IntervalType, TimeInterval, toDateString } from "@/lib/date-utils";
import { storeRepoSummary } from "./mutations";
import { isNotNullOrUndefined } from "@/lib/typeHelpers";
import { getRepoMetrics } from "../export/queries";
import { getRepoFilePath, writeToFile } from "@/lib/fsHelpers";
import { existsSync } from "node:fs";
import { getRepoSummariesForInterval } from "./queries";

/**
 * Check if a summary already exists for a repository on a specific date and interval type
 */
async function checkExistingSummary(
  repoId: string,
  date: string,
  intervalType: IntervalType,
  outputDir?: string,
): Promise<boolean> {
  if (!outputDir) return false;

  const filename = `${date}.md`;
  const summaryPath = getRepoFilePath(
    outputDir,
    repoId,
    "summaries",
    intervalType,
    filename,
  );

  return existsSync(summaryPath);
}

/**
 * Generate repository summary for a specific time interval
 */
export const generateDailyRepoSummaryForInterval = createStep(
  "RepoSummary",
  async (
    { interval, repoId }: { interval: TimeInterval; repoId: string },
    context: SummarizerPipelineContext,
  ) => {
    const { logger, aiSummaryConfig, overwrite } = context;

    if (!aiSummaryConfig.enabled) {
      logger?.debug(
        `AI summary generation is disabled, skipping ${interval.intervalType} summary for ${repoId}`,
      );
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
          repoId,
          dateRange.startDate,
          interval.intervalType,
          context.outputDir,
        );
        if (summaryExists) {
          intervalLogger?.debug(
            `${interval.intervalType} summary already exists for ${repoId} on ${dateRange.startDate}, skipping generation`,
          );
          return;
        }
      }

      // Get metrics for this time period
      const metrics = await getRepoMetrics({
        repository: repoId,
        dateRange,
      });

      // Generate the summary based on interval type
      const summary = await generateRepoSummary(
        metrics,
        aiSummaryConfig,
        dateRange,
        interval.intervalType,
      );

      if (!summary) {
        intervalLogger?.debug(
          `No activity for repo ${repoId} on ${dateRange.startDate}, skipping summary generation`,
        );
        return;
      }

      // Store the summary in database
      await storeRepoSummary(
        repoId,
        toDateString(interval.intervalStart),
        summary,
        interval.intervalType,
      );

      // Export summary as markdown file if outputDir is configured
      const filename = `${toDateString(interval.intervalStart)}.md`;
      const outputPath = getRepoFilePath(
        context.outputDir,
        repoId,
        "summaries",
        interval.intervalType,
        filename,
      );
      await writeToFile(outputPath, summary);

      intervalLogger?.info(
        `Generated and exported ${interval.intervalType} summary for repo ${repoId}`,
        {
          outputPath,
        },
      );

      return summary;
    } catch (error) {
      intervalLogger?.error(`Error processing repository ${repoId}`, {
        error: (error as Error).message,
      });
    }
  },
);

/**
 * Generate aggregated repository summary for a specific time interval (week/month)
 */
export const generateAggregatedRepoSummaryForInterval = createStep(
  "AggregatedRepoSummary",
  async (
    { interval, repoId }: { interval: TimeInterval; repoId: string },
    context: SummarizerPipelineContext,
  ) => {
    const { logger, aiSummaryConfig, overwrite, outputDir } = context;
    const intervalType = interval.intervalType;

    if (
      !aiSummaryConfig.enabled ||
      (intervalType !== "week" && intervalType !== "month")
    ) {
      return null;
    }

    const intervalLogger = logger
      ?.child(intervalType)
      .child(toDateString(interval.intervalStart));
    const startDate = toDateString(interval.intervalStart);

    try {
      if (!overwrite) {
        const summaryExists = await checkExistingSummary(
          repoId,
          startDate,
          intervalType,
          outputDir,
        );
        if (summaryExists) {
          intervalLogger?.debug(
            `${intervalType} summary already exists for ${repoId} on ${startDate}, skipping generation`,
          );
          return;
        }
      }

      // Fetch daily summaries for the interval
      const dailySummaries = await getRepoSummariesForInterval(
        repoId,
        interval,
      );

      if (dailySummaries.length === 0) {
        intervalLogger?.debug(
          `No daily summaries found for repo ${repoId} during ${intervalType} of ${startDate}, skipping aggregated summary generation.`,
        );
        return null;
      }

      // Generate the aggregated summary
      const summary = await generateAggregatedRepoSummary(
        repoId,
        dailySummaries,
        aiSummaryConfig,
        { startDate },
        intervalType,
      );

      if (!summary) {
        intervalLogger?.debug(
          `Aggregated summary generation resulted in no content for repo ${repoId} on ${startDate}, skipping storage.`,
        );
        return;
      }

      // Store the summary in database
      await storeRepoSummary(repoId, startDate, summary, intervalType);

      // Export summary as markdown file
      const filename = `${startDate}.md`;
      const outputPath = getRepoFilePath(
        outputDir,
        repoId,
        "summaries",
        intervalType,
        filename,
      );
      await writeToFile(outputPath, summary);

      intervalLogger?.info(
        `Generated and exported ${intervalType} aggregated summary for repo ${repoId}`,
        { outputPath },
      );

      return summary;
    } catch (error) {
      intervalLogger?.error(
        `Error processing aggregated summary for repository ${repoId}`,
        {
          error: (error as Error).message,
        },
      );
    }
  },
);

/**
 * Pipeline for generating monthly repository summaries
 */
export const generateMonthlyRepoSummaries = pipe(
  generateTimeIntervals<{ repoId: string }>("month"),
  (input, context: SummarizerPipelineContext) => {
    if (context.enabledIntervals.month) {
      return input;
    }
    return [];
  },
  mapStep(generateAggregatedRepoSummaryForInterval),
  createStep("Filter null results", (results) => {
    return results.filter(isNotNullOrUndefined);
  }),
);

/**
 * Pipeline for generating weekly repository summaries
 */
export const generateWeeklyRepoSummaries = pipe(
  generateTimeIntervals<{ repoId: string }>("week"),
  (input, context: SummarizerPipelineContext) => {
    if (context.enabledIntervals.week) {
      return input;
    }
    return [];
  },
  mapStep(generateAggregatedRepoSummaryForInterval),
  createStep("Filter null results", (results) => {
    return results.filter(isNotNullOrUndefined);
  }),
);

/**
 * Pipeline for generating daily repository summaries
 */
export const generateDailyRepoSummaries = pipe(
  generateTimeIntervals<{ repoId: string }>("day"),
  (input, context: SummarizerPipelineContext) => {
    if (context.enabledIntervals.day) {
      return input;
    }
    return [];
  },
  mapStep(generateDailyRepoSummaryForInterval),
  createStep("Filter null results", (results) => {
    return results.filter(isNotNullOrUndefined);
  }),
);
