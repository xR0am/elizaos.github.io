import fs from "fs";
import path from "path";
import { glob } from "glob";
import {
  extractDateFromFilename,
  normalizeDate,
  denormalizeDate,
} from "@/lib/date-utils";

export interface DailySummary {
  title: string;
  version: string;
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
  areas: Array<{
    name: string;
    files: number;
    additions: number;
    deletions: number;
  }>;
  issues_summary: string;
  questions: string[];
  top_contributors: Array<{
    name: string;
    summary: string;
    areas: string[];
  }>;
}

export async function getAllDailySummaryDates(): Promise<string[]> {
  const summaryFiles = await glob("data/daily/history/summary_*.json");
  return summaryFiles
    .map((file) => extractDateFromFilename(file))
    .filter((date): date is string => date !== null)
    .sort()
    .reverse();
}

export async function getDailySummary(
  date: string
): Promise<DailySummary | null> {
  const normalizedDate = normalizeDate(date);
  const denormalizedDate = denormalizeDate(date);

  // Try both formats
  const filePaths = [
    path.join(
      process.cwd(),
      "data/daily/history",
      `summary_${normalizedDate}.json`
    ),
    path.join(
      process.cwd(),
      "data/daily/history",
      `summary_${denormalizedDate}.json`
    ),
  ];

  for (const filePath of filePaths) {
    try {
      const fileContents = await fs.promises.readFile(filePath, "utf8");
      return JSON.parse(fileContents);
    } catch {
      continue;
    }
  }

  console.warn(`No daily summary found for ${date}`);
  return null;
}
