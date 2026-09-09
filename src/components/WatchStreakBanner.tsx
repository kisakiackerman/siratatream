import { useMemo } from "react";
import { Flame, Calendar, Award, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { type StoredHistoryEntry } from "@/lib/watchHistory";
import { calculateWatchStreak, getLocalDateString } from "@/lib/watchStreak";

interface WatchStreakBannerProps {
  history: StoredHistoryEntry[];
  profileId?: string | null;
  compact?: boolean;
}

export default function WatchStreakBanner({ history, profileId, compact = false }: WatchStreakBannerProps) {
  const streak = useMemo(() => {
    return calculateWatchStreak(history, profileId);
  }, [history, profileId]);

  // Generate the last 7 days for the streak dot visualizer
  const last7Days = useMemo(() => {
    const days: { label: string; dateStr: string; isActive: boolean; isToday: boolean }[] = [];
    const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const dateStr = getLocalDateString(d);
      const dayName = dayNames[d.getDay()];
      days.push({
        label: i === 0 ? "Auj." : dayName,
        dateStr,
        isActive: streak.streakDates.includes(dateStr),
        isToday: i === 0,
      });
    }
    return days;
  }, [streak.streakDates]);

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full liquid-glass-emerald border border-emerald-400/30 shadow-sm">
        <Flame
          size={16}
          className={`${
            streak.currentStreak > 0 ? "text-amber-400 fill-amber-400 animate-pulse" : "text-zinc-400"
          }`}
        />
        <span className="text-xs font-bold text-white">
          {streak.currentStreak} {streak.currentStreak > 1 ? "jours" : "jour"}
        </span>
        {streak.isActiveToday && (
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        )}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl liquid-glass p-4 sm:p-5 border border-emerald-400/30 shadow-lg">
      {/* Background glow decoration */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-12 -mt-12" />
      <div className="absolute bottom-0 left-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none -ml-8 -mb-8" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left side: Flame + Streak counter + Message */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg transition-transform ${
              streak.currentStreak > 0
                ? "bg-gradient-to-br from-amber-500/30 via-orange-500/20 to-emerald-500/20 border border-amber-400/50 text-amber-400"
                : "liquid-glass-subtle text-zinc-500 border border-white/10"
            }`}
          >
            <Flame
              size={26}
              className={
                streak.currentStreak > 0
                  ? "text-amber-400 fill-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                  : "text-zinc-500"
              }
            />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-1.5">
                <span>{streak.currentStreak}</span>
                <span className="text-sm font-semibold text-zinc-300">
                  {streak.currentStreak > 1 ? "jours d'affilée" : "jour d'affilée"}
                </span>
              </h3>

              {streak.isActiveToday ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold inline-flex items-center gap-1">
                  <CheckCircle2 size={11} />
                  <span>Validé aujourd'hui</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold inline-flex items-center gap-1">
                  <Sparkles size={11} />
                  <span>À valider aujourd'hui</span>
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-emerald-200/90 font-medium mt-1">
              {streak.encouragement}
            </p>
          </div>
        </div>

        {/* Right side: 7-day dot progress tracker */}
        <div className="flex flex-col sm:items-end gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium">
            <Calendar size={13} className="text-zinc-400" />
            <span>7 derniers jours</span>
            {streak.bestStreak > 0 && (
              <span className="text-amber-400/80 ml-1.5 font-semibold text-[10px] bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                Record : {streak.bestStreak} j
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {last7Days.map((day) => (
              <div key={day.dateStr} className="flex flex-col items-center gap-1">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-[10px] font-bold transition-all ${
                    day.isActive
                      ? "bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.5)] border border-emerald-300"
                      : day.isToday
                      ? "liquid-glass-subtle border-2 border-dashed border-amber-400/60 text-amber-300"
                      : "liquid-glass-subtle text-zinc-500 border border-white/10"
                  }`}
                  title={`${day.dateStr} : ${day.isActive ? "Actif" : "Non visionné"}`}
                >
                  {day.isActive ? "✓" : day.isToday ? "•" : ""}
                </div>
                <span
                  className={`text-[9px] font-semibold ${
                    day.isToday ? "text-amber-300 font-bold" : "text-zinc-400"
                  }`}
                >
                  {day.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
