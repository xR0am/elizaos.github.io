import { desc, eq, sql, and, gte, lte, SQL } from "drizzle-orm";
import { db } from "./db";
import {
  rawPullRequests,
  rawIssues,
  prReviews,
  prComments,
  issueComments,
  rawPullRequestFiles,
} from "./schema";
import { DateRange } from "./types";
import path from "path";

/**
 * Standard query parameters used across different queries
 */
export interface QueryParams {
  dateRange?: DateRange;
  repository?: string;
}
export interface PaginatedQueryParams extends QueryParams {
  // Pagination
  limit?: number;
  offset?: number;
}
/**
 * Helper function to build common where conditions based on query params
 */
function buildCommonWhereConditions<
  T extends { createdAt: unknown; repository?: unknown }
>(params: QueryParams, table: T): SQL[] {
  const conditions: SQL[] = [];

  if (params.dateRange) {
    conditions.push(sql`${table.createdAt} >= ${params.dateRange.startDate}`);
    conditions.push(sql`${table.createdAt} <= ${params.dateRange.endDate}`);
  }

  if (params.repository) {
    conditions.push(sql`${table.repository} = ${params.repository}`);
  }

  return conditions;
}

/**
 * Get PR data and file paths for a contributor
 */
export async function getContributorPRs(
  username: string,
  params: PaginatedQueryParams = {}
) {
  const whereConditions = [
    eq(rawPullRequests.author, username),
    ...buildCommonWhereConditions(params, rawPullRequests),
  ];

  return db.query.rawPullRequests.findMany({
    where: and(...whereConditions),
    limit: params.limit,
    offset: params.offset,
    orderBy: [desc(rawPullRequests.createdAt)],
    with: {
      files: true,
    },
  });
}

/**
 * Calculate focus areas for a contributor based on their PR file paths
 */
export interface FocusArea {
  area: string;
  count: number;
  percentage: number;
}

