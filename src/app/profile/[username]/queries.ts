import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/data/db";
import {
  rawPullRequests,
  users,
  userTagScores,
  tags,
  userSummaries,
} from "@/lib/data/schema";
import { calculateDateRange } from "@/lib/date-utils";
import {
  getUserAggregatedScore,
  getUserActivityHeatmaps,
} from "@/lib/scoring/queries";
import { TagType } from "@/lib/scoring/types";

export async function getUserTags(username: string) {
  const tagSelectFields = {
    tagName: userTagScores.tag,
    category: tags.category,
    score: userTagScores.score,
    level: userTagScores.level,
    progress: userTagScores.progress,
    pointsToNext: userTagScores.pointsToNext,
  };
  // Get user tag scores with tag information and sort at the database level
  const roleTags = await db
    .select(tagSelectFields)
    .from(userTagScores)
    .leftJoin(tags, eq(userTagScores.tag, tags.name))
    .where(
      and(
        eq(userTagScores.username, username),
        eq(tags.category, TagType.ROLE),
      ),
    )
    .orderBy(desc(userTagScores.score));

  const skillTags = await db
    .select(tagSelectFields)
    .from(userTagScores)
    .leftJoin(tags, eq(userTagScores.tag, tags.name))
    .where(
      and(
        eq(userTagScores.username, username),
        eq(tags.category, TagType.TECH),
      ),
    )
    .orderBy(desc(userTagScores.score));

  const focusAreaTags = await db
    .select(tagSelectFields)
    .from(userTagScores)
    .leftJoin(tags, eq(userTagScores.tag, tags.name))
    .where(
      and(
        eq(userTagScores.username, username),
        eq(tags.category, TagType.AREA),
      ),
    )
    .orderBy(desc(userTagScores.score));

  // Calculate totals
  const totalXp = [...focusAreaTags, ...roleTags, ...skillTags].reduce(
    (sum, tag) => sum + Number(tag.score),
    0,
  );
  const totalLevel = [...focusAreaTags, ...roleTags, ...skillTags].reduce(
    (sum, tag) => sum + tag.level,
    0,
  );

  return {
    roleTags,
    skillTags,
    focusAreaTags,
    totalXp,
    totalLevel,
  };
}

/**
 * Get comprehensive user profile data
 * @param username - GitHub username of the user
 * @returns UserFocusAreaData object containing all profile information
 */
export async function getUserProfile(username: string) {
  // Get basic user details
  const user = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (!user) {
    return null;
  }

  // Get user tags data
  const tagsData = await getUserTags(username);

  // Get most recent monthly and weekly summaries
  const monthlySummary = await db.query.userSummaries.findFirst({
    where: and(
      eq(userSummaries.username, username),
      eq(userSummaries.intervalType, "month"),
    ),
    orderBy: desc(userSummaries.date),
  });

  const weeklySummary = await db.query.userSummaries.findFirst({
    where: and(
      eq(userSummaries.username, username),
      eq(userSummaries.intervalType, "week"),
    ),
    orderBy: desc(userSummaries.date),
  });

  // Get PR metrics
  const prStats = await db
    .select({
      total: count(),
      merged: sql<number>`SUM(CASE WHEN ${rawPullRequests.merged} = 1 THEN 1 ELSE 0 END)`,
      closed: sql<number>`SUM(CASE WHEN ${rawPullRequests.state} = 'CLOSED' AND ${rawPullRequests.merged} = 0 THEN 1 ELSE 0 END)`,
      additions: sql<number>`SUM(${rawPullRequests.additions})`,
      deletions: sql<number>`SUM(${rawPullRequests.deletions})`,
      changedFiles: sql<number>`SUM(${rawPullRequests.changedFiles})`,
    })
    .from(rawPullRequests)
    .where(eq(rawPullRequests.author, username))
    .get();

  // Get user's overall score
  const userScore = await getUserAggregatedScore(username);

  // Get daily activity metrics for the last 30 days
  const { startDate, endDate } = calculateDateRange({ days: 30 });

  const dailyActivity = await getUserActivityHeatmaps(
    username,
    startDate,
    endDate,
  );
  return {
    username,
    score: userScore.totalScore,
    monthlySummary: monthlySummary?.summary || "",
    weeklySummary: weeklySummary?.summary || "",
    roleTags: tagsData.roleTags,
    skillTags: tagsData.skillTags,
    focusAreaTags: tagsData.focusAreaTags,
    stats: {
      additions: prStats?.additions || 0,
      deletions: prStats?.deletions || 0,
      changedFiles: prStats?.changedFiles || 0,
      totalPrs: prStats?.total || 0,
      mergedPrs: prStats?.merged || 0,
      closedPrs: prStats?.closed || 0,
    },
    totalXp: tagsData.totalXp,
    totalLevel: tagsData.totalLevel,
    dailyActivity,
  };
}
