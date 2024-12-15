import os
import json
from datetime import datetime
from typing import Dict, List
from gql import gql, Client
from gql.transport.requests import RequestsHTTPTransport

class CombinedGitHubFetcher:
    def __init__(self, token: str, repo: str):
        self.client = Client(
            transport=RequestsHTTPTransport(
                url='https://api.github.com/graphql',
                headers={'Authorization': f'Bearer {token}'},
                verify=True,
            )
        )
        self.repo_owner, self.repo_name = repo.split('/')
        
    def fetch_combined_data(self, start_date: str, end_date: str) -> Dict:
        """Fetch both PR and contributor data in a single GraphQL query"""
        query = gql("""
            query($owner: String!, $name: String!, $since: DateTime!, $until: DateTime!) {
                repository(owner: $owner, name: $name) {
                    pullRequests(first: 100, orderBy: {field: CREATED_AT, direction: DESC}) {
                        nodes {
                            number
                            title
                            state
                            createdAt
                            mergedAt
                            author { login }
                            additions
                            deletions
                            changedFiles
                            commits(first: 1) { totalCount }
                            files(first: 100) {
                                nodes {
                                    path
                                    additions
                                    deletions
                                    changeType
                                }
                            }
                        }
                    }
                    defaultBranchRef {
                        target {
                            ... on Commit {
                                history(since: $since, until: $until) {
                                    nodes {
                                        author { email user { login } }
                                        messageHeadline
                                        committedDate
                                        additions
                                        deletions
                                    }
                                }
                            }
                        }
                    }
                }
            }
        """)
        
        variables = {
            'owner': self.repo_owner,
            'name': self.repo_name,
            'since': start_date,
            'until': end_date
        }
        
        result = self.client.execute(query, variable_values=variables)
        return self._process_response(result)
    
    def _process_response(self, data: Dict) -> Dict:
        """Process and structure the GraphQL response"""
        processed = {
            'pull_requests': [],
            'commits': [],
            'contributors': defaultdict(lambda: {
                'prs': [],
                'commits': [],
                'files_changed': defaultdict(int),
                'total_additions': 0,
                'total_deletions': 0
            })
        }
        
        # Process PRs
        for pr in data['repository']['pullRequests']['nodes']:
            processed['pull_requests'].append(self._process_pr(pr))
            
        # Process commits
        for commit in data['repository']['defaultBranchRef']['target']['history']['nodes']:
            processed['commits'].append(self._process_commit(commit))
            
        return processed
    
    def save_data(self, data: Dict, output_dir: str):
        """Save processed data to appropriate files"""
        os.makedirs(output_dir, exist_ok=True)
        
        # Save PRs
        with open(f"{output_dir}/prs_with_files.json", 'w') as f:
            json.dump(data['pull_requests'], f, indent=2)
            
        # Save contributor data
        with open(f"{output_dir}/contributors.json", 'w') as f:
            json.dump(data['contributors'], f, indent=2)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--repo', required=True)
    parser.add_argument('--start-date', required=True)
    parser.add_argument('--end-date', required=True)
    parser.add_argument('--output-dir', required=True)
    args = parser.parse_args()
    
    token = os.environ.get('GH_TOKEN')
    if not token:
        raise ValueError("GH_TOKEN environment variable is required")
    
    fetcher = CombinedGitHubFetcher(token, args.repo)
    data = fetcher.fetch_combined_data(args.start_date, args.end_date)
    fetcher.save_data(data, args.output_dir)

if __name__ == "__main__":
    main()
