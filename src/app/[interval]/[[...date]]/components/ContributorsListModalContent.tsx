import { ScrollArea } from "@/components/ui/scroll-area";
import { ContributorItem } from "@/components/contributor-item";

interface Contributor {
  username: string;
  totalScore: number;
}

interface ContributorsListModalContentProps {
  contributors: Contributor[];
}

export default function ContributorsListModalContent({
  contributors,
}: ContributorsListModalContentProps) {
  return (
    <ScrollArea className="max-h-[80svh]">
      <div className="divide-y px-0">
        {contributors.map((contributor) => (
          <ContributorItem
            className="border-none px-4"
            key={contributor.username}
            username={contributor.username}
            href={`/profile/${contributor.username}`}
            stats={`XP: ${contributor.totalScore.toFixed(0)}`}
          />
        ))}
        {contributors.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">
            No contributors to display.
          </p>
        )}
      </div>
    </ScrollArea>
  );
}
