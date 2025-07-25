import { MCPTool, MCPInput } from "mcp-framework";
import { HttpClient } from "../lib/http-client.js";
import { UrlBuilder } from "../lib/url-builder.js";
import { parseRepoSummary, parseOverallSummary } from "../lib/types.js";

interface GetSummaryInput {
  repoName?: string;
  period?: string;
}

export default class GetSummaryTool extends MCPTool {
  name = "get_summary";
  description = "Get summary data for a repository or overall summaries";

  inputSchema = {
    type: "object",
    properties: {
      repoName: {
        type: "string",
        description: "Name of the repository (if not provided, gets overall summaries)",
      },
      period: {
        type: "string",
        description: "Time period for the summary (daily, weekly, monthly, etc.)",
      },
    },
    additionalProperties: false,
  };

  async execute(input: MCPInput<GetSummaryInput>) {
    try {
      const { repoName, period } = input;
      const baseUrl = "https://elizaos.github.io/eliza-leaderboard";
      const client = new HttpClient(baseUrl);
      const urlBuilder = new UrlBuilder(baseUrl);

      if (repoName) {
        // Get repository-specific summary
        const url = urlBuilder.buildRepoSummariesUrl(repoName, period);
        
        try {
          const summaryData = await client.fetchJson(url);
          const validatedSummary = parseRepoSummary(summaryData);
          
          return {
            success: true,
            data: {
              type: "repository_summary",
              repository: repoName,
              period: period || "latest",
              summary: validatedSummary,
            },
          };
        } catch (error) {
          // Try to fetch as text (might be markdown)
          try {
            const summaryText = await client.fetchText(url);
            return {
              success: true,
              data: {
                type: "repository_summary",
                repository: repoName,
                period: period || "latest",
                summary: summaryText,
                format: "markdown",
              },
            };
          } catch (textError) {
            return {
              success: false,
              error: `Failed to fetch summary for repository '${repoName}': ${error instanceof Error ? error.message : String(error)}`,
            };
          }
        }
      } else {
        // Get overall summaries
        const url = urlBuilder.buildOverallSummariesUrl(period);
        
        try {
          const summaryData = await client.fetchJson(url);
          const validatedSummary = parseOverallSummary(summaryData);
          
          return {
            success: true,
            data: {
              type: "overall_summary",
              period: period || "latest",
              summary: validatedSummary,
            },
          };
        } catch (error) {
          // Try to fetch as text (might be markdown)
          try {
            const summaryText = await client.fetchText(url);
            return {
              success: true,
              data: {
                type: "overall_summary",
                period: period || "latest",
                summary: summaryText,
                format: "markdown",
              },
            };
          } catch (textError) {
            return {
              success: false,
              error: `Failed to fetch overall summary: ${error instanceof Error ? error.message : String(error)}`,
            };
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get summary: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}