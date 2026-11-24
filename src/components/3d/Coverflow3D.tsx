import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Trash2, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { ContentItem } from "@/data/catalog";

interface CoverflowItem {
  id: string;
  youtubeId: string;
  title: string;
  image: string;
  channel?: string;
  duration?: string;
  categories?: string[];
}

interface Coverflow3DProps {
  items: CoverflowItem[];
  onPlay: (id: string) => void;
  onRemove: (id: string) => void;
}

export default function Coverflow3D({ items, onPlay, onRemove }: Coverflow3DProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  // Keep activeIndex within bounds if items change
  useEffect(() => {
    if (activeIndex >= items.length && items.length > 0) {
      setActiveIndex(items.length - 1);
    }
  }, [items.length, activeIndex]);

  const next = useCallback(() => {
    setActiveIndex((prev) => (prev < items.length - 1 ? prev + 1 : prev));
  }, [items.length]);

  const prev = useCallback(() => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Enter" && items[activeIndex]) {
        onPlay(items[activeIndex].id);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [next, prev, items, activeIndex, onPlay]);

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 45) next();
    else if (diff < -45) prev();
    touchStartX.current = null;
  };

  if (items.length === 0) return null;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative w-full py-8 flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ perspective: "1100px" }}
    >
      {/* 3D Stage */}
      <div
        className="relative w-full h-[360px] sm:h-[420px] flex items-center justify-center"
        style={{ transformStyle: "preserve-3d" }}
      >
        <AnimatePresence>
          {items.map((item, idx) => {
            const offset = idx - activeIndex;
            // Only render items within a visible window (-3 to +3) for performance
            if (Math.abs(offset) > 3) return null;

            const isCenter = offset === 0;
            const rotateY = isCenter ? 0 : offset < 0 ? 38 : -38;
            const translateX = isCenter
              ? 0
              : offset < 0
              ? `${offset * 75 - 35}px`
              : `${offset * 75 + 35}px`;
            const translateZ = isCenter ? 65 : -Math.abs(offset) * 55;
            const scale = isCenter ? 1.05 : Math.max(0.72, 0.9 - Math.abs(offset) * 0.08);
            const opacity = isCenter ? 1 : Math.max(0.35, 0.85 - Math.abs(offset) * 0.2);
            const zIndex = 50 - Math.abs(offset) * 10;

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.8, y: 30 }}
                animate={{
                  opacity,
                  scale,
                  x: translateX,
                  z: translateZ,
                  rotateY,
                  transition: {
                    type: "spring",
                    stiffness: 280,
                    damping: 26,
                  },
                }}
                exit={{
                  opacity: 0,
                  scale: 0.6,
                  y: -50,
                  rotateX: 45,
                  transition: { duration: 0.25 },
                }}
                onClick={() => {
                  if (isCenter) {
                    onPlay(item.id);
                  } else {
                    setActiveIndex(idx);
                  }
                }}
                style={{
                  zIndex,
                  transformStyle: "preserve-3d",
                }}
                className={`absolute w-56 sm:w-64 aspect-[2/3] rounded-2xl cursor-pointer ${
                  isCenter ? "shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_30px_rgba(245,158,11,0.25)]" : "shadow-xl"
                }`}
              >
                {/* Poster Card Surface */}
                <div
                  className={`w-full h-full rounded-2xl overflow-hidden relative border transition-colors ${
                    isCenter
                      ? "border-amber-400/60 bg-zinc-900"
                      : "border-emerald-300/20 bg-zinc-950 opacity-90 hover:opacity-100"
                  }`}
                  style={{
                    boxShadow: isCenter
                      ? "inset 0 2px 2px 0 rgba(255, 255, 255, 0.35), inset 0 -3px 6px 0 rgba(0, 0, 0, 0.6)"
                      : "inset 0 1px 1px 0 rgba(255, 255, 255, 0.15)",
                  }}
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (!img.src.includes("hqdefault")) {
                        img.src = `https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg`;
                      }
                    }}
                  />

                  {/* Gradient lighting & title overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/25 to-transparent flex flex-col justify-end p-4">
                    {item.channel && (
                      <span className="text-[10px] text-amber-300 font-semibold uppercase tracking-wider mb-0.5 truncate">
                        {item.channel}
                      </span>
                    )}
                    <h3 className="text-white font-bold text-xs sm:text-sm line-clamp-2 leading-tight">
                      {item.title}
                    </h3>

                    {/* Center action buttons */}
                    {isCenter && (
                      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlay(item.id);
                          }}
                          className="flex-1 py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(245,158,11,0.4)] active:scale-95 transition-all"
                        >
                          <Play size={14} fill="currentColor" />
                          <span>Visionner</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemove(item.id);
                          }}
                          title="Retirer des favoris"
                          className="w-8 h-8 rounded-xl bg-white/10 hover:bg-rose-500/30 border border-white/15 hover:border-rose-400/40 text-zinc-300 hover:text-rose-200 flex items-center justify-center transition-all active:scale-90"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Golden badge on active card */}
                  {isCenter && (
                    <div className="absolute top-3 left-3 bg-amber-500/30 border border-amber-300/40 text-amber-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-md">
                      ★ Favori #{idx + 1}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Navigation Controls & Pagination indicator */}
      <div className="flex items-center gap-4 mt-4 z-20">
        <button
          onClick={prev}
          disabled={activeIndex === 0}
          aria-label="Précédent"
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-zinc-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900/80 border border-emerald-300/20 rounded-full backdrop-blur-md">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? "w-6 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                  : "w-1.5 bg-zinc-600 hover:bg-zinc-400"
              }`}
              aria-label={`Aller au favori ${i + 1}`}
            />
          ))}
        </div>

        <button
          onClick={next}
          disabled={activeIndex === items.length - 1}
          aria-label="Suivant"
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-zinc-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
