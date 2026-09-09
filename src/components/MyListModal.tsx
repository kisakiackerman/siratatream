import { useEffect } from "react";
import { X, Play, Trash2, Bookmark } from "lucide-react";
import { motion } from "motion/react";
import { useMyList } from "@/lib/useMyList";

type MyListModalProps = {
  onClose: () => void;
  onPlay: (id: string) => void;
};

export default function MyListModal({ onClose, onPlay }: MyListModalProps) {
  const { items, remove, loading } = useMyList();

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
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 14 }}
        transition={{ type: "spring", damping: 28, stiffness: 350 }}
        className="relative z-10 w-full sm:max-w-3xl max-h-[90vh] bg-zinc-950/85 backdrop-blur-2xl sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl mt-16 sm:mt-0 border border-white/15"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10 bg-white/5 flex-shrink-0">
          <Bookmark size={20} className="text-white fill-white/20" />
          <h2 className="text-white font-bold text-lg flex-1">Ma Liste</h2>
          <span className="text-zinc-400 text-sm">{items.length} vidéo{items.length > 1 ? "s" : ""}</span>
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
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group flex gap-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl overflow-hidden transition-colors border border-zinc-800/60 p-2"
                >
                  {/* Thumbnail */}
                  <button
                    onClick={() => handlePlay(item.id)}
                    className="video-thumb-interactive relative flex-shrink-0 w-36 aspect-video rounded-lg overflow-hidden cursor-pointer"
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
                      <p className="text-white text-xs sm:text-sm font-semibold leading-tight line-clamp-2 mb-1 hover:text-emerald-300 transition-colors">
                        {item.title}
                      </p>
                    </button>
                    <p className="text-zinc-500 text-xs mb-1">
                      {item.channel} · {item.year}
                    </p>
                    <button
                      onClick={() => remove(item.id)}
                      className="mt-auto flex items-center gap-1 text-zinc-500 hover:text-red-400 text-xs transition-colors pt-2"
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
