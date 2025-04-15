import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserFocusAreaData } from "@/types/user-profile";

export function LeaderboardCard({
  user,
  rank,
  onSkillClick,
}: {
  user: UserFocusAreaData;
  rank: number;
  onSkillClick: (skill: string) => void;
}) {
  const totalXp = Math.round(
    Object.values(user.tag_scores).reduce((a, b) => a + b, 0),
  );
  const totalLevel = Object.values(user.tag_levels).reduce(
    (sum, skill) => sum + skill.level,
    0,
  );
  const topSkills = Object.entries(user.tag_levels)
    .sort(([, a], [, b]) => b.level - a.level)
    .slice(0, 3);

  const handleSkillClick = (skill: string, e: React.MouseEvent) => {
    e.preventDefault();
    onSkillClick(skill.toLowerCase());
  };

  return (
    <Link href={`/profile/${user.username}`}>
      <div className="h-[72px] px-3 transition-colors hover:bg-accent/50 sm:px-5">
        <div className="flex h-full items-center">
          <span className="mr-4 hidden w-8 items-center text-xl font-semibold text-muted-foreground md:flex">
            {rank}
          </span>
          <div className="flex min-w-0 flex-1 items-center">
            <div className="mr-3 flex items-center">
              <span className="mr-3 text-sm font-medium text-muted-foreground md:hidden">
                {rank}
              </span>
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={`https://github.com/${user.username}.png`}
                  alt={user.username}
                />
                <AvatarFallback>
                  {user.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h3 className="truncate font-medium">{user.username}</h3>
              <div className="flex gap-2">
                <Badge
                  variant="outline"
                  className="flex items-center gap-1 px-2 text-xs"
                >
                  <span className="text-primary/80">XP</span>
                  <span className="text-muted-foreground">
                    {totalXp.toLocaleString()}
                  </span>
                </Badge>
                <Badge
                  variant="outline"
                  className="flex items-center gap-1 px-2 text-xs"
                >
                  <span className="text-primary/80">LVL</span>
                  <span className="text-muted-foreground">{totalLevel}</span>
                </Badge>
              </div>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              {topSkills.map(([name, data]) => (
                <Badge
                  key={name}
                  variant="outline"
                  className="flex cursor-pointer items-center gap-1 whitespace-nowrap text-xs hover:border-primary"
                  onClick={(e) => handleSkillClick(name, e)}
                >
                  <span>{name}</span>
                  <span className="-my-0.5 -mr-2.5 rounded-r-[inherit] bg-secondary-foreground/10 px-1.5 py-0.5 font-mono">
                    {data.level}
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
