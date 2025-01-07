#!/bin/bash

# Manages thread versioning and backup
timestamp=$(date +'%Y_%m_%d')
thread_dir="data/weekly/threads"
backup_dir="data/weekly/threads/history"

# Create directories if they don't exist
mkdir -p "$thread_dir" "$backup_dir"

# Move current thread to history with timestamp
if [ -f "data/weekly/thread_$(date +%Y-%m-%d).txt" ]; then
    # Copy to threads directory with timestamp
    cp "data/weekly/thread_$(date +%Y-%m-%d).txt" "$thread_dir/thread_${timestamp}.txt"
    
    # Create backup with timestamp
    cp "$thread_dir/thread_${timestamp}.txt" "$backup_dir/thread_${timestamp}.txt"
    
    # Create latest.txt symlink
    ln -sf "$thread_dir/thread_${timestamp}.txt" "$thread_dir/latest.txt"
    
    echo "✓ Thread backup complete"
else
    echo "✗ No thread file found for today"
fi

# Clean up old files (keep last 12 weeks)
find "$backup_dir" -name "thread_*.txt" -type f -mtime +84 -delete