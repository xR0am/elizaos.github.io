"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

interface WalletLinkBoardProps {
  userLogin: string;
  walletSection: string;
  readmeContent: string | null;
}

export function WalletLinkBoard({
  userLogin,
  walletSection,
  readmeContent,
}: WalletLinkBoardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(walletSection);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  }, [walletSection]);

  const handleOpenGitHub = useCallback(() => {
    const githubUrl =
      readmeContent === null
        ? `https://github.com/${userLogin}/${userLogin}/new/main?filename=README.md`
        : `https://github.com/${userLogin}/${userLogin}/edit/main/README.md`;
    window.open(githubUrl, "_blank");
  }, [userLogin, readmeContent]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="rounded-md border bg-muted p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              Generated Wallet Section
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 w-8 p-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words text-sm">
            <code>{walletSection}</code>
          </pre>
        </div>
      </div>

      <Button onClick={handleOpenGitHub} className="w-full">
        Open GitHub README Editor
      </Button>
    </div>
  );
}
