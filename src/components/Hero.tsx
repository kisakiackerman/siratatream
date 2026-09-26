import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence, type Variants } from "motion/react";
import { Play, Info, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { catalog as defaultCatalog, type ContentItem, type Category, parseDurationToSeconds } from "@/data/catalog";
import { useCreatorCatalog } from "@/hooks/useCreatorCatalog";
import { getDiversifiedHeroPool } from "@/lib/catalogDiversity";
import { getThematicFallbackBanner, getChannelAmbientTheme } from "@/lib/heroBanners";
import { useViewerProfile } from "@/hooks/useViewerProfile";
import { getLocalWatchHistory, HISTORY_UPDATE_EVENT } from "@/lib/watchHistory";

interface HeroProps {
  onPlay: (id: string, startSec?: number) => void;
  onInfo: (id: string) => void;
  onOpenAI?: () => void;
  categoryTab?: string;
}

interface WatchProgressInfo {
  progressSec: number;
  durationSec: number;
  remainingSec: number;
  percent: number;
}

const slideVariants: Variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? "5%" : "-5%",
    opacity: 0,
    scale: 1.04,
  }),
  center: {
    x: "0%",
    opacity: 1,
    scale: 1,
    transition: {
      x: { type: "spring", stiffness: 240, damping: 28 },
      opacity: { duration: 0.55, ease: "easeOut" },
      scale: { duration: 0.75, ease: [0.22, 1, 0.36, 1] as const },
    },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? "-5%" : "5%",
    opacity: 0,
    scale: 0.98,
    transition: {
      x: { duration: 0.45, ease: "easeInOut" },
      opacity: { duration: 0.4, ease: "easeIn" },
      scale: { duration: 0.45, ease: "easeInOut" },
    },
  }),
};

const textVariants: Variants = {
  enter: (dir: number) => ({
    opacity: 0,
    y: 18,
    x: dir > 0 ? 16 : -16,
    filter: "blur(4px)",
  }),
  center: {
    opacity: 1,
    y: 0,
    x: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
  exit: (dir: number) => ({
    opacity: 0,
    y: -14,
    x: dir > 0 ? -16 : 16,
    filter: "blur(3px)",
    transition: {
      duration: 0.25,
      ease: [0.4, 0, 1, 1] as const,
    },
  }),
};

function getInitialHeroSrc(item: ContentItem): string {
  if (item.heroImage && item.heroImage.trim().length > 0) {
    return item.heroImage;
  }
  if (item.youtubeId) {
    return `https://i.ytimg.com/vi/${item.youtubeId}/maxresdefault.jpg`;
  }
  if (item.image && item.image.trim().length > 0) {
    return item.image;
  }
  return getThematicFallbackBanner(item);
}

function HeroSlide({ item, direction }: { item: ContentItem; direction: number }) {
  const [src, setSrc] = useState(() => getInitialHeroSrc(item));
  const [fallbackStep, setFallbackStep] = useState<"maxres" | "sd" | "hq" | "thematic">("maxres");

  // Re-sync if item properties change
  useEffect(() => {
    setFallbackStep("maxres");
    setSrc(getInitialHeroSrc(item));
  }, [item.id, item.heroImage, item.image, item.youtubeId]);

  const advanceFallback = useCallback(() => {
    if (fallbackStep === "maxres" && item.youtubeId) {
      setFallbackStep("sd");
      setSrc(`https://i.ytimg.com/vi/${item.youtubeId}/sddefault.jpg`);
    } else if (fallbackStep === "sd" && item.youtubeId) {
      setFallbackStep("hq");
      setSrc(`https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg`);
    } else if (fallbackStep !== "thematic") {
      setFallbackStep("thematic");
      setSrc(getThematicFallbackBanner(item));
    }
  }, [fallbackStep, item]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth <= 120 && img.naturalHeight <= 90) {
      advanceFallback();
    }
  };

  return (
    <motion.div
      key={item.id}
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      className="absolute inset-0 w-full h-full overflow-hidden"
    >
      <img
        src={src}
        alt={item.title}
        className="w-full h-full object-cover object-center"
        onLoad={handleImageLoad}
        onError={advanceFallback}
      />
    </motion.div>
  );
}

