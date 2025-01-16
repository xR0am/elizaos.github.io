import { NextResponse } from "next/server";
import { Octokit } from "octokit";

export async function POST(request: Request) {
  const { githubUsername, walletAddress } = await request.json();

  if (!githubUsername || !walletAddress) {
    return NextResponse.json(
      { message: "Missing required fields" },
      { status: 400 }
    );
  }

  try {
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    const csvFilePath = "data/github-solana-mapping.csv";

    let existingContent = "";
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner: "xR0am",
        repo: "elizaos.github.io",
        path: csvFilePath,
      });

      if (Array.isArray(data)) {
        throw new Error("Expected a file, but got a directory.");
      }

      if (data.type !== "file") {
        throw new Error("Expected a file, but got a non-file type.");
      }

      // Safely access the content property
      if ("content" in data) {
        existingContent = Buffer.from(data.content, "base64").toString("utf8");
      }
    } catch (error) {
        console.error("Error fetching existing CSV file:", error);
        // File doesn't exist yet, so we'll create it
      }

    const newLine = `${githubUsername},${walletAddress}\n`;
    const newContent = existingContent + newLine;

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: "xR0am",
      repo: "elizaos.github.io",
      path: csvFilePath,
      message: `Add ${githubUsername}'s Solana wallet address`,
      content: Buffer.from(newContent).toString("base64"),
      sha: existingContent ? "existing-file-sha" : undefined,
    });

    return NextResponse.json(
      { message: "Wallet address submitted successfully!" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating CSV file:", error);
    return NextResponse.json(
      { message: "Failed to submit wallet address" },
      { status: 500 }
    );
  }
}