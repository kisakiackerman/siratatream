import { useRef, useState } from "react";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";
import type { ContentItem } from "@/data/catalog";
import VideoTitleTooltip from "@/components/VideoTitleTooltip";

interface ContentRowProps {
  label: string;
  items: ContentItem[];
  onPlay: (id: string, startSec?: number) => void;
  onInfo: (id: string) => void;
  limit?: number;
}

const FALLBACK_GRADIENTS = [
  "linear-gradient(135deg, #3f3f46 0%, #18181b 100%)",
  "linear-gradient(135deg, #44403c 0%, #1c1917 100%)",
  "linear-gradient(135deg, #3f3f46 0%, #27272a 60%, #09090b 100%)",
];

function gradientFor(id: string) {
  const sum = [...id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return FALLBACK_GRADIENTS[sum % FALLBACK_GRADIENTS.length];
}

export default function ContentRow({ label, items, onPlay, onInfo, limit }: ContentRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const visibleItems = limit ? items.slice(0, limit) : items;

  if (visibleItems.length === 0) return null;

  const scrollBy = (dir: number) => {
    scrollerRef.current?.scrollBy({ left: dir * 520, behavior: "smooth" });
  };

  return (
    <div className="group/row max-w-screen-2xl mx-auto">
      <h2 className="px-4 sm:px-6 lg:px-12 text-lg sm:text-xl font-bold text-white mb-3 flex items-center gap-2">
        <span>{label}</span>
      </h2>

      <div className="relative">
        <button
          onClick={() => scrollBy(-1)}
          aria-label="Précédent"
          className="hidden md:flex absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 items-center justify-center liquid-glass hover:bg-emerald-400/25 text-emerald-200 border border-emerald-300/30 rounded-full opacity-0 group-hover/row:opacity-100 transition-all shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)] hover:scale-105 active:scale-95"
        >
          <ChevronLeft size={24} className="text-emerald-200 mr-0.5" />
        </button>

        <div
          ref={scrollerRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto px-4 sm:px-6 lg:px-12 pt-2 pb-5 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {visibleItems.map((item) => (
            <PosterCard key={item.id} item={item} onPlay={onPlay} onInfo={onInfo} />
          ))}
        </div>

        <button
          onClick={() => scrollBy(1)}
          aria-label="Suivant"
          className="hidden md:flex absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 items-center justify-center liquid-glass hover:bg-emerald-400/25 text-emerald-200 border border-emerald-300/30 rounded-full opacity-0 group-hover/row:opacity-100 transition-all shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)] hover:scale-105 active:scale-95"
        >
          <ChevronRight size={24} className="text-emerald-200 ml-0.5" />
        </button>
      </div>
    </div>
  );
}

function PosterCard({
  item,
  onPlay,
  onInfo,
}: {
  item: ContentItem;
  onPlay: (id: string, startSec?: number) => void;
  onInfo: (id: string) => void;
}) {
  const initialImage = item.image || item.thumbnail;
  const [imgSrc, setImgSrc] = useState(initialImage);
  const [showTitleFallback, setShowTitleFallback] = useState(false);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const isPlaceholder = img.naturalWidth <= 120 && img.naturalHeight <= 90;
    if (!isPlaceholder) return;

    if (!imgSrc.includes("hqdefault")) {
      setImgSrc(`https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg`);
    } else {
      setShowTitleFallback(true);
    }
  };

  const handleImageError = () => {
    if (!imgSrc.includes("hqdefault")) {
      setImgSrc(`https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg`);
    } else {
      setShowTitleFallback(true);
    }
  };

  const badgeLabel = item.isNew
    ? "Nouveau"
    : item.isTrending
    ? "En tendance"
    : item.categories[0] || null;

  return (
    <button
      onClick={() => onInfo(item.id)}
      className="flex-shrink-0 w-36 sm:w-44 md:w-48 lg:w-52 text-left group/card focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 rounded-2xl cursor-pointer"
    >
      {/* Vignette au format portrait vertical aspect-[2/3] avec verre liquide et micro-interaction fluide */}
      <div className="video-thumb-interactive relative w-full aspect-[2/3] rounded-2xl overflow-hidden mb-2.5 bg-zinc-950 liquid-glass-card border border-emerald-300/25 shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)]">
        {showTitleFallback ? (
          <div
            className="absolute inset-0 flex items-center justify-center p-3 text-center"
            style={{ background: gradientFor(item.id) }}
          >
            <span className="text-emerald-100 font-bold text-xs leading-snug line-clamp-4">
              {item.title}
            </span>
          </div>
        ) : (
          <img
            key={item.id}
            src={imgSrc}
            alt={item.title}
            className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
            loading="lazy"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}

        {/* Dégradé bas pour lisibilité */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent pointer-events-none opacity-60 group-hover/card:opacity-80 transition-opacity" />

        {/* Badge catégorie / Nouveau / Tendance en verre liquide vert */}
        {badgeLabel && (
          <span className="absolute top-2.5 left-2.5 z-10 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-400/15 border border-emerald-300/30 text-emerald-200 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)] max-w-[85%] truncate">
            {badgeLabel}
          </span>
        )}

        {/* Score ou année en bas */}
        {item.score && (
          <div className="absolute bottom-2.5 left-2.5 z-10 text-[9px] font-bold text-emerald-300 bg-zinc-950/70 border border-emerald-400/25 px-1.5 py-0.5 rounded-md backdrop-blur-sm">
            {item.score}% match
          </div>
        )}

        {/* Bouton de lecture au survol en verre liquide vert */}
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200"
          onClick={(e) => {
            e.stopPropagation();
            onPlay(item.id);
          }}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-emerald-400/25 hover:bg-emerald-400/40 text-emerald-200 border border-emerald-300/40 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)] transform group-hover/card:scale-105 active:scale-95 transition-all">
            <Play size={20} fill="currentColor" className="ml-0.5 text-emerald-300" />
          </div>
        </div>
      </div>

      {/* Titre et détails sous la carte portrait avec tool-tip de description */}
      <VideoTitleTooltip
        item={item}
        as="p"
        titleClassName="text-xs sm:text-sm font-semibold text-white group-hover/card:text-emerald-200 transition-colors leading-snug"
        lineClamp={2}
      />
      <p className="text-[11px] text-zinc-400 truncate mt-1 flex items-center gap-1.5">
        <span className="text-emerald-400/80 font-medium truncate">{item.channel}</span>
        {item.year && (
          <>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-500 font-mono text-[10px]">{item.year}</span>
          </>
        )}
      </p>
    </button>
  );
}