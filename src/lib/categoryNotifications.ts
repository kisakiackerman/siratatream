import { ContentItem, Category } from "@/data/catalog";

export interface NotifiedHistoryItem {
  id: string;
  title: string;
  category: string;
  channel: string;
  image?: string;
  notifiedAt: string;
}

export interface CategoryNotificationSettings {
  enabled: boolean;
  favoriteCategories: string[];
  maxPerCheck: number;
  notifiedVideoIds: string[];
  history: NotifiedHistoryItem[];
  lastCheckTimestamp: string;
}

export const CATEGORY_NOTIFS_STORAGE_PREFIX = "sirat_category_notifications_";
export const CATEGORY_NOTIFS_UPDATED_EVENT = "sirat-category-notifications-updated";
export const OPEN_VIDEO_NOTIFICATION_EVENT = "open-video-notification";

export const DEFAULT_CATEGORY_NOTIFICATION_SETTINGS: CategoryNotificationSettings = {
  enabled: true,
  favoriteCategories: ["Coran", "Prophètes", "Compagnons", "Miracles du Coran"],
  maxPerCheck: 3,
  notifiedVideoIds: [],
  history: [],
  lastCheckTimestamp: new Date().toISOString(),
};

/**
 * Check if the browser supports the Notification API
 */
export function isBrowserNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Get current browser notification permission
 */
export function getBrowserNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isBrowserNotificationSupported()) {
    return "unsupported";
  }
  return Notification.permission;
}

/**
 * Request notification permission from user via browser prompt
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isBrowserNotificationSupported()) {
    return "unsupported";
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn("Failed to request notification permission:", err);
    return Notification.permission;
  }
}

/**
 * Get notification settings for profile
 */
export function getCategoryNotificationSettings(profileId = "default"): CategoryNotificationSettings {
  if (typeof window === "undefined") {
    return { ...DEFAULT_CATEGORY_NOTIFICATION_SETTINGS };
  }

  try {
    const raw = localStorage.getItem(CATEGORY_NOTIFS_STORAGE_PREFIX + profileId);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : true,
          favoriteCategories: Array.isArray(parsed.favoriteCategories)
            ? parsed.favoriteCategories
            : [...DEFAULT_CATEGORY_NOTIFICATION_SETTINGS.favoriteCategories],
          maxPerCheck: typeof parsed.maxPerCheck === "number" ? parsed.maxPerCheck : 3,
          notifiedVideoIds: Array.isArray(parsed.notifiedVideoIds) ? parsed.notifiedVideoIds : [],
          history: Array.isArray(parsed.history) ? parsed.history.slice(0, 50) : [],
          lastCheckTimestamp: parsed.lastCheckTimestamp || new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.warn("Failed to read category notification settings:", err);
  }

  return { ...DEFAULT_CATEGORY_NOTIFICATION_SETTINGS };
}

/**
 * Save notification settings for profile and notify listeners
 */
export function saveCategoryNotificationSettings(
  settings: CategoryNotificationSettings,
  profileId = "default"
): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      CATEGORY_NOTIFS_STORAGE_PREFIX + profileId,
      JSON.stringify(settings)
    );
    window.dispatchEvent(
      new CustomEvent(CATEGORY_NOTIFS_UPDATED_EVENT, {
        detail: { profileId, settings },
      })
    );
  } catch (err) {
    console.warn("Failed to save category notification settings:", err);
  }
}

/**
 * Instantiates and displays a browser notification for a video
 */
export function sendBrowserNotification(
  item: ContentItem,
  category: string,
  onOpen?: (id: string) => void
): Notification | null {
  if (!isBrowserNotificationSupported() || Notification.permission !== "granted") {
    return null;
  }

  try {
    const title = `SiratStream · Nouveau dans ${category}`;
    const options: NotificationOptions = {
      body: `« ${item.title} » (${item.channel}) est maintenant disponible dans vos catégories favorites.`,
      icon: item.image || item.thumbnail || "/favicon.ico",
      badge: "/favicon.ico",
      tag: `sirat-cat-${item.id}`,
      silent: false,
    };

    const notif = new Notification(title, options);

    notif.onclick = () => {
      try {
        window.focus();
      } catch {}
      window.dispatchEvent(
        new CustomEvent(OPEN_VIDEO_NOTIFICATION_EVENT, { detail: { id: item.id } })
      );
      if (onOpen) {
        onOpen(item.id);
      }
      notif.close();
    };

    return notif;
  } catch (err) {
    console.warn("Browser Notification constructor failed:", err);
    return null;
  }
}

/**
 * Send an immediate test notification to verify browser permissions and layout
 */
