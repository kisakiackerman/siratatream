import React, { useState } from "react";
import {
  X,
  Volume2,
  Languages,
  Sparkles,
  Check,
  Sliders,
  Mic,
  Headphones,
  Activity,
  Play,
  RotateCcw,
  VolumeX,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  DUBBING_LANGUAGES,
  DubbingSettings,
  DubbingSegment,
} from "@/lib/audioDubbingService";

export type AudioDubbingDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  settings: DubbingSettings;
  loadingTrack: boolean;
  isSpeaking: boolean;
  segmentsCount: number;
  availableVoices: SpeechSynthesisVoice[];
  onSelectLanguage: (langCode: string) => void;
  onSetDuckingLevel: (ducking: number) => void;
  onSetDubbingVolume: (vol: number) => void;
  onSetVoiceURI: (voiceURI: string) => void;
  onToggleOverlay: () => void;
};

export default function AudioDubbingDrawer({
  isOpen,
  onClose,
  settings,
  loadingTrack,
  isSpeaking,
  segmentsCount,
  availableVoices,
  onSelectLanguage,
  onSetDuckingLevel,
  onSetDubbingVolume,
  onSetVoiceURI,
  onToggleOverlay,
}: AudioDubbingDrawerProps) {
  const [testingVoice, setTestingVoice] = useState(false);

  if (!isOpen) return null;

  const currentLangObj =
    DUBBING_LANGUAGES.find((l) => l.code === settings.language) || DUBBING_LANGUAGES[0];

  const handleTestVoice = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    setTestingVoice(true);

    const testPhrases: Record<string, string> = {
      fr: "Ceci est un exemple de voix de doublage en français pour la vidéo.",
      en: "This is a preview of the artificial intelligence dubbed voice track.",
      ar: "هذا نموذج تجريبي للدبلجة الصوتية باللغة العربية لمشاهدة الفيديو.",
      es: "Esta es una muestra de la pista de doblaje en español.",
      de: "Dies ist eine Hörprobe der deutschen Synchronstimme.",
      tr: "Bu, videonun yapay zeka dublaj ses önizlemesidir.",
      it: "Questa è un'anteprima della voce di doppiaggio in italiano.",
      id: "Ini adalah pratinjau suara sulih suara dalam bahasa Indonesia.",
    };

    const phrase = testPhrases[settings.language] || testPhrases.fr;
    const utterance = new SpeechSynthesisUtterance(phrase);

    if (settings.voiceURI) {
      const voice = availableVoices.find((v) => v.voiceURI === settings.voiceURI);
      if (voice) utterance.voice = voice;
    }
    utterance.volume = (settings.volume || 95) / 100;
    utterance.rate = 1.0;

    utterance.onend = () => setTestingVoice(false);
    utterance.onerror = () => setTestingVoice(false);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex justify-end"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md h-full bg-zinc-950/95 border-l border-white/15 backdrop-blur-2xl text-white flex flex-col shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between flex-shrink-0 bg-gradient-to-r from-emerald-950/30 via-zinc-950 to-zinc-950">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                <Headphones size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-white tracking-tight">
                    Pistes Audio & Doublage
                  </h3>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <Sparkles size={10} /> IA YouTube
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Traduction vocale multilingue synchronisée en direct
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Fermer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
            {/* Status Card */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    settings.enabled
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-white/10 text-zinc-400"
                  }`}
                >
                  {isSpeaking ? (
                    <div className="flex items-center gap-0.5 h-4">
                      <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_100ms] h-full" />
                      <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_300ms] h-2/3" />
                      <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_200ms] h-full" />
                    </div>
                  ) : (
                    <Languages size={18} />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">
                      {settings.enabled ? currentLangObj.nativeName : "Piste audio d'origine"}
                    </p>
                    {isSpeaking && (
                      <span className="text-[10px] text-emerald-400 font-bold animate-pulse">
                        En cours d'élocution...
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    {loadingTrack
                      ? "Chargement et traduction IA en cours..."
                      : settings.enabled
                      ? `${segmentsCount} segments synchronisés disponibles`
                      : "Audio natif de la vidéo (sans doublage)"}
                  </p>
                </div>
              </div>

              {settings.enabled && (
                <button
                  onClick={handleTestVoice}
                  disabled={testingVoice}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
                  title="Écouter un échantillon vocal"
                >
                  <Play size={12} className={testingVoice ? "text-emerald-400 animate-spin" : ""} />
                  <span>Tester</span>
                </button>
              )}
            </div>

            {/* Language Selection List */}
            <div>
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2.5">
                Sélectionner la piste audio
              </label>

              <div className="space-y-1.5">
                {DUBBING_LANGUAGES.map((lang) => {
                  const isSelected = settings.language === lang.code;
                  return (
                    <button
                      key={lang.code}
                      onClick={() => onSelectLanguage(lang.code)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left ${
                        isSelected
                          ? "bg-emerald-500/15 border-emerald-400/50 shadow-md shadow-emerald-950/40"
                          : "bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-zinc-300 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xl flex-shrink-0">{lang.flag}</span>
                        <div className="truncate">
                          <p className={`text-sm font-semibold truncate ${isSelected ? "text-white font-bold" : ""}`}>
                            {lang.nativeName}
                          </p>
                          <p className="text-[11px] text-zinc-400">
                            {lang.code === "off" ? "Langue originale" : `Traduction vocale en ${lang.name}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isSelected
                              ? "bg-emerald-400/20 text-emerald-300 border-emerald-400/40"
                              : "bg-white/5 text-zinc-400 border-white/10"
                          }`}
                        >
                          {lang.badge}
                        </span>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center">
                            <Check size={14} className="stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Advanced Dubbing Options (if enabled) */}
            {settings.enabled && (
              <div className="space-y-4 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <Sliders size={15} className="text-emerald-400" />
                  <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                    Réglages audio du doublage
                  </h4>
                </div>

                {/* Audio Ducking (Attenuation of original audio) */}
                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">Atténuation vidéo originale (Ducking)</p>
                      <p className="text-[11px] text-zinc-400">
                        Baisse le volume de la vidéo quand la voix parle
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      {settings.duckingLevel}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={settings.duckingLevel}
                    onChange={(e) => onSetDuckingLevel(Number(e.target.value))}
                    className="w-full h-1.5 bg-white/20 accent-emerald-400 rounded-lg cursor-pointer"
                  />

                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {[
                      { label: "Ambiance (50%)", val: 50 },
                      { label: "Optimal (85%)", val: 85 },
                      { label: "Muet (100%)", val: 100 },
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => onSetDuckingLevel(preset.val)}
                        className={`py-1 text-[10px] font-semibold rounded-lg border transition-all ${
                          settings.duckingLevel === preset.val
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                            : "bg-white/5 text-zinc-400 border-white/10 hover:text-white"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dubbing Voice Volume */}
                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Volume2 size={16} className="text-emerald-400" />
                      <div>
                        <p className="text-xs font-bold text-white">Volume de la voix doublée</p>
                        <p className="text-[11px] text-zinc-400">Niveau sonore de l'interprétation vocale</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      {settings.volume}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={settings.volume}
                    onChange={(e) => onSetDubbingVolume(Number(e.target.value))}
                    className="w-full h-1.5 bg-white/20 accent-emerald-400 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Voice Selection (if browser offers multiple voices) */}
                {availableVoices.length > 1 && (
                  <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
                    <div className="flex items-center gap-2">
                      <Mic size={15} className="text-emerald-400" />
                      <p className="text-xs font-bold text-white">Voix du système ({availableVoices.length})</p>
                    </div>
                    <select
                      value={settings.voiceURI || ""}
                      onChange={(e) => onSetVoiceURI(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-400"
                    >
                      <option value="">Voix naturelle par défaut</option>
                      {availableVoices.map((v) => (
                        <option key={v.voiceURI} value={v.voiceURI}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Live Floating Dubbing Overlay Toggle */}
                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">Sous-titrage d'appoint en direct</p>
                    <p className="text-[11px] text-zinc-400">
                      Affiche la phrase actuellement doublée sur la vidéo
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.showOverlay}
                    onClick={onToggleOverlay}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      settings.showOverlay ? "bg-emerald-500 justify-end" : "bg-white/20 justify-start"
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="p-4 border-t border-white/10 bg-zinc-950 flex items-center justify-between text-xs text-zinc-400">
            <span>Raccourci clavier : <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-200 font-mono">D</kbd></span>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold transition-all shadow-md"
            >
              Appliquer
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
