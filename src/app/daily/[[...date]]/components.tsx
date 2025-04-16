import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  CircleDot,
  FileCode,
  GitCommitVertical,
  GitPullRequest,
  MessageCircleWarning,
  Users,
  CheckCircle,
  GitMerge,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DailyMetrics } from "./queries";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Import our generic components
import { StatCard } from "@/components/stat-card";
import { MetricItem } from "@/components/metric-item";
import { ActivityItem } from "@/components/activity-item";
import { ContributorItem } from "@/components/contributor-item";
import { BadgeList, type BadgeItem } from "@/components/badge-list";
import { CounterWithIcon } from "@/components/counter-with-icon";
import { SectionCard } from "@/components/section-card";
import { formatReadableDate } from "@/lib/date-utils";
interface NavigationButtonProps {
  href: string;
  direction: "prev" | "next";
  isVisible: boolean;
}

function NavigationButton({
  href,
  direction,
  isVisible,
}: NavigationButtonProps) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  const label = direction === "prev" ? "Previous Day" : "Next Day";

  return (
    <>
      {/* Desktop */}
      <Button
        variant="outline"
        asChild
        className={cn("hidden items-center sm:flex", !isVisible && "invisible")}
      >
        <Link href={href}>
          {direction === "prev" && <Icon className="mr-2 h-4 w-4" />}
          <span>{label}</span>
          {direction === "next" && <Icon className="ml-2 h-4 w-4" />}
        </Link>
      </Button>

      {/* Mobile */}
      <Button
        variant="outline"
        size="icon"
        asChild
        className={cn("sm:hidden", !isVisible && "invisible")}
      >
        <Link href={href}>
          <Icon className="h-4 w-4" />
          <span className="sr-only">{label}</span>
        </Link>
      </Button>
    </>
  );
}

interface DateNavigationProps {
  prevDate: string | null;
  nextDate: string | null;
  currentDate: string;
}

export function DateNavigation({
  prevDate,
  nextDate,
  currentDate,
}: DateNavigationProps) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <NavigationButton
        href={prevDate ? `/daily/${prevDate}` : "#"}
        direction="prev"
        isVisible={!!prevDate}
      />

      <time dateTime={currentDate} className="text-md font-bold">
        {formatReadableDate(currentDate)}
      </time>

      <NavigationButton
        href={nextDate ? `/daily/${nextDate}` : "#"}
        direction="next"
        isVisible={!!nextDate}
      />
    </div>
  );
}

/**
 * Component to display the daily metrics in a structured layout
 */
