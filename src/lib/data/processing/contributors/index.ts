import { pipe, mapStep, parallel, createStep } from "../types";
import { calculateTags } from "./calculateTags";
import { fetchContributors } from "./fetchContributors";
import { generateDailySummary } from "./generateDailySummary";

/**
 * Process a single repository
 */

export const ContributorPipeline = pipe(
  // Fetch contributors for the repository
  fetchContributors,

  // Process each contributor in parallel
  mapStep(
    // Process tags and daily summaries in parallel
    parallel(calculateTags, generateDailySummary)
  ),
  // Format the combined results
  createStep("logResults", (results, context) => {
    // The first element is tags, the second is summary
    const totalContribtors = results.length;
    context.logger?.info(
      `Processed tags and daily summaries for ${totalContribtors} contributors`
    );
    return results;
  })
);
