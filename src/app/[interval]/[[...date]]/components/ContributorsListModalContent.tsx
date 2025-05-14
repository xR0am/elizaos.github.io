import { ScrollArea } from "@/components/ui/scroll-area";
import { ContributorItem } from "@/components/contributor-item";

interface Contributor {
  username: string;
  totalScore: number;
}

interface ContributorsListModalContentProps {
  contributors: Contributor[];
  intervalType: string;
}

export default function ContributorsListModalContent({
  contributors,
  intervalType,
}: ContributorsListModalContentProps) {
  return (
    <ScrollArea className="max-h-[80vh]">
      <div className="space-y-3 px-4">
        {contributors.map((contributor) => (
          <ContributorItem
            key={contributor.username}
            username={contributor.username}
            href={`/profile/${contributor.username}`}
            stats={`${intervalType} XP: ${contributor.totalScore.toFixed(0)}`}
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
