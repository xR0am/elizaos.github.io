import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar,
  CalendarDays,
  CalendarRange,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { IntervalMetrics } from "./queries";

// Import our generic components
import { ContributorItem } from "@/components/contributor-item";
import { BadgeList, type BadgeItem } from "@/components/badge-list";
import { SectionCard } from "@/components/section-card";
import {
  formatTimeframeTitle,
  getIntervalTypeTitle,
  IntervalType,
} from "@/lib/date-utils";

// Import the NEW reusable metrics display components
import { StatCardsDisplay } from "@/components/metrics/StatCardsDisplay";
import { CodeChangesDisplay } from "@/components/metrics/CodeChangesDisplay";

/**
 * Component for switching between different interval views
 */
export function IntervalSelector({
  currentInterval,
  currentDate,
}: {
  currentInterval: IntervalType;
  currentDate: string;
}) {
  const intervals = [
    { type: "day" as const, label: "Daily", icon: Clock },
    { type: "week" as const, label: "Weekly", icon: CalendarRange },
    { type: "month" as const, label: "Monthly", icon: Calendar },
  ];

  return (
    <div className="mb-6 flex justify-center gap-2">
      {intervals.map((interval) => {
        const Icon = interval.icon;
        const isActive = interval.type === currentInterval;

        return (
          <Button
            key={interval.type}
            variant={isActive ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link
              href={`/${interval.type}${currentDate && currentInterval === interval.type ? `/${currentDate}` : ""}`}
            >
              <Icon className="mr-1 h-4 w-4" />
              {interval.label}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}

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
  const label = direction === "prev" ? "Previous" : "Next";

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
  intervalType: IntervalType;
}

export function DateNavigation({
  prevDate,
  nextDate,
  currentDate,
  intervalType,
}: DateNavigationProps) {
  return (
    <div className="mb-6">
      <IntervalSelector
        currentInterval={intervalType}
        currentDate={currentDate}
      />

      <div className="flex items-center justify-between">
        <NavigationButton
          href={prevDate ? `/${intervalType}/${prevDate}` : "#"}
          direction="prev"
          isVisible={!!prevDate}
        />

        <div className="flex flex-col items-center">
          <div className="text-sm font-medium text-gray-500">
            {getIntervalTypeTitle(intervalType)} Summary
          </div>
          <time dateTime={currentDate} className="text-md font-bold">
            {formatTimeframeTitle(currentDate, intervalType)}
          </time>
        </div>

        <NavigationButton
          href={nextDate ? `/${intervalType}/${nextDate}` : "#"}
          direction="next"
          isVisible={!!nextDate}
        />
      </div>
    </div>
  );
}

/**
 * Component to display metrics for a specific interval in a structured layout
 */
export function MetricsDisplay({ metrics }: { metrics: IntervalMetrics }) {
  // Convert focus areas to badge items
  const focusAreaBadges: BadgeItem[] = metrics.focusAreas.map(
    (area, index) => ({
      id: index,
      label: area.area,
    }),
  );

  return (
    <div className="space-y-6">
      {/* Use the reusable StatCardsDisplay component */}
      <StatCardsDisplay metrics={metrics} />

      {/* Use the reusable CodeChangesDisplay component */}
      <CodeChangesDisplay metrics={metrics} />

      {/* Focus Areas */}
      {/* {metrics.focusAreas.length > 0 && (
        <SectionCard title="Focus Areas">
          <BadgeList items={focusAreaBadges} />
        </SectionCard>
      )} */}
    </div>
  );
}

// For backward compatibility
export { MetricsDisplay as DailyMetricsDisplay };
