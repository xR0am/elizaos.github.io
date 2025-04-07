import json
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
    def __init__(self, model: str = "ollama", api_key: str = None, 
                 site_url: str = None, site_name: str = None):
        self.model_type = model
        self.api_key = api_key
        self.site_url = site_url
        self.site_name = site_name
        self.llm = self._init_model()
        
    def _init_model(self):
        """Initialize the language model"""
        if self.model_type == "ollama":
            return ChatOllama(
                model='phi3:14b-medium-4k-instruct-q5_K_M',
                temperature=0.1
            )
        elif self.model_type == "openai" and self.api_key:
            base_url = "https://openrouter.ai/api/v1" if self.site_url else None
            default_headers = {}
            if self.site_url:
                default_headers["HTTP-Referer"] = self.site_url
            if self.site_name:
                default_headers["X-Title"] = self.site_name
                
            return OpenAI(
                api_key=self.api_key,
                base_url=base_url,
                default_headers=default_headers if default_headers else None
            )
        return None

    def generate_period_summary(self, contributor: Dict, period: str) -> str:
        """Generate concise summary under 280 chars focused on key activity with enhanced context."""
        stats = {
            'prs': contributor.get('stats', {}).get('total_prs', 0),
            'top_areas': defaultdict(int),
            'pr_titles': []
        }
        
        # Extract top areas from focus_areas
        for area, count in contributor.get('focus_areas', []):
            stats['top_areas'][area] = count
    
        # Prepare concise context
        top_areas = ', '.join(f"{k} ({v})" for k, v in sorted(stats['top_areas'].items(), key=lambda x: x[1], reverse=True)[:2])
    
        # Define prompt with expanded context
        prompt = PromptTemplate(
            template=f"""Write a concise GitHub activity summary UNDER 280 CHARACTERS. Avoid repetitive phrasing like "led the charge." Use the shortest words to describe updates to fit within character limit.
    
    {contributor['username']}'s {period} activity:
    - {stats['prs']} PRs
    - Key areas: {top_areas}
    - Tags: {', '.join(contributor.get('tags', [])[:3])}
    
    Start each sentence with "{contributor['username']}". Mention specific technical achievements and their project impact ONLY. Include affected files or notable fixes (e.g., optimized caching, multilingual fixes). Be specific and succinct (<280 chars). NO hashtags or emojis.""",
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
                max_tokens=100
            )
            summary = response.choices[0].message.content.strip()
        else:
            response = self.llm.invoke(prompt.format())
            summary = response.content.strip()
        
        # Ensure summary is under 280 characters
        if len(summary) > 280:
            summary = summary[:277] + "..."
        
        return summary

def filter_analysis_data(analysis_data: Dict, active_contributors: Dict) -> Dict:
    """Filter analysis.json to only include active contributors"""
    result = analysis_data.copy()
    
    # Filter contributors list
    filtered_contributors = [
        contributor for contributor in result['contributors']
        if contributor['username'] in active_contributors
    ]
    
    result['contributors'] = filtered_contributors
    return result        
        
def load_active_contributors(history_dir: str, days: int) -> Dict[str, Dict]:
    """Load active contributors and their summaries from daily files"""
    history_path = Path(history_dir)
    today = datetime.now()
    contributor_data = {}
    
    # Process files in reverse chronological order
    for i in range(days):
        date = today - timedelta(days=i)
        
        # Try both date formats
        for date_format in ['%Y-%m-%d', '%Y_%m_%d']:
            date_str = date.strftime(date_format)
            contrib_file = history_path / f'contributors_{date_str}.json'
            
            if contrib_file.exists():
                print(f"Loading {contrib_file}")
                try:
                    with open(contrib_file, 'r') as f:
                        contributors = json.load(f)
                        for contrib in contributors:
                            username = contrib['contributor']
                            if username not in contributor_data:
                                contributor_data[username] = {
                                    'summary': contrib.get('summary', '')
                                }
                            elif contrib.get('summary'):  # Keep most recent summary
                                contributor_data[username]['summary'] = contrib['summary']
                except Exception as e:
                    print(f"Error reading {contrib_file}: {str(e)}")
                break  # Found file for this date
    
    return contributor_data
    
