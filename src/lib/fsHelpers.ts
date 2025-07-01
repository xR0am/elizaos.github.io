import * as fs from "fs/promises";
import * as path from "path";

/**
 * Ensures a directory exists, creating it and all parent directories if needed
 */
export async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Writes data to a file, ensuring the parent directory exists
 */
export async function writeToFile(filePath: string, data: string) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, data, "utf-8");
}

/**
 * Generates a file path for repository data
 */
export function getRepoFilePath(
  outputDir: string,
  repoId: string,
  dataType: string,
  intervalType: string,
  fileName: string,
) {
  const safeRepoId = repoId.replace("/", "_");
  return path.join(outputDir, safeRepoId, dataType, intervalType, fileName);
}

/**
 * Generates a file path for overall summary data
 */
export function getOverallSummaryFilePath(
  outputDir: string,
  intervalType: string,
  fileName: string,
) {
  return path.join(outputDir, "summaries", intervalType, fileName);
}
