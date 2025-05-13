import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LucideIcon, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  icon: LucideIcon;
  bgColor?: string;
  children: React.ReactNode;
  className?: string;
  modalContent?: React.ReactNode;
  modalTitle?: string;
}

export function StatCard({
  title,
  icon: Icon,
  bgColor = "bg-primary/10",
  children,
  className,
  modalContent,
  modalTitle,
}: StatCardProps) {
  const HeaderContent = (
    <div className="flex w-full items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" /> {title}
      </div>
      {modalContent && (
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );

  const CardItself = (
    <Card className={cn("flex flex-col overflow-hidden", className)}>
      {modalContent ? (
        <DialogTrigger asChild>
          <CardHeader
            className={cn(
              bgColor,
              "py-4",
              "cursor-pointer transition-colors hover:bg-muted/50",
            )}
          >
            <CardTitle className="text-sm font-medium">
              {HeaderContent}
            </CardTitle>
          </CardHeader>
        </DialogTrigger>
      ) : (
        <CardHeader className={cn(bgColor, "py-4")}>
          <CardTitle className="text-sm font-medium">{HeaderContent}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex-grow p-4">{children}</CardContent>
    </Card>
  );

  if (modalContent) {
    return (
      <Dialog>
        {CardItself}
        <DialogContent className="gap-0 p-0 sm:max-w-[525px]">
          <DialogHeader className="border-b border-border p-6">
            <DialogTitle>{modalTitle || title}</DialogTitle>
          </DialogHeader>
          {modalContent}
        </DialogContent>
      </Dialog>
    );
  }

  return CardItself;
}
