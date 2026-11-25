import { useState, useEffect } from "react";
import { Play, ExternalLink, RotateCcw, MonitorPlay } from "lucide-react";
import type { ContentItem } from "@/data/catalog";
import { getThematicFallbackBanner } from "@/lib/heroBanners";
import { sanitizeEmbedUrl, sanitizeHttpUrl, isValidYouTubeId } from "@/lib/safeUrl";

interface StudioMediaPreviewProps {
  item: Partial<ContentItem>;
  autoPlay?: boolean;
  onOpenInMainPlayer?: (item: ContentItem) => void;
  className?: string;
}

export function extractEmbedSrc(raw?: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  const iframeSrcMatch = trimmed.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  const candidate = iframeSrcMatch ? iframeSrcMatch[1].trim() : trimmed;
  return sanitizeHttpUrl(candidate, { allowBlob: true });
}

export default function StudioMediaPreview({
  item,
  autoPlay = false,
  onOpenInMainPlayer,
  className = "",
}: StudioMediaPreviewProps) {
  const [activated, setActivated] = useState(autoPlay);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [mediaError, setMediaError] = useState(false);

  const cleanUrl = extractEmbedSrc(item.videoUrl);
  const safeHttpsEmbed = sanitizeEmbedUrl(cleanUrl);
  const rawYtId = item.youtubeId || "";
  const validYtId =
    rawYtId && !rawYtId.startsWith("embed_") && !rawYtId.startsWith("direct_") && isValidYouTubeId(rawYtId)
      ? rawYtId
      : "";

  const fallbackBanner = getThematicFallbackBanner(item as ContentItem);
  const initialPoster =
    item.heroImage ||
    item.thumbnail ||
    item.image ||
    (validYtId ? `https://i.ytimg.com/vi/${validYtId}/hqdefault.jpg` : fallbackBanner);

  const [posterSrc, setPosterSrc] = useState(initialPoster);

  useEffect(() => {
    setActivated(autoPlay);
    setFrameLoaded(false);
    setMediaError(false);
    setPosterSrc(
      item.heroImage ||
        item.thumbnail ||
        item.image ||
        (validYtId ? `https://i.ytimg.com/vi/${validYtId}/hqdefault.jpg` : fallbackBanner)
    );
  }, [item.id, item.youtubeId, item.videoUrl, item.heroImage, item.thumbnail, item.image, autoPlay, validYtId, fallbackBanner]);

  const sourceType = item.videoSourceType || (cleanUrl ? "direct" : "youtube");

  const isDirectVideo =
    sourceType === "direct" ||
    (!cleanUrl.includes("/embed") &&
      (cleanUrl.endsWith(".mp4") ||
        cleanUrl.endsWith(".webm") ||
        cleanUrl.endsWith(".mov") ||
        cleanUrl.endsWith(".m3u8") ||
        cleanUrl.startsWith("blob:")));

  const isVimeo = sourceType === "vimeo" || cleanUrl.includes("vimeo.com");
  const isDailymotion =
    sourceType === "dailymotion" || cleanUrl.includes("dailymotion.com") || cleanUrl.includes("dai.ly");
  const isCustomEmbed =
    sourceType === "embed" ||
    (Boolean(cleanUrl) &&
      !isDirectVideo &&
      !isVimeo &&
      !isDailymotion &&
      !cleanUrl.includes("youtube.com") &&
      !cleanUrl.includes("youtu.be"));

  const getVimeoEmbedUrl = () => {
    if (cleanUrl.includes("player.vimeo.com")) return cleanUrl;
    const id = cleanUrl.split("vimeo.com/")[1]?.split(/[?/]/)[0] || validYtId;
    return id ? `https://player.vimeo.com/video/${id}?autoplay=1` : "";
  };

  const getDailymotionEmbedUrl = () => {
    if (cleanUrl.includes("dailymotion.com/embed")) return cleanUrl;
    const id = cleanUrl.includes("dai.ly/")
      ? cleanUrl.split("dai.ly/")[1]?.split(/[?/]/)[0]
      : cleanUrl.split("/video/")[1]?.split(/[?/]/)[0] || validYtId;
    return id ? `https://www.dailymotion.com/embed/video/${id}?autoplay=1` : "";
  };

  const hasPlayableMedia =
    Boolean(validYtId) ||
    Boolean(cleanUrl && (isDirectVideo || isCustomEmbed || isVimeo || isDailymotion));

  return (
    <div
      className={`relative rounded-2xl overflow-hidden bg-zinc-950 aspect-video border border-zinc-800 shadow-inner group ${className}`}
    >
      {/* Couche miniature visible en permanence avant lecture ou pendant le chargement */}
      <img
        src={posterSrc}
        alt={item.title || "Aperçu vidéo"}
        className="w-full h-full object-cover"
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth <= 120 && img.naturalHeight <= 90) {
            if (validYtId && !posterSrc.includes("hqdefault")) {
              setPosterSrc(`https://i.ytimg.com/vi/${validYtId}/hqdefault.jpg`);
            } else if (posterSrc !== fallbackBanner) {
              setPosterSrc(fallbackBanner);
            }
          }
        }}
        onError={() => {
          if (validYtId && !posterSrc.includes("hqdefault")) {
            setPosterSrc(`https://i.ytimg.com/vi/${validYtId}/hqdefault.jpg`);
          } else if (posterSrc !== fallbackBanner) {
            setPosterSrc(fallbackBanner);
          }
        }}
      />

      {/* Dégradé de contraste pour garantir la lisibilité */}
      {(!activated || !frameLoaded || mediaError) && (
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/40 to-zinc-950/30 flex flex-col items-center justify-center p-4 text-center">
          {!activated ? (
            <div className="flex flex-col items-center gap-3">
              {hasPlayableMedia ? (
                <button
                  type="button"
                  onClick={() => {
                    setMediaError(false);
                    setActivated(true);
                  }}
                  className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title="Lancer l'aperçu vidéo"
                >
                  <Play size={24} fill="currentColor" className="ml-0.5" />
                </button>
              ) : null}
              <div className="space-y-1 max-w-md">
                <p className="text-sm font-semibold text-white line-clamp-1">
                  {item.title || "Aperçu média"}
                </p>
                <p className="text-xs text-zinc-300">
                  {hasPlayableMedia
                    ? "Cliquez pour charger la lecture vidéo"
                    : "Source vidéo externe non renseignée — miniature affichée"}
                </p>
              </div>
              {onOpenInMainPlayer && item.id && (
                <button
                  type="button"
                  onClick={() => onOpenInMainPlayer(item as ContentItem)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-white/15 text-xs font-medium text-emerald-300 transition-colors cursor-pointer"
                >
                  <MonitorPlay size={14} />
                  <span>Ouvrir dans le lecteur SiratStream</span>
                </button>
              )}
            </div>
          ) : mediaError ? (
            <div className="space-y-3 max-w-sm bg-zinc-950/85 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs font-medium text-zinc-200">
                Cette source vidéo bloque l'affichage intégré dans cette fenêtre.
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setMediaError(false);
                    setFrameLoaded(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-white transition-colors cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Réessayer</span>
                </button>
                {validYtId && (
                  <a
                    href={`https://www.youtube.com/watch?v=${validYtId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors"
                  >
                    <ExternalLink size={13} />
                    <span>Voir sur YouTube</span>
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="px-3.5 py-1.5 rounded-lg bg-zinc-950/80 border border-white/10 text-xs text-zinc-200">
              Chargement du lecteur...
            </div>
          )}
        </div>
      )}

      {/* Couche de lecture active */}
      {activated && !mediaError && hasPlayableMedia && (
        <div
          className={`absolute inset-0 z-10 bg-black transition-opacity duration-200 ${
            frameLoaded ? "opacity-100" : "opacity-0"
          }`}
        >
          {isDirectVideo && cleanUrl ? (
            <video
              src={cleanUrl}
              controls
              autoPlay
              playsInline
              poster={posterSrc}
              onLoadedData={() => setFrameLoaded(true)}
              onError={() => setMediaError(true)}
              className="w-full h-full object-contain"
            />
          ) : isCustomEmbed && safeHttpsEmbed ? (
            <iframe
              src={safeHttpsEmbed}
              title={item.title || "Aperçu vidéo"}
              className="w-full h-full border-0"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
              onLoad={() => setFrameLoaded(true)}
              onError={() => setMediaError(true)}
            />
          ) : isVimeo && getVimeoEmbedUrl() ? (
            <iframe
              src={getVimeoEmbedUrl()}
              title={item.title || "Aperçu Vimeo"}
              className="w-full h-full border-0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              onLoad={() => setFrameLoaded(true)}
              onError={() => setMediaError(true)}
            />
          ) : isDailymotion && getDailymotionEmbedUrl() ? (
            <iframe
              src={getDailymotionEmbedUrl()}
              title={item.title || "Aperçu Dailymotion"}
              className="w-full h-full border-0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              onLoad={() => setFrameLoaded(true)}
              onError={() => setMediaError(true)}
            />
          ) : validYtId ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${validYtId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&origin=${encodeURIComponent(
                typeof window !== "undefined" ? window.location.origin : ""
              )}`}
              title={item.title || "Aperçu YouTube"}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              onLoad={() => setFrameLoaded(true)}
              onError={() => setMediaError(true)}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
