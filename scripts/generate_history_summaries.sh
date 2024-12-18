#!/bin/bash

# Create directories if they don't exist
mkdir -p data/{daily,weekly,monthly}/history

# Function to process files for a given period
process_historical() {
    local period=$1
    echo "Processing ${period} historical summaries..."
    
    for scored_file in data/${period}/history/scored_*.json; do
        if [ -f "$scored_file" ]; then
            # Extract date from filename
            date=$(echo "$scored_file" | grep -o '[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}')
            
            if [ ! -z "$date" ]; then
                echo "Generating summary for $date..."
                output_file="data/${period}/history/contributors_${date}.json"
                
                # Generate summary
                python scripts/summarize.py -f \
                    "$scored_file" \
                    "$output_file" \
                    --model ollama

                if [ $? -eq 0 ]; then
                    echo "✓ Processed $scored_file -> $output_file"
                else
                    echo "✗ Failed to process $scored_file"
                fi
            fi
        fi
    done
}

# Process each period type
for period in daily weekly monthly; do
    if ls data/${period}/history/scored_*.json 1> /dev/null 2>&1; then
        process_historical $period
    else
        echo "No scored files found for ${period}"
    fi
done

echo "All historical summaries processed!"
