import { useEffect, useState, useMemo } from "react";
import { X, Play, Plus, ThumbsUp, Share2, Star, Check, CheckCircle, Tv, Film } from "lucide-react";
import { motion } from "motion/react";
import { ContentItem, catalog, getSeriesEpisodes } from "@/data/catalog";
import { useMyList } from "@/lib/useMyList";
import Card3D from "@/components/3d/Card3D";
import { useViewerProfile } from "@/hooks/useViewerProfile";
import { useContentStats } from "@/hooks/useContentStats";
import RatingStars from "@/components/RatingStars";
import VideoNotesSection from "@/components/VideoNotesSection";
import { getReciterForItem } from "@/lib/reciterData";
import { getLocalWatchHistory } from "@/lib/watchHistory";
import { getThematicFallbackBanner } from "@/lib/heroBanners";

type InfoModalProps = {
  item: ContentItem;
  onClose: () => void;
  onPlay: (id: string) => void;
};

export default function InfoModal({ item, onClose, onPlay }: InfoModalProps) {
  const { inList, toggle } = useMyList();
  const saved = inList(item.id);
  const [copied, setCopied] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const isTarawih = item.channel === "Récitations Haramain" || item.categories.includes("Coran");
  const reciter = isTarawih ? getReciterForItem(item.title, item.description, item.channel) : null;

  const {
    likes,
    views,
    userVote,
    vote,
    averageRating,
    ratingCount,
    userRating,
    rate,
  } = useContentStats(item.id);

  const { activeProfile } = useViewerProfile();

  const seriesEpisodes = useMemo(() => {
    return item.seriesId ? getSeriesEpisodes(item.seriesId) : [];
  }, [item.seriesId]);

  const historyList = useMemo(() => {
    return getLocalWatchHistory(activeProfile?.id);
  }, [activeProfile?.id]);

  const related = catalog
    .filter((c) => c.id !== item.id && c.categories.some((g) => item.categories.includes(g)))
    .slice(0, 6);

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

  const handleShare = async () => {
    // Generate share link pointing directly to this content
    const shareUrl = `${window.location.origin}${window.location.pathname}?v=${encodeURIComponent(item.id)}`;
    const shareData = {
      title: `${item.title} | SiratStream`,
      text: item.description ? `${item.title} — ${item.description.slice(0, 140)}...` : item.title,
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: any) {
        if (err?.name === "AbortError") return; // User closed share sheet
      }
    } else if (navigator.share) {
      try {
        await navigator.share({
          title: shareData.title,
          text: shareData.text,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        if (err?.name === "AbortError") return;
      }
    }

    // Fallback: Copy link to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Secondary fallback
      navigator.clipboard.writeText(`https://www.youtube.com/watch?v=${item.youtubeId}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ perspective: "1400px" }}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal with 3D Zoom Reveal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88, z: -100, rotateX: 6 }}
        animate={{ opacity: 1, scale: 1, z: 0, rotateX: 0 }}
        exit={{ opacity: 0, scale: 0.9, z: -60, rotateX: 4 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative z-10 w-full sm:max-w-2xl max-h-[90vh] liquid-glass-modal rounded-3xl overflow-hidden flex flex-col shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_35px_rgba(16,185,129,0.2)] border border-emerald-300/30"
      >
        {/* Hero Video Frame with Depth */}
        <div
          className="relative h-64 sm:h-72 flex-shrink-0 overflow-hidden bg-zinc-950 border-b border-emerald-300/20"
          style={{
            boxShadow:
              "inset 0 2px 2px 0 rgba(255, 255, 255, 0.3), inset 0 -4px 8px 0 rgba(0, 0, 0, 0.65)",
          }}
        >
          {isPlayingPreview ? (
            <div className="absolute inset-0 z-15 bg-black flex items-center justify-center">
              {item.videoUrl && (item.videoUrl.endsWith(".mp4") || item.videoUrl.endsWith(".webm")) ? (
                <video
                  src={item.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : item.youtubeId ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${item.youtubeId}?autoplay=1&rel=0&iv_load_policy=3&playsinline=1`}
                  title={item.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : null}
              <button
                type="button"
                onClick={() => setIsPlayingPreview(false)}
                className="absolute top-4 left-4 z-30 px-3 py-1 rounded-full liquid-glass border border-white/20 text-xs font-semibold text-white hover:bg-white/15 shadow-lg flex items-center gap-1.5 cursor-pointer"
              >
                <span>Fermer l'aperçu</span>
              </button>
            </div>
          ) : (
            <>
              {/* Ambient Blur Layer */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <img
                  src={item.heroImage || item.image || getThematicFallbackBanner(item)}
                  alt=""
                  aria-hidden="true"
                  className="w-full h-full object-cover scale-125 filter blur-2xl opacity-40 brightness-75"
                />
              </div>

              {/* Sharp Foreground Image */}
              <img
                src={item.heroImage ?? item.image ?? getThematicFallbackBanner(item)}
                alt={item.title}
                className="w-full h-full object-cover relative z-0"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  if (img.naturalWidth <= 120 && img.naturalHeight <= 90) {
                    if (!img.dataset.triedHq && item.youtubeId) {
                      img.dataset.triedHq = "true";
                      img.src = `https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg`;
                    } else if (!img.dataset.triedThematic) {
                      img.dataset.triedThematic = "true";
                      img.src = getThematicFallbackBanner(item);
                    }
                  }
                }}
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  if (!img.dataset.triedHq && item.youtubeId) {
                    img.dataset.triedHq = "true";
                    img.src = `https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg`;
                  } else if (!img.dataset.triedThematic) {
                    img.dataset.triedThematic = "true";
                    img.src = getThematicFallbackBanner(item);
                  } else if (!img.dataset.triedReciter) {
                    img.dataset.triedReciter = "true";
                    img.src = reciter?.photoUrl || "/images/sheikh_ali_jaber.jpg";
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/40 to-transparent z-10 pointer-events-none" />

              {/* Center Play/Preview icon */}
              <div className="absolute inset-0 z-15 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setIsPlayingPreview(true)}
                  className="w-14 h-14 rounded-full liquid-glass-emerald border border-emerald-300/40 text-emerald-200 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-[0_0_24px_rgba(52,211,153,0.35)] cursor-pointer group"
                  title="Lancer l'aperçu vidéo"
                >
                  <Play size={24} fill="currentColor" className="ml-1 group-hover:scale-105 transition-transform" />
                </button>
              </div>

              {/* Title overlay */}
              <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-6 z-10 pointer-events-none">
                <div className="flex items-center gap-2 mb-2">
                  <span className="liquid-glass-badge-emerald px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wider uppercase">
                    {item.channel}
                  </span>
                </div>
                <h2 className="text-white text-xl sm:text-2xl md:text-3xl font-black leading-tight line-clamp-2">
                  {item.title}
                </h2>
              </div>
            </>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full liquid-glass border border-white/20 flex items-center justify-center text-white hover:bg-white/15 transition-all shadow-lg cursor-pointer"
          >
            <X size={17} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {/* Actions */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <button
              onClick={() => {
                onClose();
                onPlay(item.id);
              }}
              className="flex items-center gap-2 liquid-glass-emerald text-emerald-100 font-bold px-6 py-2.5 rounded-full hover:scale-105 active:scale-95 transition-all text-sm border border-emerald-300/40 shadow-lg shadow-emerald-950/40 cursor-pointer"
            >
              <Play size={17} fill="currentColor" />
              Lecture
            </button>
            <button
              onClick={() => setIsPlayingPreview((prev) => !prev)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm transition-all border shadow-md active:scale-95 cursor-pointer ${
                isPlayingPreview
                  ? "bg-emerald-500 text-zinc-950 border-emerald-400"
                  : "liquid-glass text-zinc-200 hover:text-white border-white/20 hover:bg-white/15"
              }`}
              title="Prévisualiser la vidéo"
            >
              <Film size={16} />
              <span>{isPlayingPreview ? "Arrêter l'aperçu" : "Aperçu vidéo"}</span>
            </button>
            <button
              onClick={() => toggle(item)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                saved
                  ? "liquid-glass-emerald text-emerald-300 border border-emerald-400/50"
                  : "liquid-glass text-white border border-white/20 hover:bg-white/15"
              }`}
              title="Ma liste"
            >
              {saved ? <Check size={18} /> : <Plus size={18} />}
            </button>
            <button
              onClick={() => vote(true)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                userVote === true
                  ? "liquid-glass-emerald text-emerald-300 border border-emerald-400/50 shadow-[0_0_12px_rgba(52,211,153,0.3)]"
                  : "liquid-glass text-white border border-white/20 hover:bg-white/15"
              }`}
              title={userVote === true ? "Je n'aime plus" : "J'aime"}
              aria-label={userVote === true ? "Je n'aime plus" : "J'aime"}
            >
              <ThumbsUp size={16} fill={userVote === true ? "currentColor" : "none"} />
            </button>
            {likes > 0 && <span className="text-zinc-300 text-xs font-mono">{likes}</span>}

            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-full liquid-glass border border-white/20 hover:bg-white/15 flex items-center justify-center text-white transition-all ml-auto relative"
              title="Partager"
            >
              <Share2 size={16} />
              {copied && (
                <span className="absolute -top-7 right-0 text-[10px] liquid-glass-emerald text-emerald-200 px-2 py-0.5 rounded-full shadow border border-emerald-300/40">
                  Lien copié
                </span>
              )}
            </button>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm">
              <Star size={14} fill="currentColor" />
              {item.score}% Match
            </span>
            <span className="text-zinc-300 text-sm border border-white/15 px-2 py-0.5 rounded-full bg-white/5">
              {item.rating}
            </span>
            <span className="text-zinc-400 text-sm">{item.year}</span>
            {views > 0 && (
              <span className="text-zinc-400 text-sm">{views} vue{views > 1 ? "s" : ""}</span>
            )}
          </div>

          <div className="mb-6 liquid-glass p-3.5 rounded-2xl border border-white/15">
            <p className="text-zinc-300 text-xs mb-1.5 font-medium">Avis et évaluation des spectateurs :</p>
            <RatingStars
              averageRating={averageRating}
              ratingCount={ratingCount}
              userRating={userRating}
              onRate={rate}
            />
          </div>

          {/* Reciter Profile Card if Tarawih */}
          {reciter && (
            <div className="mb-6 p-4 rounded-2xl liquid-glass-emerald border border-emerald-400/30 flex items-start gap-4 shadow-lg">
              <div className="relative flex-shrink-0">
                <img
                  src={reciter.photoUrl}
                  alt={reciter.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-emerald-400 shadow-md ring-2 ring-emerald-500/20"
                />
                <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-black font-black text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  Imam
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-white font-bold text-base sm:text-lg">{reciter.name}</h4>
                  <span className="text-xs text-emerald-300 font-medium bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    {reciter.years}
                  </span>
                </div>
                <p className="text-emerald-300 text-xs font-medium mt-0.5 font-serif" dir="rtl">
                  {reciter.arabicName}
                </p>
                <p className="text-zinc-300 text-xs mt-1">
                  <span className="text-white font-medium">{reciter.title}</span> • {reciter.mosque}
                </p>
                <p className="text-zinc-300/90 text-xs mt-2 leading-relaxed italic line-clamp-3">
                  "{reciter.bio}"
                </p>
              </div>
            </div>
          )}

          {/* Description */}
          <p className="text-zinc-200 text-sm leading-relaxed mb-6">
            {item.description}
          </p>

          {/* Genre tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {item.categories.map((g) => (
              <span
                key={g}
                className="liquid-glass text-zinc-200 text-xs px-3 py-1.5 rounded-full border border-white/15"
              >
                {g}
              </span>
            ))}
          </div>

          {/* Mes Notes et Réflexions Spirituelles Firestore */}
          <VideoNotesSection contentId={item.id} contentTitle={item.title} />

          {/* Episodes list if series, otherwise recommendations */}
          {item.seriesId && seriesEpisodes.length > 0 ? (
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div>
                  <h3 className="text-white font-bold text-base flex items-center gap-2">
                    <Tv size={18} className="text-amber-400" />
                    <span>Épisodes de la série</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {item.seriesTitle || "Série"} — {seriesEpisodes.length} épisodes disponibles
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {seriesEpisodes.map((ep) => {
                  const isCurrent = ep.id === item.id;
                  const historyEntry = historyList.find((h) => h.content_id === ep.id);
                  const progSec = historyEntry?.progress_seconds || 0;
                  const durSec = historyEntry?.duration_seconds || 0;
                  const isWatched = durSec > 0 && (progSec / durSec > 0.85 || durSec - progSec < 60);
                  const inProgress = !isWatched && progSec > 15;
                  const pct = durSec > 0 ? Math.min(100, Math.round((progSec / durSec) * 100)) : 0;

                  return (
                    <div
                      key={ep.id}
                      onClick={() => {
                        onClose();
                        onPlay(ep.id);
                      }}
                      className={`p-3 rounded-2xl liquid-glass border transition-all cursor-pointer flex items-center gap-3 sm:gap-4 group ${
                        isCurrent
                          ? "border-emerald-400/50 bg-emerald-500/10 shadow-lg"
                          : "border-white/10 hover:border-white/25 hover:bg-white/10"
                      }`}
                    >
                      {/* Episode number pill */}
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          isCurrent
                            ? "bg-emerald-500 text-black shadow-md"
                            : "liquid-glass-subtle text-zinc-300 border border-white/15"
                        }`}
                      >
                        {ep.episodeNumber ? `E${ep.episodeNumber}` : "•"}
                      </div>

                      {/* Thumbnail */}
                      <div className="relative w-24 sm:w-32 aspect-video rounded-xl overflow-hidden flex-shrink-0 bg-zinc-950">
                        <img
                          src={ep.image}
                          alt={ep.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <div className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                            <Play size={12} fill="currentColor" className="ml-0.5" />
                          </div>
                        </div>
                        {inProgress && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
                            <div className="h-full bg-emerald-400" style={{ width: `${pct}%` }} />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4
                            className={`text-xs sm:text-sm font-semibold truncate ${
                              isCurrent ? "text-emerald-300 font-bold" : "text-zinc-100 group-hover:text-white"
                            }`}
                          >
                            {ep.title}
                          </h4>
                          {isCurrent && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.2 rounded-full font-bold">
                              Sélectionné
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                          {ep.description}
                        </p>
                      </div>

                      {/* Watch status badge */}
                      <div className="flex-shrink-0 text-right">
                        {isWatched ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold inline-flex items-center gap-1 shadow-sm">
                            <CheckCircle size={11} />
                            <span>Vu</span>
                          </span>
                        ) : inProgress ? (
                          <span className="px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-400/30 text-[10px] font-bold inline-flex items-center gap-1 shadow-sm">
                            <span>{pct}%</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg liquid-glass-subtle text-zinc-400 text-[10px] border border-white/10">
                            Non vu
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            related.length > 0 && (
              <>
                <h3 className="text-white font-bold text-base mb-4">
                  Recommandations similaires
                </h3>
                <div
                  className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                  style={{ perspective: "1000px" }}
                >
                  {related.map((r) => (
                    <Card3D
                      key={r.id}
                      as="button"
                      maxTilt={8}
                      depth={12}
                      scale={1.03}
                      glare={true}
                      glareColor="emerald"
                      onClick={() => {
                        onClose();
                        onPlay(r.id);
                      }}
                      className="video-thumb-interactive group relative rounded-xl overflow-hidden aspect-video liquid-glass-card text-left cursor-pointer p-0.5"
                    >
                      <img
                        src={r.image}
                        alt={r.title}
                        className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          if (!img.src.includes("hqdefault")) {
                            img.src = `https://i.ytimg.com/vi/${r.youtubeId}/hqdefault.jpg`;
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent rounded-lg" />
                      <div
                        className="absolute bottom-2 left-2 right-2"
                        style={{ transform: "translateZ(14px)" }}
                      >
                        <p className="text-white text-xs font-bold leading-tight line-clamp-2">
                          {r.title}
                        </p>
                      </div>
                    </Card3D>
                  ))}
                </div>
              </>
            )
          )}
        </div>
      </motion.div>
    </div>
  );
}
