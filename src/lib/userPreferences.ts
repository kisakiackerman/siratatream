import { supabase } from "@/lib/supabase";

export interface PrayerReminderPreferences {
  enabled: boolean;
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
  jumuah: boolean;
  tahajjud: boolean;
  sound: "adhan_makkah" | "adhan_madinah" | "beep" | "silent" | string;
  leadTimeMinutes: number; // 0, 5, 10, 15, 30
}

export interface ChannelNotificationPreferences {
  enabled: boolean;
  subscribedChannels: Record<string, boolean>;
  notifyNewEpisodes: boolean;
  notifyLiveStreams: boolean;
  notifyAnnouncements: boolean;
}

export interface UserPreferences {
  account_id: string;
  prayer_reminders: PrayerReminderPreferences;
  channel_notifications: ChannelNotificationPreferences;
  browser_notifications_enabled: boolean;
  updated_at: string;
}

const STORAGE_PREFS_PREFIX = "nexstream_user_preferences_";

export const DEFAULT_PRAYER_PREFERENCES: PrayerReminderPreferences = {
  enabled: true,
  fajr: true,
  dhuhr: true,
  asr: true,
  maghrib: true,
  isha: true,
  jumuah: true,
  tahajjud: false,
  sound: "adhan_makkah",
  leadTimeMinutes: 5,
};

export const DEFAULT_CHANNEL_PREFERENCES: ChannelNotificationPreferences = {
  enabled: true,
  subscribedChannels: {
    "NARRO DIN": true,
    "Towards Eternity": true,
    "Récitations Haramain": true,
    "NARRO": true,
    "Yacine": true,
    "Croyant Rationnel": true,
    "Minute Islam": true,
  },
  notifyNewEpisodes: true,
  notifyLiveStreams: true,
  notifyAnnouncements: true,
};

export function getDefaultPreferences(accountId: string): UserPreferences {
  return {
    account_id: accountId,
    prayer_reminders: { ...DEFAULT_PRAYER_PREFERENCES },
    channel_notifications: {
      ...DEFAULT_CHANNEL_PREFERENCES,
      subscribedChannels: { ...DEFAULT_CHANNEL_PREFERENCES.subscribedChannels },
    },
    browser_notifications_enabled: false,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Retrieve user preferences from local storage cache
 */
export function getLocalPreferences(accountId: string): UserPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_PREFS_PREFIX + accountId);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          account_id: accountId,
          prayer_reminders: {
            ...DEFAULT_PRAYER_PREFERENCES,
            ...(parsed.prayer_reminders || {}),
          },
          channel_notifications: {
            ...DEFAULT_CHANNEL_PREFERENCES,
            ...(parsed.channel_notifications || {}),
            subscribedChannels: {
              ...DEFAULT_CHANNEL_PREFERENCES.subscribedChannels,
              ...(parsed.channel_notifications?.subscribedChannels || {}),
            },
          },
          browser_notifications_enabled: Boolean(parsed.browser_notifications_enabled),
          updated_at: parsed.updated_at || new Date().toISOString(),
        };
      }
    }
  } catch (e) {
    console.warn("Failed to parse local preferences:", e);
  }

  const def = getDefaultPreferences(accountId);
  saveLocalPreferences(accountId, def);
  return def;
}

/**
 * Persist user preferences to local storage cache
 */
export function saveLocalPreferences(accountId: string, preferences: UserPreferences): void {
  try {
    localStorage.setItem(STORAGE_PREFS_PREFIX + accountId, JSON.stringify(preferences));
  } catch (e) {
    console.warn("Failed to write local preferences:", e);
  }
}

/**
 * Fetch preferences from Supabase `user_preferences` table with automatic local cache fallback
 */
export async function fetchSupabaseUserPreferences(
  accountId: string
): Promise<{ data: UserPreferences; source: "supabase" | "local"; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("account_id", accountId)
      .maybeSingle();

    if (error) {
      // If table doesn't exist or permissions error, fall back cleanly
      const local = getLocalPreferences(accountId);
      return { data: local, source: "local", error: error.message };
    }

    if (data) {
      const remotePrefs: UserPreferences = {
        account_id: accountId,
        prayer_reminders: {
          ...DEFAULT_PRAYER_PREFERENCES,
          ...(data.prayer_reminders || {}),
          // support flattened column if present in some schemas
          ...(typeof data.prayer_reminders_enabled === "boolean"
            ? { enabled: data.prayer_reminders_enabled }
            : {}),
        },
        channel_notifications: {
          ...DEFAULT_CHANNEL_PREFERENCES,
          ...(data.channel_notifications || {}),
          subscribedChannels: {
            ...DEFAULT_CHANNEL_PREFERENCES.subscribedChannels,
            ...(data.channel_notifications?.subscribedChannels || {}),
          },
          ...(typeof data.channel_notifications_enabled === "boolean"
            ? { enabled: data.channel_notifications_enabled }
            : {}),
        },
        browser_notifications_enabled: Boolean(
          data.browser_notifications_enabled ?? false
        ),
        updated_at: data.updated_at || new Date().toISOString(),
      };

      saveLocalPreferences(accountId, remotePrefs);
      return { data: remotePrefs, source: "supabase" };
    }

    // No row yet, seed from local or defaults
    const local = getLocalPreferences(accountId);
    // Attempt non-blocking creation in Supabase
    supabase
      .from("user_preferences")
      .upsert({
        account_id: accountId,
        prayer_reminders: local.prayer_reminders,
        channel_notifications: local.channel_notifications,
        browser_notifications_enabled: local.browser_notifications_enabled,
        updated_at: local.updated_at,
      })
      .then(() => {});

    return { data: local, source: "local" };
  } catch (err: any) {
    const local = getLocalPreferences(accountId);
    return { data: local, source: "local", error: err?.message };
  }
}

/**
 * Persist preferences to Supabase `user_preferences` table and update local cache
 */
export async function persistSupabaseUserPreferences(
  preferences: UserPreferences
): Promise<{ success: boolean; source: "supabase" | "local"; error?: string }> {
  const accountId = preferences.account_id;
  preferences.updated_at = new Date().toISOString();

  // 1. Immediately update local cache for zero-latency UI
  saveLocalPreferences(accountId, preferences);

  // 2. Dispatch cross-component event
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("nexstream-preferences-changed", {
        detail: { accountId, preferences },
      })
    );
  }

  // 3. Upsert to Supabase
  try {
    const payload = {
      account_id: accountId,
      prayer_reminders: preferences.prayer_reminders,
      prayer_reminders_enabled: preferences.prayer_reminders.enabled,
      channel_notifications: preferences.channel_notifications,
      channel_notifications_enabled: preferences.channel_notifications.enabled,
      browser_notifications_enabled: preferences.browser_notifications_enabled,
      updated_at: preferences.updated_at,
    };

    const { error } = await supabase
      .from("user_preferences")
      .upsert(payload, { onConflict: "account_id" });

    if (error) {
      console.warn("Supabase user_preferences upsert error:", error.message);
      return { success: true, source: "local", error: error.message };
    }

    return { success: true, source: "supabase" };
  } catch (err: any) {
    console.warn("Exception writing to Supabase user_preferences:", err);
    return { success: true, source: "local", error: err?.message };
  }
}
