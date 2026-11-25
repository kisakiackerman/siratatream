import { useState, useMemo } from "react";
import {
  X,
  User as UserIcon,
  Bookmark,
  BookmarkCheck,
  Clock,
  BookOpen,
  Sparkles,
  Settings,
  LogOut,
  Check,
  Plus,
  Trash2,
  Share2,
  Calendar,
  CloudCheck,
  Globe,
  Bell,
  Volume2,
  Wand2,
  Play,
  Mail,
  Folder,
  FolderPlus,
  FolderOpen,
  Edit3,
  Heart,
  Star,
  Moon,
  Flame,
  Search,
  CheckCircle2,
  ArrowLeft,
  ChevronRight,
  ListPlus,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth, type VideoFolder } from "@/hooks/useAuth";
import { useViewerProfile } from "@/hooks/useViewerProfile";
import { catalog, type ContentItem } from "@/data/catalog";
import { gregorianToHijri } from "@/lib/hijri";
import { getAllBookmarks, removeBookmark, formatSeconds, type BookmarkEntry, BOOKMARKS_UPDATE_EVENT } from "@/lib/bookmarks";
import { getLocalWatchHistory } from "@/lib/watchHistory";
import WatchStreakBanner from "@/components/WatchStreakBanner";

type PersonalSpaceModalProps = {
  onClose: () => void;
  onPlayVideo: (id: string) => void;
  onOpenIslamicHub: () => void;
  onOpenCreatorStudio?: () => void;
};

const FOLDER_COLORS = [
  { label: "Émeraude", val: "#10b981", border: "rgba(16, 185, 129, 0.4)", bg: "rgba(16, 185, 129, 0.15)" },
  { label: "Bleu Océan", val: "#3b82f6", border: "rgba(59, 130, 246, 0.4)", bg: "rgba(59, 130, 246, 0.15)" },
  { label: "Ambre Doré", val: "#f59e0b", border: "rgba(245, 158, 11, 0.4)", bg: "rgba(245, 158, 11, 0.15)" },
  { label: "Rose Céleste", val: "#ec4899", border: "rgba(236, 72, 153, 0.4)", bg: "rgba(236, 72, 153, 0.15)" },
  { label: "Violet", val: "#8b5cf6", border: "rgba(139, 92, 246, 0.4)", bg: "rgba(139, 92, 246, 0.15)" },
  { label: "Indigo", val: "#6366f1", border: "rgba(99, 102, 241, 0.4)", bg: "rgba(99, 102, 241, 0.15)" },
  { label: "Turquoise", val: "#14b8a6", border: "rgba(20, 184, 166, 0.4)", bg: "rgba(20, 184, 166, 0.15)" },
  { label: "Rubis", val: "#ef4444", border: "rgba(239, 68, 68, 0.4)", bg: "rgba(239, 68, 68, 0.15)" },
];

const FOLDER_ICONS = [
  { key: "folder", label: "Dossier" },
  { key: "heart", label: "Cœur" },
  { key: "book", label: "Savoir / Coran" },
  { key: "sparkles", label: "Étoiles" },
  { key: "moon", label: "Nuit / Sommeil" },
  { key: "star", label: "Favori" },
  { key: "flame", label: "Inspirant" },
  { key: "bookmark", label: "Signet" },
];

function renderFolderIcon(iconKey?: string, size = 16, className = "") {
  switch (iconKey) {
    case "heart":
      return <Heart size={size} className={className} />;
    case "book":
      return <BookOpen size={size} className={className} />;
    case "sparkles":
      return <Sparkles size={size} className={className} />;
    case "moon":
      return <Moon size={size} className={className} />;
    case "star":
      return <Star size={size} className={className} />;
    case "flame":
      return <Flame size={size} className={className} />;
    case "bookmark":
      return <Bookmark size={size} className={className} />;
    case "folder":
    default:
      return <Folder size={size} className={className} />;
  }
}

