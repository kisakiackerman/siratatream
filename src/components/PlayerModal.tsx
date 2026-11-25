import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
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
  CheckCircle,
  Music,
  Tv,
  RotateCcw,
  RotateCw,
  PictureInPicture2,
  Clock,
  Settings,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Film,
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
  Globe,
  Moon,
  Lock,
  Unlock,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { motion } from "motion/react";
import { ContentItem, catalog, getSeriesEpisodes } from "@/data/catalog";
import Card3D from "@/components/3d/Card3D";
import VideoNotesSection from "@/components/VideoNotesSection";
import { loadYouTubeAPI } from "@/lib/youtube";
import { sanitizeEmbedUrl, sanitizeHttpUrl } from "@/lib/safeUrl";
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
import { getLocalVideoUrl } from "@/lib/videoStorage";
import { getReciterForItem } from "@/lib/reciterData";
import { getSavedWatchProgress, saveWatchProgress } from "@/lib/watchHistory";
import SleepTimerMenu, { SLEEP_TIMER_PRESETS } from "@/components/SleepTimerMenu";
import {
  detectNetworkSpeed,
  selectAdaptiveQuality,
  subscribeToNetworkQualityChanges,
} from "@/lib/adaptiveConnectionQuality";

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
  const [captionsOn, setCaptionsOn] = useState(true);
  const [captionToast, setCaptionToast] = useState<{ message: string; active: boolean } | null>(null);
  const [resumeToast, setResumeToast] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(() => getStoredPlaybackSpeed());
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [directStreamUrl, setDirectStreamUrl] = useState<string | null>(null);
  const [useIframeFallback, setUseIframeFallback] = useState(false);
  const [isAudioMode, setIsAudioMode] = useState(Boolean(initialAudioMode));
  const [hasPlaybackError, setHasPlaybackError] = useState(false);
  const [playbackError, setPlaybackError] = useState<PlaybackErrorInfo | null>(null);
  const [initRetryCount, setInitRetryCount] = useState(0);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);

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

  // Sleep Timer
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [sleepTimeRemaining, setSleepTimeRemaining] = useState<number | null>(null);
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [showNowPlayingSleepMenu, setShowNowPlayingSleepMenu] = useState(false);
  const sleepTimerValRef = useRef<number | null>(sleepTimer);
  useEffect(() => {
    sleepTimerValRef.current = sleepTimer;
  }, [sleepTimer]);

  // Screen Lock (verrouillage transparent pour voir nettement la vidéo)
  const [screenLocked, setScreenLocked] = useState(false);
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);
  const screenLockedRef = useRef(false);
  const unlockPromptTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    screenLockedRef.current = screenLocked;
  }, [screenLocked]);

  useEffect(() => {
    return () => {
      clearTimeout(unlockPromptTimer.current);
    };
  }, []);

  const revealUnlockPrompt = useCallback(() => {
    setShowUnlockPrompt(true);
    clearTimeout(unlockPromptTimer.current);
    unlockPromptTimer.current = setTimeout(() => {
      setShowUnlockPrompt(false);
    }, 3500);
  }, []);

  // Réglage de l'opacité des textes (Titre, chaîne et infos) — réduit à 65% par défaut pour discrétion
  const [textOpacity, setTextOpacity] = useState<number>(() => {
    if (typeof window === "undefined") return 0.65;
    const saved = localStorage.getItem("sirat_player_text_opacity");
    return saved !== null ? parseFloat(saved) : 0.65;
  });

  const handleSetTextOpacity = useCallback((opacity: number) => {
    setTextOpacity(opacity);
    try {
      localStorage.setItem("sirat_player_text_opacity", opacity.toString());
    } catch {
      // ignore
    }
  }, []);

  // Solution Gratuite Anti-Titre YouTube : Rognage optique pour masquer la barre de titre native YouTube
  const [cinemaCleanMode, setCinemaCleanMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("sirat_cinema_clean_mode");
    return saved !== null ? saved === "true" : true;
  });

  const toggleCinemaCleanMode = useCallback(() => {
    setCinemaCleanMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sirat_cinema_clean_mode", next.toString());
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Mobile Clean Layout Options Sheet
  const [showMobileOptions, setShowMobileOptions] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLandscapeFullscreen, setIsLandscapeFullscreen] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      ("maxTouchPoints" in navigator && navigator.maxTouchPoints > 0 && window.innerWidth < 1024) ||
      window.innerWidth < 768
    );
  });
  const [isWindowPortrait, setIsWindowPortrait] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerHeight > window.innerWidth;
  });
  const [viewportDims, setViewportDims] = useState(() => {
    if (typeof window === "undefined") return { w: 0, h: 0 };
    return { w: window.innerWidth, h: window.innerHeight };
  });

  // Contrôleur et barre de progression du lecteur de l'application
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [hoverTimeSec, setHoverTimeSec] = useState<number | null>(null);
  const [hoverPercent, setHoverPercent] = useState<number>(0);
  const [clickFeedback, setClickFeedback] = useState<"play" | "pause" | null>(null);

  // Mode de recadrage intelligent de la vidéo (Ajusté sans bandes / Zoom cinéma / Standard 16:9)
  const [videoFitMode, setVideoFitMode] = useState<"cover" | "contain" | "zoom">(() => {
    if (typeof window === "undefined") return "cover";
    try {
      const saved = localStorage.getItem("sirat_video_fit_mode");
      return (saved as "cover" | "contain" | "zoom") || "cover";
    } catch {
      return "cover";
    }
  });

  const cycleVideoFitMode = useCallback(() => {
    setVideoFitMode((prev) => {
      const modes: ("cover" | "contain" | "zoom")[] = ["cover", "zoom", "contain"];
      const curIdx = modes.indexOf(prev);
      const next = modes[(curIdx + 1) % modes.length];
      try {
        localStorage.setItem("sirat_video_fit_mode", next);
      } catch {}

      const labels = {
        cover: "Plein écran (Rempli sans bandes)",
        zoom: "Zoom Cinéma (Immersion)",
        contain: "Standard 16:9 (Image complète)",
      };
      showCaptionNotification(`Format vidéo : ${labels[next]}`, true);
      return next;
    });
  }, []);

  // Plein écran effectif (natif ou mode paysage forcé pour smartphones)
  const effectiveFullscreen = isFullscreen || isLandscapeFullscreen;

  // Détection dynamique de l'appareil mobile, des dimensions et de l'orientation portrait/paysage
  useEffect(() => {
    const updateDims = () => {
      if (typeof window !== "undefined") {
        setViewportDims({ w: window.innerWidth, h: window.innerHeight });
        const isMobile =
          /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
          ("maxTouchPoints" in navigator && navigator.maxTouchPoints > 0 && window.innerWidth < 1024) ||
          window.innerWidth < 768;
        setIsMobileDevice(isMobile);
        setIsWindowPortrait(window.innerHeight > window.innerWidth);
      }
    };
    updateDims();
    window.addEventListener("resize", updateDims);
    window.addEventListener("orientationchange", updateDims);
    return () => {
      window.removeEventListener("resize", updateDims);
      window.removeEventListener("orientationchange", updateDims);
    };
  }, []);

  // Forçage de la rotation 90 degrés si l'utilisateur est sur smartphone en mode portrait et active le plein écran
  const forceRotate90 = effectiveFullscreen && isMobileDevice && isWindowPortrait;

  const rotatedStyle: React.CSSProperties | undefined = forceRotate90
    ? {
        position: "fixed",
        top: "50%",
        left: "50%",
        width: viewportDims.h > 0 ? `${viewportDims.h}px` : "100vh",
        height: viewportDims.w > 0 ? `${viewportDims.w}px` : "100vw",
        transform: "translate(-50%, -50%) rotate(90deg)",
        transformOrigin: "center center",
        zIndex: 99999,
        maxWidth: "none",
        maxHeight: "none",
      }
    : undefined;

  // Verrouillage de l'orientation de l'écran en paysage pour les smartphones
  const lockLandscapeOrientation = useCallback(async () => {
    try {
      const isMobile =
        /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        ("maxTouchPoints" in navigator && navigator.maxTouchPoints > 0 && window.innerWidth < 1024) ||
        window.innerWidth < 768;

      if (!isMobile) return;

      const orientation = screen.orientation || (screen as any).mozOrientation || (screen as any).msOrientation;
      if (orientation && typeof orientation.lock === "function") {
        await orientation.lock("landscape").catch(() => {
          return orientation.lock("landscape-primary").catch(() => {});
        });
      } else if (typeof (screen as any).lockOrientation === "function") {
        (screen as any).lockOrientation("landscape");
      } else if (typeof (screen as any).mozLockOrientation === "function") {
        (screen as any).mozLockOrientation("landscape");
      } else if (typeof (screen as any).msLockOrientation === "function") {
        (screen as any).msLockOrientation("landscape");
      }
    } catch {
      // Non bloquant si les permissions ou l'environnement restreignent le verrouillage
    }
  }, []);

  const unlockScreenOrientation = useCallback(() => {
    try {
      const orientation = screen.orientation || (screen as any).mozOrientation || (screen as any).msOrientation;
      if (orientation && typeof orientation.unlock === "function") {
        orientation.unlock();
      } else if (typeof (screen as any).unlockOrientation === "function") {
        (screen as any).unlockOrientation();
      } else if (typeof (screen as any).mozUnlockOrientation === "function") {
        (screen as any).mozUnlockOrientation();
      } else if (typeof (screen as any).msUnlockOrientation === "function") {
        (screen as any).msUnlockOrientation();
      }
    } catch {
      // Ignored
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      const isFs = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isFs);
      if (isFs) {
        setIsLandscapeFullscreen(true);
        lockLandscapeOrientation();
      } else {
        setIsLandscapeFullscreen(false);
        unlockScreenOrientation();
      }
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    document.addEventListener("mozfullscreenchange", handleFsChange);
    document.addEventListener("MSFullscreenChange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
      document.removeEventListener("mozfullscreenchange", handleFsChange);
      document.removeEventListener("MSFullscreenChange", handleFsChange);
      unlockScreenOrientation();
    };
  }, [lockLandscapeOrientation, unlockScreenOrientation]);

  const { activeProfile } = useViewerProfile();
  const { inList, toggle } = useMyList();
  const { likes, userVote, vote, rate, averageRating, ratingCount, userRating, logView } = useContentStats(item.id);

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
  const scrollRootRef = useRef<HTMLDivElement>(null);
  const detailsSectionRef = useRef<HTMLDivElement>(null);
  const playerDivRef = useRef<HTMLDivElement>(null);
  const controlsTimer = useRef<any>(null);
  const playingRef = useRef<boolean>(playing);
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

  const isTarawih = item.channel === "Récitations Haramain" || item.categories.includes("Coran");
  const reciter = isTarawih ? getReciterForItem(item.title, item.description, item.channel) : null;

  // Pistes de doublage disponibles pour cette vidéo (flux direct uniquement)
  const availableAudioTracks = useMemo(() => item.audioTracks || [], [item.audioTracks]);
  const hasDubbing = Boolean(directStreamUrl) && availableAudioTracks.length > 0;

  // --- Lecture Automatique Continue ---
  const [continuousAutoplay, setContinuousAutoplay] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem("siratstream_continuous_autoplay");
      if (v !== null) return v !== "false";
      return localStorage.getItem("nexstream_auto_next") !== "false";
    } catch {
      return true;
    }
  });
  const continuousAutoplayRef = useRef(continuousAutoplay);
  useEffect(() => {
    continuousAutoplayRef.current = continuousAutoplay;
  }, [continuousAutoplay]);

  // Synchronisation dynamique avec les modifications de paramètres
  useEffect(() => {
    const handleAutoplayChange = () => {
      try {
        const v = localStorage.getItem("siratstream_continuous_autoplay");
        if (v !== null) setContinuousAutoplay(v !== "false");
        else setContinuousAutoplay(localStorage.getItem("nexstream_auto_next") !== "false");
      } catch {
        // ignore
      }
    };
    window.addEventListener("continuous_autoplay_changed", handleAutoplayChange);
    window.addEventListener("storage", handleAutoplayChange);
    return () => {
      window.removeEventListener("continuous_autoplay_changed", handleAutoplayChange);
      window.removeEventListener("storage", handleAutoplayChange);
    };
  }, []);

  // Détermination intelligente de l'épisode ou de la vidéo suivante :
  // Priorité 1 : Épisode suivant de la même série
  // Priorité 2 : Vidéo suivante de la même catégorie
  const upNext = useMemo((): ContentItem | null => {
    const isPlayableCandidate = (c: ContentItem) =>
      c.id !== item.id && (!c.youtubeId || !isKnownUnplayableVideo(c.youtubeId));

    // 1. Si la vidéo actuelle fait partie d'une SÉRIE : enchaîner sur l'épisode suivant de la même série
    if (item.seriesId) {
      const seriesEps = getSeriesEpisodes(item.seriesId).filter(isPlayableCandidate);
      if (seriesEps.length > 0) {
        const curEpNum = item.episodeNumber ?? 0;
        // Trouver l'épisode avec le numéro strictement supérieur le plus proche
        const nextInSeries = seriesEps.find((ep) => (ep.episodeNumber ?? 0) > curEpNum);
        if (nextInSeries) return nextInSeries;
        return seriesEps[0];
      }
    }

    // 2. Si pas de série (ou fin de série) : enchaîner sur la MÊME CATÉGORIE
    const primaryCat = item.categories[0];
    if (primaryCat) {
      // Priorité 2a : Vidéos de la même chaîne dans la même catégorie
      const sameChannelSameCat = catalog.filter(
        (c) => isPlayableCandidate(c) && c.channel === item.channel && c.categories.includes(primaryCat)
      );
      if (sameChannelSameCat.length > 0) return sameChannelSameCat[0];

      // Priorité 2b : Toute vidéo de la même catégorie
      const sameCat = catalog.filter(
        (c) => isPlayableCandidate(c) && c.categories.includes(primaryCat)
      );
      if (sameCat.length > 0) return sameCat[0];
    }

    // 3. Repli : Vidéos associées
    const fallback = catalog.find(
      (c) =>
        isPlayableCandidate(c) &&
        (c.channel === item.channel || c.categories.some((g) => item.categories.includes(g)))
    );
    return fallback || null;
  }, [item.id, item.seriesId, item.episodeNumber, item.channel, item.categories]);

  // Liste des vidéos associées pour la file d'attente et recommandations
  const related = useMemo(() => {
    const isPlayableCandidate = (c: ContentItem) =>
      c.id !== item.id && (!c.youtubeId || !isKnownUnplayableVideo(c.youtubeId));

    const list: ContentItem[] = [];
    if (upNext) list.push(upNext);

    if (item.seriesId) {
      const seriesEps = getSeriesEpisodes(item.seriesId);
      for (const ep of seriesEps) {
        if (isPlayableCandidate(ep) && !list.some((x) => x.id === ep.id)) {
          list.push(ep);
        }
      }
    }

    const primaryCat = item.categories[0];
    if (primaryCat) {
      const sameCat = catalog.filter(
        (c) => isPlayableCandidate(c) && c.categories.includes(primaryCat) && !list.some((x) => x.id === c.id)
      );
      list.push(...sameCat.slice(0, 8));
    }

    const sameChannel = catalog.filter(
      (c) => isPlayableCandidate(c) && c.channel === item.channel && !list.some((x) => x.id === c.id)
    );
    list.push(...sameChannel.slice(0, 6));

    return list.slice(0, 10);
  }, [item.id, item.seriesId, item.channel, item.categories, upNext]);

  const seriesEpisodes = useMemo(() => {
    return item.seriesId ? getSeriesEpisodes(item.seriesId) : [];
  }, [item.seriesId]);

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

  // Direct close handler: saves progress and exits player immediately
  const handleClose = useCallback(() => {
    saveCurrentProgress();
    setIsLandscapeFullscreen(false);
    unlockScreenOrientation();
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } catch {
      // ignore
    }
    onClose();
  }, [saveCurrentProgress, onClose, unlockScreenOrientation]);

  // Safe item switch that immediately persists exact second and scrolls smoothly to top
  const handleChangeItem = useCallback(
    (newId: string) => {
      saveCurrentProgress();
      scrollRootRef.current?.scrollTo({ top: 0, behavior: "smooth" });
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

  // Reset state and scroll back to full-screen video on new item
  useEffect(() => {
    scrollRootRef.current?.scrollTo({ top: 0 });
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

  // Detect if item uses an external iframe embed URL (e.g. cinefuse.icu/embed/..., vimeo, dailymotion, or <iframe src="...">)
  const customEmbedUrl = useMemo(() => {
    const raw = (item.videoUrl || "").trim();
    if (!raw) return null;
    const safeEmbed = sanitizeEmbedUrl(raw);
    if (!safeEmbed) return null;
    if (
      item.videoSourceType === "embed" ||
      item.videoSourceType === "vimeo" ||
      item.videoSourceType === "dailymotion" ||
      safeEmbed.includes("/embed") ||
      safeEmbed.includes("abumuslim.fr") ||
      safeEmbed.includes("cinefuse.") ||
      safeEmbed.includes("player.vimeo.com") ||
      safeEmbed.includes("dailymotion.com/embed")
    ) {
      return safeEmbed;
    }
    return null;
  }, [item.videoUrl, item.videoSourceType]);

  // Attempt to fetch direct stream from custom videoUrl or YouTube edge function
  useEffect(() => {
    let active = true;
    if (customEmbedUrl) {
      setDirectStreamUrl(null);
      setBuffering(false);
      return;
    }
    const safeDirect = sanitizeHttpUrl(item.videoUrl, { allowBlob: true });
    if (
      safeDirect &&
      (item.videoSourceType === "direct" ||
        safeDirect.endsWith(".mp4") ||
        safeDirect.endsWith(".webm") ||
        safeDirect.endsWith(".m3u8") ||
        safeDirect.startsWith("blob:") ||
        (safeDirect.startsWith("http") && !safeDirect.includes("youtu") && !customEmbedUrl))
    ) {
      setDirectStreamUrl(safeDirect);
      return;
    }

    // Check stored IndexedDB video blob for self-hosted files
    getLocalVideoUrl(item.id)
      .then((storedUrl) => {
        if (active && storedUrl) {
          setDirectStreamUrl(storedUrl);
          return;
        }
      })
      .catch(() => {});

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
  }, [item.id, item.youtubeId, item.videoUrl, item.videoSourceType]);

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

  // Forçage automatique de la résolution maximale disponible (8K 4320p / highres / 4K 2160p / 2K / 1080p)
  const applyForcedHDQuality = useCallback((player: any) => {
    if (!player) return;
    try {
      const levels: string[] = player.getAvailableQualityLevels?.() || [];
      let chosen = "highres";
      if (levels.length > 0) {
        if (levels.includes("hd4320")) {
          chosen = "hd4320";
        } else if (levels.includes("highres")) {
          chosen = "highres";
        } else if (levels.includes("hd2160")) {
          chosen = "hd2160";
        } else if (levels.includes("hd1440")) {
          chosen = "hd1440";
        } else if (levels.includes("hd1080")) {
          chosen = "hd1080";
        } else {
          chosen = levels[0];
        }
      }

      player.setPlaybackQuality?.(chosen);
      player.setSuggestedQuality?.(chosen);
      player.setPlaybackQualityRange?.(chosen, "highres");

      const iframe = player.getIframe?.() || containerRef.current?.querySelector("iframe");
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "setPlaybackQuality", args: [chosen] }),
          "*"
        );
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "setPlaybackQualityRange", args: [chosen, "highres"] }),
          "*"
        );
      }
    } catch (err) {
      console.warn("Quality forcing error:", err);
    }
  }, []);

  // Surveillance en temps réel pour maintenir systématiquement le Full HD sans interruption
  useEffect(() => {
    const unsubscribe = subscribeToNetworkQualityChanges(() => {
      if (playerRef.current) {
        applyForcedHDQuality(playerRef.current);
      }
    });
    return unsubscribe;
  }, [applyForcedHDQuality]);

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

  // --- Gestion de la Lecture Automatique Continue ---
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);
  const [nextItemToPlay, setNextItemToPlay] = useState<ContentItem | null>(null);
  const autoNextTimerRef = useRef<any>(null);

  const cancelAutoNext = useCallback(() => {
    if (autoNextTimerRef.current) {
      clearInterval(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
    setAutoNextCountdown(null);
    setNextItemToPlay(null);
  }, []);

  // Annuler le compte à rebours si la vidéo change
  useEffect(() => {
    cancelAutoNext();
  }, [item.id, cancelAutoNext]);

  // Déclencheur intelligent d'enchaînement automatique (même série ou même catégorie)
  const triggerContinuousAutoplay = useCallback(() => {
    // Si minuteur de sommeil actif à fin de vidéo
    if (sleepTimerValRef.current === -1) {
      setPlaying(false);
      setSleepTimer(null);
      setSleepTimeRemaining(null);
      showCaptionNotification("Minuteur de sommeil : fin de la vidéo atteinte, lecture arrêtée.", false);
      return;
    }

    // Si mode répétition actif
    if (repeatOnRef.current) {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      } else {
        try {
          playerRef.current?.seekTo?.(0, true);
          playerRef.current?.playVideo?.();
        } catch {
          // ignore
        }
      }
      return;
    }

    // Vérifier si la lecture automatique continue est activée dans les paramètres
    if (!continuousAutoplayRef.current) {
      setPlaying(false);
      return;
    }

    const nextId = getNextTrackIdRef.current();
    if (!nextId) {
      setPlaying(false);
      return;
    }

    const nextObj = catalog.find((c) => c.id === nextId) || null;
    if (!nextObj) {
      handleNextTrackRef.current();
      return;
    }

    setNextItemToPlay(nextObj);
    setAutoNextCountdown(4);

    if (autoNextTimerRef.current) clearInterval(autoNextTimerRef.current);

    let count = 4;
    autoNextTimerRef.current = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(autoNextTimerRef.current);
        autoNextTimerRef.current = null;
        setAutoNextCountdown(null);
        setNextItemToPlay(null);
        handleChangeItem(nextId);
      } else {
        setAutoNextCountdown(count);
      }
    }, 1000);
  }, [handleChangeItem, showCaptionNotification]);

  const triggerContinuousAutoplayRef = useRef(triggerContinuousAutoplay);
  useEffect(() => {
    triggerContinuousAutoplayRef.current = triggerContinuousAutoplay;
  }, [triggerContinuousAutoplay]);

  const toggleContinuousAutoplay = useCallback(() => {
    const nextVal = !continuousAutoplay;
    setContinuousAutoplay(nextVal);
    try {
      localStorage.setItem("siratstream_continuous_autoplay", String(nextVal));
      localStorage.setItem("nexstream_auto_next", String(nextVal));
      window.dispatchEvent(new Event("continuous_autoplay_changed"));
    } catch {
      // ignore
    }
    showCaptionNotification(
      nextVal
        ? "Lecture continue activée : les épisodes s'enchaîneront sans intervention."
        : "Lecture continue désactivée.",
      nextVal
    );
  }, [continuousAutoplay, showCaptionNotification]);

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

    // If direct video stream or custom external embed is playing or fallback is active, skip YT API player
    if (directStreamUrl || customEmbedUrl) {
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
            cc_load_policy: captionsOnRef.current ? 1 : 0,
            cc_lang_pref: "fr",
            vq: "highres",
            hd: 1,
            loop: 1,
            playlist: item.youtubeId,
            origin: typeof window !== "undefined" ? window.location.origin : undefined,
          };

          playerRef.current = new (window as any).YT.Player(playerDivRef.current, {
            width: "100%",
            height: "100%",
            videoId: item.youtubeId,
            playerVars: playerVarsConfig,
            events: {
              onReady: (e: any) => {
                if (cancelled) return;
                try {
                  const iframeEl = e.target?.getIframe?.();
                  if (iframeEl) {
                    iframeEl.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
                  }
                  e.target.setVolume(volume);
                  if (muted) e.target.mute();
                  if (resumeTime > 0) {
                    e.target.seekTo(resumeTime, true);
                  }
                  // Force Full HD 1080p+ immédiatement
                  applyForcedHDQuality(e.target);
                  // Vitesse de lecture par défaut (réglage utilisateur)
                  e.target.setPlaybackRate?.(playbackRateRef.current);
                  // Synchronise l'état des sous-titres (activés à l'ouverture jusqu'à désactivation manuelle)
                  applyCaptionsToTargetRef.current(captionsOnRef.current);
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

                // Codes 100 (deleted/private), 101/150 (embed restricted), 2 (invalid ID), 153 (embed configuration blocked)
                if (errCode === 101 || errCode === 150 || errCode === 100 || errCode === 2 || errCode === 153) {
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

                // Lock Full HD 1080p+ on play / buffer
                if (state === "playing" || state === "buffering") {
                  applyForcedHDQuality(playerRef.current || e.target);
                }

                if (state === "paused") {
                  saveCurrentProgressRef.current();
                }

                if (state === "ended") {
                  saveCurrentProgressRef.current();
                  triggerContinuousAutoplayRef.current();
                }
              },
              onPlaybackQualityChange: (e: any) => {
                if (cancelled) return;
                try {
                  const target = playerRef.current || e.target;
                  const levels: string[] = target?.getAvailableQualityLevels?.() || [];
                  const topTier =
                    levels.find((l) => ["hd4320", "highres", "hd2160", "hd1440", "hd1080"].includes(l)) ||
                    levels[0];
                  if (topTier && e?.data && e.data !== topTier) {
                    applyForcedHDQuality(target);
                  }
                } catch {
                  // ignore
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

  // Listen to postMessage errors when fallback iframe is active so blocked videos are auto-removed instead of showing "Watch on YouTube"
  useEffect(() => {
    if (!useIframeFallback) return;
    const handleIframeMessage = (event: MessageEvent) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.event === "onError") {
          const errCode = Number(data.info);
          if (errCode === 101 || errCode === 150 || errCode === 100 || errCode === 2 || errCode === 153) {
            markVideoAsUnplayable(item.youtubeId, { errorCode: errCode });
            setPlaybackError(getYouTubeErrorDetails(errCode));
            setBuffering(false);
            setPlaying(false);
          }
        }
      } catch {
        // Ignore non-JSON postMessage
      }
    };
    window.addEventListener("message", handleIframeMessage);
    return () => window.removeEventListener("message", handleIframeMessage);
  }, [useIframeFallback, item.youtubeId]);

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

  // Save on page exit / window unload & warn if playing to prevent accidental exit
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      saveCurrentProgress();
      if (playing) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [saveCurrentProgress, playing]);

  // Keyboard navigation
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
        return;
      }
      if (screenLockedRef.current) {
        if ([" ", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "c", "C", "f", "F", "m", "M", "z", "Z"].includes(e.key)) {
          e.preventDefault();
          revealUnlockPrompt();
        }
        return;
      }
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
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      }
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
      }
      if (e.key === "z" || e.key === "Z") {
        e.preventDefault();
        cycleVideoFitMode();
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setVolume((v) => {
          const next = Math.min(100, v + 5);
          handleVolume(next);
          return next;
        });
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setVolume((v) => {
          const next = Math.max(0, v - 5);
          handleVolume(next);
          return next;
        });
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  const resetControlsTimer = useCallback((customDuration?: number | React.SyntheticEvent) => {
    if (screenLockedRef.current) return;
    clearTimeout(controlsTimer.current);
    setShowControls(true);
    // Les bandes et commandes restent affichées pendant 5 secondes avant de s'estomper
    const duration = typeof customDuration === "number" ? customDuration : 5000;
    controlsTimer.current = setTimeout(() => {
      if (playingRef.current) setShowControls(false);
    }, duration);
  }, []);

  // Gestion tactile intelligente :
  // Les commandes et bandes restent visibles tant que le doigt est sur l'écran,
  // puis restent affichées pendant 5 secondes complètes après relâchement.
  const handleTouchStart = useCallback(() => {
    if (screenLockedRef.current) return;
    clearTimeout(controlsTimer.current);
    setShowControls(true);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (screenLockedRef.current) return;
    clearTimeout(controlsTimer.current);
    setShowControls(true);
    controlsTimer.current = setTimeout(() => {
      if (playingRef.current) setShowControls(false);
    }, 5000); // 5 secondes après avoir cessé de toucher l'écran
  }, []);

  const activateScreenLock = useCallback(() => {
    clearTimeout(unlockPromptTimer.current);
    clearTimeout(controlsTimer.current);
    setShowControls(false);
    setScreenLocked(true);
    setShowUnlockPrompt(false);
    scrollRootRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    showCaptionNotification("Écran verrouillé — Touchez l'écran pour déverrouiller", true);
  }, []);

  const deactivateScreenLock = useCallback(() => {
    clearTimeout(unlockPromptTimer.current);
    setShowUnlockPrompt(false);
    setScreenLocked(false);
    resetControlsTimer(5000);
    showCaptionNotification("Écran déverrouillé", false);
  }, [resetControlsTimer]);

  useEffect(() => {
    // Au démarrage ou dès que la lecture commence, afficher la bande et les contrôleurs pendant 5 secondes
    if (playing) {
      resetControlsTimer(5000);
    } else {
      clearTimeout(controlsTimer.current);
      setShowControls(true);
    }
    return () => clearTimeout(controlsTimer.current);
  }, [playing, item.id, resetControlsTimer]);

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
    if (seconds <= 0) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}h${m < 10 ? "0" : ""}${m}m`;
    }
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleSelectSleepTimer = (minutes: number | null) => {
    if (minutes === -1) {
      setSleepTimer(-1);
      const curTime = currentTimeSec || lastTimeRef.current || (videoRef.current ? videoRef.current.currentTime : 0);
      const totalDur = duration || lastDurationRef.current || (videoRef.current ? videoRef.current.duration : 0);
      const rem = Math.max(1, Math.round((totalDur || 0) - (curTime || 0)));
      setSleepTimeRemaining(rem > 1 ? rem : 60);
      setShowSleepMenu(false);
      setShowNowPlayingSleepMenu(false);
      showCaptionNotification("Minuteur de sommeil : arrêt à la fin de la vidéo", true);
      return;
    }

    setSleepTimer(minutes);
    setSleepTimeRemaining(minutes ? minutes * 60 : null);
    setShowSleepMenu(false);
    setShowNowPlayingSleepMenu(false);
    if (minutes) {
      showCaptionNotification(`Minuteur de sommeil : arrêt dans ${minutes} min`, true);
    } else {
      showCaptionNotification(`Minuteur de sommeil désactivé`, false);
    }
  };

  const handleExtendSleepTimer = (extraMinutes: number) => {
    const extraSeconds = extraMinutes * 60;
    setSleepTimeRemaining((prev) => (prev !== null ? prev + extraSeconds : extraSeconds));
    if (sleepTimer !== null && sleepTimer !== -1) {
      setSleepTimer((prev) => (prev !== null ? prev + extraMinutes : extraMinutes));
    } else if (sleepTimer === null) {
      setSleepTimer(extraMinutes);
    }
    showCaptionNotification(`+${extraMinutes} min ajoutées au minuteur`, true);
  };

  useEffect(() => {
    if (sleepTimer === null) {
      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
      setSleepTimeRemaining(null);
      return;
    }

    sleepTimerRef.current = setInterval(() => {
      if (sleepTimerValRef.current === -1) {
        const cur = videoRef.current?.currentTime || lastTimeRef.current || 0;
        const dur = videoRef.current?.duration || lastDurationRef.current || 0;
        if (dur > 0) {
          const rem = Math.max(0, Math.round(dur - cur));
          setSleepTimeRemaining(rem);
        }
        return;
      }

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
          postIframeCommand("pauseVideo");
          setPlaying(false);
          setSleepTimer(null);
          showCaptionNotification("Minuteur de sommeil : lecture arrêtée automatiquement", false);
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
    };
  }, [sleepTimer, postIframeCommand]);

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

  const handleSeekFromEvent = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const pct = (clickX / rect.width) * 100;
    seekToPct(pct);
  };

  const handleMouseMoveProgressBar = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const pct = (clickX / rect.width) * 100;
    setHoverPercent(pct);
    setHoverTimeSec((pct / 100) * duration);
  };

  const handleMouseLeaveProgressBar = () => {
    setHoverTimeSec(null);
  };

  const cyclePlaybackRate = () => {
    const rates = [0.75, 1, 1.25, 1.5, 2];
    const curIdx = rates.indexOf(playbackRate);
    const nextRate = rates[(curIdx + 1) % rates.length];
    changePlaybackRate(nextRate);
  };

  const handleSurfaceClick = () => {
    // Si les commandes étaient masquées, les révéler pendant 5 secondes
    if (!showControls) {
      resetControlsTimer(5000);
      return;
    }
    resetControlsTimer(5000);
    setClickFeedback(playing ? "pause" : "play");
    setTimeout(() => setClickFeedback(null), 500);
    togglePlay();
  };

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

  async function toggleFullscreen() {
    const isCurrentlyFs = isFullscreen || isLandscapeFullscreen;

    if (!isCurrentlyFs) {
      // 1. Activer immédiatement l'état plein écran paysage pour garantir l'exécution visuelle
      setIsLandscapeFullscreen(true);

      // 2. Tenter le verrouillage d'orientation paysage sans bloquer l'exécution
      lockLandscapeOrientation().catch(() => {});

      // 3. Tenter le plein écran natif de manière sécurisée (non-bloquante)
      try {
        const el = containerRef.current || document.documentElement;
        const requestFs =
          el.requestFullscreen ||
          (el as any).webkitRequestFullscreen ||
          (el as any).mozRequestFullScreen ||
          (el as any).msRequestFullscreen;

        if (requestFs) {
          await requestFs.call(el).catch(() => {});
        } else if (videoRef.current && (videoRef.current as any).webkitEnterFullscreen) {
          try {
            (videoRef.current as any).webkitEnterFullscreen();
          } catch {
            // ignore
          }
        }
        if (playerRef.current) {
          setTimeout(() => {
            applyForcedHDQuality(playerRef.current);
          }, 350);
        }
      } catch {
        // Ignoré si restreint par les permissions ou la sandbox iframe
      }
    } else {
      // Quitter le plein écran paysage
      setIsLandscapeFullscreen(false);
      unlockScreenOrientation();

      try {
        if (
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
        ) {
          const exitFs =
            document.exitFullscreen ||
            (document as any).webkitExitFullscreen ||
            (document as any).mozCancelFullScreen ||
            (document as any).msExitFullscreen;
          if (exitFs) {
            await exitFs.call(document).catch(() => {});
          }
        }
      } catch {
        // Ignoré
      }
    }
  }

  function goFullscreen() {
    toggleFullscreen();
  }

  const handleExportVideoFile = () => {
    const safeExportUrl = sanitizeHttpUrl(item.videoUrl, { allowBlob: true });
    if (safeExportUrl && (safeExportUrl.endsWith(".mp4") || safeExportUrl.endsWith(".webm"))) {
      const a = document.createElement("a");
      a.href = safeExportUrl;
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

  const isCustomOrDirect = Boolean(customEmbedUrl || directStreamUrl);
  const videoCoverStyle: React.CSSProperties = (() => {
    if (isCustomOrDirect || videoFitMode === "contain") {
      return {
        width: "100%",
        height: "100%",
        flexShrink: 0,
        transform: !isCustomOrDirect && cinemaCleanMode ? "scale(1.02)" : "scale(1.001)",
        transformOrigin: "center center",
      };
    }

    const effW = forceRotate90 ? viewportDims.h : viewportDims.w;
    const effH = forceRotate90 ? viewportDims.w : viewportDims.h;
    const scaleFactor =
      videoFitMode === "zoom" ? 1.22 : cinemaCleanMode ? 1.04 : 1.01;

    if (effW <= 0 || effH <= 0) {
      return {
        width: "100%",
        height: "100%",
        flexShrink: 0,
        transform: `scale(${scaleFactor})`,
        transformOrigin: "center center",
      };
    }

    const videoRatio = 16 / 9;
    const containerRatio = effW / effH;
    const coverW = containerRatio < videoRatio ? Math.ceil(effH * videoRatio) : effW;
    const coverH = containerRatio < videoRatio ? effH : Math.ceil(effW / videoRatio);

    return {
      width: `${coverW}px`,
      height: `${coverH}px`,
      flexShrink: 0,
      transform: `scale(${scaleFactor})`,
      transformOrigin: "center center",
    };
  })();

  const modalContent = (
    <div
      ref={scrollRootRef}
      className={`fixed inset-0 z-[100] w-screen h-[100dvh] bg-black overflow-x-hidden font-sans player-cinema-modal scroll-smooth ${
        isAudioMode || effectiveFullscreen || screenLocked ? "overflow-hidden" : "overflow-y-auto"
      }`}
    >
      {/* Élément audio caché pour le doublage — ne rend rien visuellement */}
      <audio ref={dubAudioRef} className="hidden" preload="auto" />

      <div
        ref={containerRef}
        className={`relative overflow-hidden bg-black select-none w-full ${
          forceRotate90
            ? "fixed inset-0 z-50"
            : "h-[100dvh] min-h-[100dvh] flex-shrink-0 flex items-center justify-center"
        }`}
        style={rotatedStyle}
        onMouseMove={resetControlsTimer}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* Conteneur vidéo plein écran bord à bord */}
        <div
          className={`absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden ${
            customEmbedUrl ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <div
            className="flex items-center justify-center transition-transform duration-300 ease-out origin-center"
            style={videoCoverStyle}
          >
            {/* Direct MP4/WebM stream or Custom External Embed Iframe or YouTube player or Fallback iframe */}
            {customEmbedUrl ? (
              <div
                className={`w-full h-full bg-black flex items-center justify-center relative z-25 ${
                  isAudioMode ? "opacity-0 pointer-events-none invisible" : ""
                }`}
              >
                <iframe
                  key={customEmbedUrl}
                  src={customEmbedUrl}
                  title={item.title}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  allowFullScreen
                />
              </div>
            ) : directStreamUrl ? (
              <video
                ref={videoRef}
                src={directStreamUrl}
                autoPlay
                playsInline
                className={`w-full h-full ${
                  videoFitMode === "contain"
                    ? "object-contain"
                    : videoFitMode === "zoom"
                    ? "object-cover scale-125"
                    : "object-cover"
                } ${isAudioMode ? "opacity-0 pointer-events-none invisible" : ""}`}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    videoRef.current.playbackRate = playbackRateRef.current;
                  }
                  applyCaptionsToTarget(captionsOnRef.current);
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
                  triggerContinuousAutoplay();
                }}
              />
            ) : useIframeFallback ? (
              <div
                className={`w-full h-full bg-black flex items-center justify-center ${
                  isAudioMode ? "opacity-0 pointer-events-none invisible" : ""
                }`}
              >
                <iframe
                  ref={iframeRef}
                  key={item.youtubeId}
                  src={`https://www.youtube-nocookie.com/embed/${item.youtubeId}?autoplay=1&enablejsapi=1&playsinline=1&rel=0&iv_load_policy=3&modestbranding=1&controls=0&disablekb=1&fs=0&vq=highres&hd=1&cc_load_policy=${captionsOn ? 1 : 0}&cc_lang_pref=fr&loop=1&playlist=${item.youtubeId}&origin=${encodeURIComponent(
                    typeof window !== "undefined" ? window.location.origin : ""
                  )}${resumeTime > 0 ? `&start=${Math.floor(resumeTime)}` : ""}`}
                  title={item.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  onLoad={() => {
                    try {
                      iframeRef.current?.contentWindow?.postMessage(
                        JSON.stringify({ event: "listening" }),
                        "*"
                      );
                      iframeRef.current?.contentWindow?.postMessage(
                        JSON.stringify({ event: "command", func: "setPlaybackQuality", args: ["highres"] }),
                        "*"
                      );
                      iframeRef.current?.contentWindow?.postMessage(
                        JSON.stringify({ event: "command", func: "setPlaybackQualityRange", args: ["hd2160", "highres"] }),
                        "*"
                      );
                    } catch {
                      // ignore
                    }
                    setTimeout(() => applyCaptionsToTarget(captionsOnRef.current), 800);
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
                className={`w-full h-full ${
                  isAudioMode ? "opacity-0 pointer-events-none invisible" : ""
                }`}
              />
            )}
          </div>
        </div>

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
                {upNext && (
                  <button
                    onClick={() => handleChangeItem(upNext.id)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer"
                  >
                    <span>Épisode suivant</span>
                    <ChevronRight size={15} />
                  </button>
                )}

                {playbackError.canRetry && (
                  <button
                    onClick={handleRetry}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold transition-colors border border-zinc-700 cursor-pointer"
                  >
                    <RefreshCw size={13} />
                    <span>Réessayer</span>
                  </button>
                )}

                <button
                  onClick={handleClose}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold transition-colors border border-zinc-700 cursor-pointer"
                >
                  <X size={14} />
                  <span>Fermer</span>
                </button>
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

              {/* Zone Centrale : Pochette Studio Audio HD */}
              <div className="flex-1 flex flex-col items-center justify-center min-h-0 mb-4 relative">
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
                </div>
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

              {/* Rangée de raccourcis : file, doublage, qualité, vitesse, sous-titres Spotify */}
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

                  {/* Bouton Mode Sommeil (Audio) */}
                  <div className="relative">
                    <button
                      onClick={() => setShowNowPlayingSleepMenu((v) => !v)}
                      className={`h-9 px-3 rounded-full flex items-center justify-center transition-all relative gap-1.5 active:scale-95 ${
                        sleepTimer !== null
                          ? "text-emerald-300 bg-emerald-500/20 border border-emerald-400/50 shadow-md shadow-emerald-950/40 font-bold"
                          : "text-zinc-300 hover:bg-white/10 hover:text-white liquid-glass border border-white/15"
                      }`}
                      title="Minuteur de sommeil (Arrêt automatique)"
                    >
                      <Moon size={15} className={sleepTimer !== null ? "text-emerald-400 animate-pulse" : ""} />
                      {sleepTimer !== null && sleepTimeRemaining !== null ? (
                        <span className="text-[11px] font-bold text-emerald-300 font-mono">
                          {formatSleepTime(sleepTimeRemaining)}
                        </span>
                      ) : (
                        <span className="text-xs font-medium">Sommeil</span>
                      )}
                    </button>
                    {showNowPlayingSleepMenu && (
                      <SleepTimerMenu
                        sleepTimer={sleepTimer}
                        sleepTimeRemaining={sleepTimeRemaining}
                        onSelect={handleSelectSleepTimer}
                        onExtend={handleExtendSleepTimer}
                        onClose={() => setShowNowPlayingSleepMenu(false)}
                        formatSleepTime={formatSleepTime}
                        align="center"
                      />
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
              Vidéo non diffusable ici
            </h3>
            <p className="text-zinc-400 text-sm max-w-md mb-6">
              Cette vidéo n'autorise pas la lecture intégrée et a été retirée du catalogue.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {upNext && (
                <button
                  onClick={() => handleChangeItem(upNext.id)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span>Épisode suivant</span>
                  <ChevronRight size={16} />
                </button>
              )}
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 cursor-pointer"
              >
                <X size={16} /> Fermer
              </button>
            </div>
          </div>
        )}

        {/* Surface interactive plein écran pour clic lecture/pause et double-clic plein écran */}
        {!isAudioMode && !screenLocked && !customEmbedUrl && (
          <div
            className={`absolute inset-0 z-20 select-none ${
              showControls ? "cursor-pointer" : "cursor-none"
            }`}
            onClick={handleSurfaceClick}
            onDoubleClick={toggleFullscreen}
            onMouseMove={resetControlsTimer}
          />
        )}

        {/* Animation visuelle de feedback lecture/pause au centre de l'écran */}
        {clickFeedback && !screenLocked && (
          <div className="absolute inset-0 z-25 flex items-center justify-center pointer-events-none">
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-black/75 backdrop-blur-md border border-white/20 flex items-center justify-center text-emerald-400 shadow-2xl animate-out fade-out zoom-out-90 duration-500">
              {clickFeedback === "play" ? (
                <Play size={36} fill="currentColor" className="ml-1" />
              ) : (
                <Pause size={36} fill="currentColor" />
              )}
            </div>
          </div>
        )}

        {/* Screen Locked Overlay (Transparent pour voir nettement la vidéo, bloque tout appui accidentel) */}
        {screenLocked && (
          <div
            className="absolute inset-0 z-50 flex items-end justify-center pb-8 sm:pb-12 bg-transparent pointer-events-auto select-none cursor-pointer touch-none"
            onClick={(e) => {
              e.stopPropagation();
              revealUnlockPrompt();
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
            }}
            onTouchMove={(e) => {
              e.stopPropagation();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
            }}
            onWheel={(e) => {
              e.stopPropagation();
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                deactivateScreenLock();
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
              }}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-black/80 hover:bg-black/95 backdrop-blur-md border border-white/25 text-white text-xs sm:text-sm font-bold shadow-[0_8px_30px_rgba(0,0,0,0.8)] transition-all duration-200 active:scale-95 cursor-pointer ${
                showUnlockPrompt
                  ? "opacity-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 translate-y-3 pointer-events-none"
              }`}
              aria-hidden={!showUnlockPrompt}
              tabIndex={showUnlockPrompt ? 0 : -1}
            >
              <Lock size={15} className="text-zinc-300" />
              <span className="text-zinc-200">Écran verrouillé</span>
              <span className="text-white/30">•</span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Unlock size={15} />
                <span>Déverrouiller</span>
              </span>
            </button>
          </div>
        )}

        {/* Bande supérieure cinéma (fond noir profond occultant compact) */}
        {!isAudioMode && (
          <div
            className={`absolute top-0 left-0 right-0 h-16 sm:h-20 cinema-band-top pointer-events-none z-20 transition-opacity duration-300 ${
              showControls && !screenLocked ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

        {/* Bande inférieure cinéma (fond noir profond occultant compact) */}
        {!isAudioMode && (
          <div
            className={`absolute bottom-0 left-0 right-0 h-20 sm:h-24 cinema-band-bottom pointer-events-none z-20 transition-opacity duration-300 ${
              showControls && !screenLocked ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

        {/* Barre d'actions supérieure flottante de l'application */}
        {!isAudioMode && (
          <div
            className={`absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-3 sm:p-5 pointer-events-auto transition-opacity duration-300 ${
              showControls && !screenLocked ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {/* Côté gauche : Fermer, Miniature */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={handleClose}
                className="flex items-center gap-1.5 text-zinc-200 hover:text-rose-400 transition-all liquid-glass hover:bg-white/15 p-2 sm:px-3.5 sm:py-1.5 rounded-full border border-white/15 shadow-md active:scale-95"
                title="Fermer la vidéo (Échap)"
              >
                <X size={16} />
                <span className="text-xs font-semibold hidden sm:inline">Fermer</span>
              </button>
              <button
                onClick={handleMinimize}
                className="flex items-center gap-1.5 text-zinc-200 hover:text-white transition-all liquid-glass hover:bg-white/15 p-2 sm:px-3 sm:py-1.5 rounded-full border border-white/15 shadow-md active:scale-95"
                title="Réduire en miniature / Image dans l'image"
              >
                <Minimize2 size={15} className="text-emerald-400" />
                <span className="text-xs font-semibold hidden sm:inline">Miniature</span>
              </button>
            </div>

            {/* Côté droit : Audio HD, Verrouillage */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAudioMode(true)}
                className="flex items-center gap-1.5 p-2 sm:px-3.5 sm:py-1.5 rounded-full text-xs font-bold transition-all border border-emerald-400/30 liquid-glass-emerald text-emerald-200 shadow-md active:scale-95 hover:border-emerald-300"
                title="Basculer en Mode Audio HD (écoute pure)"
              >
                <Music size={14} className="text-emerald-400" />
                <span className="text-xs hidden sm:inline">Audio HD</span>
              </button>

              <button
                onClick={() => {
                  activateScreenLock();
                }}
                className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-full text-xs font-semibold liquid-glass hover:bg-white/15 border border-white/15 text-zinc-200 hover:text-rose-300 transition-all shadow-md active:scale-95"
                title="Verrouiller l'écran (évite les clics involontaires)"
              >
                <Lock size={14} />
                <span className="hidden sm:inline">Verrouiller</span>
              </button>
            </div>
          </div>
        )}

        {/* Barre de commandes principale du lecteur de l'application */}
        {!isAudioMode && (
          <div
            className={`absolute bottom-0 left-0 right-0 z-30 px-3 sm:px-6 pb-3 sm:pb-4 pt-6 space-y-2 pointer-events-auto transition-opacity duration-300 ${
              showControls && !screenLocked ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {/* Scrubber / Barre de progression interactive avec info-bulle de temps */}
            <div
              ref={progressBarRef}
              onClick={handleSeekFromEvent}
              onMouseDown={handleSeekFromEvent}
              onTouchStart={handleSeekFromEvent}
              onMouseMove={handleMouseMoveProgressBar}
              onMouseLeave={handleMouseLeaveProgressBar}
              className="group/bar relative w-full h-2 hover:h-2.5 bg-white/20 hover:bg-white/30 rounded-full cursor-pointer transition-all flex items-center"
            >
              {/* Info-bulle au survol */}
              {hoverTimeSec !== null && (
                <div
                  className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded bg-zinc-900/95 border border-white/20 text-white font-mono text-[11px] shadow-2xl pointer-events-none whitespace-nowrap z-40"
                  style={{ left: `${hoverPercent}%` }}
                >
                  {fmt(hoverTimeSec)}
                </div>
              )}

              {/* Barre de progression active émeraude */}
              <div
                className="bg-emerald-400 h-full rounded-full relative shadow-[0_0_12px_rgba(52,211,153,0.7)]"
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              >
                {/* Thumb curseur */}
                <div className="w-3.5 h-3.5 rounded-full bg-white border border-emerald-400 shadow-md absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 scale-0 group-hover/bar:scale-100 transition-transform" />
              </div>
            </div>

            {/* Rangée des boutons de contrôle */}
            <div className="flex items-center justify-between gap-3 text-white">
              {/* Côté gauche : Lecture, Navigation, Volume, Temps */}
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Play / Pause principal */}
                <button
                  onClick={togglePlay}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center justify-center transition-all shadow-[0_0_16px_rgba(16,185,129,0.4)] active:scale-95 flex-shrink-0"
                  title={playing ? "Mettre en pause (Espace)" : "Lire la vidéo (Espace)"}
                >
                  {playing ? (
                    <Pause size={18} fill="currentColor" />
                  ) : (
                    <Play size={18} fill="currentColor" className="ml-0.5" />
                  )}
                </button>

                {/* Reculer 10s */}
                <button
                  onClick={() => skip(-10)}
                  className="p-1.5 sm:p-2 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                  title="Reculer de 10 secondes (Flèche gauche)"
                >
                  <RotateCcw size={17} />
                </button>

                {/* Avancer 10s */}
                <button
                  onClick={() => skip(10)}
                  className="p-1.5 sm:p-2 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                  title="Avancer de 10 secondes (Flèche droite)"
                >
                  <RotateCw size={17} />
                </button>

                {/* Précédent */}
                <button
                  onClick={handlePreviousTrack}
                  className="hidden md:flex p-1.5 sm:p-2 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                  title="Vidéo précédente"
                >
                  <SkipBack size={17} />
                </button>

                {/* Suivant */}
                <button
                  onClick={handleNextTrack}
                  className="hidden md:flex p-1.5 sm:p-2 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                  title="Vidéo suivante"
                >
                  <SkipForward size={17} />
                </button>

                {/* Volume & Curseur */}
                <div className="hidden sm:flex items-center gap-1.5 group/vol ml-0.5 sm:ml-1">
                  <button
                    onClick={toggleMute}
                    className="p-1.5 sm:p-2 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                    title={muted || volume === 0 ? "Activer le son (M)" : "Couper le son (M)"}
                  >
                    {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={muted ? 0 : volume}
                    onChange={(e) => handleVolume(Number(e.target.value))}
                    className="hidden sm:block w-16 lg:w-20 h-1 accent-emerald-400 bg-white/20 rounded-full cursor-pointer"
                    title="Volume"
                  />
                </div>

                {/* Affichage du temps monospace */}
                <div className="text-zinc-300 text-[11px] sm:text-xs font-mono tracking-tight ml-0.5 sm:ml-2 select-none whitespace-nowrap">
                  <span>{fmt(currentTimeSec)}</span>
                  <span className="text-zinc-500 mx-0.5 sm:mx-1">/</span>
                  <span className="text-zinc-400">{fmt(duration)}</span>
                </div>
              </div>

              {/* Côté droit : Sommeil, Vitesse, Sous-titres, Plein écran */}
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Minuteur de sommeil (Desktop) */}
                <div className="relative hidden sm:block">
                  <button
                    onClick={() => setShowSleepMenu((v) => !v)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all shadow-sm active:scale-95 ${
                      sleepTimer !== null
                        ? "liquid-glass-emerald border-emerald-400/40 text-emerald-300"
                        : "liquid-glass border-white/15 text-zinc-300 hover:text-white hover:bg-white/10"
                    }`}
                    title="Minuteur de sommeil"
                    aria-label="Minuteur de sommeil"
                  >
                    <Moon size={15} className={sleepTimer !== null ? "text-emerald-400" : "text-zinc-300"} />
                    <span className="hidden sm:inline">Sommeil</span>
                    {sleepTimeRemaining !== null && (
                      <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-emerald-300 font-mono text-[10px]">
                        {formatSleepTime(sleepTimeRemaining)}
                      </span>
                    )}
                  </button>
                  {showSleepMenu && (
                    <SleepTimerMenu
                      sleepTimer={sleepTimer}
                      sleepTimeRemaining={sleepTimeRemaining}
                      onSelect={handleSelectSleepTimer}
                      onExtend={handleExtendSleepTimer}
                      onClose={() => setShowSleepMenu(false)}
                      formatSleepTime={formatSleepTime}
                      align="right"
                    />
                  )}
                </div>

                {/* Badge Sommeil actif (Mobile uniquement) */}
                {sleepTimer !== null && sleepTimeRemaining !== null && (
                  <button
                    onClick={() => setShowMobileOptions(true)}
                    className="flex sm:hidden items-center gap-1 px-2 py-0.5 rounded-full liquid-glass-emerald border border-emerald-400/40 text-emerald-300 font-mono text-[10px] active:scale-95"
                    title="Minuteur de sommeil actif"
                  >
                    <Moon size={11} className="text-emerald-400" />
                    <span>{formatSleepTime(sleepTimeRemaining)}</span>
                  </button>
                )}

                {/* Vitesse de lecture (Desktop) */}
                <button
                  onClick={cyclePlaybackRate}
                  className="hidden sm:flex px-2.5 py-1 rounded-full text-xs font-bold text-zinc-200 hover:text-white liquid-glass hover:bg-white/15 border border-white/15 transition-all shadow-sm active:scale-95"
                  title="Changer la vitesse de lecture"
                >
                  {playbackRate}x
                </button>

                {/* Sous-titres (CC) (Desktop) */}
                <button
                  type="button"
                  onClick={toggleCaptions}
                  aria-pressed={captionsOn}
                  className={`hidden sm:flex p-1.5 sm:p-2 rounded-full transition-colors ${
                    captionsOn
                      ? "text-emerald-300 bg-emerald-500/20 border border-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                      : "text-zinc-300 hover:text-white hover:bg-white/10 border border-transparent"
                  }`}
                  title={captionsOn ? "Désactiver les sous-titres (C)" : "Activer les sous-titres (C)"}
                >
                  <Subtitles size={18} />
                </button>

                {/* Format vidéo (Plein cadre / Zoom / 16:9) (Desktop) */}
                <button
                  onClick={cycleVideoFitMode}
                  className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-zinc-200 hover:text-white liquid-glass hover:bg-white/15 border border-white/15 transition-all shadow-sm active:scale-95"
                  title="Changer le cadrage vidéo (Z)"
                >
                  <Film size={13} className="text-emerald-400" />
                  <span>
                    {videoFitMode === "cover"
                      ? "Remplir"
                      : videoFitMode === "zoom"
                      ? "Zoom"
                      : "16:9"}
                  </span>
                </button>

                {/* Bouton Options / Plus (Mobile uniquement - Ne s'encombre pas) */}
                <button
                  onClick={() => setShowMobileOptions(true)}
                  className="flex sm:hidden p-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-colors active:scale-95"
                  title="Options et réglages de lecture"
                  aria-label="Options et réglages de lecture"
                >
                  <MoreHorizontal size={18} />
                </button>

                {/* Plein écran */}
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 sm:p-2 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-colors active:scale-95"
                  title="Basculer le plein écran (F)"
                >
                  {effectiveFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Caption Feedback Toast */}
        {captionToast && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none transition-all duration-300">
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/90 backdrop-blur-md border border-white/15 text-white text-xs font-semibold shadow-2xl">
              {captionToast.message.toLowerCase().includes("verrouill") ? (
                captionToast.active ? (
                  <Lock size={15} className="text-emerald-400" />
                ) : (
                  <Unlock size={15} className="text-zinc-300" />
                )
              ) : (
                <Subtitles size={16} className={captionToast.active ? "text-emerald-400" : "text-zinc-400"} />
              )}
              <span>{captionToast.message}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  captionToast.active ? "bg-emerald-400 shadow-sm shadow-emerald-400" : "bg-zinc-500"
                }`}
              />
            </div>
          </div>
        )}

        {/* Overlay Carte d'Enchaînement Automatique Continu (Série ou Catégorie) */}
        {autoNextCountdown !== null && nextItemToPlay && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="max-w-md w-full liquid-glass-modal border border-emerald-400/40 rounded-3xl p-5 sm:p-6 shadow-2xl text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Play size={14} fill="currentColor" />
                <span>Lecture automatique continue</span>
              </div>

              <div className="relative mx-auto w-32 sm:w-36 aspect-video rounded-xl overflow-hidden shadow-lg border border-white/20">
                <img
                  src={nextItemToPlay.thumbnail || nextItemToPlay.image}
                  alt={nextItemToPlay.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="w-9 h-9 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center font-bold text-sm shadow-lg">
                    {autoNextCountdown}s
                  </div>
                </div>
              </div>

              <div>
                {nextItemToPlay.seriesTitle && (
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 mb-1.5">
                    {nextItemToPlay.seriesTitle} {nextItemToPlay.episodeNumber ? `• Épisode ${nextItemToPlay.episodeNumber}` : ""}
                  </span>
                )}
                {!nextItemToPlay.seriesTitle && nextItemToPlay.categories[0] && (
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 mb-1.5">
                    Même catégorie • {nextItemToPlay.categories[0]}
                  </span>
                )}
                <h4 className="text-white font-bold text-sm sm:text-base line-clamp-2 leading-snug">
                  {nextItemToPlay.title}
                </h4>
                <p className="text-zinc-400 text-xs mt-1">
                  Enchaînement automatique dans <span className="text-emerald-400 font-bold font-mono text-sm">{autoNextCountdown}</span> seconde{autoNextCountdown > 1 ? "s" : ""}
                </p>
              </div>

              {/* Barre de progression du compte à rebours */}
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-1000 ease-linear rounded-full shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                  style={{ width: `${((4 - autoNextCountdown) / 4) * 100}%` }}
                />
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={cancelAutoNext}
                  className="flex-1 py-2.5 px-4 rounded-xl liquid-glass text-zinc-300 hover:text-white border border-white/15 text-xs font-semibold transition-all active:scale-95"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    cancelAutoNext();
                    handleChangeItem(nextItemToPlay.id);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Play size={14} fill="currentColor" />
                  <span>Lire maintenant</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Options Bottom Sheet (Options secondaires accessibles proprement sur smartphone) */}
        {showMobileOptions && (
          <div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:hidden animate-in fade-in duration-200"
            onClick={() => setShowMobileOptions(false)}
          >
            <div
              className="w-full bg-[#121216] border-t border-white/15 rounded-t-3xl p-5 shadow-2xl space-y-4 max-h-[82vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Settings size={18} className="text-emerald-400" />
                  <h4 className="text-white font-bold text-sm">Options de lecture</h4>
                </div>
                <button
                  onClick={() => setShowMobileOptions(false)}
                  className="w-8 h-8 rounded-full liquid-glass flex items-center justify-center text-zinc-400 hover:text-white"
                  title="Fermer les options"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Vitesse de lecture */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-zinc-400">Vitesse de lecture</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {[0.75, 1, 1.25, 1.5, 2].map((rateVal) => (
                    <button
                      key={rateVal}
                      onClick={() => changePlaybackRate(rateVal)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        playbackRate === rateVal
                          ? "bg-emerald-500 text-zinc-950 border-emerald-400 shadow-md font-extrabold"
                          : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                      }`}
                    >
                      {rateVal}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Sous-titres (CC) */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2.5">
                  <Subtitles size={18} className={captionsOn ? "text-emerald-400" : "text-zinc-400"} />
                  <div>
                    <p className="text-xs font-bold text-white">Sous-titres (CC)</p>
                    <p className="text-[10px] text-zinc-400">{captionsOn ? "Activés" : "Désactivés"}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleCaptions}
                  aria-pressed={captionsOn}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                    captionsOn
                      ? "bg-emerald-500 text-zinc-950 font-extrabold"
                      : "bg-white/10 text-zinc-300 border border-white/10"
                  }`}
                >
                  {captionsOn ? "Activé" : "Activer"}
                </button>
              </div>

              {/* Lecture automatique continue */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2.5">
                  <Play size={18} fill="currentColor" className={continuousAutoplay ? "text-emerald-400" : "text-zinc-400"} />
                  <div>
                    <p className="text-xs font-bold text-white">Lecture automatique continue</p>
                    <p className="text-[10px] text-zinc-400">
                      {continuousAutoplay ? "Enchaîne les épisodes automatiquement" : "Désactivée"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleContinuousAutoplay}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                    continuousAutoplay
                      ? "bg-emerald-500 text-zinc-950 font-extrabold"
                      : "bg-white/10 text-zinc-300 border border-white/10"
                  }`}
                >
                  {continuousAutoplay ? "Activée" : "Activer"}
                </button>
              </div>

              {/* Opacité des textes (Titre & Métadonnées) */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye size={16} className="text-emerald-400" />
                    <div>
                      <p className="text-xs font-bold text-white">Opacité des textes (Titre & Infos)</p>
                      <p className="text-[10px] text-zinc-400">Réglez la visibilité des titres pour un visionnage épuré</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    {Math.round(textOpacity * 100)}%
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {[
                    { label: "100%", val: 1.0, desc: "Normale" },
                    { label: "65%", val: 0.65, desc: "Discrète (Par défaut)" },
                    { label: "35%", val: 0.35, desc: "Tamisée" },
                    { label: "10%", val: 0.1, desc: "Minimaliste" },
                    { label: "0%", val: 0.0, desc: "Masquée" },
                  ].map((lvl) => (
                    <button
                      key={lvl.label}
                      onClick={() => handleSetTextOpacity(lvl.val)}
                      className={`py-1.5 text-xs font-bold rounded-xl border transition-all ${
                        textOpacity === lvl.val
                          ? "bg-emerald-500 text-zinc-950 border-emerald-400 font-extrabold shadow-sm"
                          : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
                      }`}
                      title={lvl.desc}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode Épuré Anti-Titre YouTube (Rognage optique gratuit des bordures & logos YouTube) */}
              {!directStreamUrl && (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                  <div className="flex items-center gap-2.5">
                    <Tv size={18} className={cinemaCleanMode ? "text-emerald-400" : "text-zinc-400"} />
                    <div className="pr-2">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-white">Mode Épuré Anti-Titre YouTube</p>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                          Gratuit
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                        {cinemaCleanMode
                          ? "Rognage optique actif : le titre et la barre YouTube sont masqués"
                          : "Affichage standard YouTube"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={toggleCinemaCleanMode}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                      cinemaCleanMode
                        ? "bg-emerald-500 text-zinc-950 font-extrabold shadow-sm"
                        : "bg-white/10 text-zinc-300 border border-white/10"
                    }`}
                  >
                    {cinemaCleanMode ? "Actif" : "Inactif"}
                  </button>
                </div>
              )}

              {/* Mode de cadrage vidéo (Plein cadre / Zoom / 16:9) */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Film size={16} className="text-emerald-400" />
                    <p className="text-xs font-bold text-white">Cadrage vidéo plein écran</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {[
                    { id: "cover", label: "Remplir" },
                    { id: "zoom", label: "Zoom" },
                    { id: "contain", label: "16:9" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        const mode = opt.id as "cover" | "contain" | "zoom";
                        setVideoFitMode(mode);
                        try {
                          localStorage.setItem("sirat_video_fit_mode", mode);
                        } catch {}
                      }}
                      className={`py-1.5 text-xs font-bold rounded-xl border transition-all ${
                        videoFitMode === opt.id
                          ? "bg-emerald-500 text-zinc-950 border-emerald-400 font-extrabold"
                          : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode Audio HD */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2.5">
                  <Music size={18} className="text-emerald-400" />
                  <div>
                    <p className="text-xs font-bold text-white">Mode Audio HD</p>
                    <p className="text-[10px] text-zinc-400">Écoute pure sans vidéo</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsAudioMode(true);
                    setShowMobileOptions(false);
                  }}
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                >
                  Passer en Audio
                </button>
              </div>

              {/* Minuteur Sommeil enrichi */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Moon size={15} className="text-emerald-400" />
                    <div>
                      <p className="text-xs font-bold text-white">Minuteur de sommeil</p>
                      <p className="text-[10px] text-zinc-400">Arrêt automatique de la lecture</p>
                    </div>
                  </div>
                  {sleepTimer !== null && sleepTimeRemaining !== null && (
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      {formatSleepTime(sleepTimeRemaining)}
                    </span>
                  )}
                </div>

                {sleepTimer !== null && sleepTimeRemaining !== null && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      onClick={() => handleExtendSleepTimer(5)}
                      className="flex-1 py-1 text-[10px] font-bold rounded-lg bg-white/10 text-emerald-300 hover:bg-white/15 transition-colors"
                    >
                      +5 min
                    </button>
                    <button
                      onClick={() => handleExtendSleepTimer(15)}
                      className="flex-1 py-1 text-[10px] font-bold rounded-lg bg-white/10 text-emerald-300 hover:bg-white/15 transition-colors"
                    >
                      +15 min
                    </button>
                    <button
                      onClick={() => handleSelectSleepTimer(null)}
                      className="flex-1 py-1 text-[10px] font-bold rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition-colors"
                    >
                      Désactiver
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 pt-1">
                  {SLEEP_TIMER_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => handleSelectSleepTimer(preset.minutes)}
                      className={`py-1.5 px-2 text-xs font-bold rounded-xl border transition-all truncate ${
                        sleepTimer === preset.minutes
                          ? "bg-emerald-500 text-zinc-950 border-emerald-400 font-extrabold"
                          : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>



              {/* Doublage multilingue */}
              {hasDubbing && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                    <Globe size={14} className="text-emerald-400" />
                    <span>Piste audio / Doublage</span>
                  </p>
                  <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                    <button
                      onClick={() => switchAudioLanguage(ORIGINAL_AUDIO_CODE)}
                      className={`w-full px-3 py-2 text-left text-xs rounded-xl transition-all ${
                        activeAudioLang === ORIGINAL_AUDIO_CODE
                          ? "bg-emerald-500 text-zinc-950 font-bold"
                          : "bg-white/5 text-zinc-300 hover:bg-white/10"
                      }`}
                    >
                      Version originale
                    </button>
                    {availableAudioTracks.map((track) => (
                      <button
                        key={track.code}
                        onClick={() => switchAudioLanguage(track.code)}
                        className={`w-full px-3 py-2 text-left text-xs rounded-xl transition-all ${
                          activeAudioLang === track.code
                            ? "bg-emerald-500 text-zinc-950 font-bold"
                            : "bg-white/5 text-zinc-300 hover:bg-white/10"
                        }`}
                      >
                        {track.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions Rapides */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                <button
                  onClick={() => {
                    setShowMobileOptions(false);
                    handleMinimize();
                  }}
                  className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl bg-white/5 border border-white/10 text-zinc-300 active:scale-95"
                  title="Miniature"
                >
                  <PictureInPicture2 size={16} />
                  <span className="text-[9px] font-semibold truncate">Miniature</span>
                </button>

                <button
                  onClick={() => {
                    setShowMobileOptions(false);
                    activateScreenLock();
                  }}
                  className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl bg-white/5 border border-white/10 text-zinc-300 active:scale-95"
                  title="Verrouiller"
                >
                  <Lock size={16} />
                  <span className="text-[9px] font-semibold truncate">Verrouiller</span>
                </button>

                <button
                  onClick={() => {
                    setShowMobileOptions(false);
                    handleExportVideoFile();
                  }}
                  className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl bg-white/5 border border-white/10 text-zinc-300 active:scale-95"
                  title="Partager"
                >
                  <Share2 size={16} className="text-amber-300" />
                  <span className="text-[9px] font-semibold truncate">Partager</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Indicateur de défilement vers le bas (masqué automatiquement avec les commandes pour une vidéo 100% pure) */}
        {!isAudioMode && !effectiveFullscreen && (
          <div
            className={`absolute bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-25 transition-all duration-300 ${
              showControls && !screenLocked
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 translate-y-2 pointer-events-none"
            }`}
          >
            <button
              onClick={() => {
                detailsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/75 hover:bg-black/95 text-white/90 hover:text-white border border-emerald-400/40 hover:border-emerald-300 shadow-[0_4px_24px_rgba(0,0,0,0.8)] backdrop-blur-md text-xs font-semibold transition-all hover:scale-105 active:scale-95 group cursor-pointer"
              title="Faire défiler vers le bas pour voir la description et les détails"
            >
              <span className="text-zinc-200 group-hover:text-white">Détails & Description</span>
              <ChevronDown size={14} className="text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
            </button>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION DESCRIPTION, NOTES & DÉTAILS DÉROULANTE (SOUS LA VIDÉO) */}
      {/* L'utilisateur fait défiler l'écran vers le bas pour y accéder   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {!isAudioMode && !effectiveFullscreen && (
        <div
          ref={detailsSectionRef}
          className="w-full bg-gradient-to-b from-black via-zinc-950 to-zinc-900 border-t border-white/10 py-8 sm:py-12 px-4 sm:px-8 lg:px-16"
        >
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Bouton pour remonter directement vers la vidéo plein écran */}
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
              <button
                onClick={() => {
                  scrollRootRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-full liquid-glass hover:bg-white/15 text-emerald-300 hover:text-white border border-emerald-400/30 text-xs font-bold transition-all shadow-md active:scale-95 group cursor-pointer"
                title="Remonter vers la vidéo en plein écran"
              >
                <ChevronUp size={16} className="text-emerald-400 group-hover:-translate-y-0.5 transition-transform" />
                <span>Remonter vers la vidéo</span>
              </button>

              <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
                <Clock size={14} className="text-emerald-400" />
                <span>{item.duration || "15 min"}</span>
              </div>
            </div>

            {/* En-tête : Badges, Titre et Récitateur */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="liquid-glass-emerald border border-emerald-400/30 text-emerald-200 text-xs font-bold px-3 py-1 rounded-full tracking-wider uppercase shadow-sm">
                  {item.channel}
                </span>
                <span className="liquid-glass border border-white/15 text-emerald-300 font-bold text-xs px-3 py-1 rounded-full shadow-sm">
                  {item.score}% Recommandé
                </span>
                <span className="liquid-glass border border-white/15 text-zinc-300 text-xs px-3 py-1 rounded-full shadow-sm">
                  {item.rating}
                </span>
                <span className="liquid-glass border border-white/15 text-zinc-400 text-xs px-3 py-1 rounded-full shadow-sm">
                  {item.year}
                </span>
                {item.categories.map((cat) => (
                  <span
                    key={cat}
                    className="liquid-glass-subtle border border-white/10 text-zinc-300 text-xs px-2.5 py-0.5 rounded-full"
                  >
                    {cat}
                  </span>
                ))}
              </div>

              <h2
                className="text-white font-black text-2xl sm:text-3xl lg:text-4xl leading-tight transition-opacity duration-300"
                style={{ opacity: textOpacity }}
              >
                {item.title}
              </h2>

              {/* Récitateur si Tarawih / Haramain */}
              {reciter && (
                <div className="p-4 sm:p-5 rounded-2xl liquid-glass-card border border-emerald-400/30 flex items-center gap-4 shadow-xl max-w-2xl">
                  <img
                    src={reciter.photoUrl}
                    alt={reciter.name}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-emerald-400 shadow-md flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <p className="text-white font-bold text-base sm:text-lg">{reciter.name}</p>
                      <span className="text-xs text-emerald-300 font-semibold liquid-glass-emerald px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                        {reciter.years}
                      </span>
                    </div>
                    <p className="text-sm text-emerald-400/90 font-serif mt-0.5" dir="rtl">
                      {reciter.arabicName}
                    </p>
                    <p className="text-xs text-zinc-300 mt-1 line-clamp-1">{reciter.title}</p>
                  </div>
                </div>
              )}

              {/* Actions Rapides */}
              <div className="flex items-center gap-3 flex-wrap pt-2">
                <button
                  onClick={() => toggle(item)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border shadow-md active:scale-95 cursor-pointer ${
                    inList(item.id)
                      ? "liquid-glass-emerald border-emerald-400/50 text-emerald-200 shadow-emerald-950/40"
                      : "liquid-glass border-white/15 text-zinc-200 hover:text-white hover:bg-white/15"
                  }`}
                >
                  <Plus size={15} />
                  <span>{inList(item.id) ? "Dans ma liste" : "Ajouter à ma liste"}</span>
                </button>

                <button
                  onClick={() => {
                    const willBeLiked = userVote !== true;
                    vote(willBeLiked);
                    showCaptionNotification(
                      willBeLiked ? "Ajouté à vos mentions J'aime !" : "Mention J'aime retirée",
                      willBeLiked
                    );
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border shadow-md active:scale-95 cursor-pointer ${
                    userVote === true
                      ? "liquid-glass-emerald border-emerald-400/50 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.3)] scale-[1.02]"
                      : "liquid-glass border-white/15 text-zinc-200 hover:text-white hover:bg-white/15"
                  }`}
                >
                  <ThumbsUp
                    size={15}
                    fill={userVote === true ? "currentColor" : "none"}
                    className={userVote === true ? "text-emerald-400" : ""}
                  />
                  <span>{userVote === true ? "Aimé" : "J'aime"}</span>
                  {likes > 0 && <span className="font-mono opacity-80">({likes})</span>}
                </button>

                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold liquid-glass border border-white/15 text-zinc-200 hover:text-white hover:bg-white/15 transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <Share2 size={15} />
                  <span>Partager</span>
                </button>

                {upNext && (
                  <button
                    onClick={() => handleChangeItem(upNext.id)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-all shadow-[0_0_16px_rgba(16,185,129,0.35)] active:scale-95 ml-auto cursor-pointer"
                  >
                    <span>Épisode suivant</span>
                    <ChevronRight size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Description complète */}
            <div className="liquid-glass-card rounded-2xl p-5 sm:p-6 border border-white/10 shadow-xl space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400">
                Synopsis & Description
              </h3>
              <p className="text-zinc-200 text-sm sm:text-base leading-relaxed whitespace-pre-line font-normal">
                {item.description || "Aucune description détaillée n'est fournie pour cette vidéo."}
              </p>
            </div>

            {/* Section Évaluation / Étoiles */}
            <div className="liquid-glass-card rounded-2xl p-5 sm:p-6 border border-white/10 shadow-xl">
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-3">
                Avis & Évaluation de la communauté
              </h3>
              <RatingStars
                averageRating={averageRating}
                ratingCount={ratingCount}
                userRating={userRating}
                onRate={rate}
              />
            </div>

            {/* Section Notes Spirituelles / Personnelles */}
            <div className="liquid-glass-card rounded-2xl p-5 sm:p-6 border border-white/10 shadow-xl">
              <VideoNotesSection contentId={item.id} contentTitle={item.title} />
            </div>

            {/* Épisodes de la même série (si applicable) */}
            {seriesEpisodes.length > 0 && (
              <div className="space-y-4 pt-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Tv size={18} className="text-emerald-400" />
                    <span>Épisodes de la série ({seriesEpisodes.length})</span>
                  </h3>
                  {item.seriesTitle && (
                    <p className="text-xs text-zinc-400 mt-0.5">{item.seriesTitle}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {seriesEpisodes.map((ep) => {
                    const isCurrent = ep.id === item.id;
                    return (
                      <Card3D
                        key={ep.id}
                        onClick={() => !isCurrent && handleChangeItem(ep.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                          isCurrent
                            ? "bg-emerald-950/40 border-emerald-400/60 shadow-[0_0_20px_rgba(52,211,153,0.25)] ring-1 ring-emerald-400/40"
                            : "liquid-glass-card hover:border-emerald-400/30"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative w-24 aspect-video rounded-xl overflow-hidden bg-zinc-900 flex-shrink-0">
                            <img
                              src={ep.thumbnail || ep.image}
                              alt={ep.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              {isCurrent ? (
                                <div className="w-6 h-6 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center font-bold text-[10px]">
                                  ▶
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-[10px] group-hover:bg-emerald-500 group-hover:text-zinc-950">
                                  <Play size={10} fill="currentColor" />
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                              <span className="font-bold text-emerald-400">
                                Ép. {ep.episodeNumber ?? "—"}
                              </span>
                              <span>•</span>
                              <span>{ep.duration || "15 min"}</span>
                            </div>
                            <h4 className="text-xs font-bold text-white line-clamp-2 mt-0.5">
                              {ep.title}
                            </h4>
                          </div>
                        </div>
                      </Card3D>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recommandations / Dans la même catégorie */}
            {related.length > 0 && (
              <div className="space-y-4 pt-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Film size={18} className="text-emerald-400" />
                  <span>Dans la même catégorie</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4">
                  {related.slice(0, 5).map((rel) => (
                    <Card3D
                      key={rel.id}
                      onClick={() => handleChangeItem(rel.id)}
                      className="group rounded-2xl liquid-glass-card overflow-hidden border border-white/10 hover:border-emerald-400/40 transition-all cursor-pointer flex flex-col"
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-zinc-950">
                        <img
                          src={rel.thumbnail || rel.image}
                          alt={rel.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[10px] text-zinc-300 font-mono">
                          <span className="text-emerald-300 font-bold">{rel.score}%</span>
                          <span>{rel.duration || "15 min"}</span>
                        </div>
                      </div>
                      <div className="p-2.5 flex-1 flex flex-col justify-between">
                        <p className="text-[10px] text-amber-300/90 font-bold uppercase truncate">
                          {rel.channel}
                        </p>
                        <h4 className="text-xs font-bold text-white line-clamp-2 mt-0.5 group-hover:text-emerald-300 transition-colors">
                          {rel.title}
                        </h4>
                      </div>
                    </Card3D>
                  ))}
                </div>
              </div>
            )}

            {/* Bouton de pied de page pour remonter */}
            <div className="pt-8 pb-8 text-center">
              <button
                onClick={() => {
                  scrollRootRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full liquid-glass hover:bg-white/15 text-emerald-300 hover:text-white border border-emerald-400/30 text-xs font-bold transition-all shadow-xl active:scale-95 group cursor-pointer"
              >
                <ChevronUp size={16} className="text-emerald-400 group-hover:-translate-y-0.5 transition-transform" />
                <span>Remonter tout en haut vers la vidéo</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  if (typeof document === "undefined") return modalContent;
  return createPortal(modalContent, document.body);
}