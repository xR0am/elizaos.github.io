# Eliza Leaderboard

A modern analytics pipeline for tracking and analyzing GitHub contributions. The system processes contributor data, generates AI-powered summaries, and maintains a leaderboard of developer activity.

## Features

- Tracks pull requests, issues, reviews, and comments
- Calculates contributor scores based on activity and impact
- Generates AI-powered summaries of contributions
- Exports daily summaries to JSON files
- Maintains contributor expertise levels and focus areas

## Setup

[Bun is recommended for this project.](https://bun.sh/)

1. Install dependencies:

```bash
bun install
```

2. Set up environment variables in `.envrc` or `.env`:

```bash
# Required for Github Ingest
GITHUB_TOKEN=your_github_personal_access_token_here
# Required for AI summaries
OPENROUTER_API_KEY=your_api_key_here

# Optional site info
SITE_URL=https://elizaos.github.io
SITE_NAME="ElizaOS Leaderboard"
```

3. Configure repositories in `config/pipeline.config.ts`:

```typescript
repositories: [
  {
    owner: "elizaos",
    name: "eliza"
  }
],
```

4. Initialize Database

The SQLite database stores the GitHub data in a relational format for efficient querying and analysis. The database schema is in `src/lib/data/schema.ts`. Here's how to set it up:

```bash
bun run db:migrate
```

This will:

- Create a SQLite database in the `data/` directory
- Set up the required tables and schema with relations

## Commands and Capabilities

You can see the main pipelines and their usages with these commands below:

```bash
bun run pipeline ingest -h
bun run pipeline process -h
bun run pipeline export -h
bun run pipeline summarize -h
```

### Data Ingestion

```bash
# Ingest latest Github data (default since last fetched, or 30 days)
bun run pipeline ingest

# Ingest with specific date range
bun run pipeline ingest --after 2024-01-01 --before 2024-03-31

# Ingest data for a specific number of days
bun run pipeline ingest --days 30 --before 2024-03-31

# Ingest with verbose logging
bun run pipeline ingest -v

# Ingest with custom config file
bun run pipeline ingest --config custom-config.ts
```

### Data Processing and Analysis

```bash
# Process and analyze all repositories
bun run pipeline process

# Process specific repository
bun run pipeline process --repository owner/repo

# Process with verbose logging
bun run pipeline process -v

# Process with custom config
bun run pipeline process --config custom-config.ts
```

### Generating Stats and Exports

```bash
# Export repository stats (defaults to 30 days)
bun run pipeline export

# Export with custom lookback period
bun run pipeline export -d 60

# Export for specific repository
bun run pipeline export -r owner/repo

# Export to custom directory
bun run pipeline export --output-dir ./custom-dir/

# Export with verbose logging
bun run pipeline export -v

# Regenerate and overwrite existing files
bun run pipeline export --overwrite
```

### AI Summary Generation

```bash
# Generate project summaries
bun run pipeline summarize -t project

# Generate contributor summaries
bun run pipeline summarize -t contributors

# Generate summaries for specific time period (default 7 days)
bun run pipeline summarize -t project -d 90

# Generate summaries for specific repository
bun run pipeline summarize -t project --repository owner/repo

# Force overwrite existing summaries
bun run pipeline summarize -t project --overwrite

# Generate summaries with custom output directory
bun run pipeline summarize -t project --output-dir ./custom-summaries/

# Generate summaries with verbose logging
bun run pipeline summarize -t project -v
```

### Database Management

```bash
# Generate database migration files
bun run db:generate

# Apply database migrations
bun run db:migrate

# Launch interactive database explorer
bun run db:studio
```

### Website Generation

```bash
# Build and generate contributor profile pages
bun run build

# View the site
bunx serve@latest out
```

## Development

### TypeScript Pipeline

The project uses a TypeScript-based pipeline for data processing. See [Pipeline Documentation](docs/pipelines.md) for detailed information about:

- Basic usage and commands
- Pipeline architecture and components
- Configuration options
- Creating custom pipelines
- Available customization points

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

Additional setup required if you use Safari or Brave: https://orm.drizzle.team/docs/drizzle-kit-studio#safari-and-brave-support

### Weekly Thread Generation

The system can generate social media-friendly thread summaries of weekly activity:

1. **Automatic Generation**: Part of weekly workflow, runs every Friday
2. **Content**:
   - Comprehensive weekly summary in thread format
   - Key metrics and achievements
   - Notable PRs and improvements
   - Future priorities and goals

### Automated Reports

The included GitHub Actions workflow (`weekly-summaries.yml`) automatically:

- Runs daily at 5:00 PM EST
- Generates weekly reports and threads on Fridays
- Creates monthly summaries on the 4th of each month

## Customization

- Customize scoring algorithms in `src/lib/data/pipelines/contributors/score.ts`
- Adjust summary generation in `src/lib/data/pipelines/summarize`
- Customize profile pages in `src/components/ContributorProfile.tsx`
- Configure report schedules in `.github/workflows/weekly-summaries.yml`

## Directory Structure

```
.
├── data/               # Generated data and reports
│   └── db.sqlite       # SQLite database
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
│           ├── pipelines/  # Modular pipeline system
│           │   ├── contributors/  # Contributor-specific pipeline steps
│           │   ├── export/  # Pipelines to export JSON data
│           │   ├── summarize/  # Pipelines to generate AI summaries
│           │   ├── runPipeline.ts # Pipeline execution utilities
│           │   └── types.ts       # Core pipeline type definitions
│           ├── schema.ts     # Database schema definitions
│           ├── db.ts         # Database connection and query builder
│           └── ingestion.ts  # Data ingestion from GitHub API
├── profiles/           # Generated static profiles
└── .github/workflows   # Automation workflows
```

## Requirements

- Node.js 18+
- GitHub Personal Access Token
- OpenAI API Key (optional, for AI summaries)
- Bun 1.0+ (recommended for TypeScript pipeline)

- OpenAI API Key (optional, for AI summaries)
- Bun 1.0+ (recommended for TypeScript pipeline)
