import { MCPTool, MCPInput } from "mcp-framework";
import { RepositoryDiscovery } from "../lib/repository-discovery.js";

interface GetRepoInfoInput {
  repoName: string;
}

export default class GetRepoInfoTool extends MCPTool {
  name = "get_repo_info";
  description = "Get detailed information about a specific repository";

  inputSchema = {
    type: "object",
    properties: {
      repoName: {
        type: "string",
        description: "Name of the repository to get information for",
      },
    },
    required: ["repoName"],
    additionalProperties: false,
  };

  async execute(input: MCPInput<GetRepoInfoInput>) {
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

      // Get repository information
      const info = await discovery.getRepositoryInfo(repoName);
      
      // Get available dates
      const dates = await discovery.listAvailableDates(repoName);

      return {
        success: true,
        data: {
          repository: repoName,
          ...info,
          availableDates: dates,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get repository info: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}