def load_daily_summaries(history_dir: str, days: int) -> Dict[str, Dict]:
    """Load contributor data from history directory with full summary history"""
    history_path = Path(history_dir)
    today = datetime.now()
    contributor_data = {}
    
    date_formats = {
        '%Y-%m-%d': 'contributors_{}.json',
        '%Y_%m_%d': 'contributors_{}.json'
    }
    
    # Process files in reverse chronological order
    for i in range(days):
        date = today - timedelta(days=i)
        found = False
        
        for date_format, file_pattern in date_formats.items():
            date_str = date.strftime(date_format)
            contrib_file = history_path / file_pattern.format(date_str)
            
            if contrib_file.exists():
                print(f"Loading {contrib_file}")
                try:
                    with open(contrib_file, 'r') as f:
                        contributors = json.load(f)
                        if isinstance(contributors, list):
                            for contrib in contributors:
                                username = contrib['contributor']
                                if username not in contributor_data:
                                    contributor_data[username] = {
                                        'summaries': [],  # Track all unique summaries
                                        'latest_date': date_str
                                    }
                                
                                # Add non-empty summary if unique
                                if contrib.get('summary'):
                                    summary = contrib['summary'].strip()
                                    if summary and summary not in contributor_data[username]['summaries']:
                                        contributor_data[username]['summaries'].append(summary)
                                        # Update latest date if this file is more recent
                                        if date_str > contributor_data[username]['latest_date']:
                                            contributor_data[username]['latest_date'] = date_str
                            found = True
                            break
                except Exception as e:
                    print(f"Error reading {contrib_file}: {str(e)}")
        
        if not found:
            print(f"No data found for {date.strftime('%Y-%m-%d')}")
    
    # Process data to keep most recent valid summary
    final_data = {}
    for username, data in contributor_data.items():
        if data['summaries']:
            final_data[username] = {
                'summary': data['summaries'][0]  # Most recent summary since we processed files in reverse order
            }
    
    return final_data

def update_analysis_format(analysis_data: Dict, contributor_data: Dict, analyzer: ContributorAnalyzer, period: str) -> Dict:
    """Update analysis.json format with contributor fields"""
    result = analysis_data.copy()
    
    for contributor in result['contributors']:
        username = contributor['username']
        if username in contributor_data:
            # Create new dict starting with username and summary
            updated_contributor = {
                'username': username,
                'summary': ''
            }
            
            # Generate new summary if we have a language model
            if analyzer and analyzer.llm:
                summary = analyzer.generate_period_summary(contributor, period)
                updated_contributor['summary'] = summary
            elif contributor_data[username].get('summary'):
                updated_contributor['summary'] = contributor_data[username]['summary']
            
            # Add all existing fields from analysis.json
            for key, value in contributor.items():
                if key != 'username':  # Skip username since we added it first
                    updated_contributor[key] = value
            
            # Replace the contributor entry with our updated version
            contributor.clear()
            contributor.update(updated_contributor)
    
    return result

def main():
    parser = argparse.ArgumentParser(description="Generate weekly/monthly contributor analysis")
    parser.add_argument("--history-dir", default="data/daily/history",
                       help="Directory containing daily summary history")
    parser.add_argument("--analysis", required=True,
                       help="Input analysis.json file")
    parser.add_argument("--output", required=True,
                       help="Output file for updated analysis")
    parser.add_argument("--period", choices=["weekly", "monthly"], default="weekly",
                       help="Analysis period (default: weekly)")
    parser.add_argument("--model", choices=["openai", "ollama", "none"], default="none",
                       help="Model to use for summary generation")
    args = parser.parse_args()
    
    # Initialize analyzer if using a model
    analyzer = None
    if args.model != "none":
        api_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY")
        site_url = os.getenv("SITE_URL")
        site_name = os.getenv("SITE_NAME")
        
        if api_key:
            analyzer = ContributorAnalyzer(
                model=args.model, 
                api_key=api_key,
                site_url=site_url,
                site_name=site_name
            )

    # Load analysis.json
    print(f"\nLoading analysis from {args.analysis}")
    with open(args.analysis) as f:
        analysis_data = json.load(f)
    
    # Load active contributors from daily files
    days = 30 if args.period == "monthly" else 7
    print(f"\nLoading {args.period} data ({days} days)...")
    active_contributors = load_active_contributors(args.history_dir, days)
    
    # Filter analysis data to active contributors only
    print(f"\nFiltering analysis data to {len(active_contributors)} active contributors...")
    filtered_analysis = filter_analysis_data(analysis_data, active_contributors)
    
    # Update filtered analysis with summaries
    print(f"\nUpdating analysis data...")
    result = update_analysis_format(
        filtered_analysis,
        active_contributors,
        analyzer,
        args.period
    )
    
    # Add period to metadata
    if 'metadata' not in result:
        result['metadata'] = {}
    result['metadata']['period'] = args.period
    result['metadata']['days'] = days
    
    # Save output
    print(f"\nSaving {args.period} analysis to {args.output}")
    with open(args.output, 'w') as f:
        json.dump(result, f, indent=2)
    
    print("\nAnalysis update complete!")

if __name__ == "__main__":
    main()
