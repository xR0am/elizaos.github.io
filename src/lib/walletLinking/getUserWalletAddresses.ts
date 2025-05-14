import * as githubService from "./githubService";
import { parseWalletAddressesFromReadme } from "./readmeUtils";

/**
 * Fetches a user's profile README from GitHub, parses wallet addresses,
 * and returns them along with the README content, SHA, and an indicator of repo existence.
 *
 * @param token GitHub token for authentication. Required by underlying githubService calls.
 * @param username The GitHub username whose profile README is to be fetched.
 * @returns A promise resolving to an object with wallet addresses, README details, and repo status.
 */
export async function fetchUserWalletAddressesAndReadme(
  token: string,
  username: string,
) {
  try {
    // Check if the profile repository (username/username) exists first
    const repo = await githubService.getRepo(token, username, username); // owner and repo name are the username for profile READMEs
    if (!repo) {
      return {
        ethAddress: "",
        solAddress: "",
        readmeContent: null, // No repo means no README
        readmeSha: undefined,
        profileRepoExists: false,
      };
    }

    // If repo exists, profileRepoExists is true. Now attempt to get README.md
    const fileData = await githubService.getFileContent(
      token,
      username, // owner
      username, // repo
      "README.md",
    );

    if (fileData && fileData.content) {
      const binaryString = atob(fileData.content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const decodedContent = new TextDecoder().decode(bytes);
      const { ethAddress, solAddress } =
        parseWalletAddressesFromReadme(decodedContent);

      return {
        ethAddress,
        solAddress,
        readmeContent: decodedContent,
        readmeSha: fileData.sha,
        profileRepoExists: true,
      };
    } else {
      // Repo exists, but README.md is not found, or is empty, or getFileContent returned no actual content string
      // Aligning with useProfileEditor's original behavior of setting readmeContent to "" in such cases.
      return {
        ethAddress: "",
        solAddress: "",
        readmeContent: "",
        readmeSha: fileData?.sha, // SHA might be present if fileData object exists but content is empty
        profileRepoExists: true, // Repo itself was found
      };
    }
  } catch (error) {
    console.error(`Error fetching README data for user ${username}:`, error);
    // This catch block is for unexpected errors (e.g., network issues, auth problems not caught by githubService returning null)
    // It's a fallback. The specific checks above handle "not found" cases more gracefully.
    return {
      ethAddress: "",
      solAddress: "",
      readmeContent: null, // Indicate error by null content
      readmeSha: undefined,
      profileRepoExists: false, // If an unexpected error occurs, safest to assume failure in confirming repo/readme status.
    };
  }
}
