import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, CalendarRange } from "lucide-react";
import { IntervalType } from "@/lib/date-utils";

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
