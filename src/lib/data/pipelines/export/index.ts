import { pipe, mapStep, parallel } from "../types";
import { generateTimeIntervals } from "../generateTimeIntervals";
import { exportRepoStatsForInterval } from "./exportRepoStats";
import { getSelectedRepositories } from "../getSelectedRepositories";

/**
 * Pipeline for generating repository stats
 */
const generateDailyRepoStats = pipe(
  generateTimeIntervals<{ repoId: string }>("day"),
  mapStep(exportRepoStatsForInterval)
);

const generateWeeklyRepoStats = pipe(
  generateTimeIntervals<{ repoId: string }>("week"),
  mapStep(exportRepoStatsForInterval)
);

const generateMonthlyRepoStats = pipe(
  generateTimeIntervals<{ repoId: string }>("month"),
  mapStep(exportRepoStatsForInterval)
);

export const generateRepositoryStats = pipe(
  getSelectedRepositories,
  mapStep(
    parallel(
      generateDailyRepoStats,
      generateWeeklyRepoStats,
      generateMonthlyRepoStats
    )
  )
);
