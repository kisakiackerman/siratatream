import { useState, useMemo } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ArrowLeftRight,
  Sparkles,
  Moon,
  Info,
  CalendarCheck,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  gregorianToHijri,
  hijriToGregorian,
  getHijriMonthDays,
  HIJRI_MONTHS,
  ISLAMIC_EVENTS,
  type HijriCalendarDay,
} from "@/lib/hijri";

type HijriCalendarProps = {
  onClose?: () => void;
};

type ViewMode = "calendar" | "converter" | "events";

export default function HijriCalendar({ onClose }: HijriCalendarProps) {
  const todayHijri = useMemo(() => gregorianToHijri(new Date()), []);
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");

  // Calendar State
  const [currentYear, setCurrentYear] = useState<number>(todayHijri.year);
  const [currentMonth, setCurrentMonth] = useState<number>(todayHijri.month);
  const [selectedDay, setSelectedDay] = useState<HijriCalendarDay | null>(null);

  // Converter State
  const [converterDirection, setConverterDirection] = useState<"miladiToHijri" | "hijriToMiladi">("miladiToHijri");
  const [miladiInputDate, setMiladiInputDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [hijriInputDay, setHijriInputDay] = useState<number>(todayHijri.day);
  const [hijriInputMonth, setHijriInputMonth] = useState<number>(todayHijri.month);
  const [hijriInputYear, setHijriInputYear] = useState<number>(todayHijri.year);

  // Month information
  const monthInfo = useMemo(() => {
    return HIJRI_MONTHS[currentMonth - 1] || HIJRI_MONTHS[0];
  }, [currentMonth]);

  // Month days list
  const monthDays = useMemo(() => {
    return getHijriMonthDays(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  // Gregorian range for the current hijri month
  const gregorianRange = useMemo(() => {
    if (monthDays.length === 0) return "";
    const firstDay = monthDays[0].gregorianDate;
    const lastDay = monthDays[monthDays.length - 1].gregorianDate;
    const fStr = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(firstDay);
    const lStr = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(lastDay);
    return `${fStr} — ${lStr}`;
  }, [monthDays]);

  // First day offset for weekly grid (0 = Dimanche, 1 = Lundi, etc.)
  const startDayOffset = useMemo(() => {
    if (monthDays.length === 0) return 0;
    return monthDays[0].gregorianDate.getUTCDay();
  }, [monthDays]);

  // Previous & Next Month handlers
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDay(null);
  };

  const handleGoToToday = () => {
    setCurrentYear(todayHijri.year);
    setCurrentMonth(todayHijri.month);
    setSelectedDay(null);
  };

  // Conversion calculations
  const convertedFromMiladi = useMemo(() => {
    if (!miladiInputDate) return null;
    const parts = miladiInputDate.split("-").map((p) => parseInt(p, 10));
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    const dateObj = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    return gregorianToHijri(dateObj);
  }, [miladiInputDate]);

  const convertedFromHijri = useMemo(() => {
    const greg = hijriToGregorian(hijriInputYear, hijriInputMonth, hijriInputDay);
    return gregorianToHijri(greg);
  }, [hijriInputYear, hijriInputMonth, hijriInputDay]);

  // Islamic Events with accurate dates
  const yearEvents = useMemo(() => {
    const now = Date.now();
    return ISLAMIC_EVENTS.map((event) => {
      const gregDate = hijriToGregorian(todayHijri.year, event.hijriMonth, event.hijriDay);
      const diffMs = gregDate.getTime() - now;
      const diffDays = Math.ceil(diffMs / 86400000);
      return {
        ...event,
        gregorianDate: gregDate,
        formattedMiladi: new Intl.DateTimeFormat("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }).format(gregDate),
        diffDays,
      };
    }).sort((a, b) => a.hijriMonth - b.hijriMonth || a.hijriDay - b.hijriDay);
  }, [todayHijri.year]);

  const WEEK_DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

  return (
    <div className="space-y-6 text-white pb-6">
      {/* Top Today Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 via-zinc-900/80 to-zinc-950 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Moon size={12} />
                Umm Al-Qura (Hijri - Miladi)
              </span>
              {todayHijri.isSacredMonth && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Sparkles size={12} />
                  Mois Sacré
                </span>
              )}
              {todayHijri.isWhiteDay && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Sparkles size={12} />
                  Jour Blanc (Jeûne méritoire)
                </span>
              )}
              {todayHijri.isFastingDay && !todayHijri.isWhiteDay && todayHijri.month !== 9 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  Jeûne Sunnah (Lundi / Jeudi)
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white flex flex-wrap items-baseline gap-2">
              <span>{todayHijri.dayNameFr} {todayHijri.formattedHijri}</span>
              <span className="text-xl sm:text-2xl text-emerald-400 font-arabic font-normal">
                {todayHijri.formattedHijriAr}
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-zinc-400 mt-1 flex items-center gap-2 font-medium">
              <span>Correspondance Miladi (Grégorien) :</span>
              <strong className="text-zinc-200">{todayHijri.formattedMiladi}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={handleGoToToday}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors border border-zinc-700/60"
            >
              Mois en cours
            </button>
          </div>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setViewMode("calendar")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            viewMode === "calendar"
              ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20"
              : "bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800"
          }`}
        >
          <CalendarDays size={15} />
          <span>Calendrier Mensuel</span>
        </button>

        <button
          onClick={() => setViewMode("converter")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            viewMode === "converter"
              ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20"
              : "bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800"
          }`}
        >
          <ArrowLeftRight size={15} />
          <span>Convertisseur Hijri ⇄ Miladi</span>
        </button>

        <button
          onClick={() => setViewMode("events")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            viewMode === "events"
              ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20"
              : "bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800"
          }`}
        >
          <Sparkles size={15} />
          <span>Événements & Fêtes ({yearEvents.length})</span>
        </button>
      </div>

      {/* VIEW 1: MONTHLY CALENDAR GRID */}
      {viewMode === "calendar" && (
        <div className="space-y-4">
          {/* Month Header Controller */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrevMonth}
                className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors"
                title="Mois précédent"
              >
                <ChevronLeft size={18} />
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    {monthInfo.nameFr} {currentYear} H
                  </h2>
                  <span className="text-emerald-400 font-arabic text-lg">
                    {monthInfo.nameAr}
                  </span>
                  {monthInfo.isSacred && (
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Sacré
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Miladi : <strong className="text-zinc-300">{gregorianRange}</strong>
                </p>
              </div>

              <button
                onClick={handleNextMonth}
                className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors"
                title="Mois suivant"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Direct selector */}
            <div className="flex items-center gap-2">
              <select
                value={currentMonth}
                onChange={(e) => setCurrentMonth(parseInt(e.target.value, 10))}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                {HIJRI_MONTHS.map((m) => (
                  <option key={m.index} value={m.index}>
                    {m.index}. {m.nameFr} ({m.nameAr})
                  </option>
                ))}
              </select>

              <input
                type="number"
                value={currentYear}
                onChange={(e) => setCurrentYear(parseInt(e.target.value, 10) || currentYear)}
                className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 text-center font-bold"
                min={1300}
                max={1500}
              />
            </div>
          </div>

          {/* Month Meaning / Virtue Note */}
          <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-xs text-zinc-300 flex items-start gap-2.5">
            <Info size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            <p>
              <strong className="text-emerald-300">{monthInfo.nameFr} ({monthInfo.nameAr})</strong> : {monthInfo.meaning}. Ce mois compte {monthDays.length} jours selon le calendrier astronomique Umm al-Qura.
            </p>
          </div>

          {/* Calendar Grid */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 overflow-hidden shadow-xl">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-900/70 text-center text-xs font-bold text-zinc-400 py-2.5">
              {WEEK_DAYS.map((wd, i) => (
                <div key={wd} className={i === 5 ? "text-emerald-400 font-black" : ""}>
                  {wd}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 auto-rows-fr">
              {/* Empty leading cells */}
              {Array.from({ length: startDayOffset }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="min-h-[72px] sm:min-h-[88px] border-b border-r border-zinc-800/40 bg-zinc-900/10"
                />
              ))}

              {/* Day cells */}
              {monthDays.map((day) => {
                const isSelected = selectedDay?.hijriDay === day.hijriDay;
                const hasEvents = day.events.length > 0;

                return (
                  <button
                    key={day.hijriDay}
                    onClick={() => setSelectedDay(day)}
                    className={`min-h-[72px] sm:min-h-[88px] p-2 text-left border-b border-r border-zinc-800/60 transition-all flex flex-col justify-between relative group ${
                      day.isToday
                        ? "bg-emerald-950/40 ring-2 ring-emerald-400 ring-inset"
                        : isSelected
                        ? "bg-zinc-800/90"
                        : "hover:bg-zinc-900/90 bg-zinc-950/40"
                    }`}
                  >
                    {/* Top Row: Hijri Day number + status badges */}
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-sm sm:text-base font-black ${
                          day.isToday
                            ? "text-emerald-300"
                            : day.isFriday
                            ? "text-emerald-400"
                            : "text-zinc-100"
                        }`}
                      >
                        {day.hijriDay}
                      </span>

                      <div className="flex items-center gap-1">
                        {day.isWhiteDay && (
                          <span
                            className="w-2 h-2 rounded-full bg-amber-400"
                            title="Jour Blanc (Jeûne méritoire)"
                          />
                        )}
                        {hasEvents && (
                          <span
                            className="w-2 h-2 rounded-full bg-purple-400"
                            title={day.events.join(", ")}
                          />
                        )}
                      </div>
                    </div>

                    {/* Middle: Event Tag if any */}
                    {hasEvents && (
                      <div className="truncate text-[10px] font-semibold text-purple-300 bg-purple-950/50 px-1 py-0.5 rounded border border-purple-800/40 mt-1">
                        {day.events[0]}
                      </div>
                    )}

                    {/* Bottom Row: Miladi day */}
                    <div className="text-[11px] text-zinc-400 font-medium truncate pt-1">
                      {day.gregorianDay} {day.gregorianMonthName}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 px-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-400" />
              <span>Aujourd'hui</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Jours Blancs (13, 14, 15)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              <span>Événement islamique</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold">Ven</span>
              <span>Jour de Jumu'ah</span>
            </div>
          </div>

          {/* Selected Day Details Panel */}
          {selectedDay && (
            <div className="p-5 rounded-xl border border-zinc-700 bg-zinc-900/90 shadow-2xl space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    Détails du jour sélectionné
                  </span>
                  <h3 className="text-lg font-bold text-white">
                    {selectedDay.hijriDay} {monthInfo.nameFr} {currentYear} H
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Correspondance Miladi :{" "}
                    <strong className="text-zinc-200">
                      {new Intl.DateTimeFormat("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        timeZone: "UTC",
                      }).format(selectedDay.gregorianDate)}
                    </strong>
                  </p>
                </div>

                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-xs text-zinc-400 hover:text-white px-2 py-1 bg-zinc-800 rounded-lg"
                >
                  Fermer
                </button>
              </div>

              {selectedDay.events.length > 0 && (
                <div className="p-3 rounded-lg bg-purple-950/40 border border-purple-800/40 text-xs text-purple-200">
                  <strong className="block font-bold text-purple-300 mb-1">Occasion / Événement :</strong>
                  <ul className="list-disc list-inside space-y-0.5">
                    {selectedDay.events.map((ev, i) => (
                      <li key={i}>{ev}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedDay.isWhiteDay && (
                <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/30 text-xs text-amber-200 flex items-start gap-2">
                  <Sparkles size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong>Jour Blanc (Ayyam al-Bid) :</strong> Il est fortement recommandé selon la Sunnah de jeûner les 13, 14 et 15 de chaque mois hégirien, équivalant au jeûne perpétuel selon le Hadith authentique.
                  </p>
                </div>
              )}

              {selectedDay.isFastingDay && !selectedDay.isWhiteDay && (
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/30 text-xs text-emerald-200 flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong>Jeûne recommandé :</strong> Le Prophète ﷺ jeûnait régulièrement le lundi et le jeudi, jours où les œuvres sont présentées à Allah.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: DUAL CONVERTER (HIJRI ⇄ MILADI) */}
      {viewMode === "converter" && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 p-1.5 bg-zinc-900 rounded-xl border border-zinc-800 w-fit">
            <button
              onClick={() => setConverterDirection("miladiToHijri")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                converterDirection === "miladiToHijri"
                  ? "bg-emerald-500 text-zinc-950 shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Miladi (Grégorien) ➔ Hijri
            </button>
            <button
              onClick={() => setConverterDirection("hijriToMiladi")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                converterDirection === "hijriToMiladi"
                  ? "bg-emerald-500 text-zinc-950 shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Hijri ➔ Miladi (Grégorien)
            </button>
          </div>

          {/* Direction 1: Miladi to Hijri */}
          {converterDirection === "miladiToHijri" && (
            <div className="grid md:grid-cols-2 gap-6 items-start">
              <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CalendarDays size={18} className="text-emerald-400" />
                  1. Choisissez la date Miladi (Grégorienne)
                </h3>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Sélectionner la date :
                  </label>
                  <input
                    type="date"
                    value={miladiInputDate}
                    onChange={(e) => setMiladiInputDate(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const d = new Date();
                      setMiladiInputDate(d.toISOString().split("T")[0]);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                  >
                    Aujourd'hui
                  </button>
                </div>
              </div>

              {/* Conversion Result */}
              {convertedFromMiladi && (
                <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-950/50 via-zinc-900 to-zinc-950 border border-emerald-500/30 space-y-4 shadow-xl">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    Résultat de la conversion Umm Al-Qura
                  </span>

                  <div>
                    <p className="text-xs text-zinc-400">Date Hégirienne correspondante :</p>
                    <p className="text-2xl font-black text-white mt-1">
                      {convertedFromMiladi.dayNameFr} {convertedFromMiladi.formattedHijri}
                    </p>
                    <p className="text-xl font-arabic text-emerald-400 mt-1">
                      {convertedFromMiladi.dayNameAr} {convertedFromMiladi.formattedHijriAr}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-zinc-800 space-y-2 text-xs text-zinc-300">
                    <p>
                      <strong>Mois :</strong> {convertedFromMiladi.monthName} ({convertedFromMiladi.monthNameAr})
                      {convertedFromMiladi.isSacredMonth && " — Mois Sacré"}
                    </p>
                    <p>
                      <strong>Jour de la semaine :</strong> {convertedFromMiladi.dayNameFr}
                    </p>
                    {convertedFromMiladi.isWhiteDay && (
                      <p className="text-amber-300 font-semibold">
                        ✨ Ce jour fait partie des Jours Blancs (13, 14 ou 15 du mois).
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Direction 2: Hijri to Miladi */}
          {converterDirection === "hijriToMiladi" && (
            <div className="grid md:grid-cols-2 gap-6 items-start">
              <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Moon size={18} className="text-emerald-400" />
                  1. Saisissez la date Hijri (Hégirienne)
                </h3>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                      Jour (1-30) :
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={hijriInputDay}
                      onChange={(e) => setHijriInputDay(Math.min(30, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-bold text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                      Mois :
                    </label>
                    <select
                      value={hijriInputMonth}
                      onChange={(e) => setHijriInputMonth(parseInt(e.target.value, 10))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-2 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {HIJRI_MONTHS.map((m) => (
                        <option key={m.index} value={m.index}>
                          {m.index}. {m.nameFr}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                      Année (H) :
                    </label>
                    <input
                      type="number"
                      min={1300}
                      max={1550}
                      value={hijriInputYear}
                      onChange={(e) => setHijriInputYear(parseInt(e.target.value, 10) || 1448)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-bold text-center"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setHijriInputDay(todayHijri.day);
                      setHijriInputMonth(todayHijri.month);
                      setHijriInputYear(todayHijri.year);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                  >
                    Date d'aujourd'hui
                  </button>
                </div>
              </div>

              {/* Conversion Result */}
              {convertedFromHijri && (
                <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-950/50 via-zinc-900 to-zinc-950 border border-emerald-500/30 space-y-4 shadow-xl">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    Résultat de la conversion Miladi
                  </span>

                  <div>
                    <p className="text-xs text-zinc-400">Date Miladi (Grégorienne) correspondante :</p>
                    <p className="text-2xl font-black text-white mt-1">
                      {convertedFromHijri.dayNameFr} {convertedFromHijri.formattedMiladi}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-zinc-800 space-y-2 text-xs text-zinc-300">
                    <p>
                      <strong>Date Hégirienne saisie :</strong> {hijriInputDay} {HIJRI_MONTHS[hijriInputMonth - 1]?.nameFr} {hijriInputYear} H
                    </p>
                    <p>
                      <strong>En arabe :</strong> {HIJRI_MONTHS[hijriInputMonth - 1]?.nameAr}
                    </p>
                    <p className="text-zinc-400 text-[11px]">
                      Calcul basé sur les éphémérides officielles du calendrier Umm al-Qura.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: ISLAMIC EVENTS & HOLIDAYS */}
      {viewMode === "events" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <CalendarCheck size={18} className="text-emerald-400" />
                Grandes dates & Fêtes de l'année {todayHijri.year} H
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Calcul précis selon le calendrier officiel Umm al-Qura
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {yearEvents.map((event) => {
              const isPast = event.diffDays < 0;
              const isToday = event.diffDays === 0;

              return (
                <article
                  key={event.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    isToday
                      ? "bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500"
                      : isPast
                      ? "bg-zinc-900/40 border-zinc-800/80 opacity-75"
                      : "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 shadow-md"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="text-sm sm:text-base font-bold text-white">
                        {event.titleFr}
                      </h3>
                      <span className="text-xs font-arabic text-emerald-400 flex-shrink-0">
                        {event.titleAr}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                      {event.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-emerald-300 font-semibold block">
                        {event.hijriDay} {HIJRI_MONTHS[event.hijriMonth - 1]?.nameFr}
                      </span>
                      <span className="text-zinc-400 text-[11px]">
                        Miladi : <strong className="text-zinc-300">{event.formattedMiladi}</strong>
                      </span>
                    </div>

                    <div>
                      {isToday ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500 text-zinc-950 animate-pulse">
                          Aujourd'hui
                        </span>
                      ) : isPast ? (
                        <span className="px-2 py-0.5 rounded text-[10px] text-zinc-500 bg-zinc-800">
                          Passé
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                          <Clock size={10} />
                          Dans {event.diffDays} j
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
