import { notFound } from "next/navigation";
import {
  getAllDailySummaryDates,
  getDailySummary,
  getLatestDailySummary,
} from "@/lib/get-daily-summaries";
import { extractDateFromTitle } from "@/lib/date-utils";

export interface DailySummaryResult {
  summary: any; // Replace 'any' with your actual summary type
  navigation: {
    prevDate: string | null;
    nextDate: string | null;
    currentDate: string;
  };
}

interface DateData {
  latestSummary: any; // Replace with your actual summary type
  latestDate: string;
  allDates: string[];
}

export async function fetchDateData(): Promise<DateData> {
  const [latestSummary, historicalDates] = await Promise.all([
    getLatestDailySummary(),
    getAllDailySummaryDates(),
  ]);

  const latestDate = extractDateFromTitle(latestSummary.title);
  if (!latestDate) {
    throw new Error("Latest summary does not contain a valid date");
  }

  const allDates = [
    latestDate,
    ...historicalDates.filter((date) => date !== latestDate),
  ];

  return { latestSummary, latestDate, allDates };
}

export async function getDailySummaryData(
  targetDate?: string
): Promise<DailySummaryResult> {
  const { latestSummary, latestDate, allDates } = await fetchDateData();

  const summary = targetDate
    ? await getDailySummary(targetDate)
    : latestSummary;

  if (!summary) {
    notFound();
  }
  const date = targetDate || latestDate;

  const currentIndex = allDates.indexOf(date);

  return {
    summary,
    navigation: {
      prevDate:
        currentIndex < allDates.length - 1 ? allDates[currentIndex + 1] : null,
      nextDate: currentIndex > 0 ? allDates[currentIndex - 1] : null,
      currentDate: extractDateFromTitle(summary.title) || "",
    },
  };
}
