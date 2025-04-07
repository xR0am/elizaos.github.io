#!/usr/bin/env python3
import os
import subprocess
from datetime import datetime, timedelta
import json

def main():
    # Calculate dates for the last 6 days
    today = datetime.now()
    dates = [(today - timedelta(days=i)).strftime('%Y_%m_%d') for i in range(1, 7)]
    
    print(f"Will update summaries for dates: {', '.join(dates)}")
    print("Make sure OPENROUTER_API_KEY is set in your environment")
    
    for date in dates:
        print(f"\nProcessing {date}...")
        
        # Define file paths
        contributors_file = f"data/daily/history/contributors_{date}.json"
        scored_file = f"data/daily/history/scored_{date}.json"
        summary_json = f"data/daily/history/summary_{date}.json"
        summary_md = f"data/daily/history/summary_{date}.md"
        
        if not os.path.exists(contributors_file):
            print(f"WARNING: No contributor data found for {date}, skipping...")
            continue

        # Generate summaries using summarize.py
        print(f"Generating summaries for {date}...")
        subprocess.run([
            "python", "scripts/summarize.py",
            "summary",
            contributors_file,
            contributors_file,  # Overwrite the original file
            "--model", "openai",
            "-f"  # Force overwrite
        ], check=True)

        # Generate daily summaries using summarize_daily.py
        print(f"Generating daily summaries for {date}...")
        subprocess.run([
            "python", "scripts/summarize_daily.py",
            contributors_file,
            "-t", "json",
            summary_json,
            "--model", "openai"
        ], check=True)

        subprocess.run([
            "python", "scripts/summarize_daily.py",
            contributors_file,
            "-t", "md",
            summary_md,
            "--model", "openai"
        ], check=True)

        print(f"✓ Completed processing for {date}")

    print("\nAll historical summaries have been updated!")
    print("\nDon't forget to commit and push the changes:")
    print("git add data/daily/history/")
    print('git commit -m "Update historical summaries with OpenRouter"')
    print("git push")

if __name__ == "__main__":
    main()
