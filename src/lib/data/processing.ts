import { db } from "./db";
import {
  rawPullRequests,
  rawIssues,
  prReviews,
  prComments,
  issueComments,
  users,
  userDailySummaries,
  tags,
  userTagScores,
  rawPullRequestFiles,
} from "./schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import path from "path";
import { TagConfig, PipelineConfig, DateRange } from "./types";
import {
  getActiveContributors,
  QueryParams,
  getContributorPRs,
} from "./queries";
import { toDateString } from "../date-utils";
import { groupBy } from "../arrayHelpers";
import {
  ProcessingStep,
  BaseProcessingContext,
  ProcessTags,
  ProcessDailySummaries,
  DailySummary,
  parallelSteps,
  composeSteps,
  Logger,
  LogLevel,
} from "./processing/index";

interface ProcessingResult {
  timeframe: DateRange | null;
}

// Define a specific context for contributor processing
export interface ContributorContext extends BaseProcessingContext {
  username: string;
}

/**
 * Main pipeline processor that orchestrates the contribution analysis
 */
export class ContributorPipeline {
  private config: PipelineConfig;
  private contributorPipeline: ProcessingStep<ContributorContext, unknown>;
  private logger: Logger;

  constructor(config: PipelineConfig, logLevel: LogLevel = LogLevel.INFO) {
    this.config = config;
    this.logger = new Logger({ minLevel: logLevel, prefix: "Contributors" });
    const baseContext: ContributorContext = {
      username: "",
    };
    this.contributorPipeline = parallelSteps(baseContext, [
      new ProcessTags(),
      new ProcessDailySummaries(),
    ]);
  }

  /**
   * Process contributions data for a specific time period
   */
  async processTimeframe(queryParams: QueryParams): Promise<ProcessingResult> {
    const timeframeStr = queryParams.dateRange
      ? `${queryParams.dateRange.startDate} to ${queryParams.dateRange.endDate}`
      : "all time";
    this.logger.info(
      `Starting contributor processing for timeframe: ${timeframeStr}`
    );

    // Get active contributors in the time period
    const contributors = await getActiveContributors(queryParams);
    this.logger.info(
      `Found ${contributors.length} active contributors to process`
    );

    // Process each contributor
    const startTime = Date.now();

    for (const username of contributors) {
      this.logger.debug(`Processing metrics for ${username}`);
      await this.processContributor(username, queryParams);
    }

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
    this.logger.info(
      `Processed ${contributors.length} contributors in ${processingTime} seconds`
    );

    // Return processed data
    return {
      timeframe: queryParams.dateRange || null,
    };
  }

  /**
   * Process metrics for a single contributor
   */
  private async processContributor(
    username: string,
    queryParams: QueryParams
  ): Promise<void> {
    const contributorLogger = this.logger.child(`contributor:${username}`);
    contributorLogger.debug(`Starting processing for ${username}`);

    // Get contributor profile info (avatar URL)
    const userProfile = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get();

    if (!userProfile) {
      contributorLogger.warn(`User ${username} not found in database`);
      return;
    }

    // Create a processing context for the pipeline
    const context: ContributorContext = {
      username,
    };

    // Run the processing pipeline
    contributorLogger.debug(
      `Running processing pipeline: ${this.contributorPipeline.name}`
    );

    const result = await this.contributorPipeline.process(
      context,
      queryParams,
      this.config
    );

    // Log the statistics from processing steps
    if (result.stats) {
      contributorLogger.info("Processing step statistics:", result.stats);
    }

    contributorLogger.info(`Completed processing for ${username}`);
  }
}
