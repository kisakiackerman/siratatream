import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Subtitles,
  X,
  Search,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Sparkles,
  Check,
  Languages,
  ArrowDown,
  ChevronRight,
  BookOpen,
  Volume2,
  AlignLeft,
  Globe,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ContentItem } from "@/data/catalog";
import {
  fetchSubtitlesForVideo,
  SubtitleLine,
  SubtitlesResult,
  translateSubtitlesWithGemini,
  AVAILABLE_TRANSLATION_LANGUAGES,
} from "@/lib/subtitlesService";

export type InteractiveSubtitlesProps = {
  item: ContentItem;
  currentTimeSec: number;
  durationSec: number;
  isPlaying: boolean;
  onSeek: (seconds: number) => void;
  onClose: () => void;
  /** Optional mode: 'docked-right' for lateral drawer, 'overlay' for floating centered modal */
  mode?: "docked-right" | "overlay";
};

export default function InteractiveSubtitles({
  item,
  currentTimeSec,
  durationSec,
  isPlaying,
  onSeek,
  onClose,
  mode = "docked-right",
}: InteractiveSubtitlesProps) {
  const [subtitlesData, setSubtitlesData] = useState<SubtitlesResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "arabic" | "translation">("all");
  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg">("md");

  // Gemini AI Translation
  const [isTranslationEnabled, setIsTranslationEnabled] = useState(false);
  const [targetLang, setTargetLang] = useState<string>("fr");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translationsMap, setTranslationsMap] = useState<Record<string, string>>({});
  const [translationNotice, setTranslationNotice] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const userScrollTimeoutRef = useRef<any>(null);

  // Load subtitles for the item
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetchSubtitlesForVideo(item, durationSec)
      .then((data) => {
        if (isMounted) {
          setSubtitlesData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load subtitles:", err);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [item.id, item.youtubeId, durationSec]);

  const rawLines: SubtitleLine[] = useMemo(() => {
    return subtitlesData?.lines || [];
  }, [subtitlesData]);

  // Handle translation
  const handleTranslate = useCallback(
    async (langCode: string, linesToTranslate: SubtitleLine[]) => {
      if (!linesToTranslate || linesToTranslate.length === 0) return;
      setTranslating(true);
      try {
        const resMap = await translateSubtitlesWithGemini(
          item.id || item.youtubeId,
          linesToTranslate,
          langCode,
          item.title
        );
        setTranslationsMap(resMap);
        const langObj = AVAILABLE_TRANSLATION_LANGUAGES.find((l) => l.code === langCode);
        setTranslationNotice(`Traduit en ${langObj?.name || langCode} via Gemini IA`);
        setTimeout(() => setTranslationNotice(null), 3000);
      } catch (err) {
        console.error("Translation failed:", err);
      } finally {
        setTranslating(false);
      }
    },
    [item.id, item.youtubeId, item.title]
  );

  const handleSelectLanguage = (code: string) => {
    setTargetLang(code);
    setShowLangMenu(false);
    setIsTranslationEnabled(true);
    handleTranslate(code, rawLines);
  };

  // Process lines with translation if enabled
  const lines: SubtitleLine[] = useMemo(() => {
    if (!isTranslationEnabled) return rawLines;
    return rawLines.map((l) => {
      const translated = translationsMap[l.id];
      if (translated) {
        return {
          ...l,
          text: translated,
          translation: translated,
        };
      }
      return l;
    });
  }, [rawLines, isTranslationEnabled, translationsMap]);

  // Find active line index based on playback time
  const activeIndex = useMemo(() => {
    if (!lines || lines.length === 0) return -1;
    let found = 0;
    for (let i = 0; i < lines.length; i++) {
      if (currentTimeSec >= lines[i].timeSec) {
        found = i;
      } else {
        break;
      }
    }
    return found;
  }, [lines, currentTimeSec]);

  // Filter lines by search query
  const filteredLines = useMemo(() => {
    if (!searchQuery.trim()) return lines;
    const q = searchQuery.toLowerCase().trim();
    return lines.filter(
      (l) =>
        l.text.toLowerCase().includes(q) ||
        (l.arabicText && l.arabicText.includes(q)) ||
        (l.translation && l.translation.toLowerCase().includes(q)) ||
        (l.verseNumber && `verset ${l.verseNumber}`.includes(q))
    );
  }, [lines, searchQuery]);

  // Scroll to active line
  const scrollToActive = useCallback((instant = false) => {
    if (!containerRef.current || !activeLineRef.current) return;
    const container = containerRef.current;
    const activeEl = activeLineRef.current;
    const targetScroll =
      activeEl.offsetTop - container.clientHeight / 2 + activeEl.clientHeight / 2;

    container.scrollTo({
      top: Math.max(0, targetScroll),
      behavior: instant ? "auto" : "smooth",
    });
  }, []);

  // Auto scroll effect
  useEffect(() => {
    if (autoScroll && !isUserInteracting && !searchQuery) {
      scrollToActive(false);
    }
  }, [activeIndex, autoScroll, isUserInteracting, searchQuery, scrollToActive]);

  const handleUserScroll = () => {
    setIsUserInteracting(true);
    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current);
    }
    userScrollTimeoutRef.current = setTimeout(() => {
      setIsUserInteracting(false);
    }, 4000);
  };

  const fmtTime = (sec: number) => {
    if (!sec || isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleSeekToLine = (timeSec: number) => {
    onSeek(timeSec);
    setIsUserInteracting(false);
    setTimeout(() => {
      scrollToActive(false);
    }, 100);
  };

  const handlePrevSegment = () => {
    if (activeIndex > 0 && lines[activeIndex - 1]) {
      handleSeekToLine(lines[activeIndex - 1].timeSec);
    }
  };

  const handleNextSegment = () => {
    if (activeIndex < lines.length - 1 && lines[activeIndex + 1]) {
      handleSeekToLine(lines[activeIndex + 1].timeSec);
    }
  };

  const handleReplaySegment = () => {
    if (activeIndex >= 0 && lines[activeIndex]) {
      handleSeekToLine(lines[activeIndex].timeSec);
    }
  };

  const activeLine = lines[activeIndex];

  return (
    <div
      className={`z-30 flex flex-col bg-zinc-950/95 backdrop-blur-2xl border-l border-white/15 shadow-2xl text-white transition-all overflow-hidden ${
        mode === "docked-right"
          ? "absolute top-0 right-0 bottom-0 w-full sm:w-[420px] md:w-[460px] h-full"
          : "relative w-full max-w-2xl max-h-[80vh] rounded-3xl border border-white/20"
      }`}
    >
      {/* Header */}
      <div className="flex-shrink-0 p-4 sm:p-5 border-b border-white/10 space-y-3 bg-zinc-900/60">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 flex-shrink-0">
              <Subtitles size={17} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight truncate">
                  Sous-titres & Segments
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-400/30 flex-shrink-0">
                  Interactif
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate">
                Cliquez sur un sous-titre pour naviguer dans la vidéo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Quick translate toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLangMenu((prev) => !prev)}
                className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                  isTranslationEnabled
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                    : "bg-white/5 text-zinc-400 hover:text-white border-white/10 hover:bg-white/10"
                }`}
                title="Traduire les sous-titres avec l'IA Gemini"
              >
                <Languages size={14} />
                <span className="text-[10px] uppercase font-bold">{targetLang}</span>
              </button>

              {showLangMenu && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-zinc-900/95 border border-white/15 rounded-2xl shadow-2xl p-1.5 z-50 backdrop-blur-xl">
                  <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                    Traduction instantanée
                  </div>
                  {AVAILABLE_TRANSLATION_LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => handleSelectLanguage(l.code)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors ${
                        targetLang === l.code && isTranslationEnabled
                          ? "bg-emerald-500/20 text-emerald-200 font-semibold"
                          : "text-zinc-300 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <span>
                        {l.flag} {l.name}
                      </span>
                      {targetLang === l.code && isTranslationEnabled && (
                        <Check size={13} className="text-emerald-300" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Font size toggle */}
            <button
              type="button"
              onClick={() =>
                setFontSize((curr) => (curr === "sm" ? "md" : curr === "md" ? "lg" : "sm"))
              }
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-bold transition-colors"
              title="Taille de police des sous-titres"
            >
              <span className="text-[11px] uppercase">
                {fontSize === "sm" ? "A-" : fontSize === "md" ? "A" : "A+"}
              </span>
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Fermer le volet des sous-titres"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Translation notice banner */}
        <AnimatePresence>
          {translationNotice && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs flex items-center gap-2 overflow-hidden"
            >
              <Sparkles size={13} className="text-emerald-300 animate-pulse flex-shrink-0" />
              <span className="truncate">{translationNotice}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search bar & quick segment controls */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un mot, un verset..."
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl bg-black/40 border border-white/15 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-400/50 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setAutoScroll((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all flex-shrink-0 border ${
              autoScroll
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                : "bg-white/5 text-zinc-400 border-white/10 hover:text-white"
            }`}
            title={
              autoScroll
                ? "Défilement automatique synchronisé : activé"
                : "Défilement automatique : désactivé (cliquer pour activer)"
            }
          >
            <ArrowDown size={13} className={autoScroll ? "text-emerald-300" : "text-zinc-500"} />
            <span className="text-[11px] hidden sm:inline">Suivi auto</span>
          </button>
        </div>

        {/* Fast Segment Navigation Bar */}
        <div className="flex items-center justify-between pt-1 text-xs text-zinc-400">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevSegment}
              disabled={activeIndex <= 0}
              className="p-1 rounded-lg hover:bg-white/10 text-zinc-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Segment précédent"
            >
              <SkipBack size={14} />
            </button>
            <button
              type="button"
              onClick={handleReplaySegment}
              className="p-1 rounded-lg hover:bg-white/10 text-zinc-300 transition-colors"
              title="Rejouer le segment actuel"
            >
              <RotateCcw size={13} />
            </button>
            <button
              type="button"
              onClick={handleNextSegment}
              disabled={activeIndex >= lines.length - 1}
              className="p-1 rounded-lg hover:bg-white/10 text-zinc-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Segment suivant"
            >
              <SkipForward size={14} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-400 font-mono">
              Segment <strong className="text-white">{activeIndex + 1}</strong> / {lines.length}
            </span>
            {isUserInteracting && (
              <button
                type="button"
                onClick={() => {
                  setIsUserInteracting(false);
                  scrollToActive(false);
                }}
                className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Recentrer</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Subtitles / Segments List */}
      <div
        ref={containerRef}
        onScroll={handleUserScroll}
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
      >
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-zinc-400">
            <Loader2 size={24} className="animate-spin text-emerald-400" />
            <p className="text-xs">Chargement et synchronisation des segments...</p>
          </div>
        ) : filteredLines.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2 text-zinc-400 text-center px-4">
            <Search size={24} className="text-zinc-500" />
            <p className="text-xs font-semibold">Aucun segment correspondant</p>
            <p className="text-[11px] text-zinc-500">
              Essayez un autre mot-clé ou réinitialisez la recherche
            </p>
          </div>
        ) : (
          filteredLines.map((line, idx) => {
            const isCurrent = lines[activeIndex]?.id === line.id;
            const hasPassed = lines[activeIndex] && line.timeSec < lines[activeIndex].timeSec;

            const textClasses =
              fontSize === "sm"
                ? "text-xs sm:text-sm"
                : fontSize === "lg"
                ? "text-base sm:text-lg"
                : "text-sm sm:text-base";

            return (
              <div
                key={line.id || idx}
                ref={isCurrent ? activeLineRef : null}
                onClick={() => handleSeekToLine(line.timeSec)}
                className={`group relative p-3 sm:p-3.5 rounded-2xl cursor-pointer transition-all duration-200 border ${
                  isCurrent
                    ? "bg-emerald-950/60 border-emerald-400/50 shadow-lg shadow-emerald-950/50 scale-[1.01]"
                    : "bg-zinc-900/40 hover:bg-zinc-850/80 border-white/5 hover:border-white/20"
                }`}
              >
                {/* Active pulse bar on left */}
                {isCurrent && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-400 rounded-r-full shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                )}

                <div className="flex items-start justify-between gap-3">
                  {/* Timestamp clickable badge */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold transition-all ${
                        isCurrent
                          ? "bg-emerald-400 text-zinc-950 shadow-sm"
                          : "bg-black/50 text-zinc-400 group-hover:text-emerald-300 group-hover:bg-emerald-500/10 border border-white/10"
                      }`}
                    >
                      <Play
                        size={9}
                        className={isCurrent ? "fill-zinc-950" : "fill-current opacity-70"}
                      />
                      <span>{fmtTime(line.timeSec)}</span>
                    </span>

                    {line.verseNumber && (
                      <span className="text-[10px] text-emerald-300/80 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 font-medium">
                        V.{line.verseNumber}
                      </span>
                    )}
                  </div>

                  {isCurrent && (
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-400/15 px-2 py-0.5 rounded-full border border-emerald-400/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      <span>En cours</span>
                    </div>
                  )}
                </div>

                {/* Subtitle Content (Arabic, translation, text) */}
                <div className="mt-2 space-y-1.5">
                  {/* Arabic text if Quranic recitation */}
                  {line.arabicText && (
                    <p
                      dir="rtl"
                      className="text-right font-serif text-base sm:text-lg leading-relaxed text-amber-200/95 font-medium select-text"
                    >
                      {line.arabicText}
                    </p>
                  )}

                  {/* Primary text / French translation */}
                  <p
                    className={`${textClasses} leading-relaxed transition-colors select-text ${
                      isCurrent
                        ? "text-white font-semibold drop-shadow-sm"
                        : hasPassed
                        ? "text-zinc-300 group-hover:text-white"
                        : "text-zinc-400 group-hover:text-zinc-200"
                    }`}
                  >
                    {line.translation || line.text}
                  </p>

                  {/* Phonetic transcription if available */}
                  {line.phonetic && (
                    <p className="text-xs italic text-zinc-400/90 font-sans">
                      {line.phonetic}
                    </p>
                  )}
                </div>

                {/* Hover hint */}
                <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <span>Sauter à ce segment</span>
                    <ChevronRight size={10} />
                  </span>
                  {line.durationSec && <span>Durée ~{Math.round(line.durationSec)}s</span>}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer / Active segment summary */}
      <div className="p-3 border-t border-white/10 bg-zinc-900/80 flex items-center justify-between text-xs">
        <div className="min-w-0 flex-1 pr-2">
          {activeLine ? (
            <p className="text-zinc-300 text-[11px] truncate">
              <span className="text-emerald-400 font-semibold mr-1">
                [{fmtTime(activeLine.timeSec)}]
              </span>
              {activeLine.translation || activeLine.text}
            </p>
          ) : (
            <p className="text-zinc-500 text-[11px]">En attente de segment...</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => scrollToActive(false)}
          className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold whitespace-nowrap pl-2 border-l border-white/10"
        >
          Repositionner
        </button>
      </div>
    </div>
  );
}

export type VideoSubtitleBannerProps = {
  item: ContentItem;
  currentTimeSec: number;
  durationSec: number;
  onSeek: (seconds: number) => void;
  onOpenSegmentsPanel: () => void;
  isPanelOpen?: boolean;
};

/**
 * On-video interactive subtitle banner that displays the current segment's text
 * directly on the video and allows seeking to the segment start or jumping segments on click.
 */
export function VideoSubtitleBanner({
  item,
  currentTimeSec,
  durationSec,
  onSeek,
  onOpenSegmentsPanel,
  isPanelOpen = false,
}: VideoSubtitleBannerProps) {
  const [subtitles, setSubtitles] = useState<SubtitlesResult | null>(null);

  useEffect(() => {
    let active = true;
    fetchSubtitlesForVideo(item, durationSec)
      .then((data) => {
        if (active) setSubtitles(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [item.id, item.youtubeId, durationSec]);

  const lines = subtitles?.lines || [];

  const activeIndex = useMemo(() => {
    if (!lines || lines.length === 0) return -1;
    let found = -1;
    for (let i = 0; i < lines.length; i++) {
      if (currentTimeSec >= lines[i].timeSec) {
        found = i;
      } else {
        break;
      }
    }
    return found;
  }, [lines, currentTimeSec]);

  const activeLine = activeIndex >= 0 ? lines[activeIndex] : null;

  if (!activeLine) return null;

  const fmtTime = (sec: number) => {
    if (!sec || isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={`absolute left-1/2 -translate-x-1/2 z-25 max-w-[92vw] sm:max-w-2xl transition-all duration-300 pointer-events-auto ${
        isPanelOpen
          ? "bottom-24 sm:bottom-28 lg:right-[480px] lg:left-auto lg:translate-x-0"
          : "bottom-24 sm:bottom-28"
      }`}
    >
      <div className="group relative flex flex-col items-center">
        {/* Hover mini toolbar */}
        <div className="mb-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/85 backdrop-blur-md border border-white/20 text-white text-[11px] shadow-xl">
          {activeIndex > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSeek(lines[activeIndex - 1].timeSec);
              }}
              className="hover:text-emerald-300 p-0.5 rounded transition-colors flex items-center gap-0.5"
              title="Segment précédent"
            >
              <SkipBack size={12} />
              <span className="text-[10px] hidden sm:inline">Précédent</span>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSeek(activeLine.timeSec);
            }}
            className="hover:text-emerald-300 p-0.5 rounded transition-colors flex items-center gap-0.5 text-emerald-400 font-medium"
            title="Recommencer ce segment"
          >
            <RotateCcw size={11} />
            <span className="text-[10px] font-mono">[{fmtTime(activeLine.timeSec)}]</span>
          </button>

          {activeIndex < lines.length - 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSeek(lines[activeIndex + 1].timeSec);
              }}
              className="hover:text-emerald-300 p-0.5 rounded transition-colors flex items-center gap-0.5"
              title="Segment suivant"
            >
              <span className="text-[10px] hidden sm:inline">Suivant</span>
              <SkipForward size={12} />
            </button>
          )}

          <div className="w-px h-3 bg-white/20 mx-0.5" />

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenSegmentsPanel();
            }}
            className="hover:text-emerald-300 p-0.5 rounded transition-colors flex items-center gap-1 font-semibold text-emerald-300"
            title="Ouvrir la liste de tous les segments"
          >
            <Subtitles size={12} />
            <span className="text-[10px]">Voir tous les segments</span>
          </button>
        </div>

        {/* Clickable subtitle text banner */}
        <button
          type="button"
          onClick={() => onSeek(activeLine.timeSec)}
          className="text-center px-4 sm:px-6 py-2 sm:py-2.5 rounded-2xl bg-black/80 hover:bg-black/90 border border-white/20 hover:border-emerald-400/50 backdrop-blur-xl shadow-2xl transition-all duration-200 cursor-pointer active:scale-98 text-left group/text"
          title="Cliquer pour rejouer ce segment, ou survolez pour naviguer"
        >
          {activeLine.arabicText && (
            <p
              dir="rtl"
              className="text-center font-serif text-base sm:text-xl font-medium text-amber-200 leading-relaxed mb-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
            >
              {activeLine.arabicText}
            </p>
          )}
          <p className="text-center text-xs sm:text-base font-semibold text-white leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] group-hover/text:text-emerald-200 transition-colors">
            {activeLine.translation || activeLine.text}
          </p>

          <span className="block text-center text-[10px] text-emerald-400/90 mt-1 font-mono tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
            ⏱ {fmtTime(activeLine.timeSec)} · Cliquez pour revenir au début du segment
          </span>
        </button>
      </div>
    </div>
  );
}

