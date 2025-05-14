"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import * as githubService from "@/lib/walletLinking/githubService";
import {
  parseWalletAddressesFromReadme,
  generateUpdatedReadmeWithWalletInfo,
} from "@/lib/walletLinking/readmeUtils";
import { fetchUserWalletAddressesAndReadme } from "@/lib/walletLinking/getUserWalletAddresses";

export function useProfileEditor() {
  const { user, token, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [readmeContent, setReadmeContent] = useState<string | null>(null);
  const [readmeSha, setReadmeSha] = useState<string | undefined>(undefined);
  const [profileRepoExists, setProfileRepoExists] = useState<boolean | null>(
    null,
  );
  const [initialEthAddress, setInitialEthAddress] = useState("");
  const [initialSolAddress, setInitialSolAddress] = useState("");
  const [isProcessing, setIsProcessing] = useState(false); // For form submissions, repo creation
  const [pageLoading, setPageLoading] = useState(true); // For initial data load
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const updateLocalWalletAddresses = useCallback((content: string) => {
    const { ethAddress, solAddress } = parseWalletAddressesFromReadme(content);
    console.log("updateLocalWalletAddresses", {
      content,
      ethAddress,
      solAddress,
    });
    setInitialEthAddress(ethAddress);
    setInitialSolAddress(solAddress);
  }, []);

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
        setInitialEthAddress(data.ethAddress);
        setInitialSolAddress(data.solAddress);
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
        setInitialEthAddress("");
        setInitialSolAddress("");
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
    async (ethAddress: string, solAddress: string) => {
      if (!user || !user.login || !token) {
        setError("User not authenticated.");
        return;
      }
      setIsProcessing(true);
      setError(null);
      setSuccessMessage(null);

      const currentReadme = readmeContent || "";
      const updatedReadmeContent = generateUpdatedReadmeWithWalletInfo(
        currentReadme,
        ethAddress,
        solAddress,
      );

      try {
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
          updatedReadmeContent,
          readmeSha,
        );
        setReadmeSha(response.content.sha);
        setReadmeContent(updatedReadmeContent);
        updateLocalWalletAddresses(updatedReadmeContent);
        setSuccessMessage("Wallet addresses updated successfully!");
      } catch (err: unknown) {
        console.error("Error updating README:", err);
        setError(
          err instanceof Error
            ? err.message || "Failed to update wallets."
            : "Unknown error updating wallets.",
        );
      }
      setIsProcessing(false);
    },
    [
      user,
      token,
      readmeContent,
      readmeSha,
      profileRepoExists,
      updateLocalWalletAddresses,
      handleCreateProfileRepo,
    ],
  );

  return {
    user,
    token,
    authLoading,
    readmeContent,
    readmeSha,
    profileRepoExists,
    initialEthAddress,
    initialSolAddress,
    isProcessing,
    pageLoading,
    error,
    successMessage,
    setError,
    setSuccessMessage,
    handleCreateProfileRepo,
    handleLinkWallets,
  };
}
