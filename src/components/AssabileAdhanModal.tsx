import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  X,
  Search,
  Volume2,
  VolumeX,
  Volume1,
  Play,
  Pause,
  Square,
  Download,
  Check,
  ExternalLink,
  Radio,
  Sparkles,
  MapPin,
  Clock,
  Music,
  Share2,
  FileAudio,
  ListMusic,
  Layers,
} from "lucide-react";
import { ASSABILE_ADHANS, AssabileAdhan } from "@/data/assabileAdhans";
import {
  playAdhanAudio,
  stopAdhanAudio,
  exportAdhanMp3,
  getCurrentPlayingAdhanId,
  getCurrentAudioElement,
  getAdhanDownloadUrl,
} from "@/lib/adhanAudio";
import { GlassPanel } from "@/components/GlassSurface";

interface AssabileAdhanModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSoundId: string;
  onSelectSound: (soundId: string, adhanTitle: string) => void;
  onShowToast?: (msg: string) => void;
}

type CategoryFilter = "all" | "makkah" | "madinah" | "aqsa" | "fajr" | "famous" | "maghreb" | "world";

export default function AssabileAdhanModal({
  isOpen,
  onClose,
  selectedSoundId,
  onSelectSound,
  onShowToast,
}: AssabileAdhanModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [activeAdhan, setActiveAdhan] = useState<AssabileAdhan | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isExportingPack, setIsExportingPack] = useState(false);
  const [packExportProgress, setPackExportProgress] = useState(0);

  // Audio player state
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Stop audio on unmount or modal close
  useEffect(() => {
    return () => {
      stopAdhanAudio();
    };
  }, []);

  // Hook into current audio element for real-time progress & duration
  useEffect(() => {
    if (!playingId) {
      return;
    }
    const audio = getCurrentAudioElement();
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        setDuration(audio.duration);
      }
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        setDuration(audio.duration);
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [playingId]);

  // Filtered adhans list
  const filteredAdhans = useMemo(() => {
    let list = ASSABILE_ADHANS;

    if (activeCategory !== "all") {
      list = list.filter((a) => a.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.muezzin.toLowerCase().includes(q) ||
          a.title.toLowerCase().includes(q) ||
          a.location.toLowerCase().includes(q) ||
          (a.isFajr && "fajr".includes(q))
      );
    }

    return list;
  }, [activeCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryFilter, number> = {
      all: ASSABILE_ADHANS.length,
      makkah: ASSABILE_ADHANS.filter((a) => a.category === "makkah").length,
      madinah: ASSABILE_ADHANS.filter((a) => a.category === "madinah").length,
      aqsa: ASSABILE_ADHANS.filter((a) => a.category === "aqsa").length,
      fajr: ASSABILE_ADHANS.filter((a) => a.category === "fajr").length,
      famous: ASSABILE_ADHANS.filter((a) => a.category === "famous").length,
      maghreb: ASSABILE_ADHANS.filter((a) => a.category === "maghreb").length,
      world: ASSABILE_ADHANS.filter((a) => a.category === "world").length,
    };
    return counts;
  }, []);

  const handleTogglePlay = (adhan: AssabileAdhan) => {
    if (playingId === adhan.id) {
      stopAdhanAudio();
      setPlayingId(null);
    } else {
      stopAdhanAudio();
      setPlayingId(adhan.id);
      setActiveAdhan(adhan);
      setCurrentTime(0);
      setDuration(0);

      playAdhanAudio(adhan.id, {
        onStart: () => {
          setPlayingId(adhan.id);
          setActiveAdhan(adhan);
        },
        onEnded: () => {
          setPlayingId(null);
          setCurrentTime(0);
        },
        onError: () => {
          setPlayingId(null);
          onShowToast?.("Erreur lors de la lecture audio.");
        },
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    const audio = getCurrentAudioElement();
    if (audio) {
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    const audio = getCurrentAudioElement();
    if (audio) {
      audio.volume = newVol;
      audio.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
  };

  const toggleMute = () => {
    const audio = getCurrentAudioElement();
    if (audio) {
      const nextMute = !isMuted;
      audio.muted = nextMute;
      setIsMuted(nextMute);
    }
  };

  const handleExport = async (adhan: AssabileAdhan, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDownloadingId(adhan.id);
    try {
      const ok = await exportAdhanMp3(adhan);
      if (ok) {
        onShowToast?.(`Fichier MP3 de ${adhan.muezzin} exporté avec succès !`);
      } else {
        onShowToast?.("Téléchargement du MP3 initié.");
      }
    } catch {
      onShowToast?.("Erreur lors de l'exportation du fichier audio.");
    } finally {
      setDownloadingId(null);
    }
  };

  // Export pack of top 5 famous adhans
  const handleExportTopPack = async () => {
    setIsExportingPack(true);
    setPackExportProgress(0);

    const top5Ids = [
      "assabile_54944191e2e2", // Mecque
      "assabile_b30ca9a3e115", // Médine
      "assabile_f41961917fef", // Al-Aqsa
      "assabile_c920f6994c65", // Mishary Alafasy
      "assabile_0e84b7911da2", // Abdelbasset Abdessamad
    ];

    const targetList = ASSABILE_ADHANS.filter((a) => top5Ids.includes(a.id)).slice(0, 5);

    let count = 0;
    for (const adhan of targetList) {
      try {
        await exportAdhanMp3(adhan);
        count++;
        setPackExportProgress(Math.round((count / targetList.length) * 100));
        // Small stagger to let browser file save handle downloads cleanly
        await new Promise((r) => setTimeout(r, 600));
      } catch (err) {
        console.warn("Pack item export error:", err);
      }
    }

    setIsExportingPack(false);
    onShowToast?.(`Pack de 5 Adhans célèbres exporté en MP3 (${count}/5 reçus) !`);
  };

  const handleChooseAdhan = (adhan: AssabileAdhan) => {
    onSelectSound(adhan.id, `${adhan.muezzin} (${adhan.location})`);
    onShowToast?.(`Sonnerie de rappel configurée : ${adhan.muezzin}`);
    onClose();
  };

  const formatSeconds = (sec: number): string => {
    if (!sec || isNaN(sec)) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-zinc-950/95 border border-white/20 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <FileAudio size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold text-base sm:text-lg">
                  Sonneries & Adhans MP3 Authentiques
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30">
                  259 Adhans
                </span>
              </div>
              <p className="text-zinc-400 text-xs">
                Écoutez en direct et exportez les fichiers MP3 authentiques de fr.assabile.com
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Top Pack Quick Export Button */}
            <button
              onClick={handleExportTopPack}
              disabled={isExportingPack}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-all disabled:opacity-50 shadow-sm"
              title="Exporter les 5 adhans les plus célèbres (Mecque, Médine, Al-Aqsa, Alafasy, Abdessamad) en MP3"
            >
              <Download size={13} className={isExportingPack ? "animate-bounce" : ""} />
              <span>
                {isExportingPack ? `Export Pack (${packExportProgress}%)` : "Pack Top 5 (MP3)"}
              </span>
            </button>

            <a
              href="https://fr.assabile.com/adhan-call-prayer/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs border border-white/10 transition-colors"
              title="Ouvrir le site source officiel"
            >
              <span>fr.assabile.com</span>
              <ExternalLink size={12} />
            </a>

            <button
              onClick={() => {
                stopAdhanAudio();
                onClose();
              }}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Fermer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-white/10 bg-zinc-900/30 space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Rechercher un récitateur, une mosquée ou un pays (ex: Mecque, Médine, Alafasy, Algérie...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/80 border border-white/10 text-white placeholder-zinc-500 text-xs sm:text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs"
              >
                Effacer
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all ${
                activeCategory === "all"
                  ? "bg-emerald-500 text-black font-semibold shadow-lg shadow-emerald-500/20"
                  : "bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white border border-white/5"
              }`}
            >
              Tout ({categoryCounts.all})
            </button>
            <button
              onClick={() => setActiveCategory("makkah")}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all ${
                activeCategory === "makkah"
                  ? "bg-emerald-500 text-black font-semibold shadow-lg shadow-emerald-500/20"
                  : "bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white border border-white/5"
              }`}
            >
              La Mecque ({categoryCounts.makkah})
            </button>
            <button
              onClick={() => setActiveCategory("madinah")}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all ${
                activeCategory === "madinah"
                  ? "bg-emerald-500 text-black font-semibold shadow-lg shadow-emerald-500/20"
                  : "bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white border border-white/5"
              }`}
            >
              Médine ({categoryCounts.madinah})
            </button>
            <button
              onClick={() => setActiveCategory("aqsa")}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all ${
                activeCategory === "aqsa"
                  ? "bg-emerald-500 text-black font-semibold shadow-lg shadow-emerald-500/20"
                  : "bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white border border-white/5"
              }`}
            >
              Al-Qods / Aqsa ({categoryCounts.aqsa})
            </button>
            <button
              onClick={() => setActiveCategory("fajr")}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all ${
                activeCategory === "fajr"
                  ? "bg-emerald-500 text-black font-semibold shadow-lg shadow-emerald-500/20"
                  : "bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white border border-white/5"
              }`}
            >
              Adhan Al-Fajr ({categoryCounts.fajr})
            </button>
            <button
              onClick={() => setActiveCategory("famous")}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all ${
                activeCategory === "famous"
                  ? "bg-emerald-500 text-black font-semibold shadow-lg shadow-emerald-500/20"
                  : "bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white border border-white/5"
              }`}
            >
              Récitateurs ({categoryCounts.famous})
            </button>
            <button
              onClick={() => setActiveCategory("maghreb")}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all ${
                activeCategory === "maghreb"
                  ? "bg-emerald-500 text-black font-semibold shadow-lg shadow-emerald-500/20"
                  : "bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white border border-white/5"
              }`}
            >
              Maghreb ({categoryCounts.maghreb})
            </button>
            <button
              onClick={() => setActiveCategory("world")}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all ${
                activeCategory === "world"
                  ? "bg-emerald-500 text-black font-semibold shadow-lg shadow-emerald-500/20"
                  : "bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white border border-white/5"
              }`}
            >
              Monde ({categoryCounts.world})
            </button>
          </div>
        </div>

        {/* List of Adhans */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-h-[50vh]">
          {filteredAdhans.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <VolumeX size={32} className="mx-auto text-zinc-600" />
              <p className="text-zinc-400 text-sm font-medium">
                Aucun adhan ne correspond à votre recherche.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("all");
                }}
                className="text-xs text-emerald-400 hover:underline"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            filteredAdhans.map((adhan) => {
              const isPlaying = playingId === adhan.id;
              const isSelected =
                selectedSoundId === adhan.id ||
                (selectedSoundId === "adhan_makkah" && adhan.id === "assabile_54944191e2e2") ||
                (selectedSoundId === "adhan_madinah" && adhan.id === "assabile_b30ca9a3e115");
              const isDownloading = downloadingId === adhan.id;

              return (
                <div
                  key={adhan.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isPlaying
                      ? "bg-emerald-500/15 border-emerald-500/50 shadow-md shadow-emerald-500/10"
                      : isSelected
                      ? "bg-emerald-500/10 border-emerald-500/30 shadow-sm"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {/* Left info & play button */}
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => handleTogglePlay(adhan)}
                      className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0 relative overflow-hidden ${
                        isPlaying
                          ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/30"
                          : "bg-white/10 hover:bg-emerald-500 hover:text-black text-white"
                      }`}
                      title={isPlaying ? "Arrêter la lecture" : "Écouter l'Adhan"}
                    >
                      {isPlaying ? (
                        <div className="flex items-center gap-0.5">
                          <span className="w-1 h-3.5 bg-black rounded-sm animate-pulse" />
                          <span className="w-1 h-5 bg-black rounded-sm animate-bounce" />
                          <span className="w-1 h-3 bg-black rounded-sm animate-pulse" />
                        </div>
                      ) : (
                        <Play size={16} className="ml-0.5" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-white text-sm font-semibold truncate">
                          {adhan.muezzin}
                        </h4>
                        {adhan.isFajr && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 text-[10px] font-semibold border border-amber-500/30">
                            Adhan Al-Fajr
                          </span>
                        )}
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-500/40 flex items-center gap-1">
                            <Check size={10} />
                            Sonnerie active
                          </span>
                        )}
                        {isPlaying && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-400 text-black text-[10px] font-bold animate-pulse">
                            En écoute
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1 text-zinc-300">
                          <MapPin size={11} className="text-emerald-400" />
                          {adhan.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {adhan.duration}
                        </span>
                        <span className="text-zinc-500">{adhan.title}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                    {/* Direct Audio MP3 Export Button */}
                    <button
                      onClick={(e) => handleExport(adhan, e)}
                      disabled={isDownloading}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 hover:text-emerald-200 text-xs font-semibold border border-emerald-500/30 flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
                      title="Télécharger directement le fichier audio MP3 de cet Adhan"
                    >
                      <Download size={13} className={isDownloading ? "animate-bounce" : ""} />
                      <span>{isDownloading ? "Téléchargement..." : "Exporter MP3"}</span>
                    </button>

                    {/* Set as prayer reminder */}
                    <button
                      onClick={() => handleChooseAdhan(adhan)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default"
                          : "bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-sm"
                      }`}
                      title="Utiliser cet adhan pour les rappels de prières"
                    >
                      {isSelected ? (
                        <>
                          <Check size={13} />
                          <span>Sonnerie par défaut</span>
                        </>
                      ) : (
                        <span>Définir en sonnerie</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Live Audio Player Bar (Active whenever an Adhan is playing or active) */}
        {activeAdhan && (
          <div className="px-5 py-3 border-t border-emerald-500/30 bg-zinc-900/95 flex flex-col gap-2 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              {/* Currently playing title */}
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  onClick={() => handleTogglePlay(activeAdhan)}
                  className="w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center flex-shrink-0 transition-colors shadow-md shadow-emerald-500/20"
                >
                  {playingId === activeAdhan.id ? <Square size={13} /> : <Play size={13} className="ml-0.5" />}
                </button>
                <div className="min-w-0">
                  <p className="text-white text-xs font-bold truncate flex items-center gap-1.5">
                    <span>{activeAdhan.muezzin}</span>
                    <span className="text-zinc-400 font-normal text-[11px]">({activeAdhan.location})</span>
                  </p>
                  <p className="text-[10px] text-emerald-400 truncate">
                    {playingId === activeAdhan.id ? "Lecture en cours..." : "En pause"}
                  </p>
                </div>
              </div>

              {/* Player Quick Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Volume slider */}
                <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                  <button
                    onClick={toggleMute}
                    className="text-zinc-400 hover:text-white transition-colors"
                    title={isMuted ? "Réactiver le son" : "Couper le son"}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX size={14} className="text-red-400" />
                    ) : volume < 0.5 ? (
                      <Volume1 size={14} />
                    ) : (
                      <Volume2 size={14} />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    title="Volume"
                  />
                </div>

                {/* Exporter MP3 button in player */}
                <button
                  onClick={() => handleExport(activeAdhan)}
                  disabled={downloadingId === activeAdhan.id}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black hover:bg-emerald-400 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-500/20"
                  title="Télécharger ce fichier MP3 sur votre appareil"
                >
                  <Download size={13} />
                  <span>Exporter MP3</span>
                </button>
              </div>
            </div>

            {/* Seek Bar & Progress */}
            <div className="flex items-center gap-2.5 text-[11px] text-zinc-400">
              <span className="font-mono text-zinc-300 w-10 text-right">
                {formatSeconds(currentTime)}
              </span>
              <input
                type="range"
                min="0"
                max={duration || 180}
                step="0.5"
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 hover:accent-emerald-300 transition-all"
              />
              <span className="font-mono text-zinc-400 w-10">
                {duration ? formatSeconds(duration) : activeAdhan.duration}
              </span>
            </div>
          </div>
        )}

        {/* Footer info bar */}
        <div className="px-5 py-3 border-t border-white/10 bg-zinc-900/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>
              {filteredAdhans.length} sonneries d'Adhan prêtes à l'export MP3 et à l'écoute haute fidélité
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span>Format : MP3 Stéréo 44.1kHz</span>
            <span>·</span>
            <span>Prêt pour alarmes, sonneries et baladeurs</span>
          </div>
        </div>
      </div>
    </div>
  );
}
