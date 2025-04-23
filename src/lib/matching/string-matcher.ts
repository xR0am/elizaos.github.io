import { BasePatternMatcher } from "./base-matcher";
import { MatchContent, PatternOptions } from "./types";
import { TagPatternType } from "../data/tags";

/**
 * Pattern matcher implementation for simple string matching
 */
export class StringPatternMatcher extends BasePatternMatcher {
  private readonly processedPattern: string;

  /**
   * Creates a new string pattern matcher
   *
   * @param pattern The string pattern to match
   * @param options Matching options
   * @param targetType The type of content this pattern targets
   */
  constructor(
    pattern: string,
    options: PatternOptions = {},
    targetType: TagPatternType,
  ) {
    super(pattern, options, targetType);
    this.processedPattern = this.applyCaseSensitivity(this.pattern);
  }

  /**
   * Tests if the given content includes this string pattern
   *
   * @param content The content to match against
   * @returns True if the content includes this pattern, false otherwise
   */
  test(content: MatchContent): boolean {
    const processedContent = this.applyCaseSensitivity(content.content);

    let isMatch: boolean;

    if (this.options.wordBoundary) {
      // For word boundary matching, we need to check if the pattern appears as a whole word
      const wordBoundaryRegex = new RegExp(
        `\\b${this.escapeRegExp(this.processedPattern)}\\b`,
        this.options.caseSensitive ? "" : "i",
      );
      isMatch = wordBoundaryRegex.test(processedContent);
    } else {
      // Simple substring check
      isMatch = processedContent.includes(this.processedPattern);
    }

    return this.getMatchResult(isMatch);
  }

  /**
   * Escapes special characters in a string for use in a regular expression
   *
   * @param string The string to escape
   * @returns The escaped string
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
