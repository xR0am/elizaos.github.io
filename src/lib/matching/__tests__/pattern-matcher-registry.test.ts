import { describe, expect, it, beforeEach } from "bun:test";
import { PatternMatcherRegistry } from "../pattern-matcher-registry";
import { PatternType } from "../types";
import { TagPatternType } from "../../data/tags";

describe("PatternMatcherRegistry", () => {
  beforeEach(() => {
    // Clear the cache before each test
    PatternMatcherRegistry.getInstance().clearCache();
  });

  it("should return the same instance (singleton)", () => {
    const instance1 = PatternMatcherRegistry.getInstance();
    const instance2 = PatternMatcherRegistry.getInstance();

    expect(instance1).toBe(instance2);
  });

  it("should cache pattern matchers", () => {
    const registry = PatternMatcherRegistry.getInstance();

    // Initial cache should be empty
    expect(registry.getCacheSize()).toBe(0);

    // Create a matcher
    const matcher1 = registry.getMatcher({
      pattern: "test",
      patternType: PatternType.STRING,
      target: TagPatternType.COMMIT_MESSAGE,
      options: { caseSensitive: false },
    });

    // Cache should have one entry
    expect(registry.getCacheSize()).toBe(1);

    // Getting the same pattern should return the same matcher and not increase cache size
    const matcher2 = registry.getMatcher({
      pattern: "test",
      patternType: PatternType.STRING,
      target: TagPatternType.COMMIT_MESSAGE,
      options: { caseSensitive: false },
    });

    expect(matcher1).toBe(matcher2);
    expect(registry.getCacheSize()).toBe(1);

    // Adding a different pattern should increase cache size
    registry.getMatcher({
      pattern: "test2",
      patternType: PatternType.STRING,
      target: TagPatternType.COMMIT_MESSAGE,
      options: { caseSensitive: false },
    });

    expect(registry.getCacheSize()).toBe(2);

    // Same pattern with different options should be a different entry
    registry.getMatcher({
      pattern: "test",
      patternType: PatternType.STRING,
      target: TagPatternType.COMMIT_MESSAGE,
      options: { caseSensitive: true },
    });

    expect(registry.getCacheSize()).toBe(3);

    // Clear the cache
    registry.clearCache();
    expect(registry.getCacheSize()).toBe(0);
  });
});
