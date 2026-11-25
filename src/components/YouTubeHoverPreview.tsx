import { useState, useEffect, useRef, useCallback } from "react";
import { isKnownUnplayableVideo } from "@/lib/youtubeApi";

type YouTubeHoverPreviewProps = {
  youtubeId: string;
  image: string;
  alt: string;
  imageClassName?: string;
  loading?: "eager" | "lazy";
  fallbackImage?: string;
  isHovered?: boolean;
  videoUrl?: string;
};

// Global active preview mutex: only one video preview can play at a time across the whole app
let currentActivePreviewId: string | null = null;
const previewListeners = new Set<(activeId: string | null) => void>();

function setActivePreview(id: string | null) {
  currentActivePreviewId = id;
  previewListeners.forEach((fn) => fn(id));
}

export default function YouTubeHoverPreview({
  youtubeId,
  image,
  alt,
  imageClassName = "w-full h-full object-cover",
  loading = "lazy",
  fallbackImage = "/images/sheikh_ali_jaber.jpg",
  isHovered = false,
  videoUrl,
}: YouTubeHoverPreviewProps) {
  // Poster thumbnail resolution fallback progression
  const [currentSrc, setCurrentSrc] = useState(image);
  const [fallbackStep, setFallbackStep] = useState<"initial" | "hq" | "mq" | "reciter">("initial");

  // Re-sync initial source if image prop changes
  useEffect(() => {
    setCurrentSrc(image);
    setFallbackStep("initial");
  }, [image, youtubeId]);

  const advanceFallback = useCallback(() => {
    const isCustomId = !youtubeId || youtubeId.startsWith("embed_") || youtubeId.startsWith("direct_");
    if (fallbackStep === "initial" && !isCustomId) {
      setFallbackStep("hq");
      setCurrentSrc(`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`);
    } else if (fallbackStep === "hq" && !isCustomId) {
      setFallbackStep("mq");
      setCurrentSrc(`https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`);
    } else if (fallbackStep !== "reciter") {
      setFallbackStep("reciter");
      setCurrentSrc(fallbackImage);
    }
  }, [fallbackStep, youtubeId, fallbackImage]);

  // Video preview state
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const hoverTimerRef = useRef<any>(null);

  // Check user settings for hover preview
  const [previewEnabled, setPreviewEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return localStorage.getItem("nexstream_autoplay_preview") !== "false";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const handleStorage = () => {
      try {
        setPreviewEnabled(localStorage.getItem("nexstream_autoplay_preview") !== "false");
      } catch {
        // ignore
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Listen for global mutex updates so only 1 card previews at a time
  useEffect(() => {
    const listener = (activeId: string | null) => {
      if (activeId !== youtubeId && isPlayingPreview) {
        setIsPlayingPreview(false);
        setIsIframeLoaded(false);
      }
    };
    previewListeners.add(listener);
    return () => {
      previewListeners.delete(listener);
    };
  }, [youtubeId, isPlayingPreview]);

  // Handle hover debounce
  useEffect(() => {
    // If not hovered or setting disabled, cancel preview immediately
    if (!isHovered || !previewEnabled) {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      if (isPlayingPreview) {
        setIsPlayingPreview(false);
        setIsIframeLoaded(false);
        if (currentActivePreviewId === youtubeId) {
          setActivePreview(null);
        }
      }
      return;
    }

    // Skip video previews on mobile touch devices or reduced motion to preserve performance & bandwidth
    const isTouch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
    const isReduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isTouch || isReduced) return;

    // Check if we have a playable ID or direct video
    const isCustomEmbed = youtubeId && (youtubeId.startsWith("embed_") || youtubeId.startsWith("direct_"));
    if (youtubeId && !isCustomEmbed && isKnownUnplayableVideo(youtubeId)) return;
    const hasPlayableSource = (youtubeId && !isCustomEmbed) || (videoUrl && (videoUrl.endsWith(".mp4") || videoUrl.endsWith(".webm")));
    if (!hasPlayableSource) return;

    // 550ms debounce before triggering silent video preview
    hoverTimerRef.current = setTimeout(() => {
      setActivePreview(youtubeId);
      setIsPlayingPreview(true);
    }, 550);

    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    };
  }, [isHovered, previewEnabled, youtubeId, videoUrl, isPlayingPreview]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
      if (currentActivePreviewId === youtubeId) {
        setActivePreview(null);
      }
    };
  }, [youtubeId]);

  const cleanYtId = youtubeId && !youtubeId.startsWith("embed_") && !youtubeId.startsWith("direct_") ? youtubeId : null;
  const isDirectVideo = Boolean(videoUrl && (videoUrl.endsWith(".mp4") || videoUrl.endsWith(".webm")));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {/* 1. Poster thumbnail with multi-tier fallback */}
      <img
        src={currentSrc}
        alt={alt}
        className={imageClassName}
        loading={loading}
        onLoad={(e) => {
          // Detect YouTube's 120x90 gray "Video unavailable" placeholder returned with HTTP 200
          const img = e.currentTarget;
          if (img.naturalWidth <= 120 && img.naturalHeight <= 90) {
            advanceFallback();
          }
        }}
        onError={advanceFallback}
      />

      {/* 2. Silent Animated Video Preview on deliberate hover */}
      {isPlayingPreview && (
        <div
          className={`absolute inset-0 z-10 overflow-hidden transition-opacity duration-500 bg-black ${
            isIframeLoaded ? "opacity-100" : "opacity-0"
          }`}
        >
          {isDirectVideo ? (
            <video
              src={videoUrl}
              autoPlay
              loop
              muted
              playsInline
              onLoadedData={() => setIsIframeLoaded(true)}
              className="w-full h-full object-cover scale-105 pointer-events-none"
            />
          ) : cleanYtId ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${cleanYtId}?autoplay=1&mute=1&controls=0&playsinline=1&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&fs=0&vq=highres&hd=1&loop=1&playlist=${cleanYtId}&start=10&origin=${encodeURIComponent(
                typeof window !== "undefined" ? window.location.origin : ""
              )}`}
              title={`Aperçu ${alt}`}
              className="w-full h-full object-cover border-0 pointer-events-none scale-125"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              onLoad={() => setIsIframeLoaded(true)}
              tabIndex={-1}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
