/**
 * Generate a monthly project analysis report
 */
import { AISummaryConfig } from "./config";
import { callAIService } from "./callAIService";
import { IntervalType, toDateString } from "@/lib/date-utils";
import { getProjectMetrics, WorkItemType, ProjectMetrics } from "./queries";

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
  items?: any[];
  mergedThisPeriod?: number;
}

export interface IssueMetrics {
  total: number;
  opened: number;
  closed: number;
  items?: any[];
  closedThisPeriod?: any[];
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

export async function generateMonthlyProjectAnalysis(
  metrics: ProjectMetrics,
  config: AISummaryConfig,
  dateInfo: { startDate: string }
): Promise<string | null> {
  const apiKey = config.apiKey;
  if (!apiKey) {
    throw new Error("No API key for AI summary generation");
  }

  try {
    // Format the data for the AI prompt
    const prompt = formatMonthlyAnalysisPrompt(metrics, dateInfo);

    // Get analysis from AI model
    return await callAIService(prompt, config, { maxTokens: 600 });
  } catch (error) {
    console.error(`Error generating monthly project analysis:`, error);
    return null;
  }
}

/**
 * Format project metrics into a structured prompt for monthly analysis
 */
function formatMonthlyAnalysisPrompt(
  metrics: ProjectMetrics,
  dateInfo: { startDate: string }
): string {
  const date = new Date(dateInfo.startDate);
  const monthName = date.toLocaleString("default", { month: "long" });
  const year = date.getFullYear();

  // Format top active areas
  const topActiveAreas = metrics.focusAreas
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((area) => `${area.area}: ${area.count} changes`);

  const formatCompletedItems = (type: WorkItemType) =>
    metrics.completedItems
      .filter((item) => item.type === type)
      .map((item) => `${item.title} (PR #${item.prNumber})`)
      .join("\n- ") || "None";
  // Format completed items for better clarity
  const completedFeatures = formatCompletedItems("feature");
  const completedBugfixes = formatCompletedItems("bugfix");
  const completedRefactors = formatCompletedItems("refactor");
  const completedDocs = formatCompletedItems("docs");
  const completedTests = formatCompletedItems("tests");
  const completedOtherWork = formatCompletedItems("other");
  return `
 We are ElizaOS. Our mission is to develop an extensible, modular, open-source AI agent framework that thrives across both Web2 and Web3 ecosystems. We see AI agents as the key stepping stones toward AGI, enabling increasingly autonomous and capable systems.

Core Philosophy
  Autonomy & Adaptability: Agents should learn, reason, and adapt across diverse tasks without human intervention.
  Modularity & Composability: AI architectures should be modular, allowing for iterative improvements and robust scalability.
  Decentralization & Open Collaboration: AI systems should move beyond centralized control towards distributed intelligence and community-driven progress.

Generate a detailed yet concise monthly report for elizaOS (open-source AI agent framework) for ${monthName} ${year}.
  
  COMPLETED WORK FOR CONTEXT:
  
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

  Format the report with the following sections:

## OVERVIEW 
  Provide a high-level summary (max 280 characters) highlighting the overall progress and major achievements of the month.

## PROJECT METRICS
  Include the following quantitative details:
  - PRs: ${metrics.pullRequests.mergedPRs.length} merged PR's, ${
    metrics.pullRequests.newPRs.length
  } new PRs
  - Issues: ${metrics.issues.newIssues.length} new issues, ${
    metrics.issues.closedIssues.length
  } closed issues
  - Unique Contributors: ${metrics.uniqueContributors}
  - Code Changes: +${metrics.codeChanges.additions}/-${
    metrics.codeChanges.deletions
  } lines across ${metrics.codeChanges.files} files
  - Total Commits: ${metrics.codeChanges.commitCount || 0}
  - Most Active Contributors: ${metrics.topContributors
    .map((contributor) => contributor.username)
    .join(", ")}



## KEY TECHNICAL DEVELOPMENTS
 Summarize the 3-5 most significant/impactful changes merged this month with specific PR references.
    ### Describe new features and their functionality.
    ### Explain how bug fixes have improved system stability.
    ### Discuss refactoring efforts and documentation updates that enhance maintainability and developer experience.

## SUMMARY
  Close with a short summary of the month's accomplishments.

<end_report>

GUIDELINES:
- Be factual and precise; focus on concrete changes and verifiable data.
- Use clear, accessible language for both technical and non-technical audiences.
- Ensure all information is organized into the specified sections for clarity.
`;
}
