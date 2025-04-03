import { getActiveContributors } from "../../queries";
import { createStep, RepoPipelineContext } from "../types";
import { ContributorPipelineContext } from "./context";

/**
 * Fetch active contributors for a repository
 */

export const fetchContributors = createStep(
  "fetchContributors",
  async (repoId: string, { dateRange, logger }: ContributorPipelineContext) => {
    const contributors = await getActiveContributors({
      repository: repoId,
      dateRange,
    });
    logger?.info(
      `Retreived ${contributors.length} contributors active in current daterange`,
      { dateRange, repoId }
    );
    return contributors;
  }
);
