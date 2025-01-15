import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DailySummary } from "@/lib/get-daily-summaries";
import { DailySummaryContent } from "@/components/daily-summary-content";
import { extractDateFromTitle } from "@/lib/date-utils";

export function DailySummaryCard({ data }: { data: DailySummary }) {
  const date = extractDateFromTitle(data.title) || "";

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
