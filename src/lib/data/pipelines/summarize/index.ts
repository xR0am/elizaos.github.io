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
import { generateMonthlyProjectSummaries } from "./generateProjectSummary";
import { fetchContributors } from "../contributors/fetchContributors";
import { isNotNullOrUndefined } from "@/lib/typeHelpers";

export const generateContributorSummariesForRepo = pipe(
  fetchContributors,
  mapStep(
    parallel(
      generateWeeklyContributorSummaries,
      generateMonthlyContributorSummaries
    )
  ),
  createStep("Log Summaries", (results, context) => {
    const filteredResults = results.filter((r) => r.length > 0);
    const contributors = filteredResults.length;
    const numWeeklySummaries = filteredResults.reduce((acc, result) => {
      return acc + result[0].length;
    }, 0);
    const numMonthlySummaries = filteredResults.reduce((acc, result) => {
      return acc + result[1].length;
    }, 0);
    context.logger?.info(
      `Generated ${numWeeklySummaries} weekly summaries and ${numMonthlySummaries} monthly summaries for ${contributors} contributors`
    );
  })
);

export { type SummarizerPipelineContext, createSummarizerContext }; // Pipeline for generating contributor summaries with AI

export const generateContributorSummaries = pipe(
  getSelectedRepositories,
  mapStep(generateContributorSummariesForRepo)
);

// Pipeline for generating monthly project summaries
export const generateProjectSummaries = pipe(
  getSelectedRepositories,
  mapStep(generateMonthlyProjectSummaries),
  createStep("Log Project Summaries", (results, context) => {
    const totalSummaries = results.filter(isNotNullOrUndefined).length;
    context.logger?.info(
      `Generated ${totalSummaries} monthly project summaries`
    );
  })
);
