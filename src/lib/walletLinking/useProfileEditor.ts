"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import * as githubService from "@/lib/walletLinking/githubService";
import {
  generateUpdatedReadmeWithWalletInfo,
  LinkedWallet,
  WalletLinkingData,
  getWalletAddressForChain,
  LinkedWalletSchema,
} from "@/lib/walletLinking/readmeUtils";
import { fetchUserWalletAddressesAndReadme } from "@/lib/walletLinking/getUserWalletAddresses";
import { z } from "zod";

export function useProfileEditor() {
  const { user, token, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [readmeContent, setReadmeContent] = useState<string | null>(null);
  const [readmeSha, setReadmeSha] = useState<string | undefined>(undefined);
  const [profileRepoExists, setProfileRepoExists] = useState<boolean | null>(
    null,
  );
  const [walletData, setWalletData] = useState<WalletLinkingData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchProfileData = useCallback(
    async (currentLogin: string, currentToken: string) => {
      setPageLoading(true);
      setError(null);
      try {
        const data = await fetchUserWalletAddressesAndReadme(
          currentToken,
          currentLogin,
        );

        setProfileRepoExists(data.profileRepoExists);
        setReadmeContent(data.readmeContent === null ? "" : data.readmeContent);
        setReadmeSha(data.readmeSha);
        setWalletData(data.walletData);
      } catch (err: unknown) {
        console.error("Error in fetchProfileData:", err);
        setError(
          err instanceof Error
            ? err.message || "Failed to load profile data."
            : "Unknown error loading profile data.",
        );
        setProfileRepoExists(false);
        setReadmeContent("");
        setReadmeSha(undefined);
        setWalletData(null);
      }
      setPageLoading(false);
    },
    [],
  );

  useEffect(() => {
    if (authLoading) return;
    if (!token || !user || !user.login) {
      if (!authLoading) {
        router.replace(
          "/auth/callback?error=unauthenticated&from=/profile/edit",
        );
      }
      return;
    }
    setPageLoading(true);
    fetchProfileData(user.login, token);
  }, [user, token, authLoading, router, fetchProfileData]);

  const handleCreateProfileRepo = useCallback(async () => {
    if (!user || !user.login || !token) return;
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await githubService.createRepo(
        token,
        user.login,
        `My ${user.login} public profile repository`,
        true,
      );
      setProfileRepoExists(true);
      setSuccessMessage("Profile repository created! Refreshing data...");
      await fetchProfileData(user.login, token);
    } catch (err: unknown) {
      console.error("Error creating profile repo:", err);
      setError(
        err instanceof Error
          ? err.message || "Failed to create profile repo."
          : "Unknown error creating profile repo.",
      );
    }
    setIsProcessing(false);
  }, [user, token, fetchProfileData]);

  const handleLinkWallets = useCallback(
    async (wallets: LinkedWallet[]) => {
      if (!user || !user.login || !token) {
        setError("User not authenticated.");
        return;
      }
      setIsProcessing(true);
      setError(null);
      setSuccessMessage(null);

      try {
        // Validate wallets before proceeding
        const validatedWallets = z.array(LinkedWalletSchema).parse(wallets);

        const currentReadme = readmeContent || "";
        const { updatedReadme, walletData } =
          generateUpdatedReadmeWithWalletInfo(currentReadme, validatedWallets);
        setWalletData(walletData);
        if (!profileRepoExists) {
          await handleCreateProfileRepo();
        }
        if (!token || !user?.login)
          throw new Error("Authentication details became unavailable.");

        const response = await githubService.updateFile(
          token,
          user.login,
          user.login,
          "README.md",
          "Update linked wallet addresses via ElizaOS Profile",
          updatedReadme,
          readmeSha,
        );
        setReadmeSha(response.content.sha);
        setReadmeContent(updatedReadme);
        setSuccessMessage("Wallet addresses updated successfully!");
      } catch (err: unknown) {
        console.error("Error updating wallets:", err);
        if (err instanceof z.ZodError) {
          // Format Zod validation errors in a user-friendly way
          const errors = err.errors
            .map((e) => {
              const path = e.path.join(".");
              return `${path ? path + ": " : ""}${e.message}`;
            })
            .join("; ");
          setError(`Invalid wallet data: ${errors}`);
        } else {
          setError(
            err instanceof Error
              ? err.message || "Failed to update wallets."
              : "Unknown error updating wallets.",
          );
        }
      }
      setIsProcessing(false);
    },
    [
      user,
      token,
      readmeContent,
      readmeSha,
      profileRepoExists,
      handleCreateProfileRepo,
    ],
  );

  // Helper function to get a wallet address for a specific chain
  const getWalletAddress = useCallback(
    (chain: string): string => {
      return getWalletAddressForChain(walletData, chain);
    },
    [walletData],
  );

  return {
    user,
    token,
    authLoading,
    readmeContent,
    readmeSha,
    profileRepoExists,
    walletData,
    isProcessing,
    pageLoading,
    error,
    successMessage,
    setError,
    setSuccessMessage,
    handleCreateProfileRepo,
    handleLinkWallets,
    getWalletAddress,
  };
}
