import json
import os
import time
import argparse
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Dict, Set, List, Any
from openai import OpenAI

def parse_datetime(date_str):
    """Parse datetime string from GitHub API format."""
    if not date_str:
        return None
    return datetime.strptime(date_str, '%Y-%m-%d %H:%M:%S')

def is_within_timeframe(date_str, after_date, before_date):
    """Check if a date string falls within the specified timeframe."""
    if not date_str:
        return False
    date = parse_datetime(date_str)
    return after_date <= date <= before_date

class ContributorAnalyzer:
    """Analyze GitHub contributors and their work."""
    
    AREA_TAGS = {
        'core': ['core/', 'src/core', 'packages/core'],
        'client': ['client/', 'packages/client-'],
        'plugin': ['plugin/', 'packages/plugin-'],
        'docs': ['docs/', 'README', '.md'],
        'infra': ['.github/', 'Dockerfile', 'docker-', '.yaml', '.yml'],
        'test': ['test/', 'tests/', '.test.', 'jest', 'vitest'],
        'security': ['security', 'auth', 'authentication'],
        'ui': ['ui/', 'components/', 'pages/']
    }
    
    ROLE_TAGS = {
        'architect': {'feat:', 'refactor:', 'breaking:'},
        'maintainer': {'fix:', 'chore:', 'bump:', 'update:'},
        'feature-dev': {'feat:', 'feature:', 'add:'},
        'bug-fix': {'fix:', 'bugfix:', 'hotfix:'},
        'docs-writer': {'docs:', 'documentation:'},
        'reviewer': {'review:', 'feedback:'},
        'devops': {'ci:', 'cd:', 'deploy:', 'build:'}
    }
    
    TECH_TAGS = {
        'typescript': {'.ts', '.tsx', 'tsconfig'},
        'blockchain': {'web3', 'chain', 'token', 'wallet', 'contract'},
        'ai': {'llm', 'model', 'inference', 'embedding', 'generation'},
        'db': {'database', 'sql', 'postgres', 'sqlite'},
        'api': {'api', 'rest', 'graphql', 'endpoint'}
    }

    def __init__(self, api_key: str):
        self.client = OpenAI(api_key=api_key)

    def analyze_files(self, pr_data: Dict) -> Set[str]:
        """Analyze file paths to determine area tags."""
        tags = set()
        
        for file in pr_data.get('files', []):
            filename = file['filename']
            for tag, patterns in self.AREA_TAGS.items():
                if any(pattern in filename for pattern in patterns):
                    tags.add(tag)
                    
            for tech, keywords in self.TECH_TAGS.items():
                if any(keyword in filename.lower() for keyword in keywords):
                    tags.add(tech)
        
        return tags

    def analyze_pr_title(self, title: str) -> Set[str]:
        """Analyze PR title to determine role tags."""
        tags = set()
        lower_title = title.lower()
        
        for role, patterns in self.ROLE_TAGS.items():
            if any(pattern.lower() in lower_title for pattern in patterns):
                tags.add(role)
                
        for tech, keywords in self.TECH_TAGS.items():
            if any(keyword in lower_title for keyword in keywords):
                tags.add(tech)
        
        return tags

    def get_focus_areas(self, prs: List[Dict]) -> List[tuple]:
        """Determine primary focus areas based on file changes."""
        dir_counts = defaultdict(int)
        
        for pr in prs:
            for file in pr.get('files', []):
                parts = file['filename'].split('/')
                if len(parts) > 1:
                    top_level = parts[0]
                    dir_counts[top_level] += 1
        
        sorted_areas = sorted(dir_counts.items(), key=lambda x: x[1], reverse=True)
        return sorted_areas[:3]

    def generate_summary(self, username: str, prs: List[Dict], tags: Set[str], 
                        focus_areas: List[tuple], stats: Dict) -> str:
        """Generate a natural language summary using OpenAI."""
        recent_activity = [f"PR: {pr['title']}" for pr in prs[:5]]
        
        prompt = f"""Analyze the following GitHub activity for {username} and create a technical summary of their contributions:

Recent Activity:
{chr(10).join(recent_activity)}

Repository Context:
- Focus Areas: {', '.join(f'{area}: {count}' for area, count in focus_areas)}
- Technical Tags: {', '.join(sorted(tags))}
- Total PRs: {stats['total_prs']}
- Merged PRs: {stats['merged_prs']}
- Files Changed: {stats['total_files']}
- Code Changes: +{stats['total_additions']}/-{stats['total_deletions']}

Write a 2-3 sentence summary that:
1. Starts with "{username} is"
2. Highlights their primary areas of technical focus
3. Mentions specific projects or features they're working on
4. Notes any patterns in their contributions
5. Uses present tense

Keep the tone professional and focus on technical contributions."""

        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a technical writer specializing in developer portfolio analysis. Your goal is to create clear, specific summaries that highlight a developer's technical contributions and areas of focus."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=150
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Error generating summary for {username}: {e}")
            return f"Unable to generate summary for {username}'s contributions."

    def analyze_contributor(self, data: Dict[str, Any], after_date: datetime = None, before_date: datetime = None) -> Dict[str, Any]:
        """Perform complete analysis of a contributor's activity within the specified timeframe."""
        analysis = {
            'username': data['author'],
            'tags': set(),
            'stats': {
                'total_prs': 0,
                'merged_prs': 0,
                'closed_prs': 0,
                'total_files': 0,
                'total_additions': 0,
                'total_deletions': 0,
                'files_by_type': defaultdict(int),
                'prs_by_month': defaultdict(int)
            },
            'focus_areas': []
        }
        
        # Filter PRs by timeframe
        filtered_prs = []
        for pr in data.get('prs', []):
            timestamps = {
                'created': pr.get('created_at'),
                'updated': pr.get('updated_at'),
                'merged': pr.get('merged_at'),
                'closed': pr.get('closed_at')
            }
            
            if not (after_date and before_date):
                filtered_prs.append(pr)
            elif any(ts and is_within_timeframe(ts, after_date, before_date) for ts in timestamps.values()):
                filtered_prs.append(pr)
        
        # Update stats with filtered PRs
        for pr in filtered_prs:
            analysis['stats']['total_prs'] += 1
            if pr.get('merged'):
                analysis['stats']['merged_prs'] += 1
            if pr.get('state') == 'closed':
                analysis['stats']['closed_prs'] += 1
                
            analysis['stats']['total_additions'] += pr.get('additions', 0)
            analysis['stats']['total_deletions'] += pr.get('deletions', 0)
            analysis['tags'].update(self.analyze_pr_title(pr['title']))
            
            for file in pr.get('files', []):
                analysis['stats']['total_files'] += 1
                ext = os.path.splitext(file['filename'])[1]
                if ext:
                    analysis['stats']['files_by_type'][ext] += 1
            
            month = pr['created_at'][:7]  # YYYY-MM
            analysis['stats']['prs_by_month'][month] += 1
        
        analysis['tags'].update(self.analyze_files({'files': [f for pr in filtered_prs for f in pr.get('files', [])]}))
        analysis['focus_areas'] = self.get_focus_areas(filtered_prs)
        
        # Generate summary if there's activity
        if filtered_prs:
            analysis['summary'] = self.generate_summary(
                analysis['username'],
                filtered_prs,
                analysis['tags'],
                analysis['focus_areas'],
                analysis['stats']
            )
        else:
            analysis['summary'] = f"No activity found for {analysis['username']} in the specified timeframe."
        
        analysis['tags'] = list(analysis['tags'])
        
        return analysis

