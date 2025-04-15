import { DateNavigation, DailyMetricsDisplay } from "./components";
import { getDailyMetrics } from "./queries";
import { notFound } from "next/navigation";
import pipelineConfig from "@/../config/pipeline.config";
import {
  generateDateRange,
  findAdjacentDates,
  getCurrentOrTargetDate,
} from "@/lib/date-utils";

interface PageProps {
  params: Promise<{
    date?: string[];
  }>;
}

export async function generateStaticParams() {
  // Generate all dates starting from config date up to today
  const allDates = generateDateRange(pipelineConfig.contributionStartDate);

  return [
    { date: [] }, // For /daily
    ...allDates.map((date) => ({
      date: [date], // For /daily/[date]
    })),
  ];
}

export default async function DailySummaryPage({ params }: PageProps) {
  const { date } = await params;
  const targetDate = date?.[0];

  // Use latest date if no date is provided
  const currentDate = getCurrentOrTargetDate(targetDate);

  try {
    // Fetch daily metrics for the current date
    const dailyMetrics = await getDailyMetrics(currentDate);

    // Find adjacent dates for navigation
    const { prevDate, nextDate } = findAdjacentDates(currentDate);

    // Create navigation props
    const navigation = {
      prevDate,
      nextDate,
      currentDate: dailyMetrics.date,
    };

    return (
      <div className="container mx-auto px-6 py-8 md:px-8">
        <div className="mx-auto max-w-4xl">
          <DateNavigation {...navigation} />
          {/* Display the daily summary with proper DailySummary data */}
          {/* <DailySummaryContent data={summaryData} /> */}
          {/* Display the daily metrics */}
          <div className="mb-8">
            <DailyMetricsDisplay metrics={dailyMetrics} />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error fetching daily metrics:", error);
    notFound();
  }
}
