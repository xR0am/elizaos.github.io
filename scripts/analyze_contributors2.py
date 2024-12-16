import json
import os
import time
import argparse
from datetime import datetime, timedelta
from collections import defaultdict
from langchain_community.chat_models import ChatOllama
from langchain_core.prompts import PromptTemplate
from typing import Dict, Set, List, Any

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
    
    # Tag definitions remain the same
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

    def __init__(self, model_name: str = 'phi3:14b-medium-4k-instruct-q5_K_M'):
        self.model = ChatOllama(model=model_name, temperature=0.1)

    # Previous methods remain the same
    def analyze_files(self, files: List[str]) -> Set[str]:
        """Analyze file paths to determine area tags."""
        tags = set()
        
        for file in files:
            for tag, patterns in self.AREA_TAGS.items():
                if any(pattern in file for pattern in patterns):
                    tags.add(tag)
                    
            for tech, keywords in self.TECH_TAGS.items():
                if any(keyword in file.lower() for keyword in keywords):
                    tags.add(tech)
        
        return tags

    def analyze_commit_message(self, message: str) -> Set[str]:
        """Analyze commit message to determine role tags."""
        tags = set()
        lower_message = message.lower()
        
        for role, patterns in self.ROLE_TAGS.items():
            if any(pattern.lower() in lower_message for pattern in patterns):
                tags.add(role)
                
        for tech, keywords in self.TECH_TAGS.items():
            if any(keyword in lower_message for keyword in keywords):
                tags.add(tech)
        
        return tags

    def get_focus_areas(self, files: List[str]) -> List[tuple]:
        """Determine primary focus areas based on file changes."""
        dir_counts = defaultdict(int)
        
        for file in files:
            parts = file.split('/')
            if len(parts) > 1:
                top_level = parts[0]
                dir_counts[top_level] += 1
        
        sorted_areas = sorted(dir_counts.items(), key=lambda x: x[1], reverse=True)
        return sorted_areas[:3]

    def generate_summary(self, contributor_data: Dict[str, Any]) -> str:
        """Generate a natural language summary using LLM."""
        activity = []
        
        for commit in contributor_data.get('commits', [])[:5]:
            activity.append(f"Commit: {commit['title']}")
            
        focus_areas = self.get_focus_areas([f['filename'] for c in contributor_data.get('commits', []) for f in c.get('files', [])])
        tags = contributor_data.get('tags', [])
        
        prompt = PromptTemplate(
            template="""Based on this contributor's activity, write a 2-3 sentence summary:
Focus Areas: {focus_areas}
Tags: {tags}
Recent Activity:
{activity}

Write in present tense, highlighting their main areas of contribution and expertise.""",
            input_variables=["activity", "focus_areas", "tags"]
        )
        
        response = self.model.invoke(prompt.format(
            activity="\n".join(activity),
            focus_areas=", ".join(f"{area}: {count}" for area, count in focus_areas),
            tags=", ".join(tags)
        ))
        
        return response.content.strip()

    def analyze_contributor(self, data: Dict[str, Any], after_date: datetime = None, before_date: datetime = None) -> Dict[str, Any]:
        """Perform complete analysis of a contributor's activity within the specified timeframe."""
        analysis = {
            'username': data['author'],
            'tags': set(),
            'stats': {
                'total_commits': 0,
                'total_files': 0,
                'files_by_type': defaultdict(int),
                'commits_by_month': defaultdict(int)
            },
            'focus_areas': []
        }
        
        # Filter commits by timeframe
        filtered_commits = []
        for commit in data.get('commits', []):
            timestamps = {
                'created': commit.get('created_at'),
                'updated': commit.get('updated_at'),
                'merged': commit.get('merged_at'),
                'closed': commit.get('closed_at')
            }
            
            if not (after_date and before_date):
                filtered_commits.append(commit)
            elif any(ts and is_within_timeframe(ts, after_date, before_date) for ts in timestamps.values()):
                filtered_commits.append(commit)
        
        # Update stats with filtered commits
        analysis['stats']['total_commits'] = len(filtered_commits)
        
        # Analyze filtered commits
        all_files = []
        for commit in filtered_commits:
            commit_files = [f['filename'] for f in commit.get('files', [])]
            all_files.extend(commit_files)
            
            analysis['tags'].update(self.analyze_commit_message(commit['title']))
            
            for file in commit_files:
                ext = os.path.splitext(file)[1]
                if ext:
                    analysis['stats']['files_by_type'][ext] += 1
            
            month = commit['created_at'][:7]  # YYYY-MM
            analysis['stats']['commits_by_month'][month] += 1
        
        analysis['stats']['total_files'] = len(all_files)
        analysis['tags'].update(self.analyze_files(all_files))
        analysis['focus_areas'] = self.get_focus_areas(all_files)
        
        analysis['summary'] = self.generate_summary({
            'commits': filtered_commits,
            'tags': analysis['tags'],
            'focus_areas': analysis['focus_areas']
        })
        
        analysis['tags'] = list(analysis['tags'])
        
        return analysis

def process_contributors(input_file: str, output_file: str, after_date: datetime = None, 
                       before_date: datetime = None, force: bool = False):
    """Process the contributors file and generate analysis within the specified timeframe."""
    if os.path.exists(output_file) and not force:
        raise FileExistsError(f"Output file {output_file} already exists. Use -f to overwrite.")
    
    analyzer = ContributorAnalyzer()
    
    try:
        commits_by_author = defaultdict(list)
        
        with open(input_file, 'r') as f:
            contributors_data = json.load(f)
            
        for commit in contributors_data:
            commits_by_author[commit['author']].append(commit)
        
        analyzed_contributors = []
        for author, commits in commits_by_author.items():
            print(f"\nAnalyzing {author}...")
            analysis = analyzer.analyze_contributor(
                {'author': author, 'commits': commits},
                after_date=after_date,
                before_date=before_date
            )
            analyzed_contributors.append(analysis)
        
        analyzed_contributors.sort(key=lambda x: x['stats']['total_commits'], reverse=True)
        
        # Save results with timeframe metadata
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
    parser.add_argument("input_file", help="Input commits data file")
    parser.add_argument("output_file", help="Output analysis file")
    parser.add_argument("--after", help="Start date (YYYY-MM-DD), defaults to 7 days ago")
    parser.add_argument("--before", help="End date (YYYY-MM-DD), defaults to today")
    parser.add_argument("-f", "--force", action="store_true",
                       help="Force overwrite of output file if it exists")
    parser.add_argument("--model", default="phi3:14b-medium-4k-instruct-q5_K_M",
                       help="Ollama model to use for summary generation")
    
    args = parser.parse_args()
    
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
        after_date=after_date,
        before_date=before_date,
        force=args.force
    )
    print("Analysis complete!")

if __name__ == "__main__":
    main()
