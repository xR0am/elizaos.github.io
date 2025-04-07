# Eliza Leaderboard

**GitHub Contributor Analytics Generator**

A comprehensive system for tracking GitHub repository contributions, generating insights, and creating contributor profile pages.

## Overview

This tool helps track and analyze contributions to GitHub repositories, generating:

- Daily, weekly, and monthly contributor analytics
- Project summaries and statistics
- Interactive contributor profile pages
- Activity visualizations and metrics

## Setup Guide

### 1. Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+
- GitHub Personal Access Token with repo scope
- [OpenRouter API Key](https://openrouter.ai/) (optional, for AI summaries)

### 2. Environment Setup

Create a `.envrc` file in the project root:

```bash
# Required for GitHub data fetching
export GITHUB_TOKEN=your_github_token_here

# Optional: For AI-powered summaries
export OPENROUTER_API_KEY=your_openrouter_api_key
export SITE_URL="https://your-site-url.com"
export SITE_NAME="Your Site Name"
```

Then load the environment variables:

```bash
source .envrc
# Or if using direnv: direnv allow
```

### 3. Install Dependencies

```bash
# Install with Bun (recommended)
bun install

# Or with npm
npm install
```

### 4. Database Setup

Create and initialize the SQLite database:

```bash
# Generate the database schema
bun run db:generate

# Apply migrations
bun run db:migrate

# (Optional) Explore the database with Studio
bun run db:studio
```

If you encounter any issues with Drizzle Studio due to Node.js version mismatches, you can use a different SQLite browser tool like [SQLite Browser](https://sqlitebrowser.org/).

## Configuration

Edit `config/pipeline.config.ts` to:

- Add your repositories
- Customize scoring rules
- Define tags and categories
- Configure AI summary options

Example configuration:

```typescript
export default {
  // Repositories to track
  repositories: [
    {
      repoId: "your-org/your-repo",
      defaultBranch: "main"
    }
  ],
  
  // Bot users to ignore
  botUsers: ["dependabot", "renovate-bot"],
  
  // Scoring and tag configuration...
  
  // AI Summary configuration
  aiSummary: {
    enabled: true,
    model: "openai/gpt-4o-mini",
    apiKey: process.env.OPENROUTER_API_KEY
    // ...
  }
}
```

## Usage

The analytics pipeline has several commands available. You can run them using the shortcut script:

```bash
bun run pipeline <command> [options]
```

Or directly:

```bash
bun run scripts/analyze-pipeline.ts <command> [options]
```

### Data Ingestion

Fetch contribution data from GitHub:

```bash
# Fetch data from the last 10 days
bun run pipeline ingest -d 10

# With verbose logging
bun run pipeline ingest -d 10 -v
```

### Process Contributor Tags

Calculate contributor expertise tags:

```bash
# Process all repositories
bun run pipeline process

# Process specific repository
bun run pipeline process -r owner/repo
```

### Generate Stats

Generate repository statistics:

```bash
# Generate stats for all repositories
bun run pipeline export -d 30 -o ./data/

# For specific repository
bun run pipeline export -r owner/repo -d 30
```

### Create Summaries

Generate AI-powered summaries:

```bash
# Project summaries
bun run pipeline summarize -t project -d 60

# Contributor summaries
bun run pipeline summarize -t contributors -d 60

# Force overwrite of existing summaries
bun run pipeline summarize -t project -o
```

### Build Website

Generate the static site with contributor profiles:

```bash
bun run build

# Serve the generated site
bunx serve@latest out
```

## Directory Structure

```
.
├── config/               # Configuration files
├── data/                 # Generated data and outputs
│   └── db.sqlite         # SQLite database
├── scripts/              # Command-line scripts
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   └── lib/
│       └── data/         # Data processing and database code
│           ├── pipelines/  # Pipeline system
│           ├── schema.ts   # Database schema
│           └── queries.ts  # Database queries
└── .github/workflows/    # GitHub Actions workflows
```

## Troubleshooting

### Common Issues

1. **"GITHUB_TOKEN environment variable is required"**
   - Ensure your GitHub token is set in `.envrc` and the environment is loaded
   - You can also run commands with the token directly: `GITHUB_TOKEN=your_token bun run pipeline ingest -d 10`

2. **"No such table: repositories"**
   - Run `bun run db:generate` and `bun run db:migrate` to initialize the database
   - Ensure the `data` directory exists: `mkdir -p data`

3. **"Error with better-sqlite3 module"**
   - This is usually due to Node.js version mismatch with Bun
   - Use the direct Bun SQLite implementation or upgrade/reinstall the module

4. **"Error fetching data from GitHub"**
   - Check your GitHub token has proper permissions
   - Verify repository names are correct in config
   - Ensure your token has not expired

### Debugging

For more detailed logs, add the `-v` or `--verbose` flag to any command:

```bash
bun run pipeline ingest -d 10 -v
```

## Features

- **Daily, Weekly, and Monthly Reports**
  - Automated data collection
  - Detailed activity summaries with metrics and trends
  - Smart contributor scoring system
  - AI-powered activity summaries

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

## License

This project is licensed under the MIT License - see the LICENSE file for details.
