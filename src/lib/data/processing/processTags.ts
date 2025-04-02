import {
  ProcessingStep,
  BaseProcessingContext,
  ProcessingResult,
} from "./types";
import { PipelineConfig, TagConfig } from "../types";
import { QueryParams } from "../queries";
import { db } from "../db";
import {
  tags,
  userTagScores,
  rawPullRequests,
  rawPullRequestFiles,
} from "../schema";
import { eq, and, inArray } from "drizzle-orm";
import { getContributorPRs } from "../queries";
import { LogLevel, Logger } from "./logger";
import { ContributorContext } from "../processing";

export interface ExpertiseArea {
  tag: string;
  category: string;
  score: number;
  level: number;
  progress: number;
}

export class ProcessTags
  implements ProcessingStep<ContributorContext, ExpertiseArea[]>
{
  name = "tags";
  private logger: Logger;

  constructor() {
    this.logger = new Logger({ prefix: this.name });
  }

  async process(
    context: ContributorContext,
    queryParams: QueryParams,
    config: PipelineConfig
  ): Promise<ProcessingResult<ExpertiseArea[]>> {
    const { username } = context;

    // Create a step-specific logger
    const stepLogger = this.logger.child(`user:${username}`);
    stepLogger.info(`Processing expertise tags for user ${username}`);

    // Fetch data directly from database
    const contributorPRs = await getContributorPRs(username, queryParams);
    stepLogger.debug(`Fetched ${contributorPRs.length} PRs from database`);

    // Extract file paths from PRs
    const filePaths = contributorPRs.flatMap((pr) => {
      if (pr.files) {
        return pr.files.map((f: any) => f.path);
      }
      return [];
    });

    // Extract PR titles
    const prTitles = contributorPRs.map((pr) => pr.title || "").filter(Boolean);

    stepLogger.debug(
      `Processing ${filePaths.length} files and ${prTitles.length} PR titles`
    );

    const expertiseAreas = await this.calculateExpertiseAreas(
      username,
      filePaths,
      prTitles,
      config.tags,
      stepLogger
    );

    // Log summary of expertise areas
    const topAreas = expertiseAreas
      .slice(0, 3)
      .map((area) => `${area.tag} (${area.score})`)
      .join(", ");
    stepLogger.info(
      `User ${username} has ${
        expertiseAreas.length
      } expertise areas. Top areas: ${topAreas || "none"}`
    );

    return {
      data: expertiseAreas,
      updates: {
        expertiseAreas,
      },
      stats: {
        totalExpertiseAreas: expertiseAreas.length,
        topTags: expertiseAreas.slice(0, 5).map((a) => a.tag),
      },
    };
  }

  private async calculateExpertiseAreas(
    username: string,
    filePaths: string[],
    prTitles: string[],
    tagConfig: PipelineConfig["tags"],
    logger: Logger
  ): Promise<ExpertiseArea[]> {
    const tagScores: Record<string, { score: number; category: string }> = {};
    const allTags = [...tagConfig.area, ...tagConfig.role, ...tagConfig.tech];

    logger.debug(`Evaluating ${allTags.length} tag rules`);

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
        logger.trace(`Tag ${rule.name} scored ${score} points`);
        tagScores[rule.name] = {
          score,
          category: rule.category,
        };
      }
    }

    // Calculate levels for each tag
    const result: ExpertiseArea[] = [];
    const tagCount = Object.keys(tagScores).length;
    logger.debug(`Found ${tagCount} applicable tags for user ${username}`);

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

      logger.debug(`Tag ${tag} level ${level} (score: ${score})`);

      // Store in database
      await this.storeTagScore(username, tag, category, score, level, progress);
    }

    // Sort by score (highest first)
    return result.sort((a, b) => b.score - a.score);
  }

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
}
