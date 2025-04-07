import json
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Dict, List, Optional
import argparse
from copy import deepcopy

def parse_timestamp(ts: str) -> datetime:
    """Parse GitHub timestamp format to datetime"""
    return datetime.strptime(ts, "%Y-%m-%dT%H:%M:%SZ")

def get_activity_period(timestamp: str, period: str = "daily") -> str:
    """Convert timestamp to period key (daily/weekly/monthly)"""
    dt = parse_timestamp(timestamp)
    if period == "daily":
        return dt.strftime("%Y-%m-%d")
    elif period == "weekly":
        # Get start of week (Monday)
        start = dt - timedelta(days=dt.weekday())
        return start.strftime("%Y-%m-%d")
    else:  # monthly
        return dt.strftime("%Y-%m")

def aggregate_contributor_data(data: Dict, period: str) -> Dict[str, List]:
    """Aggregate contributor data by time period"""
    period_data = defaultdict(lambda: defaultdict(lambda: {
        "contributor": "",
        "score": 0,
        "summary": "",
        "avatar_url": "",
        "activity": {
            "code": {
                "total_commits": 0,
                "total_prs": 0,
                "commits": [],
                "pull_requests": []
            },
            "issues": {
                "total_opened": 0,
                "opened": []
            },
            "engagement": {
                "total_comments": 0,
                "total_reviews": 0,
                "comments": [],
                "reviews": []
            }
        }
    }))
    
    # Process each contributor
    for contrib in data:
        username = contrib["contributor"]
        
        # Process commits
        for commit in contrib["activity"]["code"]["commits"]:
            period_key = get_activity_period(commit["created_at"], period)
            period_data[period_key][username]["contributor"] = username
            period_data[period_key][username]["avatar_url"] = contrib["avatar_url"]
            period_data[period_key][username]["activity"]["code"]["commits"].append(commit)
            period_data[period_key][username]["activity"]["code"]["total_commits"] += 1
        
        # Process PRs
        for pr in contrib["activity"]["code"]["pull_requests"]:
            period_key = get_activity_period(pr["created_at"], period)
            period_data[period_key][username]["contributor"] = username
            period_data[period_key][username]["avatar_url"] = contrib["avatar_url"]
            period_data[period_key][username]["activity"]["code"]["pull_requests"].append(pr)
            period_data[period_key][username]["activity"]["code"]["total_prs"] += 1
        
        # Process issues
        for issue in contrib["activity"]["issues"]["opened"]:
            period_key = get_activity_period(issue["created_at"], period)
            period_data[period_key][username]["contributor"] = username
            period_data[period_key][username]["avatar_url"] = contrib["avatar_url"]
            period_data[period_key][username]["activity"]["issues"]["opened"].append(issue)
            period_data[period_key][username]["activity"]["issues"]["total_opened"] += 1
    
    # Convert defaultdict to regular dict and list structure
    result = {}
    for period_key, contributors in period_data.items():
        result[period_key] = list(contributors.values())
    
    return result

def save_period_data(data: Dict[str, List], output_dir: str, period: str):
    """Save aggregated data to appropriate directories"""
    import os
    from pathlib import Path
    
    # Create directory structure
    base_dir = Path(output_dir)
    period_dir = base_dir / period
    history_dir = period_dir / "history"
    
    os.makedirs(period_dir, exist_ok=True)
    os.makedirs(history_dir, exist_ok=True)
    
    # Save each period's data
    for date_key, contributors in data.items():
        if not contributors:  # Skip empty periods
            continue
            
        # Save current data
        current_file = period_dir / "scored.json"
        with open(current_file, 'w') as f:
            json.dump(contributors, f, indent=2)
        
        # Save historical copy
        history_file = history_dir / f"scored_{date_key}.json"
        with open(history_file, 'w') as f:
            json.dump(contributors, f, indent=2)

def main():
    parser = argparse.ArgumentParser(description="Aggregate GitHub activity data by time period")
    parser.add_argument("input_file", help="Input contributors JSON file")
    parser.add_argument("output_dir", help="Output directory for aggregated data")
    parser.add_argument("--periods", nargs="+", choices=["daily", "weekly", "monthly"],
                       default=["daily", "weekly", "monthly"],
                       help="Time periods to generate")
    args = parser.parse_args()
    
    # Load data
    print(f"\nLoading data from {args.input_file}...")
    with open(args.input_file) as f:
        data = json.load(f)
    
    # Process each time period
    for period in args.periods:
        print(f"\nProcessing {period} aggregation...")
        aggregated = aggregate_contributor_data(data, period)
        
        print(f"Saving {period} data...")
        save_period_data(aggregated, args.output_dir, period)
        
        # Print some stats
        total_periods = len(aggregated)
        total_contributions = sum(len(contributors) for contributors in aggregated.values())
        print(f"Generated {total_periods} {period} periods with {total_contributions} total contributions")
    
    print("\nProcessing complete!")

if __name__ == "__main__":
    main()
