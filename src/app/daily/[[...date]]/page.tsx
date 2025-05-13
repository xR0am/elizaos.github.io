import { redirect } from "next/navigation";

interface DailyPageProps {
  params: {
    date?: string[];
  };
}

export default function DailyRedirectPage({ params }: DailyPageProps) {
  const { date } = params;

  // Redirect to the new URL structure
  if (date && date.length > 0) {
    redirect(`/day/${date[0]}`);
  } else {
    redirect("/day");
  }
}
