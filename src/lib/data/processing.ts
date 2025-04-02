import { db } from "./db";
import {
  rawPullRequests,
  rawIssues,
  prReviews,
  prComments,
  issueComments,
  users,
  userDailySummaries,
  userStats,
  tags,
  userTagScores,
  rawPullRequestFiles,
} from "./schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import path from "path";
import { TagConfig, PipelineConfig, DateRange } from "./types";
import {
  getActiveContributors,
  getContributorPRMetrics,
  getContributorIssueMetrics,
  getContributorReviewMetrics,
  getContributorCommentMetrics,
  QueryParams,
  getContributorPRs,
} from "./queries";
import { toDateString } from "../date-utils";
import { groupBy } from "../arrayHelpers";
import {
  calculateIssueScore,
  calculateReviewScore,
  calculateCommentScore,
  calculatePRScore,
  calculateContributorScore,
} from "./scoring";

interface ContributorMetrics {
  username: string;
  avatarUrl?: string;
  score: number;
  pullRequests: {
    total: number;
    merged: number;
    open: number;
    closed: number;
  };
  issues: {
    total: number;
    open: number;
    closed: number;
  };
  reviews: {
    total: number;
    approved: number;
    changesRequested: number;
    commented: number;
  };
  comments: {
    pullRequests: number;
    issues: number;
  };
  codeChanges: {
    additions: number;
    deletions: number;
    files: number;
  };
  focusAreas: Array<{
    area: string;
    count: number;
    percentage: number;
  }>;
  fileTypes: Array<{
    extension: string;
    count: number;
    percentage: number;
  }>;
  expertiseAreas: Array<{
    tag: string;
    category: string;
    score: number;
    level: number;
    progress: number;
  }>;
}

interface ProcessingResult {
  metrics: ContributorMetrics[];
  totals: {
    contributors: number;
    pullRequests: number;
    issues: number;
    reviews: number;
    comments: number;
  };
  timeframe: DateRange | null;
}

/**
 * Main pipeline processor that orchestrates the contribution analysis
 */
export class ContributorPipeline {
  private config: PipelineConfig;

  constructor(config: PipelineConfig) {
    this.config = config;
  }

  /**
   * Process contributions data for a specific time period
   */
  async processTimeframe(queryParams: QueryParams): Promise<ProcessingResult> {
    // Get active contributors in the time period
    const contributors = await getActiveContributors(queryParams);

    console.log(`Processing ${contributors.length} active contributors`);

    // Process metrics for each contributor
    const metrics: ContributorMetrics[] = [];
    let totalPRs = 0;
    let totalIssues = 0;
    let totalReviews = 0;
    let totalComments = 0;

    for (const username of contributors) {
      const contributorMetrics = await this.processContributor(
        username,
        queryParams
      );
      metrics.push(contributorMetrics);

      // Update totals
      totalPRs += contributorMetrics.pullRequests.total;
      totalIssues += contributorMetrics.issues.total;
      totalReviews += contributorMetrics.reviews.total;
      totalComments +=
        contributorMetrics.comments.pullRequests +
        contributorMetrics.comments.issues;
    }

    // Sort contributors by score
    metrics.sort((a, b) => b.score - a.score);

    // Save daily summaries
    await this.saveDailySummaries(
      metrics,
      queryParams.dateRange?.endDate || ""
    );

    // Return processed data
    return {
      metrics,
      totals: {
        contributors: contributors.length,
        pullRequests: totalPRs,
        issues: totalIssues,
        reviews: totalReviews,
        comments: totalComments,
      },
      timeframe: queryParams.dateRange || null,
    };
  }

