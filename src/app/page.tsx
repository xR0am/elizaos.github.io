import { Leaderboard, LeaderboardFallback } from "@/components/leaderboard";
import { getUsers } from "@/lib/get-users";
import { Suspense } from "react";
import { LeaderboardPeriod, UserFocusAreaData } from "@/types/user-profile";

interface LeaderboardTab {
  id: LeaderboardPeriod;
  title: string;
  users: UserFocusAreaData[];
}

export default async function Home() {
  const [allTimeUsers, monthlyUsers, weeklyUsers] = await Promise.all([
    getUsers("all"),
    getUsers("monthly"),
    getUsers("weekly"),
  ]);

  const tabs: LeaderboardTab[] = [
    { id: "all", title: "All Time", users: allTimeUsers },
    { id: "monthly", title: "Monthly", users: monthlyUsers },
    { id: "weekly", title: "Weekly", users: weeklyUsers },
  ];

  return (
    <main className="container mx-auto p-4 space-y-8">
      <Suspense fallback={<LeaderboardFallback />}>
        <Leaderboard tabs={tabs} />
      </Suspense>
    </main>
  );
}
