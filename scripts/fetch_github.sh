#!/bin/bash


function get_pr_query() {
    # If cursor is provided, include the after argument
    if [ "$3" != "" ]; then
        echo '
        query($endCursor: String!) {
            repository(owner: "'$1'", name: "'$2'") {
                pullRequests(
                    first: 100,
                    after: $endCursor,
                    orderBy: {field: CREATED_AT, direction: DESC}
                    states: [OPEN, CLOSED, MERGED]
                ) {
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                    nodes {
                        id
                        number
                        title
                        body
                        state
                        merged
                        createdAt
                        updatedAt
                        author { 
                            login 
                            avatarUrl
                        }
                        labels(first: 30) { nodes { id name color description } }
                        comments(first: 30) { nodes { id author { login } body } }
                        reviews(first: 30) { nodes { id author { login } body state } }
                        files(first: 100) { nodes { path additions deletions } }
                    }
                }
            }
        }'
    else
        # Initial query without cursor
        echo '
        query {
            repository(owner: "'$1'", name: "'$2'") {
                pullRequests(
                    first: 100,
                    orderBy: {field: CREATED_AT, direction: DESC}
                    states: [OPEN, CLOSED, MERGED]
                ) {
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                    nodes {
                        id
                        number
                        title
                        body
                        state
                        merged
                        createdAt
                        updatedAt
                        author { 
                            login 
                            avatarUrl
                        }
                        labels(first: 30) { nodes { id name color description } }
                        comments(first: 30) { nodes { id author { login } body } }
                        reviews(first: 30) { nodes { id author { login } body state } }
                        files(first: 100) { nodes { path additions deletions } }
                    }
                }
            }
        }'
    fi
}

function get_issue_query() {
    # If cursor is provided, include the after argument
    if [ "$3" != "" ]; then
        echo '
        query($endCursor: String!) {
            repository(owner: "'$1'", name: "'$2'") {
                issues(
                    first: 100,
                    after: $endCursor,
                    orderBy: {field: CREATED_AT, direction: DESC}
                    states: [OPEN, CLOSED]
                ) {
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                    nodes {
                        id
                        number
                        title
                        body
                        state
                        createdAt
                        updatedAt
                        author {
                            login
                            avatarUrl
                        }
                        labels(first: 30) { nodes { id name color description } }
                        comments(first: 30) { nodes { id author { login } body } }
                    }
                }
            }
        }'
    else
        echo '
        query {
            repository(owner: "'$1'", name: "'$2'") {
                issues(
                    first: 100,
                    orderBy: {field: CREATED_AT, direction: DESC}
                    states: [OPEN, CLOSED]
                ) {
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                    nodes {
                        id
                        number
                        title
                        body
                        state
                        createdAt
                        updatedAt
                        author {
                            login
                            avatarUrl
                        }
                        labels(first: 30) { nodes { id name color description } }
                        comments(first: 30) { nodes { id author { login } body } }
                    }
                }
            }
        }'
    fi
}

function get_commit_query() {
    # If cursor is provided, include the after argument
    if [ "$3" != "" ]; then
        echo '
        query($endCursor: String!) {
            repository(owner: "'$1'", name: "'$2'") {
                defaultBranchRef {
                    target {
                        ... on Commit {
                            history(
                                first: 100,
                                after: $endCursor
                            ) {
                                pageInfo {
                                    hasNextPage
                                    endCursor
                                }
                                nodes {
                                    sha: oid
                                    message
                                    committedDate
                                    author {
                                        user {
                                            login
                                        }
                                    }
                                    additions
                                    deletions
                                    changedFiles
                                }
                            }
                        }
                    }
                }
            }
        }'
    else
        echo '
        query {
            repository(owner: "'$1'", name: "'$2'") {
                defaultBranchRef {
                    target {
                        ... on Commit {
                            history(
                                first: 100
                            ) {
                                pageInfo {
                                    hasNextPage
                                    endCursor
                                }
                                nodes {
                                    sha: oid
                                    message
                                    committedDate
                                    author {
                                        user {
                                            login
                                        }
                                    }
                                    additions
                                    deletions
                                    changedFiles
                                }
                            }
                        }
                    }
                }
            }
        }'
    fi
}



