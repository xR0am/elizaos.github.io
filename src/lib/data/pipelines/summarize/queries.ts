import { eq, and, gte, lte, inArray, or, isNull, not } from "drizzle-orm";
import { db } from "@/lib/data/db";
import {
  users,
  rawPullRequests,
  rawIssues,
  prReviews,
  prComments,
  issueComments,
  rawCommits,
  rawCommitFiles,
  rawPullRequestFiles,
} from "@/lib/data/schema";
import { TimeInterval } from "@/lib/date-utils";
import { ProjectMetricsForSummary } from "./aiProjectSummary";

/**
 * Utility to extract area from a file path
 */
function extractAreaFromPath(path: string): string {
  const parts = path.split("/");
  let area = parts[0];

  // Handle packages directory specially
  if (parts.length > 1 && area === "packages") {
    area = `packages/${parts[1]}`;
  }

  return area;
}

export type WorkItemType =
  | "feature"
  | "bugfix"
  | "refactor"
  | "docs"
  | "tests"
  | "other";
/**
 * Utility to categorize a work item (PR title or commit message)
 *
 * @param text - The PR title or commit message to categorize
 * @returns The category of the work item
 */
function categorizeWorkItem(text: string): WorkItemType {
  const lowercaseText = text.toLowerCase();

  // Feature detection
  if (
    lowercaseText.startsWith("feat") ||
    lowercaseText.includes("feature") ||
    lowercaseText.includes("add ")
  ) {
    return "feature";
  }

  // Bug fix detection
  if (
    lowercaseText.startsWith("fix") ||
    lowercaseText.includes("fix") ||
    lowercaseText.includes("bug")
  ) {
    return "bugfix";
  }

  // Documentation detection
  if (lowercaseText.startsWith("docs") || lowercaseText.includes("document")) {
    return "docs";
  }

  // Refactoring detection
  if (
    lowercaseText.startsWith("refactor") ||
    lowercaseText.includes("refactor") ||
    lowercaseText.includes("clean") ||
    lowercaseText.includes("cleanup")
  ) {
    return "refactor";
  }

  // Test related detection
  if (lowercaseText.startsWith("test") || lowercaseText.includes("test")) {
    return "tests";
  }

  // Default category
  return "other";
}

/**
 * Utility to build a map of focus areas from files
 */
