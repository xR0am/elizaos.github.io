import json
import os
import argparse
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any
from collections import defaultdict

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

try:
    from langchain_core.prompts import PromptTemplate
    from langchain_ollama import ChatOllama
except ImportError:
    PromptTemplate = None
    ChatOllama = None

class ContributorAnalyzer:
    def __init__(self, model: str = "ollama", api_key: str = None):
        self.model_type = model
        self.api_key = api_key
        self.llm = self._init_model()
        
    def _init_model(self):
        """Initialize the language model"""
        if self.model_type == "ollama":
            return ChatOllama(
                model='phi3:14b-medium-4k-instruct-q5_K_M',
                temperature=0.1
            )
        elif self.model_type == "openai" and self.api_key:
            return OpenAI(api_key=self.api_key)
        return None

    def generate_period_summary(self, contributor: Dict, period: str) -> str:
        """Generate concise summary under 280 chars focused on key activity with enhanced context."""
        activity = contributor['activity']
        
        # Get key metrics
        stats = {
            'prs': len(activity['code']['pull_requests']),
            'top_areas': defaultdict(int),
            'pr_titles': []
        }
        
        # Analyze PR activity
        for pr in activity['code']['pull_requests']:
            # Extract PR title and add to list
            title = pr.get('title', 'Unknown PR title')
            stats['pr_titles'].append(title)
            
            # Analyze focus areas based on file paths
            for file in pr.get('files', []):
                path = file.get('path', '')
                if '/' in path:
                    area = path.split('/')[0]
                    stats['top_areas'][area] += 1
    
        # Prepare concise context
        top_areas = ', '.join(f"{k} ({v})" for k, v in sorted(stats['top_areas'].items(), key=lambda x: x[1], reverse=True)[:2])
        key_pr_titles = '; '.join(stats['pr_titles'][:2])  # Limit to 2 PR titles for brevity
    
        # Define prompt with expanded context
        prompt = PromptTemplate(
            template=f"""Write a concise GitHub activity summary UNDER 280 CHARACTERS. Avoid repetitive phrasing like "led the charge." Use the shortest words to describe updates to fit within character limit.
    
    {contributor['contributor']}'s {period} activity:
    - {stats['prs']} PRs
    - Key areas: {top_areas}
    - Notable PRs: {key_pr_titles}
    
    Start each sentence with "{contributor['contributor']}". Mention specific technical achievements and their project impact ONLY. Include affected files or notable fixes (e.g., optimized caching, multilingual fixes). Be specific and succinct (<280 chars). NO hashtags or emojis.""",
            input_variables=[]
        )
        
        # Generate response based on model type
        if self.model_type == "openai":
            response = self.llm.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a technical writer generating concise (<280 char) GitHub activity summaries."},
                    {"role": "user", "content": prompt.template}
                ],
                temperature=0.3,
                max_tokens=100  # Limit to short summaries
            )
            summary = response.choices[0].message.content.strip()
        else:
            response = self.llm.invoke(prompt.format())
            summary = response.content.strip()
        
        # Ensure the summary is under 280 characters
        if len(summary) > 280:
            summary = summary[:277] + "..."
        
        return summary
        
        if self.model_type == "openai":
            response = self.llm.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a technical writer analyzing GitHub contributions."},
                    {"role": "user", "content": prompt.template}
                ],
                temperature=0.3,
                max_tokens=150
            )
            return response.choices[0].message.content.strip()
        else:
            response = self.llm.invoke(prompt.format())
            return response.content.strip()

    def load_daily_summaries(self, history_dir: str, days: int) -> List[Dict]:
        """Load contributor data from the history directory for the specified number of days"""
        history_path = Path(history_dir)
        today = datetime.now()
        daily_data = []
        
        # Support both date formats: YYYY-MM-DD and YYYY_MM_DD
        date_formats = {
            '%Y-%m-%d': 'contributors_{}.json',
            '%Y_%m_%d': 'contributors_{}.json'
        }
        
        for i in range(days):
            date = today - timedelta(days=i)
            found = False
            
            for date_format, file_pattern in date_formats.items():
                date_str = date.strftime(date_format)
                contrib_file = history_path / file_pattern.format(date_str)
                
                if contrib_file.exists():
                    print(f"Loading {contrib_file}")
                    try:
                        with open(contrib_file, 'r', encoding='utf-8') as f:
                            content = f.read()
                            # Clean any problematic characters
                            content = ''.join(char for char in content if ord(char) >= 32 or char in '\n\r\t')
                            contributors = json.loads(content)
                            if isinstance(contributors, list):
                                daily_data.extend(contributors)
                                print(f"Found {len(contributors)} contributors for {date_str}")
                                found = True
                                break
                    except Exception as e:
                        print(f"Error reading {contrib_file}: {str(e)}")
            
            if not found:
                print(f"No contributor file found for {date.strftime('%Y-%m-%d')}")
                
        return daily_data

    def merge_contributor_data(self, contributors: List[Dict]) -> List[Dict]:
        """Merge multiple days of contributor data into single entries per contributor"""
        merged = defaultdict(lambda: {
            'contributor': '',
            'score': 0,
            'summary': '',
            'avatar_url': '',
            'activity': {
                'code': {
                    'total_commits': 0,
                    'total_prs': 0,
                    'commits': [],
                    'pull_requests': []
                },
                'issues': {
                    'total_opened': 0,
                    'opened': []
                },
                'engagement': {
                    'total_comments': 0,
                    'total_reviews': 0,
                    'comments': [],
                    'reviews': []
                }
            }
        })
        
        for contrib in contributors:
            username = contrib['contributor']
            merged[username]['contributor'] = username
            merged[username]['avatar_url'] = contrib.get('avatar_url', '')
            merged[username]['score'] = max(merged[username]['score'], contrib.get('score', 0))
            
            # Combine activity data
            activity = contrib.get('activity', {})
            if activity:
                code = activity.get('code', {})
                merged[username]['activity']['code']['commits'].extend(code.get('commits', []))
                merged[username]['activity']['code']['pull_requests'].extend(code.get('pull_requests', []))
                merged[username]['activity']['code']['total_commits'] += code.get('total_commits', 0)
                merged[username]['activity']['code']['total_prs'] += code.get('total_prs', 0)
                
                issues = activity.get('issues', {})
                merged[username]['activity']['issues']['opened'].extend(issues.get('opened', []))
                merged[username]['activity']['issues']['total_opened'] += issues.get('total_opened', 0)
                
                engagement = activity.get('engagement', {})
                merged[username]['activity']['engagement']['comments'].extend(engagement.get('comments', []))
                merged[username]['activity']['engagement']['reviews'].extend(engagement.get('reviews', []))
                merged[username]['activity']['engagement']['total_comments'] += engagement.get('total_comments', 0)
                merged[username]['activity']['engagement']['total_reviews'] += engagement.get('total_reviews', 0)
        
        result = list(merged.values())
        result.sort(key=lambda x: x['score'], reverse=True)
        return result

    def generate_period_analysis(self, history_dir: str, days: int, period: str) -> Dict:
        """Generate weekly or monthly analysis by aggregating daily data"""
        print(f"\nLoading and merging {period} data ({days} days)...")
        
        # Load and merge daily data
        daily_data = self.load_daily_summaries(history_dir, days)
        merged_data = self.merge_contributor_data(daily_data)
        
        # Generate period summaries
        if self.llm:
            print(f"\nGenerating {period} summaries using {self.model_type}...")
            for contributor in merged_data:
                contributor[f'summary'] = self.generate_period_summary(
                    contributor,
                    period
                )
        
        return {'contributors': merged_data}

def main():
    parser = argparse.ArgumentParser(description="Generate weekly or monthly summary analysis")
    parser.add_argument("--history-dir", default="data/daily/history",
                       help="Directory containing daily summary history")
    parser.add_argument("--output", default="data/analysis.json",
                       help="Output file for analysis")
    parser.add_argument("--period", choices=["weekly", "monthly"], default="weekly",
                       help="Analysis period (default: weekly)")
    parser.add_argument("--model", choices=["openai", "ollama"], default="ollama",
                       help="Model to use for summary generation")
    parser.add_argument("--api-key", help="OpenAI API key (if using OpenAI model)")
    args = parser.parse_args()
    
    analyzer = ContributorAnalyzer(model=args.model, api_key=args.api_key)
    days = 30 if args.period == "monthly" else 7
    
    # Generate analysis for specified period
    print(f"\nGenerating {args.period} analysis...")
    analysis = analyzer.generate_period_analysis(
        args.history_dir, days, args.period
    )
    
    # Save analysis
    print(f"\nSaving {args.period} analysis to {args.output}")
    with open(args.output, 'w') as f:
        json.dump(analysis, f, indent=2)
    
    print("\nAnalysis generation complete!")

if __name__ == "__main__":
    main()
