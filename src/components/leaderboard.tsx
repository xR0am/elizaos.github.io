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
      <div className="h-8 bg-muted rounded w-48"></div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded"></div>
        ))}
      </div>
    </div>
  );
}

export interface LeaderboardProps {
  users: UserFocusAreaData[];
  period: LeaderboardPeriod;
}

export function Leaderboard({ users, period }: LeaderboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkill, setSelectedSkill] = useState(
    searchParams.get("skill") || "all"
  );
  const [currentPeriod, setCurrentPeriod] = useState<LeaderboardPeriod>(period);

  useEffect(() => {
    setSelectedSkill(searchParams.get("skill") || "all");
  }, [searchParams]);

  const allSkills = useMemo(() => {
    return Array.from(
      new Set(users.flatMap((user) => Object.keys(user.tag_levels)))
    );
  }, [users]);

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
    [searchParams, router]
  );

  const filteredUsers = useMemo(() => {
    return users
      .filter(
        (user) =>
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) &&
          (selectedSkill === "all" ||
            selectedSkill.toLowerCase() in user.tag_levels)
      )
      .sort((a, b) => {
        if (selectedSkill === "all") {
          const totalA = Object.values(a.tag_levels).reduce(
            (sum, tag) => sum + tag.level,
            0
          );
          const totalB = Object.values(b.tag_levels).reduce(
            (sum, tag) => sum + tag.level,
            0
          );
          return totalB - totalA;
        } else {
          const skillA = a.tag_levels[selectedSkill]?.level || 0;
          const skillB = b.tag_levels[selectedSkill]?.level || 0;
          return skillB - skillA;
        }
      });
  }, [users, searchTerm, selectedSkill]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold capitalize">
        {selectedSkill === "all" ? (
          "Overall"
        ) : (
          <span className="text-primary">{selectedSkill}</span>
        )}{" "}
        Leaderboard
      </h2>

      <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
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

      <Tabs
        value={currentPeriod}
        onValueChange={(value) => setCurrentPeriod(value as LeaderboardPeriod)}
      >
        <TabsList>
          <TabsTrigger value="all">All Time</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <LeaderboardList
            users={filteredUsers}
            onSkillClick={handleSkillChange}
          />
        </TabsContent>
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
    <div ref={listRef} className="border rounded-lg divide-y">
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
