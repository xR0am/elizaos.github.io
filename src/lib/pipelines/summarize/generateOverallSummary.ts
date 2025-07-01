import { createStep, pipe, mapStep } from "../types";
import { SummarizerPipelineContext } from "./context";
import { generateOverallSummary } from "./aiOverallSummary";
import { generateTimeIntervals } from "../generateTimeIntervals";
import { IntervalType, TimeInterval, toDateString } from "@/lib/date-utils";
import { isNotNullOrUndefined } from "@/lib/typeHelpers";
import { getRepoMetrics } from "../export/queries";
import { getRepoFilePath, writeToFile } from "@/lib/fsHelpers";
import { existsSync } from "node:fs";

export const generateOverallSummaryForInterval = createStep(
  "OverallSummary",
  async (
    { interval }: { interval: TimeInterval },
    context: SummarizerPipelineContext,
  ) => {
    return null;
  },
);

export const generateMonthlyOverallSummaries = pipe(
  generateTimeIntervals("month"),
  mapStep(generateOverallSummaryForInterval),
);

export const generateWeeklyOverallSummaries = pipe(
  generateTimeIntervals("week"),
  mapStep(generateOverallSummaryForInterval),
);

export const generateDailyOverallSummaries = pipe(
  generateTimeIntervals("day"),
  mapStep(generateOverallSummaryForInterval),
);
