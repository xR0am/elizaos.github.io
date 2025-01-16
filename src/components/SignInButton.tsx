"use client";
import { signIn, signOut, useSession } from "next-auth/react";

export function SignInButton() {
  const { data: session } = useSession();

  if (session) {
    return (
      <div>
        <p>Welcome, {session.user?.name}</p>
        <button onClick={() => signOut()}>Sign Out</button>
      </div>
    );
  }

  return <button onClick={() => signIn("github")}>Sign in with GitHub</button>;
}