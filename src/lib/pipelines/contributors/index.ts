import { getSelectedRepositories } from "../getSelectedRepositories";
import { pipe, mapStep, createStep } from "../types";
import { calculateTags } from "./calculateTags";
import { fetchContributors } from "./fetchContributors";

/**
 * Process a single repository
 */

export const processContributorTags = pipe(
  // Fetch contributors for the repository
  fetchContributors,

  // Process each contributor in parallel
  mapStep(calculateTags),
  // Format the combined results
  createStep("logResults", (results, context) => {
    // The first element is tags, the second is summary
    const totalContribtors = results.filter(Boolean).length;
    context.logger?.info(`Processed tags for ${totalContribtors} contributors`);
    return results;
  }),
);
export const contributorTagsPipeline = pipe(
  getSelectedRepositories,
  mapStep(processContributorTags),
);
