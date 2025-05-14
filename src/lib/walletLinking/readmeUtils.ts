export interface WalletAddresses {
  ethAddress: string;
  solAddress: string;
}

const ETH_REGEX = /Ethereum:.*?<code>(.*?)<\/code>/s;
const SOL_REGEX = /Solana:.*?<code>(.*?)<\/code>/s;
const NOT_SET_PLACEHOLDER = "Not set";

const WALLET_SECTION_BEGIN_MARKER = "<!-- BEGIN ELIZAOS_PROFILE_WALLETS -->";
const WALLET_SECTION_END_MARKER = "<!-- END ELIZAOS_PROFILE_WALLETS -->";

/**
 * Parses Ethereum and Solana wallet addresses from a given README content string.
 * Addresses are expected to be within specific HTML structures.
 * @param readmeContent The string content of the README file.
 * @returns An object containing the extracted ethAddress and solAddress.
 *          Returns empty strings if addresses are not found or match the "Not set" placeholder.
 */
export function parseWalletAddressesFromReadme(
  readmeContent: string,
): WalletAddresses {
  const startIndex = readmeContent.indexOf(WALLET_SECTION_BEGIN_MARKER);
  const endIndex = readmeContent.indexOf(WALLET_SECTION_END_MARKER);

  let walletSectionContent = "";
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    walletSectionContent = readmeContent.substring(
      startIndex + WALLET_SECTION_BEGIN_MARKER.length,
      endIndex,
    );
  }

  if (!walletSectionContent) {
    return { ethAddress: "", solAddress: "" };
  }

  const ethMatch = walletSectionContent.match(ETH_REGEX);
  const solMatch = walletSectionContent.match(SOL_REGEX);

  const ethAddress =
    ethMatch && ethMatch[1] && ethMatch[1].trim() !== NOT_SET_PLACEHOLDER
      ? ethMatch[1].trim()
      : "";
  const solAddress =
    solMatch && solMatch[1] && solMatch[1].trim() !== NOT_SET_PLACEHOLDER
      ? solMatch[1].trim()
      : "";

  return { ethAddress, solAddress };
}

/**
 * Generates an updated README content string with the provided wallet addresses.
 * It will replace an existing wallet section if found, or append a new one.
 * @param currentReadme The current content of the README file.
 * @param ethAddress The Ethereum address to include (can be empty).
 * @param solAddress The Solana address to include (can be empty).
 * @returns The updated README content string.
 */
export function generateUpdatedReadmeWithWalletInfo(
  currentReadme: string,
  ethAddress: string,
  solAddress: string,
): string {
  const newEthAddress = ethAddress.trim();
  const newSolAddress = solAddress.trim();

  const walletSection = `
${WALLET_SECTION_BEGIN_MARKER}
<div id="elizaos-linked-wallets" style="margin-top: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
  <h3>My Wallet Addresses</h3>
  <p><strong>Ethereum:</strong> <code>${newEthAddress || NOT_SET_PLACEHOLDER}</code></p>
  <p><strong>Solana:</strong> <code>${newSolAddress || NOT_SET_PLACEHOLDER}</code></p>
</div>
${WALLET_SECTION_END_MARKER}
`;

  const startIndex = currentReadme.indexOf(WALLET_SECTION_BEGIN_MARKER);
  const endIndex = currentReadme.indexOf(WALLET_SECTION_END_MARKER);

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    return (
      currentReadme.substring(0, startIndex) +
      walletSection.trim() + // Use trim to avoid double newlines if walletSection has leading/trailing ones
      currentReadme.substring(endIndex + WALLET_SECTION_END_MARKER.length)
    );
  } else {
    const separator =
      currentReadme.trim() && !currentReadme.endsWith("\n")
        ? "\n\n" // Add two newlines if content exists and doesn't end with one
        : currentReadme.trim()
          ? "\n" // Add one newline if content exists and ends with one (or for consistency)
          : ""; // No separator if readme is empty
    return currentReadme.trim() + separator + walletSection.trim();
  }
}
