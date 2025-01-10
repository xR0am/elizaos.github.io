import json
import argparse
import os
from datetime import datetime, timedelta
from typing import List, Dict
from langchain_core.prompts import PromptTemplate
from collections import defaultdict

def get_contribution_stats(data: Dict, days: int = 90) -> Dict:
    """Get high-level contribution statistics for time period"""
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    stats = defaultdict(int)
    
    # Track what types of work were done
    work_areas = defaultdict(set)
    
    # Process PRs
    for pr in data['activity']['code']['pull_requests']:
        try:
            entry_date = datetime.strptime(pr['created_at'], "%Y-%m-%dT%H:%M:%SZ")
            if entry_date > cutoff_date:
                stats['prs'] += 1
                if pr.get('merged'):
                    stats['merged_prs'] += 1
                # Track affected areas from PR files
                for file in pr.get('files', []):
                    path = file['path']
                    if '/' in path:
                        area = path.split('/')[0]
                        work_areas['code_areas'].add(area)
                # Count reviews received
                stats['reviews_received'] += len(pr.get('reviews', []))
        except (KeyError, ValueError) as e:
            print(f"Error processing PR: {e}")
            continue
            
    # Process Issues
    for issue in data['activity']['issues']['opened']:
        try:
            entry_date = datetime.strptime(issue['created_at'], "%Y-%m-%dT%H:%M:%SZ")
            if entry_date > cutoff_date:
                stats['issues'] += 1
                # Track issue labels as areas of work
                for label in issue.get('labels', []):
                    if label.get('name'):
                        work_areas['issue_areas'].add(label['name'])
        except (KeyError, ValueError) as e:
            print(f"Error processing issue: {e}")
            continue

    # Process Commits
    if 'commits' in data['activity']['code']:
        for commit in data['activity']['code']['commits']:
            try:
                # Try both date field names
                date_str = commit.get('created_at') or commit.get('committedDate')
                if not date_str:
                    continue
                    
                entry_date = datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%SZ")
                if entry_date > cutoff_date:
                    stats['commits'] += 1
                    stats['additions'] += commit.get('additions', 0)
                    stats['deletions'] += commit.get('deletions', 0)
            except (KeyError, ValueError) as e:
                print(f"Error processing commit: {e}")
                continue

    return {
        'stats': dict(stats),
        'areas': {k: list(v) for k, v in work_areas.items()}
    }

def get_recent_activity(data: Dict, days: int = 90) -> List[str]:
    """Get most relevant recent activity"""
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    activity = []
    
    # Get significant PRs (merged or with reviews/comments)
    for pr in data['activity']['code']['pull_requests']:
        try:
            entry_date = datetime.strptime(pr['created_at'], "%Y-%m-%dT%H:%M:%SZ")
            if entry_date > cutoff_date:
                importance = 0
                if pr.get('merged'):
                    importance += 3
                importance += len(pr.get('reviews', []))
                importance += len(pr.get('comments', []))
                
                # Include file change size in importance
                files = pr.get('files', [])
                changes = sum(f.get('additions', 0) + f.get('deletions', 0) for f in files)
                if changes > 500:
                    importance += 2
                
                activity.append((entry_date, importance, f"PR: {pr['title']}"))
        except (KeyError, ValueError) as e:
            print(f"Error processing PR activity: {e}")
            continue
    
    # Get issues with engagement
    for issue in data['activity']['issues']['opened']:
        try:
            entry_date = datetime.strptime(issue['created_at'], "%Y-%m-%dT%H:%M:%SZ")
            if entry_date > cutoff_date:
                comments = len(issue.get('comments', []))
                importance = 1 + comments
                
                # Issues with labels are typically more significant
                if issue.get('labels'):
                    importance += 1
                    
                activity.append((entry_date, importance, f"Issue: {issue['title']}"))
        except (KeyError, ValueError) as e:
            print(f"Error processing issue activity: {e}")
            continue
    
    # Get significant commits (large changes or important messages)
    if 'commits' in data['activity']['code']:
        for commit in data['activity']['code']['commits']:
            try:
                # Try both date field names
                date_str = commit.get('created_at') or commit.get('committedDate')
                if not date_str:
                    continue
                    
                entry_date = datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%SZ")
                if entry_date > cutoff_date:
                    importance = 0
                    msg = commit.get('message', '').split('\n')[0]  # First line only
                    
                    # Prioritize certain types of commits
                    lower_msg = msg.lower()
                    if any(key in lower_msg for key in ['feat:', 'fix:', 'breaking:', 'major:']):
                        importance += 2
                    
                    # Large changes are important
                    changes = commit.get('additions', 0) + commit.get('deletions', 0)
                    if changes > 200:
                        importance += 1
                    
                    activity.append((entry_date, importance, f"Commit: {msg[:100]}"))
            except (KeyError, ValueError) as e:
                print(f"Error processing commit activity: {e}")
                continue
    
    # Sort by importance first, then date
    activity.sort(key=lambda x: (-x[1], x[0]), reverse=True)
    
    # Take top 15 most important activities, or all if less than 15
    return [item[2] for item in activity[:15]]

