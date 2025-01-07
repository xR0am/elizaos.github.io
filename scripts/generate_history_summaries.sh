#!/bin/bash

# Create directories if they don't exist
mkdir -p data/{daily,weekly,monthly}/history

# Function to process contributors files for a given period
process_contributors() {
    local period=$1
    echo "Processing ${period} contributor summaries..."
    
    # Find contributor files matching pattern (both YYYY_MM_DD and YYYY-MM-DD formats)
    for contrib_file in data/${period}/history/contributors_*.json; do
        if [ -f "$contrib_file" ]; then
            # Extract date from filename, handling both formats
            date=$(echo "$contrib_file" | grep -o '[0-9]\{4\}[_-][0-9]\{2\}[_-][0-9]\{2\}' | sed 's/_/-/g')
            
            if [ ! -z "$date" ]; then
                echo "Generating summary for $date..."
                output_file="data/${period}/history/contributors_${date}.json"
                
                # Generate summary using summarize.py
                python scripts/summarize.py summary \
                    "$contrib_file" \
                    "$output_file" \
                    --model ollama -f

                if [ $? -eq 0 ]; then
                    echo "✓ Processed $contrib_file -> $output_file"
                else
                    echo "✗ Failed to process $contrib_file"
                fi
            fi
        fi
    done
}

# Function to generate weekly thread
generate_weekly_thread() {
    echo "Generating weekly development thread..."
    
    # Prepare input files using jq
    cat data/weekly/issues.json | jq -r '.[] | "[\(.state)] \(.title): \(.body | split("\n") | map(select(length > 0 and (contains("**") | not) and (contains("<!--") | not))) | .[0] // "No description")"' > data/weekly/issues.txt
    
    cat data/weekly/scored.json | jq -r '.[].summary' > data/weekly/weekly.txt
    
    cat data/weekly/prs.json | jq -r '.[] | "\(.title) by \(.author.login) [\(.state)\(if .merged then "/MERGED" else "" end)] (\([.files[].additions] | add) additions)"' > data/weekly/prs.txt
    
    # Generate thread using summarize.py
    output_file="data/weekly/thread_$(date +%Y-%m-%d).txt"
    
    python scripts/summarize.py thread \
        --issues data/weekly/issues.txt \
        --prs data/weekly/prs.txt \
        --summaries data/weekly/weekly.txt \
        --output "$output_file" \
        --model ollama -f
    
    if [ $? -eq 0 ]; then
        echo "✓ Generated thread -> $output_file"
        echo "Thread preview:"
        echo "---------------"
        cat "$output_file"
    else
        echo "✗ Failed to generate thread"
    fi
    
    # Cleanup temporary files
    rm -f data/weekly/{issues,prs,weekly}.txt
}

# Process daily contributors files
echo "Starting daily history processing..."
process_contributors "daily"
echo "Daily history processing complete!"

# Generate weekly thread if it's the right day (e.g., Friday)
if [ "$(date +%u)" = "5" ]; then
    echo "It's Friday - generating weekly thread..."
    generate_weekly_thread
fi