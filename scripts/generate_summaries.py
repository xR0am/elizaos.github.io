import json
import os
import argparse
from datetime import datetime, timedelta
from openai import OpenAI
from typing import List, Dict, Any

def get_recent_activity(data: Dict[str, Any], days: int = 7) -> List[str]:
    """Get activity from the last N days"""
    cutoff_date = datetime.now() - timedelta(days=days)
    activity = []
    
    # Process commits
    if 'commits' in data['activity'].get('code', {}):
        for commit in data['activity']['code']['commits']:
            commit_date = datetime.fromisoformat(commit['date'].replace('Z', '+00:00'))
            if commit_date > cutoff_date:
                activity.append(f"Commit: {commit['message']}")
    
    # Process PRs
    if 'pull_requests' in data['activity'].get('code', {}):
        for pr in data['activity']['code']['pull_requests']:
            pr_date = datetime.fromisoformat(pr['created_at'].replace('Z', '+00:00'))
            if pr_date > cutoff_date:
                activity.append(f"PR: {pr['title']}")
    
    # Process issues
    if 'opened' in data['activity'].get('issues', {}):
        for issue in data['activity']['issues']['opened']:
            issue_date = datetime.fromisoformat(issue['created_at'].replace('Z', '+00:00'))
            if issue_date > cutoff_date:
                activity.append(f"Issue: {issue['title']}")
    
    return activity

def generate_summary(data: Dict[str, Any], api_key: str) -> str:
    """Generate a summary using OpenAI API"""
    client = OpenAI(api_key=api_key)
    
    # Get recent activity
    activity = get_recent_activity(data)
    if not activity:
        return data.get('contribution_summary', '')  # Keep existing summary if no new activity
    
    prompt = f"""Based on this GitHub activity from the past week, write a concise summary of what this user worked on:
{chr(10).join(activity)}

Previous summary (if any):
{data.get('contribution_summary', 'No previous summary')}

Write a new 1-2 sentence summary that focuses on their main areas of work. Write in present tense.
If there's no new activity, return the previous summary unchanged."""
    
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a technical writer creating concise GitHub contribution summaries."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=150
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error generating summary: {e}")
        return data.get('contribution_summary', '')  # Keep existing summary on error

def process_files(input_dir: str, output_dir: str, api_key: str) -> None:
    """Process all JSON files in input directory"""
    os.makedirs(output_dir, exist_ok=True)
    
    for filename in os.listdir(input_dir):
        if not filename.endswith('.json'):
            continue
            
        input_path = os.path.join(input_dir, filename)
        output_path = os.path.join(output_dir, filename)
        
        try:
            with open(input_path, 'r') as f:
                data = json.load(f)
            
            new_summary = generate_summary(data, api_key)
            if new_summary:
                data['contribution_summary'] = new_summary
            
            with open(output_path, 'w') as f:
                json.dump(data, f, indent=2)
            
            print(f"Processed {filename}")
            
        except Exception as e:
            print(f"Error processing {filename}: {e}")

def main():
    parser = argparse.ArgumentParser(description="Generate GitHub contribution summaries")
    parser.add_argument("input_dir", help="Directory containing JSON files")
    parser.add_argument("output_dir", help="Directory to save processed files")
    args = parser.parse_args()
    
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable is required")
    
    process_files(args.input_dir, args.output_dir, api_key)
    print("Done!")

if __name__ == "__main__":
    main()
