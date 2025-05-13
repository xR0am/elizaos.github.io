"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Navigation() {
  const pathname = usePathname();
  const isLeaderboardActive = pathname === "/leaderboard";

  return (
    <div className="flex items-center gap-6">
      <Button variant="none" size={"none"} asChild>
        <Link href="/" className="transition-opacity hover:opacity-80">
          <h1 className="text-xl font-bold">ElizaOS</h1>
        </Link>
      </Button>

      <Button
        variant="ghost"
        size={"sm"}
        className={cn(
          "rounded-full px-4 text-sm font-medium",
          isLeaderboardActive
            ? "bg-muted hover:bg-muted/80"
            : "text-muted-foreground hover:bg-transparent",
        )}
        asChild
      >
        <Link href="/leaderboard">Leaderboard</Link>
      </Button>
    </div>
  );
}
