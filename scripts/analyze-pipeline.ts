#!/usr/bin/env bun
/**
 * GitHub Contribution Analytics Pipeline
 *
 * This script manages the full lifecycle of GitHub contribution analysis:
 * 1. Fetching data from GitHub using GraphQL API
 * 2. Storing raw data in SQLite database
 * 3. Processing raw data through modular processing steps
 */

import { config as loadEnv } from "dotenv";
import { join } from "path";

// Load environment variables from .env file
loadEnv();

// Validate required environment variables
const requiredEnvVars = ["GITHUB_TOKEN"];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(
    `Error: Missing required environment variables: ${missingEnvVars.join(
      ", ",
    )}`,
  );
  process.exit(1);
}

import { Command } from "@commander-js/extra-typings";
import { DataIngestion } from "../src/lib/data/ingestion";
import { PipelineConfigSchema } from "@/lib/data/pipelineConfig";
import chalk from "chalk";
import { subDays, format } from "date-fns";
import { generateRepositoryStats } from "@/lib/data/pipelines/export";
import { contributorTagsPipeline } from "@/lib/data/pipelines/contributors";
import {
  generateContributorSummaries,
  generateProjectSummaries,
} from "@/lib/data/pipelines/summarize";
import { createContributorPipelineContext } from "@/lib/data/pipelines/contributors/context";
import { createRepositoryStatsPipelineContext } from "@/lib/data/pipelines/export/context";
import { runPipeline } from "@/lib/data/pipelines/runPipeline";
import { createLogger, LogLevel } from "@/lib/data/pipelines/logger";
import { toDateString } from "@/lib/date-utils";
import { createSummarizerContext } from "@/lib/data/pipelines/summarize/context";

const DEFAULT_CONFIG_PATH = "../config/pipeline.config.ts";
const program = new Command();

program
  .name("analyze-pipeline")
  .description("GitHub Contribution Analytics Pipeline")
  .version("1.0.0");

// Create instances with config - will be initialized in each command
let dataIngestion: DataIngestion;

// Ingest data from GitHub
program
  .command("ingest")
  .description("Ingest data from GitHub API based on configuration")
  .option("-a, --after <date>", "Start date in YYYY-MM-DD format")
  .option(
    "-b, --before <date>",
    "End date in YYYY-MM-DD format (defaults to end of today)",
  )
  .option("-d, --days <number>", "Number of days to look back from before date")
  .option(
    "-c, --config <path>",
    "Path to pipeline config file",
    DEFAULT_CONFIG_PATH,
  )
  .option("-v, --verbose", "Enable verbose logging", false)
  .action(async (options) => {
    try {
      // Dynamically import the config
      const configPath = join(import.meta.dir, options.config);
      const configFile = await import(configPath);
      const pipelineConfig = PipelineConfigSchema.parse(configFile.default);

      // Create a root logger with appropriate log level
      const logLevel: LogLevel = options.verbose ? "debug" : "info";
      const rootLogger = createLogger({
        minLevel: logLevel,
      });

      // Initialize services with config
      dataIngestion = new DataIngestion(pipelineConfig, rootLogger);

      // Handle date calculations
      const endDate = options.before ? new Date(options.before) : new Date();

      let startDate: Date | undefined;

      if (options.after) {
        startDate = new Date(options.after);
      } else if (options.days) {
        startDate = subDays(endDate, parseInt(options.days));
      }

      const fetchOptions = {
        startDate: startDate ? toDateString(startDate) : undefined,
        endDate: toDateString(endDate),
      };

      rootLogger.info(
        `Fetching data from ${fetchOptions.startDate || "last fetched time"} to ${fetchOptions.endDate} using config from ${configPath}`,
      );

      // Fetch data for all configured repositories
      const results = await dataIngestion.fetchAllData(fetchOptions);

      // Log results
      for (const result of results) {
        rootLogger.info(
          `Repository ${result.repository}: Fetched ${result.prs} PRs and ${result.issues} issues`,
        );
      }
    } catch (error: unknown) {
      console.error(chalk.red("Error fetching data:"), error);
      process.exit(1);
    }
  });

// Process and analyze data
program
  .command("process")
  .description("Process and analyze data")
  .option("-r, --repository <owner/name>", "Process specific repository")
  .option("-v, --verbose", "Enable verbose logging", false)
  .option(
    "-c, --config <path>",
    "Path to pipeline config file",
    DEFAULT_CONFIG_PATH,
  )
  .action(async (options) => {
    try {
      // Dynamically import the config
      const configPath = join(import.meta.dir, options.config);
      const configFile = await import(configPath);
      const pipelineConfig = PipelineConfigSchema.parse(configFile.default);

      // Create a root logger
      const logLevel: LogLevel = options.verbose ? "debug" : "info";
      const rootLogger = createLogger({
        minLevel: logLevel,
        context: {
          command: "process",
          config: options.config,
        },
      });
      rootLogger.info(`Processing data  using config from ${configPath}`);

      // Create pipeline context with the root logger
      const context = createContributorPipelineContext({
        repoId: options.repository,
        logger: rootLogger,
        config: pipelineConfig,
      });

      // Run the pipeline directly - no need for the ContributorPipeline class
      const result = await runPipeline(
        contributorTagsPipeline,
        undefined, // No input for the root pipeline
        context,
        pipelineConfig,
      );

      const repoCount = result.length;
      const contributorCount = result.reduce(
        (acc, curr) => acc + curr.length,
        0,
      );

      rootLogger.info("\nProcessing completed successfully!");
      rootLogger.info(`Processed ${repoCount} repositories`);
      rootLogger.info(`Processed ${contributorCount} contributors`);
    } catch (error: unknown) {
      console.error(chalk.red("Error processing data:"), error);
      process.exit(1);
    }
  });

