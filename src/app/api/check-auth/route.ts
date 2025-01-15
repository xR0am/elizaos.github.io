import { NextResponse } from "next/server";

export const revalidate = 60; // Revalidate every 60 seconds

export async function GET(request: Request) {
  const cookies = request.headers.get("cookie");
  const githubUsername = cookies?.split(";")
    .find(c => c.trim().startsWith("github_username="))
    ?.split("=")[1];

  const isAuthenticated = Boolean(githubUsername);

  if (isAuthenticated) {
    return NextResponse.json({ authenticated: true });
  } else {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}