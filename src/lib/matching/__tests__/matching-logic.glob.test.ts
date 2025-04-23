import { describe, test, expect } from "bun:test";
import { matchGlob } from "../matching-logic";

describe("matchGlob", () => {
  // Basic glob matching
  test("should match simple glob patterns against full paths", () => {
    expect(matchGlob("*.ts", "file.ts", {})).toBe(true);
    expect(matchGlob("file.ts", "file.ts", {})).toBe(true);
    expect(matchGlob("*.ts", "path/to/file.ts", {})).toBe(false); // Doesn't match full path by default
    expect(matchGlob("file.js", "file.ts", {})).toBe(false);
  });

  test("should handle wildcard ** matching", () => {
    expect(matchGlob("src/**/*.ts", "src/lib/file.ts", {})).toBe(true);
    expect(matchGlob("src/**/*.ts", "src/components/ui/button.ts", {})).toBe(
      true,
    );
    expect(matchGlob("src/**/*.ts", "src/file.js", {})).toBe(false);
    expect(matchGlob("src/**/*.ts", "test/file.ts", {})).toBe(false);
    expect(matchGlob("**/*.ts", "path/to/file.ts", {})).toBe(true); // Matches any path ending in .ts
  });

  test("should handle wildcard * matching within paths", () => {
    expect(matchGlob("src/*/file.ts", "src/lib/file.ts", {})).toBe(true);
    expect(matchGlob("src/*/file.ts", "src/lib/nested/file.ts", {})).toBe(
      false,
    ); // * doesn't cross /
    expect(matchGlob("src/lib/*.ts", "src/lib/file.ts", {})).toBe(true);
  });

  test("should handle wildcard ? matching", () => {
    expect(matchGlob("file?.js", "file1.js", {})).toBe(true);
    expect(matchGlob("file?.js", "fileA.js", {})).toBe(true);
    expect(matchGlob("file?.js", "file.js", {})).toBe(false);
    expect(matchGlob("file?.js", "file12.js", {})).toBe(false);
  });

  test("should match dotfiles", () => {
    expect(matchGlob(".*", ".gitignore", {})).toBe(true);
    expect(matchGlob(".github/*", ".github/workflows", {})).toBe(true);
    expect(matchGlob("*.yml", ".github/workflows/ci.yml", {})).toBe(false); // Doesn't match full path
    expect(matchGlob("**/*.yml", ".github/workflows/ci.yml", {})).toBe(true);
  });

  // Case sensitivity
  test("should be case insensitive by default", () => {
    expect(matchGlob("*.TS", "file.ts", {})).toBe(true);
    expect(matchGlob("SRC/**/*.ts", "src/lib/file.ts", {})).toBe(true);
  });

  test("should respect case sensitivity option", () => {
    expect(matchGlob("*.TS", "file.ts", { caseSensitive: true })).toBe(false);
    expect(matchGlob("*.TS", "file.TS", { caseSensitive: true })).toBe(true);
    expect(
      matchGlob("SRC/**/*.ts", "src/lib/file.ts", { caseSensitive: true }),
    ).toBe(false);
    expect(
      matchGlob("src/**/*.ts", "src/lib/file.ts", { caseSensitive: true }),
    ).toBe(true);
  });

  test("should ignore word boundary option", () => {
    // Suppress console.warn for this test
    const originalWarn = console.warn;
    console.warn = () => {};
    // wordBoundary should have no effect
    expect(matchGlob("*.ts", "file.ts", { wordBoundary: true })).toBe(true);
    expect(
      matchGlob("file.ts", "file.ts", {
        wordBoundary: true,
        caseSensitive: true,
      }),
    ).toBe(true);
    console.warn = originalWarn; // Restore console.warn
  });

  // Note: The 'negative' option is handled by the createMatcher function, not directly by matchGlob.
  // Note: Path normalization (e.g., `\` to `/`) is handled by preprocessContent, not matchGlob.
});
