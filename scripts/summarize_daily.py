import json
import os
import argparse
from datetime import datetime
from collections import Counter, defaultdict
from typing import List, Dict
from langchain_core.prompts import PromptTemplate
from langchain_ollama import ChatOllama

def analyze_activity_metrics(data: List[Dict]) -> Dict:
    """Generate detailed activity metrics with file-level analysis"""
    metrics = defaultdict(int)
    file_changes = defaultdict(lambda: {'adds': 0, 'dels': 0, 'changes': 0})
    pr_types = defaultdict(int)
    issue_labels = defaultdict(int)
    
    for contributor in data:
        # Process PRs
        for pr in contributor['activity']['code']['pull_requests']:
            if pr.get('merged'):
                metrics['merged_prs'] += 1
                # Categorize PR types
                title_lower = pr['title'].lower()
                if 'feat:' in title_lower:
                    pr_types['features'] += 1
                elif 'fix:' in title_lower:
                    pr_types['fixes'] += 1
                elif 'chore:' in title_lower:
                    pr_types['chores'] += 1
                elif 'refactor:' in title_lower:
                    pr_types['refactors'] += 1
                
                # Process file changes
                for file in pr.get('files', []):
                    path = file['path']
                    category = path.split('/')[0] if '/' in path else 'root'
                    file_changes[category]['adds'] += file.get('additions', 0)
                    file_changes[category]['dels'] += file.get('deletions', 0)
                    file_changes[category]['changes'] += 1
        
        # Process Issues
        for issue in contributor['activity']['issues']['opened']:
            metrics['new_issues'] += 1
            for label in issue.get('labels', []):
                issue_labels[label.get('name', 'unlabeled')] += 1
                
        # Process Commits
        metrics['total_commits'] += len(contributor['activity']['code']['commits'])
    
    return {
        'basic_metrics': {
            'contributors': len(data),
            'commits': metrics['total_commits'],
            'merged_prs': metrics['merged_prs'],
            'new_issues': metrics['new_issues']
        },
        'pr_types': dict(pr_types),
        'file_changes': dict(file_changes),
        'issue_labels': dict(issue_labels)
    }

def generate_overview(metrics: Dict, changes: List[Dict]) -> str:
    """Generate a concise 2-3 sentence overview of daily activities"""
    # Get key areas of focus
    areas = sorted(metrics['file_changes'].items(), 
                  key=lambda x: x[1]['changes'], 
                  reverse=True)[:2]
    main_areas = [area[0] for area in areas]
    
    # Count change types
    features = sum(1 for c in changes if c.get('merged') and 
                  c['title'].lower().startswith('feat:'))
    fixes = sum(1 for c in changes if c.get('merged') and 
                c['title'].lower().startswith('fix:'))
    
    # Key developments
    key_changes = []
    if features:
        key_changes.append(f"{features} new features")
    if fixes:
        key_changes.append(f"{fixes} fixes")
    
    overview = (
        f"Today's development focused on {' and '.join(main_areas)}, "
        f"with {metrics['basic_metrics']['contributors']} contributors "
        f"merging {metrics['basic_metrics']['merged_prs']} PRs. "
        f"Key developments include {', '.join(key_changes)}."
    )
    
    return overview

