"use client";

import { useState } from "react";
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

export interface LeaderboardProps {
  users: UserFocusAreaData[];
  period: LeaderboardPeriod;
}

export function Leaderboard({ users, period }: LeaderboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("all");
  const [currentPeriod, setCurrentPeriod] = useState<LeaderboardPeriod>(period);

  const filteredUsers = users
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

  const allSkills = Array.from(
    new Set(users.flatMap((user) => Object.keys(user.tag_levels)))
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Input
          placeholder="Search players..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={selectedSkill} onValueChange={setSelectedSkill}>
          <SelectTrigger className="w-[180px]">
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
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <LeaderboardContent users={filteredUsers} />
        </TabsContent>
        <TabsContent value="monthly">
          <LeaderboardContent users={filteredUsers} />
        </TabsContent>
        <TabsContent value="weekly">
          <LeaderboardContent users={filteredUsers} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LeaderboardContent({ users }: { users: UserFocusAreaData[] }) {
  return (
    <div className="border rounded-lg divide-y">
      {users.map((user, index) => (
        <LeaderboardCard key={user.username} user={user} rank={index + 1} />
      ))}
    </div>
  );
}
