import React from "react";
import { Headphones, Sparkles, Volume2, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DubbingSegment, DUBBING_LANGUAGES } from "@/lib/audioDubbingService";

export type DubbingLiveOverlayProps = {
  activeLanguage: string;
  isSpeaking: boolean;
  currentSegment: DubbingSegment | null;
  loadingTrack: boolean;
  onOpenDrawer: () => void;
  onCloseOverlay: () => void;
};

export default function DubbingLiveOverlay({
  activeLanguage,
  isSpeaking,
  currentSegment,
  loadingTrack,
  onOpenDrawer,
  onCloseOverlay,
}: DubbingLiveOverlayProps) {
  if (activeLanguage === "off") return null;

  const currentLang =
    DUBBING_LANGUAGES.find((l) => l.code === activeLanguage) || DUBBING_LANGUAGES[0];

  return (
    <AnimatePresence>
      {(isSpeaking || loadingTrack || currentSegment) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="absolute top-4 left-4 sm:left-6 z-30 max-w-[85%] sm:max-w-lg pointer-events-auto"
        >
          <div className="p-2.5 sm:p-3 rounded-2xl bg-zinc-950/85 backdrop-blur-xl border border-emerald-500/30 shadow-2xl flex items-start gap-3">
            {/* Animated Soundwave / Icon */}
            <div
              onClick={onOpenDrawer}
              className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 flex-shrink-0 mt-0.5 cursor-pointer hover:scale-105 transition-transform"
              title="Cliquer pour configurer les pistes audio et le doublage"
            >
              {isSpeaking ? (
                <div className="flex items-center gap-0.5 h-3.5">
                  <span className="w-0.5 bg-emerald-400 rounded-full animate-[pulse_0.5s_infinite_100ms] h-full" />
                  <span className="w-0.5 bg-emerald-400 rounded-full animate-[pulse_0.7s_infinite_300ms] h-2/3" />
                  <span className="w-0.5 bg-emerald-400 rounded-full animate-[pulse_0.6s_infinite_200ms] h-full" />
                </div>
              ) : (
                <Headphones size={15} />
              )}
            </div>

            {/* Spoken content */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 flex items-center gap-1">
                  <span>{currentLang.flag}</span>
                  <span>{currentLang.badge}</span>
                </span>
                {isSpeaking && (
                  <span className="text-[10px] text-emerald-400/90 font-semibold tracking-wide flex items-center gap-1 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    En direct
                  </span>
                )}
                {loadingTrack && (
                  <span className="text-[10px] text-amber-300 font-semibold">
                    Traduction & synchronisation...
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-white font-medium leading-snug drop-shadow-sm select-text line-clamp-2">
                {currentSegment ? currentSegment.text : "Piste audio synchronisée active..."}
              </p>
            </div>

            {/* Quick action buttons */}
            <button
              onClick={onCloseOverlay}
              className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
              title="Masquer ce bandeau"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
