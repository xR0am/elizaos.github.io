const ALL_TIME_DATA_PATH = "data/analysis.json";
const WEEKLY_DATA_PATH = "data/weekly_analysis.json";
const MONTHLY_DATA_PATH = "data/monthly_analysis.json";

import { readFile } from "fs/promises";
import path from "path";
import { UserFocusAreaData } from "@/types/user-profile";

export async function getUsers(
  period: "all" | "weekly" | "monthly" = "all"
): Promise<UserFocusAreaData[]> {
  try {
    const dataPath = {
      all: ALL_TIME_DATA_PATH,
      weekly: WEEKLY_DATA_PATH,
      monthly: MONTHLY_DATA_PATH,
    }[period];

    const focusAreasPath = path.join(process.cwd(), dataPath);
    const rawData = await readFile(focusAreasPath, "utf8");

    try {
      const focusAreasData = JSON.parse(rawData);

      if (!focusAreasData || !Array.isArray(focusAreasData.contributors)) {
        throw new Error("Invalid focus areas data format");
      }

      return focusAreasData.contributors;
    } catch (parseError: unknown) {
      const message =
        parseError instanceof Error ? parseError.message : String(parseError);
      throw new Error(`Failed to parse focus areas data: ${message}`);
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      if ("code" in error && error.code === "ENOENT") {
        throw new Error(
          `Focus areas file not found at: ${ALL_TIME_DATA_PATH}, ${WEEKLY_DATA_PATH}, or ${MONTHLY_DATA_PATH}`
        );
      }
      throw new Error(`Failed to load focus areas data: ${error.message}`);
    }
    throw new Error(`Failed to load focus areas data: ${String(error)}`);
  }
}

export async function getUserById(
  id: string
): Promise<UserFocusAreaData | undefined> {
  const users = await getUsers();
  return users.find((user) => user.username === id);
}
