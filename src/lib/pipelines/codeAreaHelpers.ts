/**
 * Utility to categorize a work item (PR title or commit message)
 *
 * @param text - The PR title or commit message to categorize
 * @returns The category of the work item
 */
export function categorizeWorkItem(text: string): WorkItemType {
  const lowercaseText = text.toLowerCase();

  // Feature detection
  if (
    lowercaseText.startsWith("feat") ||
    lowercaseText.includes("feature") ||
    lowercaseText.includes("add ")
  ) {
    return "feature";
  }

  // Bug fix detection
  if (
    lowercaseText.startsWith("fix") ||
    lowercaseText.includes("fix") ||
    lowercaseText.includes("bug")
  ) {
    return "bugfix";
  }

  // Documentation detection
  if (lowercaseText.startsWith("docs") || lowercaseText.includes("document")) {
    return "docs";
  }

  // Refactoring detection
  if (
    lowercaseText.startsWith("refactor") ||
    lowercaseText.includes("refactor") ||
    lowercaseText.includes("clean") ||
    lowercaseText.includes("cleanup")
  ) {
    return "refactor";
  }

  // Test related detection
  if (lowercaseText.startsWith("test") || lowercaseText.includes("test")) {
    return "tests";
  }

  // Default category
  return "other";
} /**
 * Utility to extract area from a file path
 */
function extractAreaFromPath(path: string): string {
  const parts = path.split("/");
  let area = parts[0];

  // Handle packages directory specially
  if (parts.length > 1 && area === "packages") {
    area = `packages/${parts[1]}`;
  }

  return area;
}

export type WorkItemType =
  | "feature"
  | "bugfix"
  | "refactor"
  | "docs"
  | "tests"
  | "other";
/**
 * Utility to build a map of focus areas from files
 */
export function buildAreaMap(
  files: { path?: string; filename?: string }[],
): Map<string, number> {
  const areaMap = new Map<string, number>();

  files.forEach((file) => {
    // Use path or filename depending on which is available
    const filePath = file.path || file.filename || "";
    if (!filePath) return;

    const area = extractAreaFromPath(filePath);
    const currentCount = areaMap.get(area) || 0;
    areaMap.set(area, currentCount + 1);
  });

  return areaMap;
}
