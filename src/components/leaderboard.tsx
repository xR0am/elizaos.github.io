"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeaderboardCard } from "./leaderboard-card";
import { LeaderboardPeriod, UserFocusAreaData } from "@/types/user-profile";
import { useRouter, useSearchParams } from "next/navigation";
import { useWindowVirtualizer } from "@tanstack/react-virtual";

export function LeaderboardFallback() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded bg-muted"></div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 rounded bg-muted"></div>
        ))}
      </div>
    </div>
  );
}

export interface LeaderboardTab {
  id: LeaderboardPeriod;
  title: string;
  users: UserFocusAreaData[];
}

export interface LeaderboardProps {
  tabs: LeaderboardTab[];
}

export function Leaderboard({ tabs }: LeaderboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkill, setSelectedSkill] = useState(
    searchParams.get("skill") || "all",
  );
  const [currentPeriod, setCurrentPeriod] = useState<LeaderboardPeriod>(
    (searchParams.get("period") as LeaderboardPeriod) || "all",
  );

  const currentTab = useMemo(
    () => tabs.find((tab) => tab.id === currentPeriod) || tabs[0],
    [tabs, currentPeriod],
  );

  useEffect(() => {
    setSelectedSkill(searchParams.get("skill") || "all");
  }, [searchParams]);

  useEffect(() => {
    setCurrentPeriod(
      (searchParams.get("period") as LeaderboardPeriod) || "all",
    );
  }, [searchParams]);

  const allSkills = useMemo(() => {
    return Array.from(
      new Set(currentTab.users.flatMap((user) => Object.keys(user.tagLevels))),
    );
  }, [currentTab]);

  const handleSkillChange = useCallback(
    (value: string) => {
      setSelectedSkill(value);
      const params = new URLSearchParams(searchParams);
      if (value === "all") {
        params.delete("skill");
      } else {
        params.set("skill", value);
      }
      router.replace(`?${params.toString()}`);
    },
    [searchParams, router],
  );

  const handlePeriodChange = useCallback(
    (value: string) => {
      setCurrentPeriod(value as LeaderboardPeriod);
      const params = new URLSearchParams(searchParams);
      if (value === "all") {
        params.delete("period");
      } else {
        params.set("period", value);
      }
      router.replace(`?${params.toString()}`);
    },
    [searchParams, router],
  );

  const filteredUsers = useMemo(() => {
    return currentTab.users
      .filter(
        (user) =>
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) &&
          (selectedSkill === "all" ||
            selectedSkill.toLowerCase() in user.tagLevels),
      )
      .sort((a, b) => {
        if (selectedSkill === "all") {
          const totalA = Object.values(a.tagLevels).reduce(
            (sum, tag) => sum + tag.level,
            0,
          );
          const totalB = Object.values(b.tagLevels).reduce(
            (sum, tag) => sum + tag.level,
            0,
          );
          return totalB - totalA;
        } else {
          const skillA = a.tagLevels[selectedSkill]?.level || 0;
          const skillB = b.tagLevels[selectedSkill]?.level || 0;
          return skillB - skillA;
        }
      });
  }, [currentTab.users, searchTerm, selectedSkill]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold capitalize">
        {selectedSkill === "all" ? (
          currentPeriod === "all" ? (
            "Overall"
          ) : (
            `${currentPeriod}`
          )
        ) : (
          <>
            {currentPeriod !== "all" && <span>{currentPeriod} </span>}
            <span className="text-primary">{selectedSkill}</span>
          </>
        )}{" "}
        Leaderboard
      </h2>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Input
          placeholder="Search players..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={selectedSkill} onValueChange={handleSkillChange}>
          <SelectTrigger
            className={`w-[180px] ${
              selectedSkill !== "all" ? "border-primary" : ""
            }`}
          >
            <SelectValue placeholder="Filter by skill" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Skills</SelectItem>
            {allSkills.map((skill) => (
              <SelectItem key={skill} value={skill.toLowerCase()}>
                {skill}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={currentPeriod} onValueChange={handlePeriodChange}>
        <TabsList className="grid w-full grid-cols-3">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.title}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id}>
            <LeaderboardList
              users={filteredUsers}
              onSkillClick={handleSkillChange}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

const VirtualizedLeaderboardList = ({
  users,
  onSkillClick,
}: {
  users: UserFocusAreaData[];
  onSkillClick: (skill: string) => void;
}) => {
  const listRef = useRef<HTMLDivElement>(null);

  const virtualizer = useWindowVirtualizer({
    count: users.length,
    estimateSize: () => 72,
    overscan: 15,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });

  return (
    <div ref={listRef} className="divide-y rounded-lg border">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualRow.size}px`,
              transform: `translateY(${
                virtualRow.start - virtualizer.options.scrollMargin
              }px)`,
            }}
          >
            <LeaderboardCard
              user={users[virtualRow.index]}
              rank={virtualRow.index + 1}
              onSkillClick={onSkillClick}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const LeaderboardList = ({
  users,
  onSkillClick,
}: {
  users: UserFocusAreaData[];
  onSkillClick: (skill: string) => void;
}) => {
  return (
    <VirtualizedLeaderboardList users={users} onSkillClick={onSkillClick} />
  );
};
