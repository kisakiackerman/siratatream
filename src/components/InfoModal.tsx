import { useEffect, useState, useMemo } from "react";
import { X, Play, Plus, ThumbsUp, Share2, Star, Check, DownloadCloud, CheckCircle, Tv } from "lucide-react";
import { motion } from "motion/react";
import { ContentItem, catalog, getSeriesEpisodes } from "@/data/catalog";
import { useMyList } from "@/lib/useMyList";
import { useViewerProfile } from "@/hooks/useViewerProfile";
import { useContentStats } from "@/hooks/useContentStats";
import RatingStars from "@/components/RatingStars";
import { isDownloadedOffline, saveOfflineDownload, removeOfflineDownload } from "@/lib/offlineStorage";
import { getReciterForItem } from "@/lib/reciterData";
import { getLocalWatchHistory } from "@/lib/watchHistory";

type InfoModalProps = {
  item: ContentItem;
  onClose: () => void;
  onPlay: (id: string) => void;
};

export default function InfoModal({ item, onClose, onPlay }: InfoModalProps) {
  const { inList, toggle } = useMyList();
  const saved = inList(item.id);
  const [downloaded, setDownloaded] = useState(() => isDownloadedOffline(item.id));
  const [copied, setCopied] = useState(false);
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

  const handleToggleDownload = () => {
    if (downloaded) {
      removeOfflineDownload(item.id);
      setDownloaded(false);
    } else {
      saveOfflineDownload(item);
      setDownloaded(true);
    }
  };

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ type: "spring", damping: 28, stiffness: 350 }}
        className="relative z-10 w-full sm:max-w-2xl max-h-[90vh] liquid-glass-modal rounded-3xl overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Hero */}
        <div className="relative h-64 sm:h-72 flex-shrink-0">
          <img
            src={item.heroImage ?? item.image}
            alt={item.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              if (!img.dataset.triedHq) {
                img.dataset.triedHq = "true";
                img.src = `https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg`;
              } else if (!img.dataset.triedReciter) {
                img.dataset.triedReciter = "true";
                img.src = reciter?.photoUrl || "/images/sheikh_ali_jaber.jpg";
              }
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/30 to-transparent" />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full liquid-glass border border-white/20 flex items-center justify-center text-white hover:bg-white/15 transition-all shadow-lg"
          >
            <X size={17} />
          </button>

          {/* Title overlay */}
          <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-6 z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="liquid-glass-badge-emerald px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wider uppercase">
                {item.channel}
              </span>
            </div>
            <h2 className="text-white text-xl sm:text-2xl md:text-3xl font-black leading-tight line-clamp-2">
              {item.title}
            </h2>
          </div>
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
              className="flex items-center gap-2 liquid-glass-emerald text-emerald-100 font-bold px-6 py-2.5 rounded-full hover:scale-105 active:scale-95 transition-all text-sm border border-emerald-300/40 shadow-lg shadow-emerald-950/40"
            >
              <Play size={17} fill="currentColor" />
              Lecture
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
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                userVote === true
                  ? "liquid-glass-emerald text-emerald-300 border border-emerald-400/50"
                  : "liquid-glass text-white border border-white/20 hover:bg-white/15"
              }`}
              title="J'aime"
            >
              <ThumbsUp size={16} fill={userVote === true ? "currentColor" : "none"} />
            </button>
            {likes > 0 && <span className="text-zinc-300 text-xs font-mono">{likes}</span>}

            <button
              onClick={handleToggleDownload}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-medium transition-all ${
                downloaded
                  ? "liquid-glass-emerald text-emerald-300 border-emerald-400/40"
                  : "liquid-glass text-zinc-200 border-white/20 hover:bg-white/15"
              }`}
              title="Mode hors-ligne"
            >
              {downloaded ? <CheckCircle size={14} /> : <DownloadCloud size={14} />}
              {downloaded ? "Enregistré hors-ligne" : "Télécharger"}
            </button>

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
          <div className="flex flex-wrap gap-2 mb-8">
            {item.categories.map((g) => (
              <span
                key={g}
                className="liquid-glass text-zinc-200 text-xs px-3 py-1.5 rounded-full border border-white/15"
              >
                {g}
              </span>
            ))}
          </div>

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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {related.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        onClose();
                        onPlay(r.id);
                      }}
                      className="video-thumb-interactive group relative rounded-xl overflow-hidden aspect-video liquid-glass-card text-left cursor-pointer"
                    >
                      <img
                        src={r.image}
                        alt={r.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          if (!img.src.includes("hqdefault")) {
                            img.src = `https://i.ytimg.com/vi/${r.youtubeId}/hqdefault.jpg`;
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2">
                        <p className="text-white text-xs font-bold leading-tight line-clamp-2">
                          {r.title}
                        </p>
                      </div>
                    </button>
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
