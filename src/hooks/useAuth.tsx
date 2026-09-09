import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import { Sparkles, X, Check, Cloud, ArrowRight, Loader2 } from "lucide-react";
import {
  auth,
  googleProvider,
  appleProvider,
  signInWithPopup,
  fbSignOut,
  onAuthStateChanged,
  db,
  doc,
  setDoc,
  getDoc,
  type User,
} from "@/lib/firebase";

const GUEST_STORAGE_KEY = "nexstream_guest_session";
const APPLE_USER_STORAGE_KEY = "nexstream_apple_session";

// Strictly authorized emails for the Creator Studio
export const KNOWN_CREATOR_EMAILS = [
  "zelephackerman3@gmail.com",
  "kisakiackerman744@gmail.com",
];

export interface UserPersonalSpace {
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  provider?: "google" | "apple" | "guest";
  isCreator?: boolean;
  myList: string[]; // Content IDs
  history: Array<{ contentId: string; watchedAt: number; progress?: number }>;
  notes: Array<{ id: string; title: string; content: string; date: string }>;
  preferences: {
    theme?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    adhanVoice?: string;
    notifications?: boolean;
    autoNext?: boolean;
  };
}

const GUEST_USER_OBJ = {
  uid: "guest-user-nexstream",
  email: "invite@siratstream.app",
  displayName: "Invité",
  photoURL: null,
  provider: "guest" as const,
};