export function DailyMetricsDisplay({ metrics }: { metrics: DailyMetrics }) {
  // Convert focus areas to badge items
  const focusAreaBadges: BadgeItem[] = metrics.focusAreas.map(
    (area, index) => ({
      id: index,
      label: area.area,
    }),
  );

  return (
    <div className="space-y-6">
      {/* Main Stats Section */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Contributors Card */}
        <StatCard title="Contributors" icon={Users}>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">
              {metrics.activeContributors}
            </div>
            <div className="flex -space-x-2">
              {metrics.topContributors.slice(0, 3).map((contributor) => (
                <Avatar
                  key={contributor.username}
                  className="h-8 w-8 border-2 border-background"
                >
                  <AvatarImage
                    src={`https://github.com/${contributor.username}.png`}
                    alt={contributor.username}
                  />
                  <AvatarFallback>
                    {contributor.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {metrics.topContributors.length > 3 && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
                  +{metrics.topContributors.length - 3}
                </div>
              )}
            </div>
          </div>
        </StatCard>

        {/* Pull Requests Card */}
        <StatCard
          title="Pull Requests"
          icon={GitPullRequest}
          bgColor="bg-blue-500/10"
        >
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">
              {metrics.pullRequests.total}
            </div>
            <div className="flex flex-col space-y-1">
              <CounterWithIcon
                icon={CircleDot}
                label="New"
                value={metrics.pullRequests.new}
                iconClassName="text-green-500"
              />
              <CounterWithIcon
                icon={GitMerge}
                label="Merged"
                value={metrics.pullRequests.merged}
                iconClassName="text-purple-500"
              />
            </div>
          </div>
        </StatCard>

        {/* Issues Card */}
        <StatCard
          title="Issues"
          icon={MessageCircleWarning}
          bgColor="bg-amber-500/10"
        >
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">{metrics.issues.total}</div>
            <div className="flex flex-col space-y-1">
              <CounterWithIcon
                icon={CircleDot}
                label="New"
                value={metrics.issues.new}
                iconClassName="text-amber-500"
              />
              <CounterWithIcon
                icon={CheckCircle}
                label="Closed"
                value={metrics.issues.closed}
                iconClassName="text-green-500"
              />
            </div>
          </div>
        </StatCard>
      </div>

      {/* Code Changes Section */}
      <SectionCard title="Code Changes">
        <div className="grid gap-4 md:grid-cols-4">
          <MetricItem
            icon={GitCommitVertical}
            value={metrics.codeChanges.commitCount}
            label="Commits"
          />

          <MetricItem
            icon={FileCode}
            value={metrics.codeChanges.files}
            label="Files Changed"
          />

          <MetricItem
            icon={ArrowUp}
            value={`+${metrics.codeChanges.additions.toLocaleString()}`}
            label="Lines Added"
            valueClassName="text-green-500"
            iconClassName="text-green-500"
            iconBgClassName="bg-green-500/10"
          />

          <MetricItem
            icon={ArrowDown}
            value={`-${metrics.codeChanges.deletions.toLocaleString()}`}
            label="Lines Deleted"
            valueClassName="text-red-500"
            iconClassName="text-red-500"
            iconBgClassName="bg-red-500/10"
          />
        </div>
      </SectionCard>

      {/* Activity Feed Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Pull Requests */}
        {metrics.topPullRequests && metrics.topPullRequests.length > 0 && (
          <SectionCard
            title="Top Pull Requests"
            icon={GitPullRequest}
            noPadding
          >
            <div className="divide-y">
              {metrics.topPullRequests.map((pr) => (
                <ActivityItem
                  key={pr.id}
                  id={pr.id}
                  title={pr.title}
                  author={pr.author}
                  number={pr.number}
                  href={`https://github.com/${pr.repository}/pull/${pr.number}`}
                  icon={
                    pr.mergedAt ? (
                      <GitMerge className="h-4 w-4 text-purple-500" />
                    ) : (
                      <CircleDot className="h-4 w-4 text-green-500" />
                    )
                  }
                />
              ))}
            </div>
          </SectionCard>
        )}

        {/* Top Issues */}
        {metrics.topIssues && metrics.topIssues.length > 0 && (
          <SectionCard title="Top Issues" icon={MessageCircleWarning} noPadding>
            <div className="divide-y">
              {metrics.topIssues.map((issue) => (
                <ActivityItem
                  key={issue.id}
                  id={issue.id}
                  title={issue.title}
                  author={issue.author}
                  number={issue.number}
                  href={`https://github.com/${issue.repository}/issues/${issue.number}`}
                  icon={
                    issue.state === "closed" || issue.closedAt ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <CircleDot className="h-4 w-4 text-amber-500" />
                    )
                  }
                  metadata={`${issue.commentCount} comments`}
                />
              ))}
            </div>
          </SectionCard>
        )}
      </div>

      {/* Focus Areas */}
      {metrics.focusAreas.length > 0 && (
        <SectionCard title="Focus Areas">
          <BadgeList items={focusAreaBadges} />
        </SectionCard>
      )}

      {/* Top Contributors */}
      <SectionCard title="Top Contributors">
        <div className="grid gap-3 md:grid-cols-3">
          {metrics.topContributors.map((contributor) => (
            <ContributorItem
              key={contributor.username}
              username={contributor.username}
              href={`/profile/${contributor.username}`}
              stats={`Daily XP: ${contributor.totalScore.toFixed(0)}`}
            />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
