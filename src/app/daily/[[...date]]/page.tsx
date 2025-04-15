import { DateNavigation, DailyMetricsDisplay } from "./components";
import { getDailyMetrics, getLatestAvailableDate } from "./queries";
import { notFound } from "next/navigation";
import pipelineConfig from "@/../config/pipeline.config";
import { generateDaysInRange, findAdjacentDates } from "@/lib/date-utils";

interface PageProps {
  params: Promise<{
    date: string[] | undefined;
  }>;
}

export async function generateStaticParams() {
  const latestDate = await getLatestAvailableDate();
  // Generate all dates starting from config date up to latest date in DB
  const allDates = generateDaysInRange(
    pipelineConfig.contributionStartDate,
    latestDate,
  );
  return [
    { date: [] },
    ...allDates.map((date) => ({
      date: [date],
    })),
  ];
}

export default async function DailySummaryPage({ params }: PageProps) {
  const { date } = await params;
  const latestDate = await getLatestAvailableDate();
  const targetDate = date?.[0] || latestDate;

  try {
    // Fetch daily metrics for the current date
    const dailyMetrics = await getDailyMetrics(targetDate);

    // Find adjacent dates for navigation
    const { prevDate, nextDate } = findAdjacentDates(targetDate, latestDate);

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
