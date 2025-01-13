import { readFile } from "fs/promises";
import path from "path";
import { UserFocusAreaData } from "@/types/user-profile";

export async function getUsers(): Promise<UserFocusAreaData[]> {
  try {
    const focusAreasPath = path.join(process.cwd(), "data/historical.json");
    const focusAreasData = JSON.parse(await readFile(focusAreasPath, "utf8"));
    return focusAreasData.contributors || [];
  } catch (error) {
    console.error('Error reading users data:', error);
    return [];
  }
}

export async function getUserById(
  id: string
): Promise<UserFocusAreaData | undefined> {
  try {
    const users = await getUsers();
    return users.find((user) => user.username === id);
  } catch (error) {
    console.error('Error getting user by id:', error);
    return undefined;
  }
}
