"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ProfileRepoNoticeProps {
  userLogin: string | undefined; // User login name for display
  isProcessing: boolean; // True if an operation (like repo creation) is in progress
  pageLoading: boolean; // True if the page is initially loading data
  onCreateRepo: () => void; // Function to call when the create button is clicked
}

export function ProfileRepoNotice({
  userLogin,
  isProcessing,
  pageLoading,
  onCreateRepo,
}: ProfileRepoNoticeProps) {
  if (!userLogin) return null; // Don't render if userLogin is not available

  return (
    <div className="mb-4 rounded-md border border-yellow-300 bg-yellow-50 p-4 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-900 dark:text-yellow-200">
      <p className="font-semibold">Profile Repository Not Found</p>
      <p className="mb-2 text-sm">
        To link your wallets, you need a public repository named &apos;
        {userLogin}&apos; on GitHub. We can create this for you with a basic
        README.md.
      </p>
      <Button onClick={onCreateRepo} disabled={isProcessing || pageLoading}>
        {isProcessing || pageLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        Create Profile Repository
      </Button>
    </div>
  );
}
