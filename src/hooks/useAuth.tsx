import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import { Loader2, Mail, Lock, Eye, EyeOff, CheckCircle2, ShieldCheck, KeyRound, Cloud, X } from "lucide-react";
import {
  auth,
  googleProvider,
  appleProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  fbSignOut,
  onAuthStateChanged,
  getAdditionalUserInfo,
  db,
  doc,
  setDoc,
  getDoc,
  handleFirestoreError,
  OperationType,
  type User,
} from "@/lib/firebase";
import { autonomousAIGuardian } from "@/lib/autonomousAIGuardian";
import {
  type SharedLinkTarget,
  parseSharedLinkFromSearch,
  clearSharedLinkParamsFromUrl,
} from "@/lib/sharedLink";
import { getAccountStartingName } from "@/lib/accountName";

const GUEST_STORAGE_KEY = "nexstream_guest_session";
const APPLE_USER_STORAGE_KEY = "nexstream_apple_session";
const GOOGLE_USER_STORAGE_KEY = "nexstream_google_session";
const EMAIL_USER_STORAGE_KEY = "nexstream_email_session";
const INVITATION_SESSION_KEY = "sirat_invitation_uid";
const PENDING_SIGNUP_PROFILE_PREFIX = "sirat_pending_signup_profile_";
export const SIGNUP_PROFILE_REQUIRED_EVENT = "sirat-signup-profile-required";

export function markPendingSignupProfile(userId: string) {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(`${PENDING_SIGNUP_PROFILE_PREFIX}${userId}`, "1");
    localStorage.removeItem(`nexstream_active_profile_${userId}`);
    window.dispatchEvent(new CustomEvent(SIGNUP_PROFILE_REQUIRED_EVENT, { detail: { uid: userId } }));
  } catch {
    // ignore
  }
}

export function hasPendingSignupProfile(userId: string): boolean {
  if (typeof window === "undefined" || !userId) return false;
  try {
    return localStorage.getItem(`${PENDING_SIGNUP_PROFILE_PREFIX}${userId}`) === "1";
  } catch {
    return false;
  }
}

export function clearPendingSignupProfile(userId: string) {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.removeItem(`${PENDING_SIGNUP_PROFILE_PREFIX}${userId}`);
  } catch {
    // ignore
  }
}

function clearEphemeralProfileSelectionKeys() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("nexstream_active_profile");
    const sessionKeysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith("nexstream_active_profile_")) {
        sessionKeysToRemove.push(k);
      }
    }
    sessionKeysToRemove.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
}

function getOrCreateInvitationUid(): string {
  if (typeof window === "undefined") return "guest-invite-session";
  try {
    let uid = sessionStorage.getItem(INVITATION_SESSION_KEY);
    if (!uid || !uid.startsWith("guest-invite-")) {
      const rand =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID().slice(0, 12)
          : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      uid = `guest-invite-${rand}`;
      sessionStorage.setItem(INVITATION_SESSION_KEY, uid);
    }
    return uid;
  } catch {
    return `guest-invite-${Date.now().toString(36)}`;
  }
}

// Strictly authorized emails for the Creator Studio
export const KNOWN_CREATOR_EMAILS = [
  "zelephackerman3@gmail.com",
  "kisakiackerman744@gmail.com",
];

