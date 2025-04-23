import { MatchContent, PatternOptions, TagPattern } from "./types";
import { TagPatternType } from "../data/tags";

/**
 * Abstract base class for all pattern matchers
 */
export abstract class BasePatternMatcher {
  protected pattern: string;
  protected options: PatternOptions;
  protected targetType: TagPatternType;

  /**
   * Creates a new pattern matcher
   *
   * @param pattern The pattern string to match
   * @param options Matching options
   * @param targetType The type of content this pattern targets
   */
  constructor(
    pattern: string,
    options: PatternOptions = {},
    targetType: TagPatternType,
  ) {
    this.pattern = pattern;
    this.options = {
      caseSensitive: options.caseSensitive ?? false,
      wordBoundary: options.wordBoundary ?? false,
      negative: options.negative ?? false,
    };
    this.targetType = targetType;
  }

  /**
   * Tests if the given content matches this pattern
   *
   * @param content The content to match against
   * @returns True if the content matches, false otherwise
   */
  abstract test(content: MatchContent): boolean;

  /**
   * Gets the target type for this pattern matcher
   *
   * @returns The target content type
   */
  getTargetType(): TagPatternType {
    return this.targetType;
  }

  /**
   * Returns the match result, accounting for negative pattern option
   *
   * @param isMatch The raw match result from the matcher
   * @returns The final match result after applying negative option
   */
  protected getMatchResult(isMatch: boolean): boolean {
    // For negative patterns, invert the match result
    return this.options.negative ? !isMatch : isMatch;
  }

  /**
   * Applies case sensitivity to the content if needed
   *
   * @param str The string to process
   * @returns The processed string
   */
  protected applyCaseSensitivity(str: string): string {
    return this.options.caseSensitive ? str : str.toLowerCase();
  }
}
