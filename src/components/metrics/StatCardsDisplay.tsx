import { StatCard } from "@/components/stat-card";
import { CounterWithIcon } from "@/components/counter-with-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { IntervalMetrics } from "@/app/[interval]/[[...date]]/queries";
import {
  Users,
  GitPullRequest,
  MessageCircleWarning,
  CircleDot,
  GitMerge,
  CheckCircle,
} from "lucide-react";
import { getIntervalTypeTitle } from "@/lib/date-utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ActivityItem } from "@/components/activity-item";
import { ContributorItem } from "@/components/contributor-item";

interface StatCardsDisplayProps {
  metrics: IntervalMetrics;
}

interface Contributor {
  username: string;
  totalScore: number;
}

function ContributorsListModalContent({
  contributors,
  intervalType,
}: {
  contributors: Contributor[];
  intervalType: string;
}) {
  return (
    <ScrollArea className="max-h-[80vh]">
      <div className="space-y-3 px-4">
        {contributors.map((contributor) => (
          <ContributorItem
            key={contributor.username}
            username={contributor.username}
            href={`/profile/${contributor.username}`}
            stats={`${intervalType} XP: ${contributor.totalScore.toFixed(0)}`}
          />
        ))}
        {contributors.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">
            No contributors to display.
          </p>
        )}
      </div>
    </ScrollArea>
  );
}

function PullRequestsListModalContent({
  pullRequests,
}: {
  pullRequests: IntervalMetrics["topPullRequests"];
}) {
  return (
    <ScrollArea className="max-h-[80vh]">
      <div className="divide-y">
        {pullRequests.map((pr) => (
          <ActivityItem
            key={pr.id}
            id={pr.id}
            title={pr.title}
            author={pr.author}
            className="px-4"
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
        {pullRequests.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">
            No pull requests to display.
          </p>
        )}
      </div>
    </ScrollArea>
  );
}

function IssuesListModalContent({
  issues,
}: {
  issues: IntervalMetrics["topIssues"];
}) {
  return (
    <ScrollArea className="max-h-[80vh]">
      <div className="divide-y px-0">
        {issues.map((issue) => (
          <ActivityItem
            key={issue.id}
            id={issue.id}
            title={issue.title}
            className="px-4"
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
        {issues.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">
            No issues to display.
          </p>
        )}
      </div>
    </ScrollArea>
  );
}

export function StatCardsDisplay({ metrics }: StatCardsDisplayProps) {
  const intervalTypeTitle = getIntervalTypeTitle(metrics.interval.intervalType);

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <StatCard
        title="Contributors"
        icon={Users}
        modalTitle={`Top Contributors (${intervalTypeTitle})`}
        modalContent={
          <ContributorsListModalContent
            contributors={metrics.topContributors}
            intervalType={intervalTypeTitle}
          />
        }
      >
        <div className="flex items-center justify-between">
          <div className="text-3xl font-bold">{metrics.activeContributors}</div>
          <div className="flex -space-x-2">
            {metrics.topContributors
              .slice(0, 3)
              .map((contributor: Contributor) => (
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
      <StatCard
        title="Pull Requests"
        icon={GitPullRequest}
        bgColor="bg-blue-500/10 group-hover:bg-blue-500/20"
        modalTitle={`Top Pull Requests (${intervalTypeTitle})`}
        modalContent={
          <PullRequestsListModalContent
            pullRequests={metrics.topPullRequests}
          />
        }
      >
        <div className="flex items-center justify-between">
          <div className="text-3xl font-bold">{metrics.pullRequests.total}</div>
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
      <StatCard
        title="Issues"
        icon={MessageCircleWarning}
        bgColor="bg-amber-500/10 group-hover:bg-amber-500/20"
        modalTitle={`Top Issues (${intervalTypeTitle})`}
        modalContent={<IssuesListModalContent issues={metrics.topIssues} />}
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
  );
}
