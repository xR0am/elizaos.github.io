import { MatchContent } from "./types";
import { TagPatternType } from "../data/tags";
import path from "path";

/**
 * Handles content preprocessing for different target types
 * to optimize matching
 */
export class ContentProcessor {
  /**
   * Preprocesses content based on its type
   *
   * @param content The content to preprocess
   * @returns The preprocessed content
   */
  static preprocess(content: MatchContent): MatchContent {
    switch (content.contentType) {
      case TagPatternType.FILE_PATH:
        return ContentProcessor.preprocessFilePath(content);
      case TagPatternType.COMMIT_MESSAGE:
      case TagPatternType.PR_TITLE:
      case TagPatternType.PR_DESCRIPTION:
      case TagPatternType.ISSUE_TITLE:
      case TagPatternType.ISSUE_BODY:
      case TagPatternType.COMMENT:
        return ContentProcessor.preprocessText(content);
      case TagPatternType.CODE_CONTENT:
        return ContentProcessor.preprocessCode(content);
      case TagPatternType.LABEL:
        return ContentProcessor.preprocessLabel(content);
      default:
        return content;
    }
  }

  /**
   * Preprocesses file paths for optimal matching
   * - Normalizes path separators
   * - Trims whitespace
   *
   * @param content The file path content
   * @returns The preprocessed content
   */
  private static preprocessFilePath(content: MatchContent): MatchContent {
    return {
      ...content,
      content: path.normalize(content.content.trim()).replace(/\\/g, "/"),
    };
  }

  /**
   * Preprocesses text content (commit messages, PR titles, etc.)
   * - Trims whitespace
   *
   * @param content The text content
   * @returns The preprocessed content
   */
  private static preprocessText(content: MatchContent): MatchContent {
    return {
      ...content,
      content: content.content.trim(),
    };
  }

  /**
   * Preprocesses code content
   * - Trims whitespace
   * - Normalizes line endings
   *
   * @param content The code content
   * @returns The preprocessed content
   */
  private static preprocessCode(content: MatchContent): MatchContent {
    return {
      ...content,
      content: content.content.trim().replace(/\r\n/g, "\n"),
    };
  }

  /**
   * Preprocesses label content
   * - Trims whitespace
   * - Converts to lowercase
   *
   * @param content The label content
   * @returns The preprocessed content
   */
  private static preprocessLabel(content: MatchContent): MatchContent {
    return {
      ...content,
      content: content.content.trim().toLowerCase(),
    };
  }

  /**
   * Validates if a pattern is compatible with a given target type
   *
   * @param patternType The pattern type
   * @param targetType The target content type
   * @returns True if compatible, false otherwise
   */
  static validatePatternForTarget(
    patternType: string,
    targetType: TagPatternType,
  ): boolean {
    // GLOB patterns should only be used with file paths
    if (patternType === "GLOB" && targetType !== TagPatternType.FILE_PATH) {
      return false;
    }

    return true;
  }
}
