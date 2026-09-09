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
