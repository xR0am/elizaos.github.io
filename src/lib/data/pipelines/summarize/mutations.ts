import { IntervalType } from "@/lib/date-utils";
import { db } from "../../db";
import { userSummaries, repoSummaries } from "../../schema";

/**
 * Store daily summary in the database
 */
export async function storeDailySummary(
  username: string,
  date: string,
  summary: string,
  intervalType: IntervalType
): Promise<void> {
  const id = `${username}_${intervalType}_${date}`;

  await db
    .insert(userSummaries)
    .values({
      id,
      username,
      date,
      summary,
      intervalType,
      lastUpdated: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: userSummaries.id,
      set: {
        summary,
        lastUpdated: new Date().toISOString(),
      },
    });
}

/**
 * Store repository summary in the database
 */
export async function storeRepoSummary(
  repoId: string,
  date: string,
  summary: string,
  intervalType: IntervalType
): Promise<void> {
  const id = `${repoId}_${intervalType}_${date}`;

  await db
    .insert(repoSummaries)
    .values({
      id,
      repoId,
      date,
      summary,
      intervalType,
      lastUpdated: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: repoSummaries.id,
      set: {
        summary,
        lastUpdated: new Date().toISOString(),
      },
    });
} // --- Helper functions ---
