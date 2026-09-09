import { ContentItem } from "@/data/catalog";
import { fetchSubtitlesForVideo, SubtitleLine, translateSubtitlesWithGemini } from "./subtitlesService";

export type DubbingLanguage = {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  badge: string;
  defaultLangCode: string;
};

export const DUBBING_LANGUAGES: DubbingLanguage[] = [
  { code: "off", name: "Désactivé", nativeName: "Audio d'origine", flag: "🔊", badge: "Original", defaultLangCode: "" },
  { code: "fr", name: "Français", nativeName: "Français (Doublage IA)", flag: "🇫🇷", badge: "Doublage IA", defaultLangCode: "fr-FR" },
  { code: "en", name: "English", nativeName: "English (AI Dubbing)", flag: "🇬🇧", badge: "AI Dubbing", defaultLangCode: "en-US" },
  { code: "ar", name: "Arabe", nativeName: "العربية (الدبلجة الصوتية)", flag: "🇸🇦", badge: "دبلجة صوتية", defaultLangCode: "ar-SA" },
  { code: "es", name: "Espagnol", nativeName: "Español (Doblaje IA)", flag: "🇪🇸", badge: "Doblaje IA", defaultLangCode: "es-ES" },
  { code: "de", name: "Allemand", nativeName: "Deutsch (KI-Synchronisation)", flag: "🇩🇪", badge: "KI-Dub", defaultLangCode: "de-DE" },
  { code: "tr", name: "Turc", nativeName: "Türkçe (Yapay Zeka Dublaj)", flag: "🇹🇷", badge: "AI Dublaj", defaultLangCode: "tr-TR" },
  { code: "it", name: "Italien", nativeName: "Italiano (Doppiaggio IA)", flag: "🇮🇹", badge: "Doppiaggio IA", defaultLangCode: "it-IT" },
  { code: "id", name: "Indonésien", nativeName: "Bahasa Indonesia (Sulih Suara)", flag: "🇮🇩", badge: "Sulih Suara", defaultLangCode: "id-ID" },
];

export type DubbingSegment = {
  id: string;
  timeSec: number;
  durationSec: number;
  text: string;
  sourceLang?: string;
};

export type DubbingSettings = {
  enabled: boolean;
  language: string;
  volume: number; // 0 - 100
  duckingLevel: number; // 0 - 100 (percentage of original audio attenuation)
  showOverlay: boolean;
  voiceURI?: string;
};

// In-memory cache for fast instant playback
const dubbingSegmentsCache = new Map<string, DubbingSegment[]>();

export function getStoredDubbingSettings(): DubbingSettings {
  try {
    const saved = localStorage.getItem("sirat_dubbing_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        enabled: Boolean(parsed.enabled),
        language: parsed.language || "off",
        volume: typeof parsed.volume === "number" ? parsed.volume : 95,
        duckingLevel: typeof parsed.duckingLevel === "number" ? parsed.duckingLevel : 85,
        showOverlay: parsed.showOverlay !== false,
        voiceURI: parsed.voiceURI || undefined,
      };
    }
  } catch {
    // ignore
  }

  return {
    enabled: false,
    language: "off",
    volume: 95,
    duckingLevel: 85,
    showOverlay: true,
  };
}

export function saveStoredDubbingSettings(settings: DubbingSettings) {
  try {
    localStorage.setItem("sirat_dubbing_settings", JSON.stringify(settings));
  } catch {
    // ignore
  }
}

/**
 * Fetch and prepare dubbing speech segments for a video in the target language.
 */
