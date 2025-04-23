import { describe, expect, it, beforeEach } from "bun:test";
import { BatchPatternMatcher } from "../batch-matcher";
import { TagPatternType } from "../../data/tags";
import { PatternType } from "../types";

describe("BatchPatternMatcher", () => {
  let batcher: BatchPatternMatcher;

  beforeEach(() => {
    batcher = new BatchPatternMatcher();
  });

  describe("matchBatch", () => {
    it("should match multiple patterns and return indices", () => {
      const patterns = [
        {
          pattern: "typescript",
          patternType: PatternType.STRING,
          target: TagPatternType.COMMIT_MESSAGE,
          options: {},
        },
        {
          pattern: "feature",
          patternType: PatternType.STRING,
          target: TagPatternType.COMMIT_MESSAGE,
          options: {},
        },
        {
          pattern: "bug",
          patternType: PatternType.STRING,
          target: TagPatternType.COMMIT_MESSAGE,
          options: {},
        },
      ];

      const content = {
        content: "Add new typescript feature",
        contentType: TagPatternType.COMMIT_MESSAGE,
      };

      // Should match patterns at index 0 and 1
      const matches = batcher.matchBatch(patterns, content);
      expect(matches).toEqual([0, 1]);
    });

    it("should handle negative patterns correctly", () => {
      const patterns = [
        {
          pattern: "typescript",
          patternType: PatternType.STRING,
          target: TagPatternType.COMMIT_MESSAGE,
          options: {},
        },
        {
          pattern: "experimental",
          patternType: PatternType.STRING,
          target: TagPatternType.COMMIT_MESSAGE,
          options: { negative: true },
        },
      ];

      // Content that matches a positive pattern
      const content1 = {
        content: "Add typescript feature",
        contentType: TagPatternType.COMMIT_MESSAGE,
      };

      // Should match the first pattern
      expect(batcher.matchBatch(patterns, content1)).toEqual([0]);

      // Content that matches both positive and negative patterns
      const content2 = {
        content: "Add experimental typescript feature",
        contentType: TagPatternType.COMMIT_MESSAGE,
      };

      // Should return empty array (rejected by negative pattern)
      expect(batcher.matchBatch(patterns, content2)).toEqual([]);
    });

    it("should only match patterns for the correct content type", () => {
      const patterns = [
        {
          pattern: "typescript",
          patternType: PatternType.STRING,
          target: TagPatternType.COMMIT_MESSAGE,
          options: {},
        },
        {
          pattern: "*.ts",
          patternType: PatternType.GLOB,
          target: TagPatternType.FILE_PATH,
          options: {},
        },
      ];

      // Content that matches the first pattern
      const content = {
        content: "Add typescript feature",
        contentType: TagPatternType.COMMIT_MESSAGE,
      };

      // Should only match the first pattern even though "typescript" might
      // appear to match the second pattern too (different content type)
      expect(batcher.matchBatch(patterns, content)).toEqual([0]);
    });
  });

  describe("matchAny", () => {
    it("should return true if any pattern matches", () => {
      const patterns = [
        {
          pattern: "typescript",
          patternType: PatternType.STRING,
          target: TagPatternType.COMMIT_MESSAGE,
          options: {},
        },
        {
          pattern: "bug",
          patternType: PatternType.STRING,
          target: TagPatternType.COMMIT_MESSAGE,
          options: {},
        },
      ];

      const content = {
        content: "Add typescript feature",
        contentType: TagPatternType.COMMIT_MESSAGE,
      };

      expect(batcher.matchAny(patterns, content)).toBe(true);
    });

    it("should return false if no pattern matches", () => {
      const patterns = [
        {
          pattern: "rust",
          patternType: PatternType.STRING,
          target: TagPatternType.COMMIT_MESSAGE,
          options: {},
        },
        {
          pattern: "bug",
          patternType: PatternType.STRING,
          target: TagPatternType.COMMIT_MESSAGE,
          options: {},
        },
      ];

      const content = {
        content: "Add typescript feature",
        contentType: TagPatternType.COMMIT_MESSAGE,
      };

      expect(batcher.matchAny(patterns, content)).toBe(false);
    });
  });

  describe("matchAll", () => {
    it("should return true if all applicable patterns match", () => {
      const patterns = [
        {
          pattern: "typescript",
          patternType: PatternType.STRING,
          target: TagPatternType.COMMIT_MESSAGE,
          options: {},
        },
        {
          pattern: "feature",
          patternType: PatternType.STRING,
          target: TagPatternType.COMMIT_MESSAGE,
          options: {},
        },
        // This pattern is for a different content type and shouldn't be considered
        {
          pattern: "*.ts",
          patternType: PatternType.GLOB,
          target: TagPatternType.FILE_PATH,
          options: {},
        },
      ];

      const content = {
        content: "Add typescript feature",
        contentType: TagPatternType.COMMIT_MESSAGE,
      };

      expect(batcher.matchAll(patterns, content)).toBe(true);
    });

    it("should return false if not all applicable patterns match", () => {
      const patterns = [
        {
          pattern: "typescript",
          patternType: PatternType.STRING,
          target: TagPatternType.COMMIT_MESSAGE,
          options: {},
        },
        {
          pattern: "bug",
          patternType: PatternType.STRING,
          target: TagPatternType.COMMIT_MESSAGE,
          options: {},
        },
      ];

      const content = {
        content: "Add typescript feature",
        contentType: TagPatternType.COMMIT_MESSAGE,
      };

      expect(batcher.matchAll(patterns, content)).toBe(false);
    });
  });
});
