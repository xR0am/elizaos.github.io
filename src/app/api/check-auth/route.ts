import { NextResponse } from "next/server";

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