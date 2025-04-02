import { ProcessingStep, ProcessingResult } from "./types";
import { PipelineConfig } from "../types";
import { QueryParams } from "../queries";
import {
  getContributorPRs,
  getContributorIssueMetrics,
  getContributorReviewMetrics,
  getContributorCommentMetrics,
} from "../queries";
import { db } from "../db";
import { userDailySummaries } from "../schema";
import { toDateString } from "../../date-utils";
import { Logger } from "./logger";
import { ContributorContext } from "../processing";

export interface DailySummary {
  date: string;
  summary: string;
}

export class ProcessDailySummaries
  implements ProcessingStep<ContributorContext, DailySummary>
{
  name = "dailySummaries";
  private logger: Logger;

  constructor() {
    this.logger = new Logger({ prefix: this.name });
  }

  async process(
    context: ContributorContext,
    queryParams: QueryParams,
    config: PipelineConfig
  ): Promise<ProcessingResult<DailySummary>> {
    const { username } = context;

    // Create a step-specific logger
    const stepLogger = this.logger.child(`user:${username}`);
    stepLogger.info(`Processing daily summary for user ${username}`);

    // Get date from query params or use current date
    const dateStr =
      queryParams.dateRange?.endDate || toDateString(new Date().toISOString());

    // Generate a summary for the user's activity on this date
    // This is a placeholder - in a real implementation, this would call an AI API
    // to generate a natural language summary of the user's activity
    const summary = await this.generateSummary(username, dateStr, queryParams);

    // Store the summary in the database
    await this.storeDailySummary(username, dateStr, summary);

    stepLogger.info(
      `Processed and stored daily summary for ${username} for date ${dateStr}`
    );

    return {
      data: {
        date: dateStr,
        summary,
      },
      stats: {
        summaryLength: summary.length,
        date: dateStr,
      },
    };
  }

  private async generateSummary(
    username: string,
    date: string,
    queryParams: QueryParams
  ): Promise<string> {
    // In a real implementation, this would call an AI service
    // For now, we'll generate a simple placeholder summary

    // Get some basic metrics to include in the summary
    const prs = await getContributorPRs(username, queryParams);
    const issueMetrics = await getContributorIssueMetrics(
      username,
      queryParams
    );
    const reviewMetrics = await getContributorReviewMetrics(
      username,
      queryParams
    );
    const commentMetrics = await getContributorCommentMetrics(
      username,
      queryParams
    );

    const summary =
      `${username} worked on ${prs.length} pull requests, ` +
      `engaged with ${issueMetrics.total} issues, ` +
      `provided ${reviewMetrics.total} reviews, and ` +
      `wrote ${commentMetrics.pullRequests + commentMetrics.issues} comments.`;

    return summary;
  }

  private async storeDailySummary(
    username: string,
    date: string,
    summary: string
  ): Promise<void> {
    const id = `${username}_${date}`;

    await db
      .insert(userDailySummaries)
      .values({
        id,
        username,
        date,
        summary,
        lastUpdated: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: userDailySummaries.id,
        set: {
          summary,
          lastUpdated: new Date().toISOString(),
        },
      });
  }
}
