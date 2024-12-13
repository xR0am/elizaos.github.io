import json
import os
import time
import argparse
from collections import defaultdict
from langchain_community.chat_models import ChatOllama
from langchain_core.prompts import PromptTemplate
from typing import Dict, Set, List, Any

class ContributorAnalyzer:
    """Analyze GitHub contributors and their work."""
    
    # Tag definitions
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

    def analyze_files(self, files: List[str]) -> Set[str]:
        """Analyze file paths to determine area tags."""
        tags = set()
        
        for file in files:
            for tag, patterns in self.AREA_TAGS.items():
                if any(pattern in file for pattern in patterns):
                    tags.add(tag)
                    
            # Analyze for tech tags
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
        
        for commit in contributor_data.get('commits', [])[:5]:  # Last 5 commits
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

    def analyze_contributor(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Perform complete analysis of a contributor's activity."""
        analysis = {
            'username': data['author'],
            'tags': set(),
            'stats': {
                'total_commits': len(data.get('commits', [])),
                'total_files': len([f['filename'] for c in data.get('commits', []) for f in c.get('files', [])]),
                'files_by_type': defaultdict(int),
                'commits_by_month': defaultdict(int)
            },
            'focus_areas': []
        }
        
        # Analyze all commits
        all_files = []
        for commit in data.get('commits', []):
            # Gather files
            commit_files = [f['filename'] for f in commit.get('files', [])]
            all_files.extend(commit_files)
            
            # Analyze commit message
            analysis['tags'].update(self.analyze_commit_message(commit['title']))
            
            # Track file types
            for file in commit_files:
                ext = os.path.splitext(file)[1]
                if ext:
                    analysis['stats']['files_by_type'][ext] += 1
            
            # Track commit timing
            month = commit['created_at'][:7]  # YYYY-MM
            analysis['stats']['commits_by_month'][month] += 1
        
        # Analyze files
        analysis['tags'].update(self.analyze_files(all_files))
        
        # Get focus areas
        analysis['focus_areas'] = self.get_focus_areas(all_files)
        
        # Generate summary
        analysis['summary'] = self.generate_summary({
            'commits': data.get('commits', []),
            'tags': analysis['tags'],
            'focus_areas': analysis['focus_areas']
        })
        
        # Convert sets to lists for JSON serialization
        analysis['tags'] = list(analysis['tags'])
        
        return analysis

def process_contributors(input_file: str, output_file: str, force: bool = False):
    """Process the contributors file and generate analysis."""
    if os.path.exists(output_file) and not force:
        raise FileExistsError(f"Output file {output_file} already exists. Use -f to overwrite.")
    
    analyzer = ContributorAnalyzer()
    
    try:
        # Group commits by author
        commits_by_author = defaultdict(list)
        
        with open(input_file, 'r') as f:
            contributors_data = json.load(f)
            
        for commit in contributors_data:
            commits_by_author[commit['author']].append(commit)
        
        # Analyze each contributor
        analyzed_contributors = []
        for author, commits in commits_by_author.items():
            print(f"\nAnalyzing {author}...")
            analysis = analyzer.analyze_contributor({'author': author, 'commits': commits})
            analyzed_contributors.append(analysis)
        
        # Sort by commit count
        analyzed_contributors.sort(key=lambda x: x['stats']['total_commits'], reverse=True)
        
        # Save results
        with open(output_file, 'w') as f:
            json.dump({
                'contributors': analyzed_contributors,
                'metadata': {
                    'total_contributors': len(analyzed_contributors),
                    'analysis_date': time.strftime('%Y-%m-%d'),
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
    parser.add_argument("-f", "--force", action="store_true",
                       help="Force overwrite of output file if it exists")
    parser.add_argument("--model", default="phi3:14b-medium-4k-instruct-q5_K_M",
                       help="Ollama model to use for summary generation")
    
    args = parser.parse_args()
    
    process_contributors(args.input_file, args.output_file, args.force)
    print("Analysis complete!")

if __name__ == "__main__":
    import time
    main()
