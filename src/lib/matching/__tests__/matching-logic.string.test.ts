import { describe, test, expect } from "bun:test";
import { matchString } from "../matching-logic";

describe("matchString", () => {
  const content = "this is a test string";

  // Basic matching
  test("should match when string is contained in content", () => {
    expect(matchString("test", content, {})).toBe(true);
  });

  test("should not match when string is not in content", () => {
    expect(matchString("missing", content, {})).toBe(false);
  });

  // Case sensitivity
  test("should be case insensitive by default", () => {
    expect(matchString("TEST", content, {})).toBe(true);
    expect(matchString("STRING", content, {})).toBe(true);
  });

  test("should respect case sensitivity option", () => {
    expect(matchString("TEST", content, { caseSensitive: true })).toBe(false);
    expect(matchString("string", content, { caseSensitive: true })).toBe(true);
  });

  // Word boundary
  test("should match word parts by default (wordBoundary: false)", () => {
    expect(matchString("tes", content, {})).toBe(true);
    expect(matchString("str", content, {})).toBe(true);
  });

  test("should respect word boundary option (positive cases)", () => {
    expect(matchString("test", content, { wordBoundary: true })).toBe(true);
    expect(matchString("string", content, { wordBoundary: true })).toBe(true);
    expect(matchString("a", content, { wordBoundary: true })).toBe(true);
    expect(matchString("is", content, { wordBoundary: true })).toBe(true);
  });

  test("should respect word boundary option (negative cases)", () => {
    expect(matchString("tes", content, { wordBoundary: true })).toBe(false);
    expect(matchString("str", content, { wordBoundary: true })).toBe(false);
    expect(matchString("testing", content, { wordBoundary: true })).toBe(false); // Pattern longer than word
  });

  test("should handle word boundary with case insensitivity", () => {
    expect(
      matchString("TEST", content, {
        wordBoundary: true,
        caseSensitive: false,
      }),
    ).toBe(true);
    expect(
      matchString("TES", content, { wordBoundary: true, caseSensitive: false }),
    ).toBe(false);
  });

  test("should handle word boundary with case sensitivity", () => {
    expect(
      matchString("test", content, { wordBoundary: true, caseSensitive: true }),
    ).toBe(true);
    expect(
      matchString("TEST", content, { wordBoundary: true, caseSensitive: true }),
    ).toBe(false);
  });

  // Note: The 'negative' option is handled by the createMatcher function, not directly by matchString.
});
