import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import { supabase, isValidUuid, toSupabaseUuid, type ViewerProfile } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { getAccountStartingName } from "@/lib/accountName";

const LEGACY_STORAGE_KEY = "nexstream_active_profile";
const ACTIVE_PROFILE_PREFIX = "nexstream_active_profile_";
const LOCAL_PROFILES_PREFIX = "nexstream_local_profiles_";

const getProfileStorageKey = (userId: string) => `${ACTIVE_PROFILE_PREFIX}${userId}`;

export const AVATAR_COLORS = [
  "#ef4444",
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
];

type ViewerProfileContextValue = {
  profiles: ViewerProfile[];
  activeProfile: ViewerProfile | null;
  loading: boolean;
  error: string | null;
  selectProfile: (profile: ViewerProfile) => void;
  clearActiveProfile: () => void;
  switchProfile: () => void;
  createProfile: (
    name: string,
    color: string,
    isKid: boolean,
    pinCode?: string,
    avatarIcon?: string,
    favoriteCategories?: string[]
  ) => Promise<{ error: string | null; profile?: ViewerProfile }>;
  updateProfile: (
    id: string,
    updates: {
      name?: string;
      color?: string;
      isKid?: boolean;
      pinCode?: string;
      avatarIcon?: string;
      favoriteCategories?: string[];
      prayerLocation?: { lat: number; lng: number; city: string };
    }
  ) => Promise<{ error: string | null }>;
  verifyProfilePin: (id: string, pin: string) => Promise<{ valid: boolean; error: string | null }>;
  deleteProfile: (id: string) => Promise<{ error: string | null }>;
  refresh: () => Promise<void>;
};

const ViewerProfileContext = createContext<ViewerProfileContextValue | null>(null);

