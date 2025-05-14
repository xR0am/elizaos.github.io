"use client";

// Imports moved from page.tsx that are specific to this client component
import { useProfileEditor } from "../hooks/useProfileEditor"; // Adjusted path
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { ProfileRepoNotice } from "./ProfileRepoNotice"; // Path relative to this new location
import { WalletLinkForm } from "@/components/WalletLinkForm";

// This is the ProfileEditPageContent function, renamed and exported
export default function ProfileEditor() {
  const {
    user,
    profileRepoExists,
    initialEthAddress,
    initialSolAddress,
    isProcessing,
    pageLoading,
    error,
    successMessage,
    handleCreateProfileRepo,
    handleLinkWallets,
  } = useProfileEditor();

  if (pageLoading && !user) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user?.login && !pageLoading) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center">
        <p>Loading authentication details or redirecting...</p>
        <Loader2 className="mt-2 h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const userLogin = user?.login;

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Link Your Wallet Addresses</CardTitle>
          <CardDescription>
            Add or update your Ethereum and Solana wallet addresses. This
            information will be stored in a special section of your GitHub
            profile README.md.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {successMessage && (
            <Alert
              variant="default"
              className="mb-4 border-green-300 bg-green-100 text-green-700 dark:border-green-700 dark:bg-green-900 dark:text-green-300"
            >
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {pageLoading && userLogin && (
            <div className="flex min-h-[100px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {!pageLoading && userLogin && (
            <>
              {!profileRepoExists && profileRepoExists !== null && (
                <ProfileRepoNotice
                  userLogin={userLogin}
                  isProcessing={isProcessing}
                  pageLoading={pageLoading}
                  onCreateRepo={handleCreateProfileRepo}
                />
              )}

              {profileRepoExists && (
                <>
                  <WalletLinkForm
                    initialEthAddress={initialEthAddress}
                    initialSolAddress={initialSolAddress}
                    onSubmit={handleLinkWallets}
                    isProcessing={isProcessing || pageLoading} // Disable form while page is loading too
                  />
                  <p className="mt-4 text-xs text-muted-foreground">
                    Note: This will create or update the README.md file in your
                    public{" "}
                    <a
                      href={`https://github.com/${userLogin}/${userLogin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {userLogin}/{userLogin}
                    </a>{" "}
                    GitHub repository.
                  </p>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
