"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import { authConfig } from "@/lib/auth";

export function SignInButton() {
  const { data: session } = useSession();

  if (session) {
    return (
      <div>
        <p>Welcome, {session.user?.name}</p>
        <button onClick={() => signOut({ callbackUrl: authConfig.baseUrl })}>
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() =>
        signIn("github", {
          callbackUrl: authConfig.baseUrl,
        })
      }
    >
      Sign in with GitHub
    </button>
  );
}