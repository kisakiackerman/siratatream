import { useRef } from "react";
import { Zap, ChevronLeft, ChevronRight, Play, Eye, LayoutGrid } from "lucide-react";
import { allShortsList } from "@/data/shortsCatalog";
import type { ContentItem } from "@/data/catalog";

type ShortsRowProps = {
  onOpenShorts: (id?: string) => void;
  onOpenCatalog?: () => void;
};

export default function ShortsRow({ onOpenShorts, onOpenCatalog }: ShortsRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const previewShorts = allShortsList.slice(0, 16);

  const scrollBy = (dir: number) => {
    scrollerRef.current?.scrollBy({ left: dir * 420, behavior: "smooth" });
  };

  return (
    <div className="group/row max-w-screen-2xl mx-auto my-6">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-12 flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-sm">
            <Zap size={18} className="fill-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
              <span>Short</span>
            </h2>
            <p className="text-xs text-zinc-400">
              Catalogue & flux vidéo vertical
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenCatalog && (
            <button
              type="button"
              onClick={onOpenCatalog}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.18] border border-white/25 text-zinc-200 hover:text-white text-xs font-semibold backdrop-blur-2xl transition-all active:scale-95 shadow-sm"
              aria-label="Ouvrir le catalogue des Shorts"
            >
              <LayoutGrid size={13} className="text-emerald-400" />
              <span>Catalogue ({allShortsList.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenShorts()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.12] hover:bg-white/[0.22] border border-white/30 text-emerald-300 hover:text-emerald-200 text-xs font-bold backdrop-blur-2xl shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.4),0_4px_16px_rgba(0,0,0,0.3)] transition-all active:scale-95"
          >
            <span>Lancer le flux</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Horizontal Carousel of Vertical 9:16 Cards */}
      <div className="relative">
        <button
          onClick={() => scrollBy(-1)}
          aria-label="Faire défiler vers la gauche"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/[0.12] hover:bg-white/[0.25] text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all backdrop-blur-2xl border border-white/30 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.4),0_6px_20px_rgba(0,0,0,0.5)] active:scale-95"
        >
          <ChevronLeft size={20} />
        </button>

        <div
          ref={scrollerRef}
          className="flex gap-3 overflow-x-auto px-4 sm:px-6 lg:px-12 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth"
        >
          {previewShorts.map((item: ContentItem) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpenShorts(item.id)}
              className="group/card flex-shrink-0 w-36 sm:w-44 aspect-[9/16] rounded-2xl overflow-hidden relative bg-zinc-900 border border-zinc-800 hover:border-emerald-400/60 shadow-md hover:shadow-[0_0_20px_rgba(52,211,153,0.2)] transition-all duration-300 transform hover:-translate-y-1 text-left"
            >
              {/* Thumbnail */}
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300 filter brightness-90 group-hover/card:brightness-100"
                loading="lazy"
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />

              {/* Top Zap Badge */}
              <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-[10px] font-bold text-emerald-300">
                <Zap size={10} className="fill-emerald-400 text-emerald-400" />
                <span>Short</span>
              </div>

              {/* Play icon hover overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity bg-black/30 backdrop-blur-[1px]">
                <div className="w-10 h-10 rounded-full bg-emerald-400 text-zinc-950 flex items-center justify-center shadow-lg transform scale-90 group-hover/card:scale-100 transition-transform">
                  <Play size={18} className="fill-current ml-0.5" />
                </div>
              </div>

              {/* Bottom Info */}
              <div className="absolute bottom-2.5 inset-x-2.5 space-y-1">
                <span className="text-[10px] font-semibold text-emerald-400 line-clamp-1">
                  {item.categories[0] || "Towards Eternity"}
                </span>
                <p className="text-white text-xs font-bold leading-snug line-clamp-2 drop-shadow-md">
                  {item.title}
                </p>
                <div className="flex items-center gap-1 text-zinc-400 text-[10px]">
                  <Eye size={11} className="text-zinc-500" />
                  <span>{item.duration || "00:59"}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={() => scrollBy(1)}
          aria-label="Faire défiler vers la droite"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/[0.12] hover:bg-white/[0.25] text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all backdrop-blur-2xl border border-white/30 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.4),0_6px_20px_rgba(0,0,0,0.5)] active:scale-95"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
