import json
from typing import Dict, Any

def merge_contributor_data(contributor_data: Dict[str, Any], analysis_data: Dict[str, Any]) -> Dict[str, Any]:
    """Merge analyzer output into existing contributor data."""
    merged = contributor_data.copy()
    
    # Find matching analysis entry
    matching_analysis = None
    for analysis in analysis_data['contributors']:
        if analysis['username'].lower() == contributor_data['contributor'].lower():
            matching_analysis = analysis
            break
            
    if not matching_analysis:
        return merged
        
    # Add tag scores and levels
    merged['tag_scores'] = matching_analysis.get('tag_scores', {})
    merged['tag_levels'] = matching_analysis.get('tag_levels', {})
    
    # Preserve existing tags if any, otherwise add analyzed tags
    if not merged.get('tags'):
        merged['tags'] = matching_analysis.get('tags', [])
    
    # Add focus areas if not present
    if not merged.get('focus_areas'):
        merged['focus_areas'] = matching_analysis.get('focus_areas', [])
        
    # Update summary if analysis has one and original doesn't
    if matching_analysis.get('summary') and not merged.get('summary'):
        merged['summary'] = matching_analysis['summary']
        
    return merged

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Merge contributor and analysis data")
    parser.add_argument("contributors_file", help="Original contributors JSON file")
    parser.add_argument("analysis_file", help="Analysis output JSON file")
    parser.add_argument("output_file", help="Output merged JSON file")
    args = parser.parse_args()
    
    # Load input files
    print(f"\nLoading data files...")
    try:
        with open(args.contributors_file) as f:
            contributors = json.load(f)
        with open(args.analysis_file) as f:
            analysis = json.load(f)
    except Exception as e:
        print(f"Error loading input files: {e}")
        return
        
    print(f"\nMerging {len(contributors)} contributors with analysis data...")
    merged_data = []
    
    # Process each contributor
    for contributor in contributors:
        merged = merge_contributor_data(contributor, analysis)
        merged_data.append(merged)
        print(f"✓ Processed {contributor['contributor']}")
    
    # Sort by score
    merged_data.sort(key=lambda x: x.get('score', 0), reverse=True)
    
    # Save output
    print(f"\nSaving merged data to {args.output_file}")
    try:
        with open(args.output_file, 'w') as f:
            json.dump(merged_data, f, indent=2)
    except Exception as e:
        print(f"Error saving output: {e}")
        return
        
    print("\nMerge complete!")
    print(f"Processed {len(merged_data)} contributors")
    
if __name__ == "__main__":
    main()