export function ViewerProfileProvider({ children }: { children: ReactNode }) {
  const { user, firebaseUser, userSpace, isGuest, isInvitationMode } = useAuth();
  const [profiles, setProfiles] = useState<ViewerProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<ViewerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = user ? ((user as any).uid || (user as any).id || "") : "";

  const isEphemeralGuest = useCallback(
    (uId: string) => isGuest || isInvitationMode || uId.startsWith("guest-"),
    [isGuest, isInvitationMode]
  );

  const writeStoredActiveProfileId = useCallback(
    (uId: string, profileId: string) => {
      if (!uId) return;
      try {
        if (isEphemeralGuest(uId)) {
          sessionStorage.setItem(getProfileStorageKey(uId), profileId);
        } else {
          localStorage.setItem(getProfileStorageKey(uId), profileId);
        }
      } catch {
        // ignore
      }
    },
    [isEphemeralGuest]
  );

  const removeStoredActiveProfileId = useCallback(
    (uId: string) => {
      if (!uId) return;
      try {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        localStorage.removeItem(getProfileStorageKey(uId));
        sessionStorage.removeItem(getProfileStorageKey(uId));
      } catch {
        // ignore
      }
    },
    []
  );

  const getLocalProfiles = useCallback(
    (userId: string): ViewerProfile[] => {
      const storage = isEphemeralGuest(userId) ? sessionStorage : localStorage;
      const sbId = toSupabaseUuid(userId);
      try {
        const raw = storage.getItem(LOCAL_PROFILES_PREFIX + userId);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed.filter(
              (p) => p && (p.account_id === userId || p.account_id === sbId)
            );
          }
        }
      } catch {
        // ignore
      }
      return [];
    },
    [isEphemeralGuest]
  );

  const saveLocalProfiles = useCallback(
    (userId: string, profs: ViewerProfile[]) => {
      const storage = isEphemeralGuest(userId) ? sessionStorage : localStorage;
      try {
        storage.setItem(LOCAL_PROFILES_PREFIX + userId, JSON.stringify(profs));
      } catch {
        // ignore
      }
    },
    [isEphemeralGuest]
  );

  const fetchProfiles = useCallback(async (resetActive = true) => {
    if (!user || !currentUserId) {
      setProfiles([]);
      setActiveProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setProfiles([]);
    if (resetActive) {
      removeStoredActiveProfileId(currentUserId);
      setActiveProfile(null);
    }
    const uId = currentUserId;

    // Guest / invitation mode: load local session profiles (empty on fresh invitation so user sees personalized creation step)
    if (isEphemeralGuest(uId)) {
      const local = getLocalProfiles(uId);
      setProfiles(local);
      if (resetActive) {
        setActiveProfile(null);
      }
      setLoading(false);
      return;
    }

    // Helper with strict timeout to prevent queries from hanging indefinitely
    const withTimeout = async <T,>(thenable: PromiseLike<T>, ms = 2500): Promise<T> => {
      return Promise.race([
        Promise.resolve(thenable),
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error("Supabase request timeout")), ms)
        ),
      ]);
    };

    // Try fetching from Supabase with timeout guard — never auto-insert or auto-select a default profile
    const sbAccountId = toSupabaseUuid(uId);
    try {
      const { data, error: sbError } = await withTimeout(
        supabase
          .from("viewer_profiles")
          .select("*")
          .eq("account_id", sbAccountId)
          .order("created_at", { ascending: true }),
        2500
      );

      const local = getLocalProfiles(uId);
      if (sbError || !data) {
        setProfiles(local);
      } else {
        const ownProfiles = (data as ViewerProfile[]).filter((p) => p.account_id === sbAccountId);
        const merged = [...ownProfiles];
        for (const lp of local) {
          if (!merged.some((sp) => sp.id === lp.id)) {
            merged.push(lp);
          }
        }
        setProfiles(merged);
        saveLocalProfiles(uId, merged);
      }
    } catch {
      const local = getLocalProfiles(uId);
      setProfiles(local);
    } finally {
      if (resetActive) {
        setActiveProfile(null);
      }
      setLoading(false);
    }
  }, [
    user,
    currentUserId,
    isEphemeralGuest,
    getLocalProfiles,
    removeStoredActiveProfileId,
    saveLocalProfiles,
  ]);

  useEffect(() => {
    void fetchProfiles(true);
  }, [fetchProfiles]);

  const selectProfile = useCallback(
    (profile: ViewerProfile) => {
      if (!currentUserId) return;
      writeStoredActiveProfileId(currentUserId, profile.id);
      setActiveProfile(profile);
    },
    [currentUserId, writeStoredActiveProfileId]
  );

  const clearActiveProfile = useCallback(() => {
    if (currentUserId) {
      removeStoredActiveProfileId(currentUserId);
    }
    setActiveProfile(null);
  }, [currentUserId, removeStoredActiveProfileId]);

  const switchProfile = useCallback(() => {
    if (currentUserId) {
      removeStoredActiveProfileId(currentUserId);
      const local = getLocalProfiles(currentUserId);
      if (local.length > 0) {
        setProfiles((prev) => (prev.length >= local.length ? prev : local));
      }
    }
    setActiveProfile(null);
  }, [currentUserId, removeStoredActiveProfileId, getLocalProfiles]);

  const createProfile = useCallback(
    async (
      name: string,
      color: string,
      isKid: boolean,
      pinCode?: string,
      avatarIcon?: string,
      favoriteCategories?: string[]
    ) => {
      if (!user) return { error: "Not authenticated" };

      const resolvedName = (
        name.trim() ||
        getAccountStartingName(firebaseUser || user, userSpace)
      ).slice(0, 32);
      if (!resolvedName) {
        return { error: "Veuillez saisir un nom pour votre profil." };
      }

      const uId = (user as any).uid || (user as any).id || "guest-user";
      const newId = "profile-" + Date.now();
      const newProf: ViewerProfile = {
        id: newId,
        account_id: uId,
        name: resolvedName,
        avatar_color: color,
        is_kid: isKid,
        pin_code: pinCode || null,
        avatar_icon: avatarIcon || null,
        favorite_categories: favoriteCategories?.length ? favoriteCategories : null,
        prayer_location: null,
        created_at: new Date().toISOString(),
      };

      if (isEphemeralGuest(uId)) {
        const updated = [...profiles, newProf];
        setProfiles(updated);
        saveLocalProfiles(uId, updated);
        return { error: null, profile: newProf };
      }

      const sbAccountId = toSupabaseUuid(uId);
      try {
        const { data, error } = await supabase
          .from("viewer_profiles")
          .insert({
            account_id: sbAccountId,
            name: resolvedName,
            avatar_color: color,
            is_kid: isKid,
            avatar_icon: avatarIcon ?? null,
            favorite_categories: favoriteCategories?.length ? favoriteCategories : null,
          })
          .select()
          .maybeSingle();

        if (error) {
          const updated = [...profiles, newProf];
          setProfiles(updated);
          saveLocalProfiles(uId, updated);
          return { error: null, profile: newProf };
        }

        if (data && pinCode && isValidUuid(data.id)) {
          await supabase.rpc("set_viewer_profile_pin", {
            profile_id: data.id,
            pin: pinCode,
          });
        }

        const createdProf = (data as ViewerProfile) || newProf;
        const updated = [...profiles, createdProf];
        setProfiles(updated);
        saveLocalProfiles(uId, updated);
        return { error: null, profile: createdProf };
      } catch {
        const updated = [...profiles, newProf];
        setProfiles(updated);
        saveLocalProfiles(uId, updated);
        return { error: null, profile: newProf };
      }
    },
    [user, firebaseUser, userSpace, isEphemeralGuest, profiles, saveLocalProfiles]
  );

  const updateProfile = useCallback(
    async (
      id: string,
      updates: {
        name?: string;
        color?: string;
        isKid?: boolean;
        pinCode?: string;
        avatarIcon?: string;
        favoriteCategories?: string[];
        prayerLocation?: { lat: number; lng: number; city: string };
      }
    ) => {
      if (!user) return { error: "Non connecté" };

      const uId = (user as any).uid || (user as any).id || "guest-user";

      // Local update helper
      const applyLocal = () => {
        const updated = profiles.map((p) => {
          if (p.id !== id) return p;
          return {
            ...p,
            name: updates.name ?? p.name,
            avatar_color: updates.color ?? p.avatar_color,
            is_kid: updates.isKid ?? p.is_kid,
            pin_code: updates.pinCode !== undefined ? updates.pinCode : p.pin_code,
            avatar_icon: updates.avatarIcon ?? p.avatar_icon,
            favorite_categories: updates.favoriteCategories ?? p.favorite_categories,
            prayer_location: updates.prayerLocation ?? p.prayer_location,
          };
        });
        setProfiles(updated);
        saveLocalProfiles(uId, updated);
        const match = updated.find((p) => p.id === id);
        if (match && activeProfile?.id === id) {
          setActiveProfile(match);
        }
      };

      if (isEphemeralGuest(uId) || !isValidUuid(id)) {
        applyLocal();
        return { error: null };
      }

      const sbAccountId = toSupabaseUuid(uId);
      try {
        const patch: Record<string, unknown> = {};
        if (updates.name !== undefined) patch.name = updates.name;
        if (updates.color !== undefined) patch.avatar_color = updates.color;
        if (updates.isKid !== undefined) patch.is_kid = updates.isKid;
        if (updates.avatarIcon !== undefined) patch.avatar_icon = updates.avatarIcon;
        if (updates.favoriteCategories !== undefined) patch.favorite_categories = updates.favoriteCategories;
        if (updates.prayerLocation !== undefined) patch.prayer_location = updates.prayerLocation;

        const { data, error } = await supabase
          .from("viewer_profiles")
          .update(patch)
          .eq("id", id)
          .eq("account_id", sbAccountId)
          .select()
          .maybeSingle();

        if (error) {
          applyLocal();
          return { error: null };
        }

        if (updates.pinCode !== undefined) {
          await supabase.rpc("set_viewer_profile_pin", {
            profile_id: id,
            pin: updates.pinCode,
          });
        }

        if (data) {
          setProfiles((prev) => prev.map((p) => (p.id === id ? (data as ViewerProfile) : p)));
          setActiveProfile((prev) => (prev?.id === id ? (data as ViewerProfile) : prev));
        }
        return { error: null };
      } catch {
        applyLocal();
        return { error: null };
      }
    },
    [user, isEphemeralGuest, profiles, activeProfile, saveLocalProfiles]
  );

  const verifyProfilePin = useCallback(
    async (id: string, pin: string) => {
      const prof = profiles.find((p) => p.id === id);
      if (prof) {
        if (!prof.pin_code || prof.pin_code === pin) {
          return { valid: true, error: null };
        }
        return { valid: false, error: "Code PIN incorrect" };
      }
      try {
        const { data, error } = await supabase.rpc("verify_viewer_profile_pin", {
          profile_id: id,
          pin,
        });
        return { valid: data === true, error: error?.message ?? null };
      } catch {
        return { valid: false, error: null };
      }
    },
    [profiles]
  );

  const deleteProfile = useCallback(
    async (id: string) => {
      if (!user) return { error: "Non connecté" };

      const uId = (user as any).uid || (user as any).id || "";
      if (!uId) return { error: "Non connecté" };
      const updated = profiles.filter((p) => p.id !== id);
      setProfiles(updated);
      saveLocalProfiles(uId, updated);

      if (activeProfile?.id === id) {
        removeStoredActiveProfileId(uId);
        setActiveProfile(null);
      }

      if (!isEphemeralGuest(uId) && isValidUuid(id)) {
        const sbAccountId = toSupabaseUuid(uId);
        try {
          await supabase
            .from("viewer_profiles")
            .delete()
            .eq("id", id)
            .eq("account_id", sbAccountId);
        } catch {
          // ignore
        }
      }
      return { error: null };
    },
    [user, isEphemeralGuest, profiles, activeProfile, saveLocalProfiles, removeStoredActiveProfileId]
  );

  const refresh = useCallback(async () => {
    await fetchProfiles(false);
  }, [fetchProfiles]);

  return (
    <ViewerProfileContext.Provider
      value={{
        profiles,
        activeProfile,
        loading,
        error,
        selectProfile,
        clearActiveProfile,
        switchProfile,
        createProfile,
        updateProfile,
        verifyProfilePin,
        deleteProfile,
        refresh,
      }}
    >
      {children}
    </ViewerProfileContext.Provider>
  );
}

export function useViewerProfile() {
  const ctx = useContext(ViewerProfileContext);
  if (!ctx) throw new Error("useViewerProfile must be used within ViewerProfileProvider");
  return ctx;
}
