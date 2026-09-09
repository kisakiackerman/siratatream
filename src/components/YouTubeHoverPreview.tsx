import { useEffect, useRef, useState } from "react";

type YouTubeHoverPreviewProps = {
  youtubeId: string;
  image: string;
  alt: string;
  imageClassName: string;
  loading?: "eager" | "lazy";
  fallbackImage?: string;
};

export default function YouTubeHoverPreview({
  youtubeId,
  image,
  alt,
  imageClassName,
  loading = "lazy",
  fallbackImage = "/images/sheikh_ali_jaber.jpg",
}: YouTubeHoverPreviewProps) {
  const [showPreview, setShowPreview] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    };
  }, []);

  function handleMouseEnter() {
    hoverTimer.current = setTimeout(() => setShowPreview(true), 1200);
  }

  function handleMouseLeave() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
    setShowPreview(false);
  }

  return (
    <div
      className="absolute inset-0"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <img
        src={image}
        alt={alt}
        className={`${imageClassName} transition-opacity duration-200 ${showPreview ? "opacity-0" : "opacity-100"}`}
        loading={loading}
        onError={(e) => {
          const img = e.currentTarget;
          if (!img.dataset.triedHq) {
            img.dataset.triedHq = "true";
            img.src = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
          } else if (!img.dataset.triedMq) {
            img.dataset.triedMq = "true";
            img.src = `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`;
          } else if (!img.dataset.triedReciter) {
            img.dataset.triedReciter = "true";
            img.src = fallbackImage;
          }
        }}
      />
      {showPreview && (
        <iframe
          key={youtubeId}
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${youtubeId}&start=0&end=10&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&fs=0&playsinline=1`}
          title={`${alt} - aperçu`}
          className="absolute inset-0 w-full h-full pointer-events-none"
          allow="autoplay; encrypted-media"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}
    </div>
  );
}
