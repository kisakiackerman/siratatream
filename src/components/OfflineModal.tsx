import { useState, useEffect } from "react";
import { DownloadCloud, Play, Trash2, X, HardDrive, CheckCircle } from "lucide-react";
import { motion } from "motion/react";
import { getOfflineDownloads, removeOfflineDownload, type OfflineDownload } from "@/lib/offlineStorage";

type OfflineModalProps = {
  onClose: () => void;
  onPlay: (contentId: string) => void;
};

export default function OfflineModal({ onClose, onPlay }: OfflineModalProps) {
  const [downloads, setDownloads] = useState<OfflineDownload[]>([]);

  useEffect(() => {
    setDownloads(getOfflineDownloads());
    const handler = () => setDownloads(getOfflineDownloads());
    window.addEventListener("nexstream-offline-changed", handler);
    return () => window.removeEventListener("nexstream-offline-changed", handler);
  }, []);

  const totalMB = downloads.reduce((acc, d) => acc + d.sizeMB, 0);

  const handleDelete = (id: string) => {
    const updated = removeOfflineDownload(id);
    setDownloads(updated);
  };

  const handlePlay = (id: string) => {
    onClose();
    onPlay(id);
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
        className="relative z-10 w-full sm:max-w-3xl max-h-[90vh] bg-zinc-900 sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl mt-16 sm:mt-0 border border-zinc-800"
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 flex-shrink-0">
          <DownloadCloud size={20} className="text-emerald-400" />
          <h2 className="text-white font-bold text-lg flex-1">Mode Hors-Ligne & Téléchargements</h2>
          <span className="text-zinc-400 text-xs flex items-center gap-1.5 bg-zinc-800 px-2.5 py-1 rounded-md">
            <HardDrive size={13} className="text-emerald-400" />
            {totalMB} MB stockés
          </span>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white transition-colors ml-2"
          >
            <X size={17} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {downloads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <DownloadCloud size={48} className="text-zinc-700 mb-4" />
              <p className="text-zinc-300 text-base font-semibold mb-1">
                Aucune vidéo enregistrée hors-ligne
              </p>
              <p className="text-zinc-500 text-sm max-w-sm">
                Vous pouvez télécharger n'importe quelle vidéo depuis la fiche de description ou le lecteur pour la regarder partout sans connexion internet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {downloads.map(({ contentId, sizeMB, downloadedAt, item }) => (
                <div
                  key={contentId}
                  className="group flex gap-4 bg-zinc-800/60 hover:bg-zinc-800 rounded-xl overflow-hidden p-2.5 transition-colors border border-zinc-700/50"
                >
                  <button
                    onClick={() => handlePlay(contentId)}
                    className="video-thumb-interactive relative flex-shrink-0 w-36 sm:w-44 aspect-video rounded-lg overflow-hidden bg-zinc-900 cursor-pointer"
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg`;
                      }}
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                      <Play size={24} fill="white" className="text-white ml-0.5" />
                    </div>
                  </button>

                  <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle size={12} /> Prêt hors-ligne
                        </span>
                        <span className="text-zinc-500 text-xs">·</span>
                        <span className="text-zinc-400 text-xs">{sizeMB} MB</span>
                      </div>
                      <button onClick={() => handlePlay(contentId)} className="text-left">
                        <p className="text-white text-sm font-semibold leading-tight line-clamp-2 hover:text-emerald-300 transition-colors">
                          {item.title}
                        </p>
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-700/40">
                      <span className="text-zinc-500 text-xs">
                        {item.channel}
                      </span>
                      <button
                        onClick={() => handleDelete(contentId)}
                        className="flex items-center gap-1 text-zinc-400 hover:text-red-400 text-xs transition-colors px-2 py-1 rounded hover:bg-red-950/20"
                      >
                        <Trash2 size={13} />
                        Supprimer le fichier
                      </button>
                    </div>
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
