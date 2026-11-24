import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL || "https://tlfsqzdfssqlvikbkglp.supabase.co";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsZnNxemRmc3NxbHZpa2JrZ2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3OTk5MzYsImV4cCI6MjEwMjM3NTkzNn0.OyoHVgFWC661YuQGYrvLKZcpIZP8YpR71beRhQfbY_k";

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const supabaseUrl = url;
export const supabaseAnonKey = anonKey;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value?: string | null): value is string {
  return typeof value === "string" && UUID_REGEX.test(value.trim());
}

/**
 * Deterministically maps a non-UUID account/user ID (such as a Firebase Auth UID)
 * into a valid RFC-4122 UUID string so PostgreSQL `uuid` columns never reject it.
 * If the input is already a valid UUID, it is returned unchanged.
 */
export function toSupabaseUuid(rawId: string): string {
  const trimmed = (rawId || "").trim();
  if (isValidUuid(trimmed)) return trimmed.toLowerCase();

  const seeds = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35];
  const input = `siratstream-uid:${trimmed}`;
  const words = seeds.map((seed, pass) => {
    let h = seed >>> 0;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i) ^ ((pass + 1) * 31);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b) >>> 0;
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35) >>> 0;
    h ^= h >>> 16;
    return h >>> 0;
  });

  words[1] = (words[1] & 0xffff0fff) | 0x00004000;
  words[2] = (words[2] & 0x3fffffff) | 0x80000000;

  const hex = words.map((w) => w.toString(16).padStart(8, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export type MyListItem = {
  id: string;
  content_id: string;
  viewer_profile_id: string;
  created_at: string;
};

export type ViewerProfile = {
  id: string;
  account_id: string;
  name: string;
  avatar_color: string;
  is_kid: boolean;
  pin_code: string | null;
  avatar_icon: string | null;
  favorite_categories: string[] | null;
  prayer_location: { lat: number; lng: number; city: string } | null;
  created_at: string;
};

export type WatchHistoryItem = {
  id: string;
  viewer_profile_id: string;
  content_id: string;
  progress_seconds: number;
  updated_at: string;
};
