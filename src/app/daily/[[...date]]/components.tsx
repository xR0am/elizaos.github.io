import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavigationButtonProps {
  href: string;
  direction: "prev" | "next";
  isVisible: boolean;
}

function NavigationButton({
  href,
  direction,
  isVisible,
}: NavigationButtonProps) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  const label = direction === "prev" ? "Previous Day" : "Next Day";

  return (
    <>
      {/* Desktop */}
      <Button
        variant="outline"
        asChild
        className={cn("hidden sm:flex items-center", !isVisible && "invisible")}
      >
        <Link href={href}>
          {direction === "prev" && <Icon className="h-4 w-4 mr-2" />}
          <span>{label}</span>
          {direction === "next" && <Icon className="h-4 w-4 ml-2" />}
        </Link>
      </Button>

      {/* Mobile */}
      <Button
        variant="outline"
        size="icon"
        asChild
        className={cn("sm:hidden", !isVisible && "invisible")}
      >
        <Link href={href}>
          <Icon className="h-4 w-4" />
          <span className="sr-only">{label}</span>
        </Link>
      </Button>
    </>
  );
}

interface DateNavigationProps {
  prevDate: string | null;
  nextDate: string | null;
  currentDate: string;
}

export function DateNavigation({
  prevDate,
  nextDate,
  currentDate,
}: DateNavigationProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <NavigationButton
        href={prevDate ? `/daily/${prevDate}` : "#"}
        direction="prev"
        isVisible={!!prevDate}
      />

      <time dateTime={currentDate} className="text-md font-bold">
        {currentDate}
      </time>

      <NavigationButton
        href={nextDate ? `/daily/${nextDate}` : "#"}
        direction="next"
        isVisible={!!nextDate}
      />
    </div>
  );
}
