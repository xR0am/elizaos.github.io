import { describe, expect, it } from "bun:test";
import { ContentProcessor } from "../content-processor";
import { TagPatternType } from "../../data/tags";
import { PatternType } from "../types";

describe("ContentProcessor", () => {
  describe("preprocess", () => {
    it("should normalize file paths", () => {
      const content = {
        content: "src\\lib\\matching\\file.ts ",
        contentType: TagPatternType.FILE_PATH,
      };

      const processed = ContentProcessor.preprocess(content);

      // Should normalize backslashes to forward slashes and trim
      expect(processed.content).toBe("src/lib/matching/file.ts");
    });

    it("should trim text content", () => {
      const content = {
        content: "  Some commit message  ",
        contentType: TagPatternType.COMMIT_MESSAGE,
      };

      const processed = ContentProcessor.preprocess(content);

      expect(processed.content).toBe("Some commit message");
    });

    it("should normalize line endings in code content", () => {
      const content = {
        content: "function test() {\r\n  return true;\r\n}",
        contentType: TagPatternType.CODE_CONTENT,
      };

      const processed = ContentProcessor.preprocess(content);

      expect(processed.content).toBe("function test() {\n  return true;\n}");
    });

    it("should trim and lowercase label content", () => {
      const content = {
        content: "  FEATURE  ",
        contentType: TagPatternType.LABEL,
      };

      const processed = ContentProcessor.preprocess(content);

      expect(processed.content).toBe("feature");
    });
  });

  describe("validatePatternForTarget", () => {
    it("should validate correct pattern types for targets", () => {
      // GLOB patterns are only valid for file paths
      expect(
        ContentProcessor.validatePatternForTarget(
          PatternType.GLOB,
          TagPatternType.FILE_PATH,
        ),
      ).toBe(true);

      // GLOB patterns are not valid for other content types
      expect(
        ContentProcessor.validatePatternForTarget(
          PatternType.GLOB,
          TagPatternType.COMMIT_MESSAGE,
        ),
      ).toBe(false);

      // String and regex patterns are valid for all content types
      expect(
        ContentProcessor.validatePatternForTarget(
          PatternType.STRING,
          TagPatternType.COMMIT_MESSAGE,
        ),
      ).toBe(true);

      expect(
        ContentProcessor.validatePatternForTarget(
          PatternType.REGEX,
          TagPatternType.PR_TITLE,
        ),
      ).toBe(true);
    });
  });
});
