"use client"; // Mark this as a Client Component

import { SessionProvider } from "next-auth/react";
import { SignInButton } from "@/components/SignInButton";

export default function AuthButtonWrapper() {
  return (
    <SessionProvider>
      <SignInButton /> {/* Only wrap the SignInButton with SessionProvider */}
    </SessionProvider>
  );
}