export async function getContributorFocusAreas(
  username: string,
  params: QueryParams = {}
): Promise<FocusArea[]> {
  // Fetch PRs with their files
  const contributorPRs = await getContributorPRs(username, params);

  // Extract file paths from PRs
  const filePaths = contributorPRs.flatMap((pr) => {
    if (pr.files) {
      return pr.files.map((f: any) => f.path);
    }
    return [];
  });

  // Count occurrences of top-level directories
  const dirCounts: Record<string, number> = {};
  let totalFiles = 0;

  for (const filePath of filePaths) {
    const parts = filePath.split("/");
    if (parts.length > 1) {
      const topDir = parts[0];
      dirCounts[topDir] = (dirCounts[topDir] || 0) + 1;
      totalFiles++;
    }
  }

  // Calculate percentages and sort by count
  return Object.entries(dirCounts)
    .map(([area, count]) => ({
      area,
      count,
      percentage: totalFiles > 0 ? Math.round((count / totalFiles) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Top 5 focus areas
}

/**
 * Calculate file types for a contributor based on PR file extensions
 */
export interface FileType {
  extension: string;
  count: number;
  percentage: number;
}

export async function getContributorFileTypes(
  username: string,
  params: QueryParams = {}
): Promise<FileType[]> {
  // Fetch PRs with their files
  const contributorPRs = await getContributorPRs(username, params);

  // Extract file paths from PRs
  const filePaths = contributorPRs.flatMap((pr) => {
    if (pr.files) {
      return pr.files.map((f: any) => f.path);
    }
    return [];
  });

  // Count occurrences of file extensions
  const extensionCounts: Record<string, number> = {};
  let totalFiles = 0;

  for (const filePath of filePaths) {
    const ext = path.extname(filePath);
    if (ext) {
      extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
      totalFiles++;
    }
  }

  // Calculate percentages and sort by count
  return Object.entries(extensionCounts)
    .map(([extension, count]) => ({
      extension,
      count,
      percentage: totalFiles > 0 ? Math.round((count / totalFiles) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Top 5 file types
}

/**
 * Get aggregated pull request metrics for a contributor
 */
export async function getContributorPRMetrics(
  username: string,
  params: QueryParams = {}
) {
  const whereConditions = [
    eq(rawPullRequests.author, username),
    ...buildCommonWhereConditions(params, rawPullRequests),
  ];

  const metrics = await db
    .select({
      total: sql`COUNT(*)`,
      merged: sql`SUM(CASE WHEN ${rawPullRequests.merged} = 1 THEN 1 ELSE 0 END)`,
      open: sql`SUM(CASE WHEN UPPER(${rawPullRequests.state}) = 'OPEN' THEN 1 ELSE 0 END)`,
      closed: sql`SUM(CASE WHEN UPPER(${rawPullRequests.state}) = 'CLOSED' AND ${rawPullRequests.merged} = 0 THEN 1 ELSE 0 END)`,
      additions: sql`SUM(${rawPullRequests.additions})`,
      deletions: sql`SUM(${rawPullRequests.deletions})`,
      changedFiles: sql`SUM(${rawPullRequests.changedFiles})`,
    })
    .from(rawPullRequests)
    .where(and(...whereConditions))
    .get();

  return {
    total: Number(metrics?.total || 0),
    merged: Number(metrics?.merged || 0),
    open: Number(metrics?.open || 0),
    closed: Number(metrics?.closed || 0),
    additions: Number(metrics?.additions || 0),
    deletions: Number(metrics?.deletions || 0),
    changedFiles: Number(metrics?.changedFiles || 0),
  };
}

/**
 * Get aggregated issue metrics for a contributor
 */
export async function getContributorIssueMetrics(
  username: string,
  params: QueryParams = {}
) {
  // Build where conditions
  const whereConditions = [
    eq(rawIssues.author, username),
    ...buildCommonWhereConditions(params, rawIssues),
  ];

  const issueMetrics = await db
    .select({
      total: sql`COUNT(*)`,
      open: sql`SUM(CASE WHEN UPPER(${rawIssues.state}) = 'OPEN' THEN 1 ELSE 0 END)`,
      closed: sql`SUM(CASE WHEN UPPER(${rawIssues.state}) = 'CLOSED' THEN 1 ELSE 0 END)`,
    })
    .from(rawIssues)
    .where(and(...whereConditions))
    .get();

  // Get issue IDs for comment count with optional limit
  const query = db
    .select({
      id: rawIssues.id,
    })
    .from(rawIssues)
    .where(and(...whereConditions));

  const issues = await query.all();

  const issueIds = issues.map((issue) => issue.id);

  // Get comment count
  const commentCount = await db
    .select({
      count: sql`COUNT(*)`,
    })
    .from(issueComments)
    .where(sql`${issueComments.issueId} IN ${issueIds}`)
    .get();

  return {
    total: Number(issueMetrics?.total || 0),
    open: Number(issueMetrics?.open || 0),
    closed: Number(issueMetrics?.closed || 0),
    commentCount: Number(commentCount?.count || 0),
  };
}

/**
 * Get aggregated review metrics for a contributor
 */
export async function getContributorReviewMetrics(
  username: string,
  params: QueryParams = {}
) {
  // Build where conditions for reviews
  const whereConditions = [
    eq(prReviews.author, username),
    ...buildCommonWhereConditions(params, prReviews),
  ];
  if (params.repository) {
    whereConditions.push(
      sql`${rawPullRequests.repository} = ${params.repository}`
    );
  }

  const reviewMetrics = await db
    .select({
      total: sql`COUNT(*)`,
      approved: sql`SUM(CASE WHEN UPPER(${prReviews.state}) = 'APPROVED' THEN 1 ELSE 0 END)`,
      commented: sql`SUM(CASE WHEN UPPER(${prReviews.state}) = 'COMMENTED' THEN 1 ELSE 0 END)`,
      changesRequested: sql`SUM(CASE WHEN UPPER(${prReviews.state}) = 'CHANGES_REQUESTED' THEN 1 ELSE 0 END)`,
    })
    .from(prReviews)
    .innerJoin(rawPullRequests, eq(prReviews.prId, rawPullRequests.id))
    .where(and(...whereConditions))
    .get();

  return {
    total: Number(reviewMetrics?.total || 0),
    approved: Number(reviewMetrics?.approved || 0),
    commented: Number(reviewMetrics?.commented || 0),
    changesRequested: Number(reviewMetrics?.changesRequested || 0),
  };
}

/**
 * Get aggregated comment metrics for a contributor
 */
export async function getContributorCommentMetrics(
  username: string,
  params: QueryParams = {}
) {
  // Build where conditions for reviews
  const prWhereConditions = [
    eq(prComments.author, username),
    ...buildCommonWhereConditions(params, prComments),
  ];

  if (params.repository) {
    prWhereConditions.push(
      sql`${rawPullRequests.repository} = ${params.repository}`
    );
  }

  // Get PR comment count
  const prCommentCount = await db
    .select({
      count: sql`COUNT(*)`,
    })
    .from(prComments)
    .innerJoin(rawPullRequests, eq(prComments.prId, rawPullRequests.id))
    .where(and(...prWhereConditions))
    .get();

  // Build where conditions for issue comments
  const issueWhereConditions = [
    eq(issueComments.author, username),
    ...buildCommonWhereConditions(params, issueComments),
  ];

  if (params.repository) {
    issueWhereConditions.push(
      sql`${rawIssues.repository} = ${params.repository}`
    );
  }

  // Get issue comment count
  const issueCommentCount = await db
    .select({
      count: sql`COUNT(*)`,
    })
    .from(issueComments)
    .innerJoin(rawIssues, eq(issueComments.issueId, rawIssues.id))
    .where(and(...issueWhereConditions))
    .get();

  return {
    pullRequests: Number(prCommentCount?.count || 0),
    issues: Number(issueCommentCount?.count || 0),
  };
}

/**
 * Get active contributors in a time period
 */
export async function getActiveContributors(
  params: PaginatedQueryParams = {}
): Promise<string[]> {
  const whereConditions: SQL[] = [];

  if (params.dateRange) {
    const { startDate, endDate } = params.dateRange;
    whereConditions.push(sql`(
      (${rawPullRequests.createdAt} BETWEEN ${startDate} AND ${endDate} AND ${rawPullRequests.repository} = ${params.repository}) OR
      (${rawIssues.createdAt} BETWEEN ${startDate} AND ${endDate} AND ${rawIssues.repository} = ${params.repository}) OR
      (${prReviews.createdAt} BETWEEN ${startDate} AND ${endDate}) OR
      (${prComments.createdAt} BETWEEN ${startDate} AND ${endDate}) OR
      (${issueComments.createdAt} BETWEEN ${startDate} AND ${endDate})
    )`);
  }

  whereConditions.push(sql`COALESCE(
    ${rawPullRequests.author},
    ${rawIssues.author},
    ${prReviews.author},
    ${prComments.author},
    ${issueComments.author}
  ) NOT IN ('unknown', '[deleted]', '')`);

  const query = db
    .select({
      username: sql`DISTINCT COALESCE(
        ${rawPullRequests.author},
        ${rawIssues.author},
        ${prReviews.author},
        ${prComments.author},
        ${issueComments.author}
      )`,
    })
    .from(rawPullRequests)
    .fullJoin(rawIssues, sql`1=1`)
    .fullJoin(prReviews, sql`1=1`)
    .fullJoin(prComments, sql`1=1`)
    .fullJoin(issueComments, sql`1=1`)
    .where(and(...whereConditions));

  if (params.limit) {
    query.limit(params.limit);
  }

  if (params.offset) {
    query.offset(params.offset);
  }

  const contributors = await query.all();

  return contributors
    .map((c) => c.username)
    .filter((username): username is string => !!username);
}