function fetch_prs() {
    local owner=$1
    local repo=$2
    local start_date=$3
    local all_prs=()
    local cursor=""
    local has_next=true
    local page=1
    
    while [ "$has_next" = "true" ]; do
        echo "Fetching PR page $page..." >&2
        
        # Get appropriate query based on whether we have a cursor
        local query=$(get_pr_query "$owner" "$repo" "$cursor")
        
        # For first page, don't pass cursor parameter
        if [ "$cursor" = "" ]; then
            local result=$(gh api graphql -f query="$query" \
                -q ".data.repository.pullRequests")
        else
            local result=$(gh api graphql -f query="$query" \
                -f endCursor="$cursor" \
                -q ".data.repository.pullRequests")
        fi
        
        # Extract PRs and pagination info
        local page_prs=$(echo "$result" | jq '.nodes')
        has_next=$(echo "$result" | jq -r '.pageInfo.hasNextPage')
        cursor=$(echo "$result" | jq -r '.pageInfo.endCursor')
        
        # Filter by date and format PRs
        local filtered_prs=$(echo "$page_prs" | jq --arg start_date "$start_date" '[
            .[] | select(.createdAt >= $start_date) | {
                id,
                number,
                title,
                body,
                state,
                merged,
                createdAt,
                updatedAt,
                author: (.author | if . == null then null else {
                    login: .login,
                    avatarUrl: .avatarUrl
                } end),
                labels: [(.labels.nodes[]? // empty | {id, name, color, description})],
                files: [(.files.nodes[]? // empty | {path, additions, deletions})],
                reviews: [(.reviews.nodes[]? // empty | {
                    id,
                    author: (.author | if . == null then null else .login end),
                    body,
                    state
                })],
                comments: [(.comments.nodes[]? // empty | {
                    id,
                    author: (.author | if . == null then null else .login end),
                    body
                })]
            }
        ]')
        
        # Check if we got any PRs in our date range
        local filtered_count=$(echo "$filtered_prs" | jq '. | length')
        if [ "$filtered_count" -eq 0 ]; then
            break
        fi
        
        all_prs+=("$filtered_prs")
        ((page++))
        
        # Avoid rate limiting
        sleep 1
    done
    
    # Combine all pages
    if [ ${#all_prs[@]} -eq 0 ]; then
        echo "[]"
    else
        printf '%s\n' "${all_prs[@]}" | jq -s 'add'
    fi
}

function fetch_issues() {
    local owner=$1
    local repo=$2
    local start_date=$3
    local all_issues=()
    local cursor=""
    local has_next=true
    local page=1
    
    while [ "$has_next" = "true" ]; do
        echo "Fetching issue page $page..." >&2
        
        # Get appropriate query based on whether we have a cursor
        local query=$(get_issue_query "$owner" "$repo" "$cursor")
        
        # For first page, don't pass cursor parameter
        if [ "$cursor" = "" ]; then
            local result=$(gh api graphql -f query="$query" \
                -q ".data.repository.issues")
        else
            local result=$(gh api graphql -f query="$query" \
                -f endCursor="$cursor" \
                -q ".data.repository.issues")
        fi
        
        # Extract issues and pagination info
        local page_issues=$(echo "$result" | jq '.nodes')
        has_next=$(echo "$result" | jq -r '.pageInfo.hasNextPage')
        cursor=$(echo "$result" | jq -r '.pageInfo.endCursor')
        
        # Filter by date and format issues
        local filtered_issues=$(echo "$page_issues" | jq --arg start_date "$start_date" '[
            .[] | select(.createdAt >= $start_date) | {
                id,
                number,
                title,
                body,
                state,
                createdAt,
                updatedAt,
                author: (.author | if . == null then null else {
                    login: .login,
                    avatarUrl: .avatarUrl
                } end),
                labels: [(.labels.nodes[]? // empty | {id, name, color, description})],
                comments: [(.comments.nodes[]? // empty | {
                    id,
                    author: (.author | if . == null then null else .login end),
                    body
                })]
            }
        ]')
        
        # Check if we got any issues in our date range
        local filtered_count=$(echo "$filtered_issues" | jq '. | length')
        if [ "$filtered_count" -eq 0 ]; then
            break
        fi
        
        all_issues+=("$filtered_issues")
        ((page++))
        
        # Avoid rate limiting
        sleep 1
    done
    
    # Combine all pages
    if [ ${#all_issues[@]} -eq 0 ]; then
        echo "[]"
    else
        printf '%s\n' "${all_issues[@]}" | jq -s 'add'
    fi
}

function fetch_commits() {
    local owner=$1
    local repo=$2
    local start_date=$3
    local all_commits=()
    local cursor=""
    local has_next=true
    local page=1
    
    while [ "$has_next" = "true" ]; do
        echo "Fetching commit page $page..." >&2
        
        # Get appropriate query based on whether we have a cursor
        local query=$(get_commit_query "$owner" "$repo" "$cursor")
        
        # For first page, don't pass cursor parameter
        if [ "$cursor" = "" ]; then
            local result=$(gh api graphql -f query="$query" \
                -q ".data.repository.defaultBranchRef.target.history")
        else
            local result=$(gh api graphql -f query="$query" \
                -f endCursor="$cursor" \
                -q ".data.repository.defaultBranchRef.target.history")
        fi
        
        # Extract commits and pagination info
        local page_commits=$(echo "$result" | jq '.nodes')
        has_next=$(echo "$result" | jq -r '.pageInfo.hasNextPage')
        cursor=$(echo "$result" | jq -r '.pageInfo.endCursor')
        
        # Filter by date and format commits
        local filtered_commits=$(echo "$page_commits" | jq --arg start_date "$start_date" '[
            .[] | select(.committedDate >= $start_date) | {
                sha,
                message,
                committedDate,
                author: {
                    user: {
                        login: (.author.user.login // null)
                    }
                },
                additions,
                deletions,
                changedFiles
            }
        ]')
        
        # Check if we got any commits in our date range
        local filtered_count=$(echo "$filtered_commits" | jq '. | length')
        if [ "$filtered_count" -eq 0 ]; then
            break
        fi
        
        all_commits+=("$filtered_commits")
        ((page++))
        
        # Avoid rate limiting
        sleep 1
    done
    
    # Combine all pages
    if [ ${#all_commits[@]} -eq 0 ]; then
        echo "[]"
    else
        printf '%s\n' "${all_commits[@]}" | jq -s 'add'
    fi
}

# Parse command line arguments
if [ $# -lt 4 ]; then
    print_usage
fi

# Main script logic remains the same...
owner="$1"
repo="$2"
type=""
days=7

shift 2
while [[ $# -gt 0 ]]; do
    case "$1" in
        --type)
            type="$2"
            shift 2
            ;;
        --days)
            days="$2"
            shift 2
            ;;
        *)
            echo "Unknown parameter: $1" >&2
            exit 1
            ;;
    esac
done

if [[ ! "$type" =~ ^(prs|issues|discussions|commits)$ ]]; then
    echo "Error: type must be one of: prs, issues, discussions, commits" >&2
    exit 1
fi

# Calculate date range
end_date=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
start_date=$(date -u -d "$days days ago" +"%Y-%m-%dT%H:%M:%SZ")

echo "Fetching $type from $start_date to $end_date" >&2

case "$type" in
    "prs")
        fetch_prs "$owner" "$repo" "$start_date"
        ;;
    "issues")
        fetch_issues "$owner" "$repo" "$start_date"
        ;;
    "discussions")
        fetch_discussions "$owner" "$repo" "$start_date"
        ;;
    "commits")
        fetch_commits "$owner" "$repo" "$start_date"
        ;;
esac


