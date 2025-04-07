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

4. Initalize Database

The SQLite database stores the GitHub data in a relational format for efficient querying and analysis. The database schema is in `src/lib/data/schema.ts`. Here's how to set it up:

```bash
bun run db:migrate
```

This will:

- Create a SQLite database in the `data/` directory
- Set up the required tables and schema with relations

## Usage

```bash
# Ingest latest Github data (default since last fetched, or 30 days)
bun run pipeline ingest

# Process and analyze
bun run pipeline process

# Generate AI summaries
bun run pipeline summarize

# Export JSON data
bun run pipeline export
```

The ingest command supports flexible date filtering:

- `--after` or `-a`: Start date in YYYY-MM-DD format
- `--before` or `-b`: End date in YYYY-MM-DD format (defaults to end of today)
- `--days` or `-d`: Number of days to look back from the before date

Examples

```bash
# Fetch data between specific dates
bun run pipeline ingest --after 2024-01-01 --before 2024-03-31

# Fetch 30 days before March 31
bun run pipeline ingest --days 30 --before 2024-03-31

# Fetch from Jan 1st until now
bun run pipeline ingest --after 2024-01-01

# Fetch until March 31 (from last fetched time)
bun run pipeline ingest --before 2024-03-31
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

- Python 3.11+
- Node.js 18+
- GitHub Personal Access Token
- OpenAI API Key (optional, for AI summaries)
- Bun 1.0+ (recommended for TypeScript pipeline)
