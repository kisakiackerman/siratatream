import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import { supabase, type ViewerProfile } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_KEY = "nexstream_active_profile";
const LOCAL_PROFILES_PREFIX = "nexstream_local_profiles_";

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
  ) => Promise<{ error: string | null }>;
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

function getDefaultGuestProfile(userId: string): ViewerProfile {
  return {
    id: "guest-profile-principal",
    account_id: userId,
    name: "Invité",
    avatar_color: "#ef4444",
    is_kid: false,
    pin_code: null,
    avatar_icon: "film",
    favorite_categories: null,
    prayer_location: null,
    created_at: new Date().toISOString(),
  };
}

export function ViewerProfileProvider({ children }: { children: ReactNode }) {
  const { user, isGuest } = useAuth();
  const [profiles, setProfiles] = useState<ViewerProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<ViewerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getUserId = useCallback(() => {
    if (!user) return "";
    return (user as any).uid || (user as any).id || "guest-user";
  }, [user]);

  const getLocalProfiles = useCallback((userId: string): ViewerProfile[] => {
    try {
      const raw = localStorage.getItem(LOCAL_PROFILES_PREFIX + userId);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    const def = [getDefaultGuestProfile(userId)];
    localStorage.setItem(LOCAL_PROFILES_PREFIX + userId, JSON.stringify(def));
    return def;
  }, []);

  const saveLocalProfiles = useCallback((userId: string, profs: ViewerProfile[]) => {
    try {
      localStorage.setItem(LOCAL_PROFILES_PREFIX + userId, JSON.stringify(profs));
    } catch {
      // ignore
    }
  }, []);

  const fetchProfiles = useCallback(async () => {
    if (!user) {
      setProfiles([]);
      setActiveProfile(null);
      setLoading(false);
      return;
    }

    const uId = (user as any).uid || (user as any).id || "guest-user";

    // If guest mode, load directly from local storage
    if (isGuest || uId.startsWith("guest-")) {
      const local = getLocalProfiles(uId);
      setProfiles(local);
      const storedId = localStorage.getItem(STORAGE_KEY);
      const matched = storedId ? local.find((p) => p.id === storedId) : null;
      setActiveProfile(matched || local[0] || null);
      setLoading(false);
      return;
    }

    // Try fetching from Supabase
    try {
      const { data, error: sbError } = await supabase
        .from("viewer_profiles")
        .select("*")
        .eq("account_id", uId)
        .order("created_at", { ascending: true });

      if (sbError || !data) {
        console.warn("Supabase profiles query failed or unavailable, fallback to local profiles:", sbError?.message);
        const local = getLocalProfiles(uId);
        setProfiles(local);
        const storedId = localStorage.getItem(STORAGE_KEY);
        const matched = storedId ? local.find((p) => p.id === storedId) : null;
        setActiveProfile(matched || local[0] || null);
      } else if (data.length === 0) {
        // Create an initial default profile
        const newProf = getDefaultGuestProfile(uId);
        newProf.name = user.email?.split("@")[0] || "Principal";
        const { data: created } = await supabase
          .from("viewer_profiles")
          .insert({
            account_id: uId,
            name: newProf.name,
            avatar_color: newProf.avatar_color,
            is_kid: false,
          })
          .select()
          .maybeSingle();

        const profToUse = (created as ViewerProfile) || newProf;
        setProfiles([profToUse]);
        setActiveProfile(profToUse);
      } else {
        setProfiles(data);
        const storedId = localStorage.getItem(STORAGE_KEY);
        const matched = storedId ? data.find((p) => p.id === storedId) : null;
        setActiveProfile(matched || data[0] || null);
      }
    } catch {
      const local = getLocalProfiles(uId);
      setProfiles(local);
      setActiveProfile(local[0] || null);
    } finally {
      setLoading(false);
    }
  }, [user, isGuest, getLocalProfiles]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const selectProfile = useCallback((profile: ViewerProfile) => {
    localStorage.setItem(STORAGE_KEY, profile.id);
    setActiveProfile(profile);
  }, []);

  const clearActiveProfile = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setActiveProfile(null);
  }, []);

  const switchProfile = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setActiveProfile(null);
  }, []);

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

      const uId = (user as any).uid || (user as any).id || "guest-user";
      const newId = "profile-" + Date.now();
      const newProf: ViewerProfile = {
        id: newId,
        account_id: uId,
        name,
        avatar_color: color,
        is_kid: isKid,
        pin_code: pinCode || null,
        avatar_icon: avatarIcon || null,
        favorite_categories: favoriteCategories?.length ? favoriteCategories : null,
        prayer_location: null,
        created_at: new Date().toISOString(),
      };

      if (isGuest || uId.startsWith("guest-")) {
        const updated = [...profiles, newProf];
        setProfiles(updated);
        saveLocalProfiles(uId, updated);
        return { error: null };
      }

      try {
        const { data, error } = await supabase
          .from("viewer_profiles")
          .insert({
            account_id: uId,
            name,
            avatar_color: color,
            is_kid: isKid,
            avatar_icon: avatarIcon ?? null,
            favorite_categories: favoriteCategories?.length ? favoriteCategories : null,
          })
          .select()
          .maybeSingle();

        if (error) {
          // Fallback to local
          const updated = [...profiles, newProf];
          setProfiles(updated);
          saveLocalProfiles(uId, updated);
          return { error: null };
        }

        if (data && pinCode) {
          await supabase.rpc("set_viewer_profile_pin", {
            profile_id: data.id,
            pin: pinCode,
          });
        }

        if (data) {
          setProfiles((prev) => [...prev, data as ViewerProfile]);
        }
        return { error: null };
      } catch {
        const updated = [...profiles, newProf];
        setProfiles(updated);
        saveLocalProfiles(uId, updated);
        return { error: null };
      }
    },
    [user, isGuest, profiles, saveLocalProfiles]
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

      if (isGuest || uId.startsWith("guest-")) {
        applyLocal();
        return { error: null };
      }

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
    [user, isGuest, profiles, activeProfile, saveLocalProfiles]
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

      const uId = (user as any).uid || (user as any).id || "guest-user";
      const updated = profiles.filter((p) => p.id !== id);
      setProfiles(updated);
      saveLocalProfiles(uId, updated);

      if (activeProfile?.id === id) {
        localStorage.removeItem(STORAGE_KEY);
        setActiveProfile(updated[0] || null);
      }

      if (!isGuest && !uId.startsWith("guest-")) {
        try {
          await supabase.from("viewer_profiles").delete().eq("id", id);
        } catch {
          // ignore
        }
      }
      return { error: null };
    },
    [user, isGuest, profiles, activeProfile, saveLocalProfiles]
  );

  const refresh = useCallback(async () => {
    await fetchProfiles();
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
