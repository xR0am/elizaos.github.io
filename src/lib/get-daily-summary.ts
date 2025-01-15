import { promises as fs } from "fs";
import path from "path";
import { DailySummary } from "./get-daily-summaries";

export type DailySummaryData = DailySummary;

export async function getDailySummary(): Promise<DailySummaryData> {
  const summaryPath = path.join(process.cwd(), "data/daily/summary.json");
  const summaryData = JSON.parse(await fs.readFile(summaryPath, "utf8"));
  return summaryData;
}
