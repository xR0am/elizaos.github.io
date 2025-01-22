import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";

const MonthlyAnalysisSchema = z.object({
  username: z.string(),
  summary: z.string(),
  tag_scores: z.record(z.number()),
  tag_levels: z.record(
    z.object({
      level: z.number(),
      progress: z.number(),
      points: z.number(),
      points_next_level: z.number(),
    })
  ),
  tags: z.array(z.string()),
  stats: z.object({
    total_prs: z.number(),
    merged_prs: z.number(),
    closed_prs: z.number(),
    total_files: z.number(),
    total_additions: z.number(),
    total_deletions: z.number(),
    files_by_type: z.record(z.number()),
    prs_by_month: z.record(z.number()),
  }),
  focus_areas: z.array(z.tuple([z.string(), z.number()])),
});

const MonthlyAnalysisFileSchema = z.object({
  contributors: z.array(MonthlyAnalysisSchema),
  metadata: z.object({
    total_contributors: z.number(),
    analysis_date: z.string(),
    analysis_timeframe: z.object({
      after: z.string(),
      before: z.string(),
    }),
    tags_found: z.array(z.string()),
    period: z.string(),
    days: z.number(),
  }),
});

export type MonthlyAnalysis = z.infer<typeof MonthlyAnalysisSchema>;

export async function getMonthlyAnalysis(
  username: string
): Promise<MonthlyAnalysis | null> {
  try {
    const filePath = path.join(process.cwd(), "data", "monthly_analysis.json");
    const fileContents = await fs.readFile(filePath, "utf8");
    const data = MonthlyAnalysisFileSchema.parse(JSON.parse(fileContents));

    return data.contributors.find((c) => c.username === username) || null;
  } catch (error) {
    console.error("Error fetching monthly analysis:", error);
    return null;
  }
}
