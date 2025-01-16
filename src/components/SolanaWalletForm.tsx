"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

const SolanaWalletForm = () => {
  const { data: session } = useSession();
  const [walletAddress, setWalletAddress] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session || !session.user?.email) {
      setMessage("You must be signed in to submit a wallet address.");
      return;
    }

    try {
      const response = await fetch("/api/submit-wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          githubUsername: session.user.email,
          walletAddress,
        }),
      });

      if (response.ok) {
        setMessage("Wallet address submitted successfully!");
      } else {
        setMessage("Failed to submit wallet address.");
      }
    } catch (error) {
      console.error("Error submitting wallet address:", error);
      setMessage("An error occurred. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Solana Wallet Address:
        <input
          type="text"
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          required
        />
      </label>
      <button type="submit">Submit</button>
      {message && <p>{message}</p>}
    </form>
  );
};

export default SolanaWalletForm;