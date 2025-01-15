import { redirect } from "next/navigation";
import { getDailySummary } from "@/lib/get-daily-summary";
import { getAllDailySummaryDates } from "@/lib/get-daily-summaries";
import { extractDateFromTitle } from "@/lib/date-utils";

export default async function DailyPage() {
  const [summary, dates] = await Promise.all([
    getDailySummary(),
    getAllDailySummaryDates(),
  ]);

  // Get the current date from the summary title
  const currentDate = extractDateFromTitle(summary.title) || dates[0];

  // Redirect to the current date's page
  redirect(`/daily/${currentDate}`);
}
