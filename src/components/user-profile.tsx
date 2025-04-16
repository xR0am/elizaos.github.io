import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  UserFocusAreaData,
  TagLevel,
  ActivityData,
} from "@/types/user-profile";
import { skillIcons } from "@/lib/skill-icons";
import { CircleSlash, Github } from "lucide-react";
import Link from "next/link";
import { formatCompactNumber } from "@/lib/format-number";

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
          <Link href={`/?skill=${name.toLowerCase()}`}>
            <Card
              className={`group relative cursor-pointer overflow-hidden border-2 transition-all hover:border-primary/50 ${getRankStyles()}`}
            >
              <CardContent className="p-2 sm:p-4">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 scale-0 rounded-full bg-primary/5 transition-transform duration-500 group-hover:scale-150" />
                    <Icon className="relative z-10 h-6 w-6 text-primary/80 sm:h-8 sm:w-8" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium capitalize">
                      {name}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">LVL</span>
                      <span className="font-mono text-lg font-bold tabular-nums md:text-xl">
                        {data.level}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </TooltipTrigger>
        <TooltipContent className="w-64">
          <div className="space-y-3">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="font-semibold capitalize">{name}</p>
                <p className="text-sm">Level {data.level}</p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/50">
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
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Next Level</span>
                <span className="font-medium">
                  {data.points_next_level.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
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

const DailyActivity = ({ data }: { data?: ActivityData[] }) => {
  if (!data || data.length === 0) {
    return null;
  }

  // Get the most recent days of activity (up to 31 days)
  const recentActivity = data.slice(-31);

  // Calculate the maximum value for scaling
  const maxValue = Math.max(...recentActivity.map((d) => d.value), 1);

  return (
    <Card>
      <CardHeader className="p-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Recent Activity (Last {recentActivity.length} Days)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="flex h-20 items-end justify-between gap-1">
          {recentActivity.map((day) => {
            const height = `${Math.max((day.value / maxValue) * 100, 5)}%`;
            return (
              <TooltipProvider key={day.date}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex flex-1 flex-col items-center">
                      <div
                        className="w-full rounded-t bg-primary/70"
                        style={{ height }}
                      ></div>
                      <span className="mt-1 text-xs">{day.date.slice(-2)}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      <p className="font-medium">{day.date}</p>
                      <p className="text-sm">Total: {day.value.toFixed(1)}</p>
                      <div className="space-y-0.5 text-xs">
                        <div className="flex justify-between gap-2">
                          <span>PRs:</span>
                          <span>{day.breakdown.prScore.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span>Issues:</span>
                          <span>{day.breakdown.issueScore.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span>Reviews:</span>
                          <span>{day.breakdown.reviewScore.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span>Comments:</span>
                          <span>{day.breakdown.commentScore.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default function UserProfile(props: UserFocusAreaData) {
  const totalXp = Object.values(props.tagScores).reduce((a, b) => a + b, 0);
  const totalLevel = Object.values(props.tagLevels).reduce(
    (sum, skill) => sum + skill.level,
    0,
  );

  // Sort skills by XP instead of level for top skills
  const sortedSkills = Object.entries(props.tagLevels)
    .map(([name, data]) => ({
      name,
      data,
      xp: props.tagScores[name] || 0,
    }))
    .sort((a, b) => b.xp - a.xp);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 sm:p-4">
      <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
        <Avatar className="h-20 w-20">
          <AvatarImage
            src={`https://github.com/${props.username}.png`}
            alt={props.username}
          />
          <AvatarFallback>{props.username[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-grow">
          <div className="flex flex-col items-center gap-2 md:items-start">
            <h1 className="max-w-full text-lg font-bold sm:text-2xl">
              {props.username}
            </h1>
            <a
              href={`https://github.com/${props.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-secondary transition-colors hover:bg-secondary/80"
            >
              <Github className="h-4 w-4" />
              <span className="sr-only">View GitHub Profile</span>
            </a>
          </div>
          <p className="mt-2 text-muted-foreground">{props.summary}</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Level
              </p>
              <div className="mt-1 font-mono text-lg font-bold sm:text-2xl">
                {totalLevel}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total XP
              </p>
              <div className="mt-1 font-mono text-lg font-bold sm:text-2xl">
                {Math.round(totalXp).toLocaleString()}
              </div>
            </div>
            <div className="col-span-2">
              <p className="text-sm font-medium text-muted-foreground">
                Focus Areas
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {props.focusAreas.map(([area], index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="px-1.5 py-0.5 text-xs sm:px-3 sm:py-1 sm:text-sm"
                  >
                    {area}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Activity Section */}
      {props.dailyActivity && props.dailyActivity.length > 0 && (
        <DailyActivity data={props.dailyActivity} />
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="p-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pull Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="grid grid-cols-3 gap-1 sm:gap-2">
              <div className="text-center">
                <div className="font-mono text-xl font-bold sm:text-2xl">
                  {props.stats.total_prs}
                </div>
                <p className="text-[10px] text-muted-foreground sm:text-xs">
                  Total
                </p>
              </div>
              <div className="text-center">
                <div className="font-mono text-xl font-bold sm:text-2xl">
                  {props.stats.merged_prs}
                </div>
                <p className="text-[10px] text-muted-foreground sm:text-xs">
                  Merged
                </p>
              </div>
              <div className="text-center">
                <div className="font-mono text-xl font-bold sm:text-2xl">
                  {props.stats.closed_prs}
                </div>
                <p className="text-[10px] text-muted-foreground sm:text-xs">
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
                <div className="font-mono text-lg font-bold sm:text-2xl">
                  {props.stats.total_files}
                </div>
                <p className="text-[10px] text-muted-foreground sm:text-xs">
                  Files
                </p>
              </div>
              <div className="text-center">
                <div className="font-mono text-lg font-bold text-emerald-500 sm:text-2xl">
                  +{formatCompactNumber(props.stats.total_additions)}
                </div>
                <p className="text-[10px] text-muted-foreground sm:text-xs">
                  Additions
                </p>
              </div>
              <div className="text-center">
                <div className="font-mono text-lg font-bold text-red-500 sm:text-2xl">
                  -{formatCompactNumber(props.stats.total_deletions)}
                </div>
                <p className="text-[10px] text-muted-foreground sm:text-xs">
                  Deletions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Skills</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
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
    </div>
  );
}