def process_contributors(input_file: str, output_file: str, api_key: str, 
                       after_date: datetime = None, before_date: datetime = None, 
                       force: bool = False):
    """Process the contributors file and generate analysis within the specified timeframe."""
    if os.path.exists(output_file) and not force:
        raise FileExistsError(f"Output file {output_file} already exists. Use -f to overwrite.")
    
    analyzer = ContributorAnalyzer(api_key)
    
    try:
        # Group PRs by author
        prs_by_author = defaultdict(list)
        
        with open(input_file, 'r') as f:
            data = json.load(f)
            
        for pr in data:
            prs_by_author[pr['author']].append(pr)
        
        analyzed_contributors = []
        for author, prs in prs_by_author.items():
            print(f"\nAnalyzing {author}...")
            analysis = analyzer.analyze_contributor(
                {'author': author, 'prs': prs},
                after_date=after_date,
                before_date=before_date
            )
            if analysis['stats']['total_prs'] > 0:  # Only include contributors with activity in timeframe
                analyzed_contributors.append(analysis)
        
        analyzed_contributors.sort(key=lambda x: x['stats']['total_prs'], reverse=True)
        
        # Save results
        with open(output_file, 'w') as f:
            json.dump({
                'contributors': analyzed_contributors,
                'metadata': {
                    'total_contributors': len(analyzed_contributors),
                    'analysis_date': time.strftime('%Y-%m-%d'),
                    'analysis_timeframe': {
                        'after': after_date.isoformat() if after_date else None,
                        'before': before_date.isoformat() if before_date else None
                    },
                    'tags_found': sorted(set(tag for c in analyzed_contributors for tag in c['tags']))
                }
            }, f, indent=2)
        
        print(f"\nSaved analysis to {output_file}")
            
    except Exception as e:
        print(f"Error processing contributors: {e}")
        raise

def main():
    parser = argparse.ArgumentParser(description="Analyze GitHub contributors and generate detailed reports")
    parser.add_argument("input_file", help="Input PR data file")
    parser.add_argument("output_file", help="Output analysis file")
    parser.add_argument("--after", help="Start date (YYYY-MM-DD), defaults to 7 days ago")
    parser.add_argument("--before", help="End date (YYYY-MM-DD), defaults to today")
    parser.add_argument("-f", "--force", action="store_true",
                       help="Force overwrite of output file if it exists")
    
    args = parser.parse_args()
    
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable is required")
    
    # Handle date arguments
    before_date = datetime.strptime(args.before, '%Y-%m-%d') if args.before else datetime.now()
    after_date = (
        datetime.strptime(args.after, '%Y-%m-%d') if args.after
        else before_date - timedelta(days=7)
    )
    
    # Set time to end of day for before_date and start of day for after_date
    before_date = before_date.replace(hour=23, minute=59, second=59)
    after_date = after_date.replace(hour=0, minute=0, second=0)
    
    process_contributors(
        args.input_file,
        args.output_file,
        api_key,
        after_date=after_date,
        before_date=before_date,
        force=args.force
    )
    print("Analysis complete!")

if __name__ == "__main__":
    main()
