import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import { Sparkles, X, Check, Cloud, ArrowRight, Loader2, Mail, Lock, Eye, EyeOff, CheckCircle2, ShieldCheck, KeyRound } from "lucide-react";
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
  db,
  doc,
  setDoc,
  getDoc,
  type User,
} from "@/lib/firebase";
import { autonomousAIGuardian } from "@/lib/autonomousAIGuardian";

const GUEST_STORAGE_KEY = "nexstream_guest_session";
const APPLE_USER_STORAGE_KEY = "nexstream_apple_session";
const GOOGLE_USER_STORAGE_KEY = "nexstream_google_session";
const EMAIL_USER_STORAGE_KEY = "nexstream_email_session";

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
  authError: string | null;
  clearAuthError: () => void;
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
  const [user, setUser] = useState<User | null | typeof GUEST_USER_OBJ | any>(null);
  const [userSpace, setUserSpace] = useState<UserPersonalSpace | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  // In-app Google sync modal state (for zero-error iframe & sandbox resilience)
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState("");
  const [googleModalLoading, setGoogleModalLoading] = useState(false);
  const [googleModalError, setGoogleModalError] = useState("");

  // In-app Apple sync modal state
  const [showAppleModal, setShowAppleModal] = useState(false);
  const [appleEmailInput, setAppleEmailInput] = useState("");
  const [appleModalLoading, setAppleModalLoading] = useState(false);
  const [appleModalError, setAppleModalError] = useState("");

  // In-app Email sync modal state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailModalInput, setEmailModalInput] = useState("");
  const [emailModalPasswordInput, setEmailModalPasswordInput] = useState("");
  const [emailModalMode, setEmailModalMode] = useState<"signin" | "signup">("signin");
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [emailModalLoading, setEmailModalLoading] = useState(false);
  const [emailModalError, setEmailModalError] = useState("");
  const [emailModalSuccess, setEmailModalSuccess] = useState("");

  // STRICT ACCESS CONTROL: Only these two specific emails can ever be creators
  const currentUserEmail = (firebaseUser?.email || userSpace?.email || user?.email || "").toLowerCase().trim();
  const isCreator = Boolean(
    currentUserEmail &&
    KNOWN_CREATOR_EMAILS.map((e) => e.toLowerCase().trim()).includes(currentUserEmail)
  );

  // Initialize or load Firestore User Space
  const syncUserSpace = useCallback(async (fbUser: User | any, providerType: "google" | "apple" | "guest" | "email" = "google") => {
    // Immediate local fallback space so user is never blocked while Firestore resolves
    const userEmail = fbUser.email || "";
    const isEmailCreator = KNOWN_CREATOR_EMAILS.map((e) => e.toLowerCase()).includes(userEmail.toLowerCase());
    const fallbackDisplayName = fbUser.displayName || (providerType === "apple" ? "Utilisateur Apple" : providerType === "email" ? (userEmail ? userEmail.split("@")[0] : "Utilisateur") : "Croyant(e)");
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
      preferences: { theme: "dark", autoNext: true, notifications: true },
    };

    // Try reading cached space first to avoid flashing
    try {
      const cached = localStorage.getItem(`nexstream_space_${fbUser.uid}`);
      if (cached) {
        setUserSpace(JSON.parse(cached));
      } else {
        setUserSpace(fallbackSpace);
      }
    } catch {
      setUserSpace(fallbackSpace);
    }

    // Informer le Gardien IA de la session active (pour la synchronisation globale multi-comptes)
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
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Firestore sync timeout")), 2500))
      ]);

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
          displayName: fbUser.displayName || (providerType === "apple" ? "Utilisateur Apple" : "Croyant(e)"),
          photoURL: fbUser.photoURL || undefined,
          provider: providerType,
          isCreator: isEmailCreator,
          myList: [],
          history: [],
          notes: [],
          preferences: { theme: "dark", autoNext: true, notifications: true },
        };
        // Fire and forget or timeout protected
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
            preferences: JSON.stringify(initialSpace.preferences),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
          new Promise<void>((resolve) => setTimeout(resolve, 2000))
        ]).catch((e) => console.warn("Background setDoc notice:", e));

        setUserSpace(initialSpace);
        try {
          localStorage.setItem(`nexstream_space_${fbUser.uid}`, JSON.stringify(initialSpace));
        } catch {
          // ignore
        }
      }
    } catch (e) {
      console.warn("Firestore sync fallback to local cache:", e);
      // Local fallback for smooth offline/restricted environments
      const localKey = `nexstream_space_${fbUser.uid}`;
      const localData = localStorage.getItem(localKey);

      if (localData) {
        try {
          setUserSpace(JSON.parse(localData));
        } catch {
          // ignore
        }
      } else {
        setUserSpace(fallbackSpace);
      }
    }
  }, []);

  // Listen to Firebase Auth state & handle redirect logins
  useEffect(() => {
    // Process redirect result if page was reloaded after signInWithRedirect
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          const googleUserObj = {
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName || result.user.email?.split("@")[0] || "Compte Google",
            photoURL: result.user.photoURL || null,
            provider: "google" as const,
          };
          localStorage.setItem(GOOGLE_USER_STORAGE_KEY, JSON.stringify(googleUserObj));
          localStorage.removeItem(GUEST_STORAGE_KEY);
          localStorage.removeItem(APPLE_USER_STORAGE_KEY);
          setFirebaseUser(result.user);
          setUser(result.user);
          setIsGuest(false);
          await syncUserSpace(result.user, "google");
        }
      })
      .catch((err) => {
        console.warn("Redirect result notice:", err);
      });

    const unsubscribe = onAuthStateChanged(auth, async (currentFbUser) => {
      try {
        if (currentFbUser) {
          const isEmail = currentFbUser.providerData?.some((p) => p.providerId === "password") ||
            localStorage.getItem(EMAIL_USER_STORAGE_KEY) !== null;
          const isApple = currentFbUser.providerData?.some((p) => p.providerId === "apple.com") ||
            localStorage.getItem(APPLE_USER_STORAGE_KEY) !== null;

          if (isEmail) {
            const emailUserObj = {
              uid: currentFbUser.uid,
              email: currentFbUser.email,
              displayName: currentFbUser.displayName || currentFbUser.email?.split("@")[0] || "Compte Email",
              photoURL: currentFbUser.photoURL || null,
              provider: "email" as const,
            };
            localStorage.setItem(EMAIL_USER_STORAGE_KEY, JSON.stringify(emailUserObj));
            localStorage.removeItem(GUEST_STORAGE_KEY);
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
            localStorage.removeItem(GUEST_STORAGE_KEY);
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
            localStorage.removeItem(GUEST_STORAGE_KEY);
            localStorage.removeItem(APPLE_USER_STORAGE_KEY);
            localStorage.removeItem(EMAIL_USER_STORAGE_KEY);
            setFirebaseUser(currentFbUser);
            setUser(currentFbUser);
            setIsGuest(false);
            await syncUserSpace(currentFbUser, "google");
          }
        } else {
          setFirebaseUser(null);
          // Clear any non-authenticated cached sessions
          localStorage.removeItem(GOOGLE_USER_STORAGE_KEY);
          localStorage.removeItem(APPLE_USER_STORAGE_KEY);
          localStorage.removeItem(EMAIL_USER_STORAGE_KEY);

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
            autonomousAIGuardian.updateClientContext({
              userId: "guest-user-nexstream",
              provider: "guest",
              isGuest: true,
            });
          } else {
            setUser(null);
            setUserSpace(null);
            setIsGuest(false);
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
          setFirebaseUser(res.user);
          setUser(res.user);
          setIsGuest(false);
          await syncUserSpace(res.user, "google");
          return;
        }
        throw new Error("Compte Google non reconnu.");
      } catch (err: any) {
        console.warn("Google sign-in notice:", err);
        if (err?.code === "auth/popup-closed-by-user") {
          setAuthError("Connexion Google annulée.");
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

  const handleConfirmGoogleSync = async () => {
    setShowGoogleModal(false);
    await signInWithGoogle();
  };

  // Google Login via Full-page Redirect (100% immune to popup blockers & 3rd-party cookie isolation)
  const signInWithGoogleRedirect = useCallback(async () => {
    setLoading(true);
    setAuthError(null);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err: any) {
      console.error("Google redirect sign-in error:", err);
      setAuthError("Le compte n'a pas été reconnu ou accepté par Google.");
      setLoading(false);
    }
  }, []);

  // Apple Login via Firebase Apple OAuth (strictly authenticated)
  const signInWithApple = useCallback(
    async () => {
      setLoading(true);
      setAuthError(null);
      try {
        const res = await signInWithPopup(auth, appleProvider);
        if (res.user) {
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
          setFirebaseUser(res.user);
          setUser(res.user);
          setIsGuest(false);
          await syncUserSpace(res.user, "apple");
          return;
        }
        throw new Error("Compte Apple non reconnu.");
      } catch (err: any) {
        console.warn("Firebase Apple OAuth notice:", err);
        if (err?.code === "auth/popup-closed-by-user") {
          setAuthError("Connexion Apple annulée.");
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

  const handleConfirmAppleSync = async () => {
    setShowAppleModal(false);
    await signInWithApple();
  };

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
        throw new Error("Le mot de passe ou l'adresse email est incorrect, ou le compte n'est pas encore enregistré dans Google.");
      }
      if (!password || password.length < 6) {
        throw new Error("Le mot de passe ou l'adresse email est incorrect, ou le compte n'est pas encore enregistré dans Google.");
      }

      setLoading(true);
      setAuthError(null);
      try {
        if (isSignUp) {
          // Inscription et enregistrement dans Google Firebase Authentication
          try {
            const res = await createUserWithEmailAndPassword(auth, cleanEmail, password);
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
            setFirebaseUser(res.user);
            setUser(res.user);
            setIsGuest(false);
            await syncUserSpace(res.user, "email");
            return;
          } catch (createErr: any) {
            if (createErr?.code === "auth/email-already-in-use") {
              // Si le compte est déjà présent dans Google Firebase, tenter directement la connexion avec ce mot de passe
              try {
                const signInRes = await signInWithEmailAndPassword(auth, cleanEmail, password);
                const userObj = {
                  uid: signInRes.user.uid,
                  email: signInRes.user.email || cleanEmail,
                  displayName: signInRes.user.displayName || cleanEmail.split("@")[0] || "Utilisateur",
                  photoURL: signInRes.user.photoURL || null,
                  provider: "email" as const,
                };
                localStorage.setItem(EMAIL_USER_STORAGE_KEY, JSON.stringify(userObj));
                localStorage.removeItem(GUEST_STORAGE_KEY);
                localStorage.removeItem(APPLE_USER_STORAGE_KEY);
                localStorage.removeItem(GOOGLE_USER_STORAGE_KEY);
                setFirebaseUser(signInRes.user);
                setUser(signInRes.user);
                setIsGuest(false);
                await syncUserSpace(signInRes.user, "email");
                return;
              } catch (signInFallbackErr: any) {
                console.warn("Account exists but password mismatch:", signInFallbackErr?.message || signInFallbackErr);
                throw new Error("Le mot de passe ou l'adresse email est incorrect, ou le compte n'est pas encore enregistré dans Google.");
              }
            } else if (createErr?.code === "auth/weak-password") {
              throw new Error("Le mot de passe doit comporter au moins 6 caractères.");
            }
            throw new Error("Le mot de passe ou l'adresse email est incorrect, ou le compte n'est pas encore enregistré dans Google.");
          }
        } else {
          // Connexion avec email et mot de passe dans Google Firebase Authentication
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
            setFirebaseUser(res.user);
            setUser(res.user);
            setIsGuest(false);
            await syncUserSpace(res.user, "email");
            return;
          } catch (signInErr: any) {
            if (signInErr?.code === "auth/too-many-requests") {
              throw new Error("Trop de tentatives infructueuses. Veuillez patienter un instant.");
            }
            throw new Error("Le mot de passe ou l'adresse email est incorrect, ou le compte n'est pas encore enregistré dans Google.");
          }
        }
      } catch (err: any) {
        console.warn("Email auth notice:", err?.message || err);
        const msg = err?.message || "Le mot de passe ou l'adresse email est incorrect, ou le compte n'est pas encore enregistré dans Google.";
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

  const signInDemo = useCallback(() => {
    localStorage.setItem(GUEST_STORAGE_KEY, "true");
    localStorage.removeItem(APPLE_USER_STORAGE_KEY);
    localStorage.removeItem(EMAIL_USER_STORAGE_KEY);
    localStorage.removeItem(GOOGLE_USER_STORAGE_KEY);
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
    localStorage.removeItem(GOOGLE_USER_STORAGE_KEY);
    localStorage.removeItem(EMAIL_USER_STORAGE_KEY);
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
        authError,
        clearAuthError,
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

      {/* Liquid Glass Google Sync Modal (Zero-error Iframe & cross-device shield) */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn">
          <div className="relative w-full max-w-md liquid-glass-card rounded-3xl p-6 sm:p-8 border border-emerald-300/30 shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)] shadow-2xl text-left space-y-5">
            {/* Close button */}
            <button
              onClick={() => {
                setShowGoogleModal(false);
                setGoogleModalError("");
              }}
              className="absolute top-5 right-5 p-2 rounded-full bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-300 hover:text-white border border-emerald-300/30 transition-colors"
              title="Fermer"
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)] flex-shrink-0">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Connexion Google Sécurisée
                </h3>
                <p className="text-xs text-emerald-300/80">
                  Synchronisation sans interruption
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Connectez votre adresse Gmail pour retrouver vos profils, votre progression, vos favoris et vos notes synchronisés en continu sur tous vos appareils.
            </p>

            {/* Email input field */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-emerald-200 block">
                Adresse email Google / Gmail
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={googleEmailInput}
                  onChange={(e) => {
                    setGoogleEmailInput(e.target.value);
                    setGoogleModalError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleConfirmGoogleSync();
                    }
                  }}
                  placeholder="nom@gmail.com"
                  autoFocus
                  className="w-full bg-emerald-400/10 border border-emerald-300/30 rounded-2xl px-4 py-3 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-emerald-300/60 focus:ring-1 focus:ring-emerald-300/40 transition-all"
                />
              </div>

              {/* Fast extension helper buttons */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[11px] text-zinc-400">Ajout rapide :</span>
                {["@gmail.com", "@googlemail.com"].map((domain) => (
                  <button
                    key={domain}
                    type="button"
                    onClick={() => {
                      const base = googleEmailInput.split("@")[0] || "";
                      setGoogleEmailInput(base ? `${base}${domain}` : `utilisateur${domain}`);
                    }}
                    className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-200 hover:text-white border border-emerald-300/30 transition-all shadow-[inset_0_1px_1px_rgba(167,243,208,0.30),inset_0_-2px_4px_rgba(0,0,0,0.20)]"
                  >
                    {domain}
                  </button>
                ))}
              </div>

              {googleModalError && (
                <p className="text-xs text-red-400 font-medium pt-1">
                  {googleModalError}
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
                  setShowGoogleModal(false);
                  setGoogleModalError("");
                }}
                disabled={googleModalLoading}
                className="flex-1 py-3 px-4 rounded-full bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-200 hover:text-white font-medium text-xs border border-emerald-300/30 transition-all disabled:opacity-50"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={() => handleConfirmGoogleSync()}
                disabled={googleModalLoading}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-xs transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_12px_rgba(16,185,129,0.35)] active:scale-95 disabled:opacity-50"
              >
                {googleModalLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Synchronisation...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Synchroniser</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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

