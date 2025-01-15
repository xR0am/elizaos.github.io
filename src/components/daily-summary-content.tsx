import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DailySummary } from "@/lib/get-daily-summaries";
import { Users, GitPullRequest, CircleDot, FileCode } from "lucide-react";

interface DailySummaryContentProps {
  data: DailySummary;
  className?: string;
}

export function DailySummaryContent({
  data,
  className = "",
}: DailySummaryContentProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-background/50">
          <CardContent className="p-3 flex flex-col items-center">
            <p className="text-xl font-bold leading-none mb-1.5">
              {data.metrics.contributors}
            </p>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              Contributors
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background/50">
          <CardContent className="p-3 flex flex-col items-center">
            <p className="text-xl font-bold leading-none mb-1.5">
              {data.metrics.merged_prs}
            </p>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <GitPullRequest className="w-3.5 h-3.5" />
              Merged PRs
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background/50">
          <CardContent className="p-3 flex flex-col items-center">
            <p className="text-xl font-bold leading-none mb-1.5">
              {data.metrics.new_issues}
            </p>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CircleDot className="w-3.5 h-3.5" />
              New Issues
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background/50">
          <CardContent className="p-3 flex flex-col items-center">
            <p className="text-xl font-bold leading-none mb-1.5">
              {data.metrics.lines_changed.toLocaleString()}
            </p>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <FileCode className="w-3.5 h-3.5" />
              Lines Changed
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Overview */}
      <p className=" text-muted-foreground">{data.overview}</p>

      {/* Changes */}
      <div className="space-y-4">
        {data.changes.features.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Features
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.changes.features.map((feature, i) => (
                <Badge
                  key={i}
                  className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-500 hover:bg-emerald-500/20 border-0"
                >
                  {feature}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {data.changes.fixes.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Fixes</h3>
            <div className="flex flex-wrap gap-2">
              {data.changes.fixes.map((fix, i) => (
                <Badge
                  key={i}
                  className="bg-yellow-500/15 text-yellow-600 dark:text-yellow-600 hover:bg-yellow-500/20 border-0"
                >
                  {fix}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Top Contributors */}
      {data.top_contributors.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            Top Contributors
          </h3>
          <div className="grid gap-3 md:grid-cols-3">
            {data.top_contributors.map((contributor) => (
              <Link
                key={contributor.name}
                href={`/profile/${contributor.name}`}
                className="block"
              >
                <Card className="bg-background/50 hover:bg-accent/50 transition-colors">
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage
                            src={`https://github.com/${contributor.name}.png`}
                            alt={contributor.name}
                          />
                          <AvatarFallback>
                            {contributor.name[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <h4 className="font-medium text-sm truncate">
                          {contributor.name}
                        </h4>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-5">
                        {contributor.summary}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
