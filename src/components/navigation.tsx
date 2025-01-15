"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Navigation() {
  const pathname = usePathname();
  const isDailyActive = pathname.startsWith("/daily");

  return (
    <div className="flex items-center gap-6">
      <Link href="/" className="hover:opacity-80 transition-opacity">
        <h1 className="text-xl font-bold">ElizaOS</h1>
      </Link>
      <Link href="/daily">
        <Button
          variant="ghost"
          size={"sm"}
          className={cn(
            "text-sm font-medium rounded-full px-4",
            isDailyActive
              ? "bg-muted hover:bg-muted/80"
              : "text-muted-foreground hover:bg-transparent"
          )}
        >
          Daily Summary
        </Button>
      </Link>
    </div>
  );
}
