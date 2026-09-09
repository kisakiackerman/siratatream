import { supabase } from "@/lib/supabase";

export const LOCAL_HISTORY_PREFIX = "nexstream_history_";
export const HISTORY_UPDATE_EVENT = "nexstream_history_updated";

export type StoredHistoryEntry = {
  id: string;
  viewer_profile_id: string;
  content_id: string;
  progress_seconds: number;
  duration_seconds: number;
  updated_at: string;
};

/**
 * Retrieves the saved watch progress (in seconds) for a specific profile and content ID from localStorage.
 */
export function getSavedWatchProgress(profileId?: string | null, contentId?: string): number {
  if (!profileId || !contentId) return 0;
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_PREFIX + profileId);
    if (!raw) return 0;
    const list: StoredHistoryEntry[] = JSON.parse(raw);
    if (!Array.isArray(list)) return 0;
    const entry = list.find((i) => i.content_id === contentId);
    if (entry && typeof entry.progress_seconds === "number" && entry.progress_seconds > 0) {
      return entry.progress_seconds;
    }
  } catch {
    // ignore
  }
  return 0;
}

/**
 * Retrieves the entire local watch history for a given profile.
 */
export function getLocalWatchHistory(profileId?: string | null): StoredHistoryEntry[] {
  if (!profileId) return [];
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_PREFIX + profileId);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (Array.isArray(list)) {
      return list.filter((i) => i && i.content_id && typeof i.progress_seconds === "number");
    }
  } catch {
    // ignore
  }
  return [];
}

/**
 * Immediately saves the exact watch time (in seconds) to localStorage and triggers real-time updates.
 */
export function saveWatchProgress(
  profileId: string | undefined | null,
  contentId: string,
  progressSeconds: number,
  durationSeconds: number = 0
): void {
  if (!profileId || !contentId) return;
  const currentSec = Math.max(0, Math.floor(progressSeconds));
  const durSec = Math.max(0, Math.floor(durationSeconds));

  // If 0 seconds, do not overwrite valid existing progress unless explicitly resetting
  if (currentSec <= 0 && durSec <= 0) return;

  try {
    const key = LOCAL_HISTORY_PREFIX + profileId;
    const raw = localStorage.getItem(key);
    let list: StoredHistoryEntry[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];

    // Remove any previous entry for this video
    list = list.filter((i) => i.content_id !== contentId);

    // Add latest entry at the top with exact timestamp
    const newEntry: StoredHistoryEntry = {
      id: "hist-" + Date.now(),
      viewer_profile_id: profileId,
      content_id: contentId,
      progress_seconds: currentSec,
      duration_seconds: durSec,
      updated_at: new Date().toISOString(),
    };

    list.unshift(newEntry);
    localStorage.setItem(key, JSON.stringify(list.slice(0, 100)));

    // Emit event so other components (ContinueWatchingRow, WatchHistoryModal) update instantly
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(HISTORY_UPDATE_EVENT, {
          detail: {
            profileId,
            contentId,
            progress_seconds: currentSec,
            duration_seconds: durSec,
          },
        })
      );
    }

    // Sync to Supabase in the background if logged-in user profile
    if (
      !profileId.startsWith("guest-") &&
      !profileId.startsWith("profile-") &&
      supabase
    ) {
      Promise.resolve(
        supabase
          .from("watch_history")
          .upsert(
            {
              viewer_profile_id: profileId,
              content_id: contentId,
              progress_seconds: currentSec,
              duration_seconds: durSec,
              updated_at: newEntry.updated_at,
            },
            { onConflict: "viewer_profile_id,content_id" }
          )
      ).catch(() => {});
    }
  } catch (err) {
    console.warn("Failed to persist watch progress:", err);
  }
}

/**
 * Remove an item from the profile's watch history.
 */
export function removeWatchHistoryEntry(profileId: string, contentId: string): void {
  try {
    const key = LOCAL_HISTORY_PREFIX + profileId;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    let list: StoredHistoryEntry[] = JSON.parse(raw);
    if (!Array.isArray(list)) return;
    list = list.filter((i) => i.content_id !== contentId);
    localStorage.setItem(key, JSON.stringify(list));

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(HISTORY_UPDATE_EVENT, {
          detail: { profileId, contentId, removed: true },
        })
      );
    }
  } catch {
    // ignore
  }
}
