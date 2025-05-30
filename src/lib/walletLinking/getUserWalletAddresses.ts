import * as githubService from "./githubService";
import {
  parseWalletLinkingDataFromReadme,
  WalletLinkingData,
} from "./readmeUtils";
import { decodeBase64 } from "../decode";

export interface WalletLinkingResponse {
  walletData: WalletLinkingData | null;
  readmeContent: string | null;
  readmeSha: string | undefined;
  profileRepoExists: boolean;
}

/**
 * Fetches a user's profile README from GitHub and parses the wallet linking data.
 *
 * @param token GitHub token for authentication
 * @param username The GitHub username whose profile README is to be fetched
 * @returns A promise resolving to an object with wallet data, README details, and repo status
 */
export async function fetchUserWalletAddressesAndReadme(
  token: string,
  username: string,
): Promise<WalletLinkingResponse> {
  try {
    // Check if the profile repository exists
    const repo = await githubService.getRepo(token, username, username);
    if (!repo) {
      return {
        walletData: null,
        readmeContent: null,
        readmeSha: undefined,
        profileRepoExists: false,
      };
    }

    // If repo exists, attempt to get README.md
    const fileData = await githubService.getFileContent(
      token,
      username,
      username,
      "README.md",
    );

    if (fileData && fileData.content) {
      const decodedContent = decodeBase64(fileData.content);
      const walletData = parseWalletLinkingDataFromReadme(decodedContent);

      return {
        walletData,
        readmeContent: decodedContent,
        readmeSha: fileData.sha,
        profileRepoExists: true,
      };
    } else {
      return {
        walletData: null,
        readmeContent: "",
        readmeSha: fileData?.sha,
        profileRepoExists: true,
      };
    }
  } catch (error) {
    console.error(`Error fetching README data for user ${username}:`, error);
    return {
      walletData: null,
      readmeContent: null,
      readmeSha: undefined,
      profileRepoExists: false,
    };
  }
}

/**
 * Fetches a user's profile README from GitHub and extracts wallet linking data.
 * This is a simplified version that doesn't require authentication and only returns wallet data.
 *
 * @param username The GitHub username whose profile README is to be fetched
 * @returns A promise resolving to wallet linking data or null if not found/error
 */
export async function getUserWalletData(
  username: string,
): Promise<WalletLinkingData | null> {
  try {
    const readmeUrl = `https://api.github.com/repos/${username}/${username}/contents/README.md`;
    const readmeResponse = await fetch(readmeUrl);
    if (!readmeResponse.ok) {
      throw new Error("Failed to fetch README.md");
    }
    const readmeData = await readmeResponse.json();
    const decodedReadmeText = decodeBase64(readmeData.content);

    const walletData = parseWalletLinkingDataFromReadme(decodedReadmeText);
    return walletData;
  } catch (err: unknown) {
    console.error(`Error fetching README data for user ${username}:`, err);
    return null;
  }
}
