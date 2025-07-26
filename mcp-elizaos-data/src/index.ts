#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Import all tool handlers
import { getPluginStatsHandler, getPluginStatsSchema } from "./tools/get-plugin-stats.js";
import { getRepositoryDataHandler, getRepositoryDataSchema } from "./tools/get-repository-data.js";
import { listAvailablePluginsHandler, listAvailablePluginsSchema } from "./tools/list-available-plugins.js";
import { getSummaryDataHandler, getSummaryDataSchema } from "./tools/get-summary-data.js";

const server = new Server(
  {
    name: "mcp-elizaos-data",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register all tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      getPluginStatsSchema,
      getRepositoryDataSchema,
      listAvailablePluginsSchema,
      getSummaryDataSchema,
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "get_plugin_stats":
      return getPluginStatsHandler(args);
    case "get_repository_data":
      return getRepositoryDataHandler(args);
    case "list_available_plugins":
      return listAvailablePluginsHandler(args);
    case "get_summary_data":
      return getSummaryDataHandler(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP ElizaOS Data Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});