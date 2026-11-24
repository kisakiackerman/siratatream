import { useEffect, useState } from "react";
import { X, Play, Trash2, Bookmark, Layers, LayoutGrid } from "lucide-react";
import { motion } from "motion/react";
import { useMyList } from "@/lib/useMyList";
import Coverflow3D from "@/components/3d/Coverflow3D";

type MyListModalProps = {
  onClose: () => void;
  onPlay: (id: string) => void;
};

export default function MyListModal({ onClose, onPlay }: MyListModalProps) {
  const { items, remove, loading } = useMyList();
  const [viewMode, setViewMode] = useState<"coverflow" | "grid">("coverflow");

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

  const handlePlay = (contentId: string) => {
    onClose();
    onPlay(contentId);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4"
      style={{ perspective: "1200px" }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.92, z: -80, rotateX: 6 }}
        animate={{ opacity: 1, scale: 1, z: 0, rotateX: 0 }}
        exit={{ opacity: 0, scale: 0.94, z: -40, rotateX: 3 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative z-10 w-full sm:max-w-3xl max-h-[90vh] bg-zinc-950/90 backdrop-blur-2xl sm:rounded-3xl overflow-hidden flex flex-col shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_35px_rgba(245,158,11,0.2)] mt-16 sm:mt-0 border border-amber-400/30"
      >
        {/* Header with Mode Toggle */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10 bg-white/5 flex-shrink-0">
          <Bookmark size={20} className="text-amber-400 fill-amber-400/30" />
          <h2 className="text-white font-bold text-lg flex-1">Ma Liste</h2>

          {items.length > 0 && (
            <div className="flex items-center bg-zinc-900 border border-white/10 rounded-xl p-0.5 mr-2">
              <button
                onClick={() => setViewMode("coverflow")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === "coverflow"
                    ? "bg-amber-400 text-zinc-950 shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
                title="Affichage Coverflow 3D"
              >
                <Layers size={13} />
                <span>3D</span>
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === "grid"
                    ? "bg-amber-400 text-zinc-950 shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
                title="Affichage Grille"
              >
                <LayoutGrid size={13} />
                <span>Grille</span>
              </button>
            </div>
          )}

          <span className="text-zinc-400 text-xs hidden sm:inline">
            {items.length} vidéo{items.length > 1 ? "s" : ""}
          </span>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
          >
            <X size={17} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-zinc-500 text-sm">Chargement...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bookmark size={40} className="text-zinc-700 mb-4" />
              <p className="text-zinc-400 text-base font-medium mb-2">
                Votre liste est vide
              </p>
              <p className="text-zinc-600 text-sm max-w-xs">
                Ajoutez des vidéos à votre liste en cliquant sur le bouton + sur
                une vidéo pour la regarder plus tard.
              </p>
            </div>
          ) : viewMode === "coverflow" ? (
            <Coverflow3D items={items} onPlay={handlePlay} onRemove={remove} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group flex gap-3 bg-zinc-900/60 hover:bg-zinc-800/80 rounded-2xl overflow-hidden transition-all border border-emerald-300/20 p-2.5 shadow-md"
                >
                  {/* Thumbnail */}
                  <button
                    onClick={() => handlePlay(item.id)}
                    className="video-thumb-interactive relative flex-shrink-0 w-36 aspect-video rounded-xl overflow-hidden cursor-pointer bg-zinc-950"
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        if (!img.src.includes("hqdefault")) {
                          img.src = `https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg`;
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play size={22} fill="white" className="text-white ml-0.5" />
                    </div>
                  </button>

                  {/* Info */}
                  <div className="flex flex-col flex-1 py-1 pr-2 min-w-0">
                    <button
                      onClick={() => handlePlay(item.id)}
                      className="text-left"
                    >
                      <p className="text-white text-xs sm:text-sm font-semibold leading-tight line-clamp-2 mb-1 hover:text-amber-300 transition-colors">
                        {item.title}
                      </p>
                    </button>
                    <p className="text-zinc-500 text-xs mb-1">
                      {item.channel} · {item.year}
                    </p>
                    <button
                      onClick={() => remove(item.id)}
                      className="mt-auto flex items-center gap-1 text-zinc-500 hover:text-rose-400 text-xs transition-colors pt-2"
                    >
                      <Trash2 size={12} />
                      Retirer de la liste
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
