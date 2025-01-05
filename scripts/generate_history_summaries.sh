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
                python scripts/summarize.py \
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

# Process daily contributors files
echo "Starting daily history processing..."
process_contributors "daily"
echo "Daily history processing complete!"
