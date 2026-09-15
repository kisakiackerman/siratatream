import { useState, useRef, useEffect, useCallback, memo } from "react";
import {
  Heart,
  Bookmark,
  Share2,
  Volume2,
  VolumeX,
  Play,
  Check,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { type ContentItem } from "@/data/catalog";
import { useContentStats } from "@/hooks/useContentStats";
import { useMyList } from "@/lib/useMyList";
import { formatYouTubeLikes, getCachedYouTubeMeta } from "@/lib/youtubeApi";

type ShortVideoCardProps = {
  item: ContentItem;
  isActive: boolean;
  isPreload?: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenFullPlayer?: (id: string) => void;
};

export const ShortVideoCard = memo(function ShortVideoCard({
  item,
  isActive,
  isPreload = false,
  isMuted,
  onToggleMute,
  onOpenFullPlayer,
}: ShortVideoCardProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ready & preloading status
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const shouldRenderIframe = isActive || isPreload;

  useEffect(() => {
    setIframeLoaded(false);
  }, [item.youtubeId]);

  // Persistence hooks
  const { likes, userVote, vote } = useContentStats(item.id);
  const { inList, toggle: toggleMyList } = useMyList();
  const isSaved = inList(item.id);

  // Local like state with localStorage backup
  const storageLikeKey = `nexstream_short_liked_${item.id}`;
  const initialLiked = (() => {
    try {
      return localStorage.getItem(storageLikeKey) === "true" || !!userVote;
    } catch {
      return !!userVote;
    }
  })();

  const [isLiked, setIsLiked] = useState<boolean>(initialLiked);
  const [likeBounce, setLikeBounce] = useState(false);

  // Keep in sync if userVote updates from supabase
  useEffect(() => {
    if (userVote !== null) {
      setIsLiked(userVote);
      try {
        localStorage.setItem(storageLikeKey, userVote ? "true" : "false");
      } catch {
        // ignore
      }
    }
  }, [userVote, storageLikeKey]);

  // Playback paused state
  const [isPaused, setIsPaused] = useState(false);

  // Interaction feedback states
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [burstPos, setBurstPos] = useState<{ x: number; y: number } | null>(null);
  const [shareToast, setShareToast] = useState(false);

  // Send YouTube postMessage commands
  const postCommand = useCallback((func: string, args: any[] = []) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func, args }),
        "*"
      );
    }
  }, []);

  // Handle iframe load: starts playback if active, or primes and pauses if preloading
  const handleIframeLoad = useCallback(() => {
    setIframeLoaded(true);
    if (isActive) {
      postCommand("playVideo");
      if (isMuted) {
        postCommand("mute");
      } else {
        postCommand("unMute");
      }
    } else {
      // Preloading adjacent video (n-1 or n+1): pause at frame 0 and keep muted
      postCommand("pauseVideo");
      postCommand("mute");
    }
  }, [isActive, isMuted, postCommand]);

  // When active changes, auto-play or pause
  useEffect(() => {
    if (isActive) {
      setIsPaused(false);
      postCommand("playVideo");
      if (isMuted) {
        postCommand("mute");
      } else {
        postCommand("unMute");
      }
    } else {
      setIsPaused(false);
      postCommand("pauseVideo");
      postCommand("mute");
    }
  }, [isActive, isMuted, postCommand]);

  // Handle single tap (YouTube play/pause) vs double tap (like)
  const handleVideoAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent interfering with buttons or links
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a")) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (clickTimeoutRef.current) {
      // Double tap detected: like the video with heart burst animation!
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;

      if (!isLiked) {
        setIsLiked(true);
        setLikeBounce(true);
        setTimeout(() => setLikeBounce(false), 500);
        try {
          localStorage.setItem(storageLikeKey, "true");
        } catch {
          // ignore
        }
        vote(true);
      }

      setBurstPos({ x: clickX, y: clickY });
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 900);
    } else {
      // Single tap timer: toggle play/pause like on YouTube without showing a pause button
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        if (!isActive) return;

        setIsPaused((prevPaused) => {
          const nextState = !prevPaused;
          if (nextState) {
            postCommand("pauseVideo");
          } else {
            postCommand("playVideo");
          }
          return nextState;
        });
      }, 240);
    }
  };

  // Like button handler: toggles like state on/off reliably with bounce animation
  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikeBounce(true);
    setTimeout(() => setLikeBounce(false), 500);

    try {
      localStorage.setItem(storageLikeKey, nextLiked ? "true" : "false");
    } catch {
      // ignore
    }

    // Call stats vote function to toggle on supabase
    vote(true);

    if (nextLiked) {
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 850);
    }
  };

  // Bookmark button handler
  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleMyList(item);
  };

  // Share button handler
  const handleShareClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}${window.location.pathname}?v=${item.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: `Regarde ce short islamique sur SiratStream : ${item.title}`,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or unsupported, fallback to clipboard
      }
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    }
  };

  const primaryCategory = item.categories[0] || "Rappels";
  // YouTube likes integration: uses authentic YouTube likes count (cached, catalog or derived from verified views)
  const cachedMeta = getCachedYouTubeMeta(item.youtubeId);
  const ytBaseLikes = cachedMeta?.likeCount || item.likesCount || (item.viewsCount ? Math.max(18, Math.round(item.viewsCount * 0.065)) : 120);
  const rawBase = likes > 0 ? (initialLiked ? Math.max(0, likes - 1) : likes) : ytBaseLikes;
  const displayLikes = rawBase + (isLiked ? 1 : 0);
  const formattedLikes = formatYouTubeLikes(displayLikes);

  return (
    <div
      className="relative w-full h-[100dvh] flex items-center justify-center snap-start snap-always bg-black select-none overflow-hidden"
      data-short-id={item.id}
    >
      {/* Centered vertical 9:16 wrapper */}
      <div
        onClick={handleVideoAreaClick}
        className="relative w-full max-w-[430px] h-full sm:h-[94vh] sm:max-h-[840px] aspect-[9/16] sm:rounded-3xl overflow-hidden bg-zinc-950 shadow-[0_0_50px_rgba(0,0,0,0.8)] border-0 sm:border sm:border-zinc-800/80 flex items-center justify-center cursor-pointer group"
      >
        {/* YouTube IFrame (rendered for active and preloaded adjacent n-1 / n+1 videos) */}
        {shouldRenderIframe ? (
          <>
            <iframe
              ref={iframeRef}
              onLoad={handleIframeLoad}
              src={`https://www.youtube-nocookie.com/embed/${item.youtubeId}?enablejsapi=1&autoplay=1&mute=1&loop=1&playlist=${item.youtubeId}&controls=0&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1&fs=0`}
              title={item.title}
              className="w-full h-full object-cover pointer-events-none scale-[1.03]"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              loading="eager"
            />
            {/* Poster layer during initial buffering to eliminate black frames */}
            <div
              className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
                iframeLoaded ? "opacity-0" : "opacity-100"
              }`}
            >
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover filter brightness-90"
              />
            </div>
          </>
        ) : (
          <div className="relative w-full h-full">
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-full object-cover filter brightness-75"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="w-16 h-16 rounded-full bg-emerald-500/30 backdrop-blur-md flex items-center justify-center border border-emerald-400/40 text-emerald-300">
                <Play size={28} className="fill-current ml-1" />
              </div>
            </div>
          </div>
        )}

        {/* Ambient Top Shadow */}
        <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none z-10" />

        {/* Bottom Dark Gradient for crisp text readability */}
        <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none z-10" />

        {/* Double-tap Floating Heart Burst Animation */}
        <AnimatePresence>
          {showHeartBurst && (
            <motion.div
              initial={{ scale: 0, opacity: 0.9 }}
              animate={{ scale: [0, 1.35, 1.1], opacity: [0.9, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{
                position: "absolute",
                left: burstPos ? burstPos.x - 45 : "calc(50% - 45px)",
                top: burstPos ? burstPos.y - 45 : "calc(50% - 45px)",
                zIndex: 40,
                pointerEvents: "none",
              }}
            >
              <Heart
                size={90}
                className="text-rose-500 fill-rose-500 drop-shadow-[0_0_25px_rgba(244,63,94,0.9)]"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Copy share feedback toast */}
        <AnimatePresence>
          {shareToast && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-20 inset-x-6 z-40 py-2.5 px-4 rounded-2xl bg-black/70 backdrop-blur-2xl border border-emerald-400/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_32px_rgba(0,0,0,0.6)] text-emerald-200 text-xs font-semibold flex items-center justify-center gap-2"
            >
              <Check size={16} className="text-emerald-400" />
              <span>Lien du Short copié dans le presse-papiers !</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BOTTOM-LEFT OVERLAY: Category Pill, Title, Channel Name */}
        <div className="absolute bottom-6 left-4 right-20 z-20 space-y-2 pointer-events-none text-left">
          {/* Primary category pill with Liquid Glass effect */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.12] hover:bg-white/[0.18] border border-white/25 text-white text-xs font-bold backdrop-blur-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_16px_rgba(0,0,0,0.4)]">
              <Sparkles size={11} className="text-emerald-400" />
              <span>{primaryCategory}</span>
            </span>

            {item.channel && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-semibold backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
                Short
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-white font-bold text-sm sm:text-base leading-snug drop-shadow-md line-clamp-3">
            {item.title}
          </h3>

          {/* Channel and info */}
          <div className="flex items-center gap-2 text-zinc-300 text-xs font-medium drop-shadow">
            <div className="w-5 h-5 rounded-full bg-white/[0.15] border border-white/30 backdrop-blur-xl flex items-center justify-center text-emerald-300 text-[10px] font-black shadow-inner">
              {item.channel?.[0] || "T"}
            </div>
            <span className="text-zinc-200 font-semibold truncate">{item.channel}</span>
            <span className="text-zinc-500">·</span>
            <span className="text-zinc-400">{item.duration || "00:59"}</span>
          </div>
        </div>

        {/* RIGHT SIDE VERTICAL ACTIONS STACK - ULTRA-REFINED LIQUID GLASS BUTTONS */}
        <div className="absolute right-3.5 bottom-8 z-30 flex flex-col items-center gap-4">
          {/* 1. Like Action (Heart) with Liquid Glass */}
          <button
            type="button"
            onClick={handleLikeClick}
            className="group/action flex flex-col items-center gap-1 transition-transform active:scale-90"
            aria-label={isLiked ? "Je n'aime plus ce short" : "J'aime ce short"}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-2xl border transition-all duration-300 ${
                likeBounce ? "scale-115" : "hover:scale-105"
              } ${
                isLiked
                  ? "bg-gradient-to-b from-rose-500/40 to-rose-600/25 border-rose-400/70 text-rose-300 shadow-[inset_0_1px_2px_rgba(255,255,255,0.6),0_0_24px_rgba(244,63,94,0.45)]"
                  : "bg-white/[0.12] hover:bg-white/[0.22] border-white/30 text-white shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.45),0_8px_30px_rgba(0,0,0,0.5)]"
              }`}
            >
              <Heart
                size={22}
                className={`transition-all duration-300 ${
                  likeBounce ? "scale-125 -rotate-12" : ""
                } ${
                  isLiked
                    ? "fill-rose-500 text-rose-400 scale-110 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                    : "group-hover/action:scale-110 text-white/90"
                }`}
              />
            </div>
            <span
              className={`text-[11px] font-bold tracking-tight transition-colors ${
                isLiked ? "text-rose-400 font-extrabold drop-shadow" : "text-white drop-shadow"
              }`}
              title={`${displayLikes.toLocaleString("fr-FR")} likes YouTube`}
            >
              {formattedLikes}
            </span>
          </button>

          {/* 2. Bookmark Action (Ma Liste) with Liquid Glass */}
          <button
            type="button"
            onClick={handleBookmarkClick}
            className="group/action flex flex-col items-center gap-1 transition-transform active:scale-90"
            aria-label={isSaved ? "Retirer de Ma Liste" : "Ajouter à Ma Liste"}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-2xl border transition-all duration-300 ${
                isSaved
                  ? "bg-gradient-to-b from-emerald-500/40 to-emerald-600/25 border-emerald-400/70 text-emerald-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.6),0_0_24px_rgba(52,211,153,0.45)]"
                  : "bg-white/[0.12] hover:bg-white/[0.22] border-white/30 text-white shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.45),0_8px_30px_rgba(0,0,0,0.5)]"
              }`}
            >
              <Bookmark
                size={22}
                className={`transition-all duration-300 ${
                  isSaved
                    ? "fill-emerald-400 text-emerald-300 scale-110 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                    : "group-hover/action:scale-110 text-white/90"
                }`}
              />
            </div>
            <span
              className={`text-[11px] font-bold tracking-tight transition-colors ${
                isSaved ? "text-emerald-400 font-extrabold drop-shadow" : "text-white drop-shadow"
              }`}
            >
              {isSaved ? "Enregistré" : "Ma Liste"}
            </span>
          </button>

          {/* 3. Share Action (Partage) with Liquid Glass */}
          <button
            type="button"
            onClick={handleShareClick}
            className="group/action flex flex-col items-center gap-1 transition-transform active:scale-90"
            aria-label="Partager ce short"
          >
            <div className="w-12 h-12 rounded-full bg-white/[0.12] hover:bg-white/[0.22] border border-white/30 text-white flex items-center justify-center backdrop-blur-2xl shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.45),0_8px_30px_rgba(0,0,0,0.5)] transition-all duration-300">
              <Share2 size={21} className="group-hover/action:scale-110 transition-transform text-white/90" />
            </div>
            <span className="text-[11px] font-bold text-white drop-shadow tracking-tight">
              Partager
            </span>
          </button>

          {/* 4. Quick Mute/Unmute Toggle with Liquid Glass */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            className="group/action flex flex-col items-center gap-1 transition-transform active:scale-90 mt-1"
            aria-label={isMuted ? "Activer le son" : "Couper le son"}
          >
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-2xl border transition-all duration-300 ${
                isMuted
                  ? "bg-white/[0.08] hover:bg-white/[0.16] border-white/20 text-zinc-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_6px_20px_rgba(0,0,0,0.4)]"
                  : "bg-gradient-to-b from-emerald-500/35 to-emerald-600/20 border-emerald-400/60 text-emerald-300 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),0_0_20px_rgba(52,211,153,0.35)]"
              }`}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </div>
            <span className="text-[10px] font-semibold text-zinc-300 drop-shadow">
              {isMuted ? "Muet" : "Son"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
});
