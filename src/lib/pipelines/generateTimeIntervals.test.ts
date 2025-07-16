import { describe, expect, it } from "bun:test";
import { generateTimeIntervals } from "./generateTimeIntervals";
import { toDateString } from "../date-utils";
import { UTCDate } from "@date-fns/utc";
import { RepoPipelineContext } from "./types";
import { PipelineConfigSchema } from "./pipelineConfig";
import { Logger } from "../logger";

describe("generateTimeIntervals", () => {
  const mockConfig = PipelineConfigSchema.safeParse({
    repositories: [{ owner: "test", name: "test-repo", defaultBranch: "main" }],
    scoring: {},
    tags: { area: [], role: [], tech: [] },
    aiSummary: {
      enabled: false,
      model: "gpt-3.5-turbo",
      contributorSummary: {},
      repoSummary: {},
      overallSummary: {},
    },
  });

  const mockLogger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    fatal: () => {},
    trace: () => {},
    child: () => mockLogger,
  } as unknown as Logger;

  const mockContext: RepoPipelineContext = {
    logger: mockLogger,
    config: mockConfig,
  };

  it("should generate daily intervals correctly", async () => {
    const step = generateTimeIntervals("day");
    const result = await step(
      {},
      {
        ...mockContext,
        dateRange: { startDate: "2024-07-01", endDate: "2024-07-03" },
      },
    );

    expect(result).toHaveLength(3);
    expect(toDateString(result[0].interval.intervalStart)).toBe("2024-07-01");
    expect(toDateString(result[2].interval.intervalEnd)).toBe("2024-07-04");
  });

  it("should generate weekly intervals", async () => {
    const step = generateTimeIntervals("week");
    const result = await step(
      {},
      {
        ...mockContext,
        dateRange: { startDate: "2024-07-01", endDate: "2024-07-15" },
      },
    );
    expect(result).toHaveLength(3); // Weeks of Jul 1, 8, 15
    expect(toDateString(result[0].interval.intervalStart)).toBe("2024-06-30");
    expect(toDateString(result[0].interval.intervalEnd)).toBe("2024-07-07");
  });

  it("should use default start date if none provided", async () => {
    const step = generateTimeIntervals("day");
    const result = await step(
      {},
      {
        ...mockContext,
        config: {
          ...mockConfig,
          contributionStartDate: toDateString(new UTCDate("2024-01-01")),
        },
        dateRange: { endDate: toDateString(new UTCDate("2024-01-08")) },
      },
    );

    expect(result).toHaveLength(8);
  });
});
