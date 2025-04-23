/**
 * Converts a glob pattern string to a regular expression
 *
 * @param globPattern The glob pattern string
 * @param caseSensitive Whether the regex should be case sensitive (default: false)
 * @returns A regular expression object
 */
export function globToRegex(
  globPattern: string,
  caseSensitive = false,
): RegExp {
  let regexString = globPattern
    // Escape regex special characters except for * and ?
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    // Convert * to match zero or more characters (non-greedy)
    .replace(/\*/g, ".*?")
    // Convert ? to match exactly one character
    .replace(/\?/g, ".");

  // Anchor the pattern to match the whole string
  regexString = `^${regexString}$`;

  const flags = caseSensitive ? "" : "i";

  try {
    return new RegExp(regexString, flags);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid glob pattern: ${globPattern} - ${errorMessage}`);
  }
}
