import { createStep, mapStep, pipe } from "../types";
import { IngestionPipelineContext } from "./context";
import { db } from "@/lib/data/db";
import { users, walletAddresses } from "@/lib/data/schema";
import { getActiveContributors as getAllContributors } from "../getActiveContributors";
import { and, eq } from "drizzle-orm";
import {
  getChainId,
  SUPPORTED_CHAINS_NAMES,
  validateAddress,
} from "@/lib/walletLinking/chainUtils";
import { fetchWalletDataFromGithub } from "../../walletLinking/fetchWalletDataFromGithub";

interface WalletAddressIngestResult {
  username: string;
  status: "cached" | "updated" | "no-wallets" | "failed";
}

const fetchWalletAddressForContributor = createStep(
  "fetchWalletAddress",
  async (
    contributor: typeof users.$inferSelect,
    context: IngestionPipelineContext,
  ): Promise<WalletAddressIngestResult> => {
    const { github, force, config, logger } = context;
    const { username } = contributor;
    try {
      const userRecord = await db.query.users.findFirst({
        where: eq(users.username, username),
        columns: {
          walletDataUpdatedAt: true,
        },
      });

      if (
        !force &&
        userRecord?.walletDataUpdatedAt &&
        Date.now() / 1000 - userRecord.walletDataUpdatedAt <
          config.walletAddresses.cacheTTL
      ) {
        logger?.info(
          `Wallet data for ${username} is fresh. Skipping GitHub fetch.`,
        );
        return { username, status: "cached" as const };
      }

      logger?.info(
        force
          ? `Forcing wallet data refresh for ${username} from GitHub.`
          : `Wallet data for ${username} is stale or missing. Fetching from GitHub.`,
      );
      // Cache is stale or doesn't exist, fetch from GitHub
      const { walletData: freshWalletData } = await fetchWalletDataFromGithub(
        username,
        github,
      );

      // Ensure user exists before any wallet data operations
      if (!userRecord) {
        logger?.info(`User ${username} not in DB, creating.`);
        await db.insert(users).values({ username }).onConflictDoNothing();
      }

      if (!freshWalletData?.wallets || freshWalletData.wallets.length === 0) {
        logger?.info(`No wallets found for ${username} on GitHub.`);
        // Update timestamp even if no wallets found to avoid repeated GitHub API calls
        await db
          .update(users)
          .set({
            walletDataUpdatedAt: Math.floor(Date.now() / 1000),
          })
          .where(eq(users.username, username));

        return { username, status: "no-wallets" as const };
      }

      logger?.info(
        `Found ${freshWalletData.wallets.length} wallets for ${username}. Processing...`,
      );

      // Update the walletAddresses table with fresh data
      // First, deactivate all existing wallet addresses for this user
      await db
        .update(walletAddresses)
        .set({
          isActive: false,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(walletAddresses.userId, username));

      let insertedCount = 0;
      let reactivatedCount = 0;
      let skippedCount = 0;

      // Insert or reactivate wallet addresses
      for (const wallet of freshWalletData.wallets) {
        // Validate chain is supported and address is valid before DB operations
        if (
          !SUPPORTED_CHAINS_NAMES.includes(wallet.chain.toLowerCase()) ||
          !validateAddress(wallet.address, wallet.chain)
        ) {
          logger?.warn(
            `Skipping invalid or unsupported wallet for ${username}: ${wallet.address} on chain ${wallet.chain}`,
          );
          skippedCount++;
          continue;
        }

        // Check if this wallet already exists
        const existingWallet = await db.query.walletAddresses.findFirst({
          where: and(
            eq(walletAddresses.userId, username),
            eq(walletAddresses.chainId, getChainId(wallet.chain)),
            eq(walletAddresses.accountAddress, wallet.address),
          ),
        });

        if (existingWallet) {
          // Reactivate existing wallet
          logger?.debug(
            `Reactivating wallet for ${username}: ${wallet.address}`,
          );
          await db
            .update(walletAddresses)
            .set({
              isActive: true,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(walletAddresses.id, existingWallet.id));
          reactivatedCount++;
        } else {
          // Insert new wallet address
          logger?.debug(
            `Inserting new wallet for ${username}: ${wallet.address}`,
          );
          await db.insert(walletAddresses).values({
            userId: username,
            chainId: getChainId(wallet.chain),
            accountAddress: wallet.address,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          insertedCount++;
        }
      }

      logger?.debug(
        `For ${username} - Inserted: ${insertedCount}, Reactivated: ${reactivatedCount}, Skipped: ${skippedCount}.`,
      );

      // Update user's wallet data timestamp
      await db
        .update(users)
        .set({
          walletDataUpdatedAt: Math.floor(Date.now() / 1000),
        })
        .where(eq(users.username, username));
      logger?.info(`Successfully processed wallet data for ${username}.`, {
        insertedCount,
        reactivatedCount,
        skippedCount,
      });
      return {
        username: contributor.username,
        status: "updated" as const,
      };
    } catch (error) {
      logger?.error(
        `Failed to ingest wallet data for user ${contributor.username}`,
        { error: String(error) },
      );
      return {
        username: contributor.username,
        status: "failed" as const,
      };
    }
  },
);

const getContributorsForWalletIngestion = createStep(
  "getActiveContributors",
  async (_, context: IngestionPipelineContext) => {
    const { dateRange, config, logger } = context;

    if (!config.walletAddresses.enabled) {
      logger?.info("Wallet address ingestion is disabled. Skipping.");
      return [];
    }

    logger?.info(
      `Fetching active contributors since ${dateRange?.startDate || "beginning"} for wallet address ingestion.`,
    );
    const queryParams = {
      dateRange: dateRange || {
        startDate: "1970-01-01",
        endDate: "2100-01-01",
      },
    };

    const activeContributors = await getAllContributors(queryParams);
    logger?.info(
      `Found ${activeContributors.length} active contributors to process.`,
    );
    return activeContributors;
  },
);

export const fetchWalletAddresses = pipe(
  getContributorsForWalletIngestion,
  mapStep(fetchWalletAddressForContributor),
  createStep("summarizeResults", (results, context) => {
    const summary = results.reduce(
      (acc, result: WalletAddressIngestResult) => {
        if (result.status) {
          acc[result.status] = (acc[result.status] || 0) + 1;
        }
        return acc;
      },
      {
        cached: 0,
        updated: 0,
        "no-wallets": 0,
        failed: 0,
      },
    );

    const successCount =
      summary.cached + summary.updated + summary["no-wallets"];
    const errorCount = summary.failed;

    context.logger?.info(
      `Wallet address ingestion complete. Success: ${successCount}, Failed: ${errorCount}.`,
      {
        cached: summary.cached,
        updated: summary.updated,
        noWallets: summary["no-wallets"],
      },
    );

    return {
      successCount,
      errorCount,
      ...summary,
    };
  }),
);
