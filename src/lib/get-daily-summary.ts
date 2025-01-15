import { promises as fs } from "fs";
import path from "path";

export interface DailySummaryData {
  title: string;
  overview: string;
  metrics: {
    contributors: number;
    merged_prs: number;
    new_issues: number;
    lines_changed: number;
  };
  changes: {
    features: string[];
    fixes: string[];
    chores: string[];
  };
  areas: {
    name: string;
    files: number;
    additions: number;
    deletions: number;
  }[];
  top_contributors: {
    name: string;
    summary: string;
    areas: string[];
  }[];
}

export async function getDailySummary(): Promise<DailySummaryData> {
  const summaryPath = path.join(process.cwd(), "data/daily/summary.json");
  const summaryData = JSON.parse(await fs.readFile(summaryPath, "utf8"));
  return summaryData;
}
