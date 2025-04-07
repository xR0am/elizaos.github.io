import json
import argparse
from typing import Dict, Any, List

def has_engagement(issue: Dict[str, Any]) -> bool:
    """Check if an issue has engagement (comments or reactions)"""
    has_comments = len(issue.get('comments', [])) > 0
    has_reactions = any(
        comment.get('reactions', []) 
        for comment in issue.get('comments', [])
    )
    return has_comments or has_reactions

def calculate_pr_points(pr: Dict[str, Any], stats: Dict[str, Any]) -> float:
    """Calculate points for a single PR"""
    points = 0
    
    if pr.get('merged'):
        # Base points for merged PR
        points += 7
        
        # Points for reviews
        reviews = pr.get('reviews', [])
        review_count = len(reviews)
        points += review_count * 3  # Points for having reviews
        
        # Extra points for approved reviews
        approved_reviews = len([r for r in reviews if r.get('state') == 'APPROVED'])
        points += approved_reviews * 2
    
    # Points for description/effort (based on body length)
    if pr.get('body'):
        points += min(len(pr['body']) / 500, 3)  # Cap at 3 points for long descriptions
    
    # Points for review comments
    if pr.get('comments', []):
        points += len(pr['comments']) * 0.5

    return points

def calculate_issue_points(issue: Dict[str, Any]) -> float:
    """Calculate points for a single issue"""
    points = 0
    
    if has_engagement(issue):
        # Base points for engaged issues
        points += 5
        
        # Points for comments on engaged issues
        comment_count = len(issue.get('comments', []))
        points += comment_count * 0.5
    
    return points

def calculate_commit_points(commit: Dict[str, Any]) -> float:
    """Calculate points for a single commit"""
    # Base point for commit
    return 1


def calculate_score(contributor: Dict[str, Any]) -> int:
    """Calculate score based on activity stats"""
    score = 0
    
    # Calculate PR points (including reviews)
    for pr in contributor['activity']['code']['pull_requests']:
        score += calculate_pr_points(pr, {})
    
    # Calculate issue points
    for issue in contributor['activity']['issues']['opened']:
        score += calculate_issue_points(issue)
    
    # Calculate commit points
    for commit in contributor['activity']['code']['commits']:
        score += calculate_commit_points(commit)
    
    # Points for being reviewer on others' PRs
    for pr in contributor['activity']['code']['pull_requests']:
        reviews_given = len([r for r in pr.get('reviews', []) 
                           if r.get('author') == contributor['contributor']])
        score += reviews_given * 5  # Significant points for reviewing
    
    # Base points for volume of activity
    score += contributor['activity']['code']['total_commits'] * 1
    score += contributor['activity']['code']['total_prs'] * 2
    score += contributor['activity']['issues']['total_opened'] * 1
    score += contributor['activity']['engagement']['total_comments'] * 0.5
    
    return int(score)

def add_scores(contributors: List[Dict]) -> List[Dict]:
    """Add scores to contributor data"""
    for contributor in contributors:
        contributor['score'] = calculate_score(contributor)
    
    # Sort by score
    contributors.sort(key=lambda x: x['score'], reverse=True)
    return contributors


def main():
    parser = argparse.ArgumentParser(description="Calculate contributor scores")
    parser.add_argument("input_file", help="Input JSON file")
    parser.add_argument("output_file", help="Output JSON file")
    args = parser.parse_args()

    print(f"\nReading from {args.input_file}")
    try:
        with open(args.input_file) as f:
            contributors = json.load(f)
            print(f"Successfully loaded {len(contributors)} contributors")
    except Exception as e:
        print(f"Error loading input file: {e}")
        return
    
    print("\nCalculating scores...")
    try:
        scored_contributors = add_scores(contributors)
        print(f"Scores calculated for {len(scored_contributors)} contributors")
    except Exception as e:
        print(f"Error calculating scores: {e}")
        print("Traceback:", traceback.format_exc())
        return
    
    print("\nWriting output...")
    try:
        with open(args.output_file, 'w') as f:
            json.dump(scored_contributors, f, indent=2)
            print(f"Successfully wrote to {args.output_file}")
    except Exception as e:
        print(f"Error writing output file: {e}")
        return
    
    # Print scoring summary for top contributors
    print("\nTop contributors by score:")
    for contrib in scored_contributors[:5]:
        print(f"\n{contrib['contributor']}:")
        print(f"  Total Score: {contrib['score']}")
        print(f"  PRs: {contrib['activity']['code']['total_prs']} ({len([pr for pr in contrib['activity']['code']['pull_requests'] if pr.get('merged')])} merged)")
        print(f"  Issues: {contrib['activity']['issues']['total_opened']}")
        print(f"  Commits: {contrib['activity']['code']['total_commits']}")
        print(f"  Comments: {contrib['activity']['engagement']['total_comments']}")

if __name__ == '__main__':
    main()
