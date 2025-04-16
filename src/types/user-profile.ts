export interface TagLevel {
  level: number;
  progress: number;
  points: number;
  points_next_level: number;
}

export interface UserStats {
  total_prs: number;
  merged_prs: number;
  closed_prs: number;
  total_files: number;
  total_additions: number;
  total_deletions: number;
  files_by_type: Record<string, number>;
  prs_by_month: Record<string, number>;
}

export interface ActivityData {
  date: string;
  value: number;
  breakdown: {
    prScore: number;
    issueScore: number;
    reviewScore: number;
    commentScore: number;
  };
}

export interface UserFocusAreaData {
  username: string;
  tagScores: Record<string, number>;
  tagLevels: Record<string, TagLevel>;
  tags: string[];
  stats: UserStats;
  focusAreas: [string, number][];
  summary: string;
  score: number;
  avatarUrl?: string | null;
  dailyActivity?: ActivityData[];
}

export type LeaderboardPeriod = "all" | "weekly" | "monthly";
