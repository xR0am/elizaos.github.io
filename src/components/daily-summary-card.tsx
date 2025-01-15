import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DailySummaryData } from "@/lib/get-daily-summary";
import { DailySummaryContent } from "@/components/daily-summary-content";

export function DailySummaryCard({ data }: { data: DailySummaryData }) {
  // Extract date from title (format: "elizaos Eliza (2025-01-12)")
  const dateMatch = data.title.match(/\(([^)]+)\)/);
  const date = dateMatch ? dateMatch[1] : "";

  return (
    <Card className="bg-muted/50 transition-colors">
      <Accordion type="single" collapsible defaultValue="content">
        <AccordionItem value="content" className="border-none">
          <CardHeader className="py-0">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">
                  Daily Summary ({date})
                </CardTitle>
              </div>
            </AccordionTrigger>
          </CardHeader>
          <AccordionContent>
            <CardContent className="pt-6">
              <DailySummaryContent data={data} />
            </CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
