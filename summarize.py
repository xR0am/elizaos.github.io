import json
import os
import argparse
from langchain_community.chat_models import ChatOllama
from langchain_core.prompts import PromptTemplate

def generate_summary(data):
    """Generate a quick summary blurb using Ollama"""
    model = ChatOllama(model='phi3:14b-medium-4k-instruct-q5_K_M', temperature=0.1)
    
    # Create simple prompt with recent activity
    activity = []
    if 'commits' in data['activity'].get('code', {}):
        commits = data['activity']['code']['commits'][:10]  # Last 10 commits
        activity.extend(f"Commit: {c['message']}" for c in commits)
    
    if 'pull_requests' in data['activity'].get('code', {}):
        prs = data['activity']['code']['pull_requests']
        activity.extend(f"PR: {pr['title']}" for pr in prs)

    prompt = PromptTemplate(
        template="""Based on this GitHub activity, write a 1-2 sentence summary of what this user worked on:

{activity}

Keep it brief and focus on main areas of work. Write in present tense.""",
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
    parser = argparse.ArgumentParser(description="Generate quick GitHub summaries")
    parser.add_argument("input_dir", help="Directory containing JSON files")
    parser.add_argument("output_dir", help="Directory to save processed files")
    args = parser.parse_args()
    
    process_files(args.input_dir, args.output_dir)
    print("Done!")

if __name__ == "__main__":
    main()
