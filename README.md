# GitHub Contributor Analytics Generator

A comprehensive analytics and reporting system for tracking GitHub repository contributions, generating insights, and creating static contributor profile pages.

[Website](https://elizaos.ai/) | [Discord](https://discord.gg/elizaOS) | [DAO](https://www.daos.fun/HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC) | [Docs](https://elizaos.github.io/eliza/)

elizaos/eliza permalinks:

- https://elizaos.github.io/data/daily/contributors.json
  - https://elizaos.github.io/data/daily/summary.json
  - https://elizaos.github.io/data/daily/summary.md
- https://elizaos.github.io/data/weekly/contributors.json
- https://elizaos.github.io/data/monthly/contributors.json

older versions are backed up in `data/*/history` folders with timestamps

## Features

- **Daily, Weekly, and Monthly Reports**

  - Automated data collection via GitHub Actions
  - Detailed activity summaries with metrics and trends
  - Smart contributor scoring system
  - AI-powered activity summaries
  - Thread-style weekly summaries for social sharing

- **Contributor Profiles**

  - Interactive profile pages for each contributor
  - Activity visualization with charts and metrics
  - Contribution history and engagement tracking
  - Responsive design with dark mode support

- **Activity Tracking**
  - Pull request analysis with file-level changes
  - Issue tracking with label analytics
  - Commit history and impact measurement
  - Engagement metrics (comments, reviews, etc.)

## Setup

1. Configure GitHub Authentication:

```bash
# Set your GitHub access token
export GH_ACCESS_TOKEN="your_token"
# OR (for TypeScript pipeline)
export GH_TOKEN="your_token"

# For AI-powered summaries (optional)
export OPENAI_API_KEY="your_key"
# OR (for TypeScript pipeline with OpenRouter)
export OPENROUTER_API_KEY="your_key"
export SITE_URL="your_site_url" # Optional for OpenRouter
export SITE_NAME="your_site_name" # Optional for OpenRouter
```

2. Install Dependencies:

[Bun is recommended for this project.](https://bun.sh/)

```bash
# Install Python dependencies
pip install openai langchain-core langchain-ollama

# Install Node.js dependencies
bun install
# OR if you are too lazy to install bun
npm install
```

3. Configure Repository Settings:

```bash
# Update repository details in fetch_github.sh
owner=\"your_org\"
repo=\"your_repo\"
```

### SQLite Database Setup

The SQLite database stores the GitHub data in a relational format for efficient querying and analysis. The database schema and related code is in `src/lib/data/`. Here's how to set it up:

1. Initialize the database:

```bash
bun run db:generate
```

This will:

- Create a SQLite database in the `data/` directory
- Set up the required tables and schema with relations

### Updating schema

If you need to modify the database schema (in `src/lib/data/schema.ts`), follow these steps:

1. Make your changes to the schema file
2. Generate migration files:

```bash
bun run db:generate
```

3. Apply the migrations:

```bash
bun run db:migrate
```

This process will:

- Create new migration files in the `drizzle` directory
- Apply the changes to your SQLite database
- Ensure data consistency with the updated schema

### Database Explorer

To interactively explore the database and its contents:

```bash
bun run db:studio
```

This launches Drizzle Studio, which provides a visual interface to browse tables, relationships, run queries, and export data.

## Usage

### TypeScript Pipeline

The primary data processing system is now a TypeScript-based pipeline that leverages SQLite and Drizzle ORM for improved data management:

```bash
# Fetch GitHub data
bun run pipeline fetch

# Process and analyze
bun run pipeline process

# Run the complete pipeline (fetch + process)
bun run pipeline
```

The pipeline is configurable through TypeScript config at `config/pipeline.config.ts`, where you can customize:

- Repositories to track
- Scoring rules for different contribution types (PRs, issues, reviews, code changes)
- Tag definitions and weights (area, role, and tech tags)
- Bot user exclusion list
- AI summarization settings (optional)

#### Pipeline Architecture

The pipeline system uses a functional programming approach with composable operations:

- **Pipeline Steps**: Type-safe, composable functions that transform data
- **Pipeline Context**: Shared state and configuration passed between steps
- **Core Utilities**:
  - `pipe()`: Chain operations sequentially
  - `parallel()`: Run operations concurrently
  - `mapStep()`: Apply a pipeline to each item in an array
  - `createStep()`: Create a typed pipeline step with proper logging

Example of defining a pipeline:

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
      generateSummary
    )
  ),
  
  // Step 3: Format results
  createStep("formatResults", (results, context) => {
    // Process and return final results
  })
);
```

#### Creating New Pipelines

To create a new pipeline:

1. Define your pipeline context by extending `BasePipelineContext` or `RepoPipelineContext`
2. Create individual pipeline steps using `createStep()`
3. Compose steps using `pipe()`, `parallel()`, and `mapStep()`
4. Create a context factory function like `createContributorPipelineContext()`
5. Use `runPipeline()` to execute your pipeline with the appropriate context

Key pipeline components:

- `src/lib/data/github.ts` - GitHub API integration
- `src/lib/data/ingestion.ts` - Data ingestion into SQLite
- `src/lib/data/processing/pipelines.ts` - Predefined pipeline definitions
- `src/lib/data/processing/runPipeline.ts` - Pipeline execution utilities
- `src/lib/data/processing/types.ts` - Core pipeline type definitions and utilities
- `src/lib/data/processing/contributors/` - Contributor-specific pipeline steps
- `src/lib/data/scoring.ts` - Contributor scoring algorithms
- `src/lib/data/schema.ts` - Database schema with relations

### Legacy Python Scripts (Deprecated)

The project previously used Python scripts for data processing, but is now moving to the TypeScript pipeline. These scripts are kept for reference and backward compatibility:

```bash
# Fetch recent activity
./scripts/fetch_github.sh owner repo --type prs --days 7
./scripts/fetch_github.sh owner repo --type issues --days 7
./scripts/fetch_github.sh owner repo --type commits --days 7

