import requests
import json
import os
import argparse
import sys
from datetime import datetime
from collections import defaultdict
import time

def get_rate_limit_status(headers):
    """Get current GitHub API rate limit status."""
    response = requests.get('https://api.github.com/rate_limit', headers=headers)
    data = response.json()
    return {
        'remaining': data['resources']['core']['remaining'],
        'limit': data['resources']['core']['limit'],
        'reset_time': datetime.fromtimestamp(data['resources']['core']['reset'])
    }

def print_rate_limit_status(headers, label=""):
    """Print current rate limit status."""
    status = get_rate_limit_status(headers)
    print(f"\n=== Rate Limit Status {label} ===")
    print(f"Remaining calls: {status['remaining']}/{status['limit']}")
    print(f"Reset time: {status['reset_time'].strftime('%Y-%m-%d %H:%M:%S')}")
    return status['remaining']

def get_activity_summary(items, date_key="created_at"):
    """Summarize activity by year and month."""
    activity = defaultdict(lambda: defaultdict(int))
    for item in items:
        if date_key in item:
            date = datetime.strptime(item[date_key], "%Y-%m-%dT%H:%M:%SZ")
            activity[date.year][date.month] += 1
    return dict(activity)

def fetch_paginated(url, headers, is_search=False, max_pages=10):
    """Fetch paginated results from GitHub API."""
    print(f"\nFetching: {url}")
    results = []
    page = 1
    total_items = 0
    
    while page <= max_pages:
        paginated_url = f"{url}{'&' if '?' in url else '?'}page={page}&per_page=100"
        
        try:
            response = requests.get(paginated_url, headers=headers)
            response.raise_for_status()
            
            # Check rate limit if we got a 403 response
            if response.status_code == 403:
                remaining = print_rate_limit_status(headers)
                if remaining == 0:
                    wait_time = (get_rate_limit_status(headers)['reset_time'] - datetime.now()).total_seconds()
                    if wait_time > 0:
                        print(f"Rate limit exceeded. Waiting {wait_time:.0f} seconds...")
                        time.sleep(wait_time + 1)
                    continue
            
            items = response.json()
            if is_search:
                total_count = items.get('total_count', 0)
                items = items.get('items', [])
                print(f"Search results: found {total_count} total items")
            elif not isinstance(items, list):
                results.append(items)
                print("Received non-list response, ending pagination")
                break
            
            if not items:
                break
                
            results.extend(items)
            total_items += len(items)
            print(f"Retrieved {len(items)} items (total: {total_items})")
            
            if len(items) < 100:
                break
                
            page += 1
            
        except requests.exceptions.HTTPError as e:
            print(f"Error fetching {url}: {str(e)}")
            print(f"Response: {e.response.text if hasattr(e, 'response') else 'No response'}")
            break
            
    return results

