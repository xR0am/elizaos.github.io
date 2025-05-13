import { DateNavigation, MetricsDisplay } from "./components";
import {
  getMetricsForInterval,
  getLatestAvailableDate,
  getIntervalSummaryContent,
} from "./queries";
import { notFound } from "next/navigation";
import pipelineConfig from "@/../config/pipeline.config";
import {
  IntervalType,
  generateTimeIntervalsForDateRange,
  toDateString,
  formatIntervalForPath,
  TimeInterval,
} from "@/lib/date-utils";
import { UTCDate } from "@date-fns/utc";
import { subDays, addDays } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { visit, SKIP } from "unist-util-visit";
import { Node, Parent } from "unist";
import { Heading } from "mdast";
import { type HTMLProps } from "react";

// Custom remark plugin to remove the first H1
const remarkRemoveFirstH1 = () => {
  let firstH1Removed = false;
  return (tree: Node) => {
    visit(
      tree,
      "heading",
      (node: Heading, index: number | null, parent: Parent | undefined) => {
        // Check if it's an H1 (depth: 1) and it hasn't been removed yet
        if (!firstH1Removed && node.depth === 1) {
          if (parent && parent.children && typeof index === "number") {
            parent.children.splice(index, 1); // Remove the node
            firstH1Removed = true;
            return [SKIP, index];
          }
        }
      },
    );
    firstH1Removed = false;
  };
};

// Custom H2 component to apply primary color
const CustomH2 = (props: HTMLProps<HTMLHeadingElement>) => {
  // props includes children and any other attributes (like id)
  return <h2 className="lowercase" {...props} />;
};

interface PageProps {
  params: Promise<{
    interval: string;
    date?: string[];
  }>;
}

interface StaticParam {
  interval: string;
  date?: string[];
}

export async function generateStaticParams(): Promise<StaticParam[]> {
  const latestDate = await getLatestAvailableDate();
  const intervals: IntervalType[] = ["day", "week", "month"];

  const params: StaticParam[] = [];

  // Add empty date params for each interval (latest)
  intervals.forEach((intervalType) => {
    params.push({ interval: intervalType, date: [] });
  });

  // Generate intervals from contribution start date to latest
  intervals.forEach((intervalType) => {
    const timeIntervals = generateTimeIntervalsForDateRange(intervalType, {
      startDate: pipelineConfig.contributionStartDate,
      endDate: latestDate,
    });

    // Add params for each interval date
    timeIntervals.forEach((interval) => {
      const dateParam = formatIntervalForPath(interval);
      params.push({
        interval: intervalType,
        date: dateParam,
      });
    });
  });

  return params;
}

/**
 * Find adjacent intervals using the same logic as generateTimeIntervalsForDateRange
 */
function findAdjacentIntervals(
  currentInterval: TimeInterval,
  latestDate: string,
): {
  prevDate: string | null;
  nextDate: string | null;
} {
  const { intervalType, intervalStart } = currentInterval;

  // Generate a range of intervals spanning before and after the current date
  // We'll use a wider date range around the current interval
  const lookbackPeriod = 60; // Look back 60 days to ensure we capture previous intervals
  const startDate = toDateString(subDays(intervalStart, lookbackPeriod));

  const intervals = generateTimeIntervalsForDateRange(intervalType, {
    startDate,
    endDate: latestDate,
  });

  // Find the current interval's index
  const currentIntervalStartStr = toDateString(intervalStart);
  const currentIndex = intervals.findIndex(
    (interval) =>
      toDateString(interval.intervalStart) === currentIntervalStartStr,
  );

  if (currentIndex === -1) {
    // Should never happen but handle the case anyway
    return { prevDate: null, nextDate: null };
  }

  // Determine previous interval (if any)
  const prevInterval = currentIndex > 0 ? intervals[currentIndex - 1] : null;

  // Determine next interval (if any)
  const nextInterval =
    currentIndex < intervals.length - 1 ? intervals[currentIndex + 1] : null;

  // Format interval dates for the URL
  const prevDate = prevInterval ? formatIntervalForPath(prevInterval)[0] : null;
  const nextDate = nextInterval ? formatIntervalForPath(nextInterval)[0] : null;

  return { prevDate, nextDate };
}

export default async function IntervalSummaryPage({ params }: PageProps) {
  const { interval, date } = await params;
  const intervalType = ["day", "week", "month"].includes(interval as string)
    ? (interval as IntervalType)
    : "day";

  const latestDate = await getLatestAvailableDate();

  try {
    // If no date provided, use the latest date with proper formatting for the interval type
    let targetDate: string;
    if (!date || date.length === 0) {
      // Format the latest date based on interval type
      const latestDateObj = new UTCDate(latestDate);
      if (intervalType === "month") {
        targetDate = `${latestDateObj.getFullYear()}-${String(latestDateObj.getMonth() + 1).padStart(2, "0")}`;
      } else if (intervalType === "week") {
        // Align with generateTimeIntervalsForDateRange: use start of the week (Sunday)
        const startOfWeek = addDays(latestDateObj, -latestDateObj.getUTCDay());
        targetDate = toDateString(startOfWeek);
      } else {
        // 'day'
        // For day, use the latest date directly
        targetDate = latestDate;
      }
    } else {
      targetDate = date[0];
    }

    // Fetch metrics for the current interval
    const metrics = await getMetricsForInterval(targetDate, intervalType);

    // Fetch summary content for the current interval
    const summaryContent = await getIntervalSummaryContent(
      targetDate,
      intervalType,
    );

    // Find adjacent intervals for navigation
    const { prevDate, nextDate } = findAdjacentIntervals(
      metrics.interval,
      latestDate,
    );

    // Create navigation props
    const navigation = {
      prevDate,
      nextDate,
      currentDate: targetDate,
      intervalType,
    };

    return (
      <div className="container mx-auto px-6 py-8 md:px-8">
        <div className="mx-auto max-w-4xl">
          <DateNavigation {...navigation} />
          <div className="mb-8">
            <MetricsDisplay metrics={metrics} />
          </div>
          {summaryContent && (
            <div className="prose prose-sm mx-auto mt-8 dark:prose-invert sm:prose lg:prose-lg xl:prose-xl">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkRemoveFirstH1]}
                components={{
                  h2: CustomH2,
                }}
              >
                {summaryContent}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error(`Error fetching ${intervalType} metrics:`, error);
    notFound();
  }
}
