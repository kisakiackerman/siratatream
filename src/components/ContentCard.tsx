import { useState, type MouseEvent } from "react";
import { Play, Plus, ThumbsUp, ChevronDown, Check, DownloadCloud, CheckCircle } from "lucide-react";
import { ContentItem } from "@/data/catalog";
import { useMyList } from "@/lib/useMyList";
import YouTubeHoverPreview from "@/components/YouTubeHoverPreview";
import { isDownloadedOffline, saveOfflineDownload, removeOfflineDownload } from "@/lib/offlineStorage";
import { getReciterForItem } from "@/lib/reciterData";

type ContentCardProps = {
  key?: string;
  item: ContentItem;
  onPlay: (id: string) => void;
  onInfo: (id: string) => void;
};

export default function ContentCard({ item, onPlay, onInfo }: ContentCardProps) {
  const [liked, setLiked] = useState(false);
  const { inList, toggle } = useMyList();
  const saved = inList(item.id);
  const [downloaded, setDownloaded] = useState(() => isDownloadedOffline(item.id));
  const isTarawih = item.channel === "Récitations Haramain" || item.categories.includes("Coran");
  const reciter = isTarawih ? getReciterForItem(item.title, item.description, item.channel) : null;

  const handleToggleDownload = (e: MouseEvent) => {
    e.stopPropagation();
    if (downloaded) {
      removeOfflineDownload(item.id);
      setDownloaded(false);
    } else {
      saveOfflineDownload(item);
      setDownloaded(true);
    }
  };

  return (
    <div
      tabIndex={0}
      role="button"
      aria-label={`Ouvrir les détails de ${item.title}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onInfo(item.id);
        }
      }}
      className="group relative flex-shrink-0 w-36 sm:w-44 lg:w-48 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-2xl"
    >
      {/* Card thumbnail with Liquid Glass frame and smooth micro-interaction */}
      <div className="video-thumb-interactive relative overflow-hidden rounded-2xl aspect-[2/3] liquid-glass-card border border-emerald-300/25 shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)]">
        <YouTubeHoverPreview
          youtubeId={item.youtubeId}
          image={item.image}
          alt={item.title}
          imageClassName="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          fallbackImage={reciter?.photoUrl || "/images/sheikh_ali_jaber.jpg"}
        />

        {/* Hover overlay with smooth gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Reciter Photo Badge with Liquid Glass for Tarawih / Quran recordings */}
        {reciter && (
          <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1.5 bg-emerald-400/15 backdrop-blur-xl px-2.5 py-1 rounded-full border border-emerald-300/30 shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)] max-w-[90%] transition-transform duration-200 group-hover:scale-105">
            <img
              src={reciter.photoUrl}
              alt={reciter.name}
              className="w-5 h-5 rounded-full object-cover border border-emerald-300/40 flex-shrink-0"
              onError={(e) => {
                const img = e.currentTarget;
                img.style.display = "none";
              }}
            />
            <span className="text-[10px] text-emerald-100 font-medium truncate leading-none pr-0.5">
              {reciter.name.replace("Sheikh ", "")}
            </span>
          </div>
        )}

        {/* Badges in Liquid Glass */}
        {item.seriesId && (
          <div className="absolute top-2.5 left-2.5 bg-amber-500/25 border border-amber-400/40 text-amber-200 text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(251,191,36,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)]">
            {item.episodeNumber ? `Ép. ${item.episodeNumber}` : "Série"}
          </div>
        )}
        {!item.seriesId && item.isNew && (
          <div className="absolute top-2.5 left-2.5 bg-emerald-400/15 border border-emerald-300/30 text-emerald-200 text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)]">
            Nouveau
          </div>
        )}
        {!item.seriesId && item.isTrending && !item.isNew && (
          <div className="absolute top-2.5 left-2.5 bg-emerald-400/15 border border-emerald-300/30 text-emerald-200 text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)]">
            En Tendance
          </div>
        )}

        {downloaded && (
          <div className="absolute top-2.5 right-2.5 bg-emerald-400/15 border border-emerald-300/30 p-1 rounded-full text-emerald-300 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)]">
            <CheckCircle size={13} />
          </div>
        )}

        {/* Play button overlay in Liquid Glass */}
        <button
          onClick={() => onPlay(item.id)}
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          aria-label={`Lire ${item.title}`}
        >
          <div className="w-12 h-12 rounded-full bg-emerald-400/25 hover:bg-emerald-400/40 flex items-center justify-center border border-emerald-300/40 backdrop-blur-xl hover:scale-110 active:scale-95 transition-all text-emerald-200 shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)]">
            <Play size={20} fill="currentColor" className="text-emerald-300 ml-0.5" />
          </div>
        </button>
      </div>

      {/* Expanded hover card in Liquid Glass */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-64 sm:w-72 bg-zinc-950/95 backdrop-blur-2xl rounded-2xl shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25),0_20px_40px_rgba(0,0,0,0.6)] border border-emerald-300/30 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-300 translate-y-1 group-hover:translate-y-2 z-30 mt-1.5">
        <div className="p-4">
          {/* Action row with Liquid Glass pills */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => onPlay(item.id)}
              className="w-9 h-9 rounded-full bg-emerald-400 text-zinc-950 font-bold flex items-center justify-center hover:bg-emerald-300 active:scale-90 transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_12px_rgba(16,185,129,0.35)]"
              title="Lire la vidéo"
              aria-label="Lire la vidéo"
            >
              <Play size={16} fill="currentColor" className="ml-0.5" />
            </button>
            <button
              onClick={() => toggle(item)}
              className="w-9 h-9 rounded-full bg-emerald-400/10 border border-emerald-300/30 hover:border-emerald-300/50 flex items-center justify-center text-emerald-200 hover:bg-emerald-400/20 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(167,243,208,0.30),inset_0_-2px_4px_rgba(0,0,0,0.20)] active:scale-90 transition-all"
              title={saved ? "Retirer de Ma Liste" : "Ajouter à Ma Liste"}
              aria-label={saved ? "Retirer de Ma Liste" : "Ajouter à Ma Liste"}
            >
              {saved ? <Check size={16} className="text-emerald-300" /> : <Plus size={16} />}
            </button>
            <button
              onClick={() => setLiked((v) => !v)}
              className={`w-9 h-9 rounded-full border flex items-center justify-center active:scale-90 transition-all backdrop-blur-xl ${
                liked
                  ? "bg-emerald-400/25 border-emerald-300/50 text-emerald-200 shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)]"
                  : "bg-emerald-400/10 border-emerald-300/30 hover:border-emerald-300/50 text-emerald-200 hover:bg-emerald-400/20 shadow-[inset_0_1px_1px_rgba(167,243,208,0.30),inset_0_-2px_4px_rgba(0,0,0,0.20)]"
              }`}
              title="J'aime"
              aria-label={liked ? "Je n'aime plus" : "J'aime cette vidéo"}
            >
              <ThumbsUp size={15} />
            </button>
            <button
              onClick={handleToggleDownload}
              className={`w-9 h-9 rounded-full border flex items-center justify-center active:scale-90 transition-all backdrop-blur-xl ${
                downloaded
                  ? "bg-emerald-400/25 border-emerald-300/50 text-emerald-200 shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)]"
                  : "bg-emerald-400/10 border-emerald-300/30 hover:border-emerald-300/50 text-emerald-200 hover:bg-emerald-400/20 shadow-[inset_0_1px_1px_rgba(167,243,208,0.30),inset_0_-2px_4px_rgba(0,0,0,0.20)]"
              }`}
              title={downloaded ? "Téléchargé hors-ligne" : "Télécharger hors-ligne"}
              aria-label={downloaded ? "Supprimer le téléchargement hors-ligne" : "Télécharger pour regarder hors-ligne"}
            >
              {downloaded ? <CheckCircle size={15} className="text-emerald-300" /> : <DownloadCloud size={15} />}
            </button>
            <button
              onClick={() => onInfo(item.id)}
              className="ml-auto w-9 h-9 rounded-full bg-emerald-400/10 border border-emerald-300/30 hover:border-emerald-300/50 flex items-center justify-center text-emerald-200 hover:bg-emerald-400/20 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(167,243,208,0.30),inset_0_-2px_4px_rgba(0,0,0,0.20)] active:scale-90 transition-all"
              title="Plus d'informations"
              aria-label="Plus d'informations"
            >
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Reciter profile snippet in hover card if Tarawih */}
          {reciter && (
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-emerald-400/10 backdrop-blur-xl border border-emerald-300/25 shadow-[inset_0_1px_1px_rgba(167,243,208,0.30),inset_0_-2px_4px_rgba(0,0,0,0.20)] mb-2.5">
              <img
                src={reciter.photoUrl}
                alt={reciter.name}
                className="w-8 h-8 rounded-full object-cover border border-emerald-300/30 flex-shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-emerald-100 truncate">{reciter.name}</p>
                <p className="text-[10px] text-emerald-300/80 truncate">{reciter.mosque}</p>
              </div>
            </div>
          )}

          <h3 className="text-white font-bold text-sm leading-tight mb-1.5 line-clamp-2">
            {item.title}
          </h3>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="bg-emerald-400/15 border border-emerald-300/30 text-emerald-200 px-2 py-0.5 rounded-full text-[11px] font-semibold shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)]">
              {item.score}% Match
            </span>
            <span className="bg-emerald-400/10 border border-emerald-300/25 text-emerald-200 px-1.5 py-0.5 rounded text-[11px]">
              {item.rating}
            </span>
            <span className="text-zinc-300 text-xs truncate max-w-[120px]">{item.channel}</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {item.categories.map((g) => (
              <span key={g} className="bg-emerald-400/10 border border-emerald-300/25 px-2 py-0.5 rounded-full text-[10px] text-emerald-200">
                {g}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
