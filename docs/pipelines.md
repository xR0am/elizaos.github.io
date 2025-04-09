# TypeScript Pipeline Documentation

The primary data processing system is a TypeScript-based pipeline that leverages SQLite and Drizzle ORM for improved data management.

## Basic Usage

```bash
# Ingest GitHub data
bun run pipeline ingest

# Process and analyze
bun run pipeline process

# Generate AI summaries
bun run pipeline summarize

# Export JSON data
bun run pipeline export
```

## Configuration

The pipeline is configurable through TypeScript config at `config/pipeline.config.ts`, where you can customize:

- Repositories to track
- Scoring rules for different contribution types (PRs, issues, reviews, code changes)
- Tag definitions and weights (area, role, and tech tags)
- Bot user exclusion list
- AI summarization settings (optional)

## Pipeline Architecture

The pipeline system uses a functional programming approach with composable operations:

- **Pipeline Steps**: Type-safe, composable functions that transform data
- **Pipeline Context**: Shared state and configuration passed between steps
- **Core Utilities**:
  - `pipe()`: Chain operations sequentially
  - `parallel()`: Run operations concurrently
  - `mapStep()`: Apply a pipeline to each item in an array
  - `createStep()`: Create a typed pipeline step with proper logging

### Example Pipeline Definition

```typescript
// Example pipeline definition
const myPipeline = pipe(
  // Step 1: Fetch data
  createStep("fetchData", async (input, context) => {
    // Fetch and return data
  }),

  // Step 2: Process each item in parallel
  mapStep(
    parallel(
      // Run these operations in parallel for each item
      calculateMetrics,
      generateSummary,
    ),
  ),

  // Step 3: Format results
  createStep("formatResults", (results, context) => {
    // Process and return final results
  }),
);
```

## Creating New Pipelines

To create a new pipeline:

1. Define your pipeline context by extending `BasePipelineContext` or `RepoPipelineContext`
2. Create individual pipeline steps using `createStep()`
3. Compose steps using `pipe()`, `parallel()`, and `mapStep()`
4. Create a context factory function like `createContributorPipelineContext()`
5. Use `runPipeline()` to execute your pipeline with the appropriate context

## Key Components

The pipeline system consists of several key components:

- `src/lib/data/github.ts` - GitHub API integration
- `src/lib/data/ingestion.ts` - Data ingestion into SQLite
- `src/lib/data/schema.ts` - Database schema with relations
- `src/lib/data/db.ts` - Database connection and configuration
- `src/lib/data/types.ts` - Core data type definitions

- `src/lib/pipelines/types.ts` - Pipeline type definitions and core utilities
- `src/lib/pipelines/runPipeline.ts` - Pipeline execution utilities
- `src/lib/pipelines/pipelineConfig.ts` - Configuration schemas and types
- `src/lib/pipelines/queryHelpers.ts` - SQL query builder helpers
- `src/lib/pipelines/codeAreaHelpers.ts` - Utilities for code area categorization
- `src/lib/pipelines/getSelectedRepositories.ts` - Repository selection utilities
- `src/lib/pipelines/generateTimeIntervals.ts` - Date range generation utilities

- `src/lib/pipelines/ingest/` - Data ingestion pipeline components
- `src/lib/pipelines/summarize/` - AI summarization pipeline components
- `src/lib/pipelines/contributors/` - Contributor analysis pipeline components
- `src/lib/pipelines/export/` - Data export pipeline components

## Customization

You can customize the pipeline system in several ways:

- **Configuration**: Modify `src/lib/pipelines/pipelineConfig.ts` to adjust scoring weights, repositories, and tags
- **New Pipeline Steps**: Create custom steps using the functional pipeline utilities in `types.ts`
- **Custom Processing**: Add domain-specific logic in separate modules following the pattern in `contributors/`
- **Database Schema**: Extend the database schema in `src/lib/data/schema.ts` and run migrations
- **Query Helpers**: Use or extend the SQL query helpers in `queryHelpers.ts` for consistent database access
