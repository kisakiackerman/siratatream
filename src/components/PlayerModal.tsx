import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Plus,
  ThumbsUp,
  Share2,
  Loader2,
  Subtitles,
  DownloadCloud,
  CheckCircle,
  ExternalLink,
  Music,
  Tv,
  RotateCcw,
  PictureInPicture2,
  Clock,
  Settings,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  ListMusic,
  Gauge,
  AlertTriangle,
  RefreshCw,
  Check,
  Zap,
  ZapOff,
  Globe,
  Moon,
} from "lucide-react";
import { motion } from "motion/react";
import { ContentItem, catalog } from "@/data/catalog";
import { loadYouTubeAPI } from "@/lib/youtube";
import {
  fetchVideoPlaybackSource,
  getYouTubeErrorDetails,
  markVideoAsUnplayable,
  clearUnplayableVideo,
  isKnownUnplayableVideo,
  PlaybackErrorInfo,
} from "@/lib/youtubeApi";
import { supabase } from "@/lib/supabase";
import { useViewerProfile } from "@/hooks/useViewerProfile";
import { useMyList } from "@/lib/useMyList";
import { useContentStats } from "@/hooks/useContentStats";
import RatingStars from "@/components/RatingStars";
import SpotifyLyricsCard from "@/components/SpotifyLyricsCard";
import { isDownloadedOffline, saveOfflineDownload, removeOfflineDownload } from "@/lib/offlineStorage";
import { getReciterForItem } from "@/lib/reciterData";
import { getSavedWatchProgress, saveWatchProgress } from "@/lib/watchHistory";

type PlayerModalProps = {
  item: ContentItem;
  initialStartTime?: number;
  initialAudioMode?: boolean;
  onClose: () => void;
  onMinimize?: (currentTime?: number, mode?: "video" | "audio") => void;
  onChangeItem: (id: string) => void;
};

const STATE_NAMES = {
  [-1]: "unstarted",
  0: "ended",
  1: "playing",
  2: "paused",
  3: "buffering",
  5: "cued",
} as const;

const ORIGINAL_AUDIO_CODE = "original";

// ─────────────────────────────────────────────────────────────
// Lecture des réglages utilisateur (AccountSettingsModal → onglet
// "Lecture & Affichage") persistés en localStorage, appliqués ici
// à chaque nouvelle vidéo lancée dans le lecteur.
// ─────────────────────────────────────────────────────────────
function getStoredSubtitleDefault(): boolean {
  try {
    return localStorage.getItem("nexstream_subtitles_default") === "true";
  } catch {
    return false;
  }
}

function getStoredSubtitleSize(): "small" | "medium" | "large" {
  try {
    return (localStorage.getItem("nexstream_subtitle_size") as "small" | "medium" | "large") || "medium";
  } catch {
    return "medium";
  }
}

function subtitleSizeToYouTubeFontSize(size: "small" | "medium" | "large"): number {
  if (size === "small") return 0;
  if (size === "large") return 2;
  return 1;
}

function getStoredPlaybackSpeed(): number {
  try {
    const v = Number(localStorage.getItem("nexstream_playback_speed"));
    return v > 0 ? v : 1;
  } catch {
    return 1;
  }
}

function getStoredBoostLevel(): number {
  try {
    const v = Number(localStorage.getItem("nexstream_audio_boost"));
    return v >= 100 ? v : 100;
  } catch {
    return 100;
  }
}

function isOnCellularConnection(): boolean {
  try {
    const conn =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;
    if (!conn) return false;
    if (conn.type) return conn.type === "cellular";
    if (conn.effectiveType) return ["slow-2g", "2g", "3g"].includes(conn.effectiveType);
    return false;
  } catch {
    return false;
  }
}

function qualitySettingToPlayerKey(settingId: string): string {
  if (settingId === "data-saver") return "hd720";
  if (settingId === "high") return "hd1080";
  return "auto_max";
}

function getStoredQualityPreference(): string {
  try {
    const wifiSetting = localStorage.getItem("nexstream_quality_wifi") || "auto";
    const mobileSetting = localStorage.getItem("nexstream_quality_mobile") || "data-saver";
    const settingId = isOnCellularConnection() ? mobileSetting : wifiSetting;
    return qualitySettingToPlayerKey(settingId);
  } catch {
    return "auto_max";
  }
}

function getStoredPreferredDubLanguage(): string | null {
  try {
    return localStorage.getItem("nexstream_preferred_dub_lang");
  } catch {
    return null;
  }
}

const BOOST_LEVELS = [100, 125, 150, 175, 200, 250, 300];
const AUDIO_SYNC_DRIFT_THRESHOLD = 0.25; // secondes de dérive tolérée avant resynchronisation

