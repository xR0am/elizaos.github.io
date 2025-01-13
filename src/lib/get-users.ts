import { readFile } from "fs/promises";
import path from "path";
import { UserFocusAreaData } from "@/types/user-profile";

export async function getUsers(): Promise<UserFocusAreaData[]> {
  const focusAreasPath = path.join(process.cwd(), "data/focus_areas2.json");
  const focusAreasData = JSON.parse(await readFile(focusAreasPath, "utf8"));
  return focusAreasData.contributors;
}

export async function getUserById(
  id: string
): Promise<UserFocusAreaData | undefined> {
  const users = await getUsers();
  return users.find((user) => user.username === id);
}