def generate_overview(metrics: Dict, changes: List[Dict], data: List[Dict]) -> str:
    """Generate a detailed overview of daily activities and key developments"""
    # Get key features and changes safely
    features = []
    for c in changes:
        if c.get('merged') and c['title'].lower().startswith('feat:'):
            parts = c['title'].split(':', 1)  # Split on first colon only
            if len(parts) > 1:
                features.append(parts[1].strip())
    
    # Get key areas and what's being built
    key_developments = []
    if 'packages' in metrics['file_changes']:
        pkg_changes = None
        for c in changes:
            if not c.get('merged'):
                continue
            title_lower = c['title'].lower()
            if 'plugin' in title_lower or 'client' in title_lower:
                parts = c['title'].split(':', 1)
                if len(parts) > 1:
                    pkg_changes = parts[1].strip()
                    break
        
        if pkg_changes:
            key_developments.append(f"package improvements ({pkg_changes})")
    
    if features:
        key_developments.append(f"new features ({features[0]})")
        
    if metrics['pr_types'].get('fixes', 0) > 0:
        key_developments.append(f"{metrics['pr_types']['fixes']} bug fixes")
    
    # Find major work summary
    major_work = 'various improvements'
    for c in data:
        if c.get('score', 0) > 50 and c.get('summary'):
            summary_parts = c['summary'].split('.')
            if summary_parts:
                major_work = summary_parts[0].lower()
                break
    
    # Build overview text with error handling
    overview_parts = []
    
    if key_developments:
        overview_parts.append(f"Development focused on {', '.join(key_developments)}")
    
    contributor_info = f"with {metrics['basic_metrics']['contributors']} contributors merging {metrics['basic_metrics']['merged_prs']} PRs"
    overview_parts.append(contributor_info)
    
    if major_work:
        overview_parts.append(f"Major work included {major_work}")
    
    return ". ".join(overview_parts) + "."

def get_contributor_details(data: List[Dict]) -> List[Dict]:
    """Get detailed contributor information including summaries"""
    top_contributors = []
    for c in sorted(data, key=lambda x: x['score'], reverse=True)[:3]:
        # Get their main merged PR
        main_pr = next((pr['title'] for pr in c['activity']['code']['pull_requests'] 
                       if pr.get('merged')), None)
        
        # Get their activity summary
        summary = c['summary'].split('.')[0]
        
        # Get their main areas of work
        areas = set()
        for pr in c['activity']['code']['pull_requests']:
            if pr.get('merged') and pr.get('files'):
                areas.update(f['path'].split('/')[0] for f in pr['files'])
        
        top_contributors.append({
            "name": c['contributor'],
            "main_contribution": main_pr,
            "summary": summary,
            "areas": list(areas)[:3]  # Top 3 areas they worked in
        })
    
    return top_contributors

def generate_json_summary(metrics: Dict, data: List[Dict]) -> Dict:
    """Generate structured JSON summary of activity"""
    # Get merged PRs
    changes = [pr for c in data for pr in c['activity']['code']['pull_requests'] if pr.get('merged')]
    
    # Safely extract version info
    version = ""
    for c in changes:
        if 'version' in c['title'].lower() or 'bump' in c['title'].lower():
            parts = c['title'].split(':', 1)  # Split on first colon only
            if len(parts) > 1:  # Only proceed if there's a part after the colon
                version = parts[1].strip()
                break
    
    # Collect all issues
    all_issues = []
    for c in data:
        all_issues.extend(c['activity']['issues']['opened'])
    
    # Get issues by type
    bugs = [issue for issue in all_issues 
            if any(label.get('name') == 'bug' for label in issue.get('labels', []))]
    enhancements = [issue for issue in all_issues 
                   if any(label.get('name') == 'enhancement' for label in issue.get('labels', []))]
    
    # Generate issue summary
    issue_summary = ""
    if bugs or enhancements:
        summaries = []
        if bugs:
            bug_titles = [f"'{issue['title']}'" for issue in bugs[:2]]
            summaries.append(f"working on {len(bugs)} bugs including {', '.join(bug_titles)}")
        if enhancements:
            enhancement_titles = [f"'{issue['title']}'" for issue in enhancements[:2]]
            summaries.append(f"implementing {len(enhancements)} feature requests including {', '.join(enhancement_titles)}")
        issue_summary = " and ".join(summaries)
    
    # Safely process PR titles for changes
    features = []
    fixes = []
    chores = []
    for c in changes:
        if ':' in c['title']:  # Only process titles with colons
            parts = c['title'].split(':', 1)
            if len(parts) > 1:
                title_type = parts[0].lower()
                title_content = parts[1].strip()
                if title_type.startswith('feat'):
                    features.append(title_content)
                elif title_type.startswith('fix'):
                    fixes.append(title_content)
                elif title_type.startswith('chore'):
                    chores.append(title_content)
    
    return {
        "title": f"ai16z Eliza ({datetime.utcnow().strftime('%Y-%m-%d')})",
        "version": version,
        "overview": generate_overview(metrics, changes, data),
        "metrics": {
            "contributors": metrics['basic_metrics']['contributors'],
            "merged_prs": metrics['basic_metrics']['merged_prs'],
            "new_issues": metrics['basic_metrics']['new_issues'],
            "lines_changed": sum(area['adds'] + area['dels'] 
                               for area in metrics['file_changes'].values())
        },
        "changes": {
            "features": features[:3],
            "fixes": fixes[:3],
            "chores": chores[:3]
        },
        "areas": [
            {
                "name": area,
                "files": stats['changes'],
                "additions": stats['adds'],
                "deletions": stats['dels']
            }
            for area, stats in sorted(
                metrics['file_changes'].items(),
                key=lambda x: x[1]['changes'],
                reverse=True
            )[:3]
        ],
        "issues_summary": issue_summary,
        "questions": [],
        "top_contributors": [
            {
                "name": c['contributor'],
                "summary": c['summary'].split('.')[0] if c.get('summary') else "",
                "areas": list(set(
                    f['path'].split('/')[0]
                    for pr in c['activity']['code']['pull_requests']
                    if pr.get('merged') and pr.get('files')
                    for f in pr['files']
                ))[:3]
            }
            for c in sorted(data, key=lambda x: x['score'], reverse=True)[:3]
        ]
    }
    
