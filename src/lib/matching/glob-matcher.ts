import { BasePatternMatcher } from "./base-matcher";
import { MatchContent, PatternOptions } from "./types";
import { TagPatternType } from "../data/tags";
import { minimatch } from "minimatch";
import type { MinimatchOptions } from "minimatch";

/**
 * Pattern matcher implementation for glob pattern matching (primarily for file paths)
 */
export class GlobPatternMatcher extends BasePatternMatcher {
  protected readonly globPattern: string;
  protected readonly matchOptions: MinimatchOptions;

  /**
   * Creates a new glob pattern matcher
   *
   * @param pattern The glob pattern string
   * @param options Matching options
   * @param targetType The type of content this pattern targets
   */
  constructor(
    pattern: string,
    options: PatternOptions = {},
    targetType: TagPatternType,
  ) {
    super(pattern, options, targetType);

    if (options.wordBoundary) {
      console.warn(
        "Word boundary option is not applicable to Glob patterns and will be ignored.",
      );
    }

    this.globPattern = pattern;
    this.matchOptions = {
      nocase: !options.caseSensitive,
      matchBase: false, // Require full path match by default
      dot: true, // Match dotfiles
      noglobstar: false, // Enable ** for matching across directories
      nonegate: true, // Disable negation in glob pattern itself (we handle it separately)
    };
  }

  /**
   * Tests if the given content (usually a file path) matches this glob pattern
   *
   * @param content The content to match against
   * @returns True if the content matches the glob pattern, false otherwise
   */
  test(content: MatchContent): boolean {
    try {
      const isMatch = minimatch(
        content.content,
        this.globPattern,
        this.matchOptions,
      );
      return this.getMatchResult(isMatch);
    } catch (err: unknown) {
      console.error(`Error matching glob pattern ${this.pattern}:`, err);
      return this.getMatchResult(false);
    }
  }
}
