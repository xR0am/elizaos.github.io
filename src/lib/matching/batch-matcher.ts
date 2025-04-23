import { PatternMatcherRegistry } from "./pattern-matcher-registry";
import { MatchContent, TagPattern } from "./types";
import { ContentProcessor } from "./content-processor";

/**
 * BatchPatternMatcher handles efficient matching of multiple patterns
 * against a single content
 */
export class BatchPatternMatcher {
  private registry: PatternMatcherRegistry;

  constructor() {
    this.registry = PatternMatcherRegistry.getInstance();
  }

  /**
   * Match multiple patterns against a single content in an optimized way
   *
   * @param patterns Array of patterns to match
   * @param content The content to match against
   * @returns Array of pattern indices that matched
   */
  public matchBatch(patterns: TagPattern[], content: MatchContent): number[] {
    // Return early if no patterns or empty content
    if (patterns.length === 0 || !content.content) {
      return [];
    }

    // Preprocess content only once
    const processedContent = ContentProcessor.preprocess(content);

    // Array to hold the indices of matching patterns
    const matches: number[] = [];

    // First, check any negative patterns (for quick rejection)
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];

      // Skip patterns targeting different content types
      if (pattern.target !== content.contentType) {
        continue;
      }

      // If this is a negative pattern and its test() returns false (meaning the content matched the negative criteria), reject
      if (pattern.options.negative) {
        try {
          const matcher = this.registry.getMatcher(pattern);
          // If matcher.test() is false, the negative condition was met, so reject.
          if (!matcher.test(processedContent)) {
            // Negative pattern criteria met, reject the whole batch
            return [];
          }
        } catch (error) {
          // Log the error but continue with other patterns
          console.error(`Error matching pattern at index ${i}:`, error);
        }
      }
    }

    // Then check all positive patterns
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];

      // Skip patterns targeting different content types and negative patterns (already checked)
      if (pattern.target !== content.contentType || pattern.options.negative) {
        continue;
      }

      try {
        const matcher = this.registry.getMatcher(pattern);
        if (matcher.test(processedContent)) {
          matches.push(i);
        }
      } catch (error) {
        // Log the error but continue with other patterns
        console.error(`Error matching pattern at index ${i}:`, error);
      }
    }

    return matches;
  }

  /**
   * Check if any pattern in the batch matches the content
   *
   * @param patterns Array of patterns to match
   * @param content The content to match against
   * @returns True if any pattern matches
   */
  public matchAny(patterns: TagPattern[], content: MatchContent): boolean {
    return this.matchBatch(patterns, content).length > 0;
  }

  /**
   * Check if all patterns in the batch match the content
   *
   * @param patterns Array of patterns to match
   * @param content The content to match against
   * @returns True if all patterns match
   */
  public matchAll(patterns: TagPattern[], content: MatchContent): boolean {
    // Filter patterns to only include those targeting this content type
    const applicablePatterns = patterns.filter(
      (pattern) => pattern.target === content.contentType,
    );

    if (applicablePatterns.length === 0) {
      return false;
    }

    const matches = this.matchBatch(applicablePatterns, content);
    return matches.length === applicablePatterns.length;
  }
}
