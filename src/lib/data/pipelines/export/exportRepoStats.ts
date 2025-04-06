import { createStep } from "../types";
import { RepositoryStatsPipelineContext } from "./context";
import {
  getRepositoryMetrics,
  getTopContributors,
  getTopIssues,
  getTopPullRequests,
} from "../../queries";
import * as path from "path";
import {
  generateIntervalName,
  TimeInterval,
  toDateString,
} from "@/lib/date-utils";
import { getRepoFilePath, writeToFile } from "@/lib/fsHelpers";

/**
 * Generate stats for a specific time interval
 */
export const exportRepoStatsForInterval = createStep(
  "RepoStats",
  async (
    { interval, repoId }: { interval: TimeInterval; repoId: string },
    { outputDir, logger }: RepositoryStatsPipelineContext
  ) => {
    const intervalLogger = logger
      ?.child(interval.intervalType)
      .child(toDateString(interval.intervalStart));
    // Query parameters for this interval
    const queryParams = {
      repository: repoId,
      dateRange: {
        startDate: toDateString(interval.intervalStart),
        endDate: toDateString(interval.intervalEnd),
      },
    };

    // Fetch metrics sequentially with logging
    const metrics = await getRepositoryMetrics(queryParams);
    intervalLogger?.info("Repository metrics fetched", metrics);
    const topContributors = await getTopContributors(queryParams, 5);
    intervalLogger?.info("Top contributors fetched", {
      contributorsCount: topContributors.length,
    });
    const topIssues = await getTopIssues(queryParams, 5);
    intervalLogger?.info("Top issues fetched", {
      issuesCount: topIssues.length,
    });
    const topPRs = await getTopPullRequests(queryParams, 5);
    intervalLogger?.info("Top pull requests fetched", {
      prsCount: topPRs.length,
    });

    const overview = `From ${interval.intervalStart} to ${interval.intervalEnd}, ${repoId} had ${metrics.new_prs} new PRs (${metrics.merged_prs} merged), ${metrics.new_issues} new issues, and ${metrics.num_contributors} active contributors.`;

    const stats = {
      interval,
      repository: repoId,
      overview,
      metrics,
      topContributors,
      topIssues,
      topPRs,
    };

    const intervalName = generateIntervalName(interval);
    // Generate filename
    const filename = `stats_${intervalName}.json`;
    const outputPath = getRepoFilePath(
      outputDir,
      repoId,
      "stats",
      interval.intervalType,
      filename
    );

    // Write stats to file
    await writeToFile(outputPath, JSON.stringify(stats, null, 2));

    logger?.info(
      `Generated ${interval.intervalType} stats for ${repoId} - ${intervalName}`,
      {
        outputPath,
        metrics: stats.metrics,
      }
    );

    return stats;
  }
);
