# GitHub Contributor Analytics Generator

A comprehensive analytics and reporting system for tracking GitHub repository contributions, generating insights, and creating static contributor profile pages.

[Website](https://elizaos.ai/) | [Discord](https://discord.gg/elizaOS) | [DAO](https://www.daos.fun/HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC) | [Docs](/eliza)

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

# For AI-powered summaries (optional)
export OPENAI_API_KEY="your_key"
```

2. Install Dependencies:
```bash
# Install Python dependencies
pip install openai langchain-core langchain-ollama

# Install Node.js dependencies
npm install
```

3. Configure Repository Settings:
```bash
# Update repository details in fetch_github.sh
owner="your_org"
repo="your_repo"
```

## Usage

### Manual Data Collection

```bash
# Fetch recent activity
./scripts/fetch_github.sh owner repo --type prs --days 7
./scripts/fetch_github.sh owner repo --type issues --days 7
./scripts/fetch_github.sh owner repo --type commits --days 7

# Process and combine data
python scripts/combine.py -p data/prs.json -i data/issues.json -c data/commits.json -o data/combined.json

# Calculate contributor scores
python scripts/calculate_scores.py data/combined.json data/scored.json

# Generate summaries
python scripts/summarize.py data/scored.json data/contributors.json --model openai
```

### Automated Reports

The included GitHub Actions workflow (`weekly-summaries.yml`) automatically:
- Runs daily at 5:00 PM EST
- Generates weekly reports on Fridays
- Creates monthly summaries on the 4th of each month

### Generate Static Site

```bash
# Build and generate contributor profile pages
npm run build
npm run generate

# View the site
open profiles/index.html
```

## Data Structure

The system generates structured JSON data for contributors:

```json
{
  "contributor": "username",
  "score": number,
  "avatar_url": "string",
  "summary": "string",
  "activity": {
    "code": {
      "total_commits": number,
      "total_prs": number,
      "commits": array,
      "pull_requests": array
    },
    "issues": {
      "total_opened": number,
      "opened": array
    },
    "engagement": {
      "total_comments": number,
      "comments": array
    }
  }
}
```

## Customization

- Modify scoring algorithms in `calculate_scores.py`
- Adjust summary generation in `summarize.py`
- Customize profile pages in `ContributorProfile.js`
- Configure report schedules in `weekly-summaries.yml`

## Directory Structure

```
.
├── data/               # Generated data and reports
├── scripts/           # Core processing scripts
│   ├── combine.py     # Data aggregation
│   ├── calculate_scores.py    # Scoring system
│   └── summarize.py   # Summary generation
├── profiles/          # Generated static site
└── .github/workflows  # Automation workflows
```

## Requirements

- Python 3.11+
- Node.js 18+
- GitHub Personal Access Token
- OpenAI API Key (optional, for AI summaries)

## Contributors

