import { BasePatternMatcher } from "./base-matcher";
import { MatchContent, PatternOptions } from "./types";
import { TagPatternType } from "../data/tags";

/**
 * Pattern matcher implementation for regular expression matching
 */
export class RegexPatternMatcher extends BasePatternMatcher {
  private readonly compiledPattern: RegExp;

  /**
   * Creates a new regex pattern matcher
   *
   * @param pattern The regex pattern string
   * @param options Matching options
   * @param targetType The type of content this pattern targets
   */
  constructor(
    pattern: string,
    options: PatternOptions = {},
    targetType: TagPatternType,
  ) {
    super(pattern, options, targetType);

    // Create the regex with appropriate flags
    const flags = this.options.caseSensitive ? "" : "i";

    try {
      // If the pattern includes word boundaries explicitly, use as is
      if (pattern.startsWith("\\b") && pattern.endsWith("\\b")) {
        this.compiledPattern = new RegExp(pattern, flags);
      } else if (this.options.wordBoundary) {
        // Add word boundaries if the option is enabled
        this.compiledPattern = new RegExp(`\\b${pattern}\\b`, flags);
      } else {
        // Use the pattern as is
        this.compiledPattern = new RegExp(pattern, flags);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new Error(`Invalid regex pattern: ${pattern} - ${errorMessage}`);
    }
  }

  /**
   * Tests if the given content matches this regex pattern
   *
   * @param content The content to match against
   * @returns True if the content matches the regex, false otherwise
   */
  test(content: MatchContent): boolean {
    try {
      const isMatch = this.compiledPattern.test(content.content);
      return this.getMatchResult(isMatch);
    } catch (err) {
      console.error(`Error matching regex pattern ${this.pattern}:`, err);
      return this.getMatchResult(false);
    }
  }
}
