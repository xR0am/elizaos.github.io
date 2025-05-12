import { AISummaryConfig } from "./config";
import { callAIService } from "./callAIService";
import { WorkItemType } from "../codeAreaHelpers";
import { RepositoryMetrics } from "../export/queries";
import { UTCDate } from "@date-fns/utc";
import {
  IntervalType,
  formatTimeframeTitle,
  getIntervalTypeTitle,
} from "@/lib/date-utils";

export interface CompletedItem {
  title: string;
  prNumber: number;
  type: WorkItemType;
}

export interface FocusArea {
  area: string;
  count: number;
}

export interface PullRequestMetrics {
  total: number;
  merged: number;
  open: number;
  items?: unknown[];
  mergedThisPeriod?: number;
}

export interface IssueMetrics {
  total: number;
  opened: number;
  closed: number;
  items?: unknown[];
  closedThisPeriod?: unknown[];
}

export interface CodeChangeMetrics {
  additions: number;
  deletions: number;
  files: number;
  commitCount?: number;
}

export interface ContributorInfo {
  username: string;
}

export interface ProjectMetricsForSummary {
  pullRequests: PullRequestMetrics;
  issues: IssueMetrics;
  uniqueContributors: number;
  topContributors: ContributorInfo[];
  codeChanges: CodeChangeMetrics;
  focusAreas: FocusArea[];
  completedItems: CompletedItem[];
}

export async function generateProjectSummary(
  metrics: RepositoryMetrics,
  config: AISummaryConfig,
  dateInfo: { startDate: string },
  intervalType: IntervalType,
): Promise<string | null> {
  const apiKey = config.apiKey;
  if (!apiKey) {
    throw new Error("No API key for AI summary generation");
  }

  try {
    // Format the data for the AI prompt based on interval type
    const prompt = formatAnalysisPrompt(
      metrics,
      dateInfo,
      intervalType,
      config,
    );

    // Calculate token length based on prompt content and interval type
    const maxTokens = calculateMaxTokens(prompt, intervalType, config);
    console.log(`Max tokens: ${maxTokens}, intervalType: ${intervalType}`);
    // Get analysis from AI model
    return await callAIService(prompt, config, {
      maxTokens,
      model: config.models[intervalType],
    });
  } catch (error) {
    console.error(`Error generating ${intervalType} project analysis:`, error);
    return null;
  }
}

/**
 * Calculate appropriate max tokens based on prompt length and interval type
 * Returns a value using a basic scaling approach
 */
function calculateMaxTokens(
  prompt: string,
  intervalType: IntervalType,
  config: AISummaryConfig,
): number {
  // Base tokens by interval type
  const baseTokensByInterval = {
    month: 3000,
    week: 1500,
    day: 1000,
  };

  // Get base token count for this interval type
  const baseTokens = baseTokensByInterval[intervalType] || 600;

  // Simple estimation: 1 token ≈ 4 characters in English
  const estimatedPromptTokens = prompt.length / 4;
  // Add 20% more tokens for every 400 estimated tokens in the prompt
  const scalingFactor = 1 + Math.floor(estimatedPromptTokens / 400) * 0.2;

  // Calculate final token count
  const calculatedTokens = Math.round(baseTokens * scalingFactor);

  // Ensure result is within a reasonable range, respecting config.max_tokens
  return Math.max(300, Math.min(config.max_tokens, calculatedTokens));
}

/**
 * Format project metrics into a structured prompt for analysis based on interval type
 */
function formatAnalysisPrompt(
  metrics: RepositoryMetrics,
  dateInfo: { startDate: string },
  intervalType: IntervalType,
  config: AISummaryConfig,
): string {
  const date = new UTCDate(dateInfo.startDate);

  // Format date information based on interval type
  const timeframeTitle = formatTimeframeTitle(date, intervalType);

  // Format top active areas
  const topActiveAreas = metrics.focusAreas
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((area) => `${area.area}: ${area.count} changes`);

  const formatCompletedItems = (type: WorkItemType) =>
    metrics.completedItems
      .filter((item) => item.type === type)
      .map(
        (item) => ` (PR #${item.prNumber}) ${item.title}. BODY: ${item.body}`,
      )
      .join("\n- ") || "None";

  // Format completed items for better clarity
  const completedFeatures = formatCompletedItems("feature");
  const completedBugfixes = formatCompletedItems("bugfix");
  const completedRefactors = formatCompletedItems("refactor");
  const completedDocs = formatCompletedItems("docs");
  const completedTests = formatCompletedItems("tests");
  const completedOtherWork = formatCompletedItems("other");
  const newIssues = metrics.issues.newIssues;
  const closedIssues = metrics.issues.closedIssues;

  return `
BACKGROUND CONTEXT:
  ${config.projectContext}

INSTRUCTIONS:
Generate a detailed yet concise ${intervalType}ly development report for the ${metrics.repository} repo during ${timeframeTitle}, based on the following github activity.
  
COMPLETED WORK:
  
- **Features Added:** 
  - ${completedFeatures}
- **Bug Fixes:** 
  - ${completedBugfixes}
- **Code Refactoring:** 
  - ${completedRefactors}
- **Documentation Enhancements:** 
  - ${completedDocs}
- **Tests Added:** 
  - ${completedTests}
- **Other Work:** 
  - ${completedOtherWork}
  Most Active Development Areas:
  - ${topActiveAreas.join("\n- ")}

NEW ISSUES:
  - ${newIssues.map((issue) => `[#${issue.number}] ${issue.title}. BODY: ${issue.body?.slice(0, 240)}`).join("\n- ")}

CLOSED ISSUES:
  - ${closedIssues.map((issue) => `[#${issue.number}] ${issue.title}. BODY: ${issue.body?.slice(0, 240)}`).join("\n- ")}

Format the report with the following sections:

# <Project Name> ${getIntervalTypeTitle(intervalType)} Update (${timeframeTitle})
## OVERVIEW 
  Provide a high-level summary (max 280 characters, min 40 characters) highlighting the overall progress and major achievements of the ${intervalType}.

## KEY TECHNICAL DEVELOPMENTS

  Group/cluster the completed work thematically into ${intervalType === "month" ? "8-12" : "2-4"} different headlines,
  and concisely describe the key changes and improvements in point form. Reference
   the PR numbers that are most relevant to each headline, formatted as a Markdown link (e.g. [#123](https://github.com/${metrics.repository}/pull/123)).
 
## CLOSED ISSUES

  Group related closed issues into  ${intervalType === "month" ? "6-9" : "2-4"} different headlines and concisely summarize them.
   Reference the issue numbers that are most relevant to each headline, formatted as a Markdown link (e.g. [#123](https://github.com/${metrics.repository}/issues/123)).

## NEW ISSUES

  Group the new issues thematically into ${intervalType === "month" ? "6-9" : "2-4"} different headlines,
  and concisely describe the key challenges and problems in point form. Reference
  the issue numbers that are most relevant to each headline, formatted as a Markdown link (e.g. [#123](https://github.com/${metrics.repository}/issues/123)).

 ${
   intervalType === "month"
     ? `
## SUMMARY
Close with a short summary of the months achievements
`
     : ""
 }

GUIDELINES:
- Be factual and precise; focus on concrete changes and verifiable data.
- Use clear, accessible language for both technical and non-technical audiences.
- Ensure all information is organized into the specified sections for clarity.
- Use markdown formatting for the report.
`;
}