export function sendTestCategoryNotification(
  category = "Coran",
  sampleItem?: ContentItem
): boolean {
  if (!isBrowserNotificationSupported() || Notification.permission !== "granted") {
    return false;
  }

  const dummyItem: ContentItem = sampleItem || {
    id: "test-notification-sample",
    youtubeId: "sample",
    title: "Sourate Al-Baqarah (Tarawih 1993)",
    description: "Récitation émouvante de Tarawih à la Grande Mosquée de La Mecque.",
    channel: "Récitations Haramain" as any,
    categories: [category as Category],
    year: 2024,
    rating: "Tous publics",
    duration: "45:12",
    score: 9.8,
    thumbnail: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=800&auto=format&fit=crop&q=80",
    image: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=800&auto=format&fit=crop&q=80",
    isNew: true,
  };

  const notif = sendBrowserNotification(dummyItem, category);
  return notif !== null;
}

/**
 * Scans catalog for new publications in the user's favorite categories,
 * triggers browser notifications for un-notified items, and updates history.
 */
export function checkForNewCategoryPublications(params: {
  catalog: ContentItem[];
  favoriteCategories: string[];
  profileId?: string;
  maxToSend?: number;
  onOpen?: (id: string) => void;
}): {
  alertedCount: number;
  alertedItems: ContentItem[];
  matchingNewVideos: ContentItem[];
} {
  const {
    catalog,
    favoriteCategories,
    profileId = "default",
    maxToSend = 3,
    onOpen,
  } = params;

  if (!catalog || catalog.length === 0 || !favoriteCategories || favoriteCategories.length === 0) {
    return { alertedCount: 0, alertedItems: [], matchingNewVideos: [] };
  }

  const settings = getCategoryNotificationSettings(profileId);
  const notifiedSet = new Set(settings.notifiedVideoIds || []);

  // Filter catalog items matching user's favorite categories
  const matchingItems = catalog.filter((item) =>
    item.categories.some((cat) => favoriteCategories.includes(cat))
  );

  // Identify new publications (marked isNew or high-priority latest additions)
  const matchingNewVideos = matchingItems.filter(
    (item) => item.isNew === true || (item.year && item.year >= 2024)
  );

  // If notifications are disabled or permission not granted, return matches without alerting
  const canSendBrowserNotif =
    settings.enabled &&
    isBrowserNotificationSupported() &&
    Notification.permission === "granted";

  if (!canSendBrowserNotif) {
    return { alertedCount: 0, alertedItems: [], matchingNewVideos };
  }

  // Find un-notified items
  const unnotifiedItems = matchingNewVideos.filter((item) => !notifiedSet.has(item.id));

  if (unnotifiedItems.length === 0) {
    // Update lastCheckTimestamp
    settings.lastCheckTimestamp = new Date().toISOString();
    saveCategoryNotificationSettings(settings, profileId);
    return { alertedCount: 0, alertedItems: [], matchingNewVideos };
  }

  // Send notifications for up to maxToSend items to avoid spamming the user
  const toAlert = unnotifiedItems.slice(0, maxToSend);
  const alertedItems: ContentItem[] = [];
  const newHistoryEntries: NotifiedHistoryItem[] = [];

  toAlert.forEach((item) => {
    // Pick the primary matching category
    const matchedCategory =
      item.categories.find((c) => favoriteCategories.includes(c)) || item.categories[0] || "Général";

    sendBrowserNotification(item, matchedCategory, onOpen);

    alertedItems.push(item);
    notifiedSet.add(item.id);

    newHistoryEntries.push({
      id: item.id,
      title: item.title,
      category: matchedCategory,
      channel: item.channel,
      image: item.thumbnail || item.image,
      notifiedAt: new Date().toISOString(),
    });
  });

  // Persist updated IDs and history
  const updatedHistory = [...newHistoryEntries, ...(settings.history || [])].slice(0, 50);
  const updatedSettings: CategoryNotificationSettings = {
    ...settings,
    notifiedVideoIds: Array.from(notifiedSet),
    history: updatedHistory,
    lastCheckTimestamp: new Date().toISOString(),
  };

  saveCategoryNotificationSettings(updatedSettings, profileId);

  return {
    alertedCount: alertedItems.length,
    alertedItems,
    matchingNewVideos,
  };
}

/**
 * Reset notification history for profile
 */
export function resetNotifiedCategoryHistory(profileId = "default"): void {
  const current = getCategoryNotificationSettings(profileId);
  const reset: CategoryNotificationSettings = {
    ...current,
    notifiedVideoIds: [],
    history: [],
    lastCheckTimestamp: new Date().toISOString(),
  };
  saveCategoryNotificationSettings(reset, profileId);
}
