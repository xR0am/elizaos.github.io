import { describe, test, expect } from "bun:test";
import { RegexPatternMatcher } from "../regex-matcher";
import { TagPatternType } from "../../data/tags";

describe("RegexPatternMatcher", () => {
  // Basic regex matching
  test("should match when regex pattern matches content", () => {
    const matcher = new RegexPatternMatcher(
      "t[aeiou]st",
      {},
      TagPatternType.CODE_CONTENT,
    );

    const result = matcher.test({
      content: "this is a test string",
      contentType: TagPatternType.CODE_CONTENT,
    });

    expect(result).toBe(true);
  });

  test("should not match when regex pattern doesn't match content", () => {
    const matcher = new RegexPatternMatcher(
      "t[0-9]st",
      {},
      TagPatternType.CODE_CONTENT,
    );

    const result = matcher.test({
      content: "this is a test string",
      contentType: TagPatternType.CODE_CONTENT,
    });

    expect(result).toBe(false);
  });

  // Case sensitivity
  test("should be case insensitive by default", () => {
    const matcher = new RegexPatternMatcher(
      "TEST",
      {},
      TagPatternType.CODE_CONTENT,
    );

    const result = matcher.test({
      content: "this is a test string",
      contentType: TagPatternType.CODE_CONTENT,
    });

    expect(result).toBe(true);
  });

  test("should respect case sensitivity option", () => {
    const matcher = new RegexPatternMatcher(
      "TEST",
      { caseSensitive: true },
      TagPatternType.CODE_CONTENT,
    );

    const result = matcher.test({
      content: "this is a test string",
      contentType: TagPatternType.CODE_CONTENT,
    });

    expect(result).toBe(false);
  });

  // Word boundary
  test("should handle word boundary option", () => {
    const matcher = new RegexPatternMatcher(
      "tes",
      { wordBoundary: true },
      TagPatternType.CODE_CONTENT,
    );

    const result = matcher.test({
      content: "this is a test string",
      contentType: TagPatternType.CODE_CONTENT,
    });

    expect(result).toBe(false);

    const matcherForWord = new RegexPatternMatcher(
      "test",
      { wordBoundary: true },
      TagPatternType.CODE_CONTENT,
    );

    const resultForWord = matcherForWord.test({
      content: "this is a test string",
      contentType: TagPatternType.CODE_CONTENT,
    });

    expect(resultForWord).toBe(true);
  });

  // Complex regex patterns
  test("should handle complex regex patterns", () => {
    const matcher = new RegexPatternMatcher(
      "^this.*test",
      {},
      TagPatternType.CODE_CONTENT,
    );

    const result = matcher.test({
      content: "this is a test string",
      contentType: TagPatternType.CODE_CONTENT,
    });

    expect(result).toBe(true);
  });

  // Negative patterns
  test("should invert match when negative option is true", () => {
    const matcher = new RegexPatternMatcher(
      "test",
      { negative: true },
      TagPatternType.CODE_CONTENT,
    );

    const result = matcher.test({
      content: "this is a test string",
      contentType: TagPatternType.CODE_CONTENT,
    });

    expect(result).toBe(false);

    const result2 = matcher.test({
      content: "this has no match",
      contentType: TagPatternType.CODE_CONTENT,
    });

    expect(result2).toBe(true);
  });
});
