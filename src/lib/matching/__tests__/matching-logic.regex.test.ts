import { describe, test, expect } from "bun:test";
import { matchRegex } from "../matching-logic";

describe("matchRegex", () => {
  const content = "this is a test string 123";

  // Basic regex matching
  test("should match when regex pattern matches content", () => {
    expect(matchRegex("t[aeiou]st", content, {})).toBe(true);
    expect(matchRegex("\\d+", content, {})).toBe(true); // Match digits
  });

  test("should not match when regex pattern doesn't match content", () => {
    expect(matchRegex("t[0-9]st", content, {})).toBe(false);
    expect(matchRegex("^test", content, {})).toBe(false); // Doesn't start with test
  });

  // Case sensitivity
  test("should be case insensitive by default", () => {
    expect(matchRegex("TEST", content, {})).toBe(true);
    expect(matchRegex("STRING", content, {})).toBe(true);
  });

  test("should respect case sensitivity option", () => {
    expect(matchRegex("TEST", content, { caseSensitive: true })).toBe(false);
    expect(matchRegex("string", content, { caseSensitive: true })).toBe(true);
    expect(matchRegex("this is a test", content, { caseSensitive: true })).toBe(
      true,
    );
  });

  // Word boundary
  test("should handle word boundary option when pattern is simple word", () => {
    // Word boundary added automatically
    expect(matchRegex("test", content, { wordBoundary: true })).toBe(true);
    expect(matchRegex("tes", content, { wordBoundary: true })).toBe(false);
    expect(matchRegex("string", content, { wordBoundary: true })).toBe(true);
    expect(matchRegex("str", content, { wordBoundary: true })).toBe(false);
  });

  test("should not add word boundary if pattern already has anchors or boundaries", () => {
    // Pattern already has \b, option should not add another one
    expect(matchRegex("\\btest\\b", content, { wordBoundary: true })).toBe(
      true,
    );
    expect(matchRegex("\\btest", content, { wordBoundary: true })).toBe(true); // Matches start of word
    expect(matchRegex("test\\b", content, { wordBoundary: true })).toBe(true); // Matches end of word

    // Pattern has ^ or $, option should not add \b
    expect(matchRegex("^this", content, { wordBoundary: true })).toBe(true);
    expect(matchRegex("123$", content, { wordBoundary: true })).toBe(true);
  });

  test("should handle word boundary with case insensitivity", () => {
    expect(
      matchRegex("TEST", content, { wordBoundary: true, caseSensitive: false }),
    ).toBe(true);
    expect(
      matchRegex("TES", content, { wordBoundary: true, caseSensitive: false }),
    ).toBe(false);
  });

  test("should handle word boundary with case sensitivity", () => {
    expect(
      matchRegex("test", content, { wordBoundary: true, caseSensitive: true }),
    ).toBe(true);
    expect(
      matchRegex("TEST", content, { wordBoundary: true, caseSensitive: true }),
    ).toBe(false);
  });

  // Complex regex patterns
  test("should handle complex regex patterns", () => {
    expect(matchRegex("^this.*\\d+$", content, {})).toBe(true);
    expect(matchRegex("is\\s+a", content, {})).toBe(true); // Matches 'is' followed by whitespace and 'a'
  });

  test("should return false for invalid regex patterns", () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = () => {};
    expect(matchRegex("[", content, {})).toBe(false); // Invalid regex
    expect(matchRegex("(", content, {})).toBe(false); // Invalid regex
    console.error = originalError; // Restore console.error
  });

  // Note: The 'negative' option is handled by the createMatcher function, not directly by matchRegex.
});
