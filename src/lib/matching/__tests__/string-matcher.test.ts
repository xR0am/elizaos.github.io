import { describe, test, expect } from "bun:test";
import { StringPatternMatcher } from "../string-matcher";
import { TagPatternType } from "../../data/tags";

describe("StringPatternMatcher", () => {
  // Basic matching
  test("should match when string is contained in content", () => {
    const matcher = new StringPatternMatcher(
      "test",
      {},
      TagPatternType.CODE_CONTENT,
    );

    const result = matcher.test({
      content: "this is a test string",
      contentType: TagPatternType.CODE_CONTENT,
    });

    expect(result).toBe(true);
  });

  test("should not match when string is not in content", () => {
    const matcher = new StringPatternMatcher(
      "missing",
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
    const matcher = new StringPatternMatcher(
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
    const matcher = new StringPatternMatcher(
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
  test("should match word parts by default", () => {
    const matcher = new StringPatternMatcher(
      "tes",
      {},
      TagPatternType.CODE_CONTENT,
    );

    const result = matcher.test({
      content: "this is a test string",
      contentType: TagPatternType.CODE_CONTENT,
    });

    expect(result).toBe(true);
  });

  test("should respect word boundary option", () => {
    const matcher = new StringPatternMatcher(
      "tes",
      { wordBoundary: true },
      TagPatternType.CODE_CONTENT,
    );

    const result = matcher.test({
      content: "this is a test string",
      contentType: TagPatternType.CODE_CONTENT,
    });

    expect(result).toBe(false);

    const matcherForWord = new StringPatternMatcher(
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

  // Negative patterns
  test("should invert match when negative option is true", () => {
    const matcher = new StringPatternMatcher(
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
