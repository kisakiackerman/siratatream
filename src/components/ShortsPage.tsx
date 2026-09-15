import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  X,
  ArrowLeft,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  Zap,
  Filter,
  Sparkles,
  LayoutGrid,
  Mic,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { type ContentItem, type Category } from "@/data/catalog";
import { allShortsList } from "@/data/shortsCatalog";
import { ShortVideoCard } from "@/components/ShortVideoCard";
import ShortsCatalogPage from "@/components/ShortsCatalogPage";

type ShortsPageProps = {
  onClose: () => void;
  onSelectContent?: (id: string) => void;
  initialShortId?: string;
};

const CATEGORY_FILTERS: { id: string; label: string }[] = [
  { id: "all", label: "Tous les Shorts" },
  { id: "Coran", label: "Coran" },
  { id: "Prophètes", label: "Prophètes" },
  { id: "Miracles du Coran", label: "Miracles" },
  { id: "Compagnons", label: "Compagnons" },
  { id: "Héros & Personnages", label: "Rappels & Foi" },
  { id: "Histoire & Mystère", label: "Histoire" },
  { id: "Eschatologie", label: "Fin des Temps" },
];

export default function ShortsPage({
  onClose,
  onSelectContent,
  initialShortId,
}: ShortsPageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);

  // Filtered list of shorts
  const items = useMemo(() => {
    if (selectedCategory === "all") return allShortsList;
    return allShortsList.filter((item) =>
      item.categories.includes(selectedCategory as Category)
    );
  }, [selectedCategory]);

  // Handle initial short navigation if requested
  useEffect(() => {
    if (initialShortId && items.length > 0) {
      const idx = items.findIndex(
        (it) => it.id === initialShortId || it.youtubeId === initialShortId
      );
      if (idx !== -1) {
        setActiveIndex(idx);
        setTimeout(() => {
          scrollToIndex(idx);
        }, 100);
      }
    }
  }, [initialShortId, items]);

  // Scroll to a specific index
  const scrollToIndex = useCallback((index: number) => {
    if (!containerRef.current) return;
    const targetChild = containerRef.current.children[index] as HTMLElement;
    if (targetChild) {
      targetChild.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  // IntersectionObserver to detect currently centered video
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const children = Array.from(container.children) as HTMLElement[];
    if (children.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const idx = children.indexOf(entry.target as HTMLElement);
            if (idx !== -1) {
              setActiveIndex(idx);
            }
          }
        }
      },
      {
        root: container,
        threshold: [0.6],
      }
    );

    children.forEach((child) => observer.observe(child));

    return () => {
      observer.disconnect();
    };
  }, [items]);

  // Keyboard navigation (ArrowDown, ArrowUp, Space, 'm' for mute)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        if (activeIndex < items.length - 1) {
          scrollToIndex(activeIndex + 1);
        }
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        if (activeIndex > 0) {
          scrollToIndex(activeIndex - 1);
        }
      } else if (e.key.toLowerCase() === "m") {
        e.preventDefault();
        setIsMuted((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, items.length, onClose, scrollToIndex]);

  // Toggle audio state
  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  // Selection from Shorts Catalog
  const handlePlayFromCatalog = useCallback((id: string) => {
    setShowCatalog(false);
    const idx = items.findIndex((it) => it.id === id || it.youtubeId === id);
    if (idx !== -1) {
      setActiveIndex(idx);
      setTimeout(() => scrollToIndex(idx), 50);
    } else {
      setSelectedCategory("all");
      const fullIdx = allShortsList.findIndex((it) => it.id === id || it.youtubeId === id);
      if (fullIdx !== -1) {
        setActiveIndex(fullIdx);
        setTimeout(() => scrollToIndex(fullIdx), 100);
      }
    }
  }, [items, scrollToIndex]);

  // Preload adjacent thumbnail images (n-1, n+1, n+2) to eliminate image flicker
  useEffect(() => {
    if (items.length === 0) return;
    const targetIndices = [activeIndex - 1, activeIndex + 1, activeIndex + 2];
    targetIndices.forEach((idx) => {
      if (idx >= 0 && idx < items.length) {
        const img = new Image();
        img.src = items[idx].image;
      }
    });
  }, [activeIndex, items]);

  // Progress computation (percentage through feed)
  const progressPercent = items.length > 0 ? ((activeIndex + 1) / items.length) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 bg-black text-white flex flex-col h-[100dvh] overflow-hidden select-none"
    >
      {/* ── TOP ULTRA-FINE PROGRESS BAR (Instagram Story / Shorts style) ── */}
      <div className="absolute top-0 inset-x-0 h-1 bg-zinc-800/70 z-40 overflow-hidden">
        <div
          className="h-full bg-emerald-400 transition-all duration-300 ease-out shadow-[0_0_8px_rgba(52,211,153,0.8)]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* ── TOP FLOATING NAVIGATION BAR ── */}
      <header className="absolute top-2 inset-x-0 z-40 px-3 sm:px-6 py-2 flex items-center justify-between pointer-events-none">
        {/* Left: Back / Close button with Liquid Glass */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.12] hover:bg-white/[0.22] border border-white/30 text-white backdrop-blur-2xl shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.4),0_8px_32px_rgba(0,0,0,0.5)] transition-all active:scale-95 text-xs font-semibold"
            aria-label="Fermer les Shorts"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Accueil</span>
          </button>

          {/* Category filter dropdown toggle with Liquid Glass */}
          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border backdrop-blur-2xl transition-all text-xs font-semibold ${
              selectedCategory !== "all"
                ? "bg-gradient-to-b from-emerald-500/35 to-emerald-600/20 border-emerald-400/60 text-emerald-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),0_0_20px_rgba(52,211,153,0.35)]"
                : "bg-white/[0.12] hover:bg-white/[0.22] border-white/30 text-white shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.4),0_8px_32px_rgba(0,0,0,0.5)]"
            }`}
            aria-label="Filtrer par catégorie"
          >
            <Filter size={13} className="text-emerald-400" />
            <span className="max-w-[120px] truncate">
              {CATEGORY_FILTERS.find((c) => c.id === selectedCategory)?.label || "Catégorie"}
            </span>
            <ChevronDown size={13} className={showFilters ? "rotate-180" : ""} />
          </button>

          {/* Catalogue button with Liquid Glass */}
          <button
            type="button"
            onClick={() => setShowCatalog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.12] hover:bg-white/[0.22] border border-white/30 text-emerald-300 hover:text-emerald-200 backdrop-blur-2xl shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.4),0_8px_32px_rgba(0,0,0,0.5)] transition-all active:scale-95 text-xs font-semibold"
            aria-label="Ouvrir le catalogue des Shorts"
            title="Catalogue des Shorts"
          >
            <LayoutGrid size={13} className="text-emerald-400" />
            <span className="hidden sm:inline">Catalogue</span>
          </button>

          {/* Audio Voice Search button with Liquid Glass */}
          <button
            type="button"
            onClick={() => setShowCatalog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.12] hover:bg-white/[0.22] border border-white/30 text-white backdrop-blur-2xl shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.4),0_8px_32px_rgba(0,0,0,0.5)] transition-all active:scale-95 text-xs font-semibold"
            aria-label="Recherche audio"
            title="Recherche Audio / Vocale"
          >
            <Mic size={13} className="text-emerald-400" />
            <span className="hidden md:inline">Recherche Audio</span>
          </button>
        </div>

        {/* Center: Branding & Short label with Liquid Glass */}
        <div className="pointer-events-auto hidden md:flex items-center gap-2 bg-white/[0.12] border border-white/30 px-4 py-1.5 rounded-full backdrop-blur-2xl shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.45),0_8px_32px_rgba(0,0,0,0.5)]">
          <Zap size={14} className="text-emerald-400 fill-emerald-400" />
          <span className="font-extrabold text-xs tracking-wider uppercase text-white">Short</span>
        </div>

        {/* Right: Counter badge & Mute status toggle with Liquid Glass */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Position counter with Liquid Glass */}
          <div className="px-3 py-1.5 rounded-full bg-white/[0.10] border border-white/25 backdrop-blur-2xl text-[11px] font-mono font-semibold text-zinc-200 shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_4px_16px_rgba(0,0,0,0.4)]">
            <span className="text-emerald-300 font-bold">{activeIndex + 1}</span>
            <span className="text-zinc-400"> / </span>
            <span>{items.length}</span>
          </div>

          {/* Sound toggle button in header with Liquid Glass */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border backdrop-blur-2xl transition-all active:scale-95 text-xs font-semibold ${
              isMuted
                ? "bg-white/[0.10] hover:bg-white/[0.18] border-white/25 text-zinc-300 hover:text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_4px_16px_rgba(0,0,0,0.4)]"
                : "bg-gradient-to-b from-emerald-500/35 to-emerald-600/20 border-emerald-400/60 text-emerald-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),0_0_20px_rgba(52,211,153,0.35)]"
            }`}
            title={isMuted ? "Activer le son (touche M)" : "Couper le son (touche M)"}
            aria-label="Contrôle du volume"
          >
            {isMuted ? (
              <>
                <VolumeX size={15} />
                <span className="hidden sm:inline">Muet</span>
              </>
            ) : (
              <>
                <Volume2 size={15} className="text-emerald-400" />
                <span className="hidden sm:inline">Son actif</span>
              </>
            )}
          </button>

          {/* Close X with Liquid Glass */}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.12] hover:bg-white/[0.22] border border-white/30 text-zinc-200 hover:text-white flex items-center justify-center backdrop-blur-2xl shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.4),0_8px_25px_rgba(0,0,0,0.5)] transition-all active:scale-95"
            aria-label="Fermer"
          >
            <X size={17} />
          </button>
        </div>
      </header>

      {/* ── CATEGORY FILTER OVERLAY CHIPS ── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 left-3 sm:left-6 z-50 p-2.5 rounded-2xl bg-black/80 border border-white/25 backdrop-blur-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_20px_50px_rgba(0,0,0,0.8)] flex flex-wrap gap-1.5 max-w-md animate-in"
          >
            {CATEGORY_FILTERS.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setShowFilters(false);
                    setActiveIndex(0);
                    scrollToIndex(0);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-emerald-400 text-zinc-950 font-bold shadow-md"
                      : "bg-white/[0.08] hover:bg-white/[0.16] text-zinc-200 border border-white/20 backdrop-blur-xl"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── VERTICAL SNAP SCROLL CONTAINER ── */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, index) => {
          // Preload adjacent videos (n-1 and n+1) for instantaneous zero-delay transitions
          const isAdjacent = Math.abs(index - activeIndex) === 1;
          const isActive = index === activeIndex;

          return (
            <ShortVideoCard
              key={item.id}
              item={item}
              isActive={isActive}
              isPreload={isAdjacent}
              isMuted={isMuted}
              onToggleMute={handleToggleMute}
              onOpenFullPlayer={onSelectContent}
            />
          );
        })}
      </div>

      {/* ── DESKTOP NAVIGATION CHEVRONS (Side shortcuts) - Liquid Glass ── */}
      <div className="hidden lg:flex flex-col gap-2.5 absolute right-8 top-1/2 -translate-y-1/2 z-30 pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            if (activeIndex > 0) scrollToIndex(activeIndex - 1);
          }}
          disabled={activeIndex === 0}
          className="w-11 h-11 rounded-full bg-white/[0.12] hover:bg-white/[0.22] border border-white/30 text-white flex items-center justify-center backdrop-blur-2xl shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.4),0_8px_30px_rgba(0,0,0,0.5)] transition-all active:scale-95 disabled:opacity-25 disabled:pointer-events-none"
          title="Vidéo précédente (Flèche haut)"
          aria-label="Vidéo précédente"
        >
          <ChevronUp size={22} />
        </button>
        <button
          type="button"
          onClick={() => {
            if (activeIndex < items.length - 1) scrollToIndex(activeIndex + 1);
          }}
          disabled={activeIndex === items.length - 1}
          className="w-11 h-11 rounded-full bg-white/[0.12] hover:bg-white/[0.22] border border-white/30 text-white flex items-center justify-center backdrop-blur-2xl shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.4),0_8px_30px_rgba(0,0,0,0.5)] transition-all active:scale-95 disabled:opacity-25 disabled:pointer-events-none"
          title="Vidéo suivante (Flèche bas)"
          aria-label="Vidéo suivante"
        >
          <ChevronDown size={22} />
        </button>
      </div>

      {/* ── DEDICATED SHORTS CATALOG MODAL WITH AUDIO SEARCH ── */}
      <AnimatePresence>
        {showCatalog && (
          <ShortsCatalogPage
            onClose={() => setShowCatalog(false)}
            onPlayShort={handlePlayFromCatalog}
            initialCategory={selectedCategory}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
