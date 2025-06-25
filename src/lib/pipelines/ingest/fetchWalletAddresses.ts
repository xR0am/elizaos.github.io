import { createStep } from "../types";
import { IngestionPipelineContext } from "./context";
import { db } from "@/lib/data/db";
import { users } from "@/lib/data/schema";
import { ingestWalletDataForUser } from "@/lib/walletLinking/ingestion";
import { gte } from "drizzle-orm";

export const fetchWalletAddresses = createStep(
  "FetchWalletAddresses",
  async (_, context: IngestionPipelineContext) => {
    const { logger, github, dateRange, force } = context;
    logger?.info(
      `Starting wallet address ingestion for users updated since ${dateRange?.startDate}`,
    );

    const allUsers = await db
      .select({ username: users.username })
      .from(users)
      .where(
        !force && dateRange?.startDate
          ? gte(users.lastUpdated, dateRange.startDate)
          : undefined,
      );
    logger?.info(`Found ${allUsers.length} users to process.`);

    let successCount = 0;
    let errorCount = 0;

    for (const user of allUsers) {
      try {
        await ingestWalletDataForUser(user.username, github);
        successCount++;
      } catch (error) {
        logger?.error(
          `Failed to ingest wallet data for user ${user.username}`,
          { error: String(error) },
        );
        errorCount++;
      }
    }

    logger?.info(
      `Wallet address ingestion complete. Success: ${successCount}, Failed: ${errorCount}.`,
    );

    return { successCount, errorCount };
  },
);
