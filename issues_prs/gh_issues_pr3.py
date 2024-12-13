#!/usr/bin/env python3
import argparse
import json
import subprocess
import sys
import csv
from datetime import datetime
from typing import List, Dict, Optional, Union
import io

class GitHubFetcher:
    def __init__(self, debug=False):
        self.debug = debug
        self.verify_gh_installation()

    def log(self, message):
        """Debug logging"""
        if self.debug:
            print(f"DEBUG: {message}", file=sys.stderr)

    def verify_gh_installation(self):
        """Verify that GitHub CLI is installed and authenticated."""
        try:
            result = subprocess.run(['gh', '--version'], capture_output=True, text=True, check=True)
            self.log(f"gh version: {result.stdout}")
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            sys.exit(f"Error: GitHub CLI (gh) is not installed or not in PATH.\nDetails: {str(e)}")

    def run_gh_command(self, cmd):
        """Run a gh command and handle errors"""
        self.log(f"Running command: gh {' '.join(cmd)}")
        try:
            result = subprocess.run(['gh'] + cmd, capture_output=True, text=True, check=True)
            self.log(f"Command output length: {len(result.stdout)} bytes")
            return result.stdout
        except subprocess.CalledProcessError as e:
            print(f"Error executing command: gh {' '.join(cmd)}", file=sys.stderr)
            print(f"Error output: {e.stderr}", file=sys.stderr)
            raise

    def fetch_pr_details(self, repo: str, pr_number: int) -> Dict:
        """Fetch detailed information for a specific PR."""
        query = f'repos/{repo}/pulls/{pr_number}'
        params = ['api', query]
        
        self.log(f"Fetching detailed PR info for #{pr_number}")
        try:
            api_output = self.run_gh_command(params)
            return json.loads(api_output)
        except Exception as e:
            self.log(f"Warning: Could not fetch details for PR #{pr_number}: {str(e)}")
            return None

    def fetch_pr_files(self, repo: str, pr_number: int) -> List[Dict]:
        """Fetch list of files changed in a PR."""
        query = f'repos/{repo}/pulls/{pr_number}/files'
        params = ['api', query]
        
        self.log(f"Fetching files changed in PR #{pr_number}")
        try:
            api_output = self.run_gh_command(params)
            return json.loads(api_output)
        except Exception as e:
            self.log(f"Warning: Could not fetch files for PR #{pr_number}: {str(e)}")
            return []

    def fetch_items(self, repo: str, state: str = 'open', message_num: Optional[int] = None, 
                   verbose: bool = False, item_type: str = 'issue', include_files: bool = False) -> List[Dict]:
        """Fetch issues or pull requests from GitHub repository."""
        try:
            items = []
            page = 1
            per_page = 100  # GitHub's maximum items per page
            
            while True:
                if item_type == 'pr':
                    query = f'repos/{repo}/pulls'
                    params = ['api', query,
                             '--method', 'GET',
                             '--field', f'state={state}',
                             '--field', f'per_page={per_page}',
                             '--field', f'page={page}']
                else:
                    query = f'repos/{repo}/issues'
                    params = ['api', query, '--jq', '.[] | select(.pull_request == null)',
                             '--field', f'state={state}',
                             '--field', f'page={page}',
                             '--field', f'per_page={per_page}']
    
                self.log(f"Fetching {item_type}s page {page} with state {state} from {repo}")
                
                try:
                    api_output = self.run_gh_command(params)
                    
                    if api_output.strip():
                        try:
                            if item_type == 'pr':
                                page_items = json.loads(api_output)
                                if not isinstance(page_items, list):
                                    page_items = [page_items]
                                    
                                # For PRs, fetch detailed information for each PR
                                detailed_items = []
                                for pr in page_items:
                                    pr_details = self.fetch_pr_details(repo, pr['number'])
                                    if pr_details:
                                        detailed_items.append(pr_details)
                                    else:
                                        detailed_items.append(pr)  # Fall back to basic info if details fetch fails
                                page_items = detailed_items
                            else:
                                page_items = []
                                for line in api_output.splitlines():
                                    if line.strip():
                                        item = json.loads(line.strip())
                                        if isinstance(item, dict):
                                            page_items.append(item)
                            
                            if not page_items:
                                break
                                
                            items.extend(page_items)
                            self.log(f"Added {len(page_items)} items from page {page}")
                            
                            if len(page_items) < per_page:
                                break
                        except json.JSONDecodeError as e:
                            self.log(f"Warning: JSON parsing error on page {page}: {str(e)}")
                            self.log(f"Raw output: {api_output[:1000]}...")
                            raise
                    else:
                        break
                    
                    page += 1
                    
                except subprocess.CalledProcessError as e:
                    if 'No more pages to fetch' in str(e.stderr):
                        break
                    raise
    
            self.log(f"Fetched total of {len(items)} items")
    
            # Clean items
            cleaned_items = []
            for item in items:
                cleaned_item = self.clean_item(item, repo, message_num, verbose, item_type, include_files)
                if cleaned_item:
                    cleaned_items.append(cleaned_item)
    
            self.log(f"Processed {len(cleaned_items)} items after filtering")
            return cleaned_items
    
        except Exception as e:
            print(f"Error fetching items: {str(e)}", file=sys.stderr)
            raise

    def clean_item(self, item: Dict, repo: str, message_num: Optional[int] = None, 
                  verbose: bool = False, item_type: str = 'issue', include_files: bool = False) -> Optional[Dict]:
        """Clean and format an issue or PR data."""
        try:
            cleaned = {
                'number': item['number'],
                'title': item['title'],
                'state': item['state'],
                'created_at': datetime.fromisoformat(item['created_at'].replace('Z', '+00:00')).strftime('%Y-%m-%d %H:%M:%S'),
                'updated_at': datetime.fromisoformat(item['updated_at'].replace('Z', '+00:00')).strftime('%Y-%m-%d %H:%M:%S'),
                'author': item['user']['login'],
                'labels': ','.join(label['name'] for label in item.get('labels', [])),
                'assignees': ','.join(assignee['login'] for assignee in item.get('assignees', [])),
                'url': item['html_url']
            }

            # Get comments count from the right field depending on type
            if item_type == 'pr':
                cleaned['comments'] = item.get('review_comments', 0) + item.get('comments', 0)
            else:
                cleaned['comments'] = item.get('comments', 0)

            if item.get('closed_at'):
                cleaned['closed_at'] = datetime.fromisoformat(item['closed_at'].replace('Z', '+00:00')).strftime('%Y-%m-%d %H:%M:%S')

            # Add PR-specific fields if it's a PR
            if item_type == 'pr':
                try:
                    cleaned.update({
                        'branch': item['head']['ref'],
                        'base_branch': item['base']['ref'],
                        'draft': item.get('draft', False),
                        'merged': item.get('merged', False),
                        'mergeable_state': item.get('mergeable_state', 'unknown'),
                        'commits': item.get('commits', 0),
                        'changed_files': item.get('changed_files', 0),
                        'additions': item.get('additions', 0),
                        'deletions': item.get('deletions', 0),
                        'review_comments': item.get('review_comments', 0),
                        'comments': item.get('comments', 0),
                        'maintainer_can_modify': item.get('maintainer_can_modify', False),
                        'rebaseable': item.get('rebaseable', False)
                    })

                    if include_files:
                        files = self.fetch_pr_files(repo, item['number'])
                        cleaned['files'] = [{
                            'filename': f['filename'],
                            'status': f['status'],  # added, modified, removed
                            'additions': f['additions'],
                            'deletions': f['deletions'],
                            'changes': f['changes']
                        } for f in files]

                    if item.get('merged_at'):
                        cleaned['merged_at'] = datetime.fromisoformat(item['merged_at'].replace('Z', '+00:00')).strftime('%Y-%m-%d %H:%M:%S')
                except KeyError as e:
                    self.log(f"Warning: Missing PR field {e} in item {item['number']}")

            return cleaned

        except Exception as e:
            print(f"Error cleaning item {item.get('number', 'unknown')}: {str(e)}", file=sys.stderr)
            self.log(f"Raw item data: {json.dumps(item, indent=2)}")
            return None

    def output_pretty(self, items: List[Dict], item_type: str = 'issue'):
        """Output items in a human-readable format."""
        if not items:
            print("No items found.")
            return

        for item in items:
            print(f"\n{'PR' if item_type == 'pr' else 'Issue'} #{item['number']}: {item['title']}")
            print("-" * 80)
            print(f"State: {item['state']}")
            print(f"Created: {item['created_at']} by {item['author']}")
            print(f"Updated: {item['updated_at']}")
            
            if 'closed_at' in item:
                print(f"Closed: {item['closed_at']}")
            if 'merged_at' in item:
                print(f"Merged: {item['merged_at']}")
            
            if item['assignees']:
                print(f"Assignees: {item['assignees']}")
            if item['labels']:
                print(f"Labels: {item['labels']}")
            
            if item_type == 'pr':
                print(f"Comments: {item['comments']} (Reviews: {item['review_comments']})")
            else:
                print(f"Comments: {item['comments']}")
                
            print(f"URL: {item['url']}")
            
            if item_type == 'pr':
                print(f"Branch: {item['branch']} → {item['base_branch']}")
                print(f"Status: {'Draft' if item['draft'] else 'Ready'}")
                print(f"Mergeable: {item['mergeable_state']}")
                print(f"Changes: +{item['additions']} -{item['deletions']} in {item['changed_files']} files")
                print(f"Commits: {item['commits']}")
                print(f"Maintainer can modify: {'Yes' if item['maintainer_can_modify'] else 'No'}")

    def output_json(self, items: List[Dict]):
        """Output items in JSON format."""
        if not items:
            print("[]")
            return
        print(json.dumps(items, indent=2))

    def output_csv(self, items: List[Dict]):
        """Output items in CSV format."""
        if not items:
            print("No items found.")
            return
        
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=items[0].keys())
        writer.writeheader()
        writer.writerows(items)
        print(output.getvalue())
        output.close()

def main():
    parser = argparse.ArgumentParser(description='Fetch GitHub issues or pull requests from a repository')
    parser.add_argument('--files', action='store_true',
                       help='Include detailed file changes for PRs')
    parser.add_argument('repo', help='Repository in format owner/repo')
    parser.add_argument('-t', '--type', choices=['issue', 'pr'], 
                        default='issue', help='Type of items to fetch (default: issue)')
    parser.add_argument('-f', '--format', choices=['json', 'csv', 'pretty'], 
                        default='pretty', help='Output format (default: pretty)')
    parser.add_argument('-s', '--state', choices=['open', 'closed', 'all'],
                        default='open', help='Item state to fetch (default: open)')
    parser.add_argument('--debug', action='store_true',
                        help='Enable debug output')
    
    args = parser.parse_args()

    try:
        fetcher = GitHubFetcher(debug=args.debug)
        items = fetcher.fetch_items(args.repo, args.state, item_type=args.type, include_files=args.files)
        # Output based on selected format
        if args.format == 'json':
            fetcher.output_json(items)
        elif args.format == 'csv':
            fetcher.output_csv(items)
        else:
            fetcher.output_pretty(items, args.type)

    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        if args.debug:
            import traceback
            traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