export async function loadDubbingSegments(
  item: ContentItem,
  targetLang: string,
  durationSec: number = 600
): Promise<DubbingSegment[]> {
  if (!targetLang || targetLang === "off") {
    return [];
  }

  const cacheKey = `${item.id}_${targetLang}`;
  if (dubbingSegmentsCache.has(cacheKey)) {
    return dubbingSegmentsCache.get(cacheKey)!;
  }

  // 1. First, check if real video subtitles exist
  try {
    const subtitles = await fetchSubtitlesForVideo(item, durationSec);
    if (subtitles && subtitles.lines && subtitles.lines.length > 0) {
      let finalSegments: DubbingSegment[] = [];

      // Check if subtitles already match target language
      const isAlreadyTargetLang =
        subtitles.language.toLowerCase().startsWith(targetLang) ||
        (targetLang === "fr" && subtitles.language.toLowerCase().startsWith("fr")) ||
        (targetLang === "en" && subtitles.language.toLowerCase().startsWith("en")) ||
        (targetLang === "ar" && subtitles.language.toLowerCase().startsWith("ar"));

      if (isAlreadyTargetLang) {
        finalSegments = subtitles.lines.map((line, idx) => ({
          id: line.id || `sub_${idx}`,
          timeSec: line.timeSec,
          durationSec: line.durationSec || 5,
          text: line.text,
          sourceLang: subtitles.language,
        }));
      } else {
        // Translate the subtitles with Gemini
        const translations = await translateSubtitlesWithGemini(
          item.id,
          subtitles.lines,
          targetLang,
          item.title
        );

        finalSegments = subtitles.lines.map((line, idx) => ({
          id: line.id || `sub_${idx}`,
          timeSec: line.timeSec,
          durationSec: line.durationSec || 5,
          text: translations[line.id] || line.translation || line.text,
          sourceLang: subtitles.language,
        }));
      }

      if (finalSegments.length > 0) {
        dubbingSegmentsCache.set(cacheKey, finalSegments);
        return finalSegments;
      }
    }
  } catch (subErr) {
    console.warn("Could not retrieve subtitles for dubbing, generating AI script...", subErr);
  }

  // 2. Fallback to AI-generated timestamped dubbing script
  try {
    const res = await fetch("/api/ai/dubbing-script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: item.title,
        description: item.description,
        channel: item.channel,
        durationSec: Math.max(60, durationSec || 600),
        targetLang,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.segments && Array.isArray(data.segments) && data.segments.length > 0) {
        const segments: DubbingSegment[] = data.segments.map((s: any, idx: number) => ({
          id: s.id || `dub_${idx + 1}`,
          timeSec: Number(s.timeSec) || (idx * 30 + 5),
          durationSec: Number(s.durationSec) || 6,
          text: String(s.text || "").trim(),
          sourceLang: targetLang,
        }));

        dubbingSegmentsCache.set(cacheKey, segments);
        return segments;
      }
    }
  } catch (aiErr) {
    console.error("AI dubbing script generation failed:", aiErr);
  }

  // 3. Ultimate local script fallback
  const fallbackSegments: DubbingSegment[] = [
    {
      id: "dub_init",
      timeSec: 3,
      durationSec: 6,
      text: targetLang === "en"
        ? `Welcome to ${item.title}. Enjoy the presentation.`
        : targetLang === "ar"
        ? `مرحباً بكم في ${item.title}. متابعة مفيدة ومباركة.`
        : `Bienvenue dans ${item.title}. Bonne écoute et bonne découverte.`,
      sourceLang: targetLang,
    },
  ];

  dubbingSegmentsCache.set(cacheKey, fallbackSegments);
  return fallbackSegments;
}

/**
 * Retrieve system SpeechSynthesis voices filtered by language code.
 */
export function getSystemVoicesForLang(targetLang: string): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return [];
  }

  const allVoices = window.speechSynthesis.getVoices();
  if (targetLang === "off" || !targetLang) {
    return allVoices;
  }

  const prefix = targetLang.toLowerCase();
  const matched = allVoices.filter(
    (v) => v.lang.toLowerCase().startsWith(prefix) || v.lang.toLowerCase().includes(`-${prefix}`)
  );

  return matched.length > 0 ? matched : allVoices;
}
