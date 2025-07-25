import { MCPTool, MCPInput } from "mcp-framework";
import { RepositoryDiscovery } from "../lib/repository-discovery.js";

interface GetRepositoriesInput {
  includeStats?: boolean;
}

export default class GetRepositoriesTool extends MCPTool {
  name = "get_repositories";
  description = "Get list of available repositories in the leaderboard";

  inputSchema = {
    type: "object",
    properties: {
      includeStats: {
        type: "boolean",
        description: "Whether to include basic stats for each repository",
        default: false,
      },
    },
    additionalProperties: false,
  };

  async execute(input: MCPInput<GetRepositoriesInput>) {
    try {
      const baseUrl = "https://elizaos.github.io/eliza-leaderboard";
      const discovery = new RepositoryDiscovery(baseUrl);

      const repositories = await discovery.listRepositories();
      
      if (!input.includeStats) {
        return {
          success: true,
          data: {
            repositories: repositories.map(repo => repo.name),
            count: repositories.length,
          },
        };
      }

      // Include basic repository information
      const repositoriesWithInfo = await Promise.all(
        repositories.map(async (repo) => {
          try {
            const info = await discovery.getRepositoryInfo(repo.name);
            return {
              name: repo.name,
              ...info,
            };
          } catch (error) {
            return {
              name: repo.name,
              error: `Failed to get info: ${error instanceof Error ? error.message : String(error)}`,
            };
          }
        })
      );

      return {
        success: true,
        data: {
          repositories: repositoriesWithInfo,
          count: repositoriesWithInfo.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get repositories: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}