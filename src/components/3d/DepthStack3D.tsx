import { useState, useCallback } from "react";
import { Play, Trash2, ChevronUp, ChevronDown, Clock, RotateCcw, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
export interface DepthStackItem {
  id?: string;
  content_id: string;
  progress_seconds: number;
  duration_seconds: number;
  title: string;
  image: string;
  youtube_id?: string;
  channel?: string;
}

interface DepthStack3DProps {
  items: DepthStackItem[];
  onPlay: (contentId: string, startSec?: number) => void;
  onDelete: (contentId: string) => void;
  fmtTime: (sec: number) => string;
}

export default function DepthStack3D({
  items,
  onPlay,
  onDelete,
  fmtTime,
}: DepthStack3DProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = useCallback(() => {
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : prev));
  }, [items.length]);

  const prev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  if (items.length === 0) return null;

  const currentItem = items[currentIndex];
  const progressSec = currentItem?.progress_seconds || 0;
  const durationSec = currentItem?.duration_seconds || 0;
  const progressPercent =
    durationSec > 0 ? Math.min(100, Math.round((progressSec / durationSec) * 100)) : 0;

  return (
    <div className="relative w-full py-6 flex flex-col items-center select-none">
      {/* 3D Stack Stage */}
      <div
        className="relative w-full max-w-xl h-[330px] sm:h-[360px] flex items-center justify-center"
        style={{ perspective: "1200px" }}
      >
        <div
          className="relative w-full h-full flex items-center justify-center"
          style={{ transformStyle: "preserve-3d" }}
        >
          {items.map((item, idx) => {
            const offset = idx - currentIndex;
            // Only render items from currentIndex up to currentIndex + 4
            if (offset < 0 || offset > 3) return null;

            const isTop = offset === 0;
            const translateZ = -offset * 52;
            const translateY = -offset * 14;
            const scale = 1 - offset * 0.055;
            const opacity = Math.max(0.2, 1 - offset * 0.24);
            const zIndex = 30 - offset * 5;

            const itemProgSec = item.progress_seconds || 0;
            const itemDurSec = item.duration_seconds || 0;
            const itemPct =
              itemDurSec > 0 ? Math.min(100, Math.round((itemProgSec / itemDurSec) * 100)) : 0;

            return (
              <motion.div
                key={item.content_id}
                layout
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{
                  opacity,
                  scale,
                  y: translateY,
                  z: translateZ,
                  transition: {
                    type: "spring",
                    stiffness: 260,
                    damping: 24,
                  },
                }}
                exit={{
                  opacity: 0,
                  x: -80,
                  rotateY: -20,
                  transition: { duration: 0.22 },
                }}
                onClick={() => {
                  if (offset !== 0) setCurrentIndex(idx);
                }}
                style={{
                  zIndex,
                  transformStyle: "preserve-3d",
                }}
                className={`absolute w-full max-w-md sm:max-w-lg rounded-2xl bg-zinc-950 border transition-all ${
                  isTop
                    ? "border-amber-400/50 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_24px_rgba(245,158,11,0.22)] cursor-default"
                    : "border-emerald-300/20 shadow-2xl cursor-pointer hover:border-emerald-300/40"
                }`}
              >
                {/* Card Surface */}
                <div
                  className="p-4 sm:p-5 rounded-2xl overflow-hidden relative"
                  style={{
                    background:
                      "linear-gradient(145deg, rgba(24, 24, 27, 0.95) 0%, rgba(9, 13, 11, 0.98) 100%)",
                    boxShadow: isTop
                      ? "inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.28), inset 0 -2px 4px 0 rgba(0, 0, 0, 0.55)"
                      : "inset 0 1px 1px 0 rgba(255, 255, 255, 0.12)",
                  }}
                >
                  <div className="flex gap-4 items-center">
                    {/* Thumbnail */}
                    <div className="relative w-32 sm:w-40 aspect-video rounded-xl overflow-hidden flex-shrink-0 bg-zinc-900 border border-white/10 shadow-md">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (!img.src.includes("hqdefault") && item.youtube_id) {
                            img.src = `https://i.ytimg.com/vi/${item.youtube_id}/hqdefault.jpg`;
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-amber-500/80 text-zinc-950 flex items-center justify-center shadow-lg">
                          <Play size={15} fill="currentColor" className="ml-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] text-amber-300 font-bold uppercase tracking-wider">
                        <Clock size={11} />
                        <span>{offset === 0 ? "Dernière visionnée" : `Historique #${idx + 1}`}</span>
                      </div>
                      <h4 className="text-white font-bold text-xs sm:text-sm line-clamp-2 leading-tight">
                        {item.title}
                      </h4>
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span>Reprendre à {fmtTime(itemProgSec)}</span>
                        {itemDurSec > 0 && <span className="font-semibold text-zinc-300">{itemPct}%</span>}
                      </div>
                    </div>
                  </div>

                  {/* Golden Progress Bar */}
                  <div className="mt-3.5 pt-3 border-t border-white/10">
                    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden shadow-inner">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                        style={{ width: `${Math.max(4, itemPct)}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions (Only on top card) */}
                  {isTop && (
                    <div className="flex items-center justify-between gap-2 mt-3.5 pt-1">
                      <button
                        onClick={() => onPlay(item.content_id, item.progress_seconds)}
                        className="flex-1 py-2 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(245,158,11,0.35)] active:scale-95 transition-all"
                      >
                        <Play size={14} fill="currentColor" />
                        <span>Reprendre la lecture</span>
                      </button>
                      <button
                        onClick={() => onDelete(item.content_id)}
                        title="Retirer de l'historique"
                        className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/25 border border-white/10 hover:border-rose-400/30 text-zinc-300 hover:text-rose-200 transition-all active:scale-90"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Stack Navigation Controls */}
      <div className="flex items-center gap-4 mt-2 z-20">
        <button
          onClick={prev}
          disabled={currentIndex === 0}
          className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs text-zinc-200 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all shadow-md active:scale-95"
        >
          <ChevronUp size={15} />
          <span>Plus récent</span>
        </button>

        <span className="text-xs text-zinc-400 font-mono">
          {currentIndex + 1} / {items.length}
        </span>

        <button
          onClick={next}
          disabled={currentIndex === items.length - 1}
          className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs text-zinc-200 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all shadow-md active:scale-95"
        >
          <span>Plus ancien</span>
          <ChevronDown size={15} />
        </button>
      </div>
    </div>
  );
}
