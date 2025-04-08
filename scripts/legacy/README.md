# Legacy Python Scripts

This directory contains the original Python implementation of the Eliza Leaderboard analytics system. These scripts have been migrated to TypeScript and are maintained here for reference purposes.

## Overview

The Eliza Leaderboard was designed to track GitHub contributions, generate analytics, and maintain a contributor leaderboard. This legacy Python implementation served as the foundation for the current TypeScript-based system.

## Migration Status

All functionality from these Python scripts has been migrated to TypeScript in the following locations:

- Main pipeline: `src/scripts/analyze-pipeline.ts`
- Site generation: `src/scripts/generate_site.ts`

## Script Descriptions

### Core Analytics Scripts

- **`analyze_contributors.py`**: Performs detailed analysis of contributor data, including expertise tagging, focus area identification, and level calculation.
- **`calculate_scores.py`**: Calculates contributor scores based on activity metrics (PRs, issues, commits, reviews).
- **`combine_raw.py`**: Combines raw data from various GitHub sources (PRs, issues, commits) into a unified contributor format.
- **`merge_contributors.py`**: Merges contributor data from multiple time periods while preserving history.
- **`merge_contributors_xp.py`**: Merges contributor experience data with existing contributor information.

### Summary Generation

- **`summarize.py`**: Generates natural language summaries of contributor activity using AI models.
- **`summarize_daily.py`**: Creates daily project summaries with metrics and top contributor highlights.
- **`aggregate_summaries.py`**: Aggregates daily summaries into weekly and monthly views.
- **`aggregate_temporal.py`**: Groups contributor data by time periods (daily, weekly, monthly).
- **`update_historical_summaries.py`**: Updates historical summary data with improved AI-generated summaries.

### Shell Scripts

- **`fetch_github.sh`**: Fetches data from GitHub API using GraphQL queries for PRs, issues, and commits.
- **`generate_history_summaries.sh`**: Generates historical summaries and social media thread content.
- **`manage_thread_history.sh`**: Manages versioning and backup of thread content.

### Supporting Files

- **`requirements.txt`**: Python dependencies for the legacy scripts.
- **`README.md`**: Original documentation for the legacy implementation.

## Usage Notes

These scripts are provided for reference only and should not be used in production. The TypeScript implementation (`scripts/analyze-pipeline.ts`) is the current supported version.

### Original Workflow

For historical reference, the legacy workflow followed these steps:

1. Fetch GitHub data:
   ```bash
   ./scripts/legacy/fetch_github.sh owner repo --type prs --days 7
   ```

2. Combine raw data:
   ```bash
   python scripts/legacy/combine_raw.py -p data/prs.json -i data/issues.json -o data/combined.json
   ```

3. Calculate scores:
   ```bash
   python scripts/legacy/calculate_scores.py data/combined.json data/scored.json
   ```

4. Generate summaries:
   ```bash
   python scripts/legacy/summarize.py data/scored.json data/contributors.json --model openai
   ```

5. Generate weekly thread content:
   ```bash
   bash scripts/legacy/generate_history_summaries.sh
   ```

## Implementation Details

### Key Features

- Language Model Integration: Uses OpenAI and Ollama for summary generation
- GraphQL Queries: Efficient GitHub API access via GraphQL
- Contributor Tagging: Automatically tags contributors with areas of expertise
- Activity Scoring: Advanced algorithm for scoring GitHub contributions
- Summary Generation: AI-powered summaries of contributions

### Architecture

The legacy system follows a pipeline architecture where data flows through several processing stages:

1. Data Collection (fetch_github.sh)
2. Data Merging (combine_raw.py)
3. Analytics Processing (calculate_scores.py, analyze_contributors.py)
4. Summary Generation (summarize.py, summarize_daily.py)
5. Temporal Aggregation (aggregate_temporal.py, aggregate_summaries.py)

## Note

These scripts are deprecated and should not be used in production. Please use the TypeScript implementation instead.
