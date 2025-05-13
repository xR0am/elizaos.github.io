import React from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ContributorItemProps {
  username: string;
  href: string;
  stats: React.ReactNode;
  className?: string;
}

export function ContributorItem({
  username,
  href,
  stats,
  className,
}: ContributorItemProps) {
  return (
    <Link href={href} className="block">
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/50",
          className,
        )}
      >
        <Avatar className="h-10 w-10">
          <AvatarImage
            src={`https://github.com/${username}.png`}
            alt={username}
          />
          <AvatarFallback>{username[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <h4 className="font-medium">{username}</h4>
          <p className="text-xs text-muted-foreground">{stats}</p>
        </div>
      </div>
    </Link>
  );
}
