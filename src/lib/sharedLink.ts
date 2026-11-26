import { getPublicOrigin } from "@/lib/publicSite";

export type SharedLinkTarget =
  | { type: "video"; id: string }
  | { type: "short"; id: string }
  | { type: "app"; id: "" };

const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

/**
 * Generates a canonical share URL containing only the target content ID and share flag,
 * never exposing any user account ID, email, or session token.
 */
export function buildShareUrl(params: { videoId?: string; shortId?: string }): string {
  if (typeof window === "undefined") return "";
  const url = new URL(getPublicOrigin() + window.location.pathname);
  if (params.shortId) {
    url.searchParams.set("short", params.shortId);
  } else if (params.videoId) {
    url.searchParams.set("v", params.videoId);
  }
  url.searchParams.set("share", "1");
  return url.toString();
}

/**
 * Parses shared link parameters from the current URL query string.
 */
export function parseSharedLinkFromSearch(search: string): SharedLinkTarget | null {
  if (!search) return null;
  try {
    const params = new URLSearchParams(search);

    const rawShort = params.get("short")?.trim();
    if (rawShort && SAFE_ID_REGEX.test(rawShort)) {
      return { type: "short", id: rawShort };
    }

    const rawVideo = (params.get("v") || params.get("video"))?.trim();
    if (rawVideo && SAFE_ID_REGEX.test(rawVideo)) {
      return { type: "video", id: rawVideo };
    }

    if (params.has("share") || params.has("shared")) {
      return { type: "app", id: "" };
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Removes shared link query parameters from the browser address bar without reloading.
 */
export function clearSharedLinkParamsFromUrl(): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    let changed = false;
    for (const key of ["v", "video", "short", "share", "shared"]) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    }
    if (changed) {
      window.history.replaceState({}, document.title, url.toString());
    }
  } catch {
    // ignore URL errors
  }
}
