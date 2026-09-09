import { ContentItem, SkipSegment } from "@/data/catalog";

export interface DetectedSponsorSegment {
  start: number; // in seconds
  end: number;   // in seconds
  label: string; // e.g. "Passer le sponsor Mubeen"
  type: "sponsor" | "intro" | "promo";
  sponsorName?: string;
  confidence?: number;
  source: "gemini_ai" | "sponsorblock" | "creator_database" | "manual";
}

export interface SponsorSettings {
  autoSkipAds: boolean; // Auto jump over ad/sponsor without needing to click
  notifyOnSkip: boolean; // Show toast notification when ad is skipped
  highlightOnTimeline: boolean; // Highlight amber bars on player seekbar
}

const DEFAULT_SETTINGS: SponsorSettings = {
  autoSkipAds: true,
  notifyOnSkip: true,
  highlightOnTimeline: true,
};

const SETTINGS_KEY = "nextstream_sponsor_settings";
const SPONSOR_CACHE_KEY_PREFIX = "nextstream_sponsor_seg_";
const CUSTOM_OVERRIDES_KEY = "nextstream_custom_sponsor_overrides";
const inMemorySponsorCache = new Map<string, DetectedSponsorSegment[]>();

export interface CustomSponsorOverrideMap {
  [videoId: string]: DetectedSponsorSegment[];
}

/**
 * Get all custom manual overrides saved by creators or users
 */
export function getAllCustomOverrides(): CustomSponsorOverrideMap {
  try {
    const raw = localStorage.getItem(CUSTOM_OVERRIDES_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Get custom override segments for a specific video
 */
export function getCustomSegmentsForVideo(videoId: string): DetectedSponsorSegment[] | null {
  const all = getAllCustomOverrides();
  return all[videoId] || null;
}

/**
 * Save manual override segments for a specific video
 */
export function saveCustomSegmentsForVideo(
  videoId: string,
  segments: DetectedSponsorSegment[]
): void {
  try {
    const all = getAllCustomOverrides();
    all[videoId] = segments;
    localStorage.setItem(CUSTOM_OVERRIDES_KEY, JSON.stringify(all));
    inMemorySponsorCache.set(videoId, segments);

    // Also update local cache
    localStorage.setItem(`${SPONSOR_CACHE_KEY_PREFIX}${videoId}`, JSON.stringify(segments));

    // Dispatch a custom event so open players update immediately
    window.dispatchEvent(
      new CustomEvent("nextstream:sponsor-segments-updated", {
        detail: { videoId, segments },
      })
    );
  } catch (err) {
    console.error("Failed to save custom sponsor segments:", err);
  }
}

/**
 * Delete custom overrides for a video and restore defaults
 */
export function resetCustomSegmentsForVideo(videoId: string): void {
  try {
    const all = getAllCustomOverrides();
    delete all[videoId];
    localStorage.setItem(CUSTOM_OVERRIDES_KEY, JSON.stringify(all));
    inMemorySponsorCache.delete(videoId);
    localStorage.removeItem(`${SPONSOR_CACHE_KEY_PREFIX}${videoId}`);

    window.dispatchEvent(
      new CustomEvent("nextstream:sponsor-segments-updated", {
        detail: { videoId, segments: null },
      })
    );
  } catch (err) {
    console.error("Failed to reset sponsor segments:", err);
  }
}

/**
 * Get user preferences for sponsor and in-video ad skipping
 */
export function getSponsorSettings(): SponsorSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save user preferences
 */
export function saveSponsorSettings(settings: Partial<SponsorSettings>): SponsorSettings {
  try {
    const current = getSponsorSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Fetch and detect sponsor/ad segments using Gemini AI + SponsorBlock + Creator DB
 */
export async function fetchSponsorSegments(
  item: ContentItem,
  durationSec: number = 0
): Promise<DetectedSponsorSegment[]> {
  const videoId = item.youtubeId || item.id;
  if (!videoId) return [];

  // 0. Check custom manual overrides first
  const custom = getCustomSegmentsForVideo(videoId);
  if (custom && custom.length > 0) {
    inMemorySponsorCache.set(videoId, custom);
    return custom;
  }

  // 1. Check in-memory cache
  if (inMemorySponsorCache.has(videoId)) {
    return inMemorySponsorCache.get(videoId)!;
  }

  // 2. Check localStorage cache
  try {
    const cachedLocal = localStorage.getItem(`${SPONSOR_CACHE_KEY_PREFIX}${videoId}`);
    if (cachedLocal) {
      const parsed = JSON.parse(cachedLocal);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemorySponsorCache.set(videoId, parsed);
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  // 3. Check item.skipSegments from catalog
  let initialCatalogSegments: DetectedSponsorSegment[] = [];
  if (item.skipSegments && Array.isArray(item.skipSegments) && item.skipSegments.length > 0) {
    initialCatalogSegments = item.skipSegments.map((s) => ({
      start: s.start,
      end: s.end,
      label: s.label || (s.type === "intro" ? "Passer l'introduction" : "Passer la pub créateur"),
      type: s.type || "sponsor",
      sponsorName: s.label?.replace("Passer le sponsor ", "") || "Pub créateur",
      confidence: 0.99,
      source: "creator_database",
    }));
  }

  try {
    const res = await fetch("/api/ai/detect-video-sponsors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoId,
        title: item.title,
        description: item.description,
        channel: item.channel,
        durationSec,
      }),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    if (data.success && Array.isArray(data.segments) && data.segments.length > 0) {
      const merged = [...initialCatalogSegments];
      for (const seg of data.segments) {
        const alreadyExists = merged.some(
          (m) => Math.abs(m.start - seg.start) < 4 && Math.abs(m.end - seg.end) < 4
        );
        if (!alreadyExists) {
          merged.push(seg);
        }
      }

      // Sort by start time
      merged.sort((a, b) => a.start - b.start);
      inMemorySponsorCache.set(videoId, merged);
      try {
        localStorage.setItem(`${SPONSOR_CACHE_KEY_PREFIX}${videoId}`, JSON.stringify(merged));
      } catch {
        // storage full
      }
      return merged;
    }
  } catch (err) {
    console.warn("Failed to query Gemini AI sponsor detection endpoint:", err);
  }

  // Fallback to initial catalog segments if API fails
  if (initialCatalogSegments.length > 0) {
    inMemorySponsorCache.set(videoId, initialCatalogSegments);
    return initialCatalogSegments;
  }

  return [];
}
