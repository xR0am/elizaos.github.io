import { UserActivityHeatmap } from "@/lib/scoring/queries";

export interface TagData {
  tagName: string;
  score: number;
  level: number;
  progress: number;
  pointsToNext: number;
}

export interface UserStats {
  totalPrs: number;
  mergedPrs: number;
  closedPrs: number;
  additions: number;
  deletions: number;
  changedFiles: number;
}

export interface UserFocusAreaData {
  username: string;
  roleTags: TagData[];
  skillTags: TagData[];
  focusAreaTags: TagData[];
  score: number;
  stats: UserStats;
  monthlySummary: string;
  weeklySummary?: string;
  totalXp: number;
  totalLevel: number;
  avatarUrl?: string | null;
  dailyActivity?: UserActivityHeatmap[];
}

export type LeaderboardPeriod = "all" | "weekly" | "monthly";