export default function PersonalSpaceModal({
  onClose,
  onPlayVideo,
  onOpenIslamicHub,
  onOpenCreatorStudio,
}: PersonalSpaceModalProps) {
  const { user, firebaseUser, isGuest, isCreator, userSpace, signInWithGoogle, signInWithApple, openEmailSyncModal, signOut, updateUserSpace } = useAuth();
  const { activeProfile } = useViewerProfile();
  const [activeTab, setActiveTab] = useState<"overview" | "videos" | "favorites" | "history" | "bookmarks" | "notes" | "preferences">("overview");

  // User bookmarks state
  const [userBookmarks, setUserBookmarks] = useState<BookmarkEntry[]>(() =>
    getAllBookmarks(activeProfile?.id)
  );

  // New note state
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  // Folders management state
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [folderNameInput, setFolderNameInput] = useState("");
  const [folderColorInput, setFolderColorInput] = useState("#10b981");
  const [folderIconInput, setFolderIconInput] = useState("folder");

  // Video picker modal for folders
  const [isAddVideosModalOpen, setIsAddVideosModalOpen] = useState(false);
  const [videoSearchTerm, setVideoSearchTerm] = useState("");
  const [pickerFilter, setPickerFilter] = useState<"favorites" | "all">("favorites");

  // Quick folder assign popover for favorites
  const [quickAssignVideoId, setQuickAssignVideoId] = useState<string | null>(null);

  const hijri = gregorianToHijri();

  // Favorite items mapped from catalog
  const favoriteItems: ContentItem[] = useMemo(() => {
    return (userSpace?.myList || [])
      .map((id) => catalog.find((c) => c.id === id))
      .filter((c): c is ContentItem => c !== undefined);
  }, [userSpace?.myList]);

  // History items mapped from catalog
  const historyItems = useMemo(() => {
    return (userSpace?.history || [])
      .map((h) => {
        const item = catalog.find((c) => c.id === h.contentId);
        return item ? { ...h, item } : null;
      })
      .filter((h): h is { contentId: string; watchedAt: number; progress?: number; item: ContentItem } => h !== null);
  }, [userSpace?.history]);

  // User custom folders
  const userFolders: VideoFolder[] = userSpace?.folders || [];
  const selectedFolder = userFolders.find((f) => f.id === selectedFolderId) || null;

  // Selected folder videos mapped from catalog
  const selectedFolderVideos: ContentItem[] = useMemo(() => {
    if (!selectedFolder) return [];
    return selectedFolder.videoIds
      .map((id) => catalog.find((c) => c.id === id))
      .filter((c): c is ContentItem => c !== undefined);
  }, [selectedFolder]);

  // Total count of videos organized across all folders
  const totalFolderVideoCount = useMemo(() => {
    const uniqueIds = new Set<string>();
    userFolders.forEach((f) => f.videoIds.forEach((id) => uniqueIds.add(id)));
    return uniqueIds.size;
  }, [userFolders]);

  const showNotice = (msg: string) => {
    setSavedSuccess(msg);
    setTimeout(() => setSavedSuccess(null), 3000);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim() || !userSpace) return;

    const newNote = {
      id: "note_" + Date.now(),
      title: noteTitle.trim(),
      content: noteContent.trim(),
      date: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }),
    };

    const nextNotes = [newNote, ...(userSpace.notes || [])];
    await updateUserSpace({ notes: nextNotes });
    setNoteTitle("");
    setNoteContent("");
    setIsAddingNote(false);
    showNotice("Note spirituelle sauvegardée dans votre espace !");
  };

  const handleDeleteNote = async (id: string) => {
    if (!userSpace) return;
    const nextNotes = (userSpace.notes || []).filter((n) => n.id !== id);
    await updateUserSpace({ notes: nextNotes });
    showNotice("Note supprimée.");
  };

  // Open Create Folder
  const handleOpenCreateFolder = () => {
    setEditingFolderId(null);
    setFolderNameInput("");
    setFolderColorInput("#10b981");
    setFolderIconInput("folder");
    setIsFolderModalOpen(true);
  };

  // Quick create suggested folder
  const handleQuickCreateSuggestedFolder = async (name: string, color: string, icon: string) => {
    if (!userSpace) return;
    const newFolder: VideoFolder = {
      id: "folder_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      name,
      color,
      icon,
      createdAt: Date.now(),
      videoIds: [],
    };
    const nextFolders = [...(userSpace.folders || []), newFolder];
    await updateUserSpace({ folders: nextFolders });
    showNotice(`Dossier « ${name} » créé avec succès !`);
    setSelectedFolderId(newFolder.id);
  };

  // Open Edit Folder
  const handleOpenEditFolder = (folder: VideoFolder) => {
    setEditingFolderId(folder.id);
    setFolderNameInput(folder.name);
    setFolderColorInput(folder.color || "#10b981");
    setFolderIconInput(folder.icon || "folder");
    setIsFolderModalOpen(true);
  };

  // Save Folder (Create or Update)
  const handleSaveFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderNameInput.trim() || !userSpace) return;

    if (editingFolderId) {
      const nextFolders = (userSpace.folders || []).map((f) =>
        f.id === editingFolderId
          ? {
              ...f,
              name: folderNameInput.trim(),
              color: folderColorInput,
              icon: folderIconInput,
            }
          : f
      );
      await updateUserSpace({ folders: nextFolders });
      showNotice("Dossier modifié avec succès !");
    } else {
      const newFolder: VideoFolder = {
        id: "folder_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        name: folderNameInput.trim(),
        color: folderColorInput,
        icon: folderIconInput,
        createdAt: Date.now(),
        videoIds: [],
      };
      const nextFolders = [...(userSpace.folders || []), newFolder];
      await updateUserSpace({ folders: nextFolders });
      showNotice(`Dossier « ${folderNameInput.trim()} » créé !`);
      setSelectedFolderId(newFolder.id);
    }

    setIsFolderModalOpen(false);
    setFolderNameInput("");
    setEditingFolderId(null);
  };

  // Delete Folder
  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    if (!userSpace) return;
    if (confirm(`Voulez-vous vraiment supprimer le dossier « ${folderName} » ? Vos vidéos resteront disponibles dans votre catalogue et vos favoris.`)) {
      const nextFolders = (userSpace.folders || []).filter((f) => f.id !== folderId);
      await updateUserSpace({ folders: nextFolders });
      if (selectedFolderId === folderId) {
        setSelectedFolderId(null);
      }
      showNotice(`Dossier « ${folderName} » supprimé.`);
    }
  };

  // Toggle Video in Folder
  const handleToggleVideoInFolder = async (folderId: string, videoId: string) => {
    if (!userSpace) return;
    const nextFolders = (userSpace.folders || []).map((f) => {
      if (f.id !== folderId) return f;
      const exists = f.videoIds.includes(videoId);
      return {
        ...f,
        videoIds: exists
          ? f.videoIds.filter((id) => id !== videoId)
          : [...f.videoIds, videoId],
      };
    });
    await updateUserSpace({ folders: nextFolders });
  };

  // Filtered catalog/favorites for video picker modal
  const pickerVideos = useMemo(() => {
    const sourceList = pickerFilter === "favorites" ? favoriteItems : catalog;
    if (!videoSearchTerm.trim()) return sourceList;
    const q = videoSearchTerm.toLowerCase().trim();
    return sourceList.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        v.channel.toLowerCase().includes(q) ||
        v.categories.some((c) => c.toLowerCase().includes(q))
    );
  }, [pickerFilter, favoriteItems, videoSearchTerm]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative z-10 w-full max-w-4xl max-h-[90vh] liquid-glass-modal border border-white/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-2xl"
      >
        {/* Header with Google User Info */}
        <div className="px-6 py-5 border-b border-white/10 bg-white/5 backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            {firebaseUser?.photoURL ? (
              <img
                src={firebaseUser.photoURL}
                alt={firebaseUser.displayName || "Avatar"}
                className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-400/40 shadow-lg"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl liquid-glass-emerald border border-emerald-300/40 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                {userSpace?.displayName?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-tight">
                  {userSpace?.displayName || "Espace Personnel"}
                </h3>
                {firebaseUser ? (
                  <span className="px-2.5 py-0.5 rounded-full liquid-glass-emerald text-emerald-300 border border-emerald-400/40 text-[10px] font-bold flex items-center gap-1">
                    <Check size={10} />
                    Google Connecté
                  </span>
                ) : userSpace?.provider === "apple" ? (
                  <span className="px-2.5 py-0.5 rounded-full liquid-glass text-white border border-white/25 text-[10px] font-bold flex items-center gap-1">
                    <Check size={10} className="text-emerald-400" />
                    Apple iCloud Connecté
                  </span>
                ) : userSpace?.provider === "email" ? (
                  <span className="px-2.5 py-0.5 rounded-full liquid-glass-emerald text-emerald-300 border border-emerald-400/40 text-[10px] font-bold flex items-center gap-1">
                    <Check size={10} />
                    Email Synchronisé
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full liquid-glass text-amber-300 border border-amber-400/30 text-[10px] font-bold">
                    Mode d&apos;invitation
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-300">
                {firebaseUser?.email || "Session isolée — connectez votre propre compte email, Google ou Apple pour synchroniser tous vos appareils"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!firebaseUser && userSpace?.provider !== "apple" && userSpace?.provider !== "email" && (
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={openEmailSyncModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-400/20 hover:bg-emerald-400/30 text-emerald-200 text-xs font-bold transition-all border border-emerald-300/40 active:scale-95 shadow-sm"
                  title="Synchroniser avec votre email"
                >
                  <Mail size={13} className="text-emerald-300" />
                  <span>Email</span>
                </button>
                <button
                  onClick={signInWithGoogle}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-zinc-100 text-black text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Google</span>
                </button>
                <button
                  onClick={() => signInWithApple()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full liquid-glass hover:bg-white/15 text-white text-xs font-bold transition-all border border-white/20 active:scale-95"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.68-7.83-11.97-14.35-6.19-9.35-11.04-19.98-14.56-31.9-3.52-11.92-5.28-23.32-5.28-34.2 0-14.35 3.65-26.2 10.96-35.54 7.3-9.35 16.5-14.12 27.59-14.33 4.9 0 10.37 1.25 16.42 3.75 6.04 2.5 10.14 3.79 12.3 3.87 1.63 0 5.92-1.4 12.87-4.22 6.96-2.82 12.92-4.04 17.89-3.66 13.39.87 23.95 5.56 31.67 14.07-11.75 7.18-17.51 16.97-17.29 29.38.22 9.79 4.02 18.06 11.4 24.81 7.39 6.74 16.14 10.45 26.27 11.1-2.28 7.07-5.1 13.92-8.45 20.54zm-28.76-105.7c0 7.39-2.72 14.46-8.15 21.22-5.44 6.75-12.18 10.77-20.24 12.04-.22-1.09-.33-2.18-.33-3.26 0-7.18 2.94-14.36 8.81-21.54 5.87-7.18 12.78-11.2 20.73-12.06.11 1.2.18 2.4.18 3.6z" />
                  </svg>
                  <span>Apple</span>
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 text-zinc-300 hover:text-white rounded-full liquid-glass hover:bg-white/15 border border-white/20 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-6 pt-3 pb-2 border-b border-white/10 bg-black/30 backdrop-blur-md overflow-x-auto">
          <TabButton
            active={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
            icon={<Sparkles size={15} className="text-emerald-400" />}
            label="Vue d'ensemble"
          />
          <TabButton
            active={activeTab === "videos"}
            onClick={() => {
              setSelectedFolderId(null);
              setActiveTab("videos");
            }}
            icon={<Folder size={15} className="text-emerald-400" />}
            label={`Mes Vidéos (${userFolders.length})`}
          />
          <TabButton
            active={activeTab === "favorites"}
            onClick={() => setActiveTab("favorites")}
            icon={<Bookmark size={15} className="text-red-400" />}
            label={`Favoris (${favoriteItems.length})`}
          />
          <TabButton
            active={activeTab === "history"}
            onClick={() => setActiveTab("history")}
            icon={<Clock size={15} className="text-sky-400" />}
            label={`Historique (${historyItems.length})`}
          />
          <TabButton
            active={activeTab === "notes"}
            onClick={() => setActiveTab("notes")}
            icon={<BookOpen size={15} className="text-amber-400" />}
            label={`Carnet Spirituel (${userSpace?.notes?.length || 0})`}
          />
          <TabButton
            active={activeTab === "bookmarks"}
            onClick={() => {
              setUserBookmarks(getAllBookmarks(activeProfile?.id));
              setActiveTab("bookmarks");
            }}
            icon={<BookmarkCheck size={15} className="text-amber-400" />}
            label={`Marque-pages (${userBookmarks.length})`}
          />
          <TabButton
            active={activeTab === "preferences"}
            onClick={() => setActiveTab("preferences")}
            icon={<Settings size={15} className="text-purple-400" />}
            label="Préférences"
          />
        </div>

        {/* Notice alert */}
        {savedSuccess && (
          <div className="mx-6 mt-3 p-3 liquid-glass-emerald border border-emerald-400/40 rounded-2xl text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <Check size={16} />
            <span>{savedSuccess}</span>
          </div>
        )}

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Daily Watch Streak Banner */}
              <WatchStreakBanner
                history={getLocalWatchHistory(activeProfile?.id)}
                profileId={activeProfile?.id}
              />

              {/* Creator Studio Special Banner */}
              {isCreator && onOpenCreatorStudio && (
                <div className="p-5 rounded-2xl liquid-glass-card border border-amber-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full liquid-glass text-amber-300 border border-amber-400/40 text-[10px] font-black uppercase tracking-wider">
                        Espace Créateur Détecté
                      </span>
                      <h4 className="text-white font-bold text-sm flex items-center gap-2">
                        <Wand2 size={16} className="text-amber-400" />
                        Studio d'Édition IA
                      </h4>
                    </div>
                    <p className="text-zinc-300 text-xs max-w-lg">
                      Vous disposez des droits administrateur : générez du contenu avec l'IA, enrichissez le catalogue et publiez des annonces en temps réel.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenCreatorStudio();
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-black rounded-full transition-all shadow-lg active:scale-95 whitespace-nowrap"
                  >
                    <Wand2 size={14} />
                    Ouvrir le Studio Créateur
                  </button>
                </div>
              )}

              {/* Cloud Sync Banner if guest */}
              {!firebaseUser && userSpace?.provider !== "apple" && (
                <div className="p-5 rounded-2xl liquid-glass-emerald border border-emerald-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-white font-bold text-sm flex items-center gap-2">
                      <Sparkles size={16} className="text-emerald-400" />
                      Activez votre synchronisation Cloud Google ou Apple
                    </h4>
                    <p className="text-zinc-300 text-xs max-w-lg">
                      Retrouvez votre liste de visionnage, votre reprise exacte de lecture, vos dossiers personnalisés et vos notes sur tous vos appareils.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={signInWithGoogle}
                      className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-100 text-black text-xs font-bold rounded-full transition-all shadow-lg active:scale-95 whitespace-nowrap"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      Google
                    </button>
                    <button
                      onClick={() => signInWithApple()}
                      className="flex items-center gap-2 px-4 py-2 liquid-glass hover:bg-white/15 text-white text-xs font-bold rounded-full transition-all shadow-lg border border-white/20 active:scale-95 whitespace-nowrap"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
                        <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.68-7.83-11.97-14.35-6.19-9.35-11.04-19.98-14.56-31.9-3.52-11.92-5.28-23.32-5.28-34.2 0-14.35 3.65-26.2 10.96-35.54 7.3-9.35 16.5-14.12 27.59-14.33 4.9 0 10.37 1.25 16.42 3.75 6.04 2.5 10.14 3.79 12.3 3.87 1.63 0 5.92-1.4 12.87-4.22 6.96-2.82 12.92-4.04 17.89-3.66 13.39.87 23.95 5.56 31.67 14.07-11.75 7.18-17.51 16.97-17.29 29.38.22 9.79 4.02 18.06 11.4 24.81 7.39 6.74 16.14 10.45 26.27 11.1-2.28 7.07-5.1 13.92-8.45 20.54zm-28.76-105.7c0 7.39-2.72 14.46-8.15 21.22-5.44 6.75-12.18 10.77-20.24 12.04-.22-1.09-.33-2.18-.33-3.26 0-7.18 2.94-14.36 8.81-21.54 5.87-7.18 12.78-11.2 20.73-12.06.11 1.2.18 2.4.18 3.6z" />
                      </svg>
                      Apple (iCloud)
                    </button>
                  </div>
                </div>
              )}

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCard
                  title="Dossiers Vidéos"
                  value={userFolders.length}
                  icon={<Folder size={18} className="text-emerald-400" />}
                  onClick={() => {
                    setSelectedFolderId(null);
                    setActiveTab("videos");
                  }}
                />
                <MetricCard
                  title="Favoris enregistrés"
                  value={favoriteItems.length}
                  icon={<Bookmark size={18} className="text-red-400" />}
                  onClick={() => setActiveTab("favorites")}
                />
                <MetricCard
                  title="Vidéos visionnées"
                  value={historyItems.length}
                  icon={<Clock size={18} className="text-sky-400" />}
                  onClick={() => setActiveTab("history")}
                />
                <MetricCard
                  title="Notes spirituelles"
                  value={userSpace?.notes?.length || 0}
                  icon={<BookOpen size={18} className="text-amber-400" />}
                  onClick={() => setActiveTab("notes")}
                />
              </div>

              {/* Section Dossiers Personnalisés Shortcut */}
              <div className="p-4 sm:p-5 rounded-2xl liquid-glass-card border border-emerald-400/25 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-400/30">
                      <Folder size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Mes Dossiers Thématiques</h4>
                      <p className="text-[11px] text-zinc-300">
                        {userFolders.length > 0
                          ? `${userFolders.length} dossier(s) personnalisé(s) • ${totalFolderVideoCount} vidéo(s) classée(s)`
                          : "Classez vos vidéos favorites par thématiques"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFolderId(null);
                      setActiveTab("videos");
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full liquid-glass-emerald border border-emerald-400/40 text-emerald-200 hover:text-white text-xs font-semibold shadow-sm transition-all"
                  >
                    <span>Gérer</span>
                    <ChevronRight size={14} />
                  </button>
                </div>

                {userFolders.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                    {userFolders.slice(0, 3).map((f) => (
                      <div
                        key={f.id}
                        onClick={() => {
                          setSelectedFolderId(f.id);
                          setActiveTab("videos");
                        }}
                        className="p-3 rounded-xl liquid-glass hover:bg-white/10 border border-white/10 flex items-center gap-2.5 cursor-pointer transition-all group"
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 group-hover:scale-105 transition-transform"
                          style={{
                            backgroundColor: f.color ? `${f.color}20` : "rgba(16,185,129,0.2)",
                            borderColor: f.color ? `${f.color}50` : "rgba(16,185,129,0.4)",
                            color: f.color || "#10b981",
                          }}
                        >
                          {renderFolderIcon(f.icon, 14)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white group-hover:text-emerald-300 truncate">
                            {f.name}
                          </p>
                          <p className="text-[10px] text-zinc-400">{f.videoIds.length} vidéo(s)</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-xs text-zinc-400">Aucun dossier créé pour l'instant.</p>
                    <button
                      onClick={() => {
                        setSelectedFolderId(null);
                        setActiveTab("videos");
                        handleOpenCreateFolder();
                      }}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                    >
                      <Plus size={13} />
                      Créer un dossier
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Resume Recent Video */}
              {historyItems.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                    <span>Dernier récit visionné</span>
                    <button
                      onClick={() => setActiveTab("history")}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold"
                    >
                      Tout voir →
                    </button>
                  </h4>
                  <div
                    onClick={() => {
                      onPlayVideo(historyItems[0].item.id);
                      onClose();
                    }}
                    className="flex items-center gap-4 p-3.5 liquid-glass hover:bg-white/10 border border-white/15 rounded-2xl cursor-pointer transition-all group"
                  >
                    <img
                      src={historyItems[0].item.image}
                      alt={historyItems[0].item.title}
                      className="w-24 h-16 object-cover rounded-xl border border-white/15 flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                        {historyItems[0].item.title}
                      </p>
                      <p className="text-xs text-zinc-300 mt-0.5">
                        {historyItems[0].item.channel} • {historyItems[0].item.categories[0]}
                      </p>
                    </div>
                    <button className="px-4 py-2 rounded-full liquid-glass-emerald border border-emerald-300/40 text-emerald-100 text-xs font-semibold shadow-md whitespace-nowrap">
                      Reprendre
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: MES VIDÉOS (DOSSIERS PERSONNALISÉS) */}
          {activeTab === "videos" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* VUE 1 : DOSSIER SÉLECTIONNÉ */}
              {selectedFolder ? (
                <div className="space-y-4">
                  {/* Header Dossier */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl liquid-glass border border-white/15">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedFolderId(null)}
                        className="p-2 rounded-xl liquid-glass hover:bg-white/15 text-zinc-300 hover:text-white border border-white/10 transition-colors"
                        title="Retour à tous les dossiers"
                      >
                        <ArrowLeft size={16} />
                      </button>
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-md shrink-0"
                        style={{
                          backgroundColor: selectedFolder.color ? `${selectedFolder.color}25` : "rgba(16,185,129,0.2)",
                          borderColor: selectedFolder.color ? `${selectedFolder.color}60` : "rgba(16,185,129,0.5)",
                          color: selectedFolder.color || "#10b981",
                        }}
                      >
                        {renderFolderIcon(selectedFolder.icon, 20)}
                      </div>
                      <div>
                        <h4 className="text-base font-black text-white">{selectedFolder.name}</h4>
                        <p className="text-xs text-zinc-400">
                          {selectedFolderVideos.length} vidéo(s) dans ce dossier
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedFolderVideos.length > 0 && (
                        <button
                          onClick={() => {
                            onPlayVideo(selectedFolderVideos[0].id);
                            onClose();
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full liquid-glass-emerald border border-emerald-400/40 text-emerald-200 text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all"
                        >
                          <Play size={13} fill="currentColor" />
                          <span>Lire tout</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setVideoSearchTerm("");
                          setIsAddVideosModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full liquid-glass hover:bg-white/15 border border-white/20 text-white text-xs font-semibold shadow-sm transition-all"
                      >
                        <ListPlus size={14} className="text-emerald-400" />
                        <span>Ajouter des vidéos</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditFolder(selectedFolder)}
                        className="p-2 rounded-full liquid-glass hover:bg-white/15 text-zinc-300 hover:text-white border border-white/15 transition-colors"
                        title="Modifier le dossier"
                      >
                        <Edit3 size={14} />
                      </button>

                      <button
                        onClick={() => handleDeleteFolder(selectedFolder.id, selectedFolder.name)}
                        className="p-2 rounded-full liquid-glass hover:bg-red-500/20 text-zinc-300 hover:text-rose-400 border border-white/15 transition-colors"
                        title="Supprimer le dossier"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Liste des vidéos du dossier */}
                  {selectedFolderVideos.length === 0 ? (
                    <div className="py-14 text-center text-zinc-400 text-xs space-y-3 liquid-glass rounded-2xl border border-white/10 p-6">
                      <div
                        className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center border"
                        style={{
                          backgroundColor: selectedFolder.color ? `${selectedFolder.color}15` : "rgba(16,185,129,0.15)",
                          borderColor: selectedFolder.color ? `${selectedFolder.color}40` : "rgba(16,185,129,0.3)",
                          color: selectedFolder.color || "#10b981",
                        }}
                      >
                        {renderFolderIcon(selectedFolder.icon, 24)}
                      </div>
                      <h5 className="text-sm font-bold text-white">Ce dossier est vide</h5>
                      <p className="text-zinc-400 max-w-sm mx-auto text-xs">
                        Ajoutez vos vidéos favorites ou choisissez dans le catalogue pour organiser vos thématiques.
                      </p>
                      <button
                        onClick={() => {
                          setVideoSearchTerm("");
                          setIsAddVideosModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full liquid-glass-emerald border border-emerald-400/40 text-emerald-200 text-xs font-bold shadow-md hover:scale-105 transition-all mt-2"
                      >
                        <Plus size={14} />
                        Ajouter des vidéos à ce dossier
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedFolderVideos.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 liquid-glass hover:bg-white/10 border border-white/15 rounded-2xl transition-all group relative"
                        >
                          <div
                            onClick={() => {
                              onPlayVideo(item.id);
                              onClose();
                            }}
                            className="relative w-24 h-16 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer border border-white/15"
                          >
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 flex items-center justify-center transition-colors">
                              <div className="w-7 h-7 rounded-full bg-emerald-500/80 text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <Play size={12} fill="currentColor" className="ml-0.5" />
                              </div>
                            </div>
                            <span className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.2 rounded text-[9px] font-mono text-zinc-200">
                              {item.duration}
                            </span>
                          </div>

                          <div
                            onClick={() => {
                              onPlayVideo(item.id);
                              onClose();
                            }}
                            className="min-w-0 flex-1 cursor-pointer"
                          >
                            <p className="text-xs font-bold text-white group-hover:text-emerald-300 line-clamp-1 transition-colors">
                              {item.title}
                            </p>
                            <p className="text-[11px] text-zinc-300 mt-0.5 line-clamp-1">{item.channel}</p>
                            <span className="text-[9px] px-2 py-0.2 rounded-full liquid-glass border border-white/10 text-zinc-300 inline-block mt-1">
                              {item.categories[0]}
                            </span>
                          </div>

                          <button
                            onClick={() => handleToggleVideoInFolder(selectedFolder.id, item.id)}
                            className="p-1.5 rounded-full text-zinc-400 hover:text-rose-400 hover:bg-rose-500/15 transition-colors opacity-70 group-hover:opacity-100"
                            title="Retirer de ce dossier"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* VUE 2 : TOUS LES DOSSIERS */
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Folder className="text-emerald-400" size={17} />
                        Mes Dossiers Vidéos Personnalisés
                      </h4>
                      <p className="text-xs text-zinc-400">
                        Organisez vos récits et vidéos par thèmes, révisez et reprenez facilement vos playlists personnelles.
                      </p>
                    </div>

                    <button
                      onClick={handleOpenCreateFolder}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full liquid-glass-emerald border border-emerald-400/40 text-emerald-100 hover:text-white text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all self-start sm:self-auto"
                    >
                      <Plus size={15} />
                      Nouveau dossier
                    </button>
                  </div>

                  {userFolders.length === 0 ? (
                    <div className="py-12 px-6 rounded-2xl liquid-glass border border-white/10 text-center space-y-4">
                      <div className="w-14 h-14 mx-auto rounded-3xl liquid-glass-emerald border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-xl">
                        <FolderPlus size={28} />
                      </div>
                      <div className="space-y-1">
                        <h5 className="text-base font-bold text-white">Créez votre premier dossier vidéo</h5>
                        <p className="text-xs text-zinc-400 max-w-md mx-auto">
                          Vous pouvez créer des dossiers thématiques pour regrouper vos sourates préférées, vos rappels du vendredi, ou vos séries historiques.
                        </p>
                      </div>

                      {/* Suggestions en 1 clic */}
                      <div className="space-y-2 pt-2">
                        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                          Suggestions de dossiers rapides :
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            onClick={() => handleQuickCreateSuggestedFolder("Rappels Quotidiens", "#10b981", "sparkles")}
                            className="px-3.5 py-1.5 rounded-full liquid-glass border border-emerald-400/30 text-emerald-200 text-xs font-semibold hover:bg-emerald-500/15 transition-all"
                          >
                            + Rappels Quotidiens
                          </button>
                          <button
                            onClick={() => handleQuickCreateSuggestedFolder("Récitations du Coran", "#3b82f6", "book")}
                            className="px-3.5 py-1.5 rounded-full liquid-glass border border-blue-400/30 text-blue-200 text-xs font-semibold hover:bg-blue-500/15 transition-all"
                          >
                            + Récitations du Coran
                          </button>
                          <button
                            onClick={() => handleQuickCreateSuggestedFolder("Histoires des Prophètes", "#f59e0b", "star")}
                            className="px-3.5 py-1.5 rounded-full liquid-glass border border-amber-400/30 text-amber-200 text-xs font-semibold hover:bg-amber-500/15 transition-all"
                          >
                            + Histoires des Prophètes
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {userFolders.map((folder) => {
                        const folderVideos = folder.videoIds
                          .map((id) => catalog.find((c) => c.id === id))
                          .filter((c): c is ContentItem => c !== undefined);

                        return (
                          <div
                            key={folder.id}
                            className="p-4 rounded-2xl liquid-glass-card hover:border-emerald-400/40 border border-white/15 transition-all flex flex-col justify-between group space-y-3"
                          >
                            {/* Header de la carte */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-md shrink-0 group-hover:scale-105 transition-transform"
                                  style={{
                                    backgroundColor: folder.color ? `${folder.color}20` : "rgba(16,185,129,0.2)",
                                    borderColor: folder.color ? `${folder.color}50` : "rgba(16,185,129,0.4)",
                                    color: folder.color || "#10b981",
                                  }}
                                >
                                  {renderFolderIcon(folder.icon, 18)}
                                </div>
                                <div className="min-w-0">
                                  <h5 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                                    {folder.name}
                                  </h5>
                                  <p className="text-[11px] text-zinc-400">
                                    {folder.videoIds.length} vidéo(s) classée(s)
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditFolder(folder);
                                  }}
                                  className="p-1.5 rounded-lg liquid-glass hover:bg-white/20 text-zinc-300 hover:text-white transition-colors"
                                  title="Modifier"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFolder(folder.id, folder.name);
                                  }}
                                  className="p-1.5 rounded-lg liquid-glass hover:bg-rose-500/20 text-zinc-300 hover:text-rose-400 transition-colors"
                                  title="Supprimer"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>

                            {/* Aperçu miniature des vidéos du dossier */}
                            <div
                              onClick={() => setSelectedFolderId(folder.id)}
                              className="cursor-pointer"
                            >
                              {folderVideos.length > 0 ? (
                                <div className="flex items-center -space-x-4 overflow-hidden py-1">
                                  {folderVideos.slice(0, 3).map((v, i) => (
                                    <img
                                      key={v.id}
                                      src={v.image}
                                      alt={v.title}
                                      className="w-16 h-11 object-cover rounded-lg border-2 border-zinc-900 shadow-md flex-shrink-0"
                                      style={{ zIndex: 3 - i }}
                                    />
                                  ))}
                                  {folderVideos.length > 3 && (
                                    <div
                                      className="w-11 h-11 rounded-lg bg-zinc-800 border-2 border-zinc-900 flex items-center justify-center text-[10px] font-bold text-zinc-200 z-0"
                                    >
                                      +{folderVideos.length - 3}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="py-3 px-3 rounded-xl bg-black/20 border border-white/5 text-[11px] text-zinc-400 text-center">
                                  Dossier vide • Cliquez pour ajouter
                                </div>
                              )}
                            </div>

                            {/* Bouton d'action */}
                            <button
                              onClick={() => setSelectedFolderId(folder.id)}
                              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl liquid-glass group-hover:bg-white/15 text-xs font-semibold text-zinc-200 group-hover:text-white border border-white/10 transition-colors"
                            >
                              <span>Ouvrir le dossier</span>
                              <ChevronRight size={13} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FAVORITES */}
          {activeTab === "favorites" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-white">Vos récits et vidéos mis de côté</h4>
                  <p className="text-xs text-zinc-400">
                    Retrouvez vos vidéos favorites et organisez-les dans vos dossiers personnalisés.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedFolderId(null);
                      setActiveTab("videos");
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full liquid-glass-emerald border border-emerald-400/40 text-emerald-200 text-xs font-bold shadow-sm"
                  >
                    <Folder size={13} />
                    <span>Organiser en dossiers →</span>
                  </button>
                  <span className="text-xs text-zinc-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/10 font-mono">
                    {favoriteItems.length} vidéo(s)
                  </span>
                </div>
              </div>

              {favoriteItems.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs space-y-2">
                  <Bookmark size={32} className="mx-auto text-zinc-600 stroke-[1.5]" />
                  <p>Votre liste de favoris est vide.</p>
                  <p className="text-zinc-600">Cliquez sur l'icône Signet sous n'importe quelle vidéo pour la sauvegarder ici.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {favoriteItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 liquid-glass hover:bg-white/10 border border-white/15 rounded-2xl transition-all group relative"
                    >
                      <img
                        onClick={() => {
                          onPlayVideo(item.id);
                          onClose();
                        }}
                        src={item.image}
                        alt={item.title}
                        className="w-20 h-14 object-cover rounded-xl flex-shrink-0 border border-white/10 cursor-pointer"
                      />
                      <div
                        onClick={() => {
                          onPlayVideo(item.id);
                          onClose();
                        }}
                        className="min-w-0 flex-1 cursor-pointer"
                      >
                        <p className="text-xs font-bold text-white group-hover:text-emerald-300 line-clamp-1 transition-colors">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-zinc-300 mt-0.5 line-clamp-1">{item.channel}</p>
                      </div>

                      <button
                        onClick={() => setQuickAssignVideoId(item.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full liquid-glass hover:bg-white/20 text-zinc-300 hover:text-emerald-300 text-[10px] font-semibold border border-white/15 transition-colors shrink-0"
                        title="Classer dans un dossier"
                      >
                        <FolderPlus size={12} className="text-emerald-400" />
                        <span className="hidden sm:inline">Dossier</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: HISTORY */}
          {activeTab === "history" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">Historique de vos visionnages</h4>
                <span className="text-xs text-zinc-300">{historyItems.length} épisode(s)</span>
              </div>
              {historyItems.length === 0 ? (
                <div className="py-12 text-center text-zinc-400 text-xs space-y-2">
                  <Clock size={32} className="mx-auto text-zinc-500 stroke-[1.5]" />
                  <p>Aucun historique de visionnage enregistré pour le moment.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {historyItems.map((entry) => (
                    <div
                      key={entry.contentId + entry.watchedAt}
                      onClick={() => {
                        onPlayVideo(entry.item.id);
                        onClose();
                      }}
                      className="flex items-center justify-between p-3 liquid-glass hover:bg-white/10 border border-white/10 rounded-2xl cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={entry.item.image}
                          alt={entry.item.title}
                          className="w-16 h-11 object-cover rounded-xl flex-shrink-0 border border-white/10"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white group-hover:text-emerald-300 truncate">
                            {entry.item.title}
                          </p>
                          <p className="text-[11px] text-zinc-300">{entry.item.channel}</p>
                        </div>
                      </div>
                      <span className="text-[11px] text-zinc-400 flex-shrink-0 ml-3">
                        {new Date(entry.watchedAt).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SPIRITUAL NOTES */}
          {activeTab === "notes" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Carnet de réflexions & méditations</h4>
                  <p className="text-xs text-zinc-300">Consignez vos enseignements tirés des récits et du Coran</p>
                </div>
                {!isAddingNote && (
                  <button
                    onClick={() => setIsAddingNote(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 liquid-glass-emerald border border-emerald-300/40 text-emerald-100 text-xs font-semibold rounded-full transition-colors shadow-md"
                  >
                    <Plus size={14} />
                    Nouvelle note
                  </button>
                )}
              </div>

              {/* Note creation form */}
              {isAddingNote && (
                <form onSubmit={handleAddNote} className="p-4 rounded-2xl liquid-glass border border-emerald-400/40 space-y-3">
                  <input
                    type="text"
                    placeholder="Titre de la réflexion (ex: La patience du Prophète Ayoub...)"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    className="w-full bg-black/40 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-emerald-400"
                    required
                  />
                  <textarea
                    placeholder="Écrivez votre méditation spirituelle ou le verset marquant..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={3}
                    className="w-full bg-black/40 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-emerald-400"
                    required
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingNote(false)}
                      className="px-3.5 py-1.5 rounded-full text-xs text-zinc-300 hover:text-white liquid-glass border border-white/10"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 liquid-glass-emerald border border-emerald-400/40 text-emerald-100 text-xs font-bold rounded-full shadow-md"
                    >
                      Enregistrer la note
                    </button>
                  </div>
                </form>
              )}

              {/* Notes List */}
              {(!userSpace?.notes || userSpace.notes.length === 0) && !isAddingNote ? (
                <div className="py-12 text-center text-zinc-400 text-xs space-y-2">
                  <BookOpen size={32} className="mx-auto text-zinc-500 stroke-[1.5]" />
                  <p>Aucune note enregistrée pour le moment.</p>
                  <p className="text-zinc-500">Créez votre première note spirituelle ci-dessus pour la sauvegarder sur votre compte.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userSpace?.notes?.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 rounded-2xl liquid-glass border border-white/15 space-y-2 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-bold text-emerald-300">{note.title}</h5>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-zinc-400">{note.date}</span>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-zinc-400 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Supprimer la note"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed">
                        {note.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: BOOKMARKS */}
          {activeTab === "bookmarks" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Vos repères temporels sauvegardés</h4>
                  <p className="text-xs text-zinc-400">Moments précis marqués pendant le visionnage</p>
                </div>
                <span className="text-xs text-zinc-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/10 font-mono">
                  {userBookmarks.length} marque-page(s)
                </span>
              </div>

              {userBookmarks.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs space-y-2">
                  <BookmarkCheck size={32} className="mx-auto text-zinc-600 stroke-[1.5]" />
                  <p>Aucun repère temporel enregistré.</p>
                  <p className="text-zinc-600">Pendant la lecture d'une vidéo, cliquez sur l'icône Repère pour sauvegarder une minute exacte.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {userBookmarks.map((bm) => {
                    const matchedItem = catalog.find((c) => c.id === bm.contentId);
                    return (
                      <div
                        key={bm.id}
                        className="flex items-center justify-between p-3.5 liquid-glass hover:bg-white/10 border border-white/15 rounded-2xl transition-all group"
                      >
                        <div
                          onClick={() => {
                            onPlayVideo(bm.contentId);
                            onClose();
                          }}
                          className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer"
                        >
                          <div className="relative w-16 h-11 rounded-xl overflow-hidden flex-shrink-0 border border-white/10">
                            {matchedItem ? (
                              <img src={matchedItem.image} alt={bm.contentTitle || ""} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                <Bookmark size={14} className="text-amber-400" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-white group-hover:text-amber-300 truncate">
                              {bm.note || bm.contentTitle || "Repère"}
                            </p>
                            <p className="text-[11px] text-zinc-400 truncate">
                              {bm.contentTitle} • {formatSeconds(bm.timestampSeconds)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              onPlayVideo(bm.contentId);
                              onClose();
                            }}
                            className="px-3 py-1 rounded-full liquid-glass-emerald border border-emerald-400/40 text-emerald-200 text-xs font-bold"
                          >
                            Reprendre à {formatSeconds(bm.timestampSeconds)}
                          </button>
                          <button
                            onClick={() => {
                              removeBookmark(bm.id, activeProfile?.id);
                              setUserBookmarks(getAllBookmarks(activeProfile?.id));
                              showNotice("Marque-page supprimé.");
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 transition-colors"
                            title="Supprimer le marque-page"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: PREFERENCES */}
          {activeTab === "preferences" && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl liquid-glass border border-white/10 space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Settings size={16} className="text-purple-400" />
                  État du Compte et du Cloud
                </h4>
                <div className="flex items-center justify-between py-2 border-b border-white/10 text-xs">
                  <span className="text-zinc-300">Authentification</span>
                  <span className="text-white font-semibold">
                    {firebaseUser
                      ? `Google (${firebaseUser.email})`
                      : userSpace?.provider === "apple"
                      ? `Apple iCloud (${userSpace.email})`
                      : userSpace?.provider === "email"
                      ? `Email (${userSpace.email})`
                      : "Session Invité"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/10 text-xs">
                  <span className="text-zinc-300">Base de données Cloud</span>
                  <span className="text-emerald-300 font-semibold flex items-center gap-1">
                    <Check size={12} />
                    Google Firestore Active
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 text-xs">
                  <span className="text-zinc-300">Identifiant Unique UID</span>
                  <span className="text-zinc-400 font-mono text-[11px] truncate max-w-xs">
                    {userSpace?.userId || "guest"}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                {firebaseUser || userSpace?.provider === "apple" || userSpace?.provider === "email" ? (
                  <button
                    onClick={signOut}
                    className="w-full flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/30 font-semibold py-3 rounded-full transition-colors text-xs backdrop-blur-xl"
                  >
                    <LogOut size={16} />
                    Se déconnecter
                  </button>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                    <button
                      onClick={openEmailSyncModal}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-400/20 hover:bg-emerald-400/30 text-emerald-200 font-bold py-3 rounded-full transition-all text-xs border border-emerald-300/40 active:scale-98 shadow-sm"
                    >
                      <Mail size={15} className="text-emerald-300" />
                      <span>Connexion Email</span>
                    </button>

                    <button
                      onClick={signInWithGoogle}
                      className="w-full flex items-center justify-center gap-2 bg-white hover:bg-zinc-200 text-black font-bold py-3 rounded-full transition-all text-xs shadow-lg active:scale-98"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>Google</span>
                    </button>

                    <button
                      onClick={() => signInWithApple()}
                      className="w-full flex items-center justify-center gap-2 liquid-glass hover:bg-white/15 text-white font-bold py-3 rounded-full transition-all text-xs border border-white/20 active:scale-98"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 170 170">
                        <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.68-7.83-11.97-14.35-6.19-9.35-11.04-19.98-14.56-31.9-3.52-11.92-5.28-23.32-5.28-34.2 0-14.35 3.65-26.2 10.96-35.54 7.3-9.35 16.5-14.12 27.59-14.33 4.9 0 10.37 1.25 16.42 3.75 6.04 2.5 10.14 3.79 12.3 3.87 1.63 0 5.92-1.4 12.87-4.22 6.96-2.82 12.92-4.04 17.89-3.66 13.39.87 23.95 5.56 31.67 14.07-11.75 7.18-17.51 16.97-17.29 29.38.22 9.79 4.02 18.06 11.4 24.81 7.39 6.74 16.14 10.45 26.27 11.1-2.28 7.07-5.1 13.92-8.45 20.54zm-28.76-105.7c0 7.39-2.72 14.46-8.15 21.22-5.44 6.75-12.18 10.77-20.24 12.04-.22-1.09-.33-2.18-.33-3.26 0-7.18 2.94-14.36 8.81-21.54 5.87-7.18 12.78-11.2 20.73-12.06.11 1.2.18 2.4.18 3.6z" />
                      </svg>
                      <span>Synchro Apple</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MODAL 1: CRÉER / MODIFIER UN DOSSIER */}
        <AnimatePresence>
          {isFolderModalOpen && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-3">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={() => setIsFolderModalOpen(false)}
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                className="relative z-10 w-full max-w-md liquid-glass-modal rounded-3xl border border-white/20 p-5 sm:p-6 shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center border shadow-sm"
                      style={{
                        backgroundColor: `${folderColorInput}25`,
                        borderColor: `${folderColorInput}50`,
                        color: folderColorInput,
                      }}
                    >
                      {renderFolderIcon(folderIconInput, 16)}
                    </div>
                    <h4 className="text-base font-bold text-white">
                      {editingFolderId ? "Modifier le dossier" : "Nouveau dossier personnalisé"}
                    </h4>
                  </div>
                  <button
                    onClick={() => setIsFolderModalOpen(false)}
                    className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleSaveFolder} className="space-y-4">
                  {/* Nom du dossier */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">Nom du dossier</label>
                    <input
                      type="text"
                      placeholder="Ex: Rappels du Vendredi, Coran Apaisant..."
                      value={folderNameInput}
                      onChange={(e) => setFolderNameInput(e.target.value)}
                      maxLength={40}
                      className="w-full bg-black/40 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-400"
                      required
                      autoFocus
                    />
                  </div>

                  {/* Choix de couleur */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">Couleur d'accentuation</label>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {FOLDER_COLORS.map((c) => (
                        <button
                          key={c.val}
                          type="button"
                          onClick={() => setFolderColorInput(c.val)}
                          className={`h-8 rounded-xl border flex items-center justify-center transition-all ${
                            folderColorInput === c.val
                              ? "scale-110 shadow-lg ring-2 ring-white/50"
                              : "hover:scale-105 opacity-80"
                          }`}
                          style={{ backgroundColor: c.val, borderColor: c.border }}
                          title={c.label}
                        >
                          {folderColorInput === c.val && <Check size={14} className="text-white drop-shadow" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Choix d'icône */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">Icône représentative</label>
                    <div className="grid grid-cols-4 gap-2">
                      {FOLDER_ICONS.map((ic) => (
                        <button
                          key={ic.key}
                          type="button"
                          onClick={() => setFolderIconInput(ic.key)}
                          className={`p-2 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-medium transition-all ${
                            folderIconInput === ic.key
                              ? "bg-white/20 border-white/40 text-white font-bold shadow-md scale-105"
                              : "liquid-glass border-white/10 text-zinc-400 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          {renderFolderIcon(ic.key, 14, folderIconInput === ic.key ? "text-emerald-400" : "")}
                          <span className="truncate text-[10px]">{ic.label.split(" ")[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Boutons d'action */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsFolderModalOpen(false)}
                      className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-300 hover:text-white liquid-glass border border-white/15"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={!folderNameInput.trim()}
                      className="px-5 py-2 rounded-full liquid-glass-emerald border border-emerald-400/40 text-emerald-100 text-xs font-bold shadow-lg disabled:opacity-50 hover:scale-105 active:scale-95 transition-all"
                    >
                      {editingFolderId ? "Enregistrer" : "Créer le dossier"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 2: AJOUTER DES VIDÉOS DANS UN DOSSIER */}
        <AnimatePresence>
          {isAddVideosModalOpen && selectedFolder && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-3">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={() => setIsAddVideosModalOpen(false)}
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                className="relative z-10 w-full max-w-xl max-h-[85vh] liquid-glass-modal rounded-3xl border border-white/20 p-5 sm:p-6 shadow-2xl flex flex-col space-y-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center border shadow-sm"
                      style={{
                        backgroundColor: `${selectedFolder.color}25`,
                        borderColor: `${selectedFolder.color}50`,
                        color: selectedFolder.color,
                      }}
                    >
                      {renderFolderIcon(selectedFolder.icon, 16)}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">
                        Ajouter des vidéos à « {selectedFolder.name} »
                      </h4>
                      <p className="text-[11px] text-zinc-400">
                        {selectedFolder.videoIds.length} vidéo(s) actuellement dans ce dossier
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsAddVideosModalOpen(false)}
                    className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Filtres & Recherche */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Rechercher par titre, chaîne ou catégorie..."
                      value={videoSearchTerm}
                      onChange={(e) => setVideoSearchTerm(e.target.value)}
                      className="w-full bg-black/40 border border-white/15 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPickerFilter("favorites")}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        pickerFilter === "favorites"
                          ? "liquid-glass-emerald border border-emerald-400/40 text-emerald-200"
                          : "liquid-glass border border-white/10 text-zinc-400 hover:text-white"
                      }`}
                    >
                      Mes Favoris ({favoriteItems.length})
                    </button>
                    <button
                      onClick={() => setPickerFilter("all")}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        pickerFilter === "all"
                          ? "liquid-glass-emerald border border-emerald-400/40 text-emerald-200"
                          : "liquid-glass border border-white/10 text-zinc-400 hover:text-white"
                      }`}
                    >
                      Tout le catalogue ({catalog.length})
                    </button>
                  </div>
                </div>

                {/* Liste des vidéos sélectionnables */}
                <div className="flex-1 overflow-y-auto space-y-2 max-h-[50vh] pr-1">
                  {pickerVideos.length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-500">
                      Aucune vidéo trouvée pour votre recherche.
                    </div>
                  ) : (
                    pickerVideos.map((video) => {
                      const isAlreadyIn = selectedFolder.videoIds.includes(video.id);

                      return (
                        <div
                          key={video.id}
                          onClick={() => handleToggleVideoInFolder(selectedFolder.id, video.id)}
                          className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                            isAlreadyIn
                              ? "bg-emerald-500/15 border-emerald-400/40 text-white shadow-sm"
                              : "liquid-glass border-white/10 hover:bg-white/10 text-zinc-200"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <img
                              src={video.image}
                              alt={video.title}
                              className="w-14 h-10 object-cover rounded-lg flex-shrink-0 border border-white/10"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-white truncate">{video.title}</p>
                              <p className="text-[10px] text-zinc-400 truncate">
                                {video.channel} • {video.categories[0]}
                              </p>
                            </div>
                          </div>

                          <div className="ml-3 shrink-0">
                            {isAlreadyIn ? (
                              <div className="w-6 h-6 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center font-bold shadow-md">
                                <Check size={14} />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full border border-white/25 flex items-center justify-center text-zinc-400 hover:border-emerald-400 hover:text-emerald-400 transition-colors">
                                <Plus size={14} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-2 border-t border-white/10 flex justify-end">
                  <button
                    onClick={() => setIsAddVideosModalOpen(false)}
                    className="px-5 py-2 rounded-full liquid-glass-emerald border border-emerald-400/40 text-emerald-100 text-xs font-bold shadow-md"
                  >
                    Terminer ({selectedFolder.videoIds.length} vidéo(s))
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 3: CLASSER UNE VIDÉO FAVORITE DANS UN OU PLUSIEURS DOSSIERS */}
        <AnimatePresence>
          {quickAssignVideoId && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-3">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={() => setQuickAssignVideoId(null)}
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                className="relative z-10 w-full max-w-sm liquid-glass-modal rounded-3xl border border-white/20 p-5 shadow-2xl space-y-3.5"
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <FolderPlus size={17} className="text-emerald-400" />
                    <h4 className="text-sm font-bold text-white">Classer dans mes dossiers</h4>
                  </div>
                  <button
                    onClick={() => setQuickAssignVideoId(null)}
                    className="p-1 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white"
                  >
                    <X size={15} />
                  </button>
                </div>

                {userFolders.length === 0 ? (
                  <div className="py-6 text-center space-y-3">
                    <p className="text-xs text-zinc-400">
                      Vous n'avez pas encore créé de dossier pour organiser cette vidéo.
                    </p>
                    <button
                      onClick={() => {
                        setQuickAssignVideoId(null);
                        handleOpenCreateFolder();
                      }}
                      className="px-4 py-1.5 rounded-full liquid-glass-emerald border border-emerald-400/40 text-emerald-200 text-xs font-bold"
                    >
                      + Créer un dossier
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {userFolders.map((f) => {
                      const hasVideo = f.videoIds.includes(quickAssignVideoId);

                      return (
                        <div
                          key={f.id}
                          onClick={() => handleToggleVideoInFolder(f.id, quickAssignVideoId)}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                            hasVideo
                              ? "bg-emerald-500/15 border-emerald-400/40 text-white"
                              : "liquid-glass border-white/10 hover:bg-white/10 text-zinc-300"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center border shrink-0"
                              style={{
                                backgroundColor: f.color ? `${f.color}20` : "rgba(16,185,129,0.2)",
                                borderColor: f.color ? `${f.color}50` : "rgba(16,185,129,0.4)",
                                color: f.color || "#10b981",
                              }}
                            >
                              {renderFolderIcon(f.icon, 14)}
                            </div>
                            <span className="text-xs font-semibold truncate">{f.name}</span>
                          </div>

                          <div className="shrink-0">
                            {hasVideo ? (
                              <div className="w-5 h-5 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center font-bold">
                                <Check size={12} />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-zinc-500">
                                <Plus size={12} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setQuickAssignVideoId(null);
                      handleOpenCreateFolder();
                    }}
                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    <Plus size={12} />
                    Nouveau dossier
                  </button>
                  <button
                    onClick={() => setQuickAssignVideoId(null)}
                    className="px-4 py-1.5 rounded-full liquid-glass border border-white/20 text-xs font-bold text-white hover:bg-white/15"
                  >
                    Fermer
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
        active
          ? "liquid-glass-emerald text-emerald-200 border border-emerald-300/40 shadow-sm"
          : "liquid-glass text-zinc-300 hover:text-white hover:bg-white/15 border border-white/15"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function MetricCard({
  title,
  value,
  icon,
  onClick,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="p-4 rounded-2xl liquid-glass-card hover:border-emerald-400/40 transition-all cursor-pointer group space-y-2 border border-white/15"
    >
      <div className="flex items-center justify-between">
        <span className="p-2 rounded-xl liquid-glass text-emerald-300 border border-white/10 group-hover:bg-white/15 transition-colors">
          {icon}
        </span>
      </div>
      <div>
        <p className="text-xl font-black text-white group-hover:text-emerald-300 transition-colors">
          {value}
        </p>
        <p className="text-[11px] text-zinc-300 font-medium">{title}</p>
      </div>
    </div>
  );
}
