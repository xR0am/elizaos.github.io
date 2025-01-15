import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DailySummaryData } from "@/lib/get-daily-summary";
import {
  Users,
  GitPullRequest,
  CircleDot,
  FileCode,
  ChevronDown,
} from "lucide-react";

export function DailySummaryCard({ data }: { data: DailySummaryData }) {
  // Extract date from title (format: "elizaos Eliza (2025-01-12)")
  const dateMatch = data.title.match(/\(([^)]+)\)/);
  const date = dateMatch ? dateMatch[1] : "";

  return (
    <Card className="bg-muted/50  transition-colors">
      <Accordion type="single" collapsible defaultValue="content">
        <AccordionItem value="content" className="border-none">
          <CardHeader className="py-0">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">
                  Daily Summary ({date})
                </CardTitle>
              </div>
            </AccordionTrigger>
          </CardHeader>
          <AccordionContent>
            <CardContent className="space-y-6 pt-6">
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

              {/* Changes */}
              <div className="space-y-4">
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
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Fixes
                  </h3>
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
              </div>

              {/* Top Contributors */}
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
                            <p className="text-xs text-muted-foreground line-clamp-4">
                              {contributor.summary}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            </CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
