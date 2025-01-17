"use client";

import { SessionProvider } from "next-auth/react";
import { SignInButton } from "@/components/SignInButton";

export default function AuthButtonWrapper() {
  return (
    <SessionProvider basePath="https://elizaos-github-io.vercel.app">
      <SignInButton /> {/* Only wrap the SignInButton with SessionProvider */}
    </SessionProvider>
  );
}