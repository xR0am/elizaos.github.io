import { MCPTool, MCPInput } from "mcp-framework";
import { RepositoryDiscovery } from "../lib/repository-discovery.js";

interface ListDatesInput {
  repoName: string;
}

export default class ListDatesTool extends MCPTool {
  name = "list_dates";
  description = "List available dates for a repository's data";

  inputSchema = {
    type: "object",
    properties: {
      repoName: {
        type: "string",
        description: "Name of the repository to list dates for",
      },
    },
    required: ["repoName"],
    additionalProperties: false,
  };

  async execute(input: MCPInput<ListDatesInput>) {
    try {
      const { repoName } = input;
      const baseUrl = "https://elizaos.github.io/eliza-leaderboard";
      const discovery = new RepositoryDiscovery(baseUrl);

      // Check if repository exists
      const exists = await discovery.repositoryExists(repoName);
      if (!exists) {
        return {
          success: false,
          error: `Repository '${repoName}' not found`,
        };
      }

      // Get available dates
      const dates = await discovery.listAvailableDates(repoName);

      return {
        success: true,
        data: {
          repository: repoName,
          availableDates: dates,
          count: dates.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list dates: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}