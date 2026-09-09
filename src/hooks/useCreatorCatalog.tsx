import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import {
  catalog as baseCatalog,
  type ContentItem,
  type Category,
  type Channel,
  categories as baseCategories,
} from "@/data/catalog";
import { db, doc, setDoc, getDoc, collection, onSnapshot, getDocs, deleteDoc } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_CUSTOM_KEY = "nexstream_custom_content_v2";
const STORAGE_ANNOUNCEMENT_KEY = "nexstream_announcement_v2";
const STORAGE_SPOTLIGHT_KEY = "nexstream_spotlight_v2";
const STORAGE_DELETED_VIDEOS_KEY = "nexstream_deleted_videos_v1";
const STORAGE_CUSTOM_CATEGORIES_KEY = "nexstream_custom_categories_v1";
const STORAGE_CUSTOM_CHANNELS_KEY = "nexstream_custom_channels_v1";
const STORAGE_CREATOR_ALERTS_KEY = "nexstream_creator_alerts_v1";

export interface GlobalAnnouncement {
  enabled: boolean;
  text: string;
  subtext?: string;
  badge?: string;
  badgeColor?: "amber" | "emerald" | "sky" | "rose" | "purple" | "red";
  priority?: "normal" | "urgent" | "event";
  buttonText?: string;
  linkContentId?: string;
  externalLink?: string;
  showPopup?: boolean;
  popupTitle?: string;
  popupMessage?: string;
  expiresAt?: string;
  updatedAt?: string;
}

export interface CreatorAlertBroadcast {
  id: string;
  title: string;
  message: string;
  badge?: string;
  badgeColor?: "amber" | "emerald" | "sky" | "rose" | "purple" | "red";
  priority?: "normal" | "urgent" | "event";
  linkContentId?: string;
  sentAt: string;
  active: boolean;
}

export interface CustomChannelInfo {
  name: string;
  description?: string;
  avatar?: string;
}

interface CreatorCatalogContextValue {
  catalog: ContentItem[];
  allCatalogIncludingDeleted: ContentItem[];
  customItems: ContentItem[];
  deletedVideoIds: string[];
  customCategories: string[];
  customChannels: CustomChannelInfo[];
  allActiveCategories: string[];
  allActiveChannels: string[];
  announcement: GlobalAnnouncement | null;
  creatorAlerts: CreatorAlertBroadcast[];
  spotlightId: string | null;
  isLoading: boolean;
  addOrUpdateContent: (item: ContentItem) => Promise<{ success: boolean; error?: string }>;
  deleteContent: (id: string) => Promise<{ success: boolean; error?: string }>;
  restoreDeletedVideo: (id: string) => Promise<{ success: boolean }>;
  resetDeletedVideos: () => Promise<void>;
  addCategory: (name: string) => Promise<{ success: boolean; error?: string }>;
  removeCategory: (name: string) => Promise<{ success: boolean }>;
  addChannel: (channel: CustomChannelInfo) => Promise<{ success: boolean; error?: string }>;
  removeChannel: (name: string) => Promise<{ success: boolean }>;
  setAnnouncement: (announcement: GlobalAnnouncement | null) => Promise<{ success: boolean }>;
  broadcastCreatorAlert: (alert: Omit<CreatorAlertBroadcast, "id" | "sentAt">) => Promise<{ success: boolean; id: string }>;
  deleteCreatorAlert: (id: string) => Promise<{ success: boolean }>;
  setSpotlightId: (id: string | null) => Promise<{ success: boolean }>;
  resetCatalogDefaults: () => Promise<void>;
  exportBackup: () => string;
  importBackup: (jsonStr: string) => Promise<{ success: boolean; count?: number; error?: string }>;
}

const CreatorCatalogContext = createContext<CreatorCatalogContextValue | null>(null);

