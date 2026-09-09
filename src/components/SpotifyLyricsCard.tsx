import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Subtitles,
  X,
  Languages,
  Sparkles,
  Volume2,
  Check,
  Search,
  ExternalLink,
  ChevronDown,
  Loader2,
  FileText,
  RotateCcw,
  Radio,
  Globe,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ContentItem } from "@/data/catalog";
import {
  fetchSubtitlesForVideo,
  SubtitleLine,
  SubtitleTrack,
  SubtitlesResult,
  translateSubtitlesWithGemini,
  AVAILABLE_TRANSLATION_LANGUAGES,
} from "@/lib/subtitlesService";

type SpotifyLyricsCardProps = {
  item: ContentItem;
  currentTimeSec: number;
  durationSec: number;
  onSeek: (seconds: number) => void;
  onClose: () => void;
};

export default function SpotifyLyricsCard({
  item,
  currentTimeSec,
  durationSec,
  onSeek,
  onClose,
}: SpotifyLyricsCardProps) {
  const [activeTab, setActiveTab] = useState<"all" | "arabic" | "translation">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subtitlesData, setSubtitlesData] = useState<SubtitlesResult | null>(null);

  // Gemini Translation State
  const [isTranslationEnabled, setIsTranslationEnabled] = useState(false);
  const [targetLang, setTargetLang] = useState<string>("fr");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translationsMap, setTranslationsMap] = useState<Record<string, string>>({});
  const [translationSuccessNotice, setTranslationSuccessNotice] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const userScrollTimeoutRef = useRef<any>(null);

  // Fetch true synchronized subtitles for the active video
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetchSubtitlesForVideo(item, durationSec)
      .then((res) => {
        if (isMounted) {
          setSubtitlesData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Subtitles load error:", err);
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

  // Handle Gemini Translation
  const handleTriggerTranslation = useCallback(
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
        const selectedObj = AVAILABLE_TRANSLATION_LANGUAGES.find((l) => l.code === langCode);
        setTranslationSuccessNotice(`Traduit en ${selectedObj?.name || langCode} via Gemini IA`);
        setTimeout(() => setTranslationSuccessNotice(null), 3500);
      } catch (err) {
        console.error("Failed to translate with Gemini:", err);
      } finally {
        setTranslating(false);
      }
    },
    [item.id, item.youtubeId, item.title]
  );

  // Whenever user enables translation or changes language, trigger Gemini translation if not cached
  const handleToggleTranslation = (enabled?: boolean) => {
    const nextState = enabled !== undefined ? enabled : !isTranslationEnabled;
    setIsTranslationEnabled(nextState);
    if (nextState && Object.keys(translationsMap).length === 0 && rawLines.length > 0) {
      handleTriggerTranslation(targetLang, rawLines);
    }
  };

  const handleSelectLanguage = (code: string) => {
    setTargetLang(code);
    setShowLangMenu(false);
    setIsTranslationEnabled(true);
    handleTriggerTranslation(code, rawLines);
  };

  // Process lines with Gemini translation applied if enabled
  const lines: SubtitleLine[] = useMemo(() => {
    if (!isTranslationEnabled) return rawLines;
    return rawLines.map((l) => {
      const translatedText = translationsMap[l.id];
      if (translatedText) {
        return {
          ...l,
          text: translatedText,
          originalText: l.text,
        };
      }
      return l;
    });
  }, [rawLines, isTranslationEnabled, translationsMap]);

  // Find active line index based on current playback audio time
  const activeIndex = useMemo(() => {
    if (!lines || lines.length === 0) return 0;
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

  // Calculate active line progress percentage (0% -> 100%) as audio plays
  const activeLineProgress = useMemo(() => {
    if (!lines || lines.length === 0 || activeIndex < 0 || activeIndex >= lines.length) return 0;
    const currentLine = lines[activeIndex];
    const nextLine = lines[activeIndex + 1];
    const start = currentLine.timeSec;
    const end = nextLine ? nextLine.timeSec : start + (currentLine.durationSec || 6);
    const lineDuration = Math.max(1, end - start);
    const elapsed = currentTimeSec - start;
    return Math.min(100, Math.max(0, (elapsed / lineDuration) * 100));
  }, [lines, activeIndex, currentTimeSec]);

  // Smooth container scrolling centered on active line
  const scrollToActiveLine = useCallback((instant = false) => {
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

  // Real-time automatic scrolling following audio time
  useEffect(() => {
    if (!isUserInteracting && !searchQuery) {
      scrollToActiveLine(false);
    }
  }, [activeIndex, isUserInteracting, searchQuery, scrollToActiveLine]);

  // Handle user manual scroll / pause auto-follow temporarily
  const handleUserScroll = () => {
    setIsUserInteracting(true);
    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current);
    }
    userScrollTimeoutRef.current = setTimeout(() => {
      setIsUserInteracting(false);
    }, 3500);
  };

  const handleResumeAutoFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUserInteracting(false);
    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current);
    }
    scrollToActiveLine(false);
  };

  const filteredLines = useMemo(() => {
    if (!searchQuery.trim()) return lines;
    const q = searchQuery.toLowerCase();
    return lines.filter(
      (l) =>
        l.text.toLowerCase().includes(q) ||
        (l.arabicText && l.arabicText.includes(q)) ||
        (l.phonetic && l.phonetic.toLowerCase().includes(q)) ||
        (l.translation && l.translation.toLowerCase().includes(q))
    );
  }, [lines, searchQuery]);

  const hasArabic = useMemo(() => lines.some((l) => Boolean(l.arabicText)), [lines]);
  const activeLangObj = useMemo(
    () => AVAILABLE_TRANSLATION_LANGUAGES.find((l) => l.code === targetLang) || AVAILABLE_TRANSLATION_LANGUAGES[0],
    [targetLang]
  );

  const sourceBadgeText = useMemo(() => {
    if (isTranslationEnabled) {
      return `Traduit par Gemini IA (${activeLangObj.name})`;
    }
    if (!subtitlesData) return "Sous-titres";
    if (subtitlesData.source === "youtube_captions") return "Sous-titres officiels synchronisés";
    if (subtitlesData.source === "quran_recitation_db") return "Coran vérifié & Traduction";
    return "Dialogue synchronisé";
  }, [isTranslationEnabled, activeLangObj, subtitlesData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.96 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="relative w-full max-w-lg mx-auto bg-gradient-to-b from-zinc-900/95 via-zinc-950/98 to-black rounded-3xl border border-emerald-500/30 shadow-2xl shadow-emerald-950/40 backdrop-blur-2xl flex flex-col overflow-hidden text-left max-h-[380px] sm:max-h-[440px] ring-1 ring-emerald-500/20"
    >
      {/* Header Style Spotify */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/[0.03] flex-shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider shadow-sm flex-shrink-0">
            <Radio size={12} className="text-emerald-400 animate-pulse" />
            <span>DIRECT</span>
          </div>

          {/* Translation Toggle & Language Selector Button */}
          <div className="flex items-center gap-1 bg-zinc-800/80 p-0.5 rounded-lg border border-white/10">
            <button
              type="button"
              onClick={() => handleToggleTranslation(false)}
              className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
                !isTranslationEnabled
                  ? "bg-zinc-700 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
              title="Afficher le texte d'origine"
            >
              Original
            </button>
            <button
              type="button"
              onClick={() => handleToggleTranslation(true)}
              className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded transition-all ${
                isTranslationEnabled
                  ? "bg-emerald-500 text-zinc-950 shadow-sm"
                  : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              }`}
              title="Traduire en temps réel avec Gemini IA"
            >
              <Sparkles size={11} className={translating ? "animate-spin text-zinc-950" : ""} />
              <span>Traduction IA</span>
            </button>
          </div>

          {/* Language Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLangMenu((v) => !v)}
              className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded border transition-colors ${
                isTranslationEnabled
                  ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/80"
                  : "bg-zinc-800/60 border-white/10 text-zinc-400 hover:text-white"
              }`}
              title="Changer la langue de traduction"
            >
              <span>{activeLangObj.flag}</span>
              <span className="hidden md:inline">{activeLangObj.name}</span>
              <ChevronDown size={11} className="text-zinc-400" />
            </button>

            {showLangMenu && (
              <div className="absolute top-full left-0 mt-1.5 w-36 bg-zinc-950 border border-white/20 rounded-xl shadow-2xl py-1 z-50 backdrop-blur-xl">
                <div className="px-2.5 py-1 text-[9px] font-bold text-zinc-500 uppercase tracking-wider border-b border-white/10 flex items-center gap-1">
                  <Languages size={10} />
                  <span>Traduire vers</span>
                </div>
                {AVAILABLE_TRANSLATION_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelectLanguage(lang.code)}
                    className={`w-full flex items-center justify-between px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      targetLang === lang.code && isTranslationEnabled
                        ? "bg-emerald-500/20 text-emerald-300 font-bold"
                        : "text-zinc-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </span>
                    {targetLang === lang.code && isTranslationEnabled && (
                      <Check size={12} className="text-emerald-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Arabic / French tabs when Quranic verses are available */}
          {hasArabic && (
            <div className="hidden lg:flex items-center gap-0.5 bg-zinc-900/60 p-0.5 rounded-lg border border-white/5">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-1.5 py-0.5 text-[9px] font-semibold rounded ${
                  activeTab === "all" ? "bg-zinc-700 text-white" : "text-zinc-400"
                }`}
              >
                Complet
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("arabic")}
                className={`px-1.5 py-0.5 text-[9px] font-semibold rounded ${
                  activeTab === "arabic" ? "bg-zinc-700 text-white" : "text-zinc-400"
                }`}
              >
                Arabe
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Quick search input */}
          <div className="relative hidden sm:block">
            <input
              type="text"
              placeholder="Filtrer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-20 focus:w-28 transition-all bg-white/5 border border-white/10 rounded-full px-2 py-0.5 text-[11px] text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition-colors shadow-sm"
            title="Fermer"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Translation Toast Feedback */}
      <AnimatePresence>
        {translationSuccessNotice && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-emerald-950/90 border-b border-emerald-500/30 px-4 py-1 flex items-center justify-between text-[11px] text-emerald-300 font-medium"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles size={12} className="text-emerald-400" />
              <span>{translationSuccessNotice}</span>
            </span>
            <button
              onClick={() => setTranslationSuccessNotice(null)}
              className="text-emerald-400/60 hover:text-emerald-200"
            >
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading state or Subtitle stream */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[220px]">
          <Loader2 size={28} className="text-emerald-400 animate-spin mb-3" />
          <p className="text-white text-sm font-semibold">Extraction des sous-titres officiels...</p>
          <p className="text-zinc-500 text-xs mt-1">Synchronisation au flux audio</p>
        </div>
      ) : translating && filteredLines.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[220px]">
          <Sparkles size={28} className="text-emerald-400 animate-bounce mb-3" />
          <p className="text-white text-sm font-semibold">Traduction Gemini IA en temps réel...</p>
          <p className="text-emerald-400/80 text-xs mt-1">Génération des sous-titres en {activeLangObj.name}</p>
        </div>
      ) : filteredLines.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[220px]">
          <FileText size={32} className="text-zinc-600 mb-2" />
          <p className="text-zinc-400 text-sm font-semibold">Aucun sous-titre trouvé</p>
          <p className="text-zinc-600 text-xs mt-1">La vidéo ne comporte pas encore de piste transcrite</p>
        </div>
      ) : (
        /* Subtitles Scrollable Stream */
        <div
          ref={containerRef}
          onWheel={handleUserScroll}
          onTouchMove={handleUserScroll}
          className="relative flex-1 overflow-y-auto px-5 py-6 space-y-4 select-text scroll-smooth"
          style={{ scrollbarWidth: "thin" }}
        >
          {filteredLines.map((line, idx) => {
            const isCurrent = idx === activeIndex && !searchQuery;
            const isPast = idx < activeIndex && !searchQuery;
            const isTranslatedLine = isTranslationEnabled && Boolean(translationsMap[line.id]);

            return (
              <motion.div
                key={line.id}
                ref={isCurrent ? activeLineRef : null}
                onClick={() => {
                  onSeek(line.timeSec);
                  setIsUserInteracting(false);
                }}
                whileHover={{ scale: 1.01 }}
                className={`relative p-4 rounded-2xl transition-all duration-300 cursor-pointer group overflow-hidden ${
                  isCurrent
                    ? "bg-gradient-to-r from-emerald-500/25 via-emerald-600/15 to-transparent border border-emerald-500/50 text-white shadow-xl shadow-emerald-950/60 ring-1 ring-emerald-400/30 scale-[1.02]"
                    : isPast
                    ? "text-zinc-400 opacity-60 hover:opacity-90 hover:bg-white/5"
                    : "text-zinc-500 opacity-40 hover:opacity-80 hover:bg-white/5"
                }`}
              >
                {/* Active Line Progress Background Bar */}
                {isCurrent && (
                  <div
                    className="absolute bottom-0 left-0 top-0 bg-emerald-500/10 transition-all duration-150 ease-linear pointer-events-none"
                    style={{ width: `${activeLineProgress}%` }}
                  />
                )}

                <div className="relative z-10 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Header line metadata */}
                    <div className="flex items-center gap-2 mb-1">
                      {line.speaker && (
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">
                          {line.speaker}
                        </span>
                      )}
                      {isTranslatedLine && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/30">
                          <Sparkles size={9} />
                          <span>Gemini ({activeLangObj.code.toUpperCase()})</span>
                        </span>
                      )}
                    </div>

                    {/* Arabic Verse / Heading */}
                    {line.arabicText && activeTab !== "translation" && (
                      <p
                        dir="rtl"
                        className={`font-serif text-lg sm:text-xl leading-relaxed text-right mb-1.5 transition-all ${
                          isCurrent
                            ? "text-emerald-200 font-black drop-shadow-[0_2px_12px_rgba(16,185,129,0.5)] scale-[1.01]"
                            : "text-zinc-300/80 group-hover:text-white"
                        }`}
                      >
                        {line.arabicText}
                      </p>
                    )}

                    {/* Translation / Real spoken dialogue line */}
                    {activeTab !== "arabic" && (
                      <p
                        className={`text-sm sm:text-base leading-relaxed transition-all ${
                          isCurrent
                            ? "text-white font-bold text-shadow-sm tracking-wide"
                            : "text-zinc-300 group-hover:text-zinc-100 font-medium"
                        }`}
                      >
                        {line.text}
                      </p>
                    )}

                    {/* Original subtitle preview when translated */}
                    {isTranslatedLine && (line as any).originalText && (line as any).originalText !== line.text && (
                      <p className="text-[11px] text-zinc-500 mt-1 italic group-hover:text-zinc-400 transition-colors">
                        VO: {(line as any).originalText}
                      </p>
                    )}

                    {/* Phonetic transliteration if present */}
                    {line.phonetic && activeTab === "all" && !isTranslationEnabled && (
                      <p className="text-xs text-emerald-300/70 italic mt-1 font-mono">
                        {line.phonetic}
                      </p>
                    )}
                  </div>

                  {/* Audio Equalizer visual for current line */}
                  {isCurrent && (
                    <div className="flex items-center gap-0.5 pt-1 flex-shrink-0">
                      <span className="w-1 h-3.5 bg-emerald-400 rounded-full animate-[bounce_0.7s_ease-in-out_infinite]" />
                      <span className="w-1 h-5 bg-emerald-400 rounded-full animate-[bounce_0.5s_ease-in-out_infinite_0.15s]" />
                      <span className="w-1 h-2.5 bg-emerald-400 rounded-full animate-[bounce_0.8s_ease-in-out_infinite_0.3s]" />
                    </div>
                  )}
                </div>

                {/* Timestamp & Verse index bar on hover */}
                <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Verset #{line.verseNumber || idx + 1}</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {Math.floor(line.timeSec / 60)}:
                    {(line.timeSec % 60).toString().padStart(2, "0")}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Floating "Reprendre le défilement auto" when user scrolls away */}
      <AnimatePresence>
        {isUserInteracting && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30"
          >
            <button
              type="button"
              onClick={handleResumeAutoFollow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold shadow-lg shadow-emerald-950/60 transition-all hover:scale-105 cursor-pointer"
            >
              <RotateCcw size={12} className="text-zinc-950" />
              <span>Suivre le direct de l'audio</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spotify Footer Information Bar */}
      <div className="px-4 py-2.5 border-t border-white/10 bg-black/80 flex items-center justify-between text-[11px] text-zinc-400 flex-shrink-0">
        <span className="flex items-center gap-1.5 truncate pr-2">
          {translating ? (
            <Loader2 size={12} className="text-emerald-400 animate-spin flex-shrink-0" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          )}
          <span className="truncate text-emerald-300/90 font-medium">
            {translating ? "Traduction Gemini en cours..." : sourceBadgeText}
          </span>
        </span>

        <button
          type="button"
          onClick={() => handleToggleTranslation()}
          className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-[10px] font-bold underline cursor-pointer"
        >
          {isTranslationEnabled ? "Revenir à la VO" : "Traduire avec Gemini IA"}
        </button>
      </div>
    </motion.div>
  );
}
