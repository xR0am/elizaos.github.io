import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { db } from "@/lib/data/db";
import {
  users,
  rawPullRequests,
  rawIssues,
  prReviews,
  prComments,
  issueComments,
  rawCommits,
  rawPullRequestFiles,
} from "@/lib/data/schema";
import { buildAreaMap, categorizeWorkItem } from "../codeAreaHelpers";
import { UTCDate } from "@date-fns/utc";

/**
 * Get metrics for a contributor within a time range
 */
export async function getContributorMetrics({
  username,
  repository,
  dateRange,
}: {
  username: string;
  repository: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}) {
  // Ensure contributor exists
  const contributor = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (!contributor) {
    throw new Error(`Contributor ${username} not found`);
  }

  // Get pull requests for this contributor in the time range
  const prs = await db.query.rawPullRequests.findMany({
    where: and(
      eq(rawPullRequests.author, username),
      eq(rawPullRequests.repository, repository),
      gte(rawPullRequests.createdAt, dateRange.startDate),
      lte(rawPullRequests.createdAt, dateRange.endDate),
    ),
    with: {
      commits: true,
    },
  });

  // Count merged and open PRs
  const mergedPRs = prs.filter((pr) => pr.merged === 1);
  const openPRs = prs.filter((pr) => pr.merged !== 1);

  // Calculate average PR size and time to merge
  const prMetrics = {
    avgAdditions: 0,
    avgDeletions: 0,
    avgTimeToMerge: 0,
    largestPR: { number: 0, title: "", additions: 0, deletions: 0 },
  };

  if (mergedPRs.length > 0) {
    const totalAdditions = mergedPRs.reduce(
      (sum, pr) => sum + (pr.additions || 0),
      0,
    );
    const totalDeletions = mergedPRs.reduce(
      (sum, pr) => sum + (pr.deletions || 0),
      0,
    );
    prMetrics.avgAdditions = Math.round(totalAdditions / mergedPRs.length);
    prMetrics.avgDeletions = Math.round(totalDeletions / mergedPRs.length);

    // Calculate time to merge (in hours)
    let totalTimeToMerge = 0;
    let mergedPRsWithTimes = 0;

    for (const pr of mergedPRs) {
      if (pr.createdAt && pr.mergedAt) {
        const created = new UTCDate(pr.createdAt).getTime();
        const merged = new UTCDate(pr.mergedAt).getTime();
        const hoursToMerge = Math.round((merged - created) / (1000 * 60 * 60));

        totalTimeToMerge += hoursToMerge;
        mergedPRsWithTimes++;
      }
    }

    if (mergedPRsWithTimes > 0) {
      prMetrics.avgTimeToMerge = Math.round(
        totalTimeToMerge / mergedPRsWithTimes,
      );
    }

    // Find largest PR
    let maxChanges = 0;
    for (const pr of mergedPRs) {
      const changes = (pr.additions || 0) + (pr.deletions || 0);
      if (changes > maxChanges) {
        maxChanges = changes;
        prMetrics.largestPR = {
          number: pr.number,
          title: pr.title,
          additions: pr.additions || 0,
          deletions: pr.deletions || 0,
        };
      }
    }
  }

  // Get PR files to analyze types of changes
  const allPrIds = prs.map((pr) => pr.id);
  const prFiles =
    allPrIds.length > 0
      ? await db.query.rawPullRequestFiles.findMany({
          where: inArray(rawPullRequestFiles.prId, allPrIds),
        })
      : [];

  // Analyze types of files changed
  const fileTypeAnalysis = {
    code: 0,
    tests: 0,
    docs: 0,
    config: 0,
    other: 0,
  };

  prFiles.forEach((file) => {
    const path = file.path.toLowerCase();
    if (
      path.includes("test") ||
      path.includes("spec") ||
      path.endsWith(".test.ts") ||
      path.endsWith(".spec.ts")
    ) {
      fileTypeAnalysis.tests++;
    } else if (
      path.endsWith(".md") ||
      path.endsWith(".mdx") ||
      path.includes("/docs/")
    ) {
      fileTypeAnalysis.docs++;
    } else if (
      path.endsWith(".json") ||
      path.endsWith(".yml") ||
      path.endsWith(".yaml") ||
      path.endsWith(".config.js") ||
      path.endsWith(".config.ts")
    ) {
      fileTypeAnalysis.config++;
    } else if (
      path.endsWith(".ts") ||
      path.endsWith(".js") ||
      path.endsWith(".tsx") ||
      path.endsWith(".jsx") ||
      path.endsWith(".go") ||
      path.endsWith(".py") ||
      path.endsWith(".java") ||
      path.endsWith(".c") ||
      path.endsWith(".cpp")
    ) {
      fileTypeAnalysis.code++;
    } else {
      fileTypeAnalysis.other++;
    }
  });

  // Get issues
  const contributorIssues = await db.query.rawIssues.findMany({
    where: and(
      eq(rawIssues.author, username),
      eq(rawIssues.repository, repository),
      gte(rawIssues.createdAt, dateRange.startDate),
      lte(rawIssues.createdAt, dateRange.endDate),
    ),
  });

  // Get closed issues
  const closedIssues = await db.query.rawIssues.findMany({
    where: and(
      eq(rawIssues.author, username),
      eq(rawIssues.repository, repository),
      gte(rawIssues.closedAt, dateRange.startDate),
      lte(rawIssues.closedAt, dateRange.endDate),
      eq(rawIssues.state, "closed"),
    ),
  });

  // Get issue comments
  const issueInteractions = await db.query.issueComments
    .findMany({
      where: and(
        eq(issueComments.author, username),
        gte(issueComments.createdAt, dateRange.startDate),
        lte(issueComments.createdAt, dateRange.endDate),
      ),
      with: {
        issue: true,
      },
    })
    .then((comments) =>
      comments.filter((c) => c.issue?.repository === repository),
    );

  // Get reviews
  const contributorReviews = await db.query.prReviews
    .findMany({
      where: and(
        eq(prReviews.author, username),
        gte(prReviews.createdAt, dateRange.startDate),
        lte(prReviews.createdAt, dateRange.endDate),
      ),
      with: {
        pullRequest: true,
      },
    })
    .then((reviews) =>
      reviews.filter((r) => r.pullRequest?.repository === repository),
    );

  // Count review types
  const approved = contributorReviews.filter(
    (r) => r.state === "APPROVED",
  ).length;
  const changesRequested = contributorReviews.filter(
    (r) => r.state === "CHANGES_REQUESTED",
  ).length;
  const commented = contributorReviews.filter(
    (r) => r.state === "COMMENTED",
  ).length;

  // Get PR comments
  const prCommentData = await db.query.prComments
    .findMany({
      where: and(
        eq(prComments.author, username),
        gte(prComments.createdAt, dateRange.startDate),
        lte(prComments.createdAt, dateRange.endDate),
      ),
      with: {
        pullRequest: true,
      },
    })
    .then((comments) =>
      comments.filter((c) => c.pullRequest?.repository === repository),
    );

  // Get code changes from commits
  const contributorCommits = await db.query.rawCommits.findMany({
    where: and(
      eq(rawCommits.author, username),
      eq(rawCommits.repository, repository),
      gte(rawCommits.committedDate, dateRange.startDate),
      lte(rawCommits.committedDate, dateRange.endDate),
    ),
    with: {
      files: true,
    },
  });

  // Calculate code changes
  const additions = contributorCommits.reduce(
    (sum: number, commit) => sum + (commit.additions || 0),
    0,
  );
  const deletions = contributorCommits.reduce(
    (sum: number, commit) => sum + (commit.deletions || 0),
    0,
  );
  const files = contributorCommits.reduce(
    (sum: number, commit) => sum + (commit.changedFiles || 0),
    0,
  );

  // Analyze commit messages for work types
  const commitTypes = {
    feature: 0,
    bugfix: 0,
    refactor: 0,
    docs: 0,
    tests: 0,
    other: 0,
  };

  contributorCommits.forEach((commit) => {
    const type = categorizeWorkItem(commit.message || "");

    // Make sure the type exists in commitTypes, or use 'other' as fallback
    const typeKey = type in commitTypes ? type : "other";
    commitTypes[typeKey as keyof typeof commitTypes]++;
  });

  // Calculate focus areas based on file paths in commits
  const commitFiles = contributorCommits.flatMap(
    (commit) => commit.files || [],
  );
  const areaMap = buildAreaMap(commitFiles);

  const focusAreas = Array.from(areaMap.entries())
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count);

  // Calculate work frequency patterns
  const commitDates = contributorCommits.map(
    (c) => new UTCDate(c.committedDate).toISOString().split("T")[0],
  );
  const uniqueDaysWithCommits = new Set(commitDates).size;
  const totalDays = Math.max(
    1,
    Math.ceil(
      (new UTCDate(dateRange.endDate).getTime() -
        new UTCDate(dateRange.startDate).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );
  const commitFrequency = uniqueDaysWithCommits / totalDays;

  return {
    username,
    repository,
    pullRequests: {
      total: prs.length,
      merged: mergedPRs.length,
      open: openPRs.length,
      items: prs,
      metrics: prMetrics,
      fileTypes: fileTypeAnalysis,
    },
    issues: {
      total: contributorIssues.length,
      opened: contributorIssues.length,
      closed: closedIssues.length,
      commented: issueInteractions.length,
      items: contributorIssues,
    },
    reviews: {
      total: contributorReviews.length,
      approved,
      changesRequested,
      commented,
      items: contributorReviews,
    },
    comments: {
      prComments: prCommentData.length,
      issueComments: issueInteractions.length,
      total: prCommentData.length + issueInteractions.length,
    },
    codeChanges: {
      additions,
      deletions,
      files,
      commitCount: contributorCommits.length,
      commitTypes,
    },
    focusAreas,
    activityPattern: {
      daysActive: uniqueDaysWithCommits,
      totalDays,
      frequency: commitFrequency,
    },
  };
}
