import { GitHubClient } from "@/lib/data/github";
import {
  parseWalletLinkingDataFromReadme,
  WalletLinkingData,
} from "./readmeUtils";
import { decodeBase64 } from "../decode";
import { db } from "@/lib/data/db";
import { users, walletAddresses } from "@/lib/data/schema";
import { eq, and } from "drizzle-orm";
import {
  getChainId,
  validateAddress,
  SUPPORTED_CHAINS_NAMES,
} from "@/lib/walletLinking/chainUtils";

const CACHE_TTL_SECONDS = 12 * 60 * 60; // 12 hours

interface WalletDataResponse {
  walletData: WalletLinkingData | null;
  profileRepoExists: boolean;
}

/**
 * Fetches a user's profile README from GitHub and parses the wallet linking data.
 * This is the core function for fetching data from GitHub without caching.
 * Uses unauthenticated GitHub API.
 *
 * @param username The GitHub username whose profile README is to be fetched
 * @returns A promise resolving to wallet linking data or null if not found/error
 */
async function fetchWalletDataFromGithub(
  username: string,
  githubClient: GitHubClient,
): Promise<WalletDataResponse> {
  try {
    const repo = await githubClient.getRepo(username, username);
    if (!repo) {
      return { walletData: null, profileRepoExists: false };
    }

    const readmeData = await githubClient.fetchFileContent(
      username,
      username,
      "README.md",
    );

    if (!readmeData?.content) {
      return { walletData: null, profileRepoExists: true };
    }
    const decodedReadmeText = decodeBase64(readmeData.content);
    const walletData = parseWalletLinkingDataFromReadme(decodedReadmeText);
    return { walletData: walletData, profileRepoExists: true };
  } catch (err) {
    console.error(
      `Exception fetching or parsing README for user ${username}:`,
      err,
    );
    return { walletData: null, profileRepoExists: false };
  }
}

/**
 * Retrieves user wallet data, utilizing a cache first, then falling back to GitHub.
 * Updates the cache after fetching from GitHub.
 *
 * @param username The GitHub username
 * @returns A promise resolving to wallet linking data or null
 */
export async function ingestWalletDataForUser(
  username: string,
  githubClient: GitHubClient,
): Promise<WalletLinkingData | null> {
  try {
    // Get user record to check wallet data update timestamp
    const userRecord = await db.query.users.findFirst({
      where: eq(users.username, username),
      columns: {
        walletDataUpdatedAt: true,
      },
    });

    if (
      userRecord?.walletDataUpdatedAt &&
      Date.now() / 1000 - userRecord.walletDataUpdatedAt < CACHE_TTL_SECONDS
    ) {
      console.log(
        `Wallet data for ${username} is fresh. Skipping GitHub fetch.`,
      );
      return null;
    }

    // Cache is stale or doesn't exist, fetch from GitHub
    const { walletData: freshWalletData, profileRepoExists } =
      await fetchWalletDataFromGithub(username, githubClient);

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

      return null;
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

    return freshWalletData;
  } catch (error) {
    console.error(`Error in ingestWalletDataForUser for ${username}:`, error);
    return null;
  }
}