// Export repository stats
program
  .command("export")
  .description("Generate and export repository stats")
  .option("-v, --verbose", "Enable verbose logging", false)
  .option("-r, --repository <owner/name>", "Process specific repository")
  .option(
    "-c, --config <path>",
    "Path to pipeline config file",
    DEFAULT_CONFIG_PATH,
  )
  .option("-o, --output <dir>", "Output directory for stats", "./data/")
  .option("-d, --days <number>", "Number of days to look back", "30")
  .action(async (options) => {
    try {
      // Dynamically import the config
      const configPath = join(import.meta.dir, options.config);
      const configFile = await import(configPath);
      const pipelineConfig = PipelineConfigSchema.parse(configFile.default);

      // Calculate date range based on lookback days
      const lookbackDays = parseInt(options.days);
      const endDate = new Date();
      const startDate = subDays(endDate, lookbackDays);

      const startDateStr = format(startDate, "yyyy-MM-dd");

      // Create a root logger
      const logLevel: LogLevel = options.verbose ? "debug" : "info";
      const rootLogger = createLogger({
        minLevel: logLevel,
        context: {
          command: "export",
          config: options.config,
        },
      });
      rootLogger.info(
        `Generating repository stats using config from ${configPath}`,
      );

      // Create pipeline context
      const context = createRepositoryStatsPipelineContext({
        repoId: options.repository,
        logger: rootLogger,
        config: pipelineConfig,
        outputDir: options.output,
        dateRange: {
          startDate: startDateStr,
        },
      });

      // Run the repository summaries pipeline
      const result = await runPipeline(
        generateRepositoryStats,
        undefined,
        context,
        pipelineConfig,
      );

      rootLogger.info("\nExport completed successfully!");
      rootLogger.info(`Generated stats for ${result.length} repositories`);
    } catch (error: unknown) {
      console.error(chalk.red("Error exporting repository stats:"), error);
      process.exit(1);
    }
  });

// Generate summaries
program
  .command("summarize")
  .description("Generate activity summaries")
  .option("-r, --repository <owner/name>", "Process specific repository")
  .option("-v, --verbose", "Enable verbose logging", false)
  .option(
    "-c, --config <path>",
    "Path to pipeline config file",
    DEFAULT_CONFIG_PATH,
  )
  .option("-d, --days <number>", "Number of days to look back", "7")
  .option("-o, --overwrite", "Overwrite existing summaries", false)
  .option(
    "-t, --type <type>",
    "Type of summary to generate (contributors or project)",
    "project",
  )
  .option("--output-dir <dir>", "Output directory for summaries", "./data2/")
  .action(async (options) => {
    try {
      // Dynamically import the config
      const configPath = join(import.meta.dir, options.config);
      const configFile = await import(configPath);
      const pipelineConfig = PipelineConfigSchema.parse(configFile.default);

      // Calculate date range based on lookback days
      const lookbackDays = parseInt(options.days);
      const endDate = new Date();
      const startDate = subDays(endDate, lookbackDays);

      const startDateStr = format(startDate, "yyyy-MM-dd");

      // Create a root logger
      const logLevel: LogLevel = options.verbose ? "debug" : "info";
      const rootLogger = createLogger({
        minLevel: logLevel,
        context: {
          command: "summarize",
          config: options.config,
        },
      });

      // Validate summary type
      const summaryType = options.type.toLowerCase();
      if (summaryType !== "contributors" && summaryType !== "project") {
        rootLogger.error(
          `Invalid summary type: ${options.type}. Must be either "contributors" or "project".`,
        );
        process.exit(1);
      }

      // Set appropriate output directory based on summary type

      rootLogger.info(
        `Generating ${summaryType} summaries using config from ${configPath}`,
      );

      // Create summarizer context
      const context = createSummarizerContext({
        repoId: options.repository,
        logger: rootLogger,
        config: pipelineConfig,
        outputDir: options.outputDir,
        aiSummaryConfig: pipelineConfig.aiSummary,
        overwrite: options.overwrite,
        dateRange: {
          startDate: startDateStr,
        },
      });

      // Run the appropriate pipeline based on summary type
      if (summaryType === "contributors") {
        await runPipeline(
          generateContributorSummaries,
          undefined,
          context,
          pipelineConfig,
        );
      } else {
        await runPipeline(
          generateProjectSummaries,
          undefined,
          context,
          pipelineConfig,
        );
      }
    } catch (error: unknown) {
      console.error(chalk.red("Error generating summaries:"), error);
      process.exit(1);
    }
  });

program.parse(process.argv);
