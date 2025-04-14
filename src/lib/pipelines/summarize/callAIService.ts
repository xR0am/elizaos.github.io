import { AISummaryConfig } from "./config";

/**
 * Call AI service to generate a summary
 */

export async function callAIService(
  prompt: string,
  config: AISummaryConfig,
  options?: {
    maxTokens?: number;
    temperature?: number;
    model?: string;
  },
): Promise<string> {
  try {
    const response = await fetch(
      config.endpoint || "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
          "HTTP-Referer": process.env.SITE_URL || "https://elizaos.github.io",
          "X-Title": process.env.SITE_NAME || "ElizaOS Leaderboard",
        },
        body: JSON.stringify({
          model:
            options?.model ||
            config.defaultModel ||
            "anthropic/claude-3-sonnet-20240229",
          messages: [
            {
              role: "system",
              content:
                "You are writing GitHub activity summaries. Use only the actual contribution data provided. Never add, modify or make up information.",
            },
            { role: "user", content: prompt },
          ],
          temperature: options?.temperature ?? config.temperature ?? 0.1,
          max_tokens: options?.maxTokens ?? config.max_tokens ?? 200,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API request failed: ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error calling AI service:", error);
    throw error;
  }
}
