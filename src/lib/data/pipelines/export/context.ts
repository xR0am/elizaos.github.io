import { RepoPipelineContext } from "../types";

export interface RepositoryStatsPipelineContext extends RepoPipelineContext {
  outputDir: string;
}

/**
 * Creates a repository stats export pipeline context
 */
export function createRepositoryStatsPipelineContext(params: {
  repoId?: string;
  dateRange?: RepositoryStatsPipelineContext["dateRange"];
  outputDir: string;
  logger?: RepositoryStatsPipelineContext["logger"];
  config: RepositoryStatsPipelineContext["config"];
}): RepositoryStatsPipelineContext {
  const { repoId, dateRange, outputDir, logger: parentLogger, config } = params;

  // Use parent logger if provided, creating a child logger for RepositoryStats
  const logger = parentLogger ? parentLogger.child("Export") : undefined;

  return {
    repoId,
    dateRange,
    outputDir,
    logger,
    config,
  };
}
