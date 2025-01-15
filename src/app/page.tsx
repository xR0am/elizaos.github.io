import { Leaderboard } from "@/components/leaderboard";
import { getUsers } from "@/lib/get-users";
import { getDailySummary } from "@/lib/get-daily-summary";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

export default async function Home() {
  const [users, summaryData] = await Promise.all([
    getUsers(),
    getDailySummary(),
  ]);

  // Extract date from title (format: "elizaos Eliza (2025-01-12)")
  const dateMatch = summaryData.title.match(/\(([^)]+)\)/);
  const date = dateMatch ? dateMatch[1] : "";

  return (
    <main className="container mx-auto p-4 space-y-8">
      <Link href="/daily" className="block">
        <Card className="p-4 hover:bg-muted/50 transition-colors">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">View Daily Summary</h2>

            <ArrowRight className="w-6 h-6 text-muted-foreground" />
          </div>
        </Card>
      </Link>
      <Leaderboard users={users} period="all" />
    </main>
  );
}
