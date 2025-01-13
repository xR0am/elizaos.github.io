import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserFocusAreaData } from "@/types/user-profile";

export function LeaderboardCard({
  user,
  rank,
}: {
  user: UserFocusAreaData;
  rank: number;
}) {
  const totalXp = Math.round(
    Object.values(user.tag_scores).reduce((a, b) => a + b, 0)
  );
  const totalLevel = Object.values(user.tag_levels).reduce(
    (sum, skill) => sum + skill.level,
    0
  );
  const topSkills = Object.entries(user.tag_levels)
    .sort(([, a], [, b]) => b.level - a.level)
    .slice(0, 3);

  return (
    <Link href={`/profile/${user.username}`}>
      <div className="hover:bg-accent/50 transition-colors p-4">
        <div className="flex items-center">
          <span className="hidden md:flex items-center text-xl text-muted-foreground font-semibold mr-4 w-8">
            {rank}
          </span>
          <div className="flex flex-1 min-w-0">
            <div className="flex flex-col items-center mr-4">
              <Avatar className="h-12 w-12">
                <AvatarImage
                  src={`https://github.com/${user.username}.png`}
                  alt={user.username}
                />
                <AvatarFallback>
                  {user.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="md:hidden text-sm font-medium mt-1">
                #{rank}
              </span>
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold truncate">{user.username}</h3>
              <div className="text-sm text-muted-foreground flex gap-3">
                <span>Total XP: {totalXp.toLocaleString()}</span>
                <span>Level: {totalLevel}</span>
              </div>
              <div className="flex gap-2 flex-wrap mt-2 md:hidden">
                {topSkills.map(([name, data]) => (
                  <Badge
                    key={name}
                    variant="outline"
                    className="text-xs flex items-center gap-1"
                  >
                    <span>{name}</span>
                    <span className="font-mono bg-secondary-foreground/10 -mr-2.5 -my-0.5 py-0.5 px-1.5 rounded-r-[inherit]">
                      {data.level}
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="hidden md:flex gap-2 flex-wrap items-center">
            {topSkills.map(([name, data]) => (
              <Badge
                key={name}
                variant="outline"
                className="text-xs flex items-center gap-1"
              >
                <span>{name}</span>
                <span className="font-mono bg-secondary-foreground/10 -mr-2.5 -my-0.5 py-0.5 px-1.5 rounded-r-[inherit]">
                  {data.level}
                </span>
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
