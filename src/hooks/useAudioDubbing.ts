import { useEffect, useRef, useState, useCallback } from "react";
import { ContentItem } from "@/data/catalog";
import {
  DubbingSegment,
  DubbingSettings,
  getStoredDubbingSettings,
  saveStoredDubbingSettings,
  loadDubbingSegments,
  getSystemVoicesForLang,
} from "@/lib/audioDubbingService";

export type UseAudioDubbingProps = {
  item: ContentItem;
  currentTimeSec: number;
  durationSec: number;
  isPlaying: boolean;
  playbackRate: number;
  originalVolume: number; // 0 - 100
  onDuckVolume: (duckedVol: number) => void;
  onRestoreVolume: () => void;
};

export function useAudioDubbing({
  item,
  currentTimeSec,
  durationSec,
  isPlaying,
  playbackRate,
  originalVolume,
  onDuckVolume,
  onRestoreVolume,
}: UseAudioDubbingProps) {
  const [settings, setSettings] = useState<DubbingSettings>(() => getStoredDubbingSettings());
  const [segments, setSegments] = useState<DubbingSegment[]>([]);
  const [loadingTrack, setLoadingTrack] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpokenSegment, setCurrentSpokenSegment] = useState<DubbingSegment | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Keep track of spoken segment IDs so we don't speak the same segment twice in one run
  const spokenSegmentIdsRef = useRef<Set<string>>(new Set());
  const lastTimeRef = useRef<number>(currentTimeSec);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Keep latest values in refs for event listeners
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
    saveStoredDubbingSettings(settings);
  }, [settings]);

  const playbackRateRef = useRef(playbackRate);
  useEffect(() => {
    playbackRateRef.current = playbackRate;
    if (currentUtteranceRef.current) {
      currentUtteranceRef.current.rate = playbackRate;
    }
  }, [playbackRate]);

  const originalVolumeRef = useRef(originalVolume);
  useEffect(() => {
    originalVolumeRef.current = originalVolume;
  }, [originalVolume]);

  // Load voices available in browser
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const updateVoices = () => {
      const voices = getSystemVoicesForLang(settings.language);
      setAvailableVoices(voices);
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [settings.language]);

  // Load segments when item or language changes
  useEffect(() => {
    let cancelled = false;

    if (!settings.enabled || settings.language === "off") {
      setSegments([]);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      setCurrentSpokenSegment(null);
      onRestoreVolume();
      return;
    }

    setLoadingTrack(true);
    // Reset spoken segments on new track
    spokenSegmentIdsRef.current.clear();

    loadDubbingSegments(item, settings.language, durationSec)
      .then((loaded) => {
        if (!cancelled) {
          setSegments(loaded);
          setLoadingTrack(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load dubbing segments:", err);
        if (!cancelled) {
          setLoadingTrack(false);
        }
      });

    return () => {
      cancelled = true;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      setCurrentSpokenSegment(null);
    };
  }, [item.id, settings.enabled, settings.language, durationSec]);

  // Ducking helper
  const triggerDucking = useCallback(() => {
    const orig = originalVolumeRef.current;
    if (orig <= 0) return;
    const duckRatio = Math.max(0, Math.min(100, settingsRef.current.duckingLevel));
    // E.g. duckRatio = 85 -> new volume = orig * 0.15
    const duckedVol = Math.round(orig * (1 - duckRatio / 100));
    onDuckVolume(duckedVol);
  }, [onDuckVolume]);

  const releaseDucking = useCallback(() => {
    onRestoreVolume();
  }, [onRestoreVolume]);

  // Cancel speech helper
  const cancelSpeech = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    currentUtteranceRef.current = null;
    setIsSpeaking(false);
    setCurrentSpokenSegment(null);
    releaseDucking();
  }, [releaseDucking]);

  // Handle Play/Pause sync
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (!isPlaying) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
      }
    } else {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }
  }, [isPlaying]);

  // Handle Seek: reset spoken history if user jumps backward or skips forward
  useEffect(() => {
    const diff = Math.abs(currentTimeSec - lastTimeRef.current);
    if (diff > 3) {
      // User scrubbed or skipped
      cancelSpeech();
      // Remove all segments that are ahead of new currentTimeSec from spoken set
      const nextSpoken = new Set<string>();
      for (const seg of segments) {
        if (seg.timeSec < currentTimeSec - 1) {
          nextSpoken.add(seg.id);
        }
      }
      spokenSegmentIdsRef.current = nextSpoken;
    }
    lastTimeRef.current = currentTimeSec;
  }, [currentTimeSec, segments, cancelSpeech]);

  // Playback listener for speech synchronization
  useEffect(() => {
    if (
      !settings.enabled ||
      settings.language === "off" ||
      !isPlaying ||
      segments.length === 0 ||
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      return;
    }

    // Find if there is a segment that matches currentTimeSec and hasn't been spoken yet
    const curTime = Math.floor(currentTimeSec);
    const candidate = segments.find(
      (s) =>
        !spokenSegmentIdsRef.current.has(s.id) &&
        curTime >= s.timeSec &&
        curTime <= s.timeSec + Math.max(3, s.durationSec)
    );

    if (candidate) {
      spokenSegmentIdsRef.current.add(candidate.id);

      // Cancel previous utterance if still active
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(candidate.text);
      currentUtteranceRef.current = utterance;

      // Select matching voice
      const voices = window.speechSynthesis.getVoices();
      let matchedVoice: SpeechSynthesisVoice | undefined;

      if (settings.voiceURI) {
        matchedVoice = voices.find((v) => v.voiceURI === settings.voiceURI);
      }
      if (!matchedVoice) {
        matchedVoice = voices.find(
          (v) =>
            v.lang.toLowerCase().startsWith(settings.language.toLowerCase()) ||
            v.lang.toLowerCase().includes(`-${settings.language.toLowerCase()}`)
        );
      }
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      // Voice settings
      utterance.lang = matchedVoice?.lang || (settings.language === "ar" ? "ar-SA" : settings.language === "en" ? "en-US" : "fr-FR");
      utterance.rate = Math.max(0.6, Math.min(2.0, playbackRateRef.current));
      utterance.volume = Math.max(0, Math.min(1, (settings.volume || 95) / 100));
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setCurrentSpokenSegment(candidate);
        triggerDucking();
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setCurrentSpokenSegment(null);
        currentUtteranceRef.current = null;
        releaseDucking();
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setCurrentSpokenSegment(null);
        currentUtteranceRef.current = null;
        releaseDucking();
      };

      try {
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("Speech synthesis error:", err);
        releaseDucking();
      }
    }
  }, [currentTimeSec, isPlaying, segments, settings, triggerDucking, releaseDucking]);

  // User Actions
  const setTrackLanguage = useCallback((langCode: string) => {
    cancelSpeech();
    spokenSegmentIdsRef.current.clear();
    setSettings((prev) => ({
      ...prev,
      enabled: langCode !== "off",
      language: langCode,
      voiceURI: undefined, // reset voice to default for new language
    }));
  }, [cancelSpeech]);

  const setDuckingLevel = useCallback((ducking: number) => {
    setSettings((prev) => ({ ...prev, duckingLevel: ducking }));
  }, []);

  const setDubbingVolume = useCallback((vol: number) => {
    setSettings((prev) => ({ ...prev, volume: vol }));
  }, []);

  const setVoiceURI = useCallback((uri: string) => {
    setSettings((prev) => ({ ...prev, voiceURI: uri }));
  }, []);

  const toggleOverlay = useCallback(() => {
    setSettings((prev) => ({ ...prev, showOverlay: !prev.showOverlay }));
  }, []);

  return {
    settings,
    segments,
    loadingTrack,
    isSpeaking,
    currentSpokenSegment,
    availableVoices,
    setTrackLanguage,
    setDuckingLevel,
    setDubbingVolume,
    setVoiceURI,
    toggleOverlay,
    cancelSpeech,
  };
}
