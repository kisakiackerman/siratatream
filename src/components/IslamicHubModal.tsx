import { useState, useEffect, useMemo } from "react";
import {
  X,
  Clock3,
  Compass,
  CircleDot,
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  Calculator,
  Sparkles,
  Search,
  Hourglass,
  ChevronRight,
} from "lucide-react";
import { motion } from "motion/react";
import PrayerTimes from "@/components/PrayerTimes";
import QiblaCompass from "@/components/QiblaCompass";
import TasbihCounter from "@/components/TasbihCounter";
import DuasPage from "@/components/DuasPage";
import HadithsLibraryPage from "@/components/HadithsLibraryPage";
import HijriCalendar from "@/components/HijriCalendar";
import ZakatCalculator from "@/components/ZakatCalculator";
import DailyReminder from "@/components/DailyReminder";
import TarawihSearch from "@/components/TarawihSearch";
import { getKeyEventCountdowns } from "@/lib/hijri";
import type { ContentItem } from "@/data/catalog";

export type HubTab =
  | "prayer"
  | "tarawih"
  | "hijri"
  | "hadiths"
  | "duas"
  | "qibla"
  | "tasbih"
  | "zakat"
  | "reminder";

type IslamicHubModalProps = {
  initialTab?: HubTab;
  onClose: () => void;
  onPlayVideo?: (video: ContentItem) => void;
};

const TABS: { id: HubTab; label: string; icon: any }[] = [
  { id: "prayer", label: "Prières", icon: Clock3 },
  { id: "tarawih", label: "Tarawih & Miniatures", icon: Search },
  { id: "hijri", label: "Calendrier", icon: CalendarDays },
  { id: "hadiths", label: "Hadiths", icon: BookOpenCheck },
  { id: "duas", label: "Douas", icon: BookOpen },
  { id: "qibla", label: "Qibla", icon: Compass },
  { id: "tasbih", label: "Tasbih", icon: CircleDot },
  { id: "zakat", label: "Zakat", icon: Calculator },
  { id: "reminder", label: "Rappel", icon: Sparkles },
];

export default function IslamicHubModal({
  initialTab = "prayer",
  onClose,
  onPlayVideo,
}: IslamicHubModalProps) {
  const [activeTab, setActiveTab] = useState<HubTab>(initialTab);
  const keyCountdowns = useMemo(() => getKeyEventCountdowns(), []);
  const nextEvent = keyCountdowns[0];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="relative z-10 w-full h-full bg-zinc-950/90 backdrop-blur-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl liquid-glass-emerald text-emerald-300 border border-emerald-300/40 flex items-center justify-center shadow-lg">
              <Sparkles size={19} />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Espace Pratique & Spiritualité</h2>
              <p className="text-xs text-zinc-300">
                Outils du quotidien organisés et accessibles en un clic
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full liquid-glass hover:bg-white/15 text-zinc-300 hover:text-white flex items-center justify-center transition-all border border-white/20 shadow-md"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-white/10 bg-black/30 backdrop-blur-md overflow-x-auto scrollbar-none flex-shrink-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm transition-all flex-shrink-0 cursor-pointer ${
                  isActive
                    ? "liquid-glass-emerald text-emerald-200 border border-emerald-300/50 font-bold shadow-lg shadow-emerald-950/40 scale-105"
                    : "liquid-glass text-zinc-300 hover:text-white hover:bg-white/15 border border-white/15"
                }`}
              >
                <Icon size={15} className={isActive ? "text-emerald-300" : "text-zinc-400"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Hijri Key Events Countdown Bar */}
        {nextEvent && (
          <div className="px-4 sm:px-6 py-2.5 bg-gradient-to-r from-emerald-950/60 via-zinc-900/80 to-emerald-950/60 border-b border-emerald-500/20 flex items-center justify-between gap-3 text-xs flex-shrink-0 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-400/20 text-emerald-300 font-bold text-[11px] border border-emerald-300/30 shrink-0">
                <Hourglass size={12} className="text-emerald-400 animate-pulse" />
                Compte à rebours
              </span>
              <span className="text-zinc-200 font-medium truncate">
                Prochain événement : <strong className="text-white font-bold">{nextEvent.nameFr}</strong>
              </span>
              <span className="text-emerald-400 font-mono font-bold shrink-0">
                {nextEvent.daysRemaining === 0 ? "Aujourd'hui !" : `(J-${nextEvent.daysRemaining})`}
              </span>
              <span className="text-zinc-400 hidden lg:inline text-[11px] truncate">
                • Prévu le {nextEvent.formattedMiladi}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setActiveTab("hijri")}
                className="flex items-center gap-1 text-[11px] text-emerald-300 hover:text-emerald-200 font-semibold px-2 py-1 rounded-lg hover:bg-emerald-500/15 transition-all cursor-pointer"
              >
                <span>Voir le calendrier complet</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-screen-xl mx-auto w-full">
          {activeTab === "prayer" && <PrayerTimes onClose={onClose} />}
          {activeTab === "tarawih" && (
            <TarawihSearch
              onPlayVideo={(v) => {
                if (onPlayVideo) {
                  onPlayVideo(v);
                  onClose();
                }
              }}
              onClose={onClose}
            />
          )}
          {activeTab === "hijri" && <HijriCalendar onClose={onClose} />}
          {activeTab === "hadiths" && <HadithsLibraryPage onClose={onClose} />}
          {activeTab === "duas" && <DuasPage onClose={onClose} />}
          {activeTab === "qibla" && <QiblaCompass onClose={onClose} />}
          {activeTab === "tasbih" && <TasbihCounter onClose={onClose} />}
          {activeTab === "zakat" && <ZakatCalculator onClose={onClose} />}
          {activeTab === "reminder" && <DailyReminder onClose={onClose} />}
        </div>
      </motion.div>
    </div>
  );
}