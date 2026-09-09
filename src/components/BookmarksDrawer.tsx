import { useState, useEffect, useMemo } from "react";
import {
  Bookmark,
  BookmarkPlus,
  Trash2,
  Play,
  X,
  Clock,
  Check,
  Film,
  ExternalLink,
} from "lucide-react";
import { motion } from "motion/react";
import {
  getAllBookmarks,
  getBookmarksForContent,
  addBookmark,
  removeBookmark,
  formatSeconds,
  type BookmarkEntry,
  BOOKMARKS_UPDATE_EVENT,
} from "@/lib/bookmarks";

type BookmarksDrawerProps = {
  profileId: string;
  currentContentId?: string;
  currentContentTitle?: string;
  currentThumbnail?: string;
  currentChannel?: string;
  currentTimeSec?: number;
  onJumpToTime?: (sec: number) => void;
  onPlayItem?: (contentId: string, timestampSec: number) => void;
  onClose: () => void;
};

export default function BookmarksDrawer({
  profileId,
  currentContentId,
  currentContentTitle,
  currentThumbnail,
  currentChannel,
  currentTimeSec = 0,
  onJumpToTime,
  onPlayItem,
  onClose,
}: BookmarksDrawerProps) {
  const [activeTab, setActiveTab] = useState<"current" | "all">(
    currentContentId ? "current" : "all"
  );
  const [newNote, setNewNote] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [bookmarksList, setBookmarksList] = useState<BookmarkEntry[]>(() =>
    getAllBookmarks(profileId)
  );

  const reloadBookmarks = () => {
    setBookmarksList(getAllBookmarks(profileId));
  };

  useEffect(() => {
    const handleUpdate = () => reloadBookmarks();
    window.addEventListener(BOOKMARKS_UPDATE_EVENT, handleUpdate);
    return () => window.removeEventListener(BOOKMARKS_UPDATE_EVENT, handleUpdate);
  }, [profileId]);

  const currentBookmarks = useMemo(() => {
    if (!currentContentId) return [];
    return bookmarksList
      .filter((b) => b.contentId === currentContentId)
      .sort((a, b) => a.timestampSeconds - b.timestampSeconds);
  }, [bookmarksList, currentContentId]);

  const displayedBookmarks = activeTab === "current" ? currentBookmarks : bookmarksList;

  const handleCreateBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentContentId) return;

    addBookmark(profileId, {
      contentId: currentContentId,
      contentTitle: currentContentTitle,
      thumbnail: currentThumbnail,
      channel: currentChannel,
      timestampSeconds: currentTimeSec,
      note: newNote.trim() || undefined,
    });

    setNewNote("");
    setIsAdding(false);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 2200);
    reloadBookmarks();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeBookmark(profileId, id);
    reloadBookmarks();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="relative w-full max-w-md h-full bg-zinc-950/95 border-l border-white/15 backdrop-blur-2xl flex flex-col overflow-hidden text-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shadow-md">
              <Bookmark size={17} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Marque-pages temporels</h3>
              <p className="text-[11px] text-zinc-400">Sauvegardez vos passages clés préférés</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full liquid-glass hover:bg-white/15 text-zinc-400 hover:text-white flex items-center justify-center transition-all border border-white/15"
            aria-label="Fermer les marque-pages"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher if within a video */}
        {currentContentId && (
          <div className="flex items-center gap-2 px-5 py-2.5 border-b border-white/10 bg-black/40 text-xs">
            <button
              onClick={() => setActiveTab("current")}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === "current"
                  ? "bg-amber-500/25 text-amber-200 border border-amber-400/40 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Cette vidéo ({currentBookmarks.length})
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === "all"
                  ? "bg-amber-500/25 text-amber-200 border border-amber-400/40 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Tous mes marque-pages ({bookmarksList.length})
            </button>
          </div>
        )}

        {/* Quick Add Banner when inside video */}
        {currentContentId && (
          <div className="p-4 border-b border-white/10 bg-gradient-to-r from-amber-950/20 via-zinc-900/40 to-emerald-950/20">
            {isAdding ? (
              <form onSubmit={handleCreateBookmark} className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-amber-300 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} />
                    Nouveau marque-page à {formatSeconds(currentTimeSec)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="text-zinc-400 hover:text-white"
                  >
                    Annuler
                  </button>
                </div>
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Note ou titre du passage (ex: Citation clé...)"
                  className="w-full px-3 py-2 rounded-xl liquid-glass border border-white/20 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/60"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-amber-500/30 hover:bg-amber-500/40 text-amber-200 border border-amber-400/40 text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
                  >
                    <Check size={13} />
                    <span>Enregistrer le marque-page</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold text-[11px]">
                    {formatSeconds(currentTimeSec)}
                  </span>
                  <span className="text-zinc-400 truncate text-[11px]">Minutage actuel de la lecture</span>
                </div>

                <button
                  onClick={() => setIsAdding(true)}
                  className="px-3 py-1.5 rounded-xl liquid-glass-emerald text-emerald-200 hover:text-white border border-emerald-400/40 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0"
                >
                  <BookmarkPlus size={14} className="text-emerald-300" />
                  <span>Marquer ce moment</span>
                </button>
              </div>
            )}

            {addedFeedback && (
              <div className="mt-2 text-xs text-emerald-300 flex items-center gap-1 bg-emerald-500/15 p-2 rounded-lg border border-emerald-500/30">
                <Check size={13} />
                <span>Marque-page ajouté avec succès !</span>
              </div>
            )}
          </div>
        )}

        {/* Bookmarks List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {displayedBookmarks.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-zinc-500">
              <Bookmark size={36} className="mb-3 opacity-40 text-zinc-400" />
              <p className="text-sm font-semibold text-zinc-300 mb-1">Aucun marque-page enregistré</p>
              <p className="text-xs text-zinc-500 max-w-xs">
                {activeTab === "current"
                  ? "Ajoutez un marque-page à tout moment pour retrouver instantanément vos passages préférés."
                  : "Vos moments sauvegardés dans les vidéos apparaîtront ici."}
              </p>
            </div>
          ) : (
            displayedBookmarks.map((bm) => {
              const isCurrentVideo = bm.contentId === currentContentId;

              return (
                <div
                  key={bm.id}
                  onClick={() => {
                    if (isCurrentVideo && onJumpToTime) {
                      onJumpToTime(bm.timestampSeconds);
                      onClose();
                    } else if (onPlayItem) {
                      onPlayItem(bm.contentId, bm.timestampSeconds);
                      onClose();
                    }
                  }}
                  className="group relative rounded-xl liquid-glass-card p-3.5 border border-white/10 hover:border-amber-400/40 transition-all cursor-pointer flex items-start justify-between gap-3 shadow-md"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Time Badge or Thumbnail */}
                    <div className="flex flex-col items-center shrink-0">
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/30 text-amber-300 font-mono font-bold text-xs">
                        <Clock size={11} />
                        {bm.formattedTime}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-semibold text-zinc-100 group-hover:text-amber-200 transition-colors line-clamp-2">
                        {bm.note || "Sans titre"}
                      </p>

                      {activeTab === "all" && bm.contentTitle && (
                        <p className="text-[11px] text-zinc-400 truncate mt-1 flex items-center gap-1">
                          <Film size={11} className="text-zinc-500 shrink-0" />
                          <span>{bm.contentTitle}</span>
                        </p>
                      )}

                      <p className="text-[10px] text-zinc-500 mt-1">
                        {new Date(bm.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isCurrentVideo && onJumpToTime) {
                          onJumpToTime(bm.timestampSeconds);
                          onClose();
                        } else if (onPlayItem) {
                          onPlayItem(bm.contentId, bm.timestampSeconds);
                          onClose();
                        }
                      }}
                      className="p-1.5 rounded-lg liquid-glass hover:bg-amber-500/25 text-amber-300 border border-white/10 transition-all"
                      title="Lire à partir de ce minutage"
                      aria-label="Lire ce marque-page"
                    >
                      <Play size={14} fill="currentColor" />
                    </button>

                    <button
                      onClick={(e) => handleDelete(bm.id, e)}
                      className="p-1.5 rounded-lg liquid-glass hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 border border-white/10 transition-all"
                      title="Supprimer ce marque-page"
                      aria-label="Supprimer le marque-page"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3.5 border-t border-white/10 bg-black/40 text-[11px] text-zinc-400 text-center">
          Synchronisé avec vos préférences de visionnage
        </div>
      </motion.div>
    </div>
  );
}
