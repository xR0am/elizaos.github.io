import { DailySummaryContent } from "@/components/daily-summary-content";
import { DateNavigation } from "./components";
import { getDailySummaryData, fetchDateData } from "./utils";

interface PageProps {
  params: Promise<{
    date?: string[];
  }>;
}

export async function generateStaticParams() {
  const { allDates } = await fetchDateData();

  return [
    { date: [] }, // For /daily
    ...allDates.map((date) => ({
      date: [date], // For /daily/[date]
    })),
  ];
}

export default async function DailySummaryPage({ params }: PageProps) {
  const { date } = await params;
  const { summary, navigation } = await getDailySummaryData(date?.[0]);

  return (
    <div className="container mx-auto py-8 px-6 md:px-8">
      <div className="max-w-4xl mx-auto">
        <DateNavigation {...navigation} />
        <DailySummaryContent data={summary} />
      </div>
    </div>
  );
}