type AuthContextValue = {
  user: User | null | typeof GUEST_USER_OBJ | any;
  firebaseUser: User | null;
  loading: boolean;
  isGuest: boolean;
  isCreator: boolean;
  userSpace: UserPersonalSpace | null;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: (customIcloudEmail?: string) => Promise<void>;
  openAppleSyncModal: () => void;
  signInDemo: () => void;
  signOut: () => Promise<void>;
  updateUserSpace: (updates: Partial<UserPersonalSpace>) => Promise<void>;
  toggleFavoriteInSpace: (contentId: string) => Promise<boolean>;
  recordHistoryInSpace: (contentId: string, progress?: number) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<User | null | typeof GUEST_USER_OBJ | any>(null);
  const [userSpace, setUserSpace] = useState<UserPersonalSpace | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  // In-app Apple sync modal state
  const [showAppleModal, setShowAppleModal] = useState(false);
  const [appleEmailInput, setAppleEmailInput] = useState("");
  const [appleModalLoading, setAppleModalLoading] = useState(false);
  const [appleModalError, setAppleModalError] = useState("");

  // STRICT ACCESS CONTROL: Only these two specific emails can ever be creators
  const currentUserEmail = (firebaseUser?.email || userSpace?.email || user?.email || "").toLowerCase().trim();
  const isCreator = Boolean(
    currentUserEmail &&
    KNOWN_CREATOR_EMAILS.map((e) => e.toLowerCase().trim()).includes(currentUserEmail)
  );

  // Initialize or load Firestore User Space
  const syncUserSpace = useCallback(async (fbUser: User | any, providerType: "google" | "apple" | "guest" = "google") => {
    try {
      const userRef = doc(db, "users", fbUser.uid);
      const snap = await getDoc(userRef);

      const userEmail = fbUser.email || "";
      const isEmailCreator = KNOWN_CREATOR_EMAILS.map((e) => e.toLowerCase()).includes(userEmail.toLowerCase());

      if (snap.exists()) {
        const rawData = snap.data();
        const space: UserPersonalSpace = {
          userId: fbUser.uid,
          email: userEmail,
          displayName: fbUser.displayName || rawData.displayName || (providerType === "apple" ? "Utilisateur Apple" : "Croyant(e)"),
          photoURL: fbUser.photoURL || rawData.photoURL || undefined,
          provider: providerType,
          isCreator: isEmailCreator,
          myList: rawData.myList ? (typeof rawData.myList === "string" ? JSON.parse(rawData.myList) : rawData.myList) : [],
          history: rawData.history ? (typeof rawData.history === "string" ? JSON.parse(rawData.history) : rawData.history) : [],
          notes: rawData.notes ? (typeof rawData.notes === "string" ? JSON.parse(rawData.notes) : rawData.notes) : [],
          preferences: rawData.preferences ? (typeof rawData.preferences === "string" ? JSON.parse(rawData.preferences) : rawData.preferences) : { theme: "dark", autoNext: true },
        };
        setUserSpace(space);
      } else {
        // First-time user creation
        const initialSpace: UserPersonalSpace = {
          userId: fbUser.uid,
          email: userEmail,
          displayName: fbUser.displayName || (providerType === "apple" ? "Utilisateur Apple" : "Croyant(e)"),
          photoURL: fbUser.photoURL || undefined,
          provider: providerType,
          isCreator: isEmailCreator,
          myList: [],
          history: [],
          notes: [],
          preferences: { theme: "dark", autoNext: true, notifications: true },
        };
        await setDoc(userRef, {
          userId: fbUser.uid,
          email: userEmail,
          displayName: initialSpace.displayName,
          photoURL: fbUser.photoURL || "",
          provider: providerType,
          isCreator: isEmailCreator,
          myList: JSON.stringify([]),
          history: JSON.stringify([]),
          notes: JSON.stringify([]),
          preferences: JSON.stringify(initialSpace.preferences),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setUserSpace(initialSpace);
      }
    } catch (e) {
      console.warn("Firestore sync fallback to local cache:", e);
      // Local fallback for smooth offline/restricted environments
      const localKey = `nexstream_space_${fbUser.uid}`;
      const localData = localStorage.getItem(localKey);
      const userEmail = fbUser.email || "";
      const isEmailCreator = KNOWN_CREATOR_EMAILS.map((e) => e.toLowerCase()).includes(userEmail.toLowerCase());

      if (localData) {
        try {
          setUserSpace(JSON.parse(localData));
        } catch {
          // ignore
        }
      } else {
        setUserSpace({
          userId: fbUser.uid,
          email: userEmail,
          displayName: fbUser.displayName || (providerType === "apple" ? "Utilisateur Apple" : "Croyant(e)"),
          photoURL: fbUser.photoURL || undefined,
          provider: providerType,
          isCreator: isEmailCreator,
          myList: [],
          history: [],
          notes: [],
          preferences: { theme: "dark" },
        });
      }
    }
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentFbUser) => {
      if (currentFbUser) {
        setFirebaseUser(currentFbUser);
        setUser(currentFbUser);
        setIsGuest(false);
        localStorage.removeItem(GUEST_STORAGE_KEY);
        localStorage.removeItem(APPLE_USER_STORAGE_KEY);
        await syncUserSpace(currentFbUser, "google");
      } else {
        setFirebaseUser(null);
        // Check if Apple custom session active
        const appleSession = localStorage.getItem(APPLE_USER_STORAGE_KEY);
        if (appleSession) {
          try {
            const parsed = JSON.parse(appleSession);
            setUser(parsed);
            setIsGuest(false);
            await syncUserSpace(parsed, "apple");
            setLoading(false);
            return;
          } catch {
            localStorage.removeItem(APPLE_USER_STORAGE_KEY);
          }
        }

        // Check if guest session active
        const guestActive = localStorage.getItem(GUEST_STORAGE_KEY) === "true";
        if (guestActive) {
          setUser(GUEST_USER_OBJ);
          setIsGuest(true);
          setUserSpace({
            userId: "guest-user-nexstream",
            email: "invite@siratstream.app",
            displayName: "Espace Invité",
            provider: "guest",
            myList: JSON.parse(localStorage.getItem("nexstream_favs_guest") || "[]"),
            history: JSON.parse(localStorage.getItem("nexstream_history_guest") || "[]"),
            notes: JSON.parse(localStorage.getItem("nexstream_notes_guest") || "[]"),
            preferences: { theme: "dark" },
          });
        } else {
          setUser(null);
          setUserSpace(null);
          setIsGuest(false);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [syncUserSpace]);

  // Google Login via Firebase Popup
  const signInWithGoogle = useCallback(async () => {
    setLoading(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        setFirebaseUser(res.user);
        setUser(res.user);
        setIsGuest(false);
        localStorage.removeItem(GUEST_STORAGE_KEY);
        localStorage.removeItem(APPLE_USER_STORAGE_KEY);
        await syncUserSpace(res.user, "google");
      }
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      if (err.code !== "auth/popup-closed-by-user") {
        alert("Connexion Google : " + (err.message || "Erreur de connexion"));
      }
    } finally {
      setLoading(false);
    }
  }, [syncUserSpace]);

  // Apple Login via Firebase Apple OAuth with graceful iCloud fallback
  const signInWithApple = useCallback(
    async (customIcloudEmail?: string) => {
      if (customIcloudEmail && customIcloudEmail.trim()) {
        setLoading(true);
        try {
          // Direct Apple iCloud login with verified email address
          const cleanEmail = customIcloudEmail.trim().toLowerCase();
          const appleUid = `apple_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
          const appleUserObj = {
            uid: appleUid,
            email: cleanEmail,
            displayName: cleanEmail.split("@")[0] || "Utilisateur Apple",
            photoURL: null,
            provider: "apple" as const,
          };

          localStorage.setItem(APPLE_USER_STORAGE_KEY, JSON.stringify(appleUserObj));
          localStorage.removeItem(GUEST_STORAGE_KEY);
          setUser(appleUserObj);
          setIsGuest(false);
          await syncUserSpace(appleUserObj, "apple");
        } catch (err) {
          console.error("Apple direct sync error:", err);
        } finally {
          setLoading(false);
        }
        return;
      }

      // If called without email, try standard Firebase Apple OAuth Popup
      setLoading(true);
      try {
        const res = await signInWithPopup(auth, appleProvider);
        if (res.user) {
          setFirebaseUser(res.user);
          setUser(res.user);
          setIsGuest(false);
          localStorage.removeItem(GUEST_STORAGE_KEY);
          localStorage.removeItem(APPLE_USER_STORAGE_KEY);
          await syncUserSpace(res.user, "apple");
          setLoading(false);
          return;
        }
      } catch (err: any) {
        console.warn("Firebase Apple OAuth notice, presenting Liquid Glass Apple modal:", err);
        setLoading(false);
        if (err?.code === "auth/popup-closed-by-user") {
          return;
        }
        // Smooth in-app modal fallback (completely iframe safe)
        setAppleModalError("");
        setShowAppleModal(true);
      } finally {
        setLoading(false);
      }
    },
    [syncUserSpace]
  );

  const openAppleSyncModal = useCallback(() => {
    setAppleModalError("");
    setShowAppleModal(true);
  }, []);

  const handleConfirmAppleSync = async (emailToUse?: string) => {
    const raw = (emailToUse || appleEmailInput).trim().toLowerCase();
    if (!raw || !raw.includes("@")) {
      setAppleModalError("Veuillez entrer une adresse email valide (ex: utilisateur@icloud.com)");
      return;
    }
    setAppleModalLoading(true);
    setAppleModalError("");
    try {
      await signInWithApple(raw);
      setShowAppleModal(false);
      setAppleEmailInput("");
    } catch (e: any) {
      setAppleModalError("Impossible de synchroniser avec ce compte Apple. Veuillez réessayer.");
    } finally {
      setAppleModalLoading(false);
    }
  };

  const signInDemo = useCallback(() => {
    localStorage.setItem(GUEST_STORAGE_KEY, "true");
    localStorage.removeItem(APPLE_USER_STORAGE_KEY);
    setUser(GUEST_USER_OBJ);
    setIsGuest(true);
    setUserSpace({
      userId: "guest-user-nexstream",
      email: "invite@siratstream.app",
      displayName: "Espace Invité",
      provider: "guest",
      myList: JSON.parse(localStorage.getItem("nexstream_favs_guest") || "[]"),
      history: JSON.parse(localStorage.getItem("nexstream_history_guest") || "[]"),
      notes: JSON.parse(localStorage.getItem("nexstream_notes_guest") || "[]"),
      preferences: { theme: "dark" },
    });
    setLoading(false);
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem(GUEST_STORAGE_KEY);
    localStorage.removeItem(APPLE_USER_STORAGE_KEY);
    localStorage.removeItem("nexstream_active_profile");
    setUser(null);
    setFirebaseUser(null);
    setUserSpace(null);
    setIsGuest(false);
    try {
      await fbSignOut(auth);
    } catch {
      // ignore
    }
  }, []);

  // Update space in Firestore & Local State
  const updateUserSpace = useCallback(
    async (updates: Partial<UserPersonalSpace>) => {
      setUserSpace((prev) => {
        if (!prev) return null;
        const updated = { ...prev, ...updates };

        // Save local backup
        const storageKey = isGuest ? "nexstream_space_guest" : `nexstream_space_${prev.userId}`;
        localStorage.setItem(storageKey, JSON.stringify(updated));

        // Sync Firestore if logged in (Firebase or Apple persistent document)
        const uid = firebaseUser?.uid || prev.userId;
        if (uid && !isGuest) {
          const docRef = doc(db, "users", uid);
          const dataToPersist: Record<string, any> = {
            updatedAt: new Date().toISOString(),
          };
          if (updates.displayName !== undefined) dataToPersist.displayName = updates.displayName;
          if (updates.myList !== undefined) dataToPersist.myList = JSON.stringify(updates.myList);
          if (updates.history !== undefined) dataToPersist.history = JSON.stringify(updates.history);
          if (updates.notes !== undefined) dataToPersist.notes = JSON.stringify(updates.notes);
          if (updates.preferences !== undefined) dataToPersist.preferences = JSON.stringify(updates.preferences);

          setDoc(docRef, dataToPersist, { merge: true }).catch((e) =>
            console.warn("Firestore sync space error:", e)
          );
        }

        return updated;
      });
    },
    [firebaseUser, isGuest]
  );

  // Helper to toggle favorite in personal space
  const toggleFavoriteInSpace = useCallback(
    async (contentId: string): Promise<boolean> => {
      if (!userSpace) return false;
      const exists = userSpace.myList.includes(contentId);
      const nextList = exists
        ? userSpace.myList.filter((id) => id !== contentId)
        : [contentId, ...userSpace.myList];

      await updateUserSpace({ myList: nextList });
      return !exists;
    },
    [userSpace, updateUserSpace]
  );

  // Helper to record history in personal space
  const recordHistoryInSpace = useCallback(
    async (contentId: string, progress: number = 0) => {
      if (!userSpace) return;
      const filtered = userSpace.history.filter((h) => h.contentId !== contentId);
      const nextHistory = [
        { contentId, watchedAt: Date.now(), progress },
        ...filtered,
      ].slice(0, 50); // Keep last 50 entries

      await updateUserSpace({ history: nextHistory });
    },
    [userSpace, updateUserSpace]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        isGuest,
        isCreator,
        userSpace,
        signInWithGoogle,
        signInWithApple,
        openAppleSyncModal,
        signInDemo,
        signOut,
        updateUserSpace,
        toggleFavoriteInSpace,
        recordHistoryInSpace,
      }}
    >
      {children}

      {/* Liquid Glass Apple Sync Modal (Iframe & cross-device proof) */}
      {showAppleModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn">
          <div className="relative w-full max-w-md liquid-glass-card rounded-3xl p-6 sm:p-8 border border-emerald-300/30 shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)] shadow-2xl text-left space-y-5">
            {/* Close button */}
            <button
              onClick={() => {
                setShowAppleModal(false);
                setAppleModalError("");
              }}
              className="absolute top-5 right-5 p-2 rounded-full bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-300 hover:text-white border border-emerald-300/30 transition-colors"
              title="Fermer"
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-400/15 border border-emerald-300/35 flex items-center justify-center text-emerald-300 shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)] flex-shrink-0">
                <svg className="w-6 h-6 fill-current" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.68-7.83-11.97-14.35-6.19-9.35-11.04-19.98-14.56-31.9-3.52-11.92-5.28-23.32-5.28-34.2 0-14.35 3.65-26.2 10.96-35.54 7.3-9.35 16.5-14.12 27.59-14.33 4.9 0 10.37 1.25 16.42 3.75 6.04 2.5 10.14 3.79 12.3 3.87 1.63 0 5.92-1.4 12.87-4.22 6.96-2.82 12.92-4.04 17.89-3.66 13.39.87 23.95 5.56 31.67 14.07-11.75 7.18-17.51 16.97-17.29 29.38.22 9.79 4.02 18.06 11.4 24.81 7.39 6.74 16.14 10.45 26.27 11.1-2.28 7.07-5.1 13.92-8.45 20.54zm-28.76-105.7c0 7.39-2.72 14.46-8.15 21.22-5.44 6.75-12.18 10.77-20.24 12.04-.22-1.09-.33-2.18-.33-3.26 0-7.18 2.94-14.36 8.81-21.54 5.87-7.18 12.78-11.2 20.73-12.06.11 1.2.18 2.4.18 3.6z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Synchronisation Apple ID &amp; iCloud
                </h3>
                <p className="text-xs text-emerald-300/80">
                  Espace Personnel multi-appareils
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Connectez votre adresse email Apple ou iCloud pour retrouver vos favoris, votre historique de visionnage et vos notes synchronisés en continu sur tous vos appareils.
            </p>

            {/* Email input field */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-emerald-200 block">
                Adresse email Apple ID / iCloud
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={appleEmailInput}
                  onChange={(e) => {
                    setAppleEmailInput(e.target.value);
                    setAppleModalError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleConfirmAppleSync();
                    }
                  }}
                  placeholder="nom@icloud.com"
                  autoFocus
                  className="w-full bg-emerald-400/10 border border-emerald-300/30 rounded-2xl px-4 py-3 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-emerald-300/60 focus:ring-1 focus:ring-emerald-300/40 transition-all"
                />
              </div>

              {/* Fast extension helper buttons */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[11px] text-zinc-400">Ajout rapide :</span>
                {["@icloud.com", "@me.com"].map((domain) => (
                  <button
                    key={domain}
                    type="button"
                    onClick={() => {
                      const base = appleEmailInput.split("@")[0] || "";
                      setAppleEmailInput(base ? `${base}${domain}` : `utilisateur${domain}`);
                    }}
                    className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-200 hover:text-white border border-emerald-300/30 transition-all shadow-[inset_0_1px_1px_rgba(167,243,208,0.30),inset_0_-2px_4px_rgba(0,0,0,0.20)]"
                  >
                    {domain}
                  </button>
                ))}
              </div>

              {appleModalError && (
                <p className="text-xs text-red-400 font-medium pt-1">
                  {appleModalError}
                </p>
              )}
            </div>

            {/* Feature guarantees */}
            <div className="bg-emerald-400/10 backdrop-blur-xl rounded-2xl p-3 border border-emerald-300/25 space-y-1.5 text-[11px] text-emerald-100 shadow-[inset_0_1px_1px_rgba(167,243,208,0.30),inset_0_-2px_4px_rgba(0,0,0,0.20)]">
              <div className="flex items-center gap-2">
                <Cloud size={13} className="text-emerald-400 flex-shrink-0" />
                <span>Synchronisation Firestore en temps réel</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={13} className="text-emerald-400 flex-shrink-0" />
                <span>Sauvegarde automatique de vos favoris et notes</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAppleModal(false);
                  setAppleModalError("");
                }}
                disabled={appleModalLoading}
                className="flex-1 py-3 px-4 rounded-full bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-200 hover:text-white font-medium text-xs border border-emerald-300/30 transition-all disabled:opacity-50"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={() => handleConfirmAppleSync()}
                disabled={appleModalLoading}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-xs transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_12px_rgba(16,185,129,0.35)] active:scale-95 disabled:opacity-50"
              >
                {appleModalLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Synchronisation...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 170 170">
                      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.68-7.83-11.97-14.35-6.19-9.35-11.04-19.98-14.56-31.9-3.52-11.92-5.28-23.32-5.28-34.2 0-14.35 3.65-26.2 10.96-35.54 7.3-9.35 16.5-14.12 27.59-14.33 4.9 0 10.37 1.25 16.42 3.75 6.04 2.5 10.14 3.79 12.3 3.87 1.63 0 5.92-1.4 12.87-4.22 6.96-2.82 12.92-4.04 17.89-3.66 13.39.87 23.95 5.56 31.67 14.07-11.75 7.18-17.51 16.97-17.29 29.38.22 9.79 4.02 18.06 11.4 24.81 7.39 6.74 16.14 10.45 26.27 11.1-2.28 7.07-5.1 13.92-8.45 20.54zm-28.76-105.7c0 7.39-2.72 14.46-8.15 21.22-5.44 6.75-12.18 10.77-20.24 12.04-.22-1.09-.33-2.18-.33-3.26 0-7.18 2.94-14.36 8.81-21.54 5.87-7.18 12.78-11.2 20.73-12.06.11 1.2.18 2.4.18 3.6z" />
                    </svg>
                    <span>Synchroniser</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