const DEFAULT_CHANNELS: CustomChannelInfo[] = [
  { name: "NARRO DIN", description: "Voyages immersifs, récits des prophètes et miracles coraniques", avatar: "https://i.ytimg.com/vi/GBxsINL9kWw/hqdefault.jpg" },
  { name: "NARRO", description: "Récits immersifs & biographies prophétiques authentiques", avatar: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=100" },
  { name: "Yacine", description: "Histoires captivantes et leçons morales de la Sîra", avatar: "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=100" },
  { name: "Towards Eternity", description: "Méditations spirituelles et quête du sens profond", avatar: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=100" },
  { name: "Croyant Rationnel", description: "Analyses théologiques, miracles scientifiques et débats", avatar: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=100" },
  { name: "Récitations Haramain", description: "Enregistrements historiques des Tarawih de La Mecque & Médine", avatar: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=100" },
];

export function CreatorCatalogProvider({ children }: { children: ReactNode }) {
  const { isCreator } = useAuth();

  const [customItems, setCustomItems] = useState<ContentItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_CUSTOM_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [deletedVideoIds, setDeletedVideoIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_DELETED_VIDEOS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_CUSTOM_CATEGORIES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [customChannels, setCustomChannels] = useState<CustomChannelInfo[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_CUSTOM_CHANNELS_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_CHANNELS;
    } catch {
      return DEFAULT_CHANNELS;
    }
  });

  const [announcement, setAnnouncementState] = useState<GlobalAnnouncement | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_ANNOUNCEMENT_KEY);
      return stored ? JSON.parse(stored) : {
        enabled: true,
        text: "✨ Bienvenue sur SiratStream — Récits des Prophètes & Tarawih Historiques",
        subtext: "Explorez notre catalogue 100% sans publicité et synchronisé dans le cloud.",
        badge: "BIENVENUE",
        badgeColor: "emerald",
      };
    } catch {
      return null;
    }
  });

  const [creatorAlerts, setCreatorAlerts] = useState<CreatorAlertBroadcast[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_CREATOR_ALERTS_KEY);
      return stored ? JSON.parse(stored) : [
        {
          id: "alert-init-1",
          title: "Bienvenue sur SiratStream",
          message: "Tous les épisodes et récits sont disponibles en haute fidélité sans interruption.",
          badge: "COMMUNAUTÉ",
          badgeColor: "emerald",
          priority: "normal",
          sentAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          active: true,
        },
      ];
    } catch {
      return [];
    }
  });

  const [spotlightId, setSpotlightIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_SPOTLIGHT_KEY) || null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  // Sync from Firestore if available
  useEffect(() => {
    try {
      // 1. Announcement
      const annDocRef = doc(db, "app_config", "announcement");
      const unsubAnn = onSnapshot(annDocRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data() as GlobalAnnouncement;
          setAnnouncementState(data);
          localStorage.setItem(STORAGE_ANNOUNCEMENT_KEY, JSON.stringify(data));
        }
      }, () => {});

      // 2. Custom content
      const contentColRef = collection(db, "creator_content");
      const unsubContent = onSnapshot(contentColRef, (snap) => {
        const items: ContentItem[] = [];
        snap.forEach((docSnap) => {
          items.push(docSnap.data() as ContentItem);
        });
        setCustomItems(items);
        localStorage.setItem(STORAGE_CUSTOM_KEY, JSON.stringify(items));
      }, () => {});

      // 3. Spotlight
      const spotDocRef = doc(db, "app_config", "spotlight");
      const unsubSpot = onSnapshot(spotDocRef, (snap) => {
        if (snap.exists()) {
          const sId = snap.data()?.contentId || null;
          setSpotlightIdState(sId);
          if (sId) localStorage.setItem(STORAGE_SPOTLIGHT_KEY, sId);
          else localStorage.removeItem(STORAGE_SPOTLIGHT_KEY);
        }
      }, () => {});

      // 4. Deleted videos config
      const delDocRef = doc(db, "app_config", "deleted_videos");
      const unsubDel = onSnapshot(delDocRef, (snap) => {
        if (snap.exists()) {
          const ids = (snap.data()?.ids as string[]) || [];
          setDeletedVideoIds(ids);
          localStorage.setItem(STORAGE_DELETED_VIDEOS_KEY, JSON.stringify(ids));
        }
      }, () => {});

      // 5. Custom categories & channels
      const metaDocRef = doc(db, "app_config", "catalog_metadata");
      const unsubMeta = onSnapshot(metaDocRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data?.customCategories) {
            setCustomCategories(data.customCategories);
            localStorage.setItem(STORAGE_CUSTOM_CATEGORIES_KEY, JSON.stringify(data.customCategories));
          }
          if (data?.customChannels) {
            setCustomChannels(data.customChannels);
            localStorage.setItem(STORAGE_CUSTOM_CHANNELS_KEY, JSON.stringify(data.customChannels));
          }
        }
      }, () => {});

      // 6. Creator Alerts broadcast list
      const alertsDocRef = doc(db, "app_config", "creator_alerts");
      const unsubAlerts = onSnapshot(alertsDocRef, (snap) => {
        if (snap.exists()) {
          const list = (snap.data()?.alerts as CreatorAlertBroadcast[]) || [];
          setCreatorAlerts(list);
          localStorage.setItem(STORAGE_CREATOR_ALERTS_KEY, JSON.stringify(list));
        }
      }, () => {});

      return () => {
        unsubAnn();
        unsubContent();
        unsubSpot();
        unsubDel();
        unsubMeta();
        unsubAlerts();
      };
    } catch (e) {
      console.warn("Firestore listener note:", e);
    }
  }, []);

  // Compute all active categories and channels
  const allActiveCategories = Array.from(new Set([...baseCategories, ...customCategories]));
  const allActiveChannels = Array.from(new Set([
    "NARRO DIN",
    "NARRO",
    "Yacine",
    "Towards Eternity",
    "Croyant Rationnel",
    "Récitations Haramain",
    "Minute Islam",
    ...customChannels.map((c) => c.name),
  ]));

  // Merged catalog computation with deletion filtering
  const allCatalogIncludingDeleted: ContentItem[] = (() => {
    const customMap = new Map<string, ContentItem>();
    customItems.forEach((item) => customMap.set(item.id, item));

    const list = baseCatalog.map((base) => {
      if (customMap.has(base.id)) {
        const custom = customMap.get(base.id)!;
        customMap.delete(base.id);
        return custom;
      }
      return base;
    });

    const newlyAdded = Array.from(customMap.values());
    const all = [...newlyAdded, ...list];

    if (spotlightId) {
      return all.map((it) => (it.id === spotlightId ? { ...it, featured: true } : it));
    }
    return all;
  })();

  const mergedCatalog = allCatalogIncludingDeleted.filter(
    (item) => !deletedVideoIds.includes(item.id)
  );

  // Add or update a content item
  const addOrUpdateContent = useCallback(
    async (item: ContentItem): Promise<{ success: boolean; error?: string }> => {
      try {
        const nextCustom = [item, ...customItems.filter((c) => c.id !== item.id)];
        setCustomItems(nextCustom);
        localStorage.setItem(STORAGE_CUSTOM_KEY, JSON.stringify(nextCustom));

        // If it was in deleted list, remove it from deleted list
        if (deletedVideoIds.includes(item.id)) {
          const nextDeleted = deletedVideoIds.filter((id) => id !== item.id);
          setDeletedVideoIds(nextDeleted);
          localStorage.setItem(STORAGE_DELETED_VIDEOS_KEY, JSON.stringify(nextDeleted));
        }

        try {
          const docRef = doc(db, "creator_content", item.id);
          await setDoc(docRef, { ...item, updatedAt: new Date().toISOString() });
        } catch (fbErr: any) {
          console.warn("Firestore save note:", fbErr.message);
        }

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || "Erreur de sauvegarde" };
      }
    },
    [customItems, deletedVideoIds]
  );

  // Delete ANY content item from catalog
  const deleteContent = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const nextCustom = customItems.filter((c) => c.id !== id);
        setCustomItems(nextCustom);
        localStorage.setItem(STORAGE_CUSTOM_KEY, JSON.stringify(nextCustom));

        const nextDeleted = Array.from(new Set([...deletedVideoIds, id]));
        setDeletedVideoIds(nextDeleted);
        localStorage.setItem(STORAGE_DELETED_VIDEOS_KEY, JSON.stringify(nextDeleted));

        try {
          const docRef = doc(db, "creator_content", id);
          await deleteDoc(docRef);
        } catch {}

        try {
          const delDocRef = doc(db, "app_config", "deleted_videos");
          await setDoc(delDocRef, { ids: nextDeleted, updatedAt: new Date().toISOString() });
        } catch {}

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || "Erreur de suppression" };
      }
    },
    [customItems, deletedVideoIds]
  );

  // Restore deleted video
  const restoreDeletedVideo = useCallback(
    async (id: string) => {
      const nextDeleted = deletedVideoIds.filter((dId) => dId !== id);
      setDeletedVideoIds(nextDeleted);
      localStorage.setItem(STORAGE_DELETED_VIDEOS_KEY, JSON.stringify(nextDeleted));
      try {
        const delDocRef = doc(db, "app_config", "deleted_videos");
        await setDoc(delDocRef, { ids: nextDeleted, updatedAt: new Date().toISOString() });
      } catch {}
      return { success: true };
    },
    [deletedVideoIds]
  );

  const resetDeletedVideos = useCallback(async () => {
    setDeletedVideoIds([]);
    localStorage.removeItem(STORAGE_DELETED_VIDEOS_KEY);
    try {
      const delDocRef = doc(db, "app_config", "deleted_videos");
      await setDoc(delDocRef, { ids: [], updatedAt: new Date().toISOString() });
    } catch {}
  }, []);

  // Category Management
  const addCategory = useCallback(
    async (name: string): Promise<{ success: boolean; error?: string }> => {
      const trimmed = name.trim();
      if (!trimmed) return { success: false, error: "Nom de catégorie vide" };
      if (allActiveCategories.includes(trimmed)) {
        return { success: false, error: "Cette catégorie existe déjà" };
      }
      const next = [...customCategories, trimmed];
      setCustomCategories(next);
      localStorage.setItem(STORAGE_CUSTOM_CATEGORIES_KEY, JSON.stringify(next));
      try {
        const metaDocRef = doc(db, "app_config", "catalog_metadata");
        await setDoc(metaDocRef, { customCategories: next, customChannels, updatedAt: new Date().toISOString() }, { merge: true });
      } catch {}
      return { success: true };
    },
    [customCategories, customChannels, allActiveCategories]
  );

  const removeCategory = useCallback(
    async (name: string) => {
      const next = customCategories.filter((c) => c !== name);
      setCustomCategories(next);
      localStorage.setItem(STORAGE_CUSTOM_CATEGORIES_KEY, JSON.stringify(next));
      try {
        const metaDocRef = doc(db, "app_config", "catalog_metadata");
        await setDoc(metaDocRef, { customCategories: next, customChannels, updatedAt: new Date().toISOString() }, { merge: true });
      } catch {}
      return { success: true };
    },
    [customCategories, customChannels]
  );

  // Channel Management
  const addChannel = useCallback(
    async (channel: CustomChannelInfo): Promise<{ success: boolean; error?: string }> => {
      const trimmed = channel.name.trim();
      if (!trimmed) return { success: false, error: "Nom de chaîne vide" };
      if (customChannels.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
        return { success: false, error: "Cette chaîne existe déjà" };
      }
      const next = [...customChannels, { ...channel, name: trimmed }];
      setCustomChannels(next);
      localStorage.setItem(STORAGE_CUSTOM_CHANNELS_KEY, JSON.stringify(next));
      try {
        const metaDocRef = doc(db, "app_config", "catalog_metadata");
        await setDoc(metaDocRef, { customCategories, customChannels: next, updatedAt: new Date().toISOString() }, { merge: true });
      } catch {}
      return { success: true };
    },
    [customCategories, customChannels]
  );

  const removeChannel = useCallback(
    async (name: string) => {
      const next = customChannels.filter((c) => c.name !== name);
      setCustomChannels(next);
      localStorage.setItem(STORAGE_CUSTOM_CHANNELS_KEY, JSON.stringify(next));
      try {
        const metaDocRef = doc(db, "app_config", "catalog_metadata");
        await setDoc(metaDocRef, { customCategories, customChannels: next, updatedAt: new Date().toISOString() }, { merge: true });
      } catch {}
      return { success: true };
    },
    [customCategories, customChannels]
  );

  // Update announcement
  const setAnnouncement = useCallback(async (newAnn: GlobalAnnouncement | null) => {
    setAnnouncementState(newAnn);
    if (newAnn) {
      localStorage.setItem(STORAGE_ANNOUNCEMENT_KEY, JSON.stringify(newAnn));
      try {
        const docRef = doc(db, "app_config", "announcement");
        await setDoc(docRef, { ...newAnn, updatedAt: new Date().toISOString() });
      } catch {}
    } else {
      localStorage.removeItem(STORAGE_ANNOUNCEMENT_KEY);
      try {
        const docRef = doc(db, "app_config", "announcement");
        await setDoc(docRef, { enabled: false, text: "", updatedAt: new Date().toISOString() });
      } catch {}
    }
    return { success: true };
  }, []);

  // Broadcast an alert to community
  const broadcastCreatorAlert = useCallback(
    async (alertData: Omit<CreatorAlertBroadcast, "id" | "sentAt">) => {
      const newAlert: CreatorAlertBroadcast = {
        ...alertData,
        id: `alert-${Date.now()}`,
        sentAt: new Date().toISOString(),
      };
      const nextList = [newAlert, ...creatorAlerts.slice(0, 49)];
      setCreatorAlerts(nextList);
      localStorage.setItem(STORAGE_CREATOR_ALERTS_KEY, JSON.stringify(nextList));
      try {
        const docRef = doc(db, "app_config", "creator_alerts");
        await setDoc(docRef, { alerts: nextList, lastSent: newAlert, updatedAt: new Date().toISOString() });
      } catch {}
      return { success: true, id: newAlert.id };
    },
    [creatorAlerts]
  );

  // Delete creator alert from history
  const deleteCreatorAlert = useCallback(
    async (id: string) => {
      const nextList = creatorAlerts.filter((a) => a.id !== id);
      setCreatorAlerts(nextList);
      localStorage.setItem(STORAGE_CREATOR_ALERTS_KEY, JSON.stringify(nextList));
      try {
        const docRef = doc(db, "app_config", "creator_alerts");
        await setDoc(docRef, { alerts: nextList, updatedAt: new Date().toISOString() });
      } catch {}
      return { success: true };
    },
    [creatorAlerts]
  );

  // Update spotlight
  const setSpotlightId = useCallback(async (id: string | null) => {
    setSpotlightIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_SPOTLIGHT_KEY, id);
      try {
        const docRef = doc(db, "app_config", "spotlight");
        await setDoc(docRef, { contentId: id, updatedAt: new Date().toISOString() });
      } catch {}
    } else {
      localStorage.removeItem(STORAGE_SPOTLIGHT_KEY);
      try {
        const docRef = doc(db, "app_config", "spotlight");
        await setDoc(docRef, { contentId: null, updatedAt: new Date().toISOString() });
      } catch {}
    }
    return { success: true };
  }, []);

  // Reset to original catalog defaults
  const resetCatalogDefaults = useCallback(async () => {
    setCustomItems([]);
    setDeletedVideoIds([]);
    setCustomCategories([]);
    setSpotlightIdState(null);
    localStorage.removeItem(STORAGE_CUSTOM_KEY);
    localStorage.removeItem(STORAGE_DELETED_VIDEOS_KEY);
    localStorage.removeItem(STORAGE_CUSTOM_CATEGORIES_KEY);
    localStorage.removeItem(STORAGE_SPOTLIGHT_KEY);
  }, []);

  // Export JSON backup
  const exportBackup = useCallback(() => {
    const data = {
      version: 3,
      exportedAt: new Date().toISOString(),
      customItems,
      deletedVideoIds,
      customCategories,
      customChannels,
      announcement,
      spotlightId,
    };
    return JSON.stringify(data, null, 2);
  }, [customItems, deletedVideoIds, customCategories, customChannels, announcement, spotlightId]);

  // Import JSON backup
  const importBackup = useCallback(async (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed.customItems)) {
        setCustomItems(parsed.customItems);
        localStorage.setItem(STORAGE_CUSTOM_KEY, JSON.stringify(parsed.customItems));
        if (Array.isArray(parsed.deletedVideoIds)) {
          setDeletedVideoIds(parsed.deletedVideoIds);
          localStorage.setItem(STORAGE_DELETED_VIDEOS_KEY, JSON.stringify(parsed.deletedVideoIds));
        }
        if (Array.isArray(parsed.customCategories)) {
          setCustomCategories(parsed.customCategories);
          localStorage.setItem(STORAGE_CUSTOM_CATEGORIES_KEY, JSON.stringify(parsed.customCategories));
        }
        if (Array.isArray(parsed.customChannels)) {
          setCustomChannels(parsed.customChannels);
          localStorage.setItem(STORAGE_CUSTOM_CHANNELS_KEY, JSON.stringify(parsed.customChannels));
        }
        if (parsed.announcement) {
          setAnnouncementState(parsed.announcement);
          localStorage.setItem(STORAGE_ANNOUNCEMENT_KEY, JSON.stringify(parsed.announcement));
        }
        if (parsed.spotlightId) {
          setSpotlightIdState(parsed.spotlightId);
          localStorage.setItem(STORAGE_SPOTLIGHT_KEY, parsed.spotlightId);
        }
        return { success: true, count: parsed.customItems.length };
      }
      return { success: false, error: "Format JSON de sauvegarde invalide." };
    } catch (err: any) {
      return { success: false, error: err.message || "Impossible de parser le JSON" };
    }
  }, []);

  return (
    <CreatorCatalogContext.Provider
      value={{
        catalog: mergedCatalog,
        allCatalogIncludingDeleted,
        customItems,
        deletedVideoIds,
        customCategories,
        customChannels,
        allActiveCategories,
        allActiveChannels,
        announcement,
        creatorAlerts,
        spotlightId,
        isLoading,
        addOrUpdateContent,
        deleteContent,
        restoreDeletedVideo,
        resetDeletedVideos,
        addCategory,
        removeCategory,
        addChannel,
        removeChannel,
        setAnnouncement,
        broadcastCreatorAlert,
        deleteCreatorAlert,
        setSpotlightId,
        resetCatalogDefaults,
        exportBackup,
        importBackup,
      }}
    >
      {children}
    </CreatorCatalogContext.Provider>
  );
}

export function useCreatorCatalog() {
  const ctx = useContext(CreatorCatalogContext);
  if (!ctx) {
    throw new Error("useCreatorCatalog must be used within a CreatorCatalogProvider");
  }
  return ctx;
}
