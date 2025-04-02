#!/usr/bin/env bun
/**
 * GitHub Contribution Analytics Pipeline
 *
 * This script manages the full lifecycle of GitHub contribution analysis:
 * 1. Fetching data from GitHub using GraphQL API
 * 2. Storing raw data in SQLite database
 * 3. Processing raw data through modular processing steps
 */

import { Command } from "commander";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db } from "../src/lib/data/db";
import { repositories } from "../src/lib/data/schema";
import { DataIngestion } from "../src/lib/data/ingestion";
import { ContributorPipeline } from "../src/lib/data/processing";
import { PipelineConfig, PipelineConfigSchema } from "../src/lib/data/types";
import chalk from "chalk";
import { subDays, format } from "date-fns";
import { join } from "path";
import { LogLevel } from "../src/lib/data/processing/logger";

const program = new Command();

program
  .name("analyze-pipeline")
  .description("GitHub Contribution Analytics Pipeline")
  .version("1.0.0")
  .option(
    "-c, --config <path>",
    "Path to pipeline config file",
    "../config/pipeline.config.ts"
  );

// Create instances with config - will be initialized in each command
let dataIngestion: DataIngestion;
let contributorPipeline: ContributorPipeline;

// Initialize database schema
program
  .command("migrate")
  .description("Initialize the database schema")
  .action(async () => {
    try {
      console.log(chalk.blue("Initializing database schema..."));
      migrate(db, { migrationsFolder: "./drizzle" });
      console.log(chalk.green("Database schema initialized successfully"));
    } catch (error: unknown) {
      console.error(chalk.red("Error initializing database schema:"), error);
      process.exit(1);
    }
  });

// Fetch data from GitHub
program
  .command("fetch")
  .description("Fetch data from GitHub based on configuration")
  .option("-d, --days <number>", "Number of days to look back", "14")
  .action(async (options) => {
    try {
      // Dynamically import the config
      const configPath = join(import.meta.dir, options.parent.config);
      const configFile = await import(configPath);
      const pipelineConfig = PipelineConfigSchema.parse(configFile);

      // Initialize services with config
      dataIngestion = new DataIngestion(pipelineConfig);

      // Use command line days if specified, otherwise fallback to config
      const lookbackDays = parseInt(options.days);
      const fetchOptions = {
        days: lookbackDays,
      };

      console.log(
        chalk.blue(
          `Fetching data for the last ${lookbackDays} days using config from ${configPath}...`
        )
      );

      // Fetch data for all configured repositories
      const results = await dataIngestion.fetchAllData(fetchOptions);

      // Log results
      for (const result of results) {
        console.log(
          chalk.green(
            `Repository ${result.repository}: Fetched ${result.prs} PRs and ${result.issues} issues`
          )
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
  .option("-d, --days <number>", "Number of days to look back", "14")
  .option("-v, --verbose", "Enable verbose logging", false)
  .action(async (options) => {
    try {
      // Dynamically import the config
      const configPath = join(import.meta.dir, options.parent.config);
      const { pipelineConfig } = await import(configPath);

      // Initialize services with config
      const logLevel = options.verbose ? LogLevel.DEBUG : LogLevel.INFO;
      contributorPipeline = new ContributorPipeline(pipelineConfig, logLevel);

      // Use command line days if specified, otherwise fallback to config
      const lookbackDays =
        parseInt(options.days) || pipelineConfig.lookbackDays;
      const endDate = new Date();
      const startDate = subDays(endDate, lookbackDays);

      const startDateStr = format(startDate, "yyyy-MM-dd");
      const endDateStr = format(endDate, "yyyy-MM-dd");

      console.log(
        chalk.blue(
          `Processing data from ${startDateStr} to ${endDateStr} using config from ${configPath}...`
        )
      );

      // Get the repositories from database
      const repoRows = await db.select().from(repositories).all();

      if (repoRows.length === 0) {
        console.error(chalk.red("No repositories found to process."));
        process.exit(1);
      }

      // If repository is specified, validate it exists
      if (options.repository) {
        const targetRepo = repoRows.find(
          (repo) => `${repo.repoId}` === options.repository
        );
        if (!targetRepo) {
          console.error(
            chalk.red(
              `Repository "${options.repository}" not found in database.`
            )
          );
          process.exit(1);
        }
      }

      // Process either the specified repository or all repositories
      const reposToProcess = options.repository
        ? repoRows.filter((repo) => `${repo.repoId}` === options.repository)
        : repoRows;

      // Process each repository
      for (const repo of reposToProcess) {
        const repository = `${repo.repoId}`;
        console.log(
          chalk.blue(`\nProcessing data for repository: ${repository}`)
        );

        // Process data for the repository
        await contributorPipeline.processTimeframe({
          dateRange: {
            startDate: startDateStr,
            endDate: endDateStr,
          },
          repository,
        });
      }

      console.log(chalk.green("\nProcessing completed successfully!"));
    } catch (error: unknown) {
      console.error(chalk.red("Error processing data:"), error);
      process.exit(1);
    }
  });

// Run complete pipeline
program
  .command("run")
  .description("Run complete pipeline (fetch and process)")
  .option("-d, --days <number>", "Number of days to look back", "7")
  .option("-v, --verbose", "Enable verbose logging", false)
  .action(async (options) => {
    try {
      console.log(chalk.blue("Starting full analytics pipeline..."));

      // Run fetch command with days parameter
      await program.parseAsync([
        "analyze-pipeline",
        "fetch",
        "-d",
        options.days,
      ]);

      // Run process command with days parameter and verbose flag
      const processArgs = ["analyze-pipeline", "process", "-d", options.days];
      if (options.verbose) {
        processArgs.push("-v");
      }
      await program.parseAsync(processArgs);

      console.log(chalk.green("Pipeline completed successfully!"));
    } catch (error: unknown) {
      console.error(chalk.red("Error running pipeline:"), error);
      process.exit(1);
    }
  });

program.parse(process.argv);