def get_contributor_data(repo_owner, repo_name, output_dir, headers, force=False):
    """Fetch detailed contributor activity data."""
    start_time = time.time()
    print(f"\nStarting data collection for {repo_owner}/{repo_name}")
    os.makedirs(output_dir, exist_ok=True)
    
    print("\nFetching list of contributors...")
    contributors = fetch_paginated(
        f"https://api.github.com/repos/{repo_owner}/{repo_name}/contributors",
        headers
    )
    
    print(f"\nProcessing {len(contributors)} contributors...")
    
    for index, contributor in enumerate(contributors, 1):
        username = contributor["login"]
        output_file = os.path.join(output_dir, f"{username}.json")
        
        print(f"\nProcessing {username} ({index}/{len(contributors)})")
        
        if os.path.exists(output_file) and not force:
            print(f"Skipping {username} - existing data found")
            continue
            
        user_start_time = time.time()
        user_data = {
            "username": username,
            "avatar_url": contributor["avatar_url"],
            "total_contributions": contributor["contributions"],
            "activity": {
                "code": {},
                "issues": {},
                "engagement": {}
            }
        }

        # Fetch all data types
        commit_data = [{
            "sha": commit["sha"],
            "date": commit["commit"]["author"]["date"],
            "message": commit["commit"]["message"],
            "url": commit.get("html_url", ""),
        } for commit in fetch_paginated(
            f"https://api.github.com/repos/{repo_owner}/{repo_name}/commits?author={username}",
            headers
        )]
        print(f"Found {len(commit_data)} commits")

        prs = fetch_paginated(
            f"https://api.github.com/search/issues?q=repo:{repo_owner}/{repo_name}+author:{username}+type:pr",
            headers,
            is_search=True
        )
        pr_data = [{
            "number": pr["number"],
            "title": pr["title"],
            "state": pr["state"],
            "created_at": pr["created_at"],
            "url": pr.get("html_url", ""),
            "labels": [label["name"] for label in pr.get("labels", [])],
            "comments": pr.get("comments", 0)
        } for pr in prs]
        print(f"Found {len(pr_data)} pull requests")

        issues = fetch_paginated(
            f"https://api.github.com/search/issues?q=repo:{repo_owner}/{repo_name}+author:{username}+type:issue",
            headers,
            is_search=True
        )
        issue_data = [{
            "number": issue["number"],
            "title": issue["title"],
            "state": issue["state"],
            "created_at": issue["created_at"],
            "url": issue.get("html_url", ""),
            "labels": [label["name"] for label in issue.get("labels", [])],
            "comments": issue.get("comments", 0)
        } for issue in issues if "pull_request" not in issue]
        print(f"Found {len(issue_data)} issues")

        comments = fetch_paginated(
            f"https://api.github.com/repos/{repo_owner}/{repo_name}/issues/comments",
            headers
        )
        comment_data = [{
            "id": comment["id"],
            "body": comment["body"],
            "created_at": comment["created_at"],
            "url": comment.get("html_url", ""),
            "type": "issue" if "/issues/" in comment.get("html_url", "") else "pr",
            "issue_number": comment["issue_url"].split("/")[-1] if comment.get("issue_url") else None
        } for comment in comments if comment["user"]["login"] == username]
        print(f"Found {len(comment_data)} comments")

        # Organize activity data
        user_data["activity"]["code"] = {
            "commits": commit_data,
            "pull_requests": pr_data,
            "total_commits": len(commit_data),
            "total_prs": len(pr_data),
            "commit_activity": get_activity_summary(commit_data, "date"),
            "pr_activity": get_activity_summary(pr_data)
        }
        
        user_data["activity"]["issues"] = {
            "opened": issue_data,
            "total_opened": len(issue_data),
            "issue_activity": get_activity_summary(issue_data)
        }
        
        user_data["activity"]["engagement"] = {
            "issue_comments": [c for c in comment_data if c["type"] == "issue"],
            "pr_comments": [c for c in comment_data if c["type"] == "pr"],
            "total_comments": len(comment_data),
            "comment_activity": get_activity_summary(comment_data)
        }

        with open(output_file, "w") as f:
            json.dump(user_data, f, indent=2)
            
        elapsed = time.time() - user_start_time
        print(f"Completed {username} in {elapsed:.2f} seconds")

    total_elapsed = time.time() - start_time
    print(f"\nCompleted all processing in {total_elapsed:.2f} seconds")

if __name__ == "__main__":
    print("\nGitHub Contributor Data Fetch Script")
    print("=" * 50)
    
    GITHUB_TOKEN = os.getenv("GH_ACCESS_TOKEN")
    if not GITHUB_TOKEN:
        print("Error: Please set the GH_ACCESS_TOKEN environment variable.")
        sys.exit(1)
    
    parser = argparse.ArgumentParser(description="Fetch GitHub contributor activity data.")
    parser.add_argument("repo_owner", help="Repository owner")
    parser.add_argument("repo_name", help="Repository name")
    parser.add_argument("-o", "--output", default="./data/", 
                      help="Output directory")
    parser.add_argument("-f", "--force", action="store_true",
                      help="Force refresh existing data")
    
    args = parser.parse_args()
    headers = {"Authorization": f"Bearer {GITHUB_TOKEN}"}
    
    # Show initial rate limit status
    print_rate_limit_status(headers, "INITIAL")
    
    get_contributor_data(
        args.repo_owner,
        args.repo_name,
        args.output,
        headers,
        args.force
    )
    
    # Show final rate limit status
    print_rate_limit_status(headers, "FINAL")
