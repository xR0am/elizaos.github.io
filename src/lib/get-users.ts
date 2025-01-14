import { readFile } from "fs/promises";
import path from "path";
import { UserFocusAreaData } from "@/types/user-profile";
import { FOCUS_AREAS_PATH } from "@/config";

export async function getUsers(): Promise<UserFocusAreaData[]> {
  try {
    const focusAreasPath = path.join(process.cwd(), FOCUS_AREAS_PATH);
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
        throw new Error(`Focus areas file not found at: ${FOCUS_AREAS_PATH}`);
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
