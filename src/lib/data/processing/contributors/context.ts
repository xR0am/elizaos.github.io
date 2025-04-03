import { PipelineConfig } from "../../types";
import { LogLevel, createLogger } from "../logger";
import { RepoPipelineContext } from "../types";

export interface ContributorPipelineContext extends RepoPipelineContext {}
/**
 * Creates a repository pipeline context
 */
export function createContributorPipelineContext(params: {
  repoId?: string;
  dateRange?: ContributorPipelineContext["dateRange"];
  logLevel?: LogLevel;
  config: PipelineConfig;
}): ContributorPipelineContext {
  const { repoId, dateRange, logLevel = "info", config } = params;

  // Create a logger for this pipeline
  const logger = createLogger({
    minLevel: logLevel,
    name: "Contributors",
    context: {
      ...(repoId ? { repoId } : {}),
      ...(dateRange
        ? { dateRange: `${dateRange.startDate}_${dateRange.endDate}` }
        : {}),
    },
  });

  return {
    repoId,
    dateRange,
    logger,
    config,
  };
}