def get_summary_prompt(data: Dict, activity: List[str], stats: Dict) -> str:
    """Get enhanced prompt for summary generation"""
    areas_str = ""
    if stats['areas'].get('code_areas'):
        areas_str += f"\nCode areas: {', '.join(stats['areas']['code_areas'])}"
    if stats['areas'].get('issue_areas'):
        areas_str += f"\nIssue areas: {', '.join(stats['areas']['issue_areas'])}"
        
    return f"""Based on this GitHub activity, write a 2-3 sentence summary of what {data['contributor']} worked on:

Recent Activity (most significant first):
{chr(10).join(activity)}

Activity Stats:
- PRs: {stats['stats'].get('prs', 0)} ({stats['stats'].get('merged_prs', 0)} merged)
- Issues: {stats['stats'].get('issues', 0)}
- Commits: {stats['stats'].get('commits', 0)}
- Code Changes: +{stats['stats'].get('additions', 0)}/-{stats['stats'].get('deletions', 0)}{areas_str}

Keep it brief and focus on main areas of work. Write in present tense. Start with "{data['contributor']} is" """

def get_thread_prompt(issues: List[str], prs: List[str], summaries: List[str]) -> str:
    """Generate prompt for Twitter thread creation"""
    return f"""Create a Twitter thread summarizing this week's GitHub development activity. Format it exactly like this example, maintaining the same style and punchiness:

1/ ai16z Eliza: This week saw major progress with {len(prs)} PRs merged and {len(issues)} new issues addressed. Here's the breakdown of key developments...

2/ Infrastructure & Performance: [specific improvements with concrete metrics when possible]

Recent activity to summarize:
Issues:
{chr(10).join(issues[:10])}

Pull Requests:
{chr(10).join(prs[:10])}

Weekly Summaries:
{chr(10).join(summaries)}

Key requirements:
- First tweet should be similar to this, with a small introduction: 1/ ai16z Eliza: This week saw major progress with {len(prs)} PRs merged and {len(issues)} new issues addressed. Here's the breakdown of key developments...
- Maximum 10 tweets in the thread, numbered 1/ through 10/
- Each tweet MUST start with the number and slash exactly like this: "1/ " (number, slash, space) and then the tweet content
- NO hashtags
- NO emojis
- Keep each tweet under 280 characters
- Focus on concrete improvements with specific metrics when possible
- End with future roadmap and upcoming priorities

Make each tweet information-dense and specific. Avoid vague statements - prefer concrete examples and metrics. Output the thread only, nothing else."""

def generate_summary(data: Dict, model: str, api_key: str = None) -> str:
    """Generate summary using specified model"""
    try:
        activity = get_recent_activity(data, days=90)
        stats = get_contribution_stats(data, days=90)
        
        # If no activity was found, return early
        if not activity:
            return f"{data['contributor']} had no significant activity."
        
        if model == "openai":
            from openai import OpenAI
            client = OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a technical writer analyzing GitHub contributions."},
                    {"role": "user", "content": get_summary_prompt(data, activity, stats)}
                ],
                temperature=0.3,
                max_tokens=150
            )
            return response.choices[0].message.content.strip()
        else:
            from langchain_ollama import ChatOllama
            model = ChatOllama(model='phi3:14b-medium-4k-instruct-q5_K_M', temperature=0.1)
            prompt = PromptTemplate(
                template=get_summary_prompt(data, activity, stats),
                input_variables=[]
            )
            response = model.invoke(prompt.format())
            return response.content.strip()
    except Exception as e:
        print(f"Error generating {model} summary: {e}")
        return f"Unable to generate summary for {data['contributor']} due to an error."

