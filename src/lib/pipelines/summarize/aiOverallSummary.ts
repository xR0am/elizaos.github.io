import { AISummaryConfig } from "./config";
import { callAIService } from "./callAIService";
import { RepositoryMetrics } from "../export/queries";
import { UTCDate } from "@date-fns/utc";
import {
  IntervalType,
  formatTimeframeTitle,
  getIntervalTypeTitle,
} from "@/lib/date-utils";

export async function generateOverallSummary(
  metrics: RepositoryMetrics[],
  config: AISummaryConfig,
  dateInfo: { startDate: string },
  intervalType: IntervalType,
): Promise<string | null> {
  return null;
}
