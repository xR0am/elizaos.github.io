import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const revalidate = 60; // Revalidate every 60 seconds

export async function POST(request: Request) {
  const { walletAddress } = await request.json();

  try {
    const username = ""; // TODO: Get the GitHub username from session or cookie

    const csvLine = `${username},${walletAddress}\n`;
    const csvFilePath = path.join(process.cwd(), "data", "github-solana-mapping.csv");

    fs.appendFileSync(csvFilePath, csvLine);

    return NextResponse.json({ message: "Wallet address stored successfully" });
  } catch (error) {
    console.error("Error storing wallet address:", error);
    return NextResponse.json({ error: "Failed to store wallet address" }, { status: 500 });
  }
}