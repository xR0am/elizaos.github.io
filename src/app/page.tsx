import { Leaderboard, LeaderboardFallback } from "@/components/leaderboard";
import { getUsers } from "@/lib/get-users";
import { Suspense } from "react";

export default async function Home() {
  const users = await getUsers();

  return (
    <main className="container mx-auto p-4 space-y-8">
      <Suspense fallback={<LeaderboardFallback />}>
        <Leaderboard users={users} period="all" />
      </Suspense>
    </main>
  );
}
