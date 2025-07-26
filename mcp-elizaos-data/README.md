# MCP ElizaOS Data Server

A minimal MCP (Model Context Protocol) server that exposes ElizaOS ecosystem data endpoints for real-time information about plugins, repositories, statistics, and community activity.

## Overview

This MCP server provides access to ElizaOS ecosystem data through four core tools:
- **get_plugin_stats** - Fetch plugin statistics and metrics
- **get_repository_data** - Get repository metadata and contribution data  
- **list_available_plugins** - List all available plugins with filtering
- **get_summary_data** - Fetch comprehensive ecosystem summaries

## Installation

### NPX Usage (Recommended)

```bash
npx mcp-elizaos-data
```

### Global Installation

```bash
npm install -g mcp-elizaos-data
mcp-elizaos-data
```

### Local Development

```bash
git clone https://github.com/xR0am/elizaos.github.io.git
cd elizaos.github.io/mcp-elizaos-data
npm install
npm run build
npm start
```

## Usage with MCP Clients

### Cursor Configuration

Add to your Cursor MCP configuration:

```json
{
  "mcpServers": {
    "elizaos-data": {
      "command": "npx",
      "args": ["mcp-elizaos-data"]
    }
  }
}
```

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "elizaos-data": {
      "command": "npx",
      "args": ["-y", "mcp-elizaos-data"]
    }
  }
}
```

## Available Tools

### 1. get_plugin_stats

Fetch plugin statistics including downloads, stars, and other metrics.

**Parameters:**
- `plugin_name` (optional): Specific plugin name to filter
- `include_details` (optional): Include detailed statistics (default: false)

**Example:**
```json
{
  "plugin_name": "evm",
  "include_details": true
}
```

### 2. get_repository_data

Fetch repository metadata and statistics.

**Parameters:**
- `repository_name` (optional): Specific repository to filter
- `include_stats` (optional): Include repository statistics (default: true)
- `include_contributors` (optional): Include contributor information (default: false)

**Example:**
```json
{
  "repository_name": "eliza",
  "include_contributors": true
}
```

### 3. list_available_plugins

List all available plugins with filtering and sorting options.

**Parameters:**
- `category` (optional): Filter by category (e.g., 'blockchain', 'social', 'ai')
- `include_details` (optional): Include detailed plugin information (default: false)
- `sort_by` (optional): Sort by 'name', 'category', 'updated', or 'popularity' (default: 'name')

**Example:**
```json
{
  "category": "blockchain",
  "sort_by": "updated",
  "include_details": true
}
```

### 4. get_summary_data

Fetch comprehensive ecosystem summary data.

**Parameters:**
- `summary_type` (optional): Type of summary - 'overview', 'statistics', 'activity', 'contributors' (default: 'overview')
- `time_period` (optional): Time period - 'week', 'month', 'quarter', 'year', 'all' (default: 'month')
- `include_trends` (optional): Include trend analysis (default: false)

**Example:**
```json
{
  "summary_type": "statistics",
  "time_period": "quarter",
  "include_trends": true
}
```

## Data Sources

The server attempts to fetch real data from ElizaOS endpoints at `https://elizaos.github.io/data/`. When real endpoints are unavailable, it provides realistic mock data based on the actual ElizaOS ecosystem structure.

### Endpoints Checked:
- Plugin stats: `/elizaos-plugins_registry/stats.json`
- Repository data: `/elizaos_eliza/metadata.json`
- Plugin listings: `/elizaos-plugins_registry/plugins.json`
- Summary data: `/summaries/ecosystem-summary.json`

## Features

- **Real Data Integration**: Fetches actual data from ElizaOS endpoints
- **Graceful Fallbacks**: Provides realistic mock data when endpoints are unavailable
- **Comprehensive Schemas**: Full Zod validation for all inputs and outputs
- **Error Handling**: Robust error handling with informative messages
- **Filtering & Sorting**: Advanced filtering and sorting capabilities
- **npx Distribution**: Easy installation and usage via npx

## Error Handling

The server handles network errors gracefully and provides detailed error information:

```json
{
  "error": "Failed to fetch plugin stats",
  "message": "Network timeout",
  "timestamp": "2024-01-16T12:00:00.000Z"
}
```

## Development

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Testing with MCP Inspector

```bash
npx @modelcontextprotocol/inspector mcp-elizaos-data
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Links

- [ElizaOS GitHub](https://github.com/elizaos/eliza)
- [ElizaOS Website](https://elizaos.github.io)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)