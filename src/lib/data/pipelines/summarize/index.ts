/**
 * Pipeline for generating AI-powered summaries of contributor activity
 */
import { parallel, pipe, mapStep, createStep } from "../types";
import { getSelectedRepositories } from "../getSelectedRepositories";
import {
  generateWeeklyContributorSummaries,
  generateMonthlyContributorSummaries,
} from "./generateContributorSummary";
import { SummarizerPipelineContext, createSummarizerContext } from "./context";
import {
  generateDailyProjectSummaries,
  generateMonthlyProjectSummaries,
  generateWeeklyProjectSummaries,
} from "./generateProjectSummary";
import { isNotNullOrUndefined } from "@/lib/typeHelpers";
import { fetchContributors } from "../contributors/fetchContributors";

export const generateContributorSummariesForRepo = pipe(
  fetchContributors,
  mapStep(
    parallel(
      generateWeeklyContributorSummaries,
      generateMonthlyContributorSummaries,
    ),
  ),
  createStep("Log Summaries", (results, context) => {
    const filteredResults = results.filter((r) => r.length > 0);
    const contributors = filteredResults.length;
    const numWeeklySummaries = filteredResults.reduce((acc, result) => {
      return acc + result[0].filter(isNotNullOrUndefined).length;
    }, 0);
    const numMonthlySummaries = filteredResults.reduce((acc, result) => {
      return acc + result[1].filter(isNotNullOrUndefined).length;
    }, 0);
    context.logger?.info(
      `Generated ${numWeeklySummaries} weekly summaries and ${numMonthlySummaries} monthly summaries for ${contributors} contributors`,
    );
  }),
);

export { type SummarizerPipelineContext, createSummarizerContext };

export const generateContributorSummaries = pipe(
  getSelectedRepositories,
  mapStep(generateContributorSummariesForRepo),
);

// Pipeline for generating monthly project summaries
export const generateProjectSummaries = pipe(
  getSelectedRepositories,
  mapStep(
    parallel(
      generateDailyProjectSummaries,
      generateWeeklyProjectSummaries,
      generateMonthlyProjectSummaries,
    ),
  ),
  createStep("Log Project Summaries", (results, context) => {
    for (const repo of results) {
      const [daily, weekly, monthly] = repo;
      context.logger?.info(`Generated ${daily.length} daily summaries`);
      context.logger?.info(`Generated ${weekly.length} weekly summaries`);
      context.logger?.info(`Generated ${monthly.length} monthly summaries`);
    }
  }),
);
