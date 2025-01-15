import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SolanaWalletForm() {
  const [walletAddress, setWalletAddress] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/submit-wallet-address", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ walletAddress }),
      });

      if (response.ok) {
        // TODO: Show success message
      } else {
        // TODO: Show error message
      }
    } catch (error) {
      console.error("Error submitting wallet address:", error);
      // TODO: Show error message
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="text"
        placeholder="Solana wallet address"
        value={walletAddress}
        onChange={(e) => setWalletAddress(e.target.value)}
      />
      <Button type="submit">Submit</Button>
    </form>
  );
}