export interface UserSpiritualNote {
  id: string;
  title: string;
  content: string;
  date: string;
  contentId?: string;
  contentTitle?: string;
  verseReference?: string;
  verseText?: string;
  timestamp?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VideoFolder {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  createdAt: number;
  videoIds: string[];
}

export interface UserPersonalSpace {
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  provider?: "google" | "apple" | "guest" | "email";
  isCreator?: boolean;
  myList: string[]; // Content IDs
  history: Array<{ contentId: string; watchedAt: number; progress?: number }>;
  notes: UserSpiritualNote[];
  folders?: VideoFolder[];
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

type AuthContextValue = {
  user: User | any | null;
  firebaseUser: User | null;
  loading: boolean;
  isGuest: boolean;
  isInvitationMode: boolean;
  isCreator: boolean;
  userSpace: UserPersonalSpace | null;
  authError: string | null;
  pendingSharedTarget: SharedLinkTarget | null;
  sharedLinkAuthRequired: boolean;
  clearAuthError: () => void;
  clearPendingSharedTarget: () => void;
  confirmCurrentAccountForSharedLink: () => void;
  switchAccountForSharedLink: () => Promise<void>;
  enterInvitationMode: () => Promise<void>;
  signInWithGoogle: (customGoogleEmail?: string | React.MouseEvent<any> | any) => Promise<void>;
  signInWithGoogleRedirect: () => Promise<void>;
  signInWithApple: (customIcloudEmail?: string | React.MouseEvent<any> | any) => Promise<void>;
  signInWithEmail: (email: string, password?: string, isSignUp?: boolean, displayName?: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  resetPasswordWithEmail: (email: string) => Promise<void>;
  openGoogleSyncModal: () => void;
  openAppleSyncModal: () => void;
  openEmailSyncModal: () => void;
  signInDemo: () => void;
  signOut: () => Promise<void>;
  updateUserSpace: (updates: Partial<UserPersonalSpace>) => Promise<void>;
  toggleFavoriteInSpace: (contentId: string) => Promise<boolean>;
  recordHistoryInSpace: (contentId: string, progress?: number) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<User | any | null>(null);
  const [userSpace, setUserSpace] = useState<UserPersonalSpace | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [isInvitationMode, setIsInvitationMode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [pendingSharedTarget, setPendingSharedTarget] = useState<SharedLinkTarget | null>(() => {
    if (typeof window === "undefined") return null;
    return parseSharedLinkFromSearch(window.location.search);
  });
  const [sharedLinkAuthRequired, setSharedLinkAuthRequired] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return parseSharedLinkFromSearch(window.location.search) !== null;
  });

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const clearPendingSharedTarget = useCallback(() => {
    setPendingSharedTarget(null);
    setSharedLinkAuthRequired(false);
    clearSharedLinkParamsFromUrl();
  }, []);

  const confirmCurrentAccountForSharedLink = useCallback(() => {
    if (firebaseUser && !isGuest) {
      setSharedLinkAuthRequired(false);
    }
  }, [firebaseUser, isGuest]);

  // Listen for URL changes (popstate) pointing to a shared link so every shared link visit requires auth
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPopState = () => {
      const target = parseSharedLinkFromSearch(window.location.search);
      if (target) {
        setPendingSharedTarget(target);
        setSharedLinkAuthRequired(true);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // In-app Email sync modal state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailModalInput, setEmailModalInput] = useState("");
  const [emailModalPasswordInput, setEmailModalPasswordInput] = useState("");
  const [emailModalMode, setEmailModalMode] = useState<"signin" | "signup">("signin");
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [emailModalLoading, setEmailModalLoading] = useState(false);
  const [emailModalError, setEmailModalError] = useState("");
  const [emailModalSuccess, setEmailModalSuccess] = useState("");

  // STRICT ACCESS CONTROL: Only verified authenticated Firebase Creator emails ever receive Creator privileges
  const currentUserEmail =
    !isGuest && firebaseUser?.emailVerified
      ? (firebaseUser.email || "").toLowerCase().trim()
      : "";
  const isCreator = Boolean(
    currentUserEmail &&
      KNOWN_CREATOR_EMAILS.map((e) => e.toLowerCase().trim()).includes(currentUserEmail)
  );

  // Initialize or load Firestore User Space strictly isolated by verified fbUser.uid
  const syncUserSpace = useCallback(async (fbUser: User | any, providerType: "google" | "apple" | "guest" | "email" = "google") => {
    const userEmail = fbUser.email || "";
    const isEmailCreator =
      Boolean(fbUser.emailVerified) &&
      KNOWN_CREATOR_EMAILS.map((e) => e.toLowerCase()).includes(userEmail.toLowerCase());
    const accountStartName = getAccountStartingName(fbUser);
    const fallbackDisplayName =
      fbUser.displayName?.trim() ||
      accountStartName ||
      (providerType === "apple" ? "Utilisateur Apple" : "Utilisateur");
    const fallbackSpace: UserPersonalSpace = {
      userId: fbUser.uid,
      email: userEmail,
      displayName: fallbackDisplayName,
      photoURL: fbUser.photoURL || undefined,
      provider: providerType,
      isCreator: isEmailCreator,
      myList: [],
      history: [],
      notes: [],
      folders: [],
      preferences: { theme: "dark", autoNext: true, notifications: true },
    };

    // Immediately clear stale previous account state before reading this UID's cache
    setUserSpace(fallbackSpace);

    // Read cached space strictly matching fbUser.uid
    try {
      const cached = localStorage.getItem(`nexstream_space_${fbUser.uid}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.userId === fbUser.uid) {
          setUserSpace({
            ...fallbackSpace,
            ...parsed,
            userId: fbUser.uid,
            email: userEmail || parsed.email || "",
            provider: providerType,
            isCreator: isEmailCreator,
          });
        }
      }
    } catch {
      setUserSpace(fallbackSpace);
    }

    // Informer le Gardien IA de la session active
    autonomousAIGuardian.updateClientContext({
      userId: fbUser.uid,
      email: userEmail,
      provider: providerType,
      isGuest: false,
    });

    try {
      const userRef = doc(db, "users", fbUser.uid);

      // Strict 2.5s timeout for Firestore to prevent blocking the UI
      const snap = await Promise.race([
        getDoc(userRef),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Firestore sync timeout")), 2500)),
      ]);

      if (snap.exists()) {
        const rawData = snap.data();
        const space: UserPersonalSpace = {
          userId: fbUser.uid,
          email: userEmail,
          displayName: fbUser.displayName || rawData.displayName || accountStartName || (providerType === "apple" ? "Utilisateur Apple" : "Utilisateur"),
          photoURL: fbUser.photoURL || rawData.photoURL || undefined,
          provider: providerType,
          isCreator: isEmailCreator,
          myList: rawData.myList ? (typeof rawData.myList === "string" ? JSON.parse(rawData.myList) : rawData.myList) : [],
          history: rawData.history ? (typeof rawData.history === "string" ? JSON.parse(rawData.history) : rawData.history) : [],
          notes: rawData.notes ? (typeof rawData.notes === "string" ? JSON.parse(rawData.notes) : rawData.notes) : [],
          folders: rawData.folders ? (typeof rawData.folders === "string" ? JSON.parse(rawData.folders) : rawData.folders) : [],
          preferences: rawData.preferences ? (typeof rawData.preferences === "string" ? JSON.parse(rawData.preferences) : rawData.preferences) : { theme: "dark", autoNext: true },
        };
        setUserSpace(space);
        try {
          localStorage.setItem(`nexstream_space_${fbUser.uid}`, JSON.stringify(space));
        } catch {
          // ignore
        }
      } else {
        // First-time user creation
        const initialSpace: UserPersonalSpace = {
          userId: fbUser.uid,
          email: userEmail,
          displayName: fbUser.displayName || accountStartName || (providerType === "apple" ? "Utilisateur Apple" : "Utilisateur"),
          photoURL: fbUser.photoURL || undefined,
          provider: providerType,
          isCreator: isEmailCreator,
          myList: [],
          history: [],
          notes: [],
          folders: [],
          preferences: { theme: "dark", autoNext: true, notifications: true },
        };
        Promise.race([
          setDoc(userRef, {
            userId: fbUser.uid,
            email: userEmail,
            displayName: initialSpace.displayName,
            photoURL: fbUser.photoURL || "",
            provider: providerType,
            isCreator: isEmailCreator,
            myList: JSON.stringify([]),
            history: JSON.stringify([]),
            notes: JSON.stringify([]),
            folders: JSON.stringify([]),
            preferences: JSON.stringify(initialSpace.preferences),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
          new Promise<void>((resolve) => setTimeout(resolve, 2000)),
        ]).catch((e) => handleFirestoreError(e, OperationType.CREATE, `users/${fbUser.uid}`));

        setUserSpace(initialSpace);
        try {
          localStorage.setItem(`nexstream_space_${fbUser.uid}`, JSON.stringify(initialSpace));
        } catch {
          // ignore
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `users/${fbUser.uid}`);
      const localKey = `nexstream_space_${fbUser.uid}`;
      const localData = localStorage.getItem(localKey);

      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          if (parsed && parsed.userId === fbUser.uid) {
            setUserSpace({
              ...fallbackSpace,
              ...parsed,
              userId: fbUser.uid,
              isCreator: isEmailCreator,
            });
            return;
          }
        } catch {
          // ignore
        }
      }
      setUserSpace(fallbackSpace);
    }
  }, []);

  // Listen to Firebase Auth state & handle redirect logins safely
  useEffect(() => {
    // Clean stale OAuth redirect error parameters from URL without reloading
    if (typeof window !== "undefined") {
      try {
        const currentUrl = new URL(window.location.href);
        if (currentUrl.searchParams.has("error") || currentUrl.searchParams.has("updated")) {
          currentUrl.searchParams.delete("error");
          currentUrl.searchParams.delete("error_description");
          currentUrl.searchParams.delete("updated");
          window.history.replaceState({}, document.title, currentUrl.toString());
        }
      } catch {
        // ignore URL parse issues
      }
    }

    // Only check redirect result when not trapped in a cross-origin iframe
    const isInIframe = typeof window !== "undefined" && window.self !== window.top;
    if (!isInIframe) {
      getRedirectResult(auth)
        .then(async (result) => {
          if (result?.user) {
            if (getAdditionalUserInfo(result)?.isNewUser) {
              markPendingSignupProfile(result.user.uid);
            }
            localStorage.removeItem(GUEST_STORAGE_KEY);
            localStorage.removeItem(APPLE_USER_STORAGE_KEY);
            localStorage.removeItem(EMAIL_USER_STORAGE_KEY);
            try {
              sessionStorage.removeItem(INVITATION_SESSION_KEY);
            } catch {
              // ignore
            }
            const googleUserObj = {
              uid: result.user.uid,
              email: result.user.email,
              displayName: result.user.displayName || result.user.email?.split("@")[0] || "Compte Google",
              photoURL: result.user.photoURL || null,
              provider: "google" as const,
            };
            localStorage.setItem(GOOGLE_USER_STORAGE_KEY, JSON.stringify(googleUserObj));
            setFirebaseUser(result.user);
            setUser(result.user);
            setIsGuest(false);
            setIsInvitationMode(false);
            setSharedLinkAuthRequired(false);
            await syncUserSpace(result.user, "google");
          }
        })
        .catch(() => {
          // Ignore harmless redirect state mismatch/storage errors
        });
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentFbUser) => {
      try {
        if (currentFbUser) {
          // Strictly detect auth provider from Firebase providerData (never infer from localStorage)
          const isEmail = Boolean(
            currentFbUser.providerData?.some((p) => p.providerId === "password")
          );
          const isApple = Boolean(
            currentFbUser.providerData?.some((p) => p.providerId === "apple.com")
          );

          localStorage.removeItem(GUEST_STORAGE_KEY);
          try {
            sessionStorage.removeItem(INVITATION_SESSION_KEY);
          } catch {
            // ignore
          }
          setIsInvitationMode(false);

          if (isEmail) {
            const emailUserObj = {
              uid: currentFbUser.uid,
              email: currentFbUser.email,
              displayName: currentFbUser.displayName || currentFbUser.email?.split("@")[0] || "Compte Email",
              photoURL: currentFbUser.photoURL || null,
              provider: "email" as const,
            };
            localStorage.setItem(EMAIL_USER_STORAGE_KEY, JSON.stringify(emailUserObj));
            localStorage.removeItem(APPLE_USER_STORAGE_KEY);
            localStorage.removeItem(GOOGLE_USER_STORAGE_KEY);
            setFirebaseUser(currentFbUser);
            setUser(currentFbUser);
            setIsGuest(false);
            await syncUserSpace(currentFbUser, "email");
          } else if (isApple) {
            const appleUserObj = {
              uid: currentFbUser.uid,
              email: currentFbUser.email,
              displayName: currentFbUser.displayName || currentFbUser.email?.split("@")[0] || "Compte Apple",
              photoURL: currentFbUser.photoURL || null,
              provider: "apple" as const,
            };
            localStorage.setItem(APPLE_USER_STORAGE_KEY, JSON.stringify(appleUserObj));
            localStorage.removeItem(EMAIL_USER_STORAGE_KEY);
            localStorage.removeItem(GOOGLE_USER_STORAGE_KEY);
            setFirebaseUser(currentFbUser);
            setUser(currentFbUser);
            setIsGuest(false);
            await syncUserSpace(currentFbUser, "apple");
          } else {
            const googleUserObj = {
              uid: currentFbUser.uid,
              email: currentFbUser.email,
              displayName: currentFbUser.displayName || currentFbUser.email?.split("@")[0] || "Compte Google",
              photoURL: currentFbUser.photoURL || null,
              provider: "google" as const,
            };
            localStorage.setItem(GOOGLE_USER_STORAGE_KEY, JSON.stringify(googleUserObj));
            localStorage.removeItem(APPLE_USER_STORAGE_KEY);
            localStorage.removeItem(EMAIL_USER_STORAGE_KEY);
            setFirebaseUser(currentFbUser);
            setUser(currentFbUser);
            setIsGuest(false);
            await syncUserSpace(currentFbUser, "google");
          }
        } else {
          setFirebaseUser(null);
          localStorage.removeItem(GOOGLE_USER_STORAGE_KEY);
          localStorage.removeItem(APPLE_USER_STORAGE_KEY);
          localStorage.removeItem(EMAIL_USER_STORAGE_KEY);

          const hasSharedLinkInUrl =
            typeof window !== "undefined" &&
            parseSharedLinkFromSearch(window.location.search) !== null;

          // If visitor opened a shared link without Firebase auth, force explicit auth or Mode d'invitation
          if (hasSharedLinkInUrl) {
            localStorage.removeItem(GUEST_STORAGE_KEY);
            setUser(null);
            setUserSpace(null);
            setIsGuest(false);
            setIsInvitationMode(false);
            setSharedLinkAuthRequired(true);
            autonomousAIGuardian.updateClientContext({
              userId: "guest-anonymous",
              provider: "guest",
              isGuest: true,
            });
            return;
          }

          let activeInviteUid: string | null = null;
          try {
            const storedInvite = sessionStorage.getItem(INVITATION_SESSION_KEY);
            if (storedInvite && storedInvite.startsWith("guest-invite-")) {
              activeInviteUid = storedInvite;
            }
          } catch {
            // ignore
          }

          if (activeInviteUid) {
            const inviteSpaceKey = `nexstream_invitation_space_${activeInviteUid}`;
            let inviteSpace: UserPersonalSpace = {
              userId: activeInviteUid,
              email: "",
              displayName: "Mode d'invitation",
              provider: "guest",
              isCreator: false,
              myList: [],
              history: [],
              notes: [],
              folders: [],
              preferences: { theme: "dark" },
            };
            try {
              const savedInvite = sessionStorage.getItem(inviteSpaceKey);
              if (savedInvite) {
                const parsed = JSON.parse(savedInvite);
                if (parsed && parsed.userId === activeInviteUid) {
                  inviteSpace = { ...inviteSpace, ...parsed, isCreator: false };
                }
              }
            } catch {
              // ignore
            }
            setUser({
              uid: activeInviteUid,
              email: "",
              displayName: "Mode d'invitation",
              photoURL: null,
              provider: "guest" as const,
            });
            setIsGuest(true);
            setIsInvitationMode(true);
            setUserSpace(inviteSpace);
            autonomousAIGuardian.updateClientContext({
              userId: activeInviteUid,
              provider: "guest",
              isGuest: true,
            });
          } else {
            localStorage.removeItem(GUEST_STORAGE_KEY);
            setUser(null);
            setUserSpace(null);
            setIsGuest(false);
            setIsInvitationMode(false);
            autonomousAIGuardian.updateClientContext({
              userId: "guest-anonymous",
              provider: "guest",
              isGuest: true,
            });
          }
        }
      } catch (err) {
        console.error("Auth state transition error:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [syncUserSpace]);

  // Google Login via Firebase Popup
  const signInWithGoogle = useCallback(
    async () => {
      setLoading(true);
      setAuthError(null);
      try {
        const res = await signInWithPopup(auth, googleProvider);
        if (res.user) {
          if (getAdditionalUserInfo(res)?.isNewUser) {
            markPendingSignupProfile(res.user.uid);
          }
          const googleUserObj = {
            uid: res.user.uid,
            email: res.user.email,
            displayName: res.user.displayName || res.user.email?.split("@")[0] || "Compte Google",
            photoURL: res.user.photoURL || null,
            provider: "google" as const,
          };
          localStorage.setItem(GOOGLE_USER_STORAGE_KEY, JSON.stringify(googleUserObj));
          localStorage.removeItem(GUEST_STORAGE_KEY);
          localStorage.removeItem(APPLE_USER_STORAGE_KEY);
          localStorage.removeItem(EMAIL_USER_STORAGE_KEY);
          try {
            sessionStorage.removeItem(INVITATION_SESSION_KEY);
          } catch {
            // ignore
          }
          setFirebaseUser(res.user);
          setUser(res.user);
          setIsGuest(false);
          setIsInvitationMode(false);
          setSharedLinkAuthRequired(false);
          await syncUserSpace(res.user, "google");
          return;
        }
        throw new Error("Compte Google non reconnu.");
      } catch (err: any) {
        console.warn("Google sign-in notice:", err);
        const code = err?.code || "";
        if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
          setAuthError("Connexion Google annulée.");
        } else if (code === "auth/popup-blocked") {
          setAuthError("La fenêtre de connexion Google a été bloquée par votre navigateur. Veuillez autoriser les fenêtres contextuelles.");
        } else if (code === "auth/unauthorized-domain") {
          setAuthError("Ce domaine n'est pas encore autorisé dans Firebase Console → Authentication → Domaines autorisés.");
        } else {
          setAuthError("Le compte n'a pas été reconnu ou accepté par Google.");
        }
      } finally {
        setLoading(false);
      }
    },
    [syncUserSpace]
  );

  const openGoogleSyncModal = useCallback(() => {
    signInWithGoogle();
  }, [signInWithGoogle]);

  // Prefer popup inside iframes to prevent Google OAuth X-Frame-Options redirect errors
  const signInWithGoogleRedirect = useCallback(async () => {
    const isInIframe = typeof window !== "undefined" && window.self !== window.top;
    if (isInIframe) {
      return signInWithGoogle();
    }
    setLoading(true);
    setAuthError(null);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err: any) {
      console.error("Google redirect sign-in error:", err);
      setAuthError("Erreur de redirection Google. Veuillez utiliser la connexion par fenêtre contextuelle.");
      setLoading(false);
    }
  }, [signInWithGoogle]);

  // Apple Login via Firebase Apple OAuth (strictly authenticated)
  const signInWithApple = useCallback(
    async () => {
      setLoading(true);
      setAuthError(null);
      try {
        const res = await signInWithPopup(auth, appleProvider);
        if (res.user) {
          if (getAdditionalUserInfo(res)?.isNewUser) {
            markPendingSignupProfile(res.user.uid);
          }
          const appleUserObj = {
            uid: res.user.uid,
            email: res.user.email,
            displayName: res.user.displayName || res.user.email?.split("@")[0] || "Compte Apple",
            photoURL: res.user.photoURL || null,
            provider: "apple" as const,
          };
          localStorage.setItem(APPLE_USER_STORAGE_KEY, JSON.stringify(appleUserObj));
          localStorage.removeItem(GUEST_STORAGE_KEY);
          localStorage.removeItem(GOOGLE_USER_STORAGE_KEY);
          localStorage.removeItem(EMAIL_USER_STORAGE_KEY);
          try {
            sessionStorage.removeItem(INVITATION_SESSION_KEY);
          } catch {
            // ignore
          }
          setFirebaseUser(res.user);
          setUser(res.user);
          setIsGuest(false);
          setIsInvitationMode(false);
          setSharedLinkAuthRequired(false);
          await syncUserSpace(res.user, "apple");
          return;
        }
        throw new Error("Compte Apple non reconnu.");
      } catch (err: any) {
        console.warn("Firebase Apple OAuth notice:", err);
        const code = err?.code || "";
        if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
          setAuthError("Connexion Apple annulée.");
        } else if (code === "auth/popup-blocked") {
          setAuthError("La fenêtre de connexion Apple a été bloquée par votre navigateur.");
        } else if (code === "auth/unauthorized-domain") {
          setAuthError("Ce domaine n'est pas encore autorisé dans Firebase Console.");
        } else {
          setAuthError("Le compte n'a pas été reconnu ou accepté par Apple.");
        }
      } finally {
        setLoading(false);
      }
    },
    [syncUserSpace]
  );

  const openAppleSyncModal = useCallback(() => {
    signInWithApple();
  }, [signInWithApple]);

  // Email Login & Registration via Google Firebase Authentication with password
  const signInWithEmail = useCallback(
    async (
      emailToUse: string,
      password?: string,
      isSignUp?: boolean,
      customDisplayName?: string
    ) => {
      const cleanEmail = (emailToUse || "").trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
        throw new Error("Le mot de passe ou l'adresse email est incorrect, ou le compte n'est pas encore enregistré.");
      }
      if (!password || password.length < 6) {
        throw new Error("Le mot de passe doit comporter au moins 6 caractères.");
      }

      setLoading(true);
      setAuthError(null);
      try {
        // Ensure any previous session on this device is completely closed before signing into another account
        if (auth.currentUser && (auth.currentUser.email || "").toLowerCase() !== cleanEmail) {
          await fbSignOut(auth);
        }

        if (isSignUp) {
          try {
            const res = await createUserWithEmailAndPassword(auth, cleanEmail, password);
            markPendingSignupProfile(res.user.uid);
            if (customDisplayName || cleanEmail.split("@")[0]) {
              const name = customDisplayName || cleanEmail.split("@")[0];
              try {
                await updateProfile(res.user, { displayName: name });
              } catch {
                // Non-bloquant
              }
            }
            const userObj = {
              uid: res.user.uid,
              email: res.user.email || cleanEmail,
              displayName: res.user.displayName || cleanEmail.split("@")[0] || "Utilisateur",
              photoURL: res.user.photoURL || null,
              provider: "email" as const,
            };
            localStorage.setItem(EMAIL_USER_STORAGE_KEY, JSON.stringify(userObj));
            localStorage.removeItem(GUEST_STORAGE_KEY);
            localStorage.removeItem(APPLE_USER_STORAGE_KEY);
            localStorage.removeItem(GOOGLE_USER_STORAGE_KEY);
            try {
              sessionStorage.removeItem(INVITATION_SESSION_KEY);
            } catch {
              // ignore
            }
            setFirebaseUser(res.user);
            setUser(res.user);
            setIsGuest(false);
            setIsInvitationMode(false);
            setSharedLinkAuthRequired(false);
            await syncUserSpace(res.user, "email");
            return;
          } catch (createErr: any) {
            if (createErr?.code === "auth/email-already-in-use") {
              throw new Error("Un compte existe déjà avec cette adresse email. Veuillez vous connecter via l'onglet Connexion.");
            } else if (createErr?.code === "auth/weak-password") {
              throw new Error("Le mot de passe doit comporter au moins 6 caractères.");
            }
            throw new Error("Impossible de créer ce compte. Vérifiez votre adresse email et votre mot de passe.");
          }
        } else {
          try {
            const res = await signInWithEmailAndPassword(auth, cleanEmail, password);
            const userObj = {
              uid: res.user.uid,
              email: res.user.email || cleanEmail,
              displayName: res.user.displayName || cleanEmail.split("@")[0] || "Utilisateur",
              photoURL: res.user.photoURL || null,
              provider: "email" as const,
            };
            localStorage.setItem(EMAIL_USER_STORAGE_KEY, JSON.stringify(userObj));
            localStorage.removeItem(GUEST_STORAGE_KEY);
            localStorage.removeItem(APPLE_USER_STORAGE_KEY);
            localStorage.removeItem(GOOGLE_USER_STORAGE_KEY);
            try {
              sessionStorage.removeItem(INVITATION_SESSION_KEY);
            } catch {
              // ignore
            }
            setFirebaseUser(res.user);
            setUser(res.user);
            setIsGuest(false);
            setIsInvitationMode(false);
            setSharedLinkAuthRequired(false);
            await syncUserSpace(res.user, "email");
            return;
          } catch (signInErr: any) {
            if (signInErr?.code === "auth/too-many-requests") {
              throw new Error("Trop de tentatives infructueuses. Veuillez patienter un instant.");
            }
            throw new Error("Email ou mot de passe incorrect.");
          }
        }
      } catch (err: any) {
        console.warn("Email auth notice:", err?.message || err);
        const msg = err?.message || "Email ou mot de passe incorrect.";
        setAuthError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [syncUserSpace]
  );

  const registerWithEmail = useCallback(
    async (email: string, password: string, displayName?: string) => {
      return signInWithEmail(email, password, true, displayName);
    },
    [signInWithEmail]
  );

  const resetPasswordWithEmail = useCallback(async (emailToUse: string) => {
    const cleanEmail = (emailToUse || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      throw new Error("Veuillez saisir une adresse email valide.");
    }
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
    } catch (err: any) {
      if (err?.code === "auth/user-not-found") {
        throw new Error("Aucun compte Google n'est associé à cette adresse email.");
      } else if (err?.code === "auth/invalid-email") {
        throw new Error("Adresse email invalide.");
      }
      throw new Error("Impossible d'envoyer le lien de réinitialisation. Veuillez réessayer.");
    }
  }, []);

  const openEmailSyncModal = useCallback(() => {
    setEmailModalError("");
    setEmailModalSuccess("");
    setEmailModalPasswordInput("");
    setEmailModalMode("signin");
    setShowEmailModal(true);
  }, []);

  const handleConfirmEmailSync = async (emailToUse?: string) => {
    const raw = (emailToUse || emailModalInput).trim().toLowerCase();
    if (!raw || !raw.includes("@") || !raw.includes(".")) {
      setEmailModalError("Veuillez entrer une adresse email valide (ex: contact@exemple.com)");
      return;
    }
    if (!emailModalPasswordInput || emailModalPasswordInput.length < 6) {
      setEmailModalError("Le mot de passe ou l'adresse email est incorrect, ou le compte n'est pas encore enregistré dans Google.");
      return;
    }

    setEmailModalLoading(true);
    setEmailModalError("");
    setEmailModalSuccess("");
    try {
      await signInWithEmail(
        raw,
        emailModalPasswordInput || undefined,
        emailModalMode === "signup"
      );
      setShowEmailModal(false);
      setEmailModalInput("");
      setEmailModalPasswordInput("");
    } catch (e: any) {
      setEmailModalError(e?.message || "Impossible de synchroniser avec cette adresse email.");
    } finally {
      setEmailModalLoading(false);
    }
  };

  const handleSendResetPasswordInModal = async () => {
    const raw = emailModalInput.trim().toLowerCase();
    if (!raw || !raw.includes("@") || !raw.includes(".")) {
      setEmailModalError("Veuillez entrer votre adresse email pour recevoir le lien.");
      return;
    }
    setEmailModalLoading(true);
    setEmailModalError("");
    setEmailModalSuccess("");
    try {
      await resetPasswordWithEmail(raw);
      setEmailModalSuccess("Un email de réinitialisation a été envoyé à votre adresse.");
    } catch (e: any) {
      setEmailModalError(e?.message || "Impossible d'envoyer l'email de réinitialisation.");
    } finally {
      setEmailModalLoading(false);
    }
  };

  const enterInvitationMode = useCallback(async () => {
    setLoading(true);
    setAuthError(null);
    try {
      // Strictly sign out of any cached Firebase account so the guest can never enter someone else's account
      if (auth.currentUser) {
        await fbSignOut(auth);
      }
    } catch {
      // ignore sign-out network errors
    }

    localStorage.removeItem(GUEST_STORAGE_KEY);
    localStorage.removeItem(APPLE_USER_STORAGE_KEY);
    localStorage.removeItem(EMAIL_USER_STORAGE_KEY);
    localStorage.removeItem(GOOGLE_USER_STORAGE_KEY);

    const invUid = getOrCreateInvitationUid();
    const inviteSpaceKey = `nexstream_invitation_space_${invUid}`;
    let inviteSpace: UserPersonalSpace = {
      userId: invUid,
      email: "",
      displayName: "Mode d'invitation",
      provider: "guest",
      isCreator: false,
      myList: [],
      history: [],
      notes: [],
      folders: [],
      preferences: { theme: "dark" },
    };
    try {
      const saved = sessionStorage.getItem(inviteSpaceKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.userId === invUid) {
          inviteSpace = { ...inviteSpace, ...parsed, isCreator: false };
        }
      } else {
        sessionStorage.setItem(inviteSpaceKey, JSON.stringify(inviteSpace));
      }
    } catch {
      // ignore storage errors
    }

    setFirebaseUser(null);
    setUser({
      uid: invUid,
      email: "",
      displayName: "Mode d'invitation",
      photoURL: null,
      provider: "guest" as const,
    });
    setIsGuest(true);
    setIsInvitationMode(true);
    setUserSpace(inviteSpace);
    setSharedLinkAuthRequired(false);
    autonomousAIGuardian.updateClientContext({
      userId: invUid,
      provider: "guest",
      isGuest: true,
    });
    setLoading(false);
  }, []);

  const switchAccountForSharedLink = useCallback(async () => {
    localStorage.removeItem(GUEST_STORAGE_KEY);
    localStorage.removeItem(APPLE_USER_STORAGE_KEY);
    localStorage.removeItem(GOOGLE_USER_STORAGE_KEY);
    localStorage.removeItem(EMAIL_USER_STORAGE_KEY);
    clearEphemeralProfileSelectionKeys();
    try {
      sessionStorage.removeItem(INVITATION_SESSION_KEY);
    } catch {
      // ignore
    }
    setUser(null);
    setFirebaseUser(null);
    setUserSpace(null);
    setIsGuest(false);
    setIsInvitationMode(false);
    setSharedLinkAuthRequired(true);
    try {
      await fbSignOut(auth);
    } catch {
      // ignore
    }
  }, []);

  const signInDemo = useCallback(() => {
    void enterInvitationMode();
  }, [enterInvitationMode]);

  const signOut = useCallback(async () => {
    localStorage.removeItem(GUEST_STORAGE_KEY);
    localStorage.removeItem(APPLE_USER_STORAGE_KEY);
    localStorage.removeItem(GOOGLE_USER_STORAGE_KEY);
    localStorage.removeItem(EMAIL_USER_STORAGE_KEY);
    clearEphemeralProfileSelectionKeys();
    try {
      const invUid = sessionStorage.getItem(INVITATION_SESSION_KEY);
      if (invUid) {
        sessionStorage.removeItem(`nexstream_invitation_space_${invUid}`);
        sessionStorage.removeItem(`nexstream_local_profiles_${invUid}`);
      }
      sessionStorage.removeItem(INVITATION_SESSION_KEY);
    } catch {
      // ignore
    }
    setUser(null);
    setFirebaseUser(null);
    setUserSpace(null);
    setIsGuest(false);
    setIsInvitationMode(false);
    setSharedLinkAuthRequired(pendingSharedTarget !== null);
    try {
      await fbSignOut(auth);
    } catch {
      // ignore
    }
  }, [pendingSharedTarget]);

  // Update space in Firestore & Local State — strictly isolated per authenticated UID or ephemeral invitation session
  const updateUserSpace = useCallback(
    async (updates: Partial<UserPersonalSpace>) => {
      setUserSpace((prev) => {
        if (!prev) return null;
        const updated = { ...prev, ...updates };

        if (isGuest || isInvitationMode || prev.userId.startsWith("guest-")) {
          try {
            sessionStorage.setItem(`nexstream_invitation_space_${prev.userId}`, JSON.stringify(updated));
          } catch {
            // ignore
          }
          return updated;
        }

        // Only persist real account data when the Firebase UID strictly matches prev.userId
        if (!firebaseUser || prev.userId !== firebaseUser.uid) {
          return prev;
        }

        try {
          localStorage.setItem(`nexstream_space_${firebaseUser.uid}`, JSON.stringify(updated));
        } catch {
          // ignore
        }

        const docRef = doc(db, "users", firebaseUser.uid);
        const dataToPersist: Record<string, any> = {
          updatedAt: new Date().toISOString(),
        };
        if (updates.displayName !== undefined) dataToPersist.displayName = updates.displayName;
        if (updates.myList !== undefined) dataToPersist.myList = JSON.stringify(updates.myList);
        if (updates.history !== undefined) dataToPersist.history = JSON.stringify(updates.history);
        if (updates.notes !== undefined) dataToPersist.notes = JSON.stringify(updates.notes);
        if (updates.folders !== undefined) dataToPersist.folders = JSON.stringify(updates.folders);
        if (updates.preferences !== undefined) dataToPersist.preferences = JSON.stringify(updates.preferences);

        setDoc(docRef, dataToPersist, { merge: true }).catch((e) =>
          handleFirestoreError(e, OperationType.UPDATE, `users/${firebaseUser.uid}`)
        );

        return updated;
      });
    },
    [firebaseUser, isGuest, isInvitationMode]
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
        isInvitationMode,
        isCreator,
        userSpace,
        authError,
        pendingSharedTarget,
        sharedLinkAuthRequired,
        clearAuthError,
        clearPendingSharedTarget,
        confirmCurrentAccountForSharedLink,
        switchAccountForSharedLink,
        enterInvitationMode,
        signInWithGoogle,
        signInWithGoogleRedirect,
        signInWithApple,
        signInWithEmail,
        registerWithEmail,
        resetPasswordWithEmail,
        openGoogleSyncModal,
        openAppleSyncModal,
        openEmailSyncModal,
        signInDemo,
        signOut,
        updateUserSpace,
        toggleFavoriteInSpace,
        recordHistoryInSpace,
      }}
    >
      {children}


      {/* Liquid Glass Email / Password Google Auth Sync Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn">
          <div className="relative w-full max-w-md liquid-glass-card rounded-3xl p-6 sm:p-8 border border-emerald-300/30 shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)] shadow-2xl text-left space-y-4">
            {/* Close button */}
            <button
              onClick={() => {
                setShowEmailModal(false);
                setEmailModalError("");
                setEmailModalSuccess("");
              }}
              className="absolute top-5 right-5 p-2 rounded-full bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-300 hover:text-white border border-emerald-300/30 transition-colors"
              title="Fermer"
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-400/15 border border-emerald-300/35 flex items-center justify-center text-emerald-300 shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)] flex-shrink-0">
                <Mail size={22} className="text-emerald-300" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {emailModalMode === "signup" ? "Créer un compte sécurisé" : "Connexion par Email"}
                </h3>
                <p className="text-xs text-emerald-300/80">
                  Enregistré dans Google Firebase
                </p>
              </div>
            </div>

            {/* Mode switch tabs: Connexion vs Créer un compte */}
            <div className="grid grid-cols-2 p-1 bg-black/40 rounded-2xl border border-emerald-300/20">
              <button
                type="button"
                onClick={() => {
                  setEmailModalMode("signin");
                  setEmailModalError("");
                  setEmailModalSuccess("");
                }}
                className={`py-2 text-xs font-semibold rounded-xl transition-all ${
                  emailModalMode === "signin"
                    ? "bg-emerald-400/25 text-white border border-emerald-300/40 shadow-sm"
                    : "text-zinc-400 hover:text-emerald-200"
                }`}
              >
                Se connecter
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmailModalMode("signup");
                  setEmailModalError("");
                  setEmailModalSuccess("");
                }}
                className={`py-2 text-xs font-semibold rounded-xl transition-all ${
                  emailModalMode === "signup"
                    ? "bg-emerald-400/25 text-white border border-emerald-300/40 shadow-sm"
                    : "text-zinc-400 hover:text-emerald-200"
                }`}
              >
                Créer un compte
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              {emailModalMode === "signup"
                ? "Créez votre compte personnel avec votre mot de passe pour enregistrer et protéger vos données dans Google Firebase."
                : "Connectez-vous avec votre adresse email et votre mot de passe pour retrouver vos favoris, notes et historique."}
            </p>

            {/* Email input field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-emerald-200 block">
                Adresse email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={emailModalInput}
                  onChange={(e) => {
                    setEmailModalInput(e.target.value);
                    setEmailModalError("");
                  }}
                  placeholder="nom@exemple.com"
                  autoFocus
                  className="w-full bg-emerald-400/10 border border-emerald-300/30 rounded-2xl px-4 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-emerald-300/60 focus:ring-1 focus:ring-emerald-300/40 transition-all"
                />
              </div>
            </div>

            {/* Password input field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-emerald-200">
                  Mot de passe
                </label>
                {emailModalMode === "signin" && (
                  <button
                    type="button"
                    onClick={handleSendResetPasswordInModal}
                    className="text-[11px] text-emerald-300/80 hover:text-emerald-200 underline transition-colors"
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showModalPassword ? "text" : "password"}
                  value={emailModalPasswordInput}
                  onChange={(e) => {
                    setEmailModalPasswordInput(e.target.value);
                    setEmailModalError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleConfirmEmailSync();
                    }
                  }}
                  placeholder={emailModalMode === "signup" ? "Au moins 6 caractères" : "Votre mot de passe"}
                  className="w-full bg-emerald-400/10 border border-emerald-300/30 rounded-2xl pl-4 pr-11 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-emerald-300/60 focus:ring-1 focus:ring-emerald-300/40 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowModalPassword(!showModalPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-emerald-300 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showModalPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Success message */}
            {emailModalSuccess && (
              <div className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                <span>{emailModalSuccess}</span>
              </div>
            )}

            {/* Error message */}
            {emailModalError && (
              <p className="text-xs text-red-400 font-medium">
                {emailModalError}
              </p>
            )}

            {/* Google Authentication Protection Badge */}
            <div className="bg-emerald-400/10 backdrop-blur-xl rounded-2xl p-2.5 border border-emerald-300/25 space-y-1 text-[11px] text-emerald-100 shadow-[inset_0_1px_1px_rgba(167,243,208,0.30),inset_0_-2px_4px_rgba(0,0,0,0.20)]">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-400 flex-shrink-0" />
                <span>Compte et mot de passe protégés par Google Firebase</span>
              </div>
              <div className="flex items-center gap-2">
                <Cloud size={14} className="text-emerald-400 flex-shrink-0" />
                <span>Synchronisation multi-appareils de votre espace personnel</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowEmailModal(false);
                  setEmailModalError("");
                  setEmailModalSuccess("");
                }}
                disabled={emailModalLoading}
                className="flex-1 py-3 px-4 rounded-full bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-200 hover:text-white font-medium text-xs border border-emerald-300/30 transition-all disabled:opacity-50"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={() => handleConfirmEmailSync()}
                disabled={emailModalLoading}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-xs transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_12px_rgba(16,185,129,0.35)] active:scale-95 disabled:opacity-50"
              >
                {emailModalLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Traitement...</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={14} />
                    <span>
                      {emailModalMode === "signup" ? "Créer mon compte" : "Se connecter"}
                    </span>
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

