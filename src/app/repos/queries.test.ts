import { beforeAll, describe, expect, it, mock, beforeEach } from "bun:test";
import { setupTestDb } from "@/../src/__testing__/helpers/db";
import { getRepositories } from "./queries";
import * as schema from "@/lib/data/schema";
import {
  generateMockUsers,
  generateMockPullRequests,
  generateMockIssues,
  generateMockUserDailyScores,
  generateMockRepositories,
} from "@/../src/__testing__/helpers/mock-data";

describe("Repository queries", () => {
  let db: ReturnType<typeof setupTestDb>;

  beforeEach(async () => {
    db = setupTestDb();
    mock.module("@/lib/data/db", () => ({ db }));

    await db.insert(schema.repositories).values(
      generateMockRepositories([
        { repoId: "test/repo-1", owner: "test", name: "repo-1" },
        { repoId: "test/repo-2", owner: "test", name: "repo-2" },
      ]),
    );

    const users = generateMockUsers([
      { username: "user1" },
      { username: "user2" },
      { username: "user3" },
    ]);
    await db.insert(schema.users).values(users);

    const prs = generateMockPullRequests([
      { repository: "test/repo-1", author: "user1" },
      { repository: "test/repo-1", author: "user2" },
      { repository: "test/repo-2", author: "user3" },
    ]);
    await db.insert(schema.rawPullRequests).values(prs);

    const issues = generateMockIssues([
      { repository: "test/repo-1", author: "user3" },
    ]);
    await db.insert(schema.rawIssues).values(issues);

    const scores = generateMockUserDailyScores([
      { username: "user1", score: 100 },
      { username: "user2", score: 200 },
      { username: "user3", score: 50 },
    ]);
    await db.insert(schema.userDailyScores).values(scores);
  });

  it("should return a list of repositories sorted by contributor count", async () => {
    const repositories = await getRepositories();

    expect(repositories.length).toBe(2);
    expect(repositories[0].id).toBe("test/repo-1");
    expect(repositories[1].id).toBe("test/repo-2");
  });

  it("should return the correct top contributors for each repository", async () => {
    const repositories = await getRepositories();

    const repo1 = repositories.find((r) => r.id === "test/repo-1");
    expect(repo1?.topContributors.length).toBe(3);
    expect(repo1?.topContributors[0].username).toBe("user2");
    expect(repo1?.topContributors[1].username).toBe("user1");
    expect(repo1?.topContributors[2].username).toBe("user3");
  });
});