function HeroAmbientBackground({ item, ambientGlow }: { item: ContentItem; ambientGlow: string }) {
  const ambientSrc = useMemo(() => {
    if (item.heroImage && item.heroImage.trim().length > 0) return item.heroImage;
    if (item.youtubeId) return `https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg`;
    if (item.image && item.image.trim().length > 0) return item.image;
    return getThematicFallbackBanner(item);
  }, [item]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={item.id + "-ambient"}
          initial={{ opacity: 0, scale: 1.15 }}
          animate={{ opacity: 0.5, scale: 1.25 }}
          exit={{ opacity: 0, scale: 1.3 }}
          transition={{ duration: 0.75, ease: "easeInOut" }}
          className="absolute inset-0 w-full h-full"
        >
          <img
            src={ambientSrc}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover filter blur-3xl contrast-125 saturate-150"
          />
        </motion.div>
      </AnimatePresence>
      {/* Lueur radiale douce assortie au thème ou à la chaîne */}
      <motion.div
        key={ambientGlow}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="absolute inset-0 transition-all duration-1000"
        style={{
          background: `radial-gradient(circle at 75% 35%, ${ambientGlow} 0%, transparent 65%)`,
        }}
      />
    </div>
  );
}

export default function Hero({ onPlay, onInfo, onOpenAI, categoryTab = "all" }: HeroProps) {
  const { catalog, spotlightId } = useCreatorCatalog();
  const { activeProfile } = useViewerProfile();

  // Ensemble des identifiants des vidéos déjà vues par l'utilisateur
  const [watchedIds, setWatchedIds] = useState<Set<string>>(() => {
    if (!activeProfile?.id) return new Set();
    const history = getLocalWatchHistory(activeProfile.id);
    return new Set(
      history
        .filter((h) => typeof h.progress_seconds === "number" && h.progress_seconds > 0)
        .map((h) => h.content_id)
    );
  });

  const refreshWatchedIds = useCallback(() => {
    if (!activeProfile?.id) {
      setWatchedIds(new Set());
      return;
    }
    const history = getLocalWatchHistory(activeProfile.id);
    setWatchedIds(
      new Set(
        history
          .filter((h) => typeof h.progress_seconds === "number" && h.progress_seconds > 0)
          .map((h) => h.content_id)
      )
    );
  }, [activeProfile?.id]);

  useEffect(() => {
    refreshWatchedIds();

    const handleUpdate = () => {
      refreshWatchedIds();
    };

    window.addEventListener(HISTORY_UPDATE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(HISTORY_UPDATE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [refreshWatchedIds]);

  // Pool of available items for the hero banner, excluding watched videos and diversified across creators
  const pool = useMemo(() => {
    // 1. Filtrage par catégorie ou chaîne dédiée
    let categoryItems = catalog;
    if (categoryTab === "savants-sunnah") {
      const savantsFiltered = catalog.filter((c) => c.channel === "Les Savants de la Sunnah");
      if (savantsFiltered.length > 0) {
        categoryItems = savantsFiltered;
      }
    } else if (categoryTab !== "all" && categoryTab !== "creators") {
      const catFiltered = catalog.filter((c) =>
        c.categories.some((cat) => cat.toLowerCase() === categoryTab.toLowerCase())
      );
      if (catFiltered.length > 0) {
        categoryItems = catFiltered;
      }
    }

    // 2. Exclusion stricte de toutes les vidéos déjà visionnées par l'utilisateur
    const unwatched = categoryItems.filter((item) => !watchedIds.has(item.id));

    // Si toutes les vidéos de la sélection ont déjà été vues, fallback sur le catalogue pour ne pas laisser le Hero vide
    const sourceItems = unwatched.length > 0 ? unwatched : categoryItems;

    // Si le spotlightId a déjà été vu, ne pas le forcer si des vidéos non vues sont disponibles
    const effectiveSpotlightId =
      spotlightId && unwatched.length > 0 && watchedIds.has(spotlightId)
        ? null
        : spotlightId;

    return getDiversifiedHeroPool(sourceItems, "all", effectiveSpotlightId);
  }, [catalog, categoryTab, spotlightId, watchedIds]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  // Reset index when categoryTab changes
  useEffect(() => {
    setCurrentIndex(0);
    setDirection(1);
  }, [categoryTab]);

  // Ajustement de l'index si la taille du pool change suite au visionnage d'une vidéo
  useEffect(() => {
    if (currentIndex >= pool.length && pool.length > 0) {
      setCurrentIndex(0);
    }
  }, [pool.length, currentIndex]);

  const featured = pool[currentIndex % pool.length] || catalog[0];

  // Suivi de la progression de lecture de la vidéo à l'affiche
  const [watchProgress, setWatchProgress] = useState<WatchProgressInfo | null>(null);

  const updateProgressForFeatured = useCallback(
    (itemId: string, profileId?: string | null, fallbackDurationStr?: string) => {
      if (!profileId || !itemId) {
        setWatchProgress(null);
        return;
      }
      const history = getLocalWatchHistory(profileId);
      const entry = history.find((h) => h.content_id === itemId);
      if (entry && typeof entry.progress_seconds === "number" && entry.progress_seconds > 0) {
        const pSec = entry.progress_seconds;
        const parsedDur = parseDurationToSeconds(fallbackDurationStr);
        const dSec = entry.duration_seconds && entry.duration_seconds > 0 ? entry.duration_seconds : parsedDur;
        const remSec = dSec > pSec ? dSec - pSec : 0;
        const pct = dSec > 0 ? Math.min(100, Math.max(1, (pSec / dSec) * 100)) : 0;

        setWatchProgress({
          progressSec: pSec,
          durationSec: dSec,
          remainingSec: remSec,
          percent: pct,
        });
      } else {
        setWatchProgress(null);
      }
    },
    []
  );

  useEffect(() => {
    updateProgressForFeatured(featured.id, activeProfile?.id, featured.duration);

    const handleUpdate = () => {
      updateProgressForFeatured(featured.id, activeProfile?.id, featured.duration);
    };

    window.addEventListener(HISTORY_UPDATE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(HISTORY_UPDATE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [featured.id, featured.duration, activeProfile?.id, updateProgressForFeatured]);

  const handleNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % pool.length);
  }, [pool.length]);

  const handlePrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + pool.length) % pool.length);
  }, [pool.length]);

  const handleSelectSlide = useCallback(
    (idx: number) => {
      setDirection(idx >= currentIndex ? 1 : -1);
      setCurrentIndex(idx);
    },
    [currentIndex]
  );

  // Rotation automatique toutes les 9 secondes si non survolé
  useEffect(() => {
    if (isPaused || pool.length <= 1) return;
    const timer = setInterval(() => {
      handleNext();
    }, 9000);
    return () => clearInterval(timer);
  }, [isPaused, pool.length, handleNext]);

  const primaryCategory = featured.categories?.[0];
  const ambientTheme = useMemo(() => getChannelAmbientTheme(featured.channel), [featured.channel]);

  return (
    <section
      className="relative h-[80vh] min-h-[520px] sm:min-h-[560px] max-h-[760px] w-full overflow-hidden bg-zinc-950 group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 1. Ambient Background Layer: Diffuse les couleurs du visuel avec transition fluide */}
      <HeroAmbientBackground item={featured} ambientGlow={ambientTheme.glowColor} />

      {/* 2. Image Principale Haute Définition avec transition directionnelle popLayout */}
      <AnimatePresence mode="popLayout" custom={direction}>
        <HeroSlide key={featured.id} item={featured} direction={direction} />
      </AnimatePresence>

      {/* 3. Dégradés Cinématiques multi-couches pour garantir une lisibilité optimale des textes et boutons */}
      <div
        className="absolute inset-0 pointer-events-none z-[5]"
        style={{
          background:
            "linear-gradient(90deg, rgba(9,9,11,0.96) 0%, rgba(9,9,11,0.82) 42%, rgba(9,9,11,0.30) 75%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none z-[5]"
        style={{
          background: "linear-gradient(0deg, rgba(9,9,11,1) 0%, rgba(9,9,11,0.6) 25%, rgba(9,9,11,0) 65%)",
        }}
      />
      <div
        className="absolute inset-x-0 top-0 h-28 pointer-events-none z-[5]"
        style={{
          background: "linear-gradient(180deg, rgba(9,9,11,0.65) 0%, transparent 100%)",
        }}
      />

      {/* Navigation Arrows for Hero Carousel */}
      {pool.length > 1 && (
        <>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={handlePrev}
            aria-label="Vidéo à la une précédente"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-emerald-400/15 hover:bg-emerald-400/25 text-emerald-200 backdrop-blur-xl border border-emerald-300/30 shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)] flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer"
          >
            <ChevronLeft size={22} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleNext}
            aria-label="Vidéo à la une suivante"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-emerald-400/15 hover:bg-emerald-400/25 text-emerald-200 backdrop-blur-xl border border-emerald-300/30 shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)] flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer"
          >
            <ChevronRight size={22} />
          </motion.button>
        </>
      )}

      {/* Content Info Container */}
      <div className="relative z-10 h-full flex flex-col justify-end px-4 sm:px-6 lg:px-12 pb-32 sm:pb-36 lg:pb-40 max-w-2xl">
        {/* Animated text block (badges, title, description) */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={featured.id}
            custom={direction}
            variants={textVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
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
          </motion.div>
        </AnimatePresence>

        {/* Buttons and Carousel Indicators */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onPlay(featured.id, watchProgress?.progressSec)}
              className="flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full font-bold text-xs sm:text-sm text-zinc-950 bg-emerald-400 hover:bg-emerald-300 transition-colors shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_20px_rgba(16,185,129,0.35)] cursor-pointer"
            >
              <Play size={17} fill="currentColor" />
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={watchProgress && watchProgress.progressSec > 0 ? "resume" : "watch"}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.18 }}
                >
                  {watchProgress && watchProgress.progressSec > 0 ? "Reprendre" : "Regarder"}
                </motion.span>
              </AnimatePresence>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onInfo(featured.id)}
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full font-semibold text-xs sm:text-sm text-emerald-100 bg-emerald-400/15 hover:bg-emerald-400/25 transition-colors backdrop-blur-xl border border-emerald-300/35 hover:border-emerald-300/50 shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)] cursor-pointer"
            >
              <Info size={17} className="text-emerald-300" />
              Plus d'infos
            </motion.button>
            {onOpenAI && (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={onOpenAI}
                className="flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-full font-semibold text-emerald-200 bg-emerald-400/15 hover:bg-emerald-400/25 border border-emerald-300/35 transition-colors backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)] cursor-pointer"
                title="Poser une question à Noor IA"
              >
                <Sparkles size={15} className="text-emerald-300" />
                <span className="text-xs sm:text-sm">Noor IA</span>
              </motion.button>
            )}
          </div>

          {/* Mini carousel indicators with smooth morphing animation (up to 8 dots) */}
          {pool.length > 1 && (
            <div className="flex items-center gap-1.5 ml-auto hidden sm:flex bg-emerald-400/10 px-3 py-1.5 rounded-full backdrop-blur-xl border border-emerald-300/25 shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)]">
              {pool.slice(0, Math.min(pool.length, 8)).map((item, idx) => {
                const isSelected = idx === currentIndex % Math.min(pool.length, 8);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectSlide(idx)}
                    aria-label={`Aller à la vidéo ${idx + 1}`}
                    className="relative h-2 py-1 px-0.5 flex items-center cursor-pointer focus:outline-none"
                  >
                    <motion.div
                      animate={{
                        width: isSelected ? 24 : 6,
                        backgroundColor: isSelected ? "rgb(110 231 183)" : "rgba(167, 243, 208, 0.3)",
                      }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="h-1.5 rounded-full"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
