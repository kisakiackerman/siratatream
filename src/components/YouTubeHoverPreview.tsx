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
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <img
        src={image}
        alt={alt}
        className={imageClassName}
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
    </div>
  );
}
