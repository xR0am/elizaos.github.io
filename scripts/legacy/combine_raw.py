import json
import argparse
from datetime import datetime
from typing import Dict, List, Any
from collections import defaultdict

def create_contributor_dict(username: str, avatar_url: str = None) -> Dict:
    """Create a default contributor dictionary with expanded metadata"""
    return {
        'contributor': username,
        'score': 0,
        'summary': '',
        'avatar_url': avatar_url,
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
    }

def combine_activity(prs_data: List[Dict], issues_data: List[Dict], commits_data: List[Dict] = None) -> List[Dict]:
    contributors = {}
    print(f"\nProcessing {len(prs_data)} PRs...")
    
    # Process PRs
    for pr in prs_data:
        author_data = pr.get('author')
        if not author_data:
            continue
            
        author = author_data.get('login')
        avatar_url = author_data.get('avatarUrl')
            
        if author not in contributors:
            contributors[author] = create_contributor_dict(author, avatar_url)
            print(f"Added new contributor: {author}")
            
        contrib = contributors[author]
        
        # Enhanced PR data with more metadata
        pr_data = {
            'number': pr['number'],
            'title': pr['title'],
            'state': pr['state'],
            'merged': pr.get('merged', False),
            'created_at': pr['createdAt'],
            'updated_at': pr['updatedAt'],
            'body': pr.get('body', ''),
            'files': [{
                'path': f['path'],
                'additions': f['additions'],
                'deletions': f['deletions']
            } for f in pr.get('files', [])],
            'reviews': [{
                'author': r.get('author'),
                'state': r.get('state'),
                'body': r.get('body')
            } for r in pr.get('reviews', [])],
            'comments': [{
                'author': c.get('author'),
                'body': c.get('body')
            } for c in pr.get('comments', [])]
        }
        contrib['activity']['code']['pull_requests'].append(pr_data)
        contrib['activity']['code']['total_prs'] += 1
        
        # Track reviews and comments
        contrib['activity']['engagement']['total_reviews'] += len(pr.get('reviews', []))
    
    print(f"\nProcessing {len(issues_data)} issues...")
    # Process issues
    for issue in issues_data:
        author_data = issue.get('author')
        if not author_data:
            continue
            
        author = author_data.get('login')
        avatar_url = author_data.get('avatarUrl')
            
        if author not in contributors:
            contributors[author] = create_contributor_dict(author, avatar_url)
            print(f"Added new contributor: {author}")
            
        contrib = contributors[author]
        
        # Enhanced issue data
        issue_data = {
            'number': issue['number'],
            'title': issue['title'],
            'state': issue['state'],
            'created_at': issue['createdAt'],
            'updated_at': issue['updatedAt'],
            'body': issue.get('body', ''),
            'labels': [{
                'name': l.get('name'),
                'color': l.get('color'),
                'description': l.get('description')
            } for l in issue.get('labels', [])],
            'comments': [{
                'author': c.get('author'),
                'body': c.get('body')
            } for c in issue.get('comments', [])]
        }
        contrib['activity']['issues']['opened'].append(issue_data)
        contrib['activity']['issues']['total_opened'] += 1
        
        # Track comments
        contrib['activity']['engagement']['total_comments'] += len(issue.get('comments', []))
    
    if commits_data:
        print(f"\nProcessing {len(commits_data)} commits...")
        for commit in commits_data:
            author_data = commit.get('author', {}).get('user', {})
            if not author_data:
                continue
                
            author = author_data.get('login')
            if not author:
                continue
                
            if author not in contributors:
                contributors[author] = create_contributor_dict(author)
                print(f"Added new contributor: {author}")
                
            contrib = contributors[author]
            
            # Enhanced commit data
            commit_data = {
                'sha': commit['sha'],
                'message': commit['message'],
                'created_at': commit['committedDate'],
                'additions': commit.get('additions', 0),
                'deletions': commit.get('deletions', 0),
                'changed_files': commit.get('changedFiles', 0)
            }
            contrib['activity']['code']['commits'].append(commit_data)
            contrib['activity']['code']['total_commits'] += 1
    
    # Sort by activity level
    result = list(contributors.values())
    result.sort(key=lambda x: (
        len(x['activity']['code']['commits']) + 
        len(x['activity']['code']['pull_requests'])
    ), reverse=True)
    
    return result

def get_timestamp_suffix() -> str:
    """Generate timestamp suffix for filenames"""
    now = datetime.now()
    return f"{now.year}_{now.month:02d}-{now.day:02d}"

def main():
    parser = argparse.ArgumentParser(description="Combine GitHub activity data")
    parser.add_argument("-p", "--prs", required=True, help="PRs JSON file")
    parser.add_argument("-i", "--issues", required=True, help="Issues JSON file")
    parser.add_argument("-c", "--commits", help="Commits JSON file")
    parser.add_argument("-o", "--output", required=True, help="Output JSON file")
    parser.add_argument("--data-dir", default="data", help="Directory for output files")
    args = parser.parse_args()

    print(f"\nLoading data from files...")
    
    try:
        with open(args.prs) as f:
            prs_data = json.load(f)
            print(f"Loaded {len(prs_data)} PRs")
    except Exception as e:
        print(f"Error loading PRs file: {e}")
        return

    try:
        with open(args.issues) as f:
            issues_data = json.load(f)
            print(f"Loaded {len(issues_data)} issues")
    except Exception as e:
        print(f"Error loading issues file: {e}")
        return
    
    commits_data = None
    if args.commits:
        try:
            with open(args.commits) as f:
                commits_data = json.load(f)
                print(f"Loaded {len(commits_data)} commits")
        except Exception as e:
            print(f"Error loading commits file: {e}")
            return
    
    contributors = combine_activity(prs_data, issues_data, commits_data)
    
    # Create data directory if it doesn't exist
    import os
    os.makedirs(args.data_dir, exist_ok=True)
    
    # Save combined data with timestamp
    timestamp = get_timestamp_suffix()
    default_output_file = os.path.join(args.data_dir, f"contributors_{timestamp}.json")
    
    # Ensure primary output is the file specified via --output
    output_file = args.output
    
    # Write to the specified output file
    print(f"\nWriting output to {output_file}")
    with open(output_file, 'w') as f:
        json.dump(contributors, f, indent=2)
    
    ## Optionally save a backup in the data directory
    #if output_file != default_output_file:
    #    print(f"Also writing a timestamped backup to {default_output_file}")
    #    with open(default_output_file, 'w') as f:
    #        json.dump(contributors, f, indent=2)
    
    print(f"\nProcessed {len(contributors)} contributors:")
    for contrib in contributors[:5]:  # Show top 5
        print(f"\n{contrib['contributor']}:")
        print(f"  PRs: {len(contrib['activity']['code']['pull_requests'])} total")
        print(f"  Issues: {len(contrib['activity']['issues']['opened'])} opened")
        print(f"  Commits: {len(contrib['activity']['code']['commits'])} total")
        print(f"  Reviews: {contrib['activity']['engagement']['total_reviews']}")
        print(f"  Comments: {contrib['activity']['engagement']['total_comments']}")
    
    print(f"\nOutput written to {output_file}")

if __name__ == '__main__':
    main()