  /**
   * Process metrics for a single contributor
   */
  private async processContributor(
    username: string,
    queryParams: QueryParams
  ): Promise<ContributorMetrics> {
    console.log(`Processing metrics for ${username}`);

    // Initialize metrics
    const metrics: ContributorMetrics = {
      username,
      score: 0,
      pullRequests: {
        total: 0,
        merged: 0,
        open: 0,
        closed: 0,
      },
      issues: {
        total: 0,
        open: 0,
        closed: 0,
      },
      reviews: {
        total: 0,
        approved: 0,
        changesRequested: 0,
        commented: 0,
      },
      comments: {
        pullRequests: 0,
        issues: 0,
      },
      codeChanges: {
        additions: 0,
        deletions: 0,
        files: 0,
      },
      focusAreas: [],
      fileTypes: [],
      expertiseAreas: [],
    };

    // Get contributor profile info (avatar URL)
    const userProfile = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get();

    if (userProfile) {
      metrics.avatarUrl = userProfile.avatarUrl || undefined;
    }

    // Calculate scores and get all metrics in one call
    const scoreResult = await calculateContributorScore(
      username,
      queryParams,
      this.config.scoring
    );

    // Update metrics from scoreResult
    metrics.score = scoreResult.totalScore;
    metrics.pullRequests = scoreResult.metrics.pullRequests;
    metrics.issues = scoreResult.metrics.issues;
    metrics.reviews = scoreResult.metrics.reviews;
    metrics.comments = scoreResult.metrics.comments;
    metrics.codeChanges = scoreResult.metrics.codeChanges;

    const contributorPRs = await getContributorPRs(username, queryParams);

    // Calculate focus areas and file types
    const filePaths = contributorPRs.flatMap((pr) => {
      if (pr.files) {
        return pr.files.map((f: any) => f.path);
      }
      return [];
    });
    metrics.focusAreas = this.calculateFocusAreas(filePaths);
    metrics.fileTypes = this.calculateFileTypes(filePaths);

    // Calculate expertise areas
    metrics.expertiseAreas = await this.calculateExpertiseAreas(
      username,
      filePaths,
      [] // TODO: Update PR metrics to include titles
    );

    // Update user record
    await this.updateUserRecord(metrics);

    return metrics;
  }

