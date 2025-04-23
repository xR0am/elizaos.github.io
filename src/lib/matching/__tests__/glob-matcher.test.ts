import { describe, test, expect } from "bun:test";
import { GlobPatternMatcher } from "../glob-matcher";
import { TagPatternType } from "../../data/tags";

describe("GlobPatternMatcher", () => {
  // Basic glob matching
  test("should match simple glob patterns", () => {
    const matcher = new GlobPatternMatcher(
      "*.ts",
      {},
      TagPatternType.FILE_PATH,
    );
    expect(
      matcher.test({
        content: "file.ts",
        contentType: TagPatternType.FILE_PATH,
      }),
    ).toBe(true);
    expect(
      matcher.test({
        content: "path/to/file.ts",
        contentType: TagPatternType.FILE_PATH,
      }),
    ).toBe(false); // Doesn't match full path
    expect(
      matcher.test({
        content: "file.js",
        contentType: TagPatternType.FILE_PATH,
      }),
    ).toBe(false);
  });

  test("should handle wildcard * matching", () => {
    const matcher = new GlobPatternMatcher(
      "src/**/*.ts",
      {},
      TagPatternType.FILE_PATH,
    );
    expect(
      matcher.test({
        content: "src/lib/file.ts",
        contentType: TagPatternType.FILE_PATH,
      }),
    ).toBe(true);
    expect(
      matcher.test({
        content: "src/components/ui/button.ts",
        contentType: TagPatternType.FILE_PATH,
      }),
    ).toBe(true);
    expect(
      matcher.test({
        content: "src/file.js",
        contentType: TagPatternType.FILE_PATH,
      }),
    ).toBe(false);
    expect(
      matcher.test({
        content: "test/file.ts",
        contentType: TagPatternType.FILE_PATH,
      }),
    ).toBe(false);
  });

  test("should handle wildcard ? matching", () => {
    const matcher = new GlobPatternMatcher(
      "file?.js",
      {},
      TagPatternType.FILE_PATH,
    );
    expect(
      matcher.test({
        content: "file1.js",
        contentType: TagPatternType.FILE_PATH,
      }),
    ).toBe(true);
    expect(
      matcher.test({
        content: "fileA.js",
        contentType: TagPatternType.FILE_PATH,
      }),
    ).toBe(true);
    expect(
      matcher.test({
        content: "file.js",
        contentType: TagPatternType.FILE_PATH,
      }),
    ).toBe(false);
    expect(
      matcher.test({
        content: "file12.js",
        contentType: TagPatternType.FILE_PATH,
      }),
    ).toBe(false);
  });

  // Case sensitivity
  test("should be case insensitive by default", () => {
    const matcher = new GlobPatternMatcher(
      "*.TS",
      {},
      TagPatternType.FILE_PATH,
    );
    expect(
      matcher.test({
        content: "file.ts",
        contentType: TagPatternType.FILE_PATH,
      }),
    ).toBe(true);
  });

  test("should respect case sensitivity option", () => {
    const matcher = new GlobPatternMatcher(
      "*.TS",
      { caseSensitive: true },
      TagPatternType.FILE_PATH,
    );
    expect(
      matcher.test({
        content: "file.ts",
        contentType: TagPatternType.FILE_PATH,
      }),
    ).toBe(false);
    expect(
      matcher.test({
        content: "file.TS",
        contentType: TagPatternType.FILE_PATH,
      }),
    ).toBe(true);
  });

  // Negative patterns
  test("should invert match when negative option is true", () => {
    const matcher = new GlobPatternMatcher(
      "*.ts",
      { negative: true },
      TagPatternType.FILE_PATH,
    );
    expect(
      matcher.test({
        content: "file.ts",
        contentType: TagPatternType.FILE_PATH,
      }),
    ).toBe(false);
    expect(
      matcher.test({
        content: "file.js",
        contentType: TagPatternType.FILE_PATH,
      }),
    ).toBe(true);
  });
});
