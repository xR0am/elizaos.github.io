import { readFileSync } from "fs";
import path from "path";
import { UserFocusAreaData } from "@/types/user-profile";

export function getUsers(): UserFocusAreaData[] {
  const focusAreasPath = path.join(process.cwd(), "data/focus_areas2.json");
  const focusAreasData = JSON.parse(readFileSync(focusAreasPath, "utf8"));
  return focusAreasData.contributors;
}

export function getUserById(id: string): UserFocusAreaData | undefined {
  return getUsers().find((user) => user.username === id);
}
