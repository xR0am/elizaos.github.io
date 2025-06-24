import { createStep } from "../types";
import { IngestionPipelineContext } from "./context";
import { db } from "@/lib/data/db";
import { users } from "@/lib/data/schema";
import { ingestWalletDataForUser } from "@/lib/walletLinking/ingestion";

export const fetchWalletAddresses = createStep(
  "FetchWalletAddresses",
  async (_, context: IngestionPipelineContext) => {
    const { logger, github } = context;
    logger?.info("Starting wallet address ingestion for all users.");

    const allUsers = await db.select({ username: users.username }).from(users);
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
