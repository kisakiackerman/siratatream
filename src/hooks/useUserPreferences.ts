import { useState, useEffect, useCallback, useTransition } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  UserPreferences,
  PrayerReminderPreferences,
  ChannelNotificationPreferences,
  fetchSupabaseUserPreferences,
  persistSupabaseUserPreferences,
  getDefaultPreferences,
  getLocalPreferences,
} from "@/lib/userPreferences";

export function useUserPreferences() {
  const { user } = useAuth();
  const accountId =
    (user as any)?.uid || (user as any)?.id || "guest-account-nexstream";

  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    getLocalPreferences(accountId)
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [source, setSource] = useState<"supabase" | "local">("local");
  const [error, setError] = useState<string | null>(null);
  const [browserPermission, setBrowserPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");

  // Check browser notification permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserPermission(Notification.permission);
    } else {
      setBrowserPermission("unsupported");
    }
  }, []);

  // Load preferences
  const loadPreferences = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const result = await fetchSupabaseUserPreferences(accountId);
        setPreferences(result.data);
        setSource(result.source);
        if (result.error && result.source === "local") {
          // graceful fallback
        }
      } catch (err: any) {
        setError(err?.message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    },
    [accountId]
  );

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Listen to cross-component changes
  useEffect(() => {
    const handleChanged = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail?.accountId === accountId && custom.detail?.preferences) {
        setPreferences(custom.detail.preferences);
      }
    };
    window.addEventListener("nexstream-preferences-changed", handleChanged);
    return () => {
      window.removeEventListener("nexstream-preferences-changed", handleChanged);
    };
  }, [accountId]);

  // Realtime Supabase subscription if available
  useEffect(() => {
    try {
      const channel = supabase
        .channel(`public:user_preferences:${accountId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_preferences",
            filter: `account_id=eq.${accountId}`,
          },
          () => {
            loadPreferences(true);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      // ignore
    }
  }, [accountId, loadPreferences]);

  // Save changes
  const save = useCallback(
    async (newPrefs: UserPreferences) => {
      setSaving(true);
      // Optimistic update
      setPreferences(newPrefs);
      try {
        const res = await persistSupabaseUserPreferences(newPrefs);
        setSource(res.source);
      } catch (err: any) {
        setError(err?.message);
      } finally {
        setSaving(false);
      }
    },
    []
  );

  // Toggle master prayer reminders
  const togglePrayerReminderMaster = useCallback(async () => {
    const updated: UserPreferences = {
      ...preferences,
      prayer_reminders: {
        ...preferences.prayer_reminders,
        enabled: !preferences.prayer_reminders.enabled,
      },
    };
    await save(updated);
  }, [preferences, save]);

  // Toggle specific prayer
  const togglePrayer = useCallback(
    async (
      prayerKey:
        | "fajr"
        | "dhuhr"
        | "asr"
        | "maghrib"
        | "isha"
        | "jumuah"
        | "tahajjud"
    ) => {
      const currentVal = preferences.prayer_reminders[prayerKey];
      const updated: UserPreferences = {
        ...preferences,
        prayer_reminders: {
          ...preferences.prayer_reminders,
          [prayerKey]: !currentVal,
        },
      };
      await save(updated);
    },
    [preferences, save]
  );

  // Set prayer sound
  const setPrayerSound = useCallback(
    async (sound: PrayerReminderPreferences["sound"]) => {
      const updated: UserPreferences = {
        ...preferences,
        prayer_reminders: {
          ...preferences.prayer_reminders,
          sound,
        },
      };
      await save(updated);
    },
    [preferences, save]
  );

  // Set prayer lead time
  const setPrayerLeadTime = useCallback(
    async (minutes: number) => {
      const updated: UserPreferences = {
        ...preferences,
        prayer_reminders: {
          ...preferences.prayer_reminders,
          leadTimeMinutes: minutes,
        },
      };
      await save(updated);
    },
    [preferences, save]
  );

  // Toggle channel notifications master
  const toggleChannelMaster = useCallback(async () => {
    const updated: UserPreferences = {
      ...preferences,
      channel_notifications: {
        ...preferences.channel_notifications,
        enabled: !preferences.channel_notifications.enabled,
      },
    };
    await save(updated);
  }, [preferences, save]);

  // Toggle channel subscription
  const toggleChannelSubscription = useCallback(
    async (channelName: string) => {
      const currentSubscribed =
        preferences.channel_notifications.subscribedChannels[channelName] ?? true;
      const updated: UserPreferences = {
        ...preferences,
        channel_notifications: {
          ...preferences.channel_notifications,
          subscribedChannels: {
            ...preferences.channel_notifications.subscribedChannels,
            [channelName]: !currentSubscribed,
          },
        },
      };
      await save(updated);
    },
    [preferences, save]
  );

  // Batch toggle all channels
  const setAllChannels = useCallback(
    async (enabled: boolean, availableChannels: string[]) => {
      const nextSubs: Record<string, boolean> = {};
      availableChannels.forEach((ch) => {
        nextSubs[ch] = enabled;
      });
      const updated: UserPreferences = {
        ...preferences,
        channel_notifications: {
          ...preferences.channel_notifications,
          subscribedChannels: nextSubs,
        },
      };
      await save(updated);
    },
    [preferences, save]
  );

  // Toggle notification types (new episodes, lives, announcements)
  const toggleNotificationType = useCallback(
    async (
      typeKey: "notifyNewEpisodes" | "notifyLiveStreams" | "notifyAnnouncements"
    ) => {
      const currentVal = preferences.channel_notifications[typeKey];
      const updated: UserPreferences = {
        ...preferences,
        channel_notifications: {
          ...preferences.channel_notifications,
          [typeKey]: !currentVal,
        },
      };
      await save(updated);
    },
    [preferences, save]
  );

  // Request browser permission
  const requestBrowserPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }
    try {
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);
      if (permission === "granted") {
        const updated: UserPreferences = {
          ...preferences,
          browser_notifications_enabled: true,
        };
        await save(updated);
      }
      return permission;
    } catch {
      return "denied" as NotificationPermission;
    }
  }, [preferences, save]);

  // Send a test notification
  const sendTestNotification = useCallback(
    (title: string, body: string): boolean => {
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          try {
            new Notification(title, {
              body,
              icon: "/favicon.ico",
            });
            return true;
          } catch {
            // fallback
          }
        }
      }
      return false;
    },
    []
  );

  return {
    preferences,
    loading,
    saving,
    source,
    error,
    browserPermission,
    togglePrayerReminderMaster,
    togglePrayer,
    setPrayerSound,
    setPrayerLeadTime,
    toggleChannelMaster,
    toggleChannelSubscription,
    setAllChannels,
    toggleNotificationType,
    requestBrowserPermission,
    sendTestNotification,
    refresh: () => loadPreferences(true),
  };
}
