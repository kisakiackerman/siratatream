import { useEffect, useState, useCallback } from "react";
import { Play, Clock, Hourglass } from "lucide-react";
import { useViewerProfile } from "@/hooks/useViewerProfile";
import { catalog, type ContentItem } from "@/data/catalog";
import { useCreatorCatalog } from "@/hooks/useCreatorCatalog";
import VideoTitleTooltip from "@/components/VideoTitleTooltip";
import {
  getLocalWatchHistory,
  HISTORY_UPDATE_EVENT,
  type StoredHistoryEntry,
} from "@/lib/watchHistory";

type ContinueWatchingRowProps = {
  onPlay: (id: string, startSeconds?: number) => void;
};

export default function ContinueWatchingRow({ onPlay }: ContinueWatchingRowProps) {
  const { activeProfile } = useViewerProfile();
  const { catalog: liveCatalog } = useCreatorCatalog();
  const [entries, setEntries] = useState<StoredHistoryEntry[]>([]);

  const loadHistory = useCallback(() => {
    if (!activeProfile?.id) {
      setEntries([]);
      return;
    }
    const list = getLocalWatchHistory(activeProfile.id);
    // Keep entries that have at least 1 second of progress
    setEntries(list.filter((i) => (i.progress_seconds || 0) > 0));
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
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  /**
   * Formate une estimation du temps restant lisible et concise
   * Ex: "12 min restantes", "1 h 15 min restantes", "45 s restantes"
   */
  const fmtRemainingTime = (sec: number) => {
    if (!sec || isNaN(sec) || sec <= 0) return null;
    const totalMinutes = Math.round(sec / 60);
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);

    if (hours > 0) {
      if (minutes > 0) {
        return `${hours} h ${minutes} min restante${hours > 1 || minutes > 1 ? "s" : ""}`;
      }
      return `${hours} h restante${hours > 1 ? "s" : ""}`;
    }

    if (totalMinutes >= 1) {
      return `${totalMinutes} min restante${totalMinutes > 1 ? "s" : ""}`;
    }

    const s = Math.floor(sec % 60);
    return `${s} s restante${s > 1 ? "s" : ""}`;
  };

  // Source du catalogue (combine catalog et vidéos personnalisées via useCreatorCatalog si présent, fallback sur catalog)
  const fullCatalog = liveCatalog && liveCatalog.length > 0 ? liveCatalog : catalog;

  const items = entries
    .map((e) => {
      const content = fullCatalog.find((c) => c.id === e.content_id) || catalog.find((c) => c.id === e.content_id);
      if (!content) return null;
      const progressSec = e.progress_seconds || 0;
      const durationSec = e.duration_seconds || 0;
      const remainingSec = durationSec > progressSec ? durationSec - progressSec : 0;
      const percent = durationSec > 0 ? Math.min(100, Math.max(3, (progressSec / durationSec) * 100)) : 10;
      return {
        ...content,
        progress: progressSec,
        duration: durationSec,
        remainingSec,
        percent,
      };
    })
    .filter((c): c is (ContentItem & { progress: number; duration: number; remainingSec: number; percent: number }) => c !== null);

  if (items.length === 0) return null;

  return (
    <div className="mb-10 animate-in fade-in duration-300">
      <div className="flex items-center justify-between px-6 lg:px-12 mb-4">
        <h2 className="text-white text-xl font-bold tracking-tight flex items-center gap-2">
          <span>Continuer à regarder</span>
          <span className="text-xs bg-emerald-400/15 border border-emerald-300/30 text-emerald-200 font-semibold px-2 py-0.5 rounded-full shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)]">
            {items.length}
          </span>
        </h2>
      </div>

      <div className="flex gap-3 sm:gap-4 overflow-x-auto px-6 lg:px-12 pt-2 pb-5 scrollbar-none">
        {items.map((item) => {
          const remainingLabel = fmtRemainingTime(item.remainingSec);

          return (
            <button
              key={item.id}
              onClick={() => onPlay(item.id, item.progress)}
              className="group/card relative flex-shrink-0 w-36 sm:w-44 md:w-48 lg:w-52 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 rounded-2xl cursor-pointer"
            >
              <div className="video-thumb-interactive relative aspect-[2/3] rounded-2xl overflow-hidden mb-2.5 bg-zinc-950 liquid-glass-card border border-emerald-300/25 shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)]">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg`;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent opacity-75 group-hover/card:opacity-90 transition-opacity" />

                {/* Play overlay button */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
                  <div className="w-12 h-12 rounded-full bg-emerald-400/25 hover:bg-emerald-400/40 text-emerald-200 border border-emerald-300/40 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)] flex items-center justify-center transform group-hover/card:scale-105 active:scale-95 transition-transform">
                    <Play size={20} fill="currentColor" className="ml-0.5 text-emerald-300" />
                  </div>
                </div>

                {/* Exact Resume Badge (position actuelle) */}
                <div className="absolute top-2.5 right-2.5 bg-emerald-400/15 backdrop-blur-xl px-2 py-0.5 rounded-full border border-emerald-300/30 text-[10px] font-bold text-emerald-200 flex items-center gap-1 shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)]">
                  <Clock size={10} className="text-emerald-400" />
                  <span>{fmtTime(item.progress)}</span>
                </div>

                {/* Badge temps restant en bas de la vignette si disponible */}
                {remainingLabel && (
                  <div className="absolute bottom-3.5 left-2.5 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 text-[10px] font-medium text-emerald-300 flex items-center gap-1 shadow-md">
                    <Hourglass size={9} className="text-emerald-400 animate-pulse" />
                    <span>-{remainingLabel.replace(" restante", "").replace("s", "")}</span>
                  </div>
                )}

                {/* Progress bar with exact percentage */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-900/90 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-300"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>

              <div>
                <VideoTitleTooltip
                  item={item}
                  as="h3"
                  titleClassName="text-white text-xs sm:text-sm font-semibold truncate group-hover/card:text-emerald-200 transition-colors"
                  lineClamp={1}
                />
                <div className="flex items-center justify-between text-zinc-400 text-[11px] mt-1 gap-1">
                  <span className="truncate max-w-[50%] text-emerald-400/80">{item.channel}</span>
                  {remainingLabel ? (
                    <span className="text-emerald-300/90 font-medium text-[10px] truncate" title={`Temps restant : ${remainingLabel}`}>
                      {remainingLabel}
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-medium text-[11px]">
                      Reprendre
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}


