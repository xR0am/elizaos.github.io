import { GitHubClient } from "@/lib/data/github";
import { decodeBase64 } from "@/lib/decode";
import {
  parseWalletLinkingDataFromReadme,
  WalletLinkingData,
} from "@/lib/walletLinking/readmeUtils";

interface WalletDataResponse {
  walletData: WalletLinkingData | null;
  profileRepoExists: boolean;
}

export async function fetchWalletDataFromGithub(
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
      { error: String(err) },
    );
    return { walletData: null, profileRepoExists: false };
  }
}
