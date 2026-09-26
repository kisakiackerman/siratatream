import { useState } from "react";
import { Moon, X, Check, Clock, Plus, Timer, Zap } from "lucide-react";

export interface SleepTimerPreset {
  label: string;
  minutes: number | null;
  description?: string;
}

export const SLEEP_TIMER_PRESETS: SleepTimerPreset[] = [
  { label: "5 min", minutes: 5 },
  { label: "10 min", minutes: 10 },
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "1 heure", minutes: 60 },
  { label: "1h30", minutes: 90 },
  { label: "2 heures", minutes: 120 },
  { label: "Fin de la vidéo", minutes: -1, description: "Arrête dès la fin" },
];

interface SleepTimerMenuProps {
  sleepTimer: number | null;
  sleepTimeRemaining: number | null;
  onSelect: (minutes: number | null) => void;
  onExtend: (minutes: number) => void;
  onClose: () => void;
  formatSleepTime: (seconds: number) => string;
  align?: "left" | "right" | "center";
}

export default function SleepTimerMenu({
  sleepTimer,
  sleepTimeRemaining,
  onSelect,
  onExtend,
  onClose,
  formatSleepTime,
  align = "right",
}: SleepTimerMenuProps) {
  const [customMinutes, setCustomMinutes] = useState("");

  const handleApplyCustom = () => {
    const val = parseInt(customMinutes, 10);
    if (!isNaN(val) && val > 0 && val <= 480) {
      onSelect(val);
      setCustomMinutes("");
    }
  };

  const alignClasses =
    align === "left"
      ? "left-0"
      : align === "center"
      ? "left-1/2 -translate-x-1/2"
      : "right-0";

  return (
    <>
      {/* Backdrop invisible pour fermeture fluide au clic extérieur */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />

      <div
        className={`absolute bottom-full ${alignClasses} mb-3 w-80 max-w-[92vw] liquid-glass-card backdrop-blur-2xl border border-white/20 rounded-3xl p-4 sm:p-5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 text-left`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
              <Moon size={16} />
            </div>
            <div>
              <h4 className="text-white font-extrabold text-sm">Minuteur de sommeil</h4>
              <p className="text-[10px] text-zinc-400">Arrêt automatique de la lecture</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
            title="Fermer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Bannière Active : Compte à rebours en direct + actions rapides */}
        {sleepTimer !== null && sleepTimeRemaining !== null && (
          <div className="mt-3.5 p-3 rounded-2xl bg-gradient-to-r from-emerald-950/70 to-zinc-900 border border-emerald-400/40 shadow-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-xs font-bold text-emerald-300">
                  {sleepTimer === -1 ? "Fin de la vidéo" : "Minuteur en cours"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/40">
                <Clock size={12} className="text-emerald-300" />
                <span className="text-xs font-mono font-black text-white">
                  {formatSleepTime(sleepTimeRemaining)}
                </span>
              </div>
            </div>

            {/* Boutons rapides pour prolonger ou annuler */}
            <div className="flex items-center gap-1.5 pt-1">
              <button
                onClick={() => onExtend(5)}
                className="flex-1 py-1.5 px-2 text-[11px] font-bold rounded-xl bg-white/[0.07] hover:bg-white/15 text-emerald-200 border border-white/10 transition-all flex items-center justify-center gap-1 active:scale-95"
                title="Ajouter 5 minutes"
              >
                <Plus size={11} />
                <span>5 min</span>
              </button>
              <button
                onClick={() => onExtend(15)}
                className="flex-1 py-1.5 px-2 text-[11px] font-bold rounded-xl bg-white/[0.07] hover:bg-white/15 text-emerald-200 border border-white/10 transition-all flex items-center justify-center gap-1 active:scale-95"
                title="Ajouter 15 minutes"
              >
                <Plus size={11} />
                <span>15 min</span>
              </button>
              <button
                onClick={() => onSelect(null)}
                className="flex-1 py-1.5 px-2 text-[11px] font-bold rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-all active:scale-95"
                title="Arrêter le minuteur"
              >
                Désactiver
              </button>
            </div>
          </div>
        )}

        {/* Grille des durées prédéfinies */}
        <div className="mt-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
              Choisir une durée
            </span>
            {sleepTimer !== null && (
              <button
                onClick={() => onSelect(null)}
                className="text-[10px] text-zinc-400 hover:text-rose-400 font-medium underline"
              >
                Annuler le minuteur
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {SLEEP_TIMER_PRESETS.map((preset) => {
              const isSelected = sleepTimer === preset.minutes;
              return (
                <button
                  key={preset.label}
                  onClick={() => onSelect(preset.minutes)}
                  className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
                    isSelected
                      ? "bg-emerald-500 text-black border-emerald-400 shadow-md font-extrabold shadow-emerald-500/20"
                      : "bg-white/[0.04] border-white/10 text-zinc-200 hover:bg-white/10 hover:text-white"
                  }`}
                  title={preset.description || preset.label}
                >
                  <span className="truncate w-full">{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Saisie personnalisée */}
        <div className="mt-3.5 pt-3 border-t border-white/10 space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
            Durée sur mesure
          </span>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                min="1"
                max="480"
                placeholder="Ex: 25"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleApplyCustom();
                }}
                className="w-full bg-white/[0.05] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-400 transition-colors"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">
                min
              </span>
            </div>
            <button
              onClick={handleApplyCustom}
              disabled={
                !customMinutes ||
                isNaN(Number(customMinutes)) ||
                Number(customMinutes) <= 0 ||
                Number(customMinutes) > 480
              }
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-black font-extrabold text-xs transition-all shadow-sm active:scale-95"
            >
              Valider
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