def generate_thread(issues: List[str], prs: List[str], summaries: List[str], 
                   model: str = "ollama", api_key: str = None) -> str:
    """Generate Twitter thread from weekly activity"""
    try:
        if model == "openai" and api_key:
            from openai import OpenAI
            client = OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a technical writer creating engaging Twitter threads about software development progress."},
                    {"role": "user", "content": get_thread_prompt(issues, prs, summaries)}
                ],
                temperature=0.3,
                max_tokens=1000
            )
            return response.choices[0].message.content.strip()
        else:
            from langchain_ollama import ChatOllama
            model = ChatOllama(model='phi3:14b-medium-4k-instruct-q5_K_M', temperature=0.1)
            prompt = PromptTemplate(
                template=get_thread_prompt(issues, prs, summaries),
                input_variables=[]
            )
            response = model.invoke(prompt.format())
            return response.content.strip()
    except Exception as e:
        print(f"Error generating thread using {model}: {e}")
        return "Unable to generate thread due to an error."

# Modify main() function to add thread generation option:
def main():
    parser = argparse.ArgumentParser(description="Generate contributor summaries and Twitter threads")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Summary command
    summary_parser = subparsers.add_parser("summary", help="Generate contributor summaries")
    summary_parser.add_argument("input_file", help="Input JSON file")
    summary_parser.add_argument("output_file", help="Output JSON file")
    summary_parser.add_argument("--model", choices=["openai", "ollama"], required=True,
                              help="Model to use for generation")
    summary_parser.add_argument("-f", "--force", action="store_true",
                              help="Force overwrite output file")

    # Thread command
    thread_parser = subparsers.add_parser("thread", help="Generate Twitter thread")
    thread_parser.add_argument("--issues", required=True, help="Issues file path")
    thread_parser.add_argument("--prs", required=True, help="PRs file path")
    thread_parser.add_argument("--summaries", required=True, help="Weekly summaries file path")
    thread_parser.add_argument("--output", required=True, help="Output file for thread")
    thread_parser.add_argument("--model", choices=["openai", "ollama"], 
                             default="ollama", help="Model to use for generation")
    thread_parser.add_argument("-f", "--force", action="store_true",
                             help="Force overwrite output file")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    # Check for OpenAI API key only if using OpenAI
    api_key = None
    if args.model == "openai":
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("Warning: OPENAI_API_KEY not found, falling back to ollama")
            args.model = "ollama"

    if args.command == "summary":
        if os.path.exists(args.output_file) and not args.force:
            raise FileExistsError(f"Output file exists. Use -f to overwrite.")

        with open(args.input_file) as f:
            contributors = json.load(f)

        for contributor in contributors:
            print(f"\nProcessing {contributor['contributor']}...")
            summary = generate_summary(contributor, args.model, api_key)
            contributor['summary'] = summary
            print(f"Summary: {summary[:100]}...")

        with open(args.output_file, 'w') as f:
            json.dump(contributors, f, indent=2)
        
        print(f"\nSaved summaries to {args.output_file}")

    elif args.command == "thread":
        if os.path.exists(args.output) and not args.force:
            raise FileExistsError(f"Output file exists. Use -f to overwrite.")

        # Read input files
        with open(args.issues) as f:
            issues = [line.strip() for line in f if line.strip()]
        with open(args.prs) as f:
            prs = [line.strip() for line in f if line.strip()]
        with open(args.summaries) as f:
            summaries = [line.strip() for line in f if line.strip()]

        # Generate thread
        thread = generate_thread(issues, prs, summaries, args.model, api_key)

        # Save thread
        with open(args.output, 'w') as f:
            f.write(thread)
        
        print(f"\nGenerated thread saved to {args.output}")
        print("\nThread preview:")
        print("---------------")
        print(thread)

if __name__ == "__main__":
    main()
