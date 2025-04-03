/**
 * Predefined pipelines for common data processing flows
 */
import { pipe, mapStep, createStep, RepoPipelineContext } from "./types";
import { ContributorPipeline } from "./contributors";
import { db } from "../db";

/**
 * Pipeline for processing all repositories (or filtered by repoId)
 */
export const processAllRepositories = pipe(
  createStep("fetchRepositories", async (_, { logger }) => {
    const repos = await db.query.repositories.findMany();
    const ids = repos.map(({ repoId }) => repoId);
    logger?.info(`Found ${repos.length} repositories in DB`, { ids });
    return ids;
  }),
  // Initialize with empty input
  createStep(
    "filterRepositories",
    (repos: string[], { repoId, logger, config }: RepoPipelineContext) => {
      if (repoId) return repos.filter((repo) => repo === repoId);
      const configRepos = config.repositories.map((r) => r.repoId);

      const filteredRepos = repos.filter(
        (repo) => configRepos.indexOf(repo) >= 0
      );
      logger?.info(`Restricting repos`, { filteredRepos });
      return filteredRepos;
    }
  ),
  // Map the processRepository pipeline over each repository
  mapStep(ContributorPipeline)
);
