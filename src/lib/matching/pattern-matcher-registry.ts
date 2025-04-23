import { PatternMatcher } from "./pattern-matcher";
import { PatternOptions, PatternType, TagPattern } from "./types";
import { TagPatternType } from "../data/tags";

/**
 * Registry for caching pattern matchers to avoid recreating them
 * each time the same pattern is used
 */
export class PatternMatcherRegistry {
  private static instance: PatternMatcherRegistry;
  private matchers: Map<string, PatternMatcher>;

  private constructor() {
    this.matchers = new Map();
  }

  /**
   * Gets the singleton instance of the registry
   */
  public static getInstance(): PatternMatcherRegistry {
    if (!PatternMatcherRegistry.instance) {
      PatternMatcherRegistry.instance = new PatternMatcherRegistry();
    }
    return PatternMatcherRegistry.instance;
  }

  /**
   * Gets a pattern matcher for the given pattern configuration
   * Creates a new one and caches it if it doesn't exist
   *
   * @param tagPattern The pattern configuration
   * @returns A pattern matcher
   */
  public getMatcher(tagPattern: TagPattern): PatternMatcher {
    const key = this.createCacheKey(
      tagPattern.pattern,
      tagPattern.patternType,
      tagPattern.options,
      tagPattern.target,
    );

    if (!this.matchers.has(key)) {
      this.matchers.set(key, new PatternMatcher(tagPattern));
    }

    return this.matchers.get(key)!;
  }

  /**
   * Creates a unique cache key for a pattern configuration
   */
  private createCacheKey(
    pattern: string,
    patternType: PatternType,
    options: PatternOptions,
    targetType: TagPatternType,
  ): string {
    return JSON.stringify({
      pattern,
      patternType,
      options,
      targetType,
    });
  }

  /**
   * Clears the cache of matchers
   */
  public clearCache(): void {
    this.matchers.clear();
  }

  /**
   * Gets the number of cached matchers
   */
  public getCacheSize(): number {
    return this.matchers.size;
  }
}
