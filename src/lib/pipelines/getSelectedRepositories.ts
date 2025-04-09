import { eq } from "drizzle-orm";
import { db } from "@/lib/data/db";
import { repositories } from "@/lib/data/schema";
import { createStep, RepoPipelineContext } from "./types";

/**
 * Common pipeline step to fetch and filter repositories based on context
 */
export const getSelectedRepositories = createStep(
  "getSelectedRepositories",
  async (_, { repoId, logger, config }: RepoPipelineContext) => {
    // Fetch all repositories
    const repos = await db
      .select({ repoId: repositories.repoId })
      .from(repositories)
      .where(repoId ? eq(repositories.repoId, repoId) : undefined);
    logger?.info(`Found ${repos.length} repositories in DB`, {
      repos: repos.map((r) => r.repoId),
    });

    // Filter repositories
    const configRepos = config.repositories.map((r) => r.repoId);
    logger?.info(`Found ${configRepos.length} configured repositories`, {
      configRepos,
    });
    const selectedRepos = repos.filter(
      (repo) => configRepos.indexOf(repo.repoId) >= 0,
    );
    logger?.info(`Filtering for configured repositories`, { selectedRepos });

    return selectedRepos;
  },
);
