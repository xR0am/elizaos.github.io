import { redirect } from "next/navigation";

interface DailyPageProps {
  params: Promise<{
    date?: string[];
  }>;
}

export default async function DailyRedirectPage({ params }: DailyPageProps) {
  const { date } = await params;

  // Redirect to the new URL structure
  if (date && date.length > 0) {
    redirect(`/day/${date[0]}`);
  } else {
    redirect("/day");
  }
}
