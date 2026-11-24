/**
 * Safe URL & Embed Sanitization Utilities
 * Prevents stored/reflected DOM XSS via `javascript:`, `data:`, `vbscript:`, or `file:` URIs.
 */

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{6,20}$/;

/**
 * Validates that a URL uses an explicit safe protocol (`https:` or `http:`).
 * Optionally permits `blob:` (strictly for local `<video>` uploads) or root-relative `/` paths.
 * Returns a normalized safe string or `""` when invalid/unsafe.
 */
export function sanitizeHttpUrl(
  rawUrl?: string | null,
  options: { allowBlob?: boolean; allowRelative?: boolean; httpsOnly?: boolean } = {}
): string {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";

  // Reject control characters / whitespace tricks used to disguise javascript: URIs
  const normalizedControlFree = trimmed.replace(/[\u0000-\u001F\u007F]/g, "");
  if (!normalizedControlFree) return "";

  if (options.allowRelative && normalizedControlFree.startsWith("/") && !normalizedControlFree.startsWith("//")) {
    return normalizedControlFree;
  }

  if (options.allowBlob && normalizedControlFree.toLowerCase().startsWith("blob:")) {
    try {
      const parsedBlob = new URL(normalizedControlFree);
      if (parsedBlob.protocol === "blob:") {
        return normalizedControlFree;
      }
    } catch {
      return "";
    }
    return "";
  }

  try {
    const parsed = new URL(normalizedControlFree);
    if (options.httpsOnly) {
      return parsed.protocol === "https:" ? parsed.toString() : "";
    }
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString();
    }
    return "";
  } catch {
    return "";
  }
}

/**
 * Extracts `src` from an optional `<iframe src="...">` snippet and validates that it is a strict `https:` URL.
 * Rejects `javascript:`, `data:`, `vbscript:`, and plain `http:` embed URLs.
 */
export function sanitizeEmbedUrl(raw?: string | null): string {
  if (!raw || typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const iframeMatch = trimmed.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  const candidate = iframeMatch ? iframeMatch[1].trim() : trimmed;
  return sanitizeHttpUrl(candidate, { httpsOnly: true });
}

/**
 * Validates and extracts a safe YouTube video ID.
 */
export function isValidYouTubeId(id?: string | null): id is string {
  return typeof id === "string" && YOUTUBE_ID_REGEX.test(id.trim());
}
