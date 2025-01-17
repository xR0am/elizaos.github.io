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
    Object.values(user.tag_scores).reduce((a, b) => a + b, 0)
  );
  const totalLevel = Object.values(user.tag_levels).reduce(
    (sum, skill) => sum + skill.level,
    0
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
      <div className="hover:bg-accent/50 transition-colors h-[72px] px-3 sm:px-5">
        <div className="flex items-center h-full">
          <span className="hidden md:flex items-center text-xl text-muted-foreground font-semibold mr-4 w-8">
            {rank}
          </span>
          <div className="flex flex-1 min-w-0 items-center">
            <div className="flex items-center mr-3">
              <span className="md:hidden text-sm font-medium mr-3 text-muted-foreground">
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
            <div className="min-w-0 flex flex-col gap-1 flex-1">
              <h3 className="font-medium truncate">{user.username}</h3>
              <div className="flex gap-2">
                <Badge
                  variant="outline"
                  className="text-xs flex items-center px-2 gap-1"
                >
                  <span className="text-primary/80">XP</span>
                  <span className="text-muted-foreground">
                    {totalXp.toLocaleString()}
                  </span>
                </Badge>
                <Badge
                  variant="outline"
                  className="text-xs flex items-center px-2 gap-1"
                >
                  <span className="text-primary/80">LVL</span>
                  <span className="text-muted-foreground">{totalLevel}</span>
                </Badge>
              </div>
            </div>
            <div className="hidden md:flex gap-2 items-center">
              {topSkills.map(([name, data]) => (
                <Badge
                  key={name}
                  variant="outline"
                  className="text-xs flex items-center gap-1 cursor-pointer hover:border-primary whitespace-nowrap"
                  onClick={(e) => handleSkillClick(name, e)}
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
      </div>
    </Link>
  );
}
