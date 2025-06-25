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

const fetchWalletAddressForContributor = createStep(
  "fetchWalletAddress",
  async (
    contributor: typeof users.$inferSelect,
    context: IngestionPipelineContext,
  ) => {
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
        return { success: true, username };
      }

      // Cache is stale or doesn't exist, fetch from GitHub
      const { walletData: freshWalletData } = await fetchWalletDataFromGithub(
        username,
        github,
      );

      // Ensure user exists before any wallet data operations
      if (!userRecord) {
        await db.insert(users).values({ username }).onConflictDoNothing();
      }

      if (!freshWalletData?.wallets || freshWalletData.wallets.length === 0) {
        // Update timestamp even if no wallets found to avoid repeated GitHub API calls
        await db
          .update(users)
          .set({
            walletDataUpdatedAt: Math.floor(Date.now() / 1000),
          })
          .where(eq(users.username, username));

        return { success: true, username };
      }

      // Update the walletAddresses table with fresh data
      // First, deactivate all existing wallet addresses for this user
      await db
        .update(walletAddresses)
        .set({
          isActive: false,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(walletAddresses.userId, username));

      // Insert or reactivate wallet addresses
      for (const wallet of freshWalletData.wallets) {
        // Validate chain is supported and address is valid before DB operations
        if (
          !SUPPORTED_CHAINS_NAMES.includes(wallet.chain.toLowerCase()) ||
          !validateAddress(wallet.address, wallet.chain)
        ) {
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
          await db
            .update(walletAddresses)
            .set({
              isActive: true,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(walletAddresses.id, existingWallet.id));
        } else {
          // Insert new wallet address
          await db.insert(walletAddresses).values({
            userId: username,
            chainId: getChainId(wallet.chain),
            accountAddress: wallet.address,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // Update user's wallet data timestamp
      await db
        .update(users)
        .set({
          walletDataUpdatedAt: Math.floor(Date.now() / 1000),
        })
        .where(eq(users.username, username));
      return { success: true, username: contributor.username };
    } catch (error) {
      logger?.error(
        `Failed to ingest wallet data for user ${contributor.username}`,
        { error: String(error) },
      );
      return { success: false, username: contributor.username };
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
    const successCount = results.filter((r) => r.success).length;
    const errorCount = results.length - successCount;

    context.logger?.info(
      `Wallet address ingestion complete. Success: ${successCount}, Failed: ${errorCount}.`,
    );

    return { successCount, errorCount };
  }),
);
