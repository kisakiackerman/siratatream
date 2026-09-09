import { useState } from "react";
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
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/hooks/useAuth";
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

export default function PersonalSpaceModal({
  onClose,
  onPlayVideo,
  onOpenIslamicHub,
  onOpenCreatorStudio,
}: PersonalSpaceModalProps) {
  const { user, firebaseUser, isGuest, isCreator, userSpace, signInWithGoogle, signInWithApple, signOut, updateUserSpace } = useAuth();
  const { activeProfile } = useViewerProfile();
  const [activeTab, setActiveTab] = useState<"overview" | "favorites" | "history" | "bookmarks" | "notes" | "preferences">("overview");

  // User bookmarks state
  const [userBookmarks, setUserBookmarks] = useState<BookmarkEntry[]>(() =>
    getAllBookmarks(activeProfile?.id)
  );

  // New note state
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  const hijri = gregorianToHijri();

  // Favorite items mapped from catalog
  const favoriteItems: ContentItem[] = (userSpace?.myList || [])
    .map((id) => catalog.find((c) => c.id === id))
    .filter((c): c is ContentItem => c !== undefined);

  // History items mapped from catalog
  const historyItems = (userSpace?.history || [])
    .map((h) => {
      const item = catalog.find((c) => c.id === h.contentId);
      return item ? { ...h, item } : null;
    })
    .filter((h): h is { contentId: string; watchedAt: number; progress?: number; item: ContentItem } => h !== null);

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

  const showNotice = (msg: string) => {
    setSavedSuccess(msg);
    setTimeout(() => setSavedSuccess(null), 3000);
  };

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
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full liquid-glass text-amber-300 border border-amber-400/30 text-[10px] font-bold">
                    Mode Invité
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-300">
                {userSpace?.email || firebaseUser?.email || "Connectez votre compte Google ou Apple pour synchroniser tous vos appareils"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!firebaseUser && userSpace?.provider !== "apple" && (
              <div className="hidden sm:flex items-center gap-2">
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
                      Retrouvez votre liste de visionnage, votre reprise exacte de lecture et vos notes personnelles sur votre iPhone, iPad, smartphone Android et ordinateur.
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
                <MetricCard
                  title="Date Hégirienne"
                  value={`${hijri.day} ${hijri.monthName.split(" ")[0]}`}
                  icon={<Calendar size={18} className="text-emerald-400" />}
                  onClick={onOpenIslamicHub}
                />
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

          {/* TAB 2: FAVORITES */}
          {activeTab === "favorites" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">Vos récits et vidéos mis de côté</h4>
                <span className="text-xs text-zinc-400">{favoriteItems.length} vidéo(s)</span>
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
                      onClick={() => {
                        onPlayVideo(item.id);
                        onClose();
                      }}
                      className="flex items-center gap-3 p-3 liquid-glass hover:bg-white/10 border border-white/15 rounded-2xl cursor-pointer transition-all group"
                    >
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-20 h-14 object-cover rounded-xl flex-shrink-0 border border-white/10"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white group-hover:text-emerald-300 line-clamp-1">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-zinc-300 mt-0.5 line-clamp-1">{item.channel}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: HISTORY */}
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
                <div className="space-y-2">
                  {historyItems.map((entry) => (
                    <div
                      key={entry.contentId + entry.watchedAt}
                      onClick={() => {
                        onPlayVideo(entry.item.id);
                        onClose();
                      }}
                      className="flex items-center justify-between p-3 liquid-glass hover:bg-white/10 border border-white/15 rounded-2xl cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={entry.item.image}
                          alt={entry.item.title}
                          className="w-16 h-12 object-cover rounded-xl flex-shrink-0 border border-white/10"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white group-hover:text-emerald-300 line-clamp-1">
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

          {/* TAB 4: SPIRITUAL NOTES */}
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

          {/* TAB: BOOKMARKS */}
          {activeTab === "bookmarks" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <BookmarkCheck size={16} className="text-amber-400" />
                    <span>Mes Marque-pages Temporels ({userBookmarks.length})</span>
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Retrouvez et reprenez la lecture exactement au minutage que vous avez marqué
                  </p>
                </div>
              </div>

              {userBookmarks.length === 0 ? (
                <div className="py-14 text-center text-zinc-400 text-xs space-y-2 liquid-glass-card rounded-2xl p-8 border border-white/10">
                  <Bookmark size={36} className="mx-auto text-zinc-500 stroke-[1.5] opacity-50" />
                  <p className="text-zinc-200 font-semibold text-sm">Aucun marque-page enregistré pour le moment.</p>
                  <p className="text-zinc-500 max-w-sm mx-auto">
                    Dans le lecteur vidéo, cliquez sur l'icône de marque-page pour sauvegarder un minutage ou une citation mémorable.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {userBookmarks.map((bm) => (
                    <div
                      key={bm.id}
                      className="p-4 rounded-2xl liquid-glass-card border border-amber-400/20 hover:border-amber-400/40 transition-all flex flex-col justify-between gap-3 shadow-lg group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30 font-mono font-bold text-xs flex items-center gap-1">
                            <Clock size={11} />
                            {bm.formattedTime}
                          </span>
                          <button
                            onClick={() => {
                              removeBookmark(activeProfile?.id || "guest", bm.id);
                              setUserBookmarks((prev) => prev.filter((b) => b.id !== bm.id));
                              showNotice("Marque-page supprimé.");
                            }}
                            className="text-zinc-400 hover:text-red-400 p-1 transition-colors"
                            title="Supprimer le marque-page"
                            aria-label="Supprimer le marque-page"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <h5 className="text-xs sm:text-sm font-bold text-zinc-100 line-clamp-2">
                          {bm.note || "Sans titre"}
                        </h5>

                        {bm.contentTitle && (
                          <p className="text-[11px] text-zinc-400 truncate">
                            {bm.contentTitle}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500">
                          {new Date(bm.createdAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>

                        <button
                          onClick={() => {
                            onPlayVideo(bm.contentId);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                        >
                          <Play size={12} fill="currentColor" />
                          <span>Lancer la lecture</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PREFERENCES */}
          {activeTab === "preferences" && (
            <div className="space-y-6">
              <div className="liquid-glass p-5 rounded-2xl border border-white/15 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                  <CloudCheck size={16} className="text-emerald-400" />
                  État du Compte et du Cloud
                </h4>
                <div className="flex items-center justify-between py-2 border-b border-white/10 text-xs">
                  <span className="text-zinc-300">Authentification</span>
                  <span className="text-white font-semibold">
                    {firebaseUser
                      ? `Google (${firebaseUser.email})`
                      : userSpace?.provider === "apple"
                      ? `Apple iCloud (${userSpace.email})`
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
                {firebaseUser || userSpace?.provider === "apple" ? (
                  <button
                    onClick={signOut}
                    className="w-full flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/30 font-semibold py-3 rounded-full transition-colors text-xs backdrop-blur-xl"
                  >
                    <LogOut size={16} />
                    Se déconnecter
                  </button>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
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
                      <span>Connexion Google</span>
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
