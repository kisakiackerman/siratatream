import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  X,
  Maximize2,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  Sparkles,
  Music,
  AlertCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { ContentItem } from "@/data/catalog";
import { loadYouTubeAPI } from "@/lib/youtube";
import { fetchVideoPlaybackSource, markVideoAsUnplayable } from "@/lib/youtubeApi";
import { getReciterForItem } from "@/lib/reciterData";
import {
  detectNetworkSpeed,
  applyAdaptiveConnectionQuality,
  subscribeToNetworkQualityChanges,
} from "@/lib/adaptiveConnectionQuality";

type MiniPlayerProps = {
  item: ContentItem;
  initialTime?: number;
  mode?: "video" | "audio";
  onExpand: (currentTime?: number, mode?: "video" | "audio") => void;
  onClose: () => void;
  onSaveProgress?: (seconds: number, duration: number) => void;
};

export default function MiniPlayer({
  item,
  initialTime = 0,
  mode = "video",
  onExpand,
  onClose,
  onSaveProgress,
}: MiniPlayerProps) {
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [directStreamUrl, setDirectStreamUrl] = useState<string | null>(null);
  const [useIframe, setUseIframe] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showConfirmExit, setShowConfirmExit] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem("nexstream_playback_speed"));
      return v > 0 ? v : 1;
    } catch {
      return 1;
    }
  });

  const miniSpeedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

  const cycleMiniSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const curIdx = miniSpeedOptions.indexOf(playbackRate);
    const nextRate = miniSpeedOptions[(curIdx + 1) % miniSpeedOptions.length];
    setPlaybackRate(nextRate);
    try {
      localStorage.setItem("nexstream_playback_speed", String(nextRate));
    } catch {}

    if (videoRef.current) {
      videoRef.current.playbackRate = nextRate;
    }
    if (playerRef.current?.setPlaybackRate) {
      try {
        playerRef.current.setPlaybackRate(nextRate);
      } catch {}
    }
  };

  const playerRef = useRef<any>(null);
  const playerDivRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressTimer = useRef<any>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const controlsTimer = useRef<any>(null);
  const isTouchInteraction = useRef<boolean>(false);

  // Minuteur d'affichage des commandes et bandes cinéma (synchronisé avec le plein écran) :
  // - En lecture : reste affiché au moins 6 secondes après tout mouvement ou survol à la souris
  // - Sur écran tactile : reste affiché tant que l'écran est touché,
  //   puis au moins 6 secondes après que l'utilisateur cesse de toucher l'écran
  // - En pause : reste affiché en continu
  const resetControlsTimer = useCallback(() => {
    clearTimeout(controlsTimer.current);
    setShowControls(true);
    controlsTimer.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 6000);
  }, [playing]);

  const handleTouchStart = useCallback(() => {
    isTouchInteraction.current = true;
    clearTimeout(controlsTimer.current);
    setShowControls(true);
  }, []);

  const handleTouchEnd = useCallback(() => {
    isTouchInteraction.current = true;
    clearTimeout(controlsTimer.current);
    setShowControls(true);
    controlsTimer.current = setTimeout(() => {
      if (playing) setShowControls(false);
      setTimeout(() => {
        isTouchInteraction.current = false;
      }, 300);
    }, 6000); // Reste au moins 6 secondes après que l'utilisateur cesse de toucher l'écran
  }, [playing]);

  const handleMouseMove = useCallback(() => {
    if (isTouchInteraction.current) return;
    resetControlsTimer();
  }, [resetControlsTimer]);

  useEffect(() => {
    resetControlsTimer();
    return () => clearTimeout(controlsTimer.current);
  }, [playing, resetControlsTimer]);

  // Surveillance en continu pour maintenir le Full HD sans coupure
  useEffect(() => {
    const unsubscribe = subscribeToNetworkQualityChanges(() => {
      if (playerRef.current) {
        applyAdaptiveConnectionQuality(playerRef.current);
      }
    });
    return unsubscribe;
  }, []);

  const isTarawih = item.channel === "Récitations Haramain" || item.categories.includes("Coran");
  const reciter = isTarawih ? getReciterForItem(item.title, item.description, item.channel) : null;

  const fmt = (sec: number) => {
    if (!sec || isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Attempt to fetch direct stream source if available
  useEffect(() => {
    let active = true;
    setDirectStreamUrl(null);

    fetchVideoPlaybackSource(item.youtubeId)
      .then((res) => {
        if (active && res?.streamUrl) {
          setDirectStreamUrl(res.streamUrl);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [item.youtubeId]);

  // Initialize YouTube API player if no direct video stream
  useEffect(() => {
    if (directStreamUrl) return;

    let cancelled = false;

    loadYouTubeAPI()
      .then(() => {
        if (cancelled || !playerDivRef.current) return;
        try {
          playerRef.current = new (window as any).YT.Player(playerDivRef.current, {
            videoId: item.youtubeId,
            playerVars: {
              autoplay: 1,
              start: Math.floor(initialTime),
              controls: 0,
              rel: 0,
              modestbranding: 1,
              playsinline: 1,
              iv_load_policy: 3,
              disablekb: 1,
              fs: 0,
              vq: "hd1080",
              hd: 1,
              loop: 1,
              playlist: item.youtubeId,
            },
            events: {
              onReady: (e: any) => {
                if (cancelled) return;
                try {
                  if (initialTime > 0) {
                    e.target.seekTo(initialTime, true);
                  }
                  applyAdaptiveConnectionQuality(e.target);
                  e.target.playVideo();
                } catch {
                  // ignore
                }
                setIsBuffering(false);
                setPlaying(true);
              },
              onError: (e: any) => {
                if (cancelled) return;
                const errCode = e?.data;
                if (errCode === 101 || errCode === 150 || errCode === 100 || errCode === 2) {
                  markVideoAsUnplayable(item.youtubeId, { errorCode: errCode });
                }
                setUseIframe(true);
                setIsBuffering(false);
              },
              onStateChange: (e: any) => {
                if (cancelled) return;
                if (e.data === 1) {
                  // Playing - vérifie et force Full HD minimum 1080p
                  applyAdaptiveConnectionQuality(e.target);
                  setPlaying(true);
                  setIsBuffering(false);
                } else if (e.data === 2) {
                  // Paused
                  setPlaying(false);
                } else if (e.data === 3) {
                  // Buffering
                  setIsBuffering(true);
                }
              },
            },
          });
        } catch {
          setUseIframe(true);
        }
      })
      .catch(() => {
        if (!cancelled) setUseIframe(true);
      });

    return () => {
      cancelled = true;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
    };
  }, [item.id, item.youtubeId, directStreamUrl, initialTime]);

  // Initial seek on direct video element
  useEffect(() => {
    if (videoRef.current && initialTime > 0) {
      try {
        videoRef.current.currentTime = initialTime;
      } catch {
        // ignore
      }
    }
  }, [directStreamUrl, initialTime]);

  // Polling for progress & sync
  useEffect(() => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    progressTimer.current = setInterval(() => {
      let cur = 0;
      let dur = 0;

      if (videoRef.current) {
        cur = videoRef.current.currentTime || 0;
        dur = videoRef.current.duration || 0;
      } else if (playerRef.current) {
        try {
          cur = playerRef.current.getCurrentTime?.() || 0;
          dur = playerRef.current.getDuration?.() || 0;
        } catch {
          // ignore
        }
      }

      if (cur > 0) {
        setCurrentTime(cur);
        if (dur > 0) {
          setDuration(dur);
          setProgress((cur / dur) * 100);
        }
        if (onSaveProgress && Math.floor(cur) % 5 === 0) {
          onSaveProgress(Math.floor(cur), Math.floor(dur));
        }
      }
    }, 800);

    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, [onSaveProgress]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
        setPlaying(false);
      } else {
        videoRef.current.play().catch(() => {});
        setPlaying(true);
      }
      return;
    }

    if (playerRef.current) {
      try {
        if (playing) {
          playerRef.current.pauseVideo();
          setPlaying(false);
        } else {
          playerRef.current.playVideo();
          setPlaying(true);
        }
      } catch {
        // ignore
      }
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMuted = !muted;
    setMuted(nextMuted);

    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }

    if (playerRef.current) {
      try {
        if (nextMuted) {
          playerRef.current.mute();
        } else {
          playerRef.current.unMute();
        }
      } catch {
        // ignore
      }
    }
  };

  const seekRelative = (e: React.MouseEvent, seconds: number) => {
    e.stopPropagation();
    const newTime = Math.max(0, currentTime + seconds);
    setCurrentTime(newTime);

    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    } else if (playerRef.current) {
      try {
        playerRef.current.seekTo(newTime, true);
      } catch {
        // ignore
      }
    }
  };

  const handleSeek = (targetSec: number) => {
    setCurrentTime(targetSec);
    if (duration > 0) setProgress((targetSec / duration) * 100);
    if (videoRef.current) {
      videoRef.current.currentTime = targetSec;
    } else if (playerRef.current) {
      try {
        playerRef.current.seekTo(targetSec, true);
      } catch {
        // ignore
      }
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSec = ratio * duration;
    setCurrentTime(targetSec);
    setProgress(ratio * 100);

    if (videoRef.current) {
      videoRef.current.currentTime = targetSec;
    } else if (playerRef.current) {
      try {
        playerRef.current.seekTo(targetSec, true);
      } catch {
        // ignore
      }
    }
  };

  const handleExpand = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    let finalTime = currentTime;
    if (videoRef.current) finalTime = videoRef.current.currentTime || currentTime;
    else if (playerRef.current) {
      try {
        finalTime = playerRef.current.getCurrentTime() || currentTime;
      } catch {}
    }

    if (onSaveProgress && finalTime > 0) {
      onSaveProgress(Math.floor(finalTime), Math.floor(duration));
    }
    onExpand(finalTime, mode);
  };

  const handleForceClose = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (onSaveProgress && currentTime > 0) {
      onSaveProgress(Math.floor(currentTime), Math.floor(duration));
    }
    setShowConfirmExit(false);
    onClose();
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playing) {
      setShowConfirmExit(true);
    } else {
      handleForceClose(e);
    }
  };

  const isAudio = mode === "audio";

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.88 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 30, scale: 0.88 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseEnter={() => {
        setIsHovered(true);
        if (!isTouchInteraction.current) {
          resetControlsTimer();
        }
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
      className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-80 sm:w-96 max-w-[calc(100vw-2rem)] rounded-2xl bg-zinc-950/95 shadow-2xl overflow-hidden backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] group select-none ring-1 ${
        isAudio
          ? "border border-emerald-500/40 ring-emerald-500/20 shadow-emerald-950/40"
          : "border border-amber-500/40 ring-white/10"
      }`}
      title={isAudio ? "Lecteur Audio HD miniature" : "Lecteur vidéo miniature"}
    >
      {/* Video / Audio Viewport */}
      <div className="relative w-full aspect-video bg-black overflow-hidden">
        {/* 1. Direct HTML5 Video Player */}
        {directStreamUrl ? (
          <video
            ref={videoRef}
            src={directStreamUrl}
            autoPlay
            playsInline
            muted={muted}
            className={`w-full h-full object-cover scale-[1.03] ${isAudio ? "opacity-0 pointer-events-none" : ""}`}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => {
              setIsBuffering(false);
              setPlaying(true);
            }}
            onPause={() => setPlaying(false)}
            onLoadedMetadata={(e) => {
              const dur = (e.target as HTMLVideoElement).duration;
              if (dur > 0) setDuration(dur);
              if (initialTime > 0) {
                (e.target as HTMLVideoElement).currentTime = initialTime;
              }
              (e.target as HTMLVideoElement).playbackRate = playbackRate;
            }}
          />
        ) : useIframe ? (
          /* 2. YouTube Iframe Video Player */
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${item.youtubeId}?autoplay=1&enablejsapi=1&start=${Math.floor(
              initialTime
            )}&rel=0&iv_load_policy=3&modestbranding=1&controls=0&disablekb=1&fs=0&playsinline=1&loop=1&playlist=${item.youtubeId}`}
            title={item.title}
            className={`w-full h-full border-0 scale-[1.03] ${isAudio ? "opacity-0 pointer-events-none" : ""}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          /* 3. YouTube API Video Stream Container */
          <div ref={playerDivRef} className={`w-full h-full scale-[1.03] ${isAudio ? "opacity-0 pointer-events-none" : ""}`} />
        )}

        {/* Zone tactile transparente sur la vidéo : un tap révèle les bandes cinéma qui restent 1s après le toucher */}
        {!isAudio && (
          <div
            className="absolute inset-0 z-10 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (!showControls) {
                setShowControls(true);
                resetControlsTimer();
              } else {
                togglePlay(e);
              }
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          />
        )}

        {/* Audio HD specific visual overlay covering video completely */}
        {isAudio && (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black flex items-center p-3 gap-3">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-emerald-500/30 flex-shrink-0 shadow-lg bg-zinc-900">
              <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
              {playing && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-0.5">
                  <span className="w-1 h-4 bg-emerald-400 rounded-full animate-[bounce_0.8s_ease-in-out_infinite]" />
                  <span className="w-1 h-6 bg-emerald-400 rounded-full animate-[bounce_0.6s_ease-in-out_infinite_0.2s]" />
                  <span className="w-1 h-3 bg-emerald-400 rounded-full animate-[bounce_0.9s_ease-in-out_infinite_0.4s]" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 pr-14">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                <Music size={11} /> Audio HD
              </span>
              <h5 className="text-white text-xs font-semibold truncate mt-0.5">{item.title}</h5>
              <p className="text-zinc-400 text-[10px] truncate">{reciter ? reciter.name : item.channel}</p>
            </div>
          </div>
        )}

        {/* Bande supérieure cinéma esthétique & occultante (masque les détails YouTube natifs dans la vidéo miniature) */}
        {!isAudio && (
          <div
            className={`absolute top-0 left-0 right-0 z-20 transition-all duration-300 ease-out ${
              showControls || !playing ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"
            }`}
          >
            {/* Dégradé velours progressif semi-transparent & flou satiné */}
            <div className="absolute inset-x-0 top-0 h-16 sm:h-20 cinema-band-top pointer-events-none shadow-[0_8px_24px_rgba(0,0,0,0.35)]" />
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/20 to-transparent pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between px-2.5 py-2">
              {/* Badge Miniature */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] text-amber-400 font-semibold pointer-events-none shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Miniature</span>
              </div>

              {/* Boutons flottants hauts */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-1.5 rounded-full bg-black/70 hover:bg-black text-zinc-200 hover:text-white backdrop-blur-sm transition-colors border border-white/10 shadow-md"
                  title={muted ? "Activer le son" : "Couper le son"}
                >
                  {muted ? <VolumeX size={14} className="text-amber-400" /> : <Volume2 size={14} />}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleExpand(e)}
                  className="p-1.5 rounded-full bg-black/70 hover:bg-amber-500 text-zinc-200 hover:text-zinc-950 backdrop-blur-sm transition-colors border border-white/10 shadow-md"
                  title="Agrandir en grand format"
                >
                  <Maximize2 size={13} />
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1.5 rounded-full bg-black/70 hover:bg-red-600 text-zinc-200 hover:text-white backdrop-blur-sm transition-colors border border-white/10 shadow-md"
                  title="Fermer la miniature"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bande inférieure cinéma esthétique & contrôleur (disparaît en même temps que les éléments en période de lecture) */}
        {!isAudio && (
          <div
            className={`absolute bottom-0 left-0 right-0 z-20 transition-all duration-300 ease-out ${
              showControls || !playing ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-2 pointer-events-none"
            }`}
          >
            {/* Dégradé velours progressif semi-transparent & flou satiné */}
            <div className="absolute inset-x-0 bottom-0 h-28 sm:h-32 cinema-band-bottom pointer-events-none shadow-[0_-8px_24px_rgba(0,0,0,0.35)]" />
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/20 to-transparent pointer-events-none" />

            <div className="relative z-10 px-3 pb-2.5 pt-1">
              {/* Commandes centrales de lecture */}
              <div className="flex items-center justify-center gap-3 mb-2">
                <button
                  type="button"
                  onClick={(e) => seekRelative(e, -10)}
                  className="p-1.5 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md transition-transform active:scale-95"
                  title="Reculer de 10s"
                >
                  <RotateCcw size={13} />
                </button>
                <button
                  type="button"
                  onClick={togglePlay}
                  className="p-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold backdrop-blur-md transition-transform hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                  title={playing ? "Pause" : "Lecture"}
                >
                  {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                </button>
                <button
                  type="button"
                  onClick={(e) => seekRelative(e, 10)}
                  className="p-1.5 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md transition-transform active:scale-95"
                  title="Avancer de 10s"
                >
                  <RotateCw size={13} />
                </button>
              </div>

              {/* Barre de progression interactive */}
              <div
                ref={progressBarRef}
                onClick={handleProgressBarClick}
                className="relative h-1.5 bg-zinc-800/90 cursor-pointer group/progress hover:h-2 rounded-full overflow-hidden transition-all shadow-inner"
                title="Cliquer pour naviguer dans la vidéo"
              >
                {/* Marqueurs de sponsors / intro */}
                {item.skipSegments?.map((seg, idx) => {
                  if (!duration || duration <= 0) return null;
                  const leftPct = Math.max(0, Math.min(100, (seg.start / duration) * 100));
                  const widthPct = Math.max(1, Math.min(100 - leftPct, ((seg.end - seg.start) / duration) * 100));
                  return (
                    <div
                      key={idx}
                      className="absolute top-0 bottom-0 bg-amber-400 rounded-full z-10 pointer-events-none"
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    />
                  );
                })}

                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 relative transition-all duration-150"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md scale-0 group-hover/progress:scale-100 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mini Title & Expand Bar */}
      <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 border-t border-zinc-800/80 bg-zinc-950/80">
        <div
          onClick={(e) => handleExpand(e)}
          className="min-w-0 flex-1 cursor-pointer group/title"
          title="Cliquer pour agrandir le lecteur"
        >
          <h4 className="text-xs font-semibold text-white truncate group-hover/title:text-amber-300 transition-colors vignette-title">
            {item.title}
          </h4>
          <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5 vignette-meta">
            <span className="truncate max-w-[110px] sm:max-w-[140px] vignette-meta">{item.channel}</span>
            <span>•</span>
            <span className="text-amber-400 font-medium font-mono vignette-meta">
              {fmt(currentTime)} / {duration > 0 ? fmt(duration) : item.duration || "0:00"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={cycleMiniSpeed}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 border border-white/10 text-amber-300 hover:text-amber-200 text-xs font-mono font-bold transition-all shadow-sm"
            title={`Vitesse de lecture : ${playbackRate}x (Cliquer pour alterner: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x)`}
          >
            <span>{playbackRate}x</span>
          </button>

          <button
            onClick={handleExpand}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-amber-500 text-zinc-300 hover:text-zinc-950 text-xs font-medium transition-all shadow-sm"
            title="Agrandir en grand format"
          >
            <Maximize2 size={13} />
            <span className="hidden sm:inline text-[11px]">Agrandir</span>
          </button>
        </div>
      </div>

      {/* Confirmation de fermeture du MiniPlayer */}
      {showConfirmExit && (
        <div
          id="miniplayer-confirm-exit"
          onClick={(e) => {
            e.stopPropagation();
            setShowConfirmExit(false);
          }}
          className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md p-4 flex flex-col justify-center items-center text-center animate-in fade-in duration-150"
        >
          <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-2">
            <AlertCircle size={16} />
          </div>
          <p className="text-white text-xs font-bold mb-1">Arrêter la lecture ?</p>
          <p className="text-zinc-400 text-[11px] mb-3">La progression sera sauvegardée.</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-cancel-mini-exit"
              onClick={(e) => {
                e.stopPropagation();
                setShowConfirmExit(false);
              }}
              className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-200 text-xs font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              id="btn-confirm-mini-exit"
              onClick={handleForceClose}
              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shadow-sm"
            >
              Arrêter
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