def generate_summary(data: List[Dict], model: str = "ollama", api_key: str = None) -> str:
    """Generate a unified markdown summary with key sections"""
    metrics = analyze_activity_metrics(data)
    
    # Get user-facing summary first
    user_summary = generate_user_summary(metrics, data)
    
    # Get top contributors with their main contribution
    top_contributors = sorted(data, key=lambda x: x['score'], reverse=True)[:3]
    contributor_summary = []
    for c in top_contributors:
        main_pr = next((pr['title'] for pr in c['activity']['code']['pull_requests'] 
                       if pr.get('merged')), None)
        if main_pr:
            contributor_summary.append(f"- **{c['contributor']}**: {main_pr}")

    # Remove the date from user_summary since it's now in the title
    user_summary_lines = user_summary.split('\n')[1:]  # Skip the first line that had the old title
    user_summary = '\n'.join(user_summary_lines)

    summary = f"""# ai16z Eliza ({datetime.utcnow().strftime("%Y-%m-%d")})
{user_summary}

## Top Contributors
{chr(10).join(contributor_summary)}"""

    return summary

def generate_user_summary(metrics: Dict, data: List[Dict]) -> str:
    """Generate thorough but concise user-facing summary with bullet points"""
    changes = [pr for c in data for pr in c['activity']['code']['pull_requests'] if pr.get('merged')]
    
    # Safely extract version info
    version = ""
    for c in changes:
        if 'version' in c['title'].lower() or 'bump' in c['title'].lower():
            parts = c['title'].split(':', 1)
            if len(parts) > 1:
                version = parts[1].strip()
                break
    
    date = datetime.utcnow().strftime("%Y-%m-%d")
    overview = generate_overview(metrics, changes, data)
    
    # Safely parse PR titles
    features = []
    fixes = []
    chores = []
    
    for c in changes:
        if not c.get('merged'):
            continue
        parts = c['title'].split(':', 1)
        if len(parts) > 1:
            title_type = parts[0].lower()
            title_content = parts[1].strip()
            if title_type.startswith('feat'):
                features.append(title_content)
            elif title_type.startswith('fix'):
                fixes.append(title_content)
            elif title_type.startswith('chore'):
                chores.append(title_content)
    
    # Count PR types safely
    pr_types = Counter()
    for pr in changes:
        if ':' in pr['title']:
            pr_type = pr['title'].split(':', 1)[0].lower()
            pr_types[pr_type] += 1
    
    # Get total commits
    total_commits = sum(len(c['activity']['code']['commits']) for c in data)
    
    # Format file changes
    file_changes = []
    for area, stats in sorted(
        metrics['file_changes'].items(),
        key=lambda x: x[1]['adds'] + x[1]['dels'],
        reverse=True
    )[:5]:  # Show top 5 areas
        file_changes.append(
            f"- **{area}**: {stats['changes']} files (+{stats['adds']}/-{stats['dels']} lines)"
        )
    
    # Get contributors with summaries
    contributors = get_contributor_details(data)
    contributor_details = []
    for c in contributors:
        contributor_details.append(
            f"- **{c['name']}**: {c['summary']}"
        )
    
    # Count issue labels
    label_counts = Counter()
    for c in data:
        for issue in c['activity']['issues']['opened']:
            for label in issue.get('labels', []):
                label_counts[label.get('name', 'unlabeled')] += 1
    
    # Format notable changes
    notable_changes = [f"- {pr['title']}" for pr in changes[:3]]
    
    # Format labels and create issue summary
    label_text = ', '.join(f'`{label}` ({count})' for label, count in label_counts.most_common(3))
    

    # Collect all issues
    all_issues = []
    for c in data:
        all_issues.extend(c['activity']['issues']['opened'])
    
    # Generate rich issue summary
    issue_summary = ""
    if metrics['basic_metrics']['new_issues'] > 0:
        bugs = [issue for issue in all_issues if any(label['name'] == 'bug' for label in issue.get('labels', []))]
        enhancements = [issue for issue in all_issues if any(label['name'] == 'enhancement' for label in issue.get('labels', []))]
        
        summaries = []
        if bugs:
            bug_details = ", ".join(f"'{issue['title']}'" for issue in bugs[:2])
            summaries.append(f"{len(bugs)} bugs reported (including {bug_details})")
        if enhancements:
            enhancement_details = ", ".join(f"'{issue['title']}'" for issue in enhancements[:2])
            summaries.append(f"{len(enhancements)} feature requests (including {enhancement_details})")
        
        issue_summary = " ".join(summaries) + "."
    
    summary = f"""# ai16z/eliza Daily {date}
    
## 📊 Overview
{overview}

## 📈 Key Metrics
| Metric | Count |
|---------|--------|
| 👥 Contributors | {metrics['basic_metrics']['contributors']} |
| 📝 Commits | {total_commits} |
| 🔄 Merged PRs | {metrics['basic_metrics']['merged_prs']} |
| ⚠️ New Issues | {metrics['basic_metrics']['new_issues']} |

## 🔄 Pull Request Summary
- 🧹 **Chores**: {pr_types.get('chore', 0)}
- 🐛 **Fixes**: {pr_types.get('fix', 0)}
- ✨ **Features**: {pr_types.get('feat', 0)}

## 📁 File Changes
{chr(10).join(file_changes)}

## 🔥 Notable Changes
{chr(10).join(notable_changes)}

## 👥 Top Contributors
{chr(10).join(contributor_details)}

## ⚠️ Issues
- **New Issues**: {metrics['basic_metrics']['new_issues']}
- **Labels**: {label_text}
- **Summary**: {issue_summary}"""

    return summary


def main():
    parser = argparse.ArgumentParser(description="Generate repository summary")
    parser.add_argument("input_file", help="Input JSON file with contributor data")
    parser.add_argument("output_file", help="Output file for summary")
    parser.add_argument("-t", "--type", choices=["md", "json"], default="md",
                       help="Output format type (markdown or json)")
    parser.add_argument("--model", choices=["openai", "ollama"], default="ollama",
                       help="Model to use for summary generation")
    args = parser.parse_args()
    
    with open(args.input_file) as f:
        data = json.load(f)
    
    metrics = analyze_activity_metrics(data)
    
    if args.type == "json":
        summary = json.dumps(generate_json_summary(metrics, data), indent=2)
    else:
        summary = generate_summary(data, args.model)
    
    # Add appropriate extension
    base_output = os.path.splitext(args.output_file)[0]
    output_file = f"{base_output}.{args.type}"
    
    with open(output_file, 'w') as f:
        f.write(summary)
    
    print(f"\nSummary saved to {output_file}")
    if args.type == "md":
        print("\nUser-facing summary:")
        print("-" * 50)
        print(generate_user_summary(metrics, data))

if __name__ == "__main__":
    main()


