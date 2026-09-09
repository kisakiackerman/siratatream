import { supabase } from "@/lib/supabase";

export const LOCAL_BOOKMARKS_PREFIX = "sirat_bookmarks_";
export const BOOKMARKS_UPDATE_EVENT = "sirat_bookmarks_updated";

export interface BookmarkEntry {
  id: string;
  profileId: string;
  contentId: string;
  contentTitle?: string;
  thumbnail?: string;
  channel?: string;
  timestampSeconds: number;
  formattedTime: string;
  note?: string;
  createdAt: string;
}

export function formatSeconds(sec: number): string {
  if (!sec || isNaN(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function getAllBookmarks(profileId?: string | null): BookmarkEntry[] {
  if (!profileId) return [];
  try {
    const raw = localStorage.getItem(LOCAL_BOOKMARKS_PREFIX + profileId);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  } catch {}
  return [];
}

export function getBookmarksForContent(profileId?: string | null, contentId?: string): BookmarkEntry[] {
  if (!profileId || !contentId) return [];
  const all = getAllBookmarks(profileId);
  return all
    .filter((b) => b.contentId === contentId)
    .sort((a, b) => a.timestampSeconds - b.timestampSeconds);
}

export function addBookmark(
  profileId: string,
  params: {
    contentId: string;
    contentTitle?: string;
    thumbnail?: string;
    channel?: string;
    timestampSeconds: number;
    note?: string;
  }
): BookmarkEntry {
  const roundedSeconds = Math.max(0, Math.floor(params.timestampSeconds));
  const newEntry: BookmarkEntry = {
    id: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    profileId,
    contentId: params.contentId,
    contentTitle: params.contentTitle,
    thumbnail: params.thumbnail,
    channel: params.channel,
    timestampSeconds: roundedSeconds,
    formattedTime: formatSeconds(roundedSeconds),
    note: params.note?.trim() || `Marque-page à ${formatSeconds(roundedSeconds)}`,
    createdAt: new Date().toISOString(),
  };

  try {
    const key = LOCAL_BOOKMARKS_PREFIX + profileId;
    const existing = getAllBookmarks(profileId);
    const updated = [newEntry, ...existing];
    localStorage.setItem(key, JSON.stringify(updated));

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(BOOKMARKS_UPDATE_EVENT, {
          detail: { profileId, bookmark: newEntry, action: "add" },
        })
      );
    }

    // Sync to Supabase user_preferences or table if available
    if (!profileId.startsWith("guest-") && !profileId.startsWith("profile-") && supabase) {
      Promise.resolve(
        supabase
          .from("user_bookmarks")
          .insert({
            id: newEntry.id,
            viewer_profile_id: profileId,
            content_id: newEntry.contentId,
            timestamp_seconds: newEntry.timestampSeconds,
            note: newEntry.note,
            created_at: newEntry.createdAt,
          })
      ).catch(() => {
        // Fallback gracefully to local storage
      });
    }
  } catch (err) {
    console.warn("Failed to add bookmark:", err);
  }

  return newEntry;
}

export function removeBookmark(profileId: string, bookmarkId: string): void {
  try {
    const key = LOCAL_BOOKMARKS_PREFIX + profileId;
    const existing = getAllBookmarks(profileId);
    const updated = existing.filter((b) => b.id !== bookmarkId);
    localStorage.setItem(key, JSON.stringify(updated));

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(BOOKMARKS_UPDATE_EVENT, {
          detail: { profileId, bookmarkId, action: "remove" },
        })
      );
    }

    if (!profileId.startsWith("guest-") && !profileId.startsWith("profile-") && supabase) {
      Promise.resolve(
        supabase.from("user_bookmarks").delete().eq("id", bookmarkId)
      ).catch(() => {});
    }
  } catch (err) {
    console.warn("Failed to remove bookmark:", err);
  }
}
