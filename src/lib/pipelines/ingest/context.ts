import { RepoPipelineContext } from "../types";
import { GitHubClient } from "@/lib/data/github";

/**
 * Context for ingestion pipeline operations
 */
export interface IngestionPipelineContext extends RepoPipelineContext {
  /** GitHub client for API requests */
  github: GitHubClient;
  /** Flag to force fetch data regardless of lastFetched timestamp */
  force?: boolean;
}

/**
 * Create a context for ingestion pipeline
 */
export function createIngestionContext({
  repoId,
  logger,
  config,
  dateRange,
  force = false,
}: Partial<IngestionPipelineContext>): IngestionPipelineContext {
  // Create a GitHub client with the provided logger or a child logger
  const githubLogger = logger?.child("GitHub");
  const github = new GitHubClient(githubLogger);

  return {
    config: config!,
    logger,
    github,
    repoId,
    dateRange,
    force,
  };
}
