import { useState, useEffect, useMemo, useCallback } from "react";
import { Play, Info, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { catalog as defaultCatalog, type ContentItem, type Category } from "@/data/catalog";
import { useCreatorCatalog } from "@/hooks/useCreatorCatalog";

interface HeroProps {
  onPlay: (id: string, startSec?: number) => void;
  onInfo: (id: string) => void;
  onOpenAI?: () => void;
  categoryTab?: string;
}

const FALLBACK_GRADIENTS = [
  "linear-gradient(135deg, #3f3f46 0%, #18181b 100%)",
  "linear-gradient(135deg, #44403c 0%, #1c1917 100%)",
  "linear-gradient(135deg, #3f3f46 0%, #27272a 60%, #09090b 100%)",
  "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
];

function gradientFor(id: string) {
  const sum = [...id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return FALLBACK_GRADIENTS[sum % FALLBACK_GRADIENTS.length];
}

export default function Hero({ onPlay, onInfo, onOpenAI, categoryTab = "all" }: HeroProps) {
  const { catalog, spotlightId } = useCreatorCatalog();

  // Pool of available items for the hero banner depending on current genre/tab
  const pool = useMemo(() => {
    if (spotlightId && categoryTab === "all") {
      const spot = catalog.find((c) => c.id === spotlightId);
      if (spot) {
        return [spot, ...catalog.filter((c) => c.id !== spotlightId)];
      }
    }
    if (categoryTab === "all") {
      return catalog;
    }
    const catFiltered = catalog.filter((c) =>
      c.categories.some((cat) => cat.toLowerCase() === categoryTab.toLowerCase())
    );
    return catFiltered.length > 0 ? catFiltered : catalog;
  }, [categoryTab, catalog, spotlightId]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Reset index when categoryTab changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [categoryTab]);

  const featured = pool[currentIndex % pool.length] || catalog[0];

  const [imgSrc, setImgSrc] = useState(featured.heroImage || featured.image);
  const [showTitleFallback, setShowTitleFallback] = useState(false);

  // Update image when featured changes
  useEffect(() => {
    setShowTitleFallback(false);
    setImgSrc(featured.heroImage || featured.image);
  }, [featured.id, featured.heroImage, featured.image]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % pool.length);
  }, [pool.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + pool.length) % pool.length);
  }, [pool.length]);

  // Auto-rotate hero every 9 seconds if not paused
  useEffect(() => {
    if (isPaused || pool.length <= 1) return;
    const timer = setInterval(() => {
      handleNext();
    }, 9000);
    return () => clearInterval(timer);
  }, [isPaused, pool.length, handleNext]);

  const primaryCategory = featured.categories[0];

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const isPlaceholder = img.naturalWidth <= 120 && img.naturalHeight <= 90;
    if (!isPlaceholder) return;

    if (!imgSrc.includes("hqdefault")) {
      setImgSrc(`https://i.ytimg.com/vi/${featured.youtubeId}/hqdefault.jpg`);
    } else {
      setShowTitleFallback(true);
    }
  };

  const handleImageError = () => {
    if (!imgSrc.includes("hqdefault")) {
      setImgSrc(`https://i.ytimg.com/vi/${featured.youtubeId}/hqdefault.jpg`);
    } else {
      setShowTitleFallback(true);
    }
  };

  return (
    <section
      className="relative h-[80vh] min-h-[520px] sm:min-h-[560px] max-h-[760px] w-full overflow-hidden bg-zinc-950 group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Image / Fallback */}
      {showTitleFallback ? (
        <div
          className="absolute inset-0 flex items-center justify-center px-10 text-center transition-all duration-700"
          style={{ background: gradientFor(featured.id) }}
        >
          <span className="text-white/25 font-black text-4xl sm:text-6xl tracking-tight leading-tight line-clamp-4 uppercase">
            {featured.title}
          </span>
        </div>
      ) : (
        <img
          key={featured.id}
          src={imgSrc}
          alt={featured.title}
          className="absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 animate-fadeIn"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}

      {/* Gradient Overlays for Cinematic Netflix-style look */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(9,9,11,0.96) 0%, rgba(9,9,11,0.80) 38%, rgba(9,9,11,0.30) 70%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(0deg, rgba(9,9,11,1) 0%, rgba(9,9,11,0.5) 25%, rgba(9,9,11,0) 65%)",
        }}
      />

      {/* Navigation Arrows for Hero Carousel */}
      {pool.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            aria-label="Vidéo à la une précédente"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-emerald-400/15 hover:bg-emerald-400/25 text-emerald-200 backdrop-blur-xl border border-emerald-300/30 shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)] flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 active:scale-95"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={handleNext}
            aria-label="Vidéo à la une suivante"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-emerald-400/15 hover:bg-emerald-400/25 text-emerald-200 backdrop-blur-xl border border-emerald-300/30 shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)] flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 active:scale-95"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}

      {/* Content Info Container */}
      <div className="relative z-10 h-full flex flex-col justify-end px-4 sm:px-6 lg:px-12 pb-32 sm:pb-36 lg:pb-40 max-w-2xl">
        {/* Maximum 2 badges above title */}
        <div className="flex items-center gap-2 mb-3 sm:mb-3.5 flex-wrap">
          {primaryCategory && (
            <span className="text-[11px] font-bold uppercase tracking-wide px-3 py-1 rounded-full bg-emerald-400/15 text-emerald-200 border border-emerald-300/30 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)]">
              {primaryCategory}
            </span>
          )}
          {featured.isTrending ? (
            <span className="text-[10px] font-bold text-emerald-200 flex items-center gap-1.5 bg-emerald-400/15 px-3 py-1 rounded-full border border-emerald-300/30 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)]">
              <Sparkles size={11} className="text-emerald-300" />
              En Tendance
            </span>
          ) : (
            <span className="text-[11px] font-medium uppercase px-3 py-1 rounded-full border border-emerald-300/25 text-emerald-200 bg-emerald-400/10 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)]">
              {featured.channel}
            </span>
          )}
        </div>

        <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-2 sm:mb-3 leading-tight text-white line-clamp-2 sm:line-clamp-3 drop-shadow-md">
          {featured.title}
        </h1>

        <p className="text-xs sm:text-sm md:text-base text-zinc-300 mb-4 sm:mb-6 line-clamp-2 leading-relaxed drop-shadow">
          {featured.description}
        </p>

        {/* Buttons and Carousel Indicators */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={() => onPlay(featured.id)}
              className="flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full font-bold text-xs sm:text-sm text-zinc-950 bg-emerald-400 hover:bg-emerald-300 transition-all hover:scale-105 active:scale-95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_20px_rgba(16,185,129,0.35)]"
            >
              <Play size={17} fill="currentColor" />
              Regarder
            </button>
            <button
              onClick={() => onInfo(featured.id)}
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full font-semibold text-xs sm:text-sm text-emerald-100 bg-emerald-400/15 hover:bg-emerald-400/25 transition-all backdrop-blur-xl border border-emerald-300/35 hover:border-emerald-300/50 shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)] hover:scale-105 active:scale-95"
            >
              <Info size={17} className="text-emerald-300" />
              Plus d'infos
            </button>
            {onOpenAI && (
              <button
                onClick={onOpenAI}
                className="flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-full font-semibold text-emerald-200 bg-emerald-400/15 hover:bg-emerald-400/25 border border-emerald-300/35 transition-all backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)] active:scale-95"
                title="Poser une question à Noor IA"
              >
                <Sparkles size={15} className="text-emerald-300" />
                <span className="text-xs sm:text-sm">Noor IA</span>
              </button>
            )}
          </div>

          {/* Mini carousel indicators (up to 8 dots) */}
          {pool.length > 1 && (
            <div className="flex items-center gap-1.5 ml-auto hidden sm:flex bg-emerald-400/10 px-3 py-1.5 rounded-full backdrop-blur-xl border border-emerald-300/25 shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)]">
              {pool.slice(0, Math.min(pool.length, 8)).map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Aller à la vidéo ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentIndex % Math.min(pool.length, 8)
                      ? "w-6 bg-emerald-300"
                      : "w-1.5 bg-emerald-200/30 hover:bg-emerald-200/60"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
