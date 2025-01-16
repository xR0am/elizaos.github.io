import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { githubUsername, walletAddress } = await request.json();

  // Forward the request to the auth server
  const authServerResponse = await fetch(
    `${process.env.NEXT_PUBLIC_AUTH_SERVER_URL}/api/submit-wallet`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("authToken")}`, // Include the JWT
      },
      body: JSON.stringify({ githubUsername, walletAddress }),
    }
  );

  if (!authServerResponse.ok) {
    return NextResponse.json(
      { message: "Failed to submit wallet address" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { message: "Wallet address submitted successfully!" },
    { status: 200 }
  );
}