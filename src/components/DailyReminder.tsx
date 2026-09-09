import { useMemo } from "react";
import { Sparkles, X } from "lucide-react";
import { getDailyReminder } from "@/data/dailyReminders";

type DailyReminderProps = {
  compact?: boolean;
  onClose?: () => void;
  onOpenModal?: () => void;
};

export default function DailyReminder({ compact = false, onClose, onOpenModal }: DailyReminderProps) {
  const reminder = useMemo(() => getDailyReminder(), []);

  if (compact) {
    return (
      <div
        onClick={onOpenModal}
        className="flex items-center justify-between gap-3 sm:gap-4 rounded-2xl liquid-glass px-4 py-3 cursor-pointer hover:bg-emerald-400/15 transition-all h-full border border-emerald-300/30"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Sparkles size={18} className="text-emerald-300 flex-shrink-0 animate-pulse" />
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-300/90">
              Rappel du jour • {reminder.reference}
            </p>
            <p className="text-xs sm:text-sm text-zinc-100 truncate">
              « {reminder.translation} »
            </p>
          </div>
        </div>
        <span className="text-[11px] text-emerald-200 bg-emerald-400/15 border border-emerald-300/30 px-2.5 py-1 rounded-full whitespace-nowrap hidden sm:inline flex-shrink-0 shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)]">
          Lire le verset
        </span>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md px-4">
      <div className="relative w-full max-w-xl rounded-2xl liquid-glass-modal p-6 sm:p-8 text-white shadow-2xl border border-emerald-300/30">
        {onClose && (
          <button onClick={onClose} className="absolute right-4 top-4 text-emerald-300 hover:text-white bg-emerald-400/15 hover:bg-emerald-400/25 p-1.5 rounded-full border border-emerald-300/30 transition-colors" aria-label="Fermer le rappel">
            <X size={18} />
          </button>
        )}
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300 flex items-center gap-2">
          <Sparkles size={14} />
          Rappel & Méditation du jour
        </p>
        <h2 className="mb-6 text-xl sm:text-2xl font-bold text-white">{reminder.reference}</h2>

        {reminder.arabic && (
          <p dir="rtl" lang="ar" className="mb-6 text-right font-serif text-2xl sm:text-3xl leading-loose text-zinc-100">
            {reminder.arabic}
          </p>
        )}

        <blockquote className="mb-6 rounded-2xl border-l-2 border-emerald-400 bg-emerald-400/10 backdrop-blur-xl p-4 sm:p-5 text-sm sm:text-base leading-relaxed text-zinc-100 border border-emerald-300/25 shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)]">
          « {reminder.translation} »
        </blockquote>

        <div className="flex items-center justify-between text-xs text-zinc-400 border-t border-zinc-800/80 pt-4">
          <span className="text-zinc-400 font-medium">Source : {reminder.reference}</span>
          <span className="text-zinc-500">Mis à jour chaque jour</span>
        </div>
      </div>
    </div>
  );
}
