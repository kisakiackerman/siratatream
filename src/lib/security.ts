/**
 * Client-Side Security Utilities
 * Protects against XSS, dangerous protocols, prototype pollution, and malformed inputs.
 */

const DANGEROUS_PROTOCOLS = /^(javascript|data|vbscript|file):/i;

/**
 * Validates whether a URL is safe to open, embed, or navigate to.
 */
export function isSafeUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (DANGEROUS_PROTOCOLS.test(trimmed)) {
    return false;
  }
  // Allow relative URLs or standard web protocols
  return (
    trimmed.startsWith("/") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://")
  );
}

/**
 * Sanitizes plain text input by stripping all HTML tags and limiting character count.
 */
export function sanitizeText(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>?/gm, "")
    .trim()
    .slice(0, maxLength);
}

/**
 * Safe JSON parser that blocks prototype pollution (__proto__, constructor, prototype).
 */
export function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw || typeof raw !== "string") return fallback;
  try {
    const parsed = JSON.parse(raw, (key, value) => {
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        return undefined;
      }
      return value;
    });
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}
