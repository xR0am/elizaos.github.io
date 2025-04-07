import json
import argparse
from datetime import datetime, timedelta
from typing import Dict, List, Any
from collections import defaultdict
import glob
import os
import re

def parse_date_from_filename(filename: str) -> datetime:
    """Extract date from filename regardless of separator format"""
    # Match either YYYY-MM-DD or YYYY_MM_DD pattern
    pattern = r'contributors_(\d{4})[_-](\d{2})[_-](\d{2})\.json'
    match = re.search(pattern, filename)
    if match:
        year, month, day = map(int, match.groups())
        return datetime(year, month, day)
    raise ValueError(f"Could not parse date from filename: {filename}")

def find_recent_files(base_dir: str, days: int) -> List[str]:
    """Find the most recent contributor files"""
    # Look for both formats
    patterns = [
        os.path.join(base_dir, "contributors_*-*-*.json"),
        os.path.join(base_dir, "contributors_*_*_*.json")
    ]
    
    all_files = []
    for pattern in patterns:
        all_files.extend(glob.glob(pattern))
    
    if not all_files:
        print(f"No files found matching patterns in {base_dir}")
        return []
        
    # Parse dates and sort files
    dated_files = []
    for file in all_files:
        try:
            date = parse_date_from_filename(os.path.basename(file))
            dated_files.append((date, file))
        except ValueError as e:
            print(f"Warning: {e}")
            continue
    
    dated_files.sort(reverse=True)  # Sort most recent first
    
    # Get files within the requested day range
    cutoff_date = datetime.now() - timedelta(days=days)
    recent_files = [
        file for date, file in dated_files 
        if date >= cutoff_date
    ]
    
    return recent_files

def merge_contributor_files(input_files: List[str]) -> List[Dict]:
    """Merge pre-processed contributor files"""
    contributors = {}
    
    for file in sorted(input_files):  # Sort to process in chronological order
        print(f"Processing {file}...")
        try:
            with open(file) as f:
                data = json.load(f)
                
            # Process each contributor
            for contrib in data:
                username = contrib['contributor']
                if username not in contributors:
                    contributors[username] = contrib
                else:
                    # Merge activity data
                    existing = contributors[username]
                    
                    # Merge code activity
                    existing['activity']['code']['commits'].extend(contrib['activity']['code']['commits'])
                    existing['activity']['code']['total_commits'] += contrib['activity']['code']['total_commits']
                    existing['activity']['code']['pull_requests'].extend(contrib['activity']['code']['pull_requests'])
                    existing['activity']['code']['total_prs'] += contrib['activity']['code']['total_prs']
                    
                    # Merge issues
                    existing['activity']['issues']['opened'].extend(contrib['activity']['issues']['opened'])
                    existing['activity']['issues']['total_opened'] += contrib['activity']['issues']['total_opened']
                    
                    # Merge engagement
                    existing['activity']['engagement']['comments'].extend(contrib['activity']['engagement']['comments'])
                    existing['activity']['engagement']['reviews'].extend(contrib['activity']['engagement']['reviews'])
                    existing['activity']['engagement']['total_comments'] += contrib['activity']['engagement']['total_comments']
                    existing['activity']['engagement']['total_reviews'] += contrib['activity']['engagement']['total_reviews']
                    
                    # Keep highest score
                    existing['score'] = max(existing['score'], contrib['score'])
                    
                    # Keep most recent summary if available
                    if contrib.get('summary'):
                        existing['summary'] = contrib['summary']
        except Exception as e:
            print(f"Error processing {file}: {e}")
            continue

    result = list(contributors.values())
    result.sort(key=lambda x: x['score'], reverse=True)
    return result

def main():
    parser = argparse.ArgumentParser(description="Combine GitHub activity data")
    parser.add_argument("--dir", 
                    default="data/daily/history",
                    help="Directory containing contributor files")
    parser.add_argument("-d", "--days", type=int, default=7, 
                    help="Number of days to process (default: 7)")
    parser.add_argument("-o", "--output", required=True,
                    help="Output JSON file")
    args = parser.parse_args()

    # Find the most recent files
    input_files = find_recent_files(args.dir, args.days)
    
    if not input_files:
        print(f"No files found for the last {args.days} days in {args.dir}")
        return
        
    print(f"\nFound {len(input_files)} files to process")
    print("Most recent files:")
    for file in sorted(input_files)[-5:]:  # Show last 5 files
        print(f"  {file}")
    
    contributors = merge_contributor_files(input_files)
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    
    # Write output
    print(f"\nWriting output to {args.output}")
    with open(args.output, 'w') as f:
        json.dump(contributors, f, indent=2)
    
    print(f"\nProcessed {len(contributors)} contributors:")
    for contrib in contributors[:5]:  # Show top 5
        print(f"\n{contrib['contributor']}:")
        print(f"  Score: {contrib['score']}")
        print(f"  PRs: {contrib['activity']['code']['total_prs']} total")
        print(f"  Issues: {contrib['activity']['issues']['total_opened']} opened")
        print(f"  Commits: {contrib['activity']['code']['total_commits']} total")
        print(f"  Reviews: {contrib['activity']['engagement']['total_reviews']}")
        print(f"  Comments: {contrib['activity']['engagement']['total_comments']}")

if __name__ == '__main__':
    main()
