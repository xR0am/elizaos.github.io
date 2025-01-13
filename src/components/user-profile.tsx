import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserFocusAreaData, TagLevel } from "@/types/user-profile";
import { skillIcons } from "@/lib/skill-icons";
import { CircleSlash, Github } from "lucide-react";

const SkillCard = ({
  name,
  data,
  rank,
}: {
  name: string;
  data: TagLevel;
  rank?: number;
}) => {
  const Icon =
    skillIcons[name.toLowerCase() as keyof typeof skillIcons] || CircleSlash;

  const getRankStyles = () => {
    if (!rank) return "";
    const styles = {
      1: "border-yellow-400/50 hover:border-yellow-400 shadow-[0_0_15px_-3px] shadow-yellow-400/20",
      2: "border-zinc-300/50 hover:border-zinc-300 shadow-[0_0_15px_-3px] shadow-zinc-300/20",
      3: "border-amber-600/50 hover:border-amber-600 shadow-[0_0_15px_-3px] shadow-amber-600/20",
    };
    return styles[rank as keyof typeof styles] || "";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card
            className={`group relative overflow-hidden border-2 hover:border-primary/50 transition-all ${getRankStyles()}`}
          >
            <CardContent className="p-2 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 bg-primary/5 rounded-full scale-0 group-hover:scale-150 transition-transform duration-500" />
                  <Icon className="w-6 h-6 sm:w-8 sm:h-8 relative z-10 text-primary/80" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm capitalize truncate">
                    {name}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">LVL</span>
                    <span className="text-xl font-bold font-mono tabular-nums">
                      {data.level}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent className="w-64">
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="font-semibold capitalize">{name}</p>
                <p className="text-sm">Level {data.level}</p>
              </div>
              <div className="w-full h-2 bg-secondary/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${data.progress * 100}%` }}
                />
              </div>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current XP</span>
                <span className="font-medium">
                  {data.points.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Next Level</span>
                <span className="font-medium">
                  {data.points_next_level.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default function UserProfile(props: UserFocusAreaData) {
  const totalXp = Object.values(props.tag_scores).reduce((a, b) => a + b, 0);
  const totalLevel = Object.values(props.tag_levels).reduce(
    (sum, skill) => sum + skill.level,
    0
  );

  // Sort skills by XP instead of level for top skills
  const sortedSkills = Object.entries(props.tag_levels)
    .map(([name, data]) => ({
      name,
      data,
      xp: props.tag_scores[name] || 0,
    }))
    .sort((a, b) => b.xp - a.xp);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar className="w-20 h-20">
          <AvatarImage
            src={`https://github.com/${props.username}.png`}
            alt={props.username}
          />
          <AvatarFallback>{props.username[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-grow">
          <div className="flex items-center gap-2">
            <CardTitle className="text-2xl">{props.username}</CardTitle>
            <a
              href={`https://github.com/${props.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <Github className="w-4 h-4" />
              <span className="sr-only">View GitHub Profile</span>
            </a>
          </div>
          <CardDescription className="mt-2">{props.summary}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex divide-x">
              <div className="px-4 first:pl-0 last:pr-0">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Level
                </p>
                <div className="text-2xl font-bold font-mono mt-1">
                  {totalLevel}
                </div>
              </div>
              <div className="px-4 first:pl-0 last:pr-0">
                <p className="text-sm font-medium text-muted-foreground">
                  Total XP
                </p>
                <div className="text-2xl font-bold font-mono mt-1">
                  {Math.round(totalXp).toLocaleString()}
                </div>
              </div>
              <div className="px-4 first:pl-0 last:pr-0 flex-grow">
                <p className="text-sm font-medium text-muted-foreground">
                  Focus Areas
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {props.focus_areas.map(([area], index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="px-3 py-1 text-sm"
                    >
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="overflow-hidden">
            <CardHeader className="p-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pull Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="grid grid-cols-3 gap-1 sm:gap-2">
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold font-mono">
                    {props.stats.total_prs}
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Total
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold font-mono">
                    {props.stats.merged_prs}
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Merged
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold font-mono">
                    {props.stats.closed_prs}
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Closed
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="p-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Code Contributions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="grid grid-cols-3 gap-1 sm:gap-2">
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold font-mono">
                    {props.stats.total_files}
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Files
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-500">
                    +{props.stats.total_additions.toLocaleString()}
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Additions
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold font-mono text-red-500">
                    -{props.stats.total_deletions.toLocaleString()}
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Deletions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Skills</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sortedSkills.map(({ name, data }, index) => (
              <SkillCard
                key={name}
                name={name}
                data={data}
                rank={index < 3 ? index + 1 : undefined}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
