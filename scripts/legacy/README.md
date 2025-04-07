# Legacy Python Scripts

This directory contains the original Python implementation of the Eliza Leaderboard analytics system. These scripts have been migrated to TypeScript and are maintained here for reference.

## Migration Status

All functionality from these Python scripts has been migrated to TypeScript in the following locations:

- Main pipeline: `src/scripts/analyze-pipeline.ts`
- Site generation: `src/scripts/generate_site.ts`

## Script Descriptions

- `analyze_contributors.py`: Analyzed contributor data and generated profiles
- `summarize.py`: Generated activity summaries
- `aggregate_summaries.py`: Aggregated summary data
- `combine_raw.py`: Combined raw data from various sources
- `update_historical_summaries.py`: Updated historical summary data
- `merge_contributors.py`: Merged contributor data
- `merge_contributors_xp.py`: Merged contributor experience data
- `aggregate_temporal.py`: Aggregated temporal data
- `calculate_scores.py`: Calculated contributor scores
- `summarize_daily.py`: Generated daily summaries

## Shell Scripts

- `fetch_github.sh`: Fetched data from GitHub API
- `generate_history_summaries.sh`: Generated historical summaries
- `manage_thread_history.sh`: Managed thread history

## Note

These scripts are deprecated and should not be used in production. Please use the TypeScript implementation instead. 