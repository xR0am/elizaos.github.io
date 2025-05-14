"use client";

import { useState, useEffect, FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { isAddress } from "viem"; // For ETH address validation

interface WalletLinkFormProps {
  initialEthAddress?: string;
  initialSolAddress?: string;
  onSubmit: (ethAddress: string, solAddress: string) => Promise<void>;
  isProcessing: boolean;
}

// Basic regex for Solana address (Base58, 32-44 chars)
// For more robust validation, consider @solana/web3.js PublicKey.isOnCurve or similar
const SOL_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function WalletLinkForm({
  initialEthAddress = "",
  initialSolAddress = "",
  onSubmit,
  isProcessing,
}: WalletLinkFormProps) {
  const [ethAddress, setEthAddress] = useState(initialEthAddress);
  const [solAddress, setSolAddress] = useState(initialSolAddress);

  const [ethAddressError, setEthAddressError] = useState("");
  const [solAddressError, setSolAddressError] = useState("");

  const [isEthValid, setIsEthValid] = useState(true);
  const [isSolValid, setIsSolValid] = useState(true);

  // Determine if this is an update operation based on initial props
  const isUpdateOperation = !!(initialEthAddress || initialSolAddress);

  useEffect(() => {
    setEthAddress(initialEthAddress);
    if (initialEthAddress === "" || isAddress(initialEthAddress)) {
      setIsEthValid(true);
      setEthAddressError("");
    } else {
      setIsEthValid(false);
      // Error will be set on change by the other effect if user types
    }
  }, [initialEthAddress]);

  useEffect(() => {
    setSolAddress(initialSolAddress);
    if (initialSolAddress === "" || SOL_ADDRESS_REGEX.test(initialSolAddress)) {
      setIsSolValid(true);
      setSolAddressError("");
    } else {
      setIsSolValid(false);
      // Error will be set on change by the other effect if user types
    }
  }, [initialSolAddress]);

  useEffect(() => {
    if (ethAddress === "") {
      setIsEthValid(true);
      setEthAddressError("");
    } else {
      const isValid = isAddress(ethAddress);
      setIsEthValid(isValid);
      setEthAddressError(isValid ? "" : "Invalid Ethereum address.");
    }
  }, [ethAddress]);

  useEffect(() => {
    if (solAddress === "") {
      setIsSolValid(true);
      setSolAddressError("");
    } else {
      const isValid = SOL_ADDRESS_REGEX.test(solAddress);
      setIsSolValid(isValid);
      setSolAddressError(isValid ? "" : "Invalid Solana address format.");
    }
  }, [solAddress]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Double check validity before submitting, though button should be disabled
    if (!isEthValid || !isSolValid) {
      return;
    }
    await onSubmit(ethAddress, solAddress);
  };

  const hasValuesChanged =
    ethAddress !== initialEthAddress || solAddress !== initialSolAddress;
  const canSubmit =
    isEthValid && isSolValid && !isProcessing && hasValuesChanged;

  const buttonTextBase = isUpdateOperation ? "Update" : "Save";
  const buttonText = isProcessing
    ? `${buttonTextBase === "Update" ? "Updating" : "Saving"}...`
    : `${buttonTextBase} Wallet Addresses`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="ethAddress">Ethereum Address</Label>
        <Input
          id="ethAddress"
          type="text"
          value={ethAddress}
          onChange={(e) => setEthAddress(e.target.value)}
          placeholder="0x..."
          disabled={isProcessing}
          className={ethAddressError ? "border-destructive" : ""}
        />
        {ethAddressError && (
          <p className="text-sm text-destructive">{ethAddressError}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="solAddress">Solana Address</Label>
        <Input
          id="solAddress"
          type="text"
          value={solAddress}
          onChange={(e) => setSolAddress(e.target.value)}
          placeholder="Your Solana address (e.g., So1...)"
          disabled={isProcessing}
          className={solAddressError ? "border-destructive" : ""}
        />
        {solAddressError && (
          <p className="text-sm text-destructive">{solAddressError}</p>
        )}
      </div>
      <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
        {isProcessing ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        {buttonText}
      </Button>
    </form>
  );
}
