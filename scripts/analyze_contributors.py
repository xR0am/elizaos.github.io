import json
import os
import time
import argparse
import math
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Dict, Set, List, Any


def parse_datetime(date_str):
    """Parse datetime string from GitHub API format."""
    if not date_str:
        return None
    try:
        # Handle ISO format with 'T' and 'Z'
        return datetime.strptime(date_str, '%Y-%m-%dT%H:%M:%SZ')
    except ValueError as e:
        try:
            # Try alternative format
            return datetime.strptime(date_str, '%Y-%m-%d %H:%M:%S')
        except ValueError:
            print(f"Warning: Could not parse date {date_str}")
            return None

def is_within_timeframe(date_str, after_date, before_date):
    """Check if a date string falls within the specified timeframe."""
    if not date_str:
        return False
    date = parse_datetime(date_str)
    return after_date <= date <= before_date

class ContributorAnalyzer:
    """Analyze GitHub contributors and their work."""

    # Base tag categories with weights
    AREA_TAGS = {
        'core': {'patterns': ['core/', 'src/core', 'packages/core'], 'weight': 2.0},
        'client': {'patterns': ['client/', 'packages/client-'], 'weight': 1.5},
        'plugin': {'patterns': ['plugin/', 'packages/plugin-'], 'weight': 1.2},
        'docs': {'patterns': ['docs/', 'README', '.md'], 'weight': 1.0},
        'infra': {'patterns': ['.github/', 'Dockerfile', 'docker-', '.yaml', '.yml'], 'weight': 1.8},
        'test': {'patterns': ['test/', 'tests/', '.test.', 'jest', 'vitest'], 'weight': 1.3},
        'security': {'patterns': ['security', 'auth', 'authentication'], 'weight': 2.0},
        'ui': {'patterns': ['ui/', 'components/', 'pages/'], 'weight': 1.4}
    }
    
    ROLE_TAGS = {
        'architect': {'patterns': {'feat:', 'refactor:', 'breaking:'}, 'weight': 2.0},
        'maintainer': {'patterns': {'fix:', 'chore:', 'bump:', 'update:'}, 'weight': 1.5},
        'feature-dev': {'patterns': {'feat:', 'feature:', 'add:'}, 'weight': 1.7},
        'bug-fix': {'patterns': {'fix:', 'bugfix:', 'hotfix:'}, 'weight': 1.3},
        'docs-writer': {'patterns': {'docs:', 'documentation:'}, 'weight': 1.0},
        'reviewer': {'patterns': {'review:', 'feedback:'}, 'weight': 1.4},
        'devops': {'patterns': {'ci:', 'cd:', 'deploy:', 'build:'}, 'weight': 1.8}
    }
    
    TECH_TAGS = {
        'typescript': {'patterns': {'.ts', '.tsx', 'tsconfig'}, 'weight': 1.5},
        'blockchain': {'patterns': {'web3', 'chain', 'token', 'wallet', 'contract'}, 'weight': 2.0},
        'ai': {'patterns': {'llm', 'model', 'inference', 'embedding', 'generation'}, 'weight': 2.0},
        'db': {'patterns': {'database', 'sql', 'postgres', 'sqlite'}, 'weight': 1.7},
        'api': {'patterns': {'api', 'rest', 'graphql', 'endpoint'}, 'weight': 1.6}
    }

    def calculate_tag_level(self, points: float) -> Dict[str, float]:
        """Calculate level and progress based on contribution points using a bonding curve."""
        # Base level calculation using logarithmic curve
        base_level = math.log(points + 1, 1.5)
        
        # Calculate current level (floor) and progress to next level
        current_level = math.floor(base_level)
        next_level = current_level + 1
        
        # Calculate points needed for next level
        points_next_level = math.pow(1.5, next_level) - 1
        points_current_level = math.pow(1.5, current_level) - 1
        points_needed = points_next_level - points_current_level
        current_progress = (points - points_current_level) / points_needed
        
        return {
            'level': current_level,
            'progress': min(1.0, current_progress),
            'points': points,
            'points_next_level': points_next_level
        }

    def calculate_tag_weights(self, pr_data: Dict) -> Dict[str, float]:
        """Calculate weighted scores for each tag based on PR content."""
        tag_points = defaultdict(float)
        
        # Calculate base points from files
        for file in pr_data.get('files', []):
            # Handle both 'path' and 'filename' fields
            filename = file.get('path', file.get('filename', ''))
            if not filename:  # Skip if no valid path/filename found
                continue
                
            lines_changed = file.get('additions', 0) + file.get('deletions', 0)
            size_multiplier = math.log(lines_changed + 1, 2)  # Logarithmic scaling for file size
            
            # Score area tags
            for tag, config in self.AREA_TAGS.items():
                if any(pattern in filename for pattern in config['patterns']):
                    tag_points[tag] += size_multiplier * config['weight']
            
            # Score tech tags
            for tech, config in self.TECH_TAGS.items():
                if any(pattern in filename.lower() for pattern in config['patterns']):
                    tag_points[tech] += size_multiplier * config['weight']
        
        # Score role tags from PR title
        title = pr_data.get('title', '').lower()
        for role, config in self.ROLE_TAGS.items():
            if any(pattern.lower() in title for pattern in config['patterns']):
                tag_points[role] += config['weight']
        
        return dict(tag_points)

    #def __init__(self, model_type: str = "openai", api_key: str = None):
    #    self.model_type = model_type
    #    if model_type == "openai":
    #        if not api_key:
    #            raise ValueError("OpenAI API key required")
    #        self.client = OpenAI(api_key=api_key)
    #    else:
    #        self.client = ChatOllama(model='phi3:14b-medium-4k-instruct-q5_K_M', temperature=0.1)

    def analyze_files(self, pr_data: Dict) -> Set[str]:
        """Analyze file paths to determine area tags."""
        tags = set()
        
        for file in pr_data.get('files', []):
            filename = file.get('path', file.get('filename', ''))  # Handle both path and filename
            for tag, config in self.AREA_TAGS.items():
                if any(pattern in filename for pattern in config['patterns']):
                    tags.add(tag)
                    
            for tech, config in self.TECH_TAGS.items():
                if any(pattern in filename.lower() for pattern in config['patterns']):
                    tags.add(tech)
        
        return tags

    def analyze_pr_title(self, title: str) -> Set[str]:
        """Analyze PR title to determine role tags."""
        tags = set()
        lower_title = title.lower()
        
        for role, config in self.ROLE_TAGS.items():
            if any(pattern.lower() in lower_title for pattern in config['patterns']):
                tags.add(role)
                
        for tech, config in self.TECH_TAGS.items():
            if any(pattern in lower_title for pattern in config['patterns']):
                tags.add(tech)
        
        return tags

    def get_focus_areas(self, prs: List[Dict]) -> List[tuple]:
        """Determine primary focus areas based on file changes."""
        dir_counts = defaultdict(int)
        
        for pr in prs:
            for file in pr.get('files', []):
                # Use path instead of filename
                filepath = file.get('path', '')
                if filepath:
                    parts = filepath.split('/')
                    if len(parts) > 1:
                        top_level = parts[0]
                        dir_counts[top_level] += 1
        
        sorted_areas = sorted(dir_counts.items(), key=lambda x: x[1], reverse=True)
        return sorted_areas[:3]

#    def generate_summary(self, username: str, prs: List[Dict], tags: Set[str], 
#                        focus_areas: List[tuple], stats: Dict) -> str:
#        """Generate a natural language summary using either OpenAI or Ollama."""
#        recent_activity = [f"PR: {pr['title']}" for pr in prs[:5]]
#        
#        prompt = f"""Analyze the following GitHub activity for {username} and create a technical summary of their contributions:
#
#Recent Activity:
#{chr(10).join(recent_activity)}
#
#Repository Context:
#- Focus Areas: {', '.join(f'{area}: {count}' for area, count in focus_areas)}
#- Technical Tags: {', '.join(sorted(tags))}
#- Total PRs: {stats['total_prs']}
#- Merged PRs: {stats['merged_prs']}
#- Files Changed: {stats['total_files']}
#- Code Changes: +{stats['total_additions']}/-{stats['total_deletions']}
#
#Write a 2-3 sentence summary that:
#1. Starts with "{username} is"
#2. Highlights their primary areas of technical focus
#3. Mentions specific projects or features they're working on
#4. Notes any patterns in their contributions
#5. Uses present tense
#
#Keep the tone professional and focus on technical contributions."""
#
#        try:
#            if self.model_type == "openai":
#                response = self.client.chat.completions.create(
#                    model="gpt-3.5-turbo",
#                    messages=[
#                        {"role": "system", "content": "You are a technical writer specializing in developer portfolio analysis. Your goal is to create clear, specific summaries that highlight a developer's technical contributions and areas of focus."},
#                        {"role": "user", "content": prompt}
#                    ],
#                    temperature=0.3,
#                    max_tokens=150
#                )
#                return response.choices[0].message.content.strip()
#            else:
#                prompt_template = PromptTemplate(
#                    template=prompt,
#                    input_variables=[]
#                )
#                response = self.client.invoke(prompt_template.format())
#                return response.content.strip()
#        except Exception as e:
#            print(f"Error generating summary for {username}: {e}")
#            return f"Unable to generate summary for {username}'s contributions."

    def analyze_contributor(self, data: Dict[str, Any], after_date: datetime = None, before_date: datetime = None) -> Dict[str, Any]:
        """Enhanced contributor analysis with tag weights and levels."""
        print(f"Analyzing PRs for {data['author']}...")
        if data.get('prs'):
            sample_pr = data['prs'][0]
            print("Sample PR structure:")
            print(json.dumps({k: v for k, v in sample_pr.items() if k not in ['body']}, indent=2))
        
        analysis = {
            'username': data['author'],
            'tag_scores': defaultdict(float),
            'tag_levels': {},
            'tags': set(),  # Will be converted to list before serialization
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
    
        # Filter and analyze PRs
        filtered_prs = []
        for pr in data.get('prs', []):
            if self._is_pr_in_timeframe(pr, after_date, before_date):
                filtered_prs.append(pr)
                
                # Calculate weights for this PR
                pr_weights = self.calculate_tag_weights(pr)
                for tag, weight in pr_weights.items():
                    analysis['tag_scores'][tag] += weight
                
                # Update basic stats
                self._update_pr_stats(analysis['stats'], pr)
        
        # Calculate levels for each tag
        for tag, score in analysis['tag_scores'].items():
            analysis['tag_levels'][tag] = self.calculate_tag_level(score)
        
        # Calculate focus areas
        analysis['focus_areas'] = self.get_focus_areas(filtered_prs)
        
        # Keep existing summary from input data
        if 'summary' in data:
            analysis['summary'] = data['summary']
        
        # Convert sets to lists for JSON serialization
        analysis['tags'] = list(analysis['tags'])
        analysis['tag_scores'] = dict(analysis['tag_scores'])
        analysis['stats']['files_by_type'] = dict(analysis['stats']['files_by_type'])
        analysis['stats']['prs_by_month'] = dict(analysis['stats']['prs_by_month'])
        
        return analysis


#    def _generate_enhanced_summary(self, username: str, prs: List[Dict], 
#                                 tag_levels: Dict, focus_areas: List[tuple], 
#                                 stats: Dict) -> str:
#        """Generate an enhanced summary including tag levels and expertise areas."""
#        # Sort tags by level
#        top_tags = sorted(
#            tag_levels.items(),
#            key=lambda x: (x[1]['level'], x[1]['points']),
#            reverse=True
#        )[:3]
#        
#        tag_descriptions = [
#            f"{tag} (Level {data['level']}, {data['points']:.1f} points)"
#            for tag, data in top_tags
#        ]
#        
#        prompt = f"""Analyze the following GitHub activity for {username}:
#
#Expertise Areas:
#{chr(10).join(f"- {desc}" for desc in tag_descriptions)}
#
#Focus Areas:
#{chr(10).join(f"- {area}: {count} contributions" for area, count in focus_areas[:3])}
#
#Statistics:
#- Total PRs: {stats['total_prs']}
#- Code Changes: +{stats['total_additions']}/-{stats['total_deletions']}
#
#Write a 2-3 sentence technical summary that highlights their expertise levels and primary contributions."""
#
#        try:
#            if self.model_type == "openai":
#                response = self.client.chat.completions.create(
#                    model="gpt-3.5-turbo",
#                    messages=[
#                        {"role": "system", "content": "You are a technical analyst specializing in developer expertise assessment."},
#                        {"role": "user", "content": prompt}
#                    ],
#                    temperature=0.3,
#                    max_tokens=150
#                )
#                return response.choices[0].message.content.strip()
#            else:
#                prompt_template = PromptTemplate(template=prompt, input_variables=[])
#                response = self.client.invoke(prompt_template.format())
#                return response.content.strip()
#        except Exception as e:
#            return f"Error generating summary for {username}: {str(e)}"

    def _is_pr_in_timeframe(self, pr: Dict, after_date: datetime, before_date: datetime) -> bool:
        """Check if PR falls within specified timeframe."""
        if not (after_date and before_date):
            return True
            
        timestamps = {
            'created': pr.get('created_at'),
            'updated': pr.get('updated_at'),
            'merged': pr.get('merged_at'),
            'closed': pr.get('closed_at')
        }
        
        return any(
            ts and after_date <= parse_datetime(ts) <= before_date
            for ts in timestamps.values()
            if ts
        )

    def _update_pr_stats(self, stats: Dict, pr: Dict):
        """Update PR statistics."""
        stats['total_prs'] += 1
        if pr.get('merged'):  # Using merged boolean directly
            stats['merged_prs'] += 1
        if pr.get('state') == 'MERGED' or pr.get('state') == 'CLOSED':  # Handle GitHub API state format
            stats['closed_prs'] += 1
            
        # Get additions and deletions from files
        total_additions = 0
        total_deletions = 0
        for file in pr.get('files', []):
            total_additions += file.get('additions', 0)
            total_deletions += file.get('deletions', 0)
            
        stats['total_additions'] += total_additions
        stats['total_deletions'] += total_deletions
        
        for file in pr.get('files', []):
            stats['total_files'] += 1
            filepath = file.get('path', '')
            if filepath:
                ext = os.path.splitext(filepath)[1]
                if ext:
                    stats['files_by_type'][ext] += 1
        
        created_at = pr.get('created_at', '')
        if created_at:
            month = created_at[:7]  # YYYY-MM
            stats['prs_by_month'][month] += 1

def process_contributors(input_file: str, output_file: str, 
                       after_date: datetime = None, 
                       before_date: datetime = None, 
                       force: bool = False):
    """Process contributors and generate analysis."""
    if os.path.exists(output_file) and not force:
        raise FileExistsError(f"Output file {output_file} already exists. Use -f to overwrite.")
    
    analyzer = ContributorAnalyzer()  # No longer needs model_type and api_key
    
    try:
        with open(input_file, 'r') as f:
            contributors_data = json.load(f)
        
        analyzed_contributors = []
        for contributor_data in contributors_data:
            print(f"\nAnalyzing {contributor_data['contributor']}...")
            
            contributor_info = {
                'author': contributor_data['contributor'],
                'prs': contributor_data['activity']['code']['pull_requests']
            }
            
            analysis = analyzer.analyze_contributor(
                contributor_info,
                after_date=after_date,
                before_date=before_date
            )
            
            if analysis['stats']['total_prs'] == 0:
                analysis['summary'] = contributor_data.get('summary', 
                    f"No activity found for {contributor_data['contributor']} in the specified timeframe.")
                
            analyzed_contributors.append(analysis)
        
        analyzed_contributors.sort(key=lambda x: x['stats']['total_prs'], reverse=True)
        
        metadata = {
            'total_contributors': len(analyzed_contributors),
            'analysis_date': time.strftime('%Y-%m-%d'),
            'analysis_timeframe': {
                'after': after_date.isoformat() if after_date else None,
                'before': before_date.isoformat() if before_date else None
            },
            'tags_found': sorted(list(set(tag for c in analyzed_contributors for tag in c['tags'])))
        }
        
        with open(output_file, 'w') as f:
            json.dump({
                'contributors': analyzed_contributors,
                'metadata': metadata
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