function buildAreaMap(
  files: { path?: string; filename?: string }[]
): Map<string, number> {
  const areaMap = new Map<string, number>();

  files.forEach((file) => {
    // Use path or filename depending on which is available
    const filePath = file.path || file.filename || "";
    if (!filePath) return;

    const area = extractAreaFromPath(filePath);
    const currentCount = areaMap.get(area) || 0;
    areaMap.set(area, currentCount + 1);
  });

  return areaMap;
}

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
      lte(rawPullRequests.createdAt, dateRange.endDate)
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
      0
    );
    const totalDeletions = mergedPRs.reduce(
      (sum, pr) => sum + (pr.deletions || 0),
      0
    );
    prMetrics.avgAdditions = Math.round(totalAdditions / mergedPRs.length);
    prMetrics.avgDeletions = Math.round(totalDeletions / mergedPRs.length);

    // Calculate time to merge (in hours)
    let totalTimeToMerge = 0;
    let mergedPRsWithTimes = 0;

    for (const pr of mergedPRs) {
      if (pr.createdAt && pr.mergedAt) {
        const created = new Date(pr.createdAt).getTime();
        const merged = new Date(pr.mergedAt).getTime();
        const hoursToMerge = Math.round((merged - created) / (1000 * 60 * 60));

        totalTimeToMerge += hoursToMerge;
        mergedPRsWithTimes++;
      }
    }

    if (mergedPRsWithTimes > 0) {
      prMetrics.avgTimeToMerge = Math.round(
        totalTimeToMerge / mergedPRsWithTimes
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
      lte(rawIssues.createdAt, dateRange.endDate)
    ),
  });

  // Get closed issues
  const closedIssues = await db.query.rawIssues.findMany({
    where: and(
      eq(rawIssues.author, username),
      eq(rawIssues.repository, repository),
      gte(rawIssues.closedAt, dateRange.startDate),
      lte(rawIssues.closedAt, dateRange.endDate),
      eq(rawIssues.state, "closed")
    ),
  });

  // Get issue comments
  const issueInteractions = await db.query.issueComments
    .findMany({
      where: and(
        eq(issueComments.author, username),
        gte(issueComments.createdAt, dateRange.startDate),
        lte(issueComments.createdAt, dateRange.endDate)
      ),
      with: {
        issue: true,
      },
    })
    .then((comments) =>
      comments.filter((c) => c.issue?.repository === repository)
    );

  // Get reviews
  const contributorReviews = await db.query.prReviews
    .findMany({
      where: and(
        eq(prReviews.author, username),
        gte(prReviews.createdAt, dateRange.startDate),
        lte(prReviews.createdAt, dateRange.endDate)
      ),
      with: {
        pullRequest: true,
      },
    })
    .then((reviews) =>
      reviews.filter((r) => r.pullRequest?.repository === repository)
    );

  // Count review types
  const approved = contributorReviews.filter(
    (r) => r.state === "APPROVED"
  ).length;
  const changesRequested = contributorReviews.filter(
    (r) => r.state === "CHANGES_REQUESTED"
  ).length;
  const commented = contributorReviews.filter(
    (r) => r.state === "COMMENTED"
  ).length;

  // Get PR comments
  const prCommentData = await db.query.prComments
    .findMany({
      where: and(
        eq(prComments.author, username),
        gte(prComments.createdAt, dateRange.startDate),
        lte(prComments.createdAt, dateRange.endDate)
      ),
      with: {
        pullRequest: true,
      },
    })
    .then((comments) =>
      comments.filter((c) => c.pullRequest?.repository === repository)
    );

  // Get code changes from commits
  const contributorCommits = await db.query.rawCommits.findMany({
    where: and(
      eq(rawCommits.author, username),
      eq(rawCommits.repository, repository),
      gte(rawCommits.committedDate, dateRange.startDate),
      lte(rawCommits.committedDate, dateRange.endDate)
    ),
    with: {
      files: true,
    },
  });

  // Calculate code changes
  const additions = contributorCommits.reduce(
    (sum: number, commit) => sum + (commit.additions || 0),
    0
  );
  const deletions = contributorCommits.reduce(
    (sum: number, commit) => sum + (commit.deletions || 0),
    0
  );
  const files = contributorCommits.reduce(
    (sum: number, commit) => sum + (commit.changedFiles || 0),
    0
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
    (commit) => commit.files || []
  );
  const areaMap = buildAreaMap(commitFiles);

  const focusAreas = Array.from(areaMap.entries())
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count);

  // Calculate work frequency patterns
  const commitDates = contributorCommits.map(
    (c) => new Date(c.committedDate).toISOString().split("T")[0]
  );
  const uniqueDaysWithCommits = new Set(commitDates).size;
  const totalDays = Math.max(
    1,
    Math.ceil(
      (new Date(dateRange.endDate).getTime() -
        new Date(dateRange.startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    )
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

/**
 * Get all active contributors in a repository within a time range
 */
export async function getActiveContributors({
  repository,
  dateRange,
}: {
  repository: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}) {
  // Find contributors with any activity in the time range
  const activeUsernames = new Set<string>();

  // PRs
  const prAuthors = await db
    .select({ author: rawPullRequests.author })
    .from(rawPullRequests)
    .where(
      and(
        eq(rawPullRequests.repository, repository),
        gte(rawPullRequests.createdAt, dateRange.startDate),
        lte(rawPullRequests.createdAt, dateRange.endDate)
      )
    );

  prAuthors.forEach((author) => {
    if (author.author) activeUsernames.add(author.author);
  });

  // Issues
  const issueAuthors = await db
    .select({ author: rawIssues.author })
    .from(rawIssues)
    .where(
      and(
        eq(rawIssues.repository, repository),
        gte(rawIssues.createdAt, dateRange.startDate),
        lte(rawIssues.createdAt, dateRange.endDate)
      )
    );

  issueAuthors.forEach((author) => {
    if (author.author) activeUsernames.add(author.author);
  });

  // Reviews
  const reviewers = await db
    .select({ author: prReviews.author })
    .from(prReviews)
    .innerJoin(rawPullRequests, eq(prReviews.prId, rawPullRequests.id))
    .where(
      and(
        eq(rawPullRequests.repository, repository),
        gte(prReviews.createdAt, dateRange.startDate),
        lte(prReviews.createdAt, dateRange.endDate)
      )
    );

  reviewers.forEach((reviewer) => {
    if (reviewer.author) activeUsernames.add(reviewer.author);
  });

  // Commits
  const committers = await db
    .select({ author: rawCommits.author })
    .from(rawCommits)
    .where(
      and(
        eq(rawCommits.repository, repository),
        gte(rawCommits.committedDate, dateRange.startDate),
        lte(rawCommits.committedDate, dateRange.endDate)
      )
    );

  committers.forEach((committer) => {
    if (committer.author) activeUsernames.add(committer.author);
  });

  // Get contributor details
  const activeContributors = await db
    .select()
    .from(users)
    .where(
      activeUsernames.size > 0
        ? inArray(users.username, Array.from(activeUsernames))
        : undefined
    );

  return activeContributors;
}

/**
 * Get project metrics for a specific time interval
 */
export async function getProjectMetrics({
  repoId,
  dateRange,
}: {
  repoId: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}) {
  // Get PRs created in this period
  const createdPRs = await db.query.rawPullRequests.findMany({
    where: and(
      eq(rawPullRequests.repository, repoId),
      gte(rawPullRequests.createdAt, dateRange.startDate),
      lte(rawPullRequests.createdAt, dateRange.endDate)
    ),
  });

  // Get PRs merged in this period
  const mergedPRsThisPeriod = await db.query.rawPullRequests.findMany({
    where: and(
      eq(rawPullRequests.repository, repoId),
      gte(rawPullRequests.mergedAt, dateRange.startDate),
      lte(rawPullRequests.mergedAt, dateRange.endDate)
    ),
  });

  const pullRequests = {
    newPRs: createdPRs,
    mergedPRs: mergedPRsThisPeriod,
  };

  // Get issues created in this period
  const newIssues = await db.query.rawIssues.findMany({
    where: and(
      eq(rawIssues.repository, repoId),
      gte(rawIssues.createdAt, dateRange.startDate),
      lte(rawIssues.createdAt, dateRange.endDate)
    ),
  });

  // Get issues closed in this period
  const closedIssues = await db.query.rawIssues.findMany({
    where: and(
      eq(rawIssues.repository, repoId),
      gte(rawIssues.closedAt, dateRange.startDate),
      lte(rawIssues.closedAt, dateRange.endDate)
    ),
  });
  console.log({ closedIssues });
  const issues = {
    newIssues,
    closedIssues,
  };

  // Get active contributors (reusing the existing function)
  const activeContributors = await getActiveContributors({
    repository: repoId,
    dateRange,
  });

  const uniqueContributors = activeContributors.length;

  // Get all commits in the time period
  const commits = await db.query.rawCommits.findMany({
    where: and(
      eq(rawCommits.repository, repoId),
      gte(rawCommits.committedDate, dateRange.startDate),
      lte(rawCommits.committedDate, dateRange.endDate)
    ),
  });

  const filesChangedThisPeriod = await db
    .selectDistinct({ path: rawPullRequestFiles.path })
    .from(rawPullRequestFiles)
    .where(
      inArray(
        rawPullRequestFiles.prId,
        mergedPRsThisPeriod.map((pr) => pr.id)
      )
    );

  // Get top contributors by commit count
  const authorCommitCounts = new Map<string, number>();
  commits.forEach((commit) => {
    if (commit.author) {
      const currentCount = authorCommitCounts.get(commit.author) || 0;
      authorCommitCounts.set(commit.author, currentCount + 1);
    }
  });

  const sortedContributors = Array.from(authorCommitCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([username]) => ({ username }));

  // Calculate code changes
  const additions = commits.reduce(
    (sum, commit) => sum + (commit.additions || 0),
    0
  );
  const deletions = commits.reduce(
    (sum, commit) => sum + (commit.deletions || 0),
    0
  );

  const codeChanges = {
    additions,
    deletions,
    files: filesChangedThisPeriod.length,
    commitCount: commits.length,
  };

  // Get PR files for merged PRs in this period
  const prFiles = await db.query.rawPullRequestFiles.findMany({
    where: inArray(
      rawPullRequestFiles.prId,
      mergedPRsThisPeriod.map((pr) => pr.id)
    ),
  });

  // Get focus areas from PR files
  const areaMap = buildAreaMap(prFiles);

  const focusAreas = Array.from(areaMap.entries())
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Get completed items (PRs merged in this period)
  const completedItems = mergedPRsThisPeriod.map((pr) => ({
    title: pr.title,
    prNumber: pr.number,
    type: categorizeWorkItem(pr.title),
  }));

  return {
    pullRequests,
    issues,
    uniqueContributors,
    topContributors: sortedContributors,
    codeChanges,
    focusAreas,
    completedItems,
  };
}
export type ProjectMetrics = Awaited<ReturnType<typeof getProjectMetrics>>;