  /**
   * Calculate focus areas based on file paths
   */
  private calculateFocusAreas(
    filePaths: string[]
  ): ContributorMetrics["focusAreas"] {
    const dirCounts: Record<string, number> = {};
    let totalFiles = 0;

    for (const filePath of filePaths) {
      const parts = filePath.split("/");
      if (parts.length > 1) {
        const topDir = parts[0];
        dirCounts[topDir] = (dirCounts[topDir] || 0) + 1;
        totalFiles++;
      }
    }

    // Calculate percentages and sort by count
    return Object.entries(dirCounts)
      .map(([area, count]) => ({
        area,
        count,
        percentage: totalFiles > 0 ? Math.round((count / totalFiles) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 focus areas
  }

  /**
   * Calculate file types based on file extensions
   */
  private calculateFileTypes(
    filePaths: string[]
  ): ContributorMetrics["fileTypes"] {
    const extensionCounts: Record<string, number> = {};
    let totalFiles = 0;

    for (const filePath of filePaths) {
      const ext = path.extname(filePath);
      if (ext) {
        extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
        totalFiles++;
      }
    }

    // Calculate percentages and sort by count
    return Object.entries(extensionCounts)
      .map(([extension, count]) => ({
        extension,
        count,
        percentage: totalFiles > 0 ? Math.round((count / totalFiles) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 file types
  }

  /**
   * Calculate expertise areas based on tag rules
   */
  private async calculateExpertiseAreas(
    username: string,
    filePaths: string[],
    prTitles: string[]
  ): Promise<ContributorMetrics["expertiseAreas"]> {
    const tagScores: Record<string, { score: number; category: string }> = {};
    const allTags = [
      ...this.config.tags.area,
      ...this.config.tags.role,
      ...this.config.tags.tech,
    ];

    // Apply tag rules to file paths
    for (const rule of allTags) {
      let score = 0;

      // Check file paths
      if (rule.category === "AREA" || rule.category === "TECH") {
        for (const pattern of rule.patterns) {
          for (const filePath of filePaths) {
            if (filePath.toLowerCase().includes(pattern.toLowerCase())) {
              score += rule.weight;
            }
          }
        }
      }

      // Check PR titles
      if (rule.category === "ROLE" || rule.category === "TECH") {
        for (const pattern of rule.patterns) {
          for (const title of prTitles) {
            if (title.toLowerCase().includes(pattern.toLowerCase())) {
              score += rule.weight;
            }
          }
        }
      }

      if (score > 0) {
        tagScores[rule.name] = {
          score,
          category: rule.category,
        };
      }
    }

    // Calculate levels for each tag
    const result: ContributorMetrics["expertiseAreas"] = [];

    for (const [tag, { score, category }] of Object.entries(tagScores)) {
      // Calculate level using logarithmic progression
      const level = Math.floor(Math.log(score + 1) / Math.log(2));
      const nextLevelThreshold = Math.pow(2, level + 1) - 1;
      const currentLevelThreshold = Math.pow(2, level) - 1;
      const progress =
        (score - currentLevelThreshold) /
        (nextLevelThreshold - currentLevelThreshold);

      result.push({
        tag,
        category,
        score,
        level,
        progress: Math.min(1, progress),
      });

      // Store in database for future reference
      await this.storeTagScore(username, tag, category, score, level, progress);
    }

    // Sort by score (highest first)
    return result.sort((a, b) => b.score - a.score);
  }

  /**
   * Store tag score in the database
   */
  private async storeTagScore(
    username: string,
    tag: string,
    category: string,
    score: number,
    level: number,
    progress: number
  ): Promise<void> {
    // Ensure tag exists in database
    await db
      .insert(tags)
      .values({
        name: tag,
        category,
        description: "",
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: tags.name,
        set: {
          lastUpdated: new Date().toISOString(),
        },
      });

    // Store user tag score
    await db
      .insert(userTagScores)
      .values({
        id: `${username}_${tag}`,
        username,
        tag,
        score,
        level,
        progress,
        pointsToNext: Math.pow(2, level + 1) - 1,
        lastUpdated: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: userTagScores.id,
        set: {
          score,
          level,
          progress,
          pointsToNext: Math.pow(2, level + 1) - 1,
          lastUpdated: new Date().toISOString(),
        },
      });
  }

  /**
   * Save daily summaries for contributors
   */
  private async saveDailySummaries(
    metrics: ContributorMetrics[],
    date: string
  ): Promise<void> {
    const dateStr = toDateString(date);

    for (const metric of metrics) {
      // Create a structured daily summary
      const dailyData = {
        id: `${metric.username}_${dateStr}`,
        username: metric.username,
        date: dateStr,
        score: metric.score,
        summary: "", // Will be filled by AI summarization if enabled
        totalCommits: 0, // Will need to calculate from PR data
        totalPRs: metric.pullRequests.total,
        additions: metric.codeChanges.additions,
        deletions: metric.codeChanges.deletions,
        changedFiles: metric.codeChanges.files,
        commits: "[]", // JSON string
        pullRequests: "[]", // JSON string
        issues: "[]", // JSON string
      };

      // Store the daily summary
      await db
        .insert(userDailySummaries)
        .values(dailyData)
        .onConflictDoUpdate({
          target: userDailySummaries.id,
          set: {
            score: metric.score,
            totalPRs: metric.pullRequests.total,
            additions: metric.codeChanges.additions,
            deletions: metric.codeChanges.deletions,
            changedFiles: metric.codeChanges.files,
          },
        });

      // Create file type data for storing in stats
      const filesByTypeObj: Record<string, number> = {};
      metric.fileTypes.forEach(({ extension, count }) => {
        filesByTypeObj[extension] = count;
      });

      // Create focus area data for storing in stats
      const focusAreasArray = metric.focusAreas.map(({ area, count }) => [
        area,
        count,
      ]);

      // Update user stats
      await db
        .insert(userStats)
        .values({
          username: metric.username,
          totalPRs: metric.pullRequests.total,
          mergedPRs: metric.pullRequests.merged,
          closedPRs: metric.pullRequests.closed,
          totalFiles: metric.codeChanges.files,
          totalAdditions: metric.codeChanges.additions,
          totalDeletions: metric.codeChanges.deletions,
          filesByType: JSON.stringify(filesByTypeObj),
          prsByMonth: "{}", // Would need to group PRs by month
          focusAreas: JSON.stringify(focusAreasArray),
          lastUpdated: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: userStats.username,
          set: {
            totalPRs: metric.pullRequests.total,
            mergedPRs: metric.pullRequests.merged,
            closedPRs: metric.pullRequests.closed,
            totalFiles: metric.codeChanges.files,
            totalAdditions: metric.codeChanges.additions,
            totalDeletions: metric.codeChanges.deletions,
            filesByType: JSON.stringify(filesByTypeObj),
            focusAreas: JSON.stringify(focusAreasArray),
            lastUpdated: new Date().toISOString(),
          },
        });
    }
  }

  private async updateUserRecord(metrics: ContributorMetrics): Promise<void> {
    // Implementation of updateUserRecord method
  }
}
