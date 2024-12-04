import json
import os
import argparse
from langchain_community.chat_models import ChatOllama
from langchain_core.prompts import PromptTemplate

def generate_summary(data):
    """Generate a detailed summary blurb using Ollama"""
    model = ChatOllama(model='phi3:14b-medium-4k-instruct-q5_K_M', temperature=0.1)
    
    # Gather comprehensive activity data
    activity = []
    if 'commits' in data['activity'].get('code', {}):
        commits = data['activity']['code']['commits'][:15]  # Increased to last 15 commits
        activity.append("Recent commits:")
        activity.extend(f"- {c['message']} ({c['date'][:10]})" for c in commits)
    
    if 'pull_requests' in data['activity'].get('code', {}):
        prs = data['activity']['code']['pull_requests']
        activity.append("\nPull requests:")
        activity.extend(f"- {pr['title']} ({pr['state']}, {pr['created_at'][:10]})" for pr in prs)
    
    if 'issues' in data['activity'] and 'opened' in data['activity']['issues']:
        issues = data['activity']['issues']['opened']
        activity.append("\nIssues opened:")
        activity.extend(f"- {issue['title']} (Labels: {', '.join(issue['labels'])})" for issue in issues)

    prompt = PromptTemplate(
        template="""You are a technical writer summarizing GitHub contributions. Create a sccinct summary of this user's work based on their activity:

{activity}

Write a paragraph that covers:
1. Their main focus areas and types of contributions
2. Specific features or improvements they worked on

Be specific about what they actually did, not just generic activity. Maintain a professional tone and focus on technical details.
Write in present tense and be direct without any introductory phrases like "This user..." or "The contributor...".""",
        input_variables=["activity"]
    )
    
    response = model.invoke(prompt.format(activity="\n".join(activity)))
    return response.content.strip()

def process_files(input_dir, output_dir):
    """Process all JSON files in input directory"""
    os.makedirs(output_dir, exist_ok=True)
    
    for filename in os.listdir(input_dir):
        if filename.endswith('.json'):
            input_path = os.path.join(input_dir, filename)
            output_path = os.path.join(output_dir, filename)
            
            with open(input_path, 'r') as f:
                data = json.load(f)
            
            data['contribution_summary'] = generate_summary(data)
            
            with open(output_path, 'w') as f:
                json.dump(data, f, indent=2)
            
            print(f"Processed {filename}")

def main():
    parser = argparse.ArgumentParser(description="Generate detailed GitHub summaries")
    parser.add_argument("input_dir", help="Directory containing JSON files")
    parser.add_argument("output_dir", help="Directory to save processed files")
    args = parser.parse_args()
    
    process_files(args.input_dir, args.output_dir)
    print("Done!")

if __name__ == "__main__":
    main()
