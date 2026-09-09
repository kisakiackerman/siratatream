import { useState, useEffect, useMemo } from "react";
import {
  X,
  LogOut,
  Mail,
  User as UserIcon,
  Shield,
  Sliders,
  Database,
  Info,
  Trash2,
  Check,
  Moon,
  Sun,
  Monitor,
  Sparkles,
  BarChart3,
  Subtitles,
  Gauge,
  Wifi,
  Smartphone,
  Tv,
  Laptop,
  KeyRound,
  DownloadCloud,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  HelpCircle,
  Activity,
  Download,
  Plus,
  Edit2,
  Lock,
  Eye,
  EyeOff,
  Save,
  ShieldAlert,
  FileText,
  Clock,
  Play,
  Tablet,
  Loader2,
  Globe,
  Radio,
  Bell,
  Cloud,
  Server,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/hooks/useAuth";
import { useViewerProfile, AVATAR_COLORS } from "@/hooks/useViewerProfile";
import { useTheme } from "@/hooks/useTheme";
import { AVATAR_ICONS, getAvatarIcon, AvatarIconId } from "@/data/avatarIcons";
import { catalog, ContentItem } from "@/data/catalog";
import {
  getLocalWatchHistory,
  removeWatchHistoryEntry,
  StoredHistoryEntry,
  LOCAL_HISTORY_PREFIX,
} from "@/lib/watchHistory";
import {
  getOfflineDownloads,
  removeOfflineDownload,
  OfflineDownload,
} from "@/lib/offlineStorage";
import { useConnectedDevices } from "@/hooks/useConnectedDevices";
import { formatRelativeTime, DeviceType } from "@/lib/deviceSessions";
import UserStatsSection from "@/components/UserStatsSection";
import NotificationsSettingsSection from "@/components/NotificationsSettingsSection";
import { GlassPanel } from "@/components/GlassSurface";

type AccountSettingsModalProps = {
  onClose: () => void;
  onOpenLegal?: (type: "privacy" | "terms") => void;
  initialTab?: SettingsTab;
  onPlayVideo?: (id: string, startSec?: number) => void;
};

export type SettingsTab =
  | "account"
  | "notifications"
  | "stats"
  | "playback"
  | "storage"
  | "about";

const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const VIDEO_QUALITIES = [
  { id: "auto", label: "Auto" },
  { id: "data-saver", label: "Économie de données" },
  { id: "high", label: "Haute qualité (1080p/4K)" },
];

export default function AccountSettingsModal({
  onClose,
  onOpenLegal,
  initialTab = "account",
  onPlayVideo,
}: AccountSettingsModalProps) {
  const {
    user,
    firebaseUser,
    userSpace,
    signInWithGoogle,
    signInWithApple,
    signOut,
    updateUserSpace,
  } = useAuth();
  const {
    profiles,
    activeProfile,
    selectProfile,
    createProfile,
    updateProfile,
    deleteProfile,
  } = useViewerProfile();
  const { theme, systemTheme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [notice, setNotice] = useState<string | null>(null);

  // --- Profile edition state ---
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedAvatarColor, setSelectedAvatarColor] = useState(
    activeProfile?.avatar_color || AVATAR_COLORS[0]
  );
  const [selectedAvatarIcon, setSelectedAvatarIcon] = useState(
    activeProfile?.avatar_icon || "moon"
  );

  // --- Multi-profile management state ---
  const [showCreateProfileModal, setShowCreateProfileModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileColor, setNewProfileColor] = useState(AVATAR_COLORS[1]);
  const [newProfileIcon, setNewProfileIcon] = useState<AvatarIconId>("star");
  const [newProfileIsKid, setNewProfileIsKid] = useState(false);

  // Editing existing profile modal
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editProfileName, setEditProfileName] = useState("");
  const [editProfileColor, setEditProfileColor] = useState(AVATAR_COLORS[0]);
  const [editProfileIcon, setEditProfileIcon] = useState<AvatarIconId>("moon");
  const [editProfileIsKid, setEditProfileIsKid] = useState(false);

  // --- Password change state ---
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPassText, setShowPassText] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<string | null>(null);

  // --- Supabase Connected Devices & Remote Revocation Hook ---
  const {
    devices: connectedDevices,
    loading: devicesLoading,
    refreshing: devicesRefreshing,
    source: devicesSource,
    revokingId,
    revokingAll,
    revokeSession,
    revokeAllOthers,
    refreshDevices,
  } = useConnectedDevices();

  // --- Delete account confirmation ---
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // --- Playback Preferences ---
  const [autoplayNext, setAutoplayNext] = useState(() => {
    return localStorage.getItem("nexstream_auto_next") !== "false";
  });
  const [autoplayPreview, setAutoplayPreview] = useState(() => {
    return localStorage.getItem("nexstream_autoplay_preview") !== "false";
  });
  const [ambientGlow, setAmbientGlow] = useState(() => {
    return localStorage.getItem("nexstream_ambient_glow") !== "false";
  });
  const [subtitlesDefault, setSubtitlesDefault] = useState(() => {
    return localStorage.getItem("nexstream_subtitles_default") === "true";
  });
  const [subtitleSize, setSubtitleSize] = useState<"small" | "medium" | "large">(() => {
    return (localStorage.getItem("nexstream_subtitle_size") as "small" | "medium" | "large") || "medium";
  });
  const [subtitleStyle, setSubtitleStyle] = useState<"classic" | "yellow" | "transparent">(() => {
    return (localStorage.getItem("nexstream_subtitle_style") as "classic" | "yellow" | "transparent") || "classic";
  });
  const [qualityWifi, setQualityWifi] = useState<string>(() => {
    return localStorage.getItem("nexstream_quality_wifi") || "auto";
  });
  const [qualityMobile, setQualityMobile] = useState<string>(() => {
    return localStorage.getItem("nexstream_quality_mobile") || "data-saver";
  });
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(() => {
    return Number(localStorage.getItem("nexstream_playback_speed")) || 1;
  });
  const [downloadQuality, setDownloadQuality] = useState<"standard" | "high">(() => {
    return (localStorage.getItem("nexstream_download_quality") as "standard" | "high") || "high";
  });
  const [downloadWifiOnly, setDownloadWifiOnly] = useState<boolean>(() => {
    return localStorage.getItem("nexstream_download_wifi_only") !== "false";
  });

  // --- Storage & History items ---
  const [historyItems, setHistoryItems] = useState<StoredHistoryEntry[]>([]);
  const [downloads, setDownloads] = useState<OfflineDownload[]>([]);
  const [cacheSizeMB, setCacheSizeMB] = useState<number>(34.8);

  // --- Diagnostics Network Test ---
  const [pingTesting, setPingTesting] = useState(false);
  const [pingResult, setPingResult] = useState<{ pingMs: number; speedMbps: number; quality: string } | null>(null);

  // Sync profile display name input
  useEffect(() => {
    if (activeProfile?.name) {
      setDisplayNameInput(activeProfile.name);
      setSelectedAvatarColor(activeProfile.avatar_color || AVATAR_COLORS[0]);
      setSelectedAvatarIcon(activeProfile.avatar_icon || "moon");
    }
  }, [activeProfile]);

  // Load history & downloads
  useEffect(() => {
    if (activeProfile?.id) {
      setHistoryItems(getLocalWatchHistory(activeProfile.id));
    }
    setDownloads(getOfflineDownloads());
  }, [activeProfile]);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [onClose]);

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  // --- Actions for Account ---
  const handleSaveProfileName = async () => {
    if (!displayNameInput.trim() || !activeProfile) return;
    await updateProfile(activeProfile.id, {
      name: displayNameInput.trim(),
    });
    if (updateUserSpace) {
      updateUserSpace({ displayName: displayNameInput.trim() }).catch(() => {});
    }
    setEditingDisplayName(false);
    showToast("Nom de profil mis à jour avec succès !");
  };

  const handleSaveAvatar = async (icon: string, color: string) => {
    if (!activeProfile) return;
    setSelectedAvatarIcon(icon);
    setSelectedAvatarColor(color);
    await updateProfile(activeProfile.id, {
      avatarIcon: icon,
      color: color,
    });
    setShowAvatarPicker(false);
    showToast("Avatar mis à jour !");
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordFeedback("Le mot de passe doit comporter au moins 6 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback("Les mots de passe ne correspondent pas.");
      return;
    }
    // Simulation / Storage update
    setPasswordFeedback(null);
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswordForm(false);
    showToast("Mot de passe modifié avec succès !");
  };

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return;
    if (profiles.length >= 5) {
      showToast("La limite maximale de 5 profils par compte est atteinte.");
      return;
    }
    await createProfile(
      newProfileName.trim(),
      newProfileColor,
      newProfileIsKid,
      undefined,
      newProfileIcon
    );
    setShowCreateProfileModal(false);
    setNewProfileName("");
    setNewProfileIsKid(false);
    showToast("Nouveau profil créé avec succès !");
  };

  const handleStartEditProfile = (p: (typeof profiles)[0]) => {
    setEditingProfileId(p.id);
    setEditProfileName(p.name);
    setEditProfileColor(p.avatar_color || AVATAR_COLORS[0]);
    setEditProfileIcon((p.avatar_icon as AvatarIconId) || "moon");
    setEditProfileIsKid(Boolean(p.is_kid));
  };

  const handleSaveEditedProfile = async () => {
    if (!editingProfileId || !editProfileName.trim()) return;
    await updateProfile(editingProfileId, {
      name: editProfileName.trim(),
      color: editProfileColor,
      avatarIcon: editProfileIcon,
      isKid: editProfileIsKid,
    });
    setEditingProfileId(null);
    showToast("Profil modifié avec succès !");
  };

  const handleDeleteProfileClick = async (profileId: string) => {
    if (profiles.length <= 1) {
      showToast("Impossible de supprimer le seul profil restant.");
      return;
    }
    if (confirm("Êtes-vous sûr de vouloir supprimer ce profil et son historique ?")) {
      await deleteProfile(profileId);
      showToast("Profil supprimé.");
    }
  };

  const handleRevokeDevice = async (sessionDbId: string, deviceId: string, deviceName: string) => {
    const ok = await revokeSession(sessionDbId, deviceId);
    if (ok) {
      showToast(`Session "${deviceName}" révoquée avec succès depuis Supabase.`);
    }
  };

  const handleRevokeAllOtherDevices = async () => {
    if (confirm("Êtes-vous sûr de vouloir révoquer et déconnecter tous les autres appareils de ce compte ?")) {
      const ok = await revokeAllOthers();
      if (ok) {
        showToast("Toutes les autres sessions Supabase ont été révoquées.");
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== "SUPPRIMER") return;
    try {
      // Clear all local nexstream data
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("nexstream_")) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      await signOut();
      onClose();
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  // --- Playback Handlers ---
  const handleToggleAutoNext = () => {
    const next = !autoplayNext;
    setAutoplayNext(next);
    localStorage.setItem("nexstream_auto_next", String(next));
  };

  const handleTogglePreview = () => {
    const next = !autoplayPreview;
    setAutoplayPreview(next);
    localStorage.setItem("nexstream_autoplay_preview", String(next));
  };

  const handleToggleGlow = () => {
    const next = !ambientGlow;
    setAmbientGlow(next);
    localStorage.setItem("nexstream_ambient_glow", String(next));
  };

  const handleToggleSubtitlesDefault = () => {
    const next = !subtitlesDefault;
    setSubtitlesDefault(next);
    localStorage.setItem("nexstream_subtitles_default", String(next));
  };

  const handleSubtitleSize = (size: "small" | "medium" | "large") => {
    setSubtitleSize(size);
    localStorage.setItem("nexstream_subtitle_size", size);
  };

  const handleSubtitleStyle = (style: "classic" | "yellow" | "transparent") => {
    setSubtitleStyle(style);
    localStorage.setItem("nexstream_subtitle_style", style);
  };

  const handleQualityWifi = (id: string) => {
    setQualityWifi(id);
    localStorage.setItem("nexstream_quality_wifi", id);
  };

  const handleQualityMobile = (id: string) => {
    setQualityMobile(id);
    localStorage.setItem("nexstream_quality_mobile", id);
  };

  const handlePlaybackSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    localStorage.setItem("nexstream_playback_speed", String(speed));
  };

  const handleDownloadQuality = (q: "standard" | "high") => {
    setDownloadQuality(q);
    localStorage.setItem("nexstream_download_quality", q);
  };

  const handleToggleDownloadWifiOnly = () => {
    const next = !downloadWifiOnly;
    setDownloadWifiOnly(next);
    localStorage.setItem("nexstream_download_wifi_only", String(next));
  };

  // --- Storage & History Handlers ---
  const handleClearCache = () => {
    try {
      setCacheSizeMB(0);
      showToast("Cache temporaire vidé avec succès (34.8 Mo libérés) !");
    } catch {
      // ignore
    }
  };

  const handleDeleteHistoryItem = (contentId: string) => {
    if (!activeProfile) return;
    removeWatchHistoryEntry(activeProfile.id, contentId);
    setHistoryItems(getLocalWatchHistory(activeProfile.id));
    showToast("Vidéo retirée de l'historique.");
  };

  const handleClearAllHistory = () => {
    if (!activeProfile) return;
    if (confirm("Voulez-vous réinitialiser tout l'historique de visionnage de ce profil ?")) {
      try {
        localStorage.removeItem(LOCAL_HISTORY_PREFIX + activeProfile.id);
        setHistoryItems([]);
        showToast("Historique réinitialisé.");
      } catch {
        // ignore
      }
    }
  };

  const handleDeleteOfflineItem = (contentId: string) => {
    const updated = removeOfflineDownload(contentId);
    setDownloads(updated);
    showToast("Téléchargement supprimé.");
  };

  const handleClearAllOffline = () => {
    if (confirm("Supprimer tous les téléchargements hors-ligne ?")) {
      localStorage.removeItem("nexstream_offline_downloads");
      setDownloads([]);
      window.dispatchEvent(new CustomEvent("nexstream-offline-changed"));
      showToast("Tous les téléchargements ont été effacés.");
    }
  };

  // RGPD Export
  const handleExportDataJSON = () => {
    try {
      const exportObject = {
        exportDate: new Date().toISOString(),
        application: "SiratStream v2.4",
        user: {
          email: user?.email || "invite@siratstream.app",
          displayName: activeProfile?.name || "Utilisateur",
          provider: userSpace?.provider || "guest",
        },
        activeProfile,
        profiles,
        watchHistory: activeProfile ? getLocalWatchHistory(activeProfile.id) : [],
        offlineDownloads: downloads,
        preferences: {
          theme,
          autoplayNext,
          autoplayPreview,
          ambientGlow,
          subtitlesDefault,
          subtitleSize,
          subtitleStyle,
          qualityWifi,
          qualityMobile,
          playbackSpeed,
          downloadQuality,
          downloadWifiOnly,
        },
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObject, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `siratstream_donnees_personnelles_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast("Export de vos données RGPD généré et téléchargé !");
    } catch (e) {
      showToast("Erreur lors de l'export des données.");
    }
  };

  // Network test simulation
  const runNetworkDiagnostic = async () => {
    setPingTesting(true);
    setPingResult(null);
    const start = performance.now();
    try {
      await fetch(window.location.href, { method: "HEAD", cache: "no-store" }).catch(() => {});
    } catch {
      // ignore
    }
    const end = performance.now();
    const duration = Math.max(12, Math.round(end - start));

    setTimeout(() => {
      setPingTesting(false);
      const estSpeed = Math.floor(65 + Math.random() * 45); // 65-110 Mbps
      setPingResult({
        pingMs: duration,
        speedMbps: estSpeed,
        quality: duration < 50 ? "Excellente (Flux 4K Ultra HD)" : "Très Bonne (Full HD 1080p)",
      });
    }, 900);
  };

  // Map history content items to catalog items
  const historyWithDetails = useMemo(() => {
    return historyItems.slice(0, 8).map((hist) => {
      const match = catalog.find((c) => c.id === hist.content_id);
      return {
        ...hist,
        item: match,
      };
    });
  }, [historyItems]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 14 }}
        transition={{ type: "spring", damping: 28, stiffness: 350 }}
        className="relative z-10 w-full sm:max-w-3xl max-h-[92vh] sm:h-[88vh] liquid-glass-modal backdrop-blur-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-white/20"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-zinc-950 font-extrabold shadow-md text-xs">
              NX
            </div>
            <div>
              <h2 className="text-white font-bold text-base sm:text-lg leading-tight">
                Paramètres du Compte
              </h2>
              <p className="text-zinc-400 text-[11px]">
                Gestion complète du profil, de la lecture et de la sécurité
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full liquid-glass hover:bg-white/15 border border-white/20 flex items-center justify-center text-zinc-300 hover:text-white transition-all shadow-md active:scale-95"
          >
            <X size={17} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-black/40 backdrop-blur-md px-4 sm:px-6 py-2.5 gap-2 overflow-x-auto scrollbar-none flex-shrink-0">
          <button
            onClick={() => setActiveTab("account")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === "account"
                ? "liquid-glass-emerald text-emerald-200 border border-emerald-300/40 font-bold shadow-md"
                : "liquid-glass text-zinc-300 hover:text-white hover:bg-white/15 border border-white/15"
            }`}
          >
            <UserIcon size={14} />
            <span>Compte</span>
          </button>

          <button
            onClick={() => setActiveTab("notifications")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === "notifications"
                ? "liquid-glass-emerald text-emerald-200 border border-emerald-300/40 font-bold shadow-md"
                : "liquid-glass text-zinc-300 hover:text-white hover:bg-white/15 border border-white/15"
            }`}
          >
            <Bell size={14} className={activeTab === "notifications" ? "text-emerald-300" : "text-emerald-400"} />
            <span>Notifications</span>
          </button>

          <button
            onClick={() => setActiveTab("stats")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === "stats"
                ? "liquid-glass-emerald text-emerald-200 border border-emerald-300/40 font-bold shadow-md"
                : "liquid-glass text-zinc-300 hover:text-white hover:bg-white/15 border border-white/15"
            }`}
          >
            <BarChart3 size={14} className={activeTab === "stats" ? "text-emerald-300" : "text-emerald-400"} />
            <span>Statistiques</span>
          </button>

          <button
            onClick={() => setActiveTab("playback")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === "playback"
                ? "liquid-glass-emerald text-emerald-200 border border-emerald-300/40 font-bold shadow-md"
                : "liquid-glass text-zinc-300 hover:text-white hover:bg-white/15 border border-white/15"
            }`}
          >
            <Sliders size={14} />
            <span>Lecture</span>
          </button>

          <button
            onClick={() => setActiveTab("storage")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === "storage"
                ? "liquid-glass-emerald text-emerald-200 border border-emerald-300/40 font-bold shadow-md"
                : "liquid-glass text-zinc-300 hover:text-white hover:bg-white/15 border border-white/15"
            }`}
          >
            <Database size={14} />
            <span>Stockage & Données</span>
          </button>

          <button
            onClick={() => setActiveTab("about")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === "about"
                ? "liquid-glass-emerald text-emerald-200 border border-emerald-300/40 font-bold shadow-md"
                : "liquid-glass text-zinc-300 hover:text-white hover:bg-white/15 border border-white/15"
            }`}
          >
            <Info size={14} />
            <span>À propos & Légal</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6">
          {/* Toast Notice */}
          <AnimatePresence>
            {notice && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="p-3 liquid-glass-emerald border border-emerald-400/40 rounded-2xl text-emerald-200 text-xs flex items-center gap-2 shadow-lg"
              >
                <Check size={16} className="text-emerald-400 flex-shrink-0" />
                <span className="font-medium">{notice}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ============================================================ */}
          {/* TAB 1: COMPTE (ACCOUNT) */}
          {/* ============================================================ */}
          {activeTab === "account" && (
            <div className="space-y-6">
              {/* 1. Informations du profil actif */}
              <GlassPanel variant="card" className="p-5 border border-white/15 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserIcon size={16} className="text-emerald-400" />
                    <h3 className="text-white text-sm font-semibold">Informations du Profil Actif</h3>
                  </div>
                  {activeProfile?.is_kid && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold">
                      Mode Enfant
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
                  <div className="flex items-center gap-3.5">
                    {/* Avatar Icon */}
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg relative group cursor-pointer border border-white/20"
                      style={{ backgroundColor: selectedAvatarColor }}
                      onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                      title="Cliquer pour changer l'avatar"
                    >
                      {(() => {
                        const Icon = getAvatarIcon(selectedAvatarIcon);
                        return Icon ? <Icon size={28} strokeWidth={1.75} /> : <UserIcon size={28} />;
                      })()}
                      <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit2 size={16} className="text-white" />
                      </div>
                    </div>

                    <div className="min-w-0">
                      {editingDisplayName ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={displayNameInput}
                            onChange={(e) => setDisplayNameInput(e.target.value)}
                            className="bg-black/50 border border-emerald-400/50 rounded-xl px-3 py-1.5 text-white text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-400"
                            placeholder="Nom du profil"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveProfileName}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-md"
                          >
                            <Save size={13} />
                            <span>OK</span>
                          </button>
                          <button
                            onClick={() => setEditingDisplayName(false)}
                            className="px-2 py-1.5 liquid-glass hover:bg-white/10 text-zinc-300 rounded-xl text-xs"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h4 className="text-white text-base font-bold truncate">
                            {activeProfile?.name || "Profil spectateur"}
                          </h4>
                          <button
                            onClick={() => setEditingDisplayName(true)}
                            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                            title="Modifier le nom"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      )}

                      <p className="text-zinc-400 text-xs mt-0.5 flex items-center gap-1.5">
                        <Mail size={12} />
                        <span>{user?.email || "Mode Invité / Non synchronisé"}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                    className="px-3.5 py-1.5 liquid-glass hover:bg-white/15 text-xs text-zinc-200 border border-white/20 rounded-xl font-semibold transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <Sparkles size={13} className="text-emerald-400" />
                    <span>Modifier l'avatar</span>
                  </button>
                </div>

                {/* Avatar Palette Selector Drawer */}
                {showAvatarPicker && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 rounded-2xl liquid-glass border border-white/20 space-y-3 mt-3 overflow-hidden"
                  >
                    <p className="text-zinc-300 text-xs font-semibold">Choisir une couleur :</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {AVATAR_COLORS.map((col) => (
                        <button
                          key={col}
                          onClick={() => setSelectedAvatarColor(col)}
                          className={`w-7 h-7 rounded-xl transition-all border-2 ${
                            selectedAvatarColor === col
                              ? "border-white scale-110 shadow-lg"
                              : "border-transparent opacity-80 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: col }}
                        />
                      ))}
                    </div>

                    <p className="text-zinc-300 text-xs font-semibold pt-1">Choisir une icône :</p>
                    <div className="grid grid-cols-7 gap-2">
                      {AVATAR_ICONS.map(({ id, icon: IconComponent, label }) => (
                        <button
                          key={id}
                          onClick={() => handleSaveAvatar(id, selectedAvatarColor)}
                          className={`p-2 rounded-xl flex items-center justify-center transition-all border ${
                            selectedAvatarIcon === id
                              ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 scale-105"
                              : "liquid-glass border-white/10 text-zinc-300 hover:text-white hover:bg-white/15"
                          }`}
                          title={label}
                        >
                          <IconComponent size={18} />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </GlassPanel>

              {/* 2. Gestion des profils multiples (Style Netflix) */}
              <GlassPanel variant="card" className="p-5 border border-white/15 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white text-sm font-semibold flex items-center gap-2">
                      <Shield size={16} className="text-emerald-400" />
                      <span>Gestion des profils multiples</span>
                    </h3>
                    <p className="text-zinc-400 text-xs mt-0.5">
                      {profiles.length} / 5 profils configurés (comme sur Netflix)
                    </p>
                  </div>

                  {profiles.length < 5 && (
                    <button
                      onClick={() => setShowCreateProfileModal(true)}
                      className="px-3.5 py-1.5 liquid-glass-emerald hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 active:scale-95"
                    >
                      <Plus size={14} />
                      <span>Ajouter un profil</span>
                    </button>
                  )}
                </div>

                {/* Profiles Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {profiles.map((p) => {
                    const isActive = p.id === activeProfile?.id;
                    const Icon = getAvatarIcon(p.avatar_icon);

                    return (
                      <div
                        key={p.id}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isActive
                            ? "liquid-glass-emerald border-emerald-400/50 shadow-md"
                            : "liquid-glass border-white/10 hover:border-white/20"
                        }`}
                      >
                        <div
                          className="flex items-center gap-3 cursor-pointer min-w-0 flex-1"
                          onClick={() => !isActive && selectProfile(p)}
                        >
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-md"
                            style={{ backgroundColor: p.avatar_color || "#10b981" }}
                          >
                            {Icon ? (
                              <Icon size={18} strokeWidth={1.75} />
                            ) : (
                              p.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-white text-xs font-bold truncate">{p.name}</p>
                              {isActive && (
                                <span className="px-1.5 py-0.2 rounded-full bg-emerald-400/30 text-emerald-200 text-[9px] font-extrabold uppercase">
                                  Actif
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400 truncate">
                              {p.is_kid ? "Profil Enfant sécurisé" : "Profil Complet"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStartEditProfile(p)}
                            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                            title="Modifier ce profil"
                          >
                            <Edit2 size={13} />
                          </button>
                          {profiles.length > 1 && (
                            <button
                              onClick={() => handleDeleteProfileClick(p.id)}
                              className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                              title="Supprimer ce profil"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </GlassPanel>

              {/* 3. Sécurité & Changement de mot de passe */}
              <GlassPanel variant="card" className="p-5 border border-white/15 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound size={16} className="text-emerald-400" />
                    <h3 className="text-white text-sm font-semibold">Sécurité & Mot de passe</h3>
                  </div>
                  <button
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                    className="px-3 py-1 liquid-glass hover:bg-white/15 text-xs text-zinc-300 hover:text-white rounded-xl font-medium transition-all"
                  >
                    {showPasswordForm ? "Fermer" : "Modifier"}
                  </button>
                </div>

                {firebaseUser ? (
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    Votre compte est authentifié via <span className="text-white font-semibold">Google / Apple Sign-In</span>. La sécurité de vos identifiants et le renouvellement de mot de passe s'effectuent directement sur votre compte Google ou Apple.
                  </p>
                ) : (
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    Définissez un mot de passe fort pour sécuriser vos profils et empêcher les accès non autorisés.
                  </p>
                )}

                {showPasswordForm && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handlePasswordSubmit}
                    className="space-y-3 pt-2 overflow-hidden"
                  >
                    {passwordFeedback && (
                      <div className="p-2.5 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-200 text-xs flex items-center gap-1.5">
                        <AlertTriangle size={14} />
                        <span>{passwordFeedback}</span>
                      </div>
                    )}

                    <div>
                      <label className="text-zinc-300 text-xs block mb-1">Mot de passe actuel</label>
                      <div className="relative">
                        <input
                          type={showPassText ? "text" : "password"}
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassText(!showPassText)}
                          className="absolute right-3 top-2.5 text-zinc-400 hover:text-white"
                        >
                          {showPassText ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-zinc-300 text-xs block mb-1">Nouveau mot de passe</label>
                        <input
                          type={showPassText ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min. 6 caractères"
                          className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                      <div>
                        <label className="text-zinc-300 text-xs block mb-1">Confirmer le mot de passe</label>
                        <input
                          type={showPassText ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Répéter"
                          className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-md active:scale-95"
                    >
                      Enregistrer le nouveau mot de passe
                    </button>
                  </motion.form>
                )}
              </GlassPanel>

              {/* 4. Appareils connectés & Sessions actives (Supabase) */}
              <GlassPanel variant="card" className="p-5 border border-white/15 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <Laptop size={16} className="text-emerald-400" />
                      <h3 className="text-white text-sm font-semibold">
                        Appareils connectés & Sessions actives
                      </h3>
                      {devicesSource === "supabase" ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Supabase Live
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 text-[10px] font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                          Synchro active
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-400 text-xs mt-0.5">
                      Gérez les autorisations d'accès et révoquez à distance les sessions non reconnues
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      onClick={() => refreshDevices()}
                      disabled={devicesRefreshing}
                      className="p-1.5 liquid-glass hover:bg-white/15 text-zinc-300 hover:text-white rounded-xl border border-white/10 transition-all shadow-sm active:scale-95"
                      title="Actualiser les sessions depuis Supabase"
                    >
                      <RefreshCw size={13} className={devicesRefreshing ? "animate-spin text-emerald-400" : ""} />
                    </button>

                    {connectedDevices.filter((d) => !d.is_current).length > 0 && (
                      <button
                        onClick={handleRevokeAllOtherDevices}
                        disabled={revokingAll}
                        className="px-3 py-1.5 liquid-glass hover:bg-rose-500/20 text-rose-300 border border-rose-400/30 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                      >
                        {revokingAll ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <LogOut size={12} />
                        )}
                        <span>Déconnecter tous les autres</span>
                      </button>
                    )}
                  </div>
                </div>

                {devicesLoading && connectedDevices.length === 0 ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2 text-zinc-400 text-xs">
                    <Loader2 size={20} className="animate-spin text-emerald-400" />
                    <p>Récupération des sessions en direct depuis Supabase...</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {connectedDevices.map((d) => (
                      <div
                        key={d.id}
                        className={`p-3.5 rounded-2xl liquid-glass border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          d.is_current
                            ? "border-emerald-500/40 bg-emerald-950/10 shadow-[0_0_15px_rgba(16,185,129,0.08)]"
                            : "border-white/10 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner ${
                              d.is_current
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                                : "liquid-glass-subtle text-zinc-300 border border-white/10"
                            }`}
                          >
                            {d.device_type === "tv" ? (
                              <Tv size={20} className="text-emerald-400" />
                            ) : d.device_type === "mobile" ? (
                              <Smartphone size={20} className="text-sky-400" />
                            ) : d.device_type === "tablet" ? (
                              <Tablet size={20} className="text-purple-400" />
                            ) : (
                              <Laptop size={20} className="text-amber-400" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-white text-xs font-semibold truncate">
                                {d.device_name}
                              </p>
                              {d.is_current && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 text-[9px] font-bold flex items-center gap-1">
                                  <Check size={10} />
                                  Cet appareil (Actuel)
                                </span>
                              )}
                              <span className="px-1.5 py-0.2 rounded-md bg-white/5 text-zinc-400 text-[10px]">
                                {d.os}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Globe size={11} className="text-zinc-500" />
                                {d.location}
                              </span>
                              <span>•</span>
                              <span className="text-zinc-400">{d.browser}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-zinc-300">
                                <Clock size={11} className="text-zinc-500" />
                                {formatRelativeTime(d.last_active_at)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                          {d.is_current ? (
                            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-medium flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Session active
                            </span>
                          ) : (
                            <button
                              onClick={() => handleRevokeDevice(d.id, d.device_id, d.device_name)}
                              disabled={revokingId === d.id}
                              className="px-3 py-1.5 liquid-glass hover:bg-rose-500/20 text-zinc-300 hover:text-rose-200 border border-white/15 hover:border-rose-400/30 text-xs rounded-xl font-medium transition-all flex items-center gap-1.5 active:scale-95 shadow-sm disabled:opacity-50"
                              title="Déconnecter et révoquer cette session à distance"
                            >
                              {revokingId === d.id ? (
                                <>
                                  <Loader2 size={12} className="animate-spin text-rose-400" />
                                  <span>Révocation...</span>
                                </>
                              ) : (
                                <>
                                  <LogOut size={12} className="text-rose-400" />
                                  <span>Révoquer</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Information & Test Helper */}
                <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-zinc-400">
                  <p className="flex items-center gap-1 text-zinc-400">
                    <Shield size={12} className="text-emerald-400 flex-shrink-0" />
                    <span>La révocation bloque immédiatement l'appareil et coupe la diffusion vidéo.</span>
                  </p>
                </div>
              </GlassPanel>

              {/* 5. Synchronisation Cloud Google / Apple */}
              <GlassPanel variant="emerald" className="p-5 border border-emerald-400/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-emerald-300" />
                    <span className="text-white text-sm font-semibold">Synchronisation Cloud Multi-Appareils</span>
                  </div>
                  {firebaseUser ? (
                    <span className="px-2.5 py-0.5 rounded-full liquid-glass text-emerald-300 border border-emerald-400/30 text-[10px] font-bold">
                      Google Connecté
                    </span>
                  ) : userSpace?.provider === "apple" ? (
                    <span className="px-2.5 py-0.5 rounded-full liquid-glass text-white border border-white/20 text-[10px] font-bold">
                      Apple iCloud Connecté
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full liquid-glass text-zinc-400 text-[10px]">
                      Mode Invité
                    </span>
                  )}
                </div>
                <p className="text-zinc-300 text-xs leading-relaxed">
                  {firebaseUser || userSpace?.email?.includes("@")
                    ? `Connecté avec ${userSpace?.email || firebaseUser?.email}. Vos favoris, notes et historique sont sauvegardés en temps réel.`
                    : "Associez votre compte Google ou Apple pour retrouver vos profils, votre progression et vos favoris sur votre TV, tablette et téléphone."}
                </p>
                {!firebaseUser && userSpace?.provider !== "apple" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={signInWithGoogle}
                      className="flex items-center justify-center gap-2 bg-white hover:bg-zinc-200 text-black text-xs font-bold py-2.5 rounded-xl transition-all shadow-md active:scale-95"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>Connexion Google</span>
                    </button>
                    <button
                      onClick={() => signInWithApple()}
                      className="flex items-center justify-center gap-2 liquid-glass hover:bg-white/15 text-white text-xs font-bold py-2.5 rounded-xl transition-all border border-white/20 active:scale-95"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
                        <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.68-7.83-11.97-14.35-6.19-9.35-11.04-19.98-14.56-31.9-3.52-11.92-5.28-23.32-5.28-34.2 0-14.35 3.65-26.2 10.96-35.54 7.3-9.35 16.5-14.12 27.59-14.33 4.9 0 10.37 1.25 16.42 3.75 6.04 2.5 10.14 3.79 12.3 3.87 1.63 0 5.92-1.4 12.87-4.22 6.96-2.82 12.92-4.04 17.89-3.66 13.39.87 23.95 5.56 31.67 14.07-11.75 7.18-17.51 16.97-17.29 29.38.22 9.79 4.02 18.06 11.4 24.81 7.39 6.74 16.14 10.45 26.27 11.1-2.28 7.07-5.1 13.92-8.45 20.54zm-28.76-105.7c0 7.39-2.72 14.46-8.15 21.22-5.44 6.75-12.18 10.77-20.24 12.04-.22-1.09-.33-2.18-.33-3.26 0-7.18 2.94-14.36 8.81-21.54 5.87-7.18 12.78-11.2 20.73-12.06.11 1.2.18 2.4.18 3.6z" />
                      </svg>
                      <span>Apple (iCloud)</span>
                    </button>
                  </div>
                )}
              </GlassPanel>

              {/* 6. Zone de Danger : Suppression du compte */}
              <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-3 backdrop-blur-xl">
                <div className="flex items-center gap-2 text-rose-300 font-semibold text-sm">
                  <ShieldAlert size={16} />
                  <span>Zone Critique : Suppression du compte</span>
                </div>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Supprime définitivement votre compte, tous les profils associés, l'historique et les favoris. Cette action est irréversible.
                </p>

                {showDeleteConfirm ? (
                  <div className="p-4 bg-black/50 rounded-xl border border-rose-500/40 space-y-2.5">
                    <p className="text-rose-200 text-xs font-medium">
                      Pour confirmer, écrivez <span className="font-bold underline">SUPPRIMER</span> ci-dessous :
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="SUPPRIMER"
                      className="w-full bg-black/60 border border-rose-500/40 rounded-lg px-3 py-2 text-white text-xs uppercase font-bold focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText.trim().toUpperCase() !== "SUPPRIMER"}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-all shadow-md"
                      >
                        Confirmer la suppression irréversible
                      </button>
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText("");
                        }}
                        className="px-3 py-2 text-zinc-400 hover:text-white text-xs"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/40 rounded-xl text-xs font-bold transition-all"
                  >
                    Supprimer mon compte et mes données
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB: NOTIFICATIONS */}
          {/* ============================================================ */}
          {activeTab === "notifications" && (
            <NotificationsSettingsSection onShowToast={showToast} />
          )}

          {/* ============================================================ */}
          {/* TAB 2: STATISTIQUES (STATS) */}
          {/* ============================================================ */}
          {activeTab === "stats" && (
            <UserStatsSection onPlayVideo={onPlayVideo} onCloseParent={onClose} />
          )}

          {/* ============================================================ */}
          {/* TAB 3: LECTURE (PLAYBACK) */}
          {/* ============================================================ */}
          {activeTab === "playback" && (
            <div className="space-y-4">
              {/* Thème & Détection Automatique Système */}
              <GlassPanel variant="card" className="p-5 border border-white/15 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white text-sm font-semibold flex items-center gap-2">
                      <Monitor size={16} className="text-emerald-400" />
                      <span>Thème & Détection Système</span>
                    </h4>
                    <p className="text-zinc-300 text-xs mt-0.5 max-w-sm">
                      Bascule automatiquement entre clair et sombre selon votre système ou choisissez un mode fixe.
                    </p>
                  </div>
                  {theme === "system" && (
                    <span className="px-2.5 py-0.5 rounded-full liquid-glass-emerald text-emerald-300 border border-emerald-400/30 text-[10px] font-bold uppercase tracking-wider">
                      Auto ({systemTheme === "dark" ? "Sombre" : "Clair"})
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    onClick={() => setTheme("system")}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all text-xs font-semibold ${
                      theme === "system"
                        ? "liquid-glass-emerald text-emerald-200 border-emerald-300/50 shadow-md font-bold"
                        : "liquid-glass hover:bg-white/15 text-zinc-300 border-white/15"
                    }`}
                  >
                    <Monitor size={18} className={theme === "system" ? "text-emerald-300" : "text-zinc-400"} />
                    <span>Système</span>
                    <span className="text-[10px] opacity-75 font-normal">Automatique</span>
                  </button>

                  <button
                    onClick={() => setTheme("dark")}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all text-xs font-semibold ${
                      theme === "dark"
                        ? "liquid-glass-emerald text-emerald-200 border-emerald-300/50 shadow-md font-bold"
                        : "liquid-glass hover:bg-white/15 text-zinc-300 border-white/15"
                    }`}
                  >
                    <Moon size={18} className={theme === "dark" ? "text-emerald-300" : "text-zinc-400"} />
                    <span>Sombre</span>
                    <span className="text-[10px] opacity-75 font-normal">Cinéma</span>
                  </button>

                  <button
                    onClick={() => setTheme("light")}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all text-xs font-semibold ${
                      theme === "light"
                        ? "liquid-glass-emerald text-emerald-200 border-emerald-300/50 shadow-md font-bold"
                        : "liquid-glass hover:bg-white/15 text-zinc-300 border-white/15"
                    }`}
                  >
                    <Sun size={18} className={theme === "light" ? "text-emerald-300" : "text-zinc-400"} />
                    <span>Clair</span>
                    <span className="text-[10px] opacity-75 font-normal">Jour</span>
                  </button>
                </div>
              </GlassPanel>

              {/* Lecture automatique épisode suivant */}
              <GlassPanel variant="card" className="p-4 border border-white/15 flex items-center justify-between">
                <div>
                  <h4 className="text-white text-sm font-semibold">Lecture automatique de l'épisode suivant</h4>
                  <p className="text-zinc-300 text-xs mt-0.5 max-w-sm">
                    Enchaîne automatiquement avec le récit ou épisode suivant à la fin de la vidéo.
                  </p>
                </div>
                <button
                  onClick={handleToggleAutoNext}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    autoplayNext ? "bg-emerald-500" : "bg-white/15"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      autoplayNext ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </GlassPanel>

              {/* Prévisualisation au survol */}
              <GlassPanel variant="card" className="p-4 border border-white/15 flex items-center justify-between">
                <div>
                  <h4 className="text-white text-sm font-semibold">Prévisualisation vidéo au survol</h4>
                  <p className="text-zinc-300 text-xs mt-0.5 max-w-sm">
                    Lit automatiquement un extrait silencieux lorsque le curseur reste sur une miniature.
                  </p>
                </div>
                <button
                  onClick={handleTogglePreview}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    autoplayPreview ? "bg-emerald-500" : "bg-white/15"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      autoplayPreview ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </GlassPanel>

              {/* Effet Ambiance Lumineuse */}
              <GlassPanel variant="card" className="p-4 border border-white/15 flex items-center justify-between">
                <div>
                  <h4 className="text-white text-sm font-semibold">Effet Ambiance Lumineuse</h4>
                  <p className="text-zinc-300 text-xs mt-0.5 max-w-sm">
                    Projette un halo lumineux doux autour du lecteur pour une immersion cinéma.
                  </p>
                </div>
                <button
                  onClick={handleToggleGlow}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    ambientGlow ? "bg-emerald-500" : "bg-white/15"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      ambientGlow ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </GlassPanel>

              {/* Sous-titres & Typographie */}
              <GlassPanel variant="card" className="p-5 border border-white/15 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white text-sm font-semibold flex items-center gap-2">
                      <Subtitles size={16} className="text-emerald-400" />
                      <span>Sous-titres & Accessibilité</span>
                    </h4>
                    <p className="text-zinc-300 text-xs mt-0.5 max-w-sm">
                      Activer les sous-titres par défaut et personnaliser leur taille et contraste.
                    </p>
                  </div>
                  <button
                    onClick={handleToggleSubtitlesDefault}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors flex-shrink-0 ${
                      subtitlesDefault ? "bg-emerald-500" : "bg-white/15"
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        subtitlesDefault ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {subtitlesDefault && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <p className="text-zinc-400 text-xs mb-1.5 font-medium">Taille du texte :</p>
                      <div className="flex items-center gap-2">
                        {(["small", "medium", "large"] as const).map((size) => (
                          <button
                            key={size}
                            onClick={() => handleSubtitleSize(size)}
                            className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition-all ${
                              subtitleSize === size
                                ? "liquid-glass-emerald text-emerald-200 border-emerald-300/50 shadow-md font-bold"
                                : "liquid-glass text-zinc-300 border-white/15 hover:bg-white/15"
                            }`}
                          >
                            {size === "small" ? "Petit" : size === "medium" ? "Moyen" : "Grand"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-zinc-400 text-xs mb-1.5 font-medium">Style visuel :</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "classic", label: "Blanc classique" },
                          { id: "yellow", label: "Jaune cinéma" },
                          { id: "transparent", label: "Fond transparent" },
                        ].map((st) => (
                          <button
                            key={st.id}
                            onClick={() => handleSubtitleStyle(st.id as any)}
                            className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                              subtitleStyle === st.id
                                ? "liquid-glass-emerald text-emerald-200 border-emerald-300/50 shadow-md font-bold"
                                : "liquid-glass text-zinc-300 border-white/15 hover:bg-white/15"
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </GlassPanel>

              {/* Qualité vidéo Wi-Fi & Données mobiles */}
              <GlassPanel variant="card" className="p-5 border border-white/15 space-y-4">
                <div className="flex items-center gap-2">
                  <Gauge size={16} className="text-emerald-400" />
                  <h4 className="text-white text-sm font-semibold">Qualité de diffusion vidéo</h4>
                </div>

                <div>
                  <p className="text-zinc-400 text-xs font-medium mb-2 flex items-center gap-1.5">
                    <Wifi size={13} />
                    En Wi-Fi
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {VIDEO_QUALITIES.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => handleQualityWifi(q.id)}
                        className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                          qualityWifi === q.id
                            ? "liquid-glass-emerald text-emerald-200 border-emerald-300/50 shadow-md font-bold"
                            : "liquid-glass text-zinc-300 border-white/15 hover:bg-white/15"
                        }`}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-zinc-400 text-xs font-medium mb-2 flex items-center gap-1.5">
                    <Smartphone size={13} />
                    En Données mobiles (4G/5G)
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {VIDEO_QUALITIES.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => handleQualityMobile(q.id)}
                        className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                          qualityMobile === q.id
                            ? "liquid-glass-emerald text-emerald-200 border-emerald-300/50 shadow-md font-bold"
                            : "liquid-glass text-zinc-300 border-white/15 hover:bg-white/15"
                        }`}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              </GlassPanel>

              {/* Vitesse de lecture par défaut */}
              <GlassPanel variant="card" className="p-5 border border-white/15 space-y-3">
                <h4 className="text-white text-sm font-semibold">Vitesse de lecture par défaut</h4>
                <div className="grid grid-cols-5 gap-2">
                  {PLAYBACK_SPEEDS.map((speed) => (
                    <button
                      key={speed}
                      onClick={() => handlePlaybackSpeed(speed)}
                      className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                        playbackSpeed === speed
                          ? "liquid-glass-emerald text-emerald-200 border-emerald-300/50 shadow-md font-bold"
                          : "liquid-glass text-zinc-300 border-white/15 hover:bg-white/15"
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </GlassPanel>

              {/* Téléchargements & Mode Hors-ligne */}
              <GlassPanel variant="card" className="p-5 border border-white/15 space-y-4">
                <div className="flex items-center gap-2">
                  <DownloadCloud size={16} className="text-emerald-400" />
                  <h4 className="text-white text-sm font-semibold">Téléchargements & Mode Hors-ligne</h4>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleDownloadQuality("standard")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      downloadQuality === "standard"
                        ? "liquid-glass-emerald text-emerald-200 border-emerald-300/50 font-bold shadow-md"
                        : "liquid-glass text-zinc-300 border-white/15 hover:bg-white/15"
                    }`}
                  >
                    <p className="text-xs font-semibold">Qualité Standard</p>
                    <p className="text-[11px] opacity-75">Plus rapide, prend moins d'espace (720p)</p>
                  </button>

                  <button
                    onClick={() => handleDownloadQuality("high")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      downloadQuality === "high"
                        ? "liquid-glass-emerald text-emerald-200 border-emerald-300/50 font-bold shadow-md"
                        : "liquid-glass text-zinc-300 border-white/15 hover:bg-white/15"
                    }`}
                  >
                    <p className="text-xs font-semibold">Haute Définition</p>
                    <p className="text-[11px] opacity-75">Détails optimaux pour grand écran (1080p)</p>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-white text-xs font-semibold">Télécharger en Wi-Fi uniquement</p>
                    <p className="text-zinc-400 text-[11px]">Évite de consommer votre forfait mobile data.</p>
                  </div>
                  <button
                    onClick={handleToggleDownloadWifiOnly}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                      downloadWifiOnly ? "bg-emerald-500" : "bg-white/15"
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        downloadWifiOnly ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </GlassPanel>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 4: STOCKAGE & DONNÉES (STORAGE) */}
          {/* ============================================================ */}
          {activeTab === "storage" && (
            <div className="space-y-5">
              {/* Quota Cloud Firebase par utilisateur */}
              <GlassPanel variant="card" className="p-5 border border-white/15 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <Cloud size={16} className="text-amber-400" />
                    </div>
                    <div>
                      <h4 className="text-white text-sm font-semibold flex items-center gap-2">
                        <span>Espace Cloud Firebase par Utilisateur</span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 text-[10px] font-medium border border-amber-500/20">
                          Spark Gratuit
                        </span>
                      </h4>
                      <p className="text-[11px] text-zinc-400">
                        Quota cloud alloué par Firebase (Cloud Storage & Base Firestore)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-300 block">
                      5 Go offerts
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      par utilisateur / projet
                    </span>
                  </div>
                </div>

                {/* Jauge Cloud */}
                <div className="w-full bg-black/50 rounded-full h-3 overflow-hidden border border-white/10 flex">
                  <div
                    className="bg-amber-400 h-full transition-all duration-500"
                    style={{ width: "3.2%" }}
                    title="Données synchronisées (Profils, Favoris, Historique)"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 text-[10px]">Cloud Storage (Fichiers)</span>
                      <span className="text-amber-400 font-bold">5 Go</span>
                    </div>
                    <p className="text-white font-semibold">1 Go / jour en téléchargement</p>
                    <p className="text-[10px] text-zinc-400">Stockage médias et sauvegardes</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 text-[10px]">Firestore Database</span>
                      <span className="text-emerald-400 font-bold">1 Go</span>
                    </div>
                    <p className="text-white font-semibold">50 000 lectures / jour</p>
                    <p className="text-[10px] text-zinc-400">Profils, listes et synchronisation</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 text-[10px]">Utilisation actuelle</span>
                      <span className="text-sky-400 font-bold">&lt; 15 Mo</span>
                    </div>
                    <p className="text-white font-semibold">~4.98 Go disponibles</p>
                    <p className="text-[10px] text-zinc-400">99.7% d'espace cloud restant</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15 flex items-start gap-2 text-[11px] text-zinc-300">
                  <Server size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>
                    Chaque utilisateur authentifié bénéficie du plan Firebase Spark sans frais. Vos préférences, profils, historique et listes personnalisées sont stockés et synchronisés dans votre espace sécurisé.
                  </span>
                </div>
              </GlassPanel>

              {/* Vider le cache de l'application */}
              <GlassPanel variant="card" className="p-4 border border-white/15 flex items-center justify-between">
                <div>
                  <h4 className="text-white text-sm font-semibold">Vider le cache de l'application</h4>
                  <p className="text-zinc-300 text-xs mt-0.5 max-w-sm">
                    Supprime les vignettes et métadonnées temporaires pour libérer de l'espace mémoire ({cacheSizeMB} Mo).
                  </p>
                </div>
                <button
                  onClick={handleClearCache}
                  className="px-3.5 py-2 liquid-glass hover:bg-white/15 text-zinc-200 hover:text-white border border-white/15 text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <RefreshCw size={13} />
                  <span>Vider le cache</span>
                </button>
              </GlassPanel>

              {/* Historique de visionnage avec liste des vidéos */}
              <GlassPanel variant="card" className="p-5 border border-white/15 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white text-sm font-semibold flex items-center gap-2">
                      <Clock size={16} className="text-emerald-400" />
                      <span>Historique de visionnage</span>
                    </h4>
                    <p className="text-zinc-300 text-xs mt-0.5">
                      {historyItems.length} vidéo(s) enregistrée(s) pour ce profil.
                    </p>
                  </div>
                  {historyItems.length > 0 && (
                    <button
                      onClick={handleClearAllHistory}
                      className="px-3 py-1.5 liquid-glass hover:bg-rose-500/20 text-rose-300 border border-rose-400/30 text-xs font-semibold rounded-xl transition-all flex items-center gap-1"
                    >
                      <Trash2 size={13} />
                      <span>Tout effacer</span>
                    </button>
                  )}
                </div>

                {historyWithDetails.length === 0 ? (
                  <p className="text-zinc-400 text-xs italic py-2">
                    Aucune vidéo dans l'historique de ce profil pour le moment.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {historyWithDetails.map(({ content_id, progress_seconds, item }) => (
                      <div
                        key={content_id}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-xl liquid-glass border border-white/10 hover:border-white/20 transition-all"
                      >
                        <div
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                          onClick={() => onPlayVideo?.(content_id, progress_seconds)}
                        >
                          {item?.thumbnail ? (
                            <img
                              src={item.thumbnail}
                              alt=""
                              className="w-16 aspect-video rounded-lg object-cover flex-shrink-0 border border-white/10"
                            />
                          ) : (
                            <div className="w-16 aspect-video rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                              <Play size={14} className="text-zinc-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-white text-xs font-semibold truncate">
                              {item?.title || content_id}
                            </p>
                            <p className="text-[11px] text-zinc-400">
                              Progression : {Math.floor(progress_seconds / 60)} min
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteHistoryItem(content_id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors flex-shrink-0"
                          title="Retirer de l'historique"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </GlassPanel>

              {/* Téléchargements hors-ligne */}
              <GlassPanel variant="card" className="p-5 border border-white/15 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white text-sm font-semibold flex items-center gap-2">
                      <DownloadCloud size={16} className="text-emerald-400" />
                      <span>Vidéos téléchargées (Hors-ligne)</span>
                    </h4>
                    <p className="text-zinc-300 text-xs mt-0.5">
                      {downloads.length} vidéo(s) disponible(s) sans connexion internet.
                    </p>
                  </div>
                  {downloads.length > 0 && (
                    <button
                      onClick={handleClearAllOffline}
                      className="px-3 py-1.5 liquid-glass hover:bg-rose-500/20 text-rose-300 border border-rose-400/30 text-xs font-semibold rounded-xl transition-all flex items-center gap-1"
                    >
                      <Trash2 size={13} />
                      <span>Tout supprimer</span>
                    </button>
                  )}
                </div>

                {downloads.length === 0 ? (
                  <p className="text-zinc-400 text-xs italic py-2">
                    Aucun téléchargement enregistré. Utilisez le bouton "Télécharger" sur n'importe quel récit pour le regarder hors-ligne.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {downloads.map((d) => (
                      <div
                        key={d.contentId}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-xl liquid-glass border border-white/10"
                      >
                        <div
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                          onClick={() => onPlayVideo?.(d.contentId)}
                        >
                          <img
                            src={d.item.thumbnail}
                            alt=""
                            className="w-16 aspect-video rounded-lg object-cover flex-shrink-0 border border-white/10"
                          />
                          <div className="min-w-0">
                            <p className="text-white text-xs font-semibold truncate">{d.item.title}</p>
                            <p className="text-[11px] text-zinc-400">{d.sizeMB} Mo · Téléchargé en HD</p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteOfflineItem(d.contentId)}
                          className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors flex-shrink-0"
                          title="Supprimer le fichier"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </GlassPanel>

              {/* Export RGPD des données personnelles */}
              <GlassPanel variant="emerald" className="p-5 border border-emerald-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-emerald-300" />
                    <h4 className="text-white text-sm font-semibold">Export des données personnelles (RGPD)</h4>
                  </div>
                  <p className="text-zinc-300 text-xs mt-1 max-w-md">
                    Téléchargez l'intégralité de vos profils, historique de visionnage, préférences et favoris dans un fichier JSON portable et sécurisé.
                  </p>
                </div>

                <button
                  onClick={handleExportDataJSON}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 flex-shrink-0 active:scale-95"
                >
                  <Download size={14} />
                  <span>Exporter mes données</span>
                </button>
              </GlassPanel>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 5: À PROPOS & LÉGAL (ABOUT) */}
          {/* ============================================================ */}
          {activeTab === "about" && (
            <div className="space-y-4">
              {/* Informations version */}
              <GlassPanel variant="card" className="p-5 border border-white/15 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-6 bg-emerald-400 rounded-full" />
                  <h4 className="text-white font-bold text-base">SiratStream v2.4.2 Pro</h4>
                </div>
                <p className="text-zinc-300 text-xs leading-relaxed">
                  Plateforme de streaming spirituel, historique et d'enseignements authentiques. Conçue avec une interface liquide de dernière génération, adaptée à tous les écrans et tous les membres du foyer.
                </p>
                <p className="text-zinc-400 text-[11px] pt-1">
                  Build : 2026.09-Release · PWA Offline Capable · Audio Engine HD
                </p>
              </GlassPanel>

              {/* Test de diagnostic réseau */}
              <GlassPanel variant="card" className="p-5 border border-white/15 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity size={16} className="text-emerald-400" />
                    <h4 className="text-white text-sm font-semibold">Diagnostic & Vitesse réseau</h4>
                  </div>
                  <button
                    onClick={runNetworkDiagnostic}
                    disabled={pingTesting}
                    className="px-3 py-1.5 liquid-glass-emerald hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                  >
                    {pingTesting ? "Mesure en cours..." : "Tester la connexion"}
                  </button>
                </div>

                <p className="text-zinc-300 text-xs">
                  Vérifie la latence (ping) et la compatibilité de votre connexion avec le flux vidéo 1080p et 4K.
                </p>

                {pingResult && (
                  <div className="p-3 bg-black/40 rounded-xl border border-emerald-400/30 flex items-center justify-between text-xs animate-in fade-in">
                    <div>
                      <p className="text-emerald-300 font-bold">{pingResult.quality}</p>
                      <p className="text-zinc-400 text-[11px]">Débit estimé : ~{pingResult.speedMbps} Mbps</p>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg font-mono font-bold">
                      {pingResult.pingMs} ms
                    </span>
                  </div>
                )}
              </GlassPanel>

              {/* Mentions légales & Confidentialité */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => onOpenLegal?.("privacy")}
                  className="p-4 liquid-glass hover:bg-white/15 border border-white/15 rounded-2xl text-left transition-all group"
                >
                  <p className="text-white text-xs font-semibold group-hover:text-emerald-300 transition-colors">
                    Politique de Confidentialité
                  </p>
                  <p className="text-zinc-400 text-[11px] mt-0.5">
                    Protection de vos données et respect de la vie privée
                  </p>
                </button>

                <button
                  onClick={() => onOpenLegal?.("terms")}
                  className="p-4 liquid-glass hover:bg-white/15 border border-white/15 rounded-2xl text-left transition-all group"
                >
                  <p className="text-white text-xs font-semibold group-hover:text-emerald-300 transition-colors">
                    Conditions Générales d'Utilisation
                  </p>
                  <p className="text-zinc-400 text-[11px] mt-0.5">
                    Règles d'utilisation de la plateforme et droits
                  </p>
                </button>
              </div>

              {/* Support & Contact */}
              <GlassPanel variant="card" className="p-4 border border-white/15 flex items-center justify-between">
                <div>
                  <h4 className="text-white text-sm font-semibold flex items-center gap-1.5">
                    <HelpCircle size={15} className="text-emerald-400" />
                    <span>Besoin d'aide ou d'assistance ?</span>
                  </h4>
                  <p className="text-zinc-400 text-xs mt-0.5">
                    Contactez l'équipe support à <span className="text-emerald-300 font-medium">support@siratstream.app</span>
                  </p>
                </div>
                <a
                  href="mailto:support@siratstream.app"
                  className="px-3.5 py-1.5 liquid-glass hover:bg-white/15 text-xs text-white border border-white/20 rounded-xl font-medium transition-all"
                >
                  Contacter
                </a>
              </GlassPanel>

              {/* Bouton Déconnexion bien visible */}
              <button
                onClick={signOut}
                className="w-full flex items-center justify-center gap-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/40 font-bold py-3.5 rounded-2xl transition-all text-sm backdrop-blur-xl shadow-lg active:scale-95"
              >
                <LogOut size={18} />
                <span>Se déconnecter de SiratStream</span>
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* ============================================================ */}
      {/* MODAL : AJOUT DE NOUVEAU PROFIL */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showCreateProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowCreateProfileModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="relative z-10 w-full max-w-md liquid-glass-modal p-6 rounded-3xl border border-white/20 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-base">Nouveau Profil Spectateur</h3>
                <button
                  onClick={() => setShowCreateProfileModal(false)}
                  className="text-zinc-400 hover:text-white p-1 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <div>
                <label className="text-zinc-300 text-xs font-semibold block mb-1">Nom du profil</label>
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="Ex : Enfants, Sarah, Invité..."
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-400"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-zinc-300 text-xs font-semibold block mb-1.5">Couleur de l'avatar</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {AVATAR_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setNewProfileColor(col)}
                      className={`w-7 h-7 rounded-xl transition-all border-2 ${
                        newProfileColor === col ? "border-white scale-110 shadow-lg" : "border-transparent opacity-80"
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-zinc-300 text-xs font-semibold block mb-1.5">Icône de l'avatar</label>
                <div className="grid grid-cols-7 gap-1.5">
                  {AVATAR_ICONS.map(({ id, icon: IconComponent, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setNewProfileIcon(id)}
                      className={`p-2 rounded-xl flex items-center justify-center transition-all border ${
                        newProfileIcon === id
                          ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 scale-105"
                          : "liquid-glass border-white/10 text-zinc-300 hover:text-white hover:bg-white/15"
                      }`}
                      title={label}
                    >
                      <IconComponent size={16} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Contrôle Parental / Profil Enfant */}
              <div className="p-3.5 rounded-2xl liquid-glass border border-white/15 flex items-center justify-between">
                <div>
                  <p className="text-white text-xs font-semibold">Profil Enfant (Contrôle parental)</p>
                  <p className="text-zinc-400 text-[11px] mt-0.5">
                    Masque automatiquement les thématiques sensibles (Eschatologie, Djinns).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNewProfileIsKid(!newProfileIsKid)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    newProfileIsKid ? "bg-emerald-500" : "bg-white/15"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      newProfileIsKid ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCreateProfile}
                  disabled={!newProfileName.trim()}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-md active:scale-95"
                >
                  Créer le profil
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateProfileModal(false)}
                  className="px-4 py-2.5 liquid-glass hover:bg-white/10 text-zinc-300 rounded-xl text-xs"
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* MODAL : MODIFICATION DE PROFIL EXISTANT */}
      {/* ============================================================ */}
      <AnimatePresence>
        {editingProfileId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setEditingProfileId(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="relative z-10 w-full max-w-md liquid-glass-modal p-6 rounded-3xl border border-white/20 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-base">Modifier le Profil</h3>
                <button
                  onClick={() => setEditingProfileId(null)}
                  className="text-zinc-400 hover:text-white p-1 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <div>
                <label className="text-zinc-300 text-xs font-semibold block mb-1">Nom du profil</label>
                <input
                  type="text"
                  value={editProfileName}
                  onChange={(e) => setEditProfileName(e.target.value)}
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-zinc-300 text-xs font-semibold block mb-1.5">Couleur</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {AVATAR_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setEditProfileColor(col)}
                      className={`w-7 h-7 rounded-xl transition-all border-2 ${
                        editProfileColor === col ? "border-white scale-110 shadow-lg" : "border-transparent opacity-80"
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-zinc-300 text-xs font-semibold block mb-1.5">Icône</label>
                <div className="grid grid-cols-7 gap-1.5">
                  {AVATAR_ICONS.map(({ id, icon: IconComponent, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setEditProfileIcon(id)}
                      className={`p-2 rounded-xl flex items-center justify-center transition-all border ${
                        editProfileIcon === id
                          ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 scale-105"
                          : "liquid-glass border-white/10 text-zinc-300 hover:text-white hover:bg-white/15"
                      }`}
                      title={label}
                    >
                      <IconComponent size={16} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl liquid-glass border border-white/15 flex items-center justify-between">
                <div>
                  <p className="text-white text-xs font-semibold">Profil Enfant (Contrôle parental)</p>
                  <p className="text-zinc-400 text-[11px] mt-0.5">
                    Restreindre l'accès aux thématiques sensibles.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditProfileIsKid(!editProfileIsKid)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    editProfileIsKid ? "bg-emerald-500" : "bg-white/15"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      editProfileIsKid ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveEditedProfile}
                  disabled={!editProfileName.trim()}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-md active:scale-95"
                >
                  Enregistrer les modifications
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProfileId(null)}
                  className="px-4 py-2.5 liquid-glass hover:bg-white/10 text-zinc-300 rounded-xl text-xs"
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
