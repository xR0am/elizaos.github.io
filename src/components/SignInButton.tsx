"use client";

import { signIn } from "next-auth/react";

const SignInButton = () => {
  return (
    <button onClick={() => signIn("github")}>Sign in with GitHub</button>
  );
};

export default SignInButton;