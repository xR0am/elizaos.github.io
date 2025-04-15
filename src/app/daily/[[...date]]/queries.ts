import {
  getProjectMetrics,
  getTopIssues,
  getTopPullRequests,
} from "@/lib/pipelines/export/queries";
import { toDateString } from "@/lib/date-utils";
import { addDays } from "date-fns";

/**
 * Get daily metrics for repositories for a specific date
 * @param date - Date string in YYYY-MM-DD format
 * @returns Object with numeric properties for daily metrics
 */
export async function getDailyMetrics(date: string) {
  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Invalid date format. Expected YYYY-MM-DD");
  }

  const startDate = date;
  const endDate = toDateString(addDays(date, 1));

  const repoMetrics = await getProjectMetrics({
    dateRange: {
      startDate,
      endDate,
    },
  });

  const topIssues = await getTopIssues(
    {
      dateRange: {
        startDate,
        endDate,
      },
    },
    3,
  );

  const topPullRequests = await getTopPullRequests(
    {
      dateRange: {
        startDate,
        endDate,
      },
    },
    3,
  );
  // deduplicate PRs that are both merged and new
  const totalPrs = [
    ...repoMetrics.pullRequests.mergedPRs,
    ...repoMetrics.pullRequests.newPRs,
  ];
  const uniquePrs = [...new Set(totalPrs.map((pr) => pr.id))];
  const totalIssues = [
    ...repoMetrics.issues.newIssues,
    ...repoMetrics.issues.closedIssues,
  ];
  const uniqueIssues = [...new Set(totalIssues.map((issue) => issue.id))];
  // Return all collected metrics
  return {
    date,
    pullRequests: {
      new: repoMetrics.pullRequests.newPRs.length,
      merged: repoMetrics.pullRequests.mergedPRs.length,
      total: uniquePrs.length,
    },
    issues: {
      new: repoMetrics.issues.newIssues.length,
      closed: repoMetrics.issues.closedIssues.length,
      total: uniqueIssues.length,
    },
    activeContributors: repoMetrics.uniqueContributors,
    codeChanges: repoMetrics.codeChanges,
    topContributors: repoMetrics.topContributors.slice(0, 3),
    focusAreas: repoMetrics.focusAreas,
    topIssues,
    topPullRequests,
  };
}

/**
 * Type definition for the daily metrics result
 */
export type DailyMetrics = Awaited<ReturnType<typeof getDailyMetrics>>;
