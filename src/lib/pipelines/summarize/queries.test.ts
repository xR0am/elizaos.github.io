import { describe, expect, it, beforeEach, mock } from "bun:test";
import { setupTestDb } from "../../../../tests/helpers/db";
import * as schema from "../../data/schema";
import {
  generateMockUsers,
  generateMockPullRequests,
  generateMockIssues,
  generateMockUserSummaries,
  generateMockRepoSummaries,
} from "../../../../tests/helpers/mock-data";
import {
  getContributorMetrics,
  getContributorSummariesForInterval,
  getRepoSummariesForInterval,
  getActiveReposInInterval,
  getAllRepoSummariesForInterval,
} from "./queries";
import { toDateString } from "../../date-utils";
import { UTCDate } from "@date-fns/utc";

describe("Summarize Queries", () => {
  let db: ReturnType<typeof setupTestDb>;
  const testUser = { username: "test-user" };
  const testRepo = { id: "test-repo" };
  const baseDate = "2024-07-15";
  const interval = {
    intervalType: "day" as const,
    intervalStart: new UTCDate(baseDate),
    intervalEnd: new UTCDate("2024-07-16"),
  };

  beforeEach(async () => {
    db = setupTestDb();
    mock.module("../../data/db", () => ({ db }));
    await db.insert(schema.users).values(generateMockUsers([testUser]));
  });

  describe("getContributorMetrics", () => {
    it("should calculate correct metrics for a contributor", async () => {
      await db.insert(schema.rawPullRequests).values(
        generateMockPullRequests(
          [
            { author: testUser.username, state: "MERGED", additions: 100 },
            { author: testUser.username, state: "OPEN", additions: 50 },
          ],
          baseDate,
        ),
      );
      const metrics = await getContributorMetrics({
        username: testUser.username,
        dateRange: { startDate: baseDate, endDate: "2024-07-16" },
      });
      expect(metrics.pullRequests.total).toBe(2);
      expect(metrics.pullRequests.merged).toBe(1);
    });
  });

  describe("getContributorSummariesForInterval", () => {
    it("should retrieve summaries for given usernames and interval", async () => {
      await db.insert(schema.userSummaries).values(
        generateMockUserSummaries([
          {
            username: testUser.username,
            date: toDateString(interval.intervalStart),
            intervalType: "day",
            summary: "test summary",
          },
        ]),
      );
      const summaries = await getContributorSummariesForInterval(
        [testUser.username],
        interval,
      );
      expect(summaries.get(testUser.username)).toBe("test summary");
    });
  });

  describe("getRepoSummariesForInterval", () => {
    it("should retrieve daily summaries for a repo within an interval", async () => {
      await db.insert(schema.repoSummaries).values(
        generateMockRepoSummaries([
          {
            repoId: testRepo.id,
            date: "2024-07-15",
            intervalType: "day",
            summary: "daily summary",
          },
        ]),
      );
      const summaries = await getRepoSummariesForInterval(
        testRepo.id,
        interval,
      );
      expect(summaries.length).toBe(1);
      expect(summaries[0].summary).toBe("daily summary");
    });
  });

  describe("getActiveReposInInterval", () => {
    it("should find repos with PR activity in the interval", async () => {
      await db
        .insert(schema.rawPullRequests)
        .values(
          generateMockPullRequests(
            [{ repository: testRepo.id, createdAt: baseDate }],
            baseDate,
          ),
        );
      const activeRepos = await getActiveReposInInterval(interval);
      expect(activeRepos).toContain(testRepo.id);
    });
  });

  describe("getAllRepoSummariesForInterval", () => {
    it("should retrieve all repo summaries for a specific interval", async () => {
      await db.insert(schema.repoSummaries).values(
        generateMockRepoSummaries([
          {
            repoId: testRepo.id,
            date: toDateString(interval.intervalStart),
            intervalType: "day",
            summary: "repo summary",
          },
        ]),
      );
      const summaries = await getAllRepoSummariesForInterval(interval);
      expect(summaries.length).toBe(1);
      expect(summaries[0].summary).toBe("repo summary");
    });
  });
});
