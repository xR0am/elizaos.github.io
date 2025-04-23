import { BasePatternMatcher } from "./base-matcher";
import { StringPatternMatcher } from "./string-matcher";
import { RegexPatternMatcher } from "./regex-matcher";
import { GlobPatternMatcher } from "./glob-matcher";
import { MatchContent, PatternOptions, PatternType, TagPattern } from "./types";
import { TagPatternType } from "../data/tags";
import { ContentProcessor } from "./content-processor";

/**
 * Factory class for creating pattern matchers
 */
export class PatternMatcher {
  private readonly matcher: BasePatternMatcher;

  /**
   * Creates a new pattern matcher based on the given tag pattern
   *
   * @param tagPattern The tag pattern configuration
   * @throws Error if the pattern is invalid for the target type
   */
  constructor(tagPattern: TagPattern) {
    // Validate that the pattern type is compatible with the target type
    if (
      !ContentProcessor.validatePatternForTarget(
        tagPattern.patternType,
        tagPattern.target,
      )
    ) {
      throw new Error(
        `Pattern type ${tagPattern.patternType} is not compatible with target type ${tagPattern.target}`,
      );
    }

    this.matcher = PatternMatcher.createMatcher(
      tagPattern.pattern,
      tagPattern.patternType,
      tagPattern.options,
      tagPattern.target,
    );
  }

  /**
   * Tests if the given content matches this pattern
   *
   * @param content The content to match against
   * @returns True if the content matches, false otherwise
   */
  test(content: MatchContent): boolean {
    // Only match against content of the right type
    if (content.contentType !== this.matcher.getTargetType()) {
      return false;
    }

    // Preprocess the content based on its type
    const processedContent = ContentProcessor.preprocess(content);

    return this.matcher.test(processedContent);
  }

  /**
   * Creates a matcher instance for the given pattern type
   *
   * @param pattern The pattern string
   * @param patternType The type of pattern
   * @param options Matching options
   * @param targetType The type of content this pattern targets
   * @returns A matcher instance
   */
  private static createMatcher(
    pattern: string,
    patternType: PatternType,
    options: PatternOptions,
    targetType: TagPatternType,
  ): BasePatternMatcher {
    switch (patternType) {
      case PatternType.STRING:
        return new StringPatternMatcher(pattern, options, targetType);
      case PatternType.REGEX:
        return new RegexPatternMatcher(pattern, options, targetType);
      case PatternType.GLOB:
        return new GlobPatternMatcher(pattern, options, targetType);
      default:
        // This should technically be unreachable if PatternType enum is used correctly,
        // but it's good practice to handle potential unknown values.
        const exhaustiveCheck: never = patternType;
        throw new Error(`Unsupported pattern type: ${exhaustiveCheck}`);
    }
  }
}
