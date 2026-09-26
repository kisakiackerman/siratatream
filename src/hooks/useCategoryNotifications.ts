import { useState, useEffect, useCallback, useMemo } from "react";
import { useViewerProfile } from "@/hooks/useViewerProfile";
import { useCreatorCatalog } from "@/hooks/useCreatorCatalog";
import { ContentItem } from "@/data/catalog";
import {
  CategoryNotificationSettings,
  NotifiedHistoryItem,
  isBrowserNotificationSupported,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  getCategoryNotificationSettings,
  saveCategoryNotificationSettings,
  checkForNewCategoryPublications,
  sendTestCategoryNotification,
  resetNotifiedCategoryHistory,
  CATEGORY_NOTIFS_UPDATED_EVENT,
} from "@/lib/categoryNotifications";

export function useCategoryNotifications(onOpenVideo?: (id: string) => void) {
  const { activeProfile, updateProfile } = useViewerProfile();
  const { catalog: liveCatalog } = useCreatorCatalog();
  const profileId = activeProfile?.id || "guest-profile";

  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    getBrowserNotificationPermission()
  );

  const [settings, setSettings] = useState<CategoryNotificationSettings>(() =>
    getCategoryNotificationSettings(profileId)
  );

  // Sync with browser permission state
  useEffect(() => {
    setPermission(getBrowserNotificationPermission());
  }, []);

  // Sync settings when active profile changes
  useEffect(() => {
    const loaded = getCategoryNotificationSettings(profileId);

    // If profile has custom favorite_categories, merge them
    if (activeProfile?.favorite_categories && activeProfile.favorite_categories.length > 0) {
      const mergedCats = Array.from(
        new Set([...loaded.favoriteCategories, ...activeProfile.favorite_categories])
      );
      if (mergedCats.length !== loaded.favoriteCategories.length) {
        loaded.favoriteCategories = mergedCats;
        saveCategoryNotificationSettings(loaded, profileId);
      }
    }

    setSettings(loaded);
  }, [profileId, activeProfile?.favorite_categories]);

  // Listen to external updates to settings
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail?.profileId === profileId && custom.detail?.settings) {
        setSettings(custom.detail.settings);
      }
    };

    window.addEventListener(CATEGORY_NOTIFS_UPDATED_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(CATEGORY_NOTIFS_UPDATED_EVENT, handleUpdate);
    };
  }, [profileId]);

  // Request browser permission
  const requestPermission = useCallback(async () => {
    const res = await requestBrowserNotificationPermission();
    setPermission(res);
    return res;
  }, []);

  // Toggle master enabled switch
  const toggleEnabled = useCallback(() => {
    const updated: CategoryNotificationSettings = {
      ...settings,
      enabled: !settings.enabled,
    };
    setSettings(updated);
    saveCategoryNotificationSettings(updated, profileId);
  }, [settings, profileId]);

  // Toggle a single category
  const toggleCategory = useCallback(
    async (categoryName: string) => {
      const isAlreadySelected = settings.favoriteCategories.includes(categoryName);
      let updatedCategories: string[];

      if (isAlreadySelected) {
        updatedCategories = settings.favoriteCategories.filter((c) => c !== categoryName);
      } else {
        updatedCategories = [...settings.favoriteCategories, categoryName];
      }

      const updatedSettings: CategoryNotificationSettings = {
        ...settings,
        favoriteCategories: updatedCategories,
      };

      setSettings(updatedSettings);
      saveCategoryNotificationSettings(updatedSettings, profileId);

      // Also sync to active viewer profile if available
      if (activeProfile?.id) {
        try {
          await updateProfile(activeProfile.id, {
            favoriteCategories: updatedCategories,
          });
        } catch (err) {
          console.warn("Failed to sync favorite categories to profile:", err);
        }
      }
    },
    [settings, profileId, activeProfile?.id, updateProfile]
  );

  // Set all categories
  const setAllCategories = useCallback(
    async (categoriesList: string[]) => {
      const updatedSettings: CategoryNotificationSettings = {
        ...settings,
        favoriteCategories: categoriesList,
      };

      setSettings(updatedSettings);
      saveCategoryNotificationSettings(updatedSettings, profileId);

      if (activeProfile?.id) {
        try {
          await updateProfile(activeProfile.id, {
            favoriteCategories: categoriesList,
          });
        } catch (err) {
          console.warn("Failed to sync favorite categories to profile:", err);
        }
      }
    },
    [settings, profileId, activeProfile?.id, updateProfile]
  );

  // Clear all categories
  const clearAllCategories = useCallback(async () => {
    await setAllCategories([]);
  }, [setAllCategories]);

  // Check for publications now
  const checkPublicationsNow = useCallback(
    (maxToSend = 3) => {
      if (!liveCatalog || liveCatalog.length === 0) {
        return { alertedCount: 0, alertedItems: [], matchingNewVideos: [] };
      }

      const res = checkForNewCategoryPublications({
        catalog: liveCatalog,
        favoriteCategories: settings.favoriteCategories,
        profileId,
        maxToSend,
        onOpen: onOpenVideo,
      });

      // Update local state
      setSettings(getCategoryNotificationSettings(profileId));
      return res;
    },
    [liveCatalog, settings.favoriteCategories, profileId, onOpenVideo]
  );

  // Send a test notification
  const sendTest = useCallback(
    (category?: string, sample?: ContentItem) => {
      const cat = category || settings.favoriteCategories[0] || "Coran";
      return sendTestCategoryNotification(cat, sample);
    },
    [settings.favoriteCategories]
  );

  // Reset notified history
  const resetHistory = useCallback(() => {
    resetNotifiedCategoryHistory(profileId);
    setSettings(getCategoryNotificationSettings(profileId));
  }, [profileId]);

  // Compute all new videos matching favorite categories from the live catalog
  const matchingNewVideos = useMemo(() => {
    if (!liveCatalog || settings.favoriteCategories.length === 0) return [];
    return liveCatalog.filter(
      (item) =>
        item.categories.some((cat) => settings.favoriteCategories.includes(cat)) &&
        (item.isNew === true || (item.year && item.year >= 2024))
    );
  }, [liveCatalog, settings.favoriteCategories]);

  // Compute unnotified count
  const unnotifiedCount = useMemo(() => {
    const notifiedSet = new Set(settings.notifiedVideoIds || []);
    return matchingNewVideos.filter((item) => !notifiedSet.has(item.id)).length;
  }, [matchingNewVideos, settings.notifiedVideoIds]);

  // Automated background check on load (once per session/mount when liveCatalog is ready)
  useEffect(() => {
    if (!liveCatalog || liveCatalog.length === 0) return;
    if (!settings.enabled) return;
    if (getBrowserNotificationPermission() !== "granted") return;

    // Small timeout to allow initial render to stabilize
    const timer = setTimeout(() => {
      checkForNewCategoryPublications({
        catalog: liveCatalog,
        favoriteCategories: settings.favoriteCategories,
        profileId,
        maxToSend: 2,
        onOpen: onOpenVideo,
      });
      setSettings(getCategoryNotificationSettings(profileId));
    }, 2000);

    return () => clearTimeout(timer);
  }, [liveCatalog, profileId]);

  return {
    permission,
    isSupported: isBrowserNotificationSupported(),
    enabled: settings.enabled,
    favoriteCategories: settings.favoriteCategories,
    notifiedVideoIds: settings.notifiedVideoIds,
    history: settings.history,
    lastCheckTimestamp: settings.lastCheckTimestamp,
    matchingNewVideos,
    unnotifiedCount,
    requestPermission,
    toggleEnabled,
    toggleCategory,
    setAllCategories,
    clearAllCategories,
    checkPublicationsNow,
    sendTestNotification: sendTest,
    resetHistory,
  };
}
