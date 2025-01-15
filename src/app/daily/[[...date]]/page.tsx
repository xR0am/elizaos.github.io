import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getAllDailySummaryDates,
  getDailySummary,
  getLatestDailySummary,
} from "@/lib/get-daily-summaries";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DailySummaryContent } from "@/components/daily-summary-content";
import { extractDateFromTitle } from "@/lib/date-utils";

interface PageProps {
  params: Promise<{
    date?: string[];
  }>;
}

export async function generateStaticParams() {
  // Get both latest and historical dates
  const [latestSummary, historicalDates] = await Promise.all([
    getLatestDailySummary(),
    getAllDailySummaryDates(),
  ]);

  const latestDate = extractDateFromTitle(latestSummary.title);
  if (!latestDate) {
    throw new Error("Latest summary does not contain a valid date");
  }

  // Combine latest date with historical dates, removing duplicates
  const allDates = [
    latestDate,
    ...historicalDates.filter((date) => date !== latestDate),
  ];

  return [
    { date: [] }, // For /daily
    ...allDates.map((date) => ({
      date: [date], // For /daily/[date]
    })),
  ];
}

export default async function DailySummaryPage({ params }: PageProps) {
  const { date } = await params;

  // Get both latest and historical dates
  const [latestSummary, historicalDates] = await Promise.all([
    getLatestDailySummary(),
    getAllDailySummaryDates(),
  ]);

  const latestDate = extractDateFromTitle(latestSummary.title);
  if (!latestDate) {
    throw new Error("Latest summary does not contain a valid date");
  }

  // Combine latest date with historical dates, removing duplicates
  const allDates = [
    latestDate,
    ...historicalDates.filter((date) => date !== latestDate),
  ];

  // If no date is provided, use the latest date
  const targetDate = date?.[0] || latestDate;

  // Get the summary for the target date
  const summary =
    targetDate === latestDate
      ? latestSummary
      : await getDailySummary(targetDate);

  if (!summary) {
    notFound();
  }

  // Find current date index and adjacent dates
  const currentIndex = allDates.indexOf(targetDate);
  const prevDate =
    currentIndex < allDates.length - 1 ? allDates[currentIndex + 1] : null;
  const nextDate = currentIndex > 0 ? allDates[currentIndex - 1] : null;

  // Extract date from title (format: "elizaos Eliza (2025-01-12)")
  const displayDate = extractDateFromTitle(summary.title) || "";

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            asChild
            className={!prevDate ? "invisible" : ""}
          >
            <Link
              href={prevDate ? `/daily/${prevDate}` : "#"}
              className="hidden sm:flex items-center"
            >
              <ChevronLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Previous Day</span>
            </Link>
          </Button>
          <Button
            variant="outline"
            size="icon"
            asChild
            className={`${!prevDate ? "invisible" : ""} sm:hidden`}
          >
            <Link href={prevDate ? `/daily/${prevDate}` : "#"}>
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous Day</span>
            </Link>
          </Button>

          <time dateTime={displayDate} className="text-md font-bold">
            {displayDate}
          </time>

          <Button
            variant="outline"
            asChild
            className={!nextDate ? "invisible" : ""}
          >
            <Link
              href={nextDate ? `/daily/${nextDate}` : "#"}
              className="hidden sm:flex items-center"
            >
              <span className="hidden sm:inline">Next Day</span>
              <ChevronRight className="h-4 w-4 sm:ml-2" />
            </Link>
          </Button>
          <Button
            variant="outline"
            size="icon"
            asChild
            className={`${!nextDate ? "invisible" : ""} sm:hidden`}
          >
            <Link href={nextDate ? `/daily/${nextDate}` : "#"}>
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next Day</span>
            </Link>
          </Button>
        </div>

        <DailySummaryContent data={summary} />
      </div>
    </div>
  );
}