# Process and combine data
python scripts/combine_raw.py -p data/prs.json -i data/issues.json -c data/commits.json -o data/combined.json

# Calculate contributor scores
python scripts/calculate_scores.py data/combined.json data/scored.json

# Generate summaries
python scripts/summarize.py data/scored.json data/contributors.json --model openai

# Generate weekly thread summary
bash scripts/generate_history_summaries.sh
```

While these scripts still work, it's recommended to use the TypeScript pipeline for new development.

### Weekly Thread Generation

The system can generate social media-friendly thread summaries of weekly activity:

1. **Automatic Generation**: Part of weekly workflow, runs every Friday
2. **Manual Generation**: Run `generate_history_summaries.sh`
3. **Output Location**: `data/weekly/thread_[DATE].txt`
4. **Content**:
   - Comprehensive weekly summary in thread format
   - Key metrics and achievements
   - Notable PRs and improvements
   - Future priorities and goals

### Automated Reports

The included GitHub Actions workflow (`weekly-summaries.yml`) automatically:

- Runs daily at 5:00 PM EST
- Generates weekly reports and threads on Fridays
- Creates monthly summaries on the 4th of each month

### Generate Static Site

```bash
# Build and generate contributor profile pages
bun run build

# View the site
bunx serve@latest out
```

Or use npm...

## Customization

### Pipeline Customization

- **Configuration**: Modify `config/pipeline.config.ts` to adjust scoring weights, repositories, and tags
- **New Pipeline Steps**: Create custom steps in `src/lib/data/processing/` using the functional pipeline utilities
- **Custom Processing**: Add domain-specific logic in separate modules following the pattern in `contributors/`
- **Database Schema**: Extend the database schema in `src/lib/data/schema.ts` and run migrations

### Legacy Customization

- Modify scoring algorithms in `calculate_scores.py` (legacy)
- Adjust summary generation in `summarize.py` (legacy)
- Customize profile pages in `ContributorProfile.js`
- Configure report schedules in `weekly-summaries.yml`
- Customize thread format in `generate_history_summaries.sh`

## Directory Structure

```
.
├── data/               # Generated data and reports
│   └── db.sqlite       # SQLite database (TypeScript pipeline)
├── scripts/            # Core processing scripts
│   └── analyze-pipeline.ts  # Run typescript pipeline
├── config/             # Configuration files
│   └── pipeline.config.ts  # TypeScript pipeline configuration
├── drizzle/            # Database migration files
├── src/
│   ├── app/            # Next.js app router pages
│   ├── components/     # React components
│   │   └── ui/         # shadcn/ui components
│   └── lib/
│       └── data/       # Data processing and database code
│           ├── processing/  # Modular pipeline system
│           │   ├── contributors/  # Contributor-specific pipeline steps
│           │   ├── pipelines.ts   # Predefined pipeline definitions
│           │   ├── runPipeline.ts # Pipeline execution utilities
│           │   └── types.ts       # Core pipeline type definitions
│           ├── schema.ts     # Database schema definitions
│           ├── db.ts         # Database connection and query builder
│           └── ingestion.ts  # Data ingestion from GitHub API
├── profiles/           # Generated static profiles
└── .github/workflows   # Automation workflows
```

## Requirements

- Python 3.11+
- Node.js 18+
- GitHub Personal Access Token
- OpenAI API Key (optional, for AI summaries)
- Bun 1.0+ (recommended for TypeScript pipeline)
