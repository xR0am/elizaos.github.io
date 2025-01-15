import { Leaderboard } from "@/components/leaderboard";
import { DailySummaryCard } from "@/components/daily-summary-card";
import { getUsers } from "@/lib/get-users";
import { getDailySummary } from "@/lib/get-daily-summary";

export default async function Home() {
  const [users, summaryData] = await Promise.all([
    getUsers(),
    getDailySummary(),
  ]);

  return (
    <main className="container mx-auto p-4 space-y-8">
      <DailySummaryCard data={summaryData} />
      <Leaderboard users={users} period="all" />
    </main>
  );
}
