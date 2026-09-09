import { useEffect, useState, useCallback } from "react";
import { X, Play, Clock, Trash2, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { useViewerProfile } from "@/hooks/useViewerProfile";
import { catalog } from "@/data/catalog";
import {
  getLocalWatchHistory,
  removeWatchHistoryEntry,
  HISTORY_UPDATE_EVENT,
  type StoredHistoryEntry,
} from "@/lib/watchHistory";

type WatchHistoryModalProps = {
  onClose: () => void;
  onPlay: (contentId: string, startSeconds?: number) => void;
};

export default function WatchHistoryModal({ onClose, onPlay }: WatchHistoryModalProps) {
  const { activeProfile } = useViewerProfile();
  const [items, setItems] = useState<StoredHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

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

  const loadHistory = useCallback(() => {
    if (!activeProfile?.id) {
      setItems([]);
      setLoading(false);
      return;
    }
    const list = getLocalWatchHistory(activeProfile.id);
    setItems(list.filter((i) => (i.progress_seconds || 0) > 0));
    setLoading(false);
  }, [activeProfile?.id]);

  useEffect(() => {
    loadHistory();

    const handleUpdate = () => {
      loadHistory();
    };

    window.addEventListener(HISTORY_UPDATE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(HISTORY_UPDATE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [loadHistory]);

  const fmtTime = (sec: number) => {
    if (!sec || isNaN(sec)) return "0:00";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s.toString().padStart(2, "0")}s`;
  };

  const handleDelete = (contentId: string) => {
    if (!activeProfile) return;
    removeWatchHistoryEntry(activeProfile.id, contentId);
    setItems((prev) => prev.filter((i) => i.content_id !== contentId));
  };

  const handleClearAll = () => {
    if (!activeProfile) return;
    try {
      localStorage.removeItem("nexstream_history_" + activeProfile.id);
      setItems([]);
      setToastMsg("Historique effacé avec succès");
      setTimeout(() => setToastMsg(null), 2500);
    } catch {
      // ignore
    }
  };

  const handlePlay = (contentId: string, startSec?: number) => {
    onClose();
    onPlay(contentId, startSec);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 14 }}
        transition={{ type: "spring", damping: 28, stiffness: 350 }}
        className="relative z-10 bg-zinc-950/85 backdrop-blur-2xl border border-white/15 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center border border-white/10">
              <Clock size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Historique de visionnage</h2>
              <p className="text-xs text-zinc-400">
                {items.length} vidéo{items.length > 1 ? "s" : ""} · Reprise automatique à la seconde exacte
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/10 transition-colors"
              >
                Tout effacer
              </button>
            )}
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {toastMsg && (
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-2.5 text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle2 size={14} />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="text-center py-12 text-zinc-500 text-sm">Chargement...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-sm">
              Aucun historique pour ce profil. Vos vidéos visionnées s'enregistreront automatiquement à la seconde près.
            </div>
          ) : (
            items.map((entry) => {
              const content = catalog.find((c) => c.id === entry.content_id);
              if (!content) return null;
              const progressSec = entry.progress_seconds || 0;
              const durationSec = entry.duration_seconds || 1;
              const pct = durationSec > 0 ? Math.min(100, Math.max(3, (progressSec / durationSec) * 100)) : 10;

              return (
                <div
                  key={entry.id || entry.content_id}
                  className="flex items-center gap-4 bg-zinc-950/60 hover:bg-zinc-800/60 p-3 rounded-xl border border-zinc-800/80 transition-colors group"
                >
                  <div
                    className="video-thumb-interactive relative w-28 aspect-video rounded-lg overflow-hidden flex-shrink-0 cursor-pointer bg-zinc-900"
                    onClick={() => handlePlay(content.id, progressSec)}
                  >
                    <img
                      src={content.image}
                      alt={content.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${content.youtubeId}/hqdefault.jpg`;
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play size={20} className="text-white fill-white" />
                    </div>
                    {/* Progress Bar preview */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
                      <div className="h-full bg-red-600" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => handlePlay(content.id, progressSec)}
                  >
                    <h3 className="text-sm font-semibold text-white truncate group-hover:text-red-400 transition-colors">
                      {content.title}
                    </h3>
                    <p className="text-xs text-zinc-400 truncate">{content.channel}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[11px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Clock size={11} /> Reprendre à {fmtTime(progressSec)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(content.id)}
                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors flex-shrink-0"
                    title="Supprimer de l'historique"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}

