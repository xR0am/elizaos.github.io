import argparse
import json
import os
from datetime import datetime
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
from typing import Dict, List, Any
from openai import OpenAI
import multiprocessing
from functools import partial

class ParallelAnalyzer:
    def __init__(self, openai_api_key: str, max_workers: int = None):
        self.openai_client = OpenAI(api_key=openai_api_key)
        self.max_workers = max_workers or multiprocessing.cpu_count()

    def analyze_contributor(self, contributor_data: Dict[str, Any], timeframe: Dict[str, str]) -> Dict[str, Any]:
        """Analyze a single contributor's data"""
        after_date = datetime.strptime(timeframe['after'], '%Y-%m-%d')
        before_date = datetime.strptime(timeframe['before'], '%Y-%m-%d')
        
        # Filter activities within timeframe
        filtered_prs = [
            pr for pr in contributor_data.get('activity', {}).get('code', {}).get('pull_requests', [])
            if self._is_within_timeframe(pr.get('created_at'), after_date, before_date)
        ]
        
        filtered_commits = [
            commit for commit in contributor_data.get('activity', {}).get('code', {}).get('commits', [])
            if self._is_within_timeframe(commit.get('date'), after_date, before_date)
        ]
        
        # Calculate statistics
        stats = self._calculate_stats(filtered_prs, filtered_commits)
        
        # Generate summary using OpenAI
        summary = self._generate_summary(
            contributor_data['contributor'],
            filtered_prs,
            filtered_commits,
            stats
        )
        
        return {
            'username': contributor_data['contributor'],
            'stats': stats,
            'summary': summary,
            'timeframe': timeframe
        }

    def _is_within_timeframe(self, date_str: str, after_date: datetime, before_date: datetime) -> bool:
        """Check if a date string falls within the specified timeframe"""
        if not date_str:
            return False
        try:
            date = datetime.strptime(date_str.split('T')[0], '%Y-%m-%d')
            return after_date <= date <= before_date
        except (ValueError, TypeError):
            return False

    def _calculate_stats(self, prs: List[Dict], commits: List[Dict]) -> Dict[str, Any]:
        """Calculate contributor statistics"""
        return {
            'total_prs': len(prs),
            'merged_prs': len([pr for pr in prs if pr.get('merged')]),
            'total_commits': len(commits),
            'additions': sum(pr.get('additions', 0) for pr in prs),
            'deletions': sum(pr.get('deletions', 0) for pr in prs),
            'files_changed': sum(pr.get('changed_files', 0) for pr in prs)
        }

    def _generate_summary(self, username: str, prs: List[Dict], commits: List[Dict], stats: Dict) -> str:
        """Generate a summary using OpenAI"""
        recent_activity = (
            [f"PR: {pr['title']}" for pr in prs[:5]] +
            [f"Commit: {commit['message']}" for commit in commits[:5]]
        )
        
        prompt = f"""Analyze the following GitHub activity for {username} and create a technical summary:

Recent Activity:
{chr(10).join(recent_activity)}

Statistics:
- Total PRs: {stats['total_prs']} (Merged: {stats['merged_prs']})
- Total Commits: {stats['total_commits']}
- Code Changes: +{stats['additions']}/-{stats['deletions']} in {stats['files_changed']} files

Write a 2-3 sentence summary that:
1. Starts with "{username} is"
2. Highlights their primary areas of focus
3. Notes any patterns in their contributions
"""

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a technical writer specializing in developer portfolio analysis."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=150
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Error generating summary for {username}: {e}")
            return f"Unable to generate summary for {username}'s recent contributions."

    def process_data(self, input_dir: str, output_dir: str, date: str) -> None:
        """Process all contributor data in parallel"""
        # Load input data
        with open(os.path.join(input_dir, 'contributors.json'), 'r') as f:
            contributors = json.load(f)
            
        # Set timeframe
        before_date = datetime.strptime(date, '%Y-%m-%d')
        after_date = before_date - timedelta(days=7)
        timeframe = {
            'after': after_date.strftime('%Y-%m-%d'),
            'before': date
        }

        # Process contributors in parallel
        with ProcessPoolExecutor(max_workers=self.max_workers) as executor:
            analyze_func = partial(self.analyze_contributor, timeframe=timeframe)
            results = list(executor.map(analyze_func, contributors))

        # Generate weekly report
        report = {
            'week_ending': date,
            'contributors': results,
            'metadata': {
                'total_contributors': len(results),
                'analysis_date': datetime.now().strftime('%Y-%m-%d'),
                'timeframe': timeframe
            }
        }

        # Save results
        os.makedirs(output_dir, exist_ok=True)
        output_file = os.path.join(output_dir, f'weekly-{date}.json')
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2)

def main():
    parser = argparse.ArgumentParser(description="Parallel analysis of GitHub contributors")
    parser.add_argument('--input-dir', required=True, help="Directory containing input data")
    parser.add_argument('--output-dir', required=True, help="Directory for output reports")
    parser.add_argument('--date', required=True, help="Analysis end date (YYYY-MM-DD)")
    parser.add_argument('--workers', type=int, help="Number of worker processes")
    args = parser.parse_args()

    openai_api_key = os.getenv('OPENAI_API_KEY')
    if not openai_api_key:
        raise ValueError("OPENAI_API_KEY environment variable is required")

    analyzer = ParallelAnalyzer(openai_api_key, args.workers)
    analyzer.process_data(args.input_dir, args.output_dir, args.date)

if __name__ == "__main__":
    main()
