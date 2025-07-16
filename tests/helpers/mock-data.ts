import { faker } from "@faker-js/faker";
import type { InferInsertModel } from "drizzle-orm";
import type {
  users,
  userDailyScores,
  rawPullRequests,
  rawIssues,
  issueComments,
  rawPullRequestFiles,
} from "../../src/lib/data/schema";
import { toDateString } from "../../src/lib/date-utils";
import { UTCDate } from "@date-fns/utc";

type User = InferInsertModel<typeof users>;
type UserDailyScore = InferInsertModel<typeof userDailyScores>;
type RawPullRequest = InferInsertModel<typeof rawPullRequests>;
type RawIssue = InferInsertModel<typeof rawIssues>;
type IssueComment = InferInsertModel<typeof issueComments>;

export function generateMockUsers(items: Partial<User>[]): User[] {
  return items.map((overrides) => ({
    username: faker.internet.username(),
    avatarUrl: faker.image.avatar(),
    isBot: 0,
    ...overrides,
  }));
}

export function generateMockUserDailyScores(
  items: Partial<UserDailyScore>[],
  baseDate: Date | string = new UTCDate(),
): UserDailyScore[] {
  return items.map((overrides) => ({
    id: faker.string.uuid(),
    username: faker.internet.username(),
    date: toDateString(baseDate),
    score: faker.number.int({ min: 10, max: 1000 }),
    category: "day",
    ...overrides,
  }));
}

export function generateMockPullRequests(
  items: Partial<RawPullRequest>[],
  baseDate: Date | string = new UTCDate(),
): RawPullRequest[] {
  const today = toDateString(baseDate);
  return items.map((overrides) => {
    const state = overrides.state ?? "OPEN";
    const merged = state === "MERGED" ? 1 : 0;
    const mergedAt = state === "MERGED" ? today : null;
    const closedAt = ["MERGED", "CLOSED"].includes(state) ? today : null;

    return {
      id: faker.string.uuid(),
      number: faker.number.int({ min: 1, max: 1000 }),
      title: faker.lorem.sentence(),
      author: faker.internet.username(),
      createdAt: today,
      updatedAt: today,
      repository: "test-repo",
      additions: faker.number.int({ min: 0, max: 500 }),
      deletions: faker.number.int({ min: 0, max: 500 }),
      merged,
      mergedAt,
      closedAt,
      state,
      ...overrides,
    };
  });
}

export function generateMockIssues(
  items: Partial<RawIssue>[],
  baseDate: Date | string = new UTCDate(),
): RawIssue[] {
  const today = toDateString(baseDate);
  return items.map((overrides) => {
    const state = overrides.state ?? "OPEN";
    const closedAt = state === "CLOSED" ? today : null;
    return {
      id: faker.string.uuid(),
      number: faker.number.int({ min: 1, max: 1000 }),
      title: faker.lorem.sentence(),
      author: faker.internet.username(),
      createdAt: today,
      updatedAt: today,
      repository: "test-repo",
      state,
      closedAt,
      ...overrides,
    };
  });
}

export function generateMockIssueComments(
  items: Partial<IssueComment>[],
  baseDate: Date | string = new UTCDate(),
): IssueComment[] {
  const today = toDateString(baseDate);

  return items.map((overrides) => ({
    id: faker.string.uuid(),
    issueId: faker.string.uuid(),
    author: faker.internet.username(),
    createdAt: today,
    ...overrides,
  }));
}

export function generateMockPullRequestFiles(
  items: Partial<InferInsertModel<typeof rawPullRequestFiles>>[],
): InferInsertModel<typeof rawPullRequestFiles>[] {
  return items.map((overrides) => {
    const prId = overrides.prId ?? faker.string.uuid();
    const path = overrides.path ?? faker.system.filePath();
    return {
      id: `${prId}_${path}`,
      prId,
      path,
      additions: faker.number.int({ min: 0, max: 200 }),
      deletions: faker.number.int({ min: 0, max: 100 }),
      changeType: "ADDED",
      ...overrides,
    };
  });
}
