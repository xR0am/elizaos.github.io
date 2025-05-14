import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  bgColor = "bg-primary/10 group-hover:bg-primary/20",
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

  const cardInnerContent = (
    <>
      <CardHeader className={cn(bgColor, "w-full py-4 transition-colors")}>
        <CardTitle className="text-sm font-medium">{HeaderContent}</CardTitle>
      </CardHeader>
      <CardContent className="w-full flex-grow p-4">{children}</CardContent>
    </>
  );

  if (modalContent) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <button
            className={cn(
              "group flex flex-col rounded-md border bg-card text-card-foreground shadow-sm",
              "ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              className,
            )}
          >
            {cardInnerContent}
          </button>
        </DialogTrigger>
        <DialogContent className="gap-0 p-0 sm:max-w-[525px]">
          <DialogHeader className="border-b border-border p-6">
            <DialogTitle>{modalTitle || title}</DialogTitle>
          </DialogHeader>
          {modalContent}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card className={cn("flex flex-col overflow-hidden", className)}>
      {cardInnerContent}
    </Card>
  );
}