export default function PlayerModal({
  item,
  initialStartTime,
  initialAudioMode = false,
  onClose,
  onMinimize,
  onChangeItem,
}: PlayerModalProps) {
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [captionsOn, setCaptionsOn] = useState(() => getStoredSubtitleDefault());
  const [captionToast, setCaptionToast] = useState<{ message: string; active: boolean } | null>(null);
  const [resumeToast, setResumeToast] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(() => getStoredPlaybackSpeed());
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [qualityPreference, setQualityPreference] = useState<string>(() => getStoredQualityPreference());
  const [currentQualityLabel, setCurrentQualityLabel] = useState<string>("1080p FHD");
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [downloaded, setDownloaded] = useState(() => isDownloadedOffline(item.id));
  const [directStreamUrl, setDirectStreamUrl] = useState<string | null>(null);
  const [useIframeFallback, setUseIframeFallback] = useState(false);
  const [isAudioMode, setIsAudioMode] = useState(Boolean(initialAudioMode));
  const [showAudioLyrics, setShowAudioLyrics] = useState(false);
  const [hasPlaybackError, setHasPlaybackError] = useState(false);
  const [playbackError, setPlaybackError] = useState<PlaybackErrorInfo | null>(null);
  const [initRetryCount, setInitRetryCount] = useState(0);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);

  // Amplificateur de son (Web Audio API — flux directs uniquement)
  const [boostLevel, setBoostLevel] = useState<number>(() => getStoredBoostLevel());
  const [boostSupported, setBoostSupported] = useState(false);
  const [showBoostMenu, setShowBoostMenu] = useState(false);
  const [showNowPlayingBoostMenu, setShowNowPlayingBoostMenu] = useState(false);

  // Doublage audio multi-langue (flux directs uniquement, pistes définies dans catalog.ts)
  const [activeAudioLang, setActiveAudioLang] = useState<string>(ORIGINAL_AUDIO_CODE);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showNowPlayingLangMenu, setShowNowPlayingLangMenu] = useState(false);
  const [dubBuffering, setDubBuffering] = useState(false);

  // Now Playing (audio mode) specific state
  const [shuffleOn, setShuffleOn] = useState(false);
  const [repeatOn, setRepeatOn] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showNowPlayingSpeedMenu, setShowNowPlayingSpeedMenu] = useState(false);
  const [showNowPlayingQualityMenu, setShowNowPlayingQualityMenu] = useState(false);

  // Sleep Timer
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [sleepTimeRemaining, setSleepTimeRemaining] = useState<number | null>(null);
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [showNowPlayingSleepMenu, setShowNowPlayingSleepMenu] = useState(false);

  const { activeProfile } = useViewerProfile();
  const { inList, toggle } = useMyList();
  const { userVote, vote, rate, averageRating, ratingCount, userRating, logView } = useContentStats(item.id);

  // Compute resume time from props or history
  const resumeTime = useMemo(() => {
    if (initialStartTime !== undefined && initialStartTime > 0) {
      return initialStartTime;
    }
    if (!activeProfile?.id) return 0;
    return getSavedWatchProgress(activeProfile.id, item.id);
  }, [initialStartTime, activeProfile?.id, item.id]);

  const playerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerDivRef = useRef<HTMLDivElement>(null);
  const controlsTimer = useRef<any>(null);
  const progressTimer = useRef<any>(null);
  const historyTimer = useRef<any>(null);
  const sleepTimerRef = useRef<any>(null);
  const initTimeoutRef = useRef<any>(null);
  const toastTimeoutRef = useRef<any>(null);
  const lastTimeRef = useRef<number>(0);
  const lastDurationRef = useRef<number>(0);

  // Élément audio caché pour le doublage — joué en parallèle de la vidéo
  // (dont la piste native est alors coupée) et synchronisé sur son temps.
  const dubAudioRef = useRef<HTMLAudioElement>(null);

  // Amplificateur de son — graphe Web Audio persistant tant que le même
  // élément <video> DOM reste monté (un MediaElementSourceNode ne peut
  // être créé qu'une seule fois par élément).
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioGraphElementRef = useRef<HTMLVideoElement | null>(null);

  const isTarawih = item.channel === "Récitations Haramain" || item.categories.includes("Coran");
  const reciter = isTarawih ? getReciterForItem(item.title, item.description, item.channel) : null;

  // Pistes de doublage disponibles pour cette vidéo (flux direct uniquement)
  const availableAudioTracks = useMemo(() => item.audioTracks || [], [item.audioTracks]);
  const hasDubbing = Boolean(directStreamUrl) && availableAudioTracks.length > 0;

  // Related videos for "Up Next"
  const related = useMemo(
    () =>
      catalog
        .filter((c) => c.id !== item.id)
        .filter(
          (c) =>
            c.channel === item.channel ||
            c.categories.some((g) => item.categories.includes(g))
        )
        .slice(0, 8),
    [item.id, item.channel, item.categories]
  );

  const upNext = related.length > 0 ? related[0] : null;

  const fmt = (sec: number) => {
    if (!sec || isNaN(sec)) return "0:00";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0)
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Immediate save helper to record exact current second
  const saveCurrentProgress = useCallback(() => {
    if (!activeProfile?.id) return;
    let cur = 0;
    let dur = lastDurationRef.current || duration || 0;

    if (videoRef.current) {
      cur = Math.floor(videoRef.current.currentTime || 0);
      dur = Math.floor(videoRef.current.duration || dur);
    } else if (playerRef.current) {
      try {
        cur = Math.floor(playerRef.current.getCurrentTime?.() || 0);
        dur = Math.floor(playerRef.current.getDuration?.() || dur);
      } catch {
        // ignore
      }
    }

    if (cur <= 0 && lastTimeRef.current > 0) {
      cur = lastTimeRef.current;
    }

    if (cur > 0) {
      lastTimeRef.current = cur;
      lastDurationRef.current = dur;
      saveWatchProgress(activeProfile.id, item.id, cur, dur);
    }
  }, [activeProfile?.id, duration, item.id]);

  // ─────────────────────────────────────────────────────────────
  // Refs "toujours à jour" — évitent de recréer le lecteur YouTube
  // à chaque fois que ces fonctions/valeurs changent d'identité.
  // Le gros useEffect d'init du lecteur ne doit dépendre QUE de ce
  // qui doit réellement provoquer une recréation du player.
  // ─────────────────────────────────────────────────────────────
  const saveCurrentProgressRef = useRef(saveCurrentProgress);
  useEffect(() => {
    saveCurrentProgressRef.current = saveCurrentProgress;
  }, [saveCurrentProgress]);

  const repeatOnRef = useRef(repeatOn);
  useEffect(() => {
    repeatOnRef.current = repeatOn;
  }, [repeatOn]);

  const captionsOnRef = useRef(captionsOn);
  useEffect(() => {
    captionsOnRef.current = captionsOn;
  }, [captionsOn]);

  const playbackRateRef = useRef(playbackRate);
  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);

  const activeAudioLangRef = useRef(activeAudioLang);
  useEffect(() => {
    activeAudioLangRef.current = activeAudioLang;
  }, [activeAudioLang]);

  // Safe close handler that immediately persists exact second
  const handleClose = useCallback(() => {
    saveCurrentProgress();
    onClose();
  }, [saveCurrentProgress, onClose]);

  // Safe item switch that immediately persists exact second
  const handleChangeItem = useCallback(
    (newId: string) => {
      saveCurrentProgress();
      onChangeItem(newId);
    },
    [saveCurrentProgress, onChangeItem]
  );

  // Show brief resume toast notification if resuming past 3 seconds
  useEffect(() => {
    if (resumeTime > 3) {
      setResumeToast(`Reprise à ${fmt(resumeTime)}`);
      const t = setTimeout(() => setResumeToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [resumeTime, item.id]);

  // Reset state on new item
  useEffect(() => {
    setUseIframeFallback(false);
    setHasPlaybackError(false);
    setPlaybackError(null);
    setBuffering(true);
    setPlaying(true);

    // Réinitialise le doublage : tente de retrouver la langue préférée de
    // l'utilisateur si cette nouvelle vidéo la propose, sinon repasse à
    // la piste originale.
    const preferred = getStoredPreferredDubLanguage();
    const tracks = item.audioTracks || [];
    if (preferred && tracks.some((t) => t.code === preferred)) {
      setActiveAudioLang(preferred);
    } else {
      setActiveAudioLang(ORIGINAL_AUDIO_CODE);
    }
    if (dubAudioRef.current) {
      dubAudioRef.current.pause();
      dubAudioRef.current.removeAttribute("src");
    }
  }, [item.id]);

  // Manual retry handler
  const handleRetry = useCallback(() => {
    setPlaybackError(null);
    setUseIframeFallback(false);
    setBuffering(true);
    setPlaying(true);
    clearUnplayableVideo(item.youtubeId);
    setInitRetryCount((c) => c + 1);
  }, [item.youtubeId]);

  // Attempt to fetch direct stream from custom videoUrl or YouTube edge function
  useEffect(() => {
    let active = true;
    if (item.videoUrl && (item.videoSourceType === "direct" || item.videoUrl.endsWith(".mp4") || item.videoUrl.endsWith(".webm") || item.videoUrl.startsWith("blob:") || (item.videoUrl.startsWith("http") && !item.videoUrl.includes("youtu")))) {
      setDirectStreamUrl(item.videoUrl);
      return;
    }
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
  }, [item.youtubeId, item.videoUrl, item.videoSourceType]);

  // ─────────────────────────────────────────────────────────────
  // Amplificateur de son : construit le graphe Web Audio (source →
  // gain → sortie) dès qu'un flux direct est lu. Un MediaElementSourceNode
  // ne pouvant être créé qu'une seule fois par élément <video>, on ne
  // reconstruit le graphe que si l'élément DOM a réellement changé.
  // Indisponible pour la lecture via l'API/iframe YouTube (flux opaque,
  // cross-origin — le navigateur ne permet pas d'accéder à son audio).
  // Note : quand un doublage est actif, la vidéo est mise en muet et
  // c'est l'élément <audio> de doublage qui porte le son — le boost ne
  // s'applique alors qu'à la piste originale, pas au doublage.
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!directStreamUrl) {
      setBoostSupported(false);
      return;
    }
    const videoEl = videoRef.current;
    if (!videoEl) {
      setBoostSupported(false);
      return;
    }
    if (audioGraphElementRef.current === videoEl && gainNodeRef.current) {
      // Graphe déjà construit pour cet élément précis
      setBoostSupported(true);
      return;
    }
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        setBoostSupported(false);
        return;
      }
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      const source = ctx.createMediaElementSource(videoEl);
      const gain = ctx.createGain();
      gain.gain.value = boostLevel / 100;
      source.connect(gain);
      gain.connect(ctx.destination);
      audioSourceNodeRef.current = source;
      gainNodeRef.current = gain;
      audioGraphElementRef.current = videoEl;
      setBoostSupported(true);
    } catch (err) {
      console.warn("Amplificateur de son indisponible pour ce flux :", err);
      setBoostSupported(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directStreamUrl, item.id]);

  // Applique le niveau de boost à chaque changement, et le persiste
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = boostLevel / 100;
    }
    try {
      localStorage.setItem("nexstream_audio_boost", String(boostLevel));
    } catch {
      // ignore
    }
  }, [boostLevel]);

  const handleSelectBoost = (level: number) => {
    setBoostLevel(level);
    showCaptionNotification(
      level === 100 ? "Amplificateur désactivé" : `Volume amplifié à ${level}%`,
      level > 100
    );
    setShowBoostMenu(false);
    setShowNowPlayingBoostMenu(false);
  };

  // ─────────────────────────────────────────────────────────────
  // Doublage audio : bascule entre la piste originale (celle intégrée
  // à la vidéo) et une piste de doublage externe synchronisée.
  // ─────────────────────────────────────────────────────────────
  const switchAudioLanguage = useCallback(
    (code: string) => {
      setActiveAudioLang(code);
      setShowLangMenu(false);
      setShowNowPlayingLangMenu(false);

      try {
        localStorage.setItem("nexstream_preferred_dub_lang", code);
      } catch {
        // ignore
      }

      const videoEl = videoRef.current;
      const dubEl = dubAudioRef.current;

      if (code === ORIGINAL_AUDIO_CODE) {
        if (dubEl) {
          dubEl.pause();
        }
        if (videoEl) {
          videoEl.muted = muted;
        }
        showCaptionNotification("Piste audio originale", true);
        return;
      }

      const track = availableAudioTracks.find((t) => t.code === code);
      if (!track || !dubEl || !videoEl) return;

      setDubBuffering(true);
      dubEl.src = track.url;
      dubEl.currentTime = videoEl.currentTime;
      dubEl.volume = muted ? 0 : volume / 100;
      dubEl.playbackRate = playbackRateRef.current;
      videoEl.muted = true;

      const onCanPlay = () => {
        setDubBuffering(false);
        if (playing) {
          dubEl.play().catch(() => {});
        }
        dubEl.removeEventListener("canplay", onCanPlay);
      };
      dubEl.addEventListener("canplay", onCanPlay);

      showCaptionNotification(`Doublage : ${track.label}`, true);
    },
    [availableAudioTracks, muted, volume, playing]
  );

  // Quality forcing engine (Full HD 1080p / 1440p / 4K)
  const applyForcedHDQuality = useCallback((player: any, preference: string = "auto_max") => {
    if (!player) return;
    try {
      const levels: string[] = player.getAvailableQualityLevels?.() || [];
      if (levels.length > 0) {
        setAvailableQualities(levels);
      }

      let chosen = "hd1080";
      if (preference === "auto_max") {
        // Enforce the highest resolution available (4K > 1440p > 1080p)
        if (levels.includes("highres") || levels.includes("hd2160")) {
          chosen = levels.includes("hd2160") ? "hd2160" : "highres";
        } else if (levels.includes("hd1440")) {
          chosen = "hd1440";
        } else if (levels.includes("hd1080")) {
          chosen = "hd1080";
        } else if (levels.length > 0) {
          chosen = levels[0];
        }
      } else if (preference && (levels.length === 0 || levels.includes(preference))) {
        chosen = preference;
      } else if (levels.length > 0) {
        chosen = levels[0];
      }

      player.setPlaybackQuality?.(chosen);
      player.setSuggestedQuality?.(chosen);

      if (chosen === "hd2160" || chosen === "highres") setCurrentQualityLabel("4K UHD");
      else if (chosen === "hd1440") setCurrentQualityLabel("1440p 2K");
      else if (chosen === "hd1080") setCurrentQualityLabel("1080p FHD");
      else if (chosen === "hd720") setCurrentQualityLabel("720p HD");
      else setCurrentQualityLabel("1080p FHD");
    } catch (err) {
      console.warn("Quality forcing error:", err);
    }
  }, []);

  // Applique l'état des sous-titres (activé/désactivé + taille) sur la
  // cible de lecture active (vidéo directe HTML5, lecteur YouTube API,
  // ou iframe de secours). Utilisé au démarrage (réglage par défaut)
  // ET lors du clic manuel sur le bouton CC.
  const applyCaptionsToTarget = useCallback(
    (nextState: boolean) => {
      const fontSize = subtitleSizeToYouTubeFontSize(getStoredSubtitleSize());

      // 1. Direct HTML5 video tracks
      if (videoRef.current) {
        const tracks = videoRef.current.textTracks;
        if (tracks && tracks.length > 0) {
          for (let i = 0; i < tracks.length; i++) {
            tracks[i].mode = nextState ? "showing" : "disabled";
          }
        }
        return;
      }

      // 2. YouTube IFrame Player API
      if (playerRef.current) {
        try {
          if (nextState) {
            playerRef.current.loadModule?.("captions");
            playerRef.current.loadModule?.("cc");
            playerRef.current.setOption?.("captions", "track", { languageCode: "fr" });
            playerRef.current.setOption?.("cc", "track", { languageCode: "fr" });
            playerRef.current.setOption?.("captions", "fontSize", fontSize);
            playerRef.current.setOption?.("captions", "reload", true);
          } else {
            playerRef.current.setOption?.("captions", "track", {});
            playerRef.current.setOption?.("cc", "track", {});
            playerRef.current.unloadModule?.("captions");
            playerRef.current.unloadModule?.("cc");
          }
        } catch (err) {
          console.warn("YouTube Captions API error:", err);
        }
        return;
      }

      // 3. Fallback iframe postMessage
      if (useIframeFallback) {
        const iframeEl = containerRef.current?.querySelector("iframe");
        if (iframeEl && iframeEl.contentWindow) {
          try {
            if (nextState) {
              iframeEl.contentWindow.postMessage(
                JSON.stringify({ event: "command", func: "loadModule", args: ["captions"] }),
                "*"
              );
              iframeEl.contentWindow.postMessage(
                JSON.stringify({
                  event: "command",
                  func: "setOption",
                  args: ["captions", "track", { languageCode: "fr" }],
                }),
                "*"
              );
              iframeEl.contentWindow.postMessage(
                JSON.stringify({
                  event: "command",
                  func: "setOption",
                  args: ["captions", "fontSize", fontSize],
                }),
                "*"
              );
            } else {
              iframeEl.contentWindow.postMessage(
                JSON.stringify({
                  event: "command",
                  func: "setOption",
                  args: ["captions", "track", {}],
                }),
                "*"
              );
              iframeEl.contentWindow.postMessage(
                JSON.stringify({ event: "command", func: "unloadModule", args: ["captions"] }),
                "*"
              );
            }
          } catch {
            // ignore
          }
        }
      }
    },
    [useIframeFallback]
  );

  const applyCaptionsToTargetRef = useRef(applyCaptionsToTarget);
  useEffect(() => {
    applyCaptionsToTargetRef.current = applyCaptionsToTarget;
  }, [applyCaptionsToTarget]);

  // Pick the id of the next track, respecting shuffle
  const getNextTrackId = useCallback((): string | null => {
    if (shuffleOn) {
      const pool = (related.length > 0 ? related : catalog.filter((c) => c.id !== item.id)).filter(
        (c) => c.id !== item.id
      );
      if (pool.length === 0) return null;
      const randomItem = pool[Math.floor(Math.random() * pool.length)];
      return randomItem.id;
    }
    return upNext ? upNext.id : null;
  }, [shuffleOn, related, upNext, item.id]);

  const getNextTrackIdRef = useRef(getNextTrackId);
  useEffect(() => {
    getNextTrackIdRef.current = getNextTrackId;
  }, [getNextTrackId]);

  // Advance to next track (button or natural end of playback)
  const handleNextTrack = useCallback(() => {
    const nextId = getNextTrackId();
    if (nextId) {
      handleChangeItem(nextId);
    }
  }, [getNextTrackId, handleChangeItem]);

  const handleNextTrackRef = useRef(handleNextTrack);
  useEffect(() => {
    handleNextTrackRef.current = handleNextTrack;
  }, [handleNextTrack]);

  // Restart current track from the beginning
  const handlePreviousTrack = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      if (dubAudioRef.current && activeAudioLangRef.current !== ORIGINAL_AUDIO_CODE) {
        dubAudioRef.current.currentTime = 0;
      }
      return;
    }
    if (playerRef.current) {
      try {
        playerRef.current.seekTo?.(0, true);
      } catch {
        // ignore
      }
    }
  }, []);

  // Handle Video / YouTube Player initialization
  useEffect(() => {
    let cancelled = false;
    setPlaybackRate(getStoredPlaybackSpeed());
    setShowSpeedMenu(false);
    setShowQualityMenu(false);
    setDownloaded(isDownloadedOffline(item.id));

    // If direct video stream is playing or fallback is active, skip YT API player
    if (directStreamUrl) {
      setBuffering(false);
      return;
    }

    if (useIframeFallback) {
      setBuffering(false);
      return;
    }

    // Safety timeout: if player is still stuck after 5s, fallback to direct embed iframe or error
    clearTimeout(initTimeoutRef.current);
    initTimeoutRef.current = setTimeout(() => {
      if (!cancelled && !playerRef.current && !directStreamUrl) {
        if (!useIframeFallback) {
          setUseIframeFallback(true);
        } else {
          setPlaybackError(getYouTubeErrorDetails(undefined));
        }
        setBuffering(false);
      }
    }, 5000);

    loadYouTubeAPI()
      .then(() => {
        if (cancelled || !playerDivRef.current) return;

        try {
          const playerVarsConfig: any = {
            autoplay: 1,
            start: Math.floor(resumeTime),
            controls: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            iv_load_policy: 3,
            disablekb: 1,
            fs: 0,
            cc_load_policy: 0,
            cc_lang_pref: "fr",
            vq: "hd1080",
            hd: 1,
          };

          playerRef.current = new (window as any).YT.Player(playerDivRef.current, {
            videoId: item.youtubeId,
            playerVars: playerVarsConfig,
            events: {
              onReady: (e: any) => {
                if (cancelled) return;
                try {
                  e.target.setVolume(volume);
                  if (muted) e.target.mute();
                  if (resumeTime > 0) {
                    e.target.seekTo(resumeTime, true);
                  }
                  // Force Full HD+ immediately
                  applyForcedHDQuality(e.target, qualityPreference);
                  // Vitesse de lecture par défaut (réglage utilisateur)
                  e.target.setPlaybackRate?.(playbackRateRef.current);
                  // Sous-titres activés par défaut (réglage utilisateur)
                  if (captionsOnRef.current) {
                    applyCaptionsToTargetRef.current(true);
                  }
                  e.target.playVideo();
                } catch {
                  // ignore
                }
                setBuffering(false);
                setPlaying(true);
                setPlaybackError(null);
                clearUnplayableVideo(item.youtubeId);
              },
              onError: (e: any) => {
                console.warn("YouTube player API error code:", e?.data);
                if (cancelled) return;
                const errCode = e?.data;

                // Codes 100 (deleted/private), 101/150 (embed restricted), 2 (invalid ID)
                if (errCode === 101 || errCode === 150 || errCode === 100 || errCode === 2) {
                  markVideoAsUnplayable(item.youtubeId, { errorCode: errCode });
                  const errInfo = getYouTubeErrorDetails(errCode);
                  setPlaybackError(errInfo);
                  setBuffering(false);
                  setPlaying(false);
                } else {
                  // Recoverable error (e.g. 5) - try iframe fallback first
                  if (!useIframeFallback) {
                    setUseIframeFallback(true);
                  } else {
                    const errInfo = getYouTubeErrorDetails(errCode);
                    setPlaybackError(errInfo);
                  }
                  setBuffering(false);
                }
              },
              onStateChange: (e: any) => {
                if (cancelled) return;
                const state = STATE_NAMES[e.data as keyof typeof STATE_NAMES];
                setBuffering(state === "buffering");
                setPlaying(state === "playing");

                // Lock Full HD+ on play / buffer
                if (state === "playing" || state === "buffering") {
                  applyForcedHDQuality(playerRef.current || e.target, qualityPreference);
                }

                if (state === "paused") {
                  saveCurrentProgressRef.current();
                }

                if (state === "ended") {
                  saveCurrentProgressRef.current();
                  if (repeatOnRef.current) {
                    try {
                      playerRef.current?.seekTo?.(0, true);
                      playerRef.current?.playVideo?.();
                    } catch {
                      // ignore
                    }
                  } else {
                    const nextId = getNextTrackIdRef.current();
                    if (nextId) {
                      handleNextTrackRef.current();
                    } else {
                      // Reset to 0 and pause to prevent YouTube end-screen video suggestions grid
                      try {
                        playerRef.current?.seekTo?.(0, true);
                        playerRef.current?.pauseVideo?.();
                      } catch {
                        // ignore
                      }
                    }
                  }
                }
              },
            },
          });
        } catch (err) {
          console.warn("Error creating YT Player instance:", err);
          if (!useIframeFallback) {
            setUseIframeFallback(true);
          } else {
            setPlaybackError(getYouTubeErrorDetails(undefined));
          }
          setBuffering(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          if (!useIframeFallback) {
            setUseIframeFallback(true);
          } else {
            setPlaybackError(getYouTubeErrorDetails(undefined));
          }
          setBuffering(false);
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(initTimeoutRef.current);
      if (progressTimer.current) clearInterval(progressTimer.current);
      if (historyTimer.current) clearInterval(historyTimer.current);
      saveCurrentProgressRef.current();
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
    };
    // NOTE: on ne dépend QUE de ce qui doit réellement déclencher une
    // recréation du lecteur. saveCurrentProgress / handleNextTrack / repeatOn
    // sont lus via des refs stables (voir ci-dessus) pour éviter de détruire
    // et recréer le player YouTube en cours de lecture (ex: dès que `duration`
    // devient disponible, ou quand on bascule shuffle/repeat).
  }, [item.youtubeId, directStreamUrl, useIframeFallback, resumeTime, initRetryCount]);

  useEffect(() => {
    logView();
  }, [item.id]);

  // Progress update timer — inclut la resynchronisation périodique du
  // doublage audio si une piste externe est active (dérive naturelle
  // entre deux éléments <video>/<audio> distincts, même à vitesse égale).
  useEffect(() => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    progressTimer.current = setInterval(() => {
      let cur = 0;
      let dur = 0;

      if (videoRef.current) {
        cur = videoRef.current.currentTime;
        dur = videoRef.current.duration;

        if (activeAudioLangRef.current !== ORIGINAL_AUDIO_CODE && dubAudioRef.current && !dubAudioRef.current.paused) {
          const drift = Math.abs(dubAudioRef.current.currentTime - cur);
          if (drift > AUDIO_SYNC_DRIFT_THRESHOLD) {
            dubAudioRef.current.currentTime = cur;
          }
        }
      } else if (playerRef.current) {
        try {
          cur = playerRef.current.getCurrentTime?.() || 0;
          dur = playerRef.current.getDuration?.() || 0;
        } catch {
          // player not ready
        }
      } else if (useIframeFallback && playing) {
        setCurrentTimeSec((prev) => {
          const next = prev + 0.12;
          lastTimeRef.current = Math.floor(next);
          if (duration > 0) {
            setProgress(Math.min(100, (next / duration) * 100));
          }
          return next;
        });
        return;
      }

      if (dur > 0) {
        lastTimeRef.current = Math.floor(cur);
        lastDurationRef.current = Math.floor(dur);
        setCurrentTimeSec(cur);
        setProgress((cur / dur) * 100);
        setDuration(dur);
      }
    }, 120);
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, [item.youtubeId, directStreamUrl, useIframeFallback, playing, duration]);

  // Periodic watch history sync (every 3 seconds) and on unmount
  useEffect(() => {
    if (!activeProfile) return;
    if (historyTimer.current) clearInterval(historyTimer.current);
    historyTimer.current = setInterval(() => {
      saveCurrentProgress();
    }, 3000);

    return () => {
      if (historyTimer.current) clearInterval(historyTimer.current);
      saveCurrentProgress();
    };
  }, [activeProfile, saveCurrentProgress]);

  // Save on page exit / window unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveCurrentProgress();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [saveCurrentProgress]);

  // Keyboard navigation
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
      if (e.key === "ArrowLeft") {
        skip(-10);
      }
      if (e.key === "ArrowRight") {
        skip(10);
      }
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        toggleCaptions();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const resetControlsTimer = useCallback(() => {
    clearTimeout(controlsTimer.current);
    setShowControls(true);
    controlsTimer.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3500);
  }, [playing]);

  useEffect(() => {
    resetControlsTimer();
    return () => clearTimeout(controlsTimer.current);
  }, [resetControlsTimer]);

  const postIframeCommand = useCallback((func: string, args: any[] = []) => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func, args }),
        "*"
      );
    } catch {
      // ignore
    }
  }, []);

  const formatSleepTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSelectSleepTimer = (minutes: number | null) => {
    setSleepTimer(minutes);
    setSleepTimeRemaining(minutes ? minutes * 60 : null);
    setShowSleepMenu(false);
    setShowNowPlayingSleepMenu(false);
    if (minutes) {
      showCaptionNotification(`Mode Sommeil: arrêt dans ${minutes} min`, true);
    } else {
      showCaptionNotification(`Mode Sommeil désactivé`, false);
    }
  };

  useEffect(() => {
    if (sleepTimer === null) {
      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
      setSleepTimeRemaining(null);
      return;
    }

    sleepTimerRef.current = setInterval(() => {
      setSleepTimeRemaining((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(sleepTimerRef.current);
          
          if (videoRef.current) {
            videoRef.current.pause();
            if (dubAudioRef.current) dubAudioRef.current.pause();
          }
          if (playerRef.current) {
            try {
              playerRef.current.pauseVideo?.();
            } catch {
              // ignore
            }
          }
          setPlaying(false);
          setSleepTimer(null);
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
    };
  }, [sleepTimer]);

  function togglePlay() {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
        if (activeAudioLangRef.current !== ORIGINAL_AUDIO_CODE && dubAudioRef.current) {
          dubAudioRef.current.currentTime = videoRef.current.currentTime;
          dubAudioRef.current.play().catch(() => {});
        }
        setPlaying(true);
      } else {
        videoRef.current.pause();
        if (dubAudioRef.current) dubAudioRef.current.pause();
        setPlaying(false);
      }
      return;
    }

    if (playerRef.current) {
      try {
        const state = playerRef.current.getPlayerState?.();
        if (state === 1) {
          playerRef.current.pauseVideo?.();
          setPlaying(false);
        } else {
          playerRef.current.playVideo?.();
          setPlaying(true);
        }
      } catch {
        // ignore
      }
      return;
    }

    if (iframeRef.current) {
      if (playing) {
        postIframeCommand("pauseVideo");
        setPlaying(false);
      } else {
        postIframeCommand("playVideo");
        setPlaying(true);
      }
    }
  }

  function seekToPct(pct: number) {
    if (duration <= 0) return;
    const targetTime = (pct / 100) * duration;

    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
      if (activeAudioLangRef.current !== ORIGINAL_AUDIO_CODE && dubAudioRef.current) {
        dubAudioRef.current.currentTime = targetTime;
      }
      setProgress(pct);
      setCurrentTimeSec(targetTime);
      return;
    }

    if (playerRef.current) {
      try {
        playerRef.current.seekTo?.(targetTime, true);
        setProgress(pct);
        setCurrentTimeSec(targetTime);
      } catch {
        // ignore
      }
      return;
    }

    if (iframeRef.current) {
      postIframeCommand("seekTo", [targetTime, true]);
      setProgress(pct);
      setCurrentTimeSec(targetTime);
    }
  }

  function handleVolume(v: number) {
    setVolume(v);
    setMuted(v === 0);

    if (videoRef.current) {
      // Si un doublage est actif, la vidéo reste en muet et c'est
      // l'élément de doublage qui porte le volume.
      if (activeAudioLangRef.current === ORIGINAL_AUDIO_CODE) {
        videoRef.current.volume = v / 100;
        videoRef.current.muted = v === 0;
      }
    }
    if (dubAudioRef.current && activeAudioLangRef.current !== ORIGINAL_AUDIO_CODE) {
      dubAudioRef.current.volume = v / 100;
      dubAudioRef.current.muted = v === 0;
    }

    if (playerRef.current) {
      try {
        playerRef.current.setVolume?.(v);
        if (v === 0) playerRef.current.mute?.();
        else playerRef.current.unMute?.();
      } catch {
        // ignore
      }
    }

    if (iframeRef.current) {
      postIframeCommand("setVolume", [v]);
      if (v === 0) postIframeCommand("mute");
      else postIframeCommand("unMute");
    }
  }

  function toggleMute() {
    const nextMuted = !muted;
    setMuted(nextMuted);

    if (videoRef.current && activeAudioLangRef.current === ORIGINAL_AUDIO_CODE) {
      videoRef.current.muted = nextMuted;
    }
    if (dubAudioRef.current && activeAudioLangRef.current !== ORIGINAL_AUDIO_CODE) {
      dubAudioRef.current.muted = nextMuted;
      if (!nextMuted) dubAudioRef.current.volume = volume / 100;
    }
    if (videoRef.current) return;

    if (playerRef.current) {
      try {
        if (nextMuted) {
          playerRef.current.mute?.();
        } else {
          playerRef.current.unMute?.();
          playerRef.current.setVolume?.(volume);
        }
      } catch {
        // ignore
      }
    }

    if (iframeRef.current) {
      if (nextMuted) postIframeCommand("mute");
      else {
        postIframeCommand("unMute");
        postIframeCommand("setVolume", [volume]);
      }
    }
  }

  function skip(seconds: number) {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      const dur = videoRef.current.duration || duration;
      const target = Math.max(0, Math.min(dur, cur + seconds));
      videoRef.current.currentTime = target;
      if (activeAudioLangRef.current !== ORIGINAL_AUDIO_CODE && dubAudioRef.current) {
        dubAudioRef.current.currentTime = target;
      }
      setCurrentTimeSec(target);
      if (dur > 0) setProgress((target / dur) * 100);
      return;
    }

    if (playerRef.current) {
      try {
        const cur = playerRef.current.getCurrentTime?.() ?? currentTimeSec;
        const dur = playerRef.current.getDuration?.() ?? duration;
        const target = Math.max(0, Math.min(dur, cur + seconds));
        playerRef.current.seekTo?.(target, true);
        setCurrentTimeSec(target);
        if (dur > 0) setProgress((target / dur) * 100);
      } catch {
        // ignore
      }
      return;
    }

    if (iframeRef.current) {
      const cur = currentTimeSec;
      const dur = duration;
      const target = Math.max(0, Math.min(dur, cur + seconds));
      postIframeCommand("seekTo", [target, true]);
      setCurrentTimeSec(target);
      if (dur > 0) setProgress((target / dur) * 100);
    }
  }

  function showCaptionNotification(message: string, active: boolean) {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setCaptionToast({ message, active });
    toastTimeoutRef.current = setTimeout(() => {
      setCaptionToast(null);
    }, 2400);
  }

  function toggleCaptions() {
    const nextState = !captionsOn;
    setCaptionsOn(nextState);
    showCaptionNotification(
      nextState ? "Sous-titres activés (CC)" : "Sous-titres désactivés",
      nextState
    );
    applyCaptionsToTarget(nextState);
  }

  function changePlaybackRate(rateVal: number) {
    if (videoRef.current) {
      videoRef.current.playbackRate = rateVal;
      if (dubAudioRef.current) {
        dubAudioRef.current.playbackRate = rateVal;
      }
      setPlaybackRate(rateVal);
      setShowSpeedMenu(false);
      setShowNowPlayingSpeedMenu(false);
      return;
    }

    if (!playerRef.current) return;
    try {
      playerRef.current.setPlaybackRate?.(rateVal);
      setPlaybackRate(rateVal);
      setShowSpeedMenu(false);
      setShowNowPlayingSpeedMenu(false);
    } catch {
      // ignore
    }
  }

  function changeQuality(qualKey: string) {
    setQualityPreference(qualKey);
    setShowQualityMenu(false);
    setShowNowPlayingQualityMenu(false);
    if (playerRef.current) {
      applyForcedHDQuality(playerRef.current, qualKey);
    }
  }

  function goFullscreen() {
    if (containerRef.current?.requestFullscreen) {
      containerRef.current.requestFullscreen();
    }
  }

  const handleToggleDownload = () => {
    if (downloaded) {
      removeOfflineDownload(item.id);
      setDownloaded(false);
    } else {
      saveOfflineDownload(item);
      setDownloaded(true);
    }
  };

  const handleExportVideoFile = () => {
    if (item.videoUrl && (item.videoUrl.endsWith(".mp4") || item.videoUrl.endsWith(".webm"))) {
      const a = document.createElement("a");
      a.href = item.videoUrl;
      a.download = `${item.title.replace(/[^a-zA-Z0-9-_]/g, "_")}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showCaptionNotification("Export du fichier vidéo lancé", true);
    } else {
      const payload = {
        title: item.title,
        channel: item.channel,
        categories: item.categories,
        year: item.year,
        duration: item.duration,
        score: item.score,
        youtubeId: item.youtubeId,
        videoUrl: item.videoUrl || `https://www.youtube.com/watch?v=${item.youtubeId}`,
        downloadUrl: item.downloadUrl,
        exportedAt: new Date().toISOString(),
      };
      const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
      const a = document.createElement("a");
      a.href = jsonStr;
      a.download = `${item.title.replace(/[^a-zA-Z0-9-_]/g, "_")}_manifest.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showCaptionNotification("Exportation de la fiche média réussie", true);
    }
  };

  const handleMinimize = (modeOverride?: "video" | "audio" | React.MouseEvent) => {
    let cur = lastTimeRef.current || 0;
    if (videoRef.current) {
      cur = videoRef.current.currentTime || cur;
    } else if (playerRef.current) {
      try {
        cur = playerRef.current.getCurrentTime?.() || cur;
      } catch {
        // ignore
      }
    }
    saveCurrentProgress();
    const effectiveMode = (typeof modeOverride === "string" ? modeOverride : undefined) || (isAudioMode ? "audio" : "video");
    if (onMinimize) {
      onMinimize(cur > 0 ? cur : undefined, effectiveMode);
    } else {
      onClose();
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(
      `${window.location.origin}${window.location.pathname}?v=${item.id}`
    );
    showCaptionNotification("Lien copié dans le presse-papiers", true);
    setShowMoreMenu(false);
  };

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const qualityOptions: { key: string; label: string }[] = [
    { key: "auto_max", label: "Max Disponible (4K/FHD)" },
    { key: "hd2160", label: "4K Ultra HD (2160p)" },
    { key: "hd1440", label: "2K Quad HD (1440p)" },
    { key: "hd1080", label: "Full HD (1080p)" },
    { key: "hd720", label: "Haute Définition (720p)" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        duration: 0.32,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="fixed inset-0 z-[100] bg-black flex flex-col font-sans"
    >
      {/* Élément audio caché pour le doublage — ne rend rien visuellement */}
      <audio ref={dubAudioRef} className="hidden" preload="auto" />

      <div
        ref={containerRef}
        className={`relative overflow-hidden bg-black select-none ${
          isAudioMode ? "flex-1" : "w-full aspect-video md:aspect-auto md:flex-1 flex-shrink-0"
        }`}
        onMouseMove={resetControlsTimer}
      >
        {/* Direct MP4/WebM stream or YouTube player or Fallback iframe */}
        {directStreamUrl ? (
          <video
            ref={videoRef}
            src={directStreamUrl}
            autoPlay
            playsInline
            className={`absolute inset-0 w-full h-full object-contain ${
              isAudioMode ? "opacity-0 pointer-events-none invisible" : ""
            }`}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                videoRef.current.playbackRate = playbackRateRef.current;
              }
              if (captionsOnRef.current) {
                applyCaptionsToTarget(true);
              }
            }}
            onWaiting={() => setBuffering(true)}
            onPlaying={() => {
              setBuffering(false);
              setPlaying(true);
            }}
            onPause={() => setPlaying(false)}
            onEnded={() => {
              saveCurrentProgress();
              if (dubAudioRef.current) dubAudioRef.current.pause();
              if (repeatOn && videoRef.current) {
                videoRef.current.currentTime = 0;
                videoRef.current.play();
                if (activeAudioLangRef.current !== ORIGINAL_AUDIO_CODE && dubAudioRef.current) {
                  dubAudioRef.current.currentTime = 0;
                  dubAudioRef.current.play().catch(() => {});
                }
              } else {
                handleNextTrack();
              }
            }}
          />
        ) : useIframeFallback ? (
          <div
            className={`absolute inset-0 w-full h-full bg-black ${
              isAudioMode ? "opacity-0 pointer-events-none invisible" : ""
            }`}
          >
            <iframe
              ref={iframeRef}
              key={item.youtubeId}
              src={`https://www.youtube-nocookie.com/embed/${item.youtubeId}?autoplay=1&enablejsapi=1&playsinline=1&rel=0&iv_load_policy=3&modestbranding=1&controls=1&disablekb=0&fs=1&origin=${encodeURIComponent(
                typeof window !== "undefined" ? window.location.origin : ""
              )}${resumeTime > 0 ? `&start=${Math.floor(resumeTime)}` : ""}`}
              title={item.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              onLoad={() => {
                if (captionsOnRef.current) {
                  setTimeout(() => applyCaptionsToTarget(true), 800);
                }
                if (playbackRateRef.current !== 1) {
                  setTimeout(
                    () => postIframeCommand("setPlaybackRate", [playbackRateRef.current]),
                    800
                  );
                }
              }}
            />
          </div>
        ) : (
          <div
            ref={playerDivRef}
            className={`absolute inset-0 w-full h-full ${
              isAudioMode ? "opacity-0 pointer-events-none invisible" : ""
            }`}
          />
        )}

        {/* ───────────────────────────────────────────────────────── */}
        {/* GRACEFUL ERROR OVERLAY — Vidéo indisponible ou restreinte */}
        {/* ───────────────────────────────────────────────────────── */}
        {playbackError && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-zinc-950/95 backdrop-blur-md text-center">
            {/* Image d'arrière-plan floutée */}
            <div className="absolute inset-0 -z-10 overflow-hidden opacity-20 pointer-events-none">
              <img
                src={item.thumbnail}
                alt=""
                aria-hidden="true"
                className="w-full h-full object-cover blur-3xl scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/90" />
            </div>

            <div className="max-w-md w-full bg-zinc-900/90 border border-zinc-800 p-6 sm:p-8 rounded-2xl shadow-2xl space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertTriangle size={28} />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-white text-lg font-bold">
                  {playbackError.title}
                </h3>
                <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed">
                  {playbackError.message}
                </p>
                <p className="text-zinc-500 text-[11px] leading-normal">
                  {playbackError.subMessage}
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
                <a
                  href={`https://www.youtube.com/watch?v=${item.youtubeId}${
                    resumeTime > 0 ? `&t=${Math.floor(resumeTime)}s` : ""
                  }`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg hover:shadow-red-950/50"
                >
                  <ExternalLink size={15} />
                  <span>Regarder sur YouTube</span>
                </a>

                {upNext && (
                  <button
                    onClick={() => handleChangeItem(upNext.id)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg"
                  >
                    <span>Épisode suivant</span>
                    <ChevronRight size={15} />
                  </button>
                )}

                {playbackError.canRetry && (
                  <button
                    onClick={handleRetry}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold transition-colors border border-zinc-700"
                  >
                    <RefreshCw size={13} />
                    <span>Réessayer</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────── */}
        {/* AUDIO MODE — Interface "Now Playing" plein écran          */}
        {/* ───────────────────────────────────────────────────────── */}
        {isAudioMode && (
          <div className="absolute inset-0 z-20 flex flex-col overflow-hidden bg-[#09090b]">
            {/* Fond flou basé sur la miniature avec opacité contrôlée sur fond 100% noir solide */}
            <div className="absolute inset-0 pointer-events-none">
              <img
                src={item.thumbnail}
                alt=""
                aria-hidden="true"
                className="w-full h-full object-cover scale-125 blur-3xl opacity-40 brightness-75 saturate-150"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#09090b]/80 via-[#09090b]/70 to-[#09090b]" />
            </div>

            {/* Contenu glass */}
            <div className="relative z-10 flex flex-col h-full max-w-lg mx-auto w-full px-6 pt-5 pb-5">
              {/* Header Audio HD */}
              <div className="flex items-center justify-between flex-shrink-0 mb-4">
                <button
                  onClick={() => setIsAudioMode(false)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full liquid-glass hover:bg-white/15 border border-white/15 text-zinc-200 hover:text-white transition-all text-xs font-semibold shadow-sm"
                  title="Revenir au mode vidéo"
                >
                  <Tv size={14} />
                  <span>Mode Vidéo</span>
                </button>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full liquid-glass-emerald border border-emerald-400/30 text-emerald-300 text-xs font-bold shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Audio HD</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Bouton Miniature Audio HD */}
                  <button
                    onClick={() => handleMinimize("audio")}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-200 hover:text-white liquid-glass hover:bg-white/15 border border-white/15 transition-all shadow-sm"
                    title="Réduire en miniature Audio HD"
                  >
                    <Minimize2 size={17} />
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setShowMoreMenu((v) => !v)}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-200 hover:text-white liquid-glass hover:bg-white/15 border border-white/15 transition-all shadow-sm"
                      title="Plus d'options"
                    >
                      <MoreHorizontal size={19} />
                    </button>
                    {showMoreMenu && (
                      <div className="absolute right-0 top-full mt-2 w-52 liquid-glass-card backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl py-2 z-30">
                        <a
                          href={`https://www.youtube.com/watch?v=${item.youtubeId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-zinc-200 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <ExternalLink size={14} /> Ouvrir sur YouTube
                        </a>
                        <button
                          onClick={handleShare}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-zinc-200 hover:text-white hover:bg-white/10 transition-colors text-left"
                        >
                          <Share2 size={14} /> Partager
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleClose}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-300 hover:text-rose-400 liquid-glass hover:bg-white/15 border border-white/15 transition-all shadow-sm"
                    title="Fermer le lecteur"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Zone Centrale : Soit Pochette Studio, Soit Panneau Paroles Spotify */}
              <div className="flex-1 flex flex-col items-center justify-center min-h-0 mb-4 relative">
                {showAudioLyrics ? (
                  /* Interface Paroles Style Spotify (compacte, taille juste adaptée pour lire) */
                  <div className="w-full flex-1 flex items-center justify-center min-h-0">
                    <SpotifyLyricsCard
                      item={item}
                      currentTimeSec={currentTimeSec}
                      durationSec={duration}
                      onSeek={(sec) => seekToPct((sec / (duration || 1)) * 100)}
                      onClose={() => setShowAudioLyrics(false)}
                    />
                  </div>
                ) : (
                  /* Pochette Studio Audio HD standard */
                  <div className="flex flex-col items-center justify-center w-full h-full min-h-0">
                    <div className="relative w-full max-w-[280px] sm:max-w-[320px] aspect-square rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-black/60 backdrop-blur-md group">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />

                      {/* Equalizer animation when playing */}
                      {playing && !buffering && (
                        <div className="absolute top-3 left-3 flex items-end gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 pointer-events-none">
                          <span className="w-1 h-3 bg-emerald-400 rounded-full animate-[bounce_0.8s_ease-in-out_infinite]" />
                          <span className="w-1 h-4 bg-emerald-400 rounded-full animate-[bounce_0.6s_ease-in-out_infinite_0.2s]" />
                          <span className="w-1 h-2 bg-emerald-400 rounded-full animate-[bounce_0.9s_ease-in-out_infinite_0.4s]" />
                        </div>
                      )}

                      <button
                        onClick={() => toggle(item)}
                        className={`absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md border transition-colors ${
                          inList(item.id)
                            ? "bg-rose-500/90 border-rose-300/60 text-white"
                            : "bg-black/50 border-white/20 text-white/90 hover:bg-black/80"
                        }`}
                        title={inList(item.id) ? "Retirer de ma liste" : "Ajouter à ma liste"}
                      >
                        <Heart size={17} fill={inList(item.id) ? "white" : "none"} />
                      </button>
                    </div>

                    {/* Quick Paroles button pill under artwork */}
                    <button
                      onClick={() => setShowAudioLyrics(true)}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-emerald-500/20 text-zinc-300 hover:text-emerald-300 text-xs font-semibold border border-white/10 hover:border-emerald-500/40 transition-all"
                    >
                      <Subtitles size={13} />
                      <span>Afficher les paroles / transcription</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Titre & Artiste / Récitateur */}
              <div className="text-center mb-4 flex-shrink-0">
                <h2 className="text-white font-bold text-lg sm:text-xl leading-tight line-clamp-1">
                  {item.title}
                </h2>
                <p className="text-white/60 text-xs sm:text-sm mt-1">
                  {reciter ? `${reciter.name} · ${reciter.mosque}` : item.channel}
                </p>
              </div>

              {/* Barre de progression */}
              <div className="flex-shrink-0 mb-3">
                <div
                  className="group/progress relative h-1.5 bg-white/20 rounded-full cursor-pointer hover:h-2 transition-all"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = ((e.clientX - rect.left) / rect.width) * 100;
                    seekToPct(Math.max(0, Math.min(100, pct)));
                  }}
                >
                  <div
                    className="h-full bg-emerald-400 rounded-full relative"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md scale-0 group-hover/progress:scale-100 transition-transform" />
                  </div>
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-white/60 text-xs font-mono">
                    {fmt((progress / 100) * duration)}
                  </span>
                  <span className="text-white/60 text-xs font-mono">{fmt(duration)}</span>
                </div>
              </div>

              {/* Transport : shuffle / précédent / play / suivant / repeat */}
              <div className="flex items-center justify-between px-2 mb-4 flex-shrink-0">
                <button
                  onClick={() => setShuffleOn((v) => !v)}
                  className={`transition-colors ${shuffleOn ? "text-emerald-400" : "text-white/50 hover:text-white/80"}`}
                  title="Lecture aléatoire"
                >
                  <Shuffle size={19} />
                </button>
                <button
                  onClick={handlePreviousTrack}
                  className="text-white hover:text-white/80 transition-colors active:scale-95"
                  title="Revenir au début"
                >
                  <SkipBack size={24} fill="white" />
                </button>
                <button
                  onClick={togglePlay}
                  className="w-16 h-16 rounded-full bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold border border-white/30 backdrop-blur-md flex items-center justify-center transition-all shadow-[0_0_24px_rgba(52,211,153,0.35)] hover:scale-105 active:scale-95"
                >
                  {buffering ? (
                    <Loader2 size={24} className="animate-spin text-zinc-950" />
                  ) : playing ? (
                    <Pause size={24} fill="currentColor" />
                  ) : (
                    <Play size={24} fill="currentColor" className="ml-1" />
                  )}
                </button>
                <button
                  onClick={handleNextTrack}
                  disabled={!shuffleOn && !upNext}
                  className={`transition-colors active:scale-95 ${
                    !shuffleOn && !upNext ? "text-white/25 cursor-not-allowed" : "text-white hover:text-white/80"
                  }`}
                  title="Piste suivante"
                >
                  <SkipForward size={24} fill="currentColor" />
                </button>
                <button
                  onClick={() => setRepeatOn((v) => !v)}
                  className={`transition-colors ${repeatOn ? "text-emerald-400" : "text-white/50 hover:text-white/80"}`}
                  title="Répéter la piste"
                >
                  {repeatOn ? <Repeat1 size={19} /> : <Repeat size={19} />}
                </button>
              </div>

              {/* Rangée de raccourcis : file, boost, doublage, qualité, vitesse, sous-titres Spotify */}
              <div className="flex items-center justify-center gap-2 mb-3 flex-shrink-0">
                <div className="flex items-center gap-1.5 liquid-glass backdrop-blur-2xl border border-white/15 rounded-full p-1 shadow-sm">
                  <button
                    onClick={() =>
                      upNext
                        ? showCaptionNotification(`À suivre : ${upNext.title}`, true)
                        : showCaptionNotification("Aucune piste suivante disponible", false)
                    }
                    className="w-10 h-8.5 rounded-full flex items-center justify-center text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                    title="Voir la piste suivante"
                  >
                    <ListMusic size={16} />
                  </button>

                  {/* Doublage audio */}
                  {hasDubbing && (
                    <div className="relative">
                      <button
                        onClick={() => setShowNowPlayingLangMenu((v) => !v)}
                        className={`w-10 h-8.5 rounded-full flex items-center justify-center transition-colors relative ${
                          activeAudioLang !== ORIGINAL_AUDIO_CODE
                            ? "text-emerald-300"
                            : "text-zinc-300 hover:bg-white/10 hover:text-white"
                        }`}
                        title="Langue de doublage"
                      >
                        {dubBuffering ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
                      </button>
                      {showNowPlayingLangMenu && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-36 liquid-glass-card backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl py-1.5 z-30">
                          <button
                            onClick={() => switchAudioLanguage(ORIGINAL_AUDIO_CODE)}
                            className={`w-full text-left px-4 py-1.5 text-xs transition-colors rounded-lg mx-auto ${
                              activeAudioLang === ORIGINAL_AUDIO_CODE
                                ? "text-emerald-300 font-semibold bg-emerald-500/20"
                                : "text-zinc-300 hover:text-white hover:bg-white/10"
                            }`}
                          >
                            Original
                          </button>
                          {availableAudioTracks.map((track) => (
                            <button
                              key={track.code}
                              onClick={() => switchAudioLanguage(track.code)}
                              className={`w-full text-left px-4 py-1.5 text-xs transition-colors rounded-lg mx-auto ${
                                activeAudioLang === track.code
                                  ? "text-emerald-300 font-semibold bg-emerald-500/20"
                                  : "text-zinc-300 hover:text-white hover:bg-white/10"
                              }`}
                            >
                              {track.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Amplificateur de son */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        boostSupported
                          ? setShowNowPlayingBoostMenu((v) => !v)
                          : showCaptionNotification(
                              "Amplificateur indisponible pour ce contenu (lu depuis YouTube)",
                              false
                            )
                      }
                      className={`w-10 h-8.5 rounded-full flex items-center justify-center transition-colors relative ${
                        !boostSupported
                          ? "text-zinc-600 cursor-not-allowed"
                          : boostLevel > 100
                          ? "text-emerald-300"
                          : "text-zinc-300 hover:bg-white/10 hover:text-white"
                      }`}
                      title={
                        boostSupported
                          ? "Amplificateur de son"
                          : "Amplificateur indisponible pour cette source (YouTube)"
                      }
                    >
                      {boostSupported ? <Zap size={16} /> : <ZapOff size={16} />}
                      {boostLevel > 100 && boostSupported && (
                        <span className="absolute -bottom-0.5 -right-0.5 text-[8px] font-bold bg-emerald-400 text-zinc-950 rounded-full w-3.5 h-3.5 flex items-center justify-center">
                          {boostLevel / 100}
                        </span>
                      )}
                    </button>
                    {showNowPlayingBoostMenu && boostSupported && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-28 liquid-glass-card backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl py-1.5 z-30">
                        {BOOST_LEVELS.map((level) => (
                          <button
                            key={level}
                            onClick={() => handleSelectBoost(level)}
                            className={`w-full text-left px-4 py-1.5 text-xs transition-colors rounded-lg mx-auto ${
                              boostLevel === level
                                ? "text-emerald-300 font-semibold bg-emerald-500/20"
                                : "text-zinc-300 hover:text-white hover:bg-white/10"
                            }`}
                          >
                            {level}%
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowNowPlayingSpeedMenu((v) => !v);
                      }}
                      className="w-10 h-8.5 rounded-full flex items-center justify-center text-zinc-300 hover:bg-white/10 hover:text-white transition-colors relative"
                      title="Vitesse de lecture"
                    >
                      <Gauge size={16} />
                      <span className="absolute -bottom-0.5 -right-0.5 text-[8px] font-bold bg-white text-black rounded-full w-3.5 h-3.5 flex items-center justify-center">
                        {playbackRate}
                      </span>
                    </button>
                    {showNowPlayingSpeedMenu && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-28 liquid-glass-card backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl py-1.5 z-30">
                        {speedOptions.map((rateVal) => (
                          <button
                            key={rateVal}
                            onClick={() => changePlaybackRate(rateVal)}
                            className={`w-full text-left px-4 py-1.5 text-xs transition-colors rounded-lg mx-auto ${
                              playbackRate === rateVal
                                ? "text-emerald-300 font-semibold bg-emerald-500/20"
                                : "text-zinc-300 hover:text-white hover:bg-white/10"
                            }`}
                          >
                            {rateVal}x
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bouton Mode Sommeil */}
                  <div className="relative">
                    <button
                      onClick={() => setShowNowPlayingSleepMenu((v) => !v)}
                      className={`w-10 h-8.5 rounded-full flex items-center justify-center transition-colors relative ${
                        sleepTimer !== null
                          ? "text-emerald-300"
                          : "text-zinc-300 hover:bg-white/10 hover:text-white"
                      }`}
                      title="Mode Sommeil (Minuteur)"
                    >
                      <Moon size={16} />
                      {sleepTimer !== null && sleepTimeRemaining !== null && (
                        <span className="absolute -bottom-1 -right-2 text-[9px] font-bold text-emerald-400 bg-black/60 px-1 rounded-sm backdrop-blur-md">
                          {formatSleepTime(sleepTimeRemaining)}
                        </span>
                      )}
                    </button>
                    {showNowPlayingSleepMenu && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 liquid-glass-card backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl py-1.5 z-30">
                        <button
                          onClick={() => handleSelectSleepTimer(null)}
                          className={`w-full text-left px-4 py-1.5 text-xs transition-colors rounded-lg mx-auto ${
                            sleepTimer === null
                              ? "text-emerald-300 font-semibold bg-emerald-500/20"
                              : "text-zinc-300 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          Désactivé
                        </button>
                        {[15, 30, 60].map((mins) => (
                          <button
                            key={mins}
                            onClick={() => handleSelectSleepTimer(mins)}
                            className={`w-full text-left px-4 py-1.5 text-xs transition-colors rounded-lg mx-auto ${
                              sleepTimer === mins
                                ? "text-emerald-300 font-semibold bg-emerald-500/20"
                                : "text-zinc-300 hover:text-white hover:bg-white/10"
                            }`}
                          >
                            {mins} minutes
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <Volume2 size={16} className="text-white/50 flex-shrink-0" />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={muted ? 0 : volume}
                  onChange={(e) => handleVolume(+e.target.value)}
                  className="flex-1 h-1 accent-emerald-400 cursor-pointer"
                />
                <button onClick={toggleMute} className="flex-shrink-0 text-white/80 hover:text-white transition-colors">
                  {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Resume exact second Toast */}
        {resumeToast && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-zinc-900/95 border border-emerald-500/40 text-emerald-400 px-4 py-1.5 rounded-full shadow-2xl backdrop-blur-md text-xs font-semibold flex items-center gap-1.5 animate-in fade-in slide-in-from-top-3 duration-200">
            <Clock size={13} className="text-emerald-400" />
            <span>{resumeToast}</span>
          </div>
        )}

        {/* Buffering Indicator */}
        {buffering && !useIframeFallback && !isAudioMode && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/40 backdrop-blur-[2px]">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={48} className="text-emerald-400 animate-spin" />
              <span className="text-xs font-semibold text-zinc-300 tracking-wider uppercase">
                Chargement de la récitation...
              </span>
            </div>
          </div>
        )}

        {/* Error Fallback Banner */}
        {hasPlaybackError && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center z-30">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4">
              <RotateCcw size={28} className="text-red-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">
              Lecture restreinte par la plateforme externe
            </h3>
            <p className="text-zinc-400 text-sm max-w-md mb-6">
              Cette vidéo est protégée par les règles d'intégration de YouTube. Vous pouvez la lancer en direct sur YouTube :
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href={`https://www.youtube.com/watch?v=${item.youtubeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-sm transition-colors flex items-center gap-2"
              >
                <ExternalLink size={16} /> Ouvrir sur YouTube
              </a>
            </div>
          </div>
        )}

        {/* Click-to-Play Overlay (Only when in video mode and not iframe fallback) */}
        {!useIframeFallback && !isAudioMode && (
          <div
            className="absolute inset-0"
            onClick={togglePlay}
            style={{ cursor: showControls ? "pointer" : "default" }}
          />
        )}

        {/* Top Header Bar (masquée en mode audio : remplacée par le header "Now Playing") */}
        {!isAudioMode && (
          <div
            className={`absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/95 via-black/70 to-transparent transition-opacity duration-300 ${
              showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="flex items-center justify-between gap-4 px-6 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={handleMinimize}
                  className="flex items-center gap-2 text-zinc-200 hover:text-white transition-all flex-shrink-0 liquid-glass hover:bg-white/15 px-3.5 py-1.5 rounded-full border border-white/15 shadow-sm"
                  title="Réduire en miniature / Image dans l'image"
                >
                  <Minimize2 size={16} />
                  <span className="text-xs font-semibold hidden sm:block">Miniature</span>
                </button>
                <button
                  onClick={handleClose}
                  className="flex items-center gap-1.5 text-zinc-300 hover:text-rose-400 transition-all flex-shrink-0 liquid-glass hover:bg-white/15 px-3 py-1.5 rounded-full border border-white/15 shadow-sm"
                  title="Fermer la vidéo"
                >
                  <X size={16} />
                  <span className="text-xs font-semibold hidden sm:block">Fermer</span>
                </button>
                <div className="min-w-0 ml-1">
                  <p className="text-zinc-400 text-[11px] uppercase tracking-wider font-medium">
                    En lecture · {item.channel}
                  </p>
                  <h3 className="text-white font-bold text-base sm:text-lg leading-tight truncate max-w-[40vw]">
                    {item.title}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                {/* Audio/Video Mode Switcher (Seamless toggle using exact extracted audio) */}
                <button
                  onClick={() => setIsAudioMode(!isAudioMode)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    isAudioMode
                      ? "liquid-glass-emerald border border-emerald-300/40 text-emerald-200 shadow-md shadow-emerald-950/40"
                      : "liquid-glass text-zinc-200 hover:text-white border-white/15 hover:bg-white/15 shadow-sm"
                  }`}
                  title={isAudioMode ? "Basculer en Mode Vidéo" : "Basculer en Mode Audio HD (Son extrait de la vidéo)"}
                >
                  {isAudioMode ? <Tv size={14} /> : <Music size={14} />}
                  <span className="hidden sm:inline">
                    {isAudioMode ? "Mode Vidéo" : "Audio HD"}
                  </span>
                </button>

                {/* Reciter pill in top bar if Tarawih */}
                {reciter && (
                  <div className="hidden md:flex items-center gap-2 liquid-glass-card px-3 py-1.5 rounded-full border border-emerald-400/30 shadow-lg">
                    <img
                      src={reciter.photoUrl}
                      alt={reciter.name}
                      className="w-6 h-6 rounded-full object-cover border border-emerald-400"
                    />
                    <div className="text-left">
                      <p className="text-xs font-bold text-emerald-300 leading-tight">{reciter.name}</p>
                      <p className="text-[9px] text-zinc-300 leading-none">{reciter.mosque}</p>
                    </div>
                  </div>
                )}

                {/* Open on YouTube external */}
                <a
                  href={`https://www.youtube.com/watch?v=${item.youtubeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden lg:flex items-center gap-1.5 text-zinc-200 hover:text-white text-xs px-3 py-1.5 liquid-glass hover:bg-white/15 rounded-full border border-white/15 transition-all shadow-sm font-semibold"
                  title="Ouvrir dans YouTube"
                >
                  <ExternalLink size={13} />
                  <span>YouTube</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Center Pause Indicator */}
        {!useIframeFallback && !isAudioMode && (
          <div
            className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-200 ${
              !playing && !buffering && showControls ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="w-20 h-20 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl">
              <Play size={32} fill="white" className="text-white ml-1" />
            </div>
          </div>
        )}

        {/* Caption Feedback Toast */}
        {captionToast && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none transition-all duration-300">
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/90 backdrop-blur-md border border-white/15 text-white text-xs font-semibold shadow-2xl">
              <Subtitles size={16} className={captionToast.active ? "text-emerald-400" : "text-zinc-400"} />
              <span>{captionToast.message}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  captionToast.active ? "bg-emerald-400 shadow-sm shadow-emerald-400" : "bg-zinc-500"
                }`}
              />
            </div>
          </div>
        )}

        {/* Bottom Floating Control Bar (masquée en mode audio) */}
        {!isAudioMode && (
          <div
            className={`absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/95 via-black/70 to-transparent transition-opacity duration-300 ${
              showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {/* Seek Bar */}
            <div className="px-6 pb-2">
              <div
                className="group/progress relative h-1.5 hover:h-2.5 bg-white/20 rounded-full cursor-pointer transition-all duration-150"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = ((e.clientX - rect.left) / rect.width) * 100;
                  seekToPct(pct);
                }}
              >
                <div
                  className="h-full bg-emerald-500 rounded-full relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md opacity-0 group-hover/progress:opacity-100 transition-opacity" />
                </div>
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-zinc-300 text-xs font-mono">
                  {fmt((progress / 100) * duration)}
                </span>
                <span className="text-zinc-300 text-xs font-mono">
                  {fmt(duration)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-2 px-4 sm:px-6 pb-4 sm:pb-5">
              
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <button
                    onClick={() => skip(-10)}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full liquid-glass hover:bg-white/15 border border-white/15 flex items-center justify-center text-zinc-200 hover:text-white transition-all shadow-sm"
                    title="Reculer de 10s"
                  >
                    <SkipBack size={18} />
                  </button>
                  <button
                    onClick={togglePlay}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold border border-white/30 backdrop-blur-md flex items-center justify-center transition-all shadow-[0_0_24px_rgba(52,211,153,0.35)] hover:scale-105 active:scale-95"
                  >
                    {playing ? (
                      <Pause size={22} fill="currentColor" className="text-zinc-950" />
                    ) : (
                      <Play size={22} fill="currentColor" className="text-zinc-950 ml-0.5" />
                    )}
                  </button>
                  <button
                    onClick={() => skip(10)}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full liquid-glass hover:bg-white/15 border border-white/15 flex items-center justify-center text-zinc-200 hover:text-white transition-all shadow-sm"
                    title="Avancer de 10s"
                  >
                    <SkipForward size={18} />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="hidden sm:flex items-center gap-2 group/vol liquid-glass px-2.5 py-1.5 rounded-full border border-white/15 shadow-sm">
                    <button
                      onClick={toggleMute}
                      className="text-zinc-300 hover:text-white transition-colors"
                    >
                      {muted || volume === 0 ? (
                        <VolumeX size={17} />
                      ) : (
                        <Volume2 size={17} />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={muted ? 0 : volume}
                      onChange={(e) => handleVolume(+e.target.value)}
                      className="w-0 group-hover/vol:w-20 h-1 accent-emerald-400 cursor-pointer transition-all duration-300"
                    />
                  </div>

              {/* Doublage audio multi-langue */}
              {hasDubbing && (
                <div className="relative">
                  <button
                    onClick={() => setShowLangMenu((v) => !v)}
                    className={`liquid-glass text-xs font-semibold px-3 py-1.5 rounded-full border transition-all shadow-sm flex items-center gap-1.5 ${
                      activeAudioLang !== ORIGINAL_AUDIO_CODE
                        ? "border-emerald-400/40 text-emerald-200 liquid-glass-emerald"
                        : "border-white/15 text-zinc-200 hover:text-white"
                    }`}
                    title="Langue de doublage"
                  >
                    {dubBuffering ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
                    <span>
                      {activeAudioLang === ORIGINAL_AUDIO_CODE
                        ? "Original"
                        : availableAudioTracks.find((t) => t.code === activeAudioLang)?.label || "Original"}
                    </span>
                  </button>
                  {showLangMenu && (
                    <div className="absolute bottom-full right-0 mb-2 w-36 rounded-2xl border border-white/20 liquid-glass-card backdrop-blur-2xl py-1.5 shadow-2xl z-30">
                      <button
                        onClick={() => switchAudioLanguage(ORIGINAL_AUDIO_CODE)}
                        className={`block w-full px-3 py-1.5 text-left text-xs transition-colors rounded-lg mx-auto ${
                          activeAudioLang === ORIGINAL_AUDIO_CODE
                            ? "bg-emerald-500/20 text-emerald-300 font-bold"
                            : "text-zinc-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        Original
                      </button>
                      {availableAudioTracks.map((track) => (
                        <button
                          key={track.code}
                          onClick={() => switchAudioLanguage(track.code)}
                          className={`block w-full px-3 py-1.5 text-left text-xs transition-colors rounded-lg mx-auto ${
                            activeAudioLang === track.code
                              ? "bg-emerald-500/20 text-emerald-300 font-bold"
                              : "text-zinc-300 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          {track.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Amplificateur de son */}
              <div className="relative">
                <button
                  onClick={() =>
                    boostSupported
                      ? setShowBoostMenu((v) => !v)
                      : showCaptionNotification(
                          "Amplificateur indisponible pour ce contenu (lu depuis YouTube)",
                          false
                        )
                  }
                  className={`liquid-glass text-xs font-semibold px-3 py-1.5 rounded-full border transition-all shadow-sm flex items-center gap-1.5 ${
                    !boostSupported
                      ? "border-white/10 text-zinc-500 cursor-not-allowed"
                      : boostLevel > 100
                      ? "border-emerald-400/40 text-emerald-200 liquid-glass-emerald"
                      : "border-white/15 text-zinc-200 hover:text-white"
                  }`}
                  title={
                    boostSupported
                      ? "Amplificateur de son"
                      : "Indisponible pour cette source (lue depuis YouTube, pas un flux direct)"
                  }
                >
                  {boostSupported ? <Zap size={14} /> : <ZapOff size={14} />}
                  <span>{boostLevel}%</span>
                </button>
                {showBoostMenu && boostSupported && (
                  <div className="absolute bottom-full right-0 mb-2 w-28 rounded-2xl border border-white/20 liquid-glass-card backdrop-blur-2xl py-1.5 shadow-2xl z-30">
                    {BOOST_LEVELS.map((level) => (
                      <button
                        key={level}
                        onClick={() => handleSelectBoost(level)}
                        className={`block w-full px-3 py-1.5 text-left text-xs transition-colors rounded-lg mx-auto ${
                          boostLevel === level
                            ? "bg-emerald-500/20 text-emerald-300 font-bold"
                            : "text-zinc-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {level}%
                      </button>
                    ))}
                  </div>
                )}
              </div>
              </div>
              </div>

              <div className="ml-auto flex flex-wrap items-center justify-end gap-2 sm:gap-2.5">
                <div className="relative">
                  <button
                    onClick={() => setShowSpeedMenu((open) => !open)}
                    className="liquid-glass text-zinc-200 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/15 transition-all shadow-sm"
                    aria-label="Vitesse de lecture"
                  >
                    {playbackRate}x
                  </button>
                  {showSpeedMenu && (
                    <div className="absolute bottom-full right-0 mb-2 w-24 rounded-2xl border border-white/20 liquid-glass-card backdrop-blur-2xl py-1.5 shadow-2xl z-30">
                      {speedOptions.map((rateVal) => (
                        <button
                          key={rateVal}
                          onClick={() => changePlaybackRate(rateVal)}
                          className={`block w-full px-3 py-1.5 text-left text-xs transition-colors rounded-lg mx-auto ${
                            playbackRate === rateVal
                              ? "bg-emerald-500/20 text-emerald-300 font-bold"
                              : "text-zinc-300 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          {rateVal}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bouton Mode Sommeil (Vidéo) */}
                <div className="relative">
                  <button
                    onClick={() => setShowSleepMenu((open) => !open)}
                    className={`liquid-glass hover:bg-white/15 border border-white/15 px-3 py-1.5 rounded-full flex items-center justify-center transition-all shadow-sm gap-1.5 ${
                      sleepTimer !== null
                        ? "text-emerald-300"
                        : "text-zinc-200 hover:text-white"
                    }`}
                    title="Mode Sommeil (Minuteur)"
                  >
                    <Moon size={14} />
                    {sleepTimer !== null && sleepTimeRemaining !== null && (
                      <span className="text-[10px] font-bold text-emerald-400">
                        {formatSleepTime(sleepTimeRemaining)}
                      </span>
                    )}
                  </button>
                  {showSleepMenu && (
                    <div className="absolute bottom-full right-0 mb-2 w-32 liquid-glass-card backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl py-1.5 z-30">
                      <button
                        onClick={() => handleSelectSleepTimer(null)}
                        className={`w-full text-left px-4 py-1.5 text-xs transition-colors rounded-lg mx-auto ${
                          sleepTimer === null
                            ? "text-emerald-300 font-semibold bg-emerald-500/20"
                            : "text-zinc-300 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        Désactivé
                      </button>
                      {[15, 30, 60].map((mins) => (
                        <button
                          key={mins}
                          onClick={() => handleSelectSleepTimer(mins)}
                          className={`w-full text-left px-4 py-1.5 text-xs transition-colors rounded-lg mx-auto ${
                            sleepTimer === mins
                              ? "text-emerald-300 font-semibold bg-emerald-500/20"
                              : "text-zinc-300 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          {mins} minutes
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* CC Toggle Switch Button (Bouton Bascule Sous-titres) */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={captionsOn}
                  onClick={toggleCaptions}
                  className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-200 ${
                    captionsOn
                      ? "liquid-glass-emerald border-emerald-400/40 text-emerald-200 shadow-md shadow-emerald-950/30"
                      : "liquid-glass border-white/15 text-zinc-300 hover:text-white hover:bg-white/15 shadow-sm"
                  }`}
                  title={
                    captionsOn
                      ? "Sous-titres (CC) : Activés (Cliquer ou appuyer sur C pour désactiver)"
                      : "Sous-titres (CC) : Désactivés (Cliquer ou appuyer sur C pour activer)"
                  }
                  aria-label="Activer ou désactiver les sous-titres (CC)"
                >
                  <Subtitles
                    size={15}
                    className={`transition-colors ${
                      captionsOn ? "text-emerald-300" : "text-zinc-400 group-hover:text-zinc-200"
                    }`}
                  />
                  <span className="font-bold tracking-tight text-[11px]">CC</span>
                  <div
                    className={`w-6 h-3.5 flex items-center rounded-full p-0.5 transition-colors duration-200 ${
                      captionsOn ? "bg-emerald-500 justify-end" : "bg-white/20 justify-start"
                    }`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
                  </div>
                </button>

                <button
                  onClick={handleToggleDownload}
                  className={`w-9 h-9 rounded-full liquid-glass hover:bg-white/15 border border-white/15 flex items-center justify-center transition-all shadow-sm ${
                    downloaded ? "text-emerald-300" : "text-zinc-300 hover:text-white"
                  }`}
                  title={downloaded ? "Téléchargé hors-ligne" : "Télécharger pour regarder hors-ligne"}
                >
                  {downloaded ? <CheckCircle size={17} /> : <DownloadCloud size={17} />}
                </button>

                <button
                  onClick={handleExportVideoFile}
                  className="w-9 h-9 rounded-full liquid-glass hover:bg-white/15 border border-white/15 flex items-center justify-center text-zinc-300 hover:text-amber-300 transition-all shadow-sm"
                  title="Exporter la vidéo ou le manifeste multimédia"
                >
                  <Share2 size={16} />
                </button>

                <button
                  onClick={handleMinimize}
                  className="w-9 h-9 rounded-full liquid-glass hover:bg-white/15 border border-white/15 flex items-center justify-center text-zinc-300 hover:text-emerald-300 transition-all shadow-sm"
                  title="Mode miniature (Image dans l'image)"
                >
                  <PictureInPicture2 size={17} />
                </button>

                <button
                  onClick={goFullscreen}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full liquid-glass hover:bg-white/15 border border-white/15 flex items-center justify-center text-zinc-300 hover:text-white transition-all shadow-sm hidden sm:flex"
                  title="Plein écran"
                >
                  <Maximize2 size={17} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Video Details & Meta Section (masquée en mode audio pour rester plein écran) */}
      {!isAudioMode && (
        <div className="flex-1 md:flex-none md:flex-shrink-0 bg-black/60 backdrop-blur-2xl border-t border-white/15 md:max-h-[40vh] overflow-y-auto">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 py-5">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
                  <span className="liquid-glass-emerald border border-emerald-400/30 text-emerald-200 text-xs font-bold px-2.5 py-0.5 rounded-full tracking-wider uppercase shadow-sm">
                    {item.channel}
                  </span>
                  <span className="liquid-glass border border-white/15 text-emerald-300 font-bold text-xs px-2.5 py-0.5 rounded-full shadow-sm">
                    {item.score}% Recommandé
                  </span>
                  <span className="liquid-glass border border-white/15 text-zinc-300 text-xs px-2.5 py-0.5 rounded-full shadow-sm">
                    {item.rating}
                  </span>
                  <span className="liquid-glass border border-white/15 text-zinc-400 text-xs px-2.5 py-0.5 rounded-full shadow-sm">{item.year}</span>
                </div>
                <h3 className="text-white font-bold text-xl leading-tight mb-2">
                  {item.title}
                </h3>

                {/* Reciter identity banner if Tarawih / Quran */}
                {reciter && (
                  <div className="mb-4 p-3.5 rounded-2xl liquid-glass-card border border-emerald-400/30 flex items-center gap-3.5 shadow-md">
                    <img
                      src={reciter.photoUrl}
                      alt={reciter.name}
                      className="w-13 h-13 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-emerald-400 shadow flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-bold text-sm sm:text-base">{reciter.name}</p>
                        <span className="text-[11px] text-emerald-300 font-semibold liquid-glass-emerald px-2 py-0.5 rounded-full border border-emerald-400/30">
                          {reciter.years}
                        </span>
                      </div>
                      <p className="text-xs text-emerald-400/90 font-serif mt-0.5" dir="rtl">
                        {reciter.arabicName}
                      </p>
                      <p className="text-xs text-zinc-300 mt-1 line-clamp-1">{reciter.title}</p>
                    </div>
                  </div>
                )}

                <p className="text-zinc-300 text-sm leading-relaxed mb-4">
                  {item.description}
                </p>

                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => toggle(item)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border shadow-sm ${
                      inList(item.id)
                        ? "liquid-glass-emerald border-emerald-400/40 text-emerald-200 shadow-md"
                        : "liquid-glass border-white/15 text-zinc-200 hover:text-white hover:bg-white/15"
                    }`}
                  >
                    <Plus size={14} />
                    {inList(item.id) ? "Dans ma liste" : "Ajouter à ma liste"}
                  </button>
                  <button
                    onClick={() => vote(userVote === true ? null : true)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border shadow-sm ${
                      userVote === true
                        ? "liquid-glass-emerald border-emerald-400/40 text-emerald-200 shadow-md"
                        : "liquid-glass border-white/15 text-zinc-200 hover:text-white hover:bg-white/15"
                    }`}
                  >
                    <ThumbsUp size={14} /> J'aime
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold liquid-glass border border-white/15 text-zinc-200 hover:text-white hover:bg-white/15 transition-all shadow-sm"
                  >
                    <Share2 size={14} /> Partager
                  </button>
                </div>

                {/* Rating Section */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-4 flex-wrap">
                  <RatingStars
                    averageRating={averageRating}
                    ratingCount={ratingCount}
                    userRating={userRating}
                    onRate={rate}
                  />
                </div>
              </div>

              {/* Up Next / Related Column */}
              {upNext && (
                <div className="lg:w-80 flex-shrink-0">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    À suivre
                  </p>
                  <div
                    onClick={() => handleChangeItem(upNext.id)}
                    className="group flex gap-3 p-2.5 rounded-2xl liquid-glass-card hover:bg-white/15 border border-white/15 transition-all cursor-pointer shadow-md"
                  >
                    <img
                      src={upNext.thumbnail}
                      alt={upNext.title}
                      className="w-28 h-16 rounded-xl object-cover flex-shrink-0 group-hover:opacity-90"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-xs font-semibold line-clamp-2 group-hover:text-emerald-300 transition-colors">
                        {upNext.title}
                      </p>
                      <p className="text-zinc-400 text-[10px] mt-1">
                        {upNext.channel} · {upNext.year}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}