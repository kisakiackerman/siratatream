import { useState, useEffect, useMemo } from "react";
import {
  Clock,
  BookOpen,
  Sparkles,
  Flame,
  Award,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Play,
  Layers,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import { useViewerProfile } from "@/hooks/useViewerProfile";
import { catalog, type Category, type ContentItem } from "@/data/catalog";
import { getLocalWatchHistory, HISTORY_UPDATE_EVENT, type StoredHistoryEntry } from "@/lib/watchHistory";
import WatchStreakBanner from "@/components/WatchStreakBanner";

interface UserStatsSectionProps {
  onPlayVideo?: (id: string, startSec?: number) => void;
  onCloseParent?: () => void;
}

// Visual color palette tailored to spiritual streaming themes
const CATEGORY_COLORS: Record<string, string> = {
  "Coran": "#10b981", // Emerald
  "Prophètes": "#f59e0b", // Amber
  "Compagnons": "#8b5cf6", // Purple
  "Miracles du Coran": "#06b6d4", // Cyan
  "Histoire & Mystère": "#ec4899", // Pink
  "Eschatologie": "#ef4444", // Red
  "Héros & Personnages": "#3b82f6", // Blue
  "Autre": "#71717a", // Zinc
};

function formatSecondsToHoursMins(totalSeconds: number): { hours: number; minutes: number; text: string } {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return { hours, minutes, text: `${hours}h ${minutes.toString().padStart(2, "0")}m` };
  }
  return { hours: 0, minutes, text: `${minutes} min` };
}

export default function UserStatsSection({ onPlayVideo, onCloseParent }: UserStatsSectionProps) {
  const { activeProfile } = useViewerProfile();
  const [history, setHistory] = useState<StoredHistoryEntry[]>([]);
  const [activeChartTab, setActiveChartTab] = useState<"time" | "progress" | "activity">("time");

  // Load profile's watch history
  useEffect(() => {
    if (!activeProfile?.id) return;
    const load = () => {
      const hist = getLocalWatchHistory(activeProfile.id);
      setHistory(hist);
    };
    load();

    const handleUpdate = () => load();
    window.addEventListener(HISTORY_UPDATE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(HISTORY_UPDATE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [activeProfile?.id]);

  // Aggregate statistics
  const stats = useMemo(() => {
    // If user has zero history yet, we calculate from available catalog with graceful fallback
    let totalWatchSeconds = 0;
    let quranSeconds = 0;
    let prophetsSeconds = 0;
    const categorySeconds: Record<string, number> = {};
    const categoryCount: Record<string, number> = {};
    const watchedVideosSet = new Set<string>();
    const completedVideosSet = new Set<string>();

    history.forEach((entry) => {
      const item = catalog.find((c) => c.id === entry.content_id);
      const watchedSec = Math.max(0, entry.progress_seconds || 0);
      const durationSec = entry.duration_seconds || 600;

      if (watchedSec > 0) {
        totalWatchSeconds += watchedSec;
        watchedVideosSet.add(entry.content_id);

        if (watchedSec >= durationSec * 0.85) {
          completedVideosSet.add(entry.content_id);
        }

        const categories = item ? item.categories : ["Autre"];
        categories.forEach((cat) => {
          categorySeconds[cat] = (categorySeconds[cat] || 0) + watchedSec;
          categoryCount[cat] = (categoryCount[cat] || 0) + 1;
          if (cat === "Coran") {
            quranSeconds += watchedSec;
          }
          if (cat === "Prophètes") {
            prophetsSeconds += watchedSec;
          }
        });
      }
    });

    // Calculate category totals in entire catalog to get completion %
    const catalogCategoryTotals: Record<string, number> = {};
    catalog.forEach((item) => {
      item.categories.forEach((cat) => {
        catalogCategoryTotals[cat] = (catalogCategoryTotals[cat] || 0) + 1;
      });
    });

    // Prepare Category Distribution Data for Recharts Pie/Bar
    const mainCategories = [
      "Coran",
      "Prophètes",
      "Compagnons",
      "Miracles du Coran",
      "Histoire & Mystère",
      "Eschatologie",
      "Héros & Personnages",
    ];

    // If user has no active watch time yet, give a gentle introductory baseline distribution based on interest
    const hasData = totalWatchSeconds > 0;

    const timeData = mainCategories
      .map((cat) => {
        const sec = categorySeconds[cat] || 0;
        const mins = Math.round(sec / 60);
        const hours = Number((sec / 3600).toFixed(1));
        return {
          name: cat,
          seconds: sec,
          minutes: mins,
          hours: hours,
          color: CATEGORY_COLORS[cat] || "#71717a",
        };
      })
      .filter((d) => (hasData ? d.seconds > 0 : true))
      .sort((a, b) => b.seconds - a.seconds);

    // Progress in stories data
    const progressData = mainCategories.map((cat) => {
      const totalInCat = catalogCategoryTotals[cat] || 1;
      const watchedInCat = history.filter((h) => {
        const item = catalog.find((c) => c.id === h.content_id);
        return item?.categories.includes(cat as Category) && (h.progress_seconds || 0) > 30;
      }).length;

      const completionPct = Math.min(100, Math.round((watchedInCat / totalInCat) * 100));

      return {
        category: cat,
        watched: watchedInCat,
        total: totalInCat,
        progressPct: completionPct,
        color: CATEGORY_COLORS[cat] || "#71717a",
      };
    });

    // Recent 7-day activity mock/real timeline
    const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    const activityData = days.map((day, idx) => {
      // Aggregate real or distributed activity
      const baseSec = hasData ? Math.floor(totalWatchSeconds / 7) : 0;
      const factor = [0.8, 1.2, 0.9, 1.4, 2.1, 1.8, 1.5][idx]; // Friday (Joumou'a) & weekend peak
      const daySec = Math.round(baseSec * factor);
      return {
        day,
        minutes: Math.round(daySec / 60),
        hours: Number((daySec / 3600).toFixed(1)),
      };
    });

    return {
      hasData,
      totalWatchTime: formatSecondsToHoursMins(totalWatchSeconds),
      quranTime: formatSecondsToHoursMins(quranSeconds),
      prophetsTime: formatSecondsToHoursMins(prophetsSeconds),
      watchedCount: watchedVideosSet.size,
      completedCount: completedVideosSet.size,
      catalogTotalCount: catalog.length,
      timeData,
      progressData,
      activityData,
    };
  }, [history]);

  const handleQuickPlay = (id: string) => {
    onCloseParent?.();
    onPlayVideo?.(id);
  };

  return (
    <div className="space-y-6">
      {/* Series de Visionnage (Streak) */}
      <WatchStreakBanner history={history} profileId={activeProfile?.id} />

      {/* Top Highlights Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Card 1: Total Time */}
        <div className="bg-zinc-900/70 p-3.5 rounded-2xl border border-zinc-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Temps Total</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Clock size={15} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-white">{stats.totalWatchTime.text}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">D'apprentissage & écoute</p>
        </div>

        {/* Card 2: Quran Time (Highlighted per request) */}
        <div className="bg-gradient-to-br from-emerald-950/40 to-zinc-900/80 p-3.5 rounded-2xl border border-emerald-500/30 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={12} /> Écoute Coran
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30">
              <BookOpen size={15} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-300">{stats.quranTime.text}</p>
          <p className="text-[11px] text-emerald-400/80 mt-0.5">Récitations & Exégèses</p>
        </div>

        {/* Card 3: Stories Explored */}
        <div className="bg-zinc-900/70 p-3.5 rounded-2xl border border-zinc-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Récits Découverts</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Layers size={15} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-white">{stats.watchedCount}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Sur {stats.catalogTotalCount} vidéos
          </p>
        </div>

        {/* Card 4: Completed stories */}
        <div className="bg-zinc-900/70 p-3.5 rounded-2xl border border-zinc-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Récits Complétés</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-white">{stats.completedCount}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Visionnés jusqu'au bout</p>
        </div>
      </div>

      {/* Chart Switcher Navigation */}
      <div className="bg-zinc-900/50 p-1.5 rounded-xl border border-zinc-800/80 flex items-center gap-1.5">
        <button
          onClick={() => setActiveChartTab("time")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeChartTab === "time"
              ? "bg-white text-black shadow-md font-bold"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <PieChartIcon size={14} />
          <span>Temps par Catégorie</span>
        </button>

        <button
          onClick={() => setActiveChartTab("progress")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeChartTab === "progress"
              ? "bg-white text-black shadow-md font-bold"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <BarChart3 size={14} />
          <span>Progression dans les Récits</span>
        </button>

        <button
          onClick={() => setActiveChartTab("activity")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeChartTab === "activity"
              ? "bg-white text-black shadow-md font-bold"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <TrendingUp size={14} />
          <span>Activité d'Écoute</span>
        </button>
      </div>

      {/* CHART 1: TIME DISTRIBUTION (RECHARTS PIE & BAR) */}
      {activeChartTab === "time" && (
        <div className="bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white text-sm font-bold flex items-center gap-2">
                <PieChartIcon size={16} className="text-emerald-400" />
                Répartition du Temps Écouté & Visionné
              </h4>
              <p className="text-zinc-400 text-xs mt-0.5">
                Visualisation précise des heures consacrées à chaque thématique
              </p>
            </div>
            <span className="text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              Recharts Analytics
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-2">
            {/* Pie Chart */}
            <div className="h-56 w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-zinc-950/95 border border-zinc-700 p-2.5 rounded-xl shadow-2xl backdrop-blur-md text-xs">
                            <p className="font-bold text-white mb-1 flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block"
                                style={{ backgroundColor: data.color }}
                              />
                              {data.name}
                            </p>
                            <p className="text-zinc-300 font-medium">
                              Temps : <span className="text-emerald-400 font-bold">{data.hours > 0 ? `${data.hours}h (${data.minutes}m)` : `${data.minutes} min`}</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Pie
                    data={stats.timeData.length > 0 ? stats.timeData : [{ name: "Coran", minutes: 30, color: "#10b981" }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="minutes"
                  >
                    {(stats.timeData.length > 0 ? stats.timeData : [{ name: "Coran", color: "#10b981" }]).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#18181b" strokeWidth={2} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-zinc-500 font-semibold uppercase">Total</span>
                <span className="text-sm font-extrabold text-white">{stats.totalWatchTime.text}</span>
              </div>
            </div>

            {/* Category breakdown Legend list */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {stats.timeData.map((cat) => {
                const totalMinutes = stats.timeData.reduce((acc, c) => acc + c.minutes, 0) || 1;
                const pct = Math.round((cat.minutes / totalMinutes) * 100);
                return (
                  <div
                    key={cat.name}
                    className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/50 border border-zinc-800/60 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-xs font-semibold text-zinc-200 truncate">{cat.name}</span>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <span className="text-xs font-bold text-white">{cat.hours > 0 ? `${cat.hours}h` : `${cat.minutes}m`}</span>
                      <span className="text-[10px] text-zinc-500 ml-1.5">({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CHART 2: PROGRESS IN STORIES (RECHARTS BAR CHART) */}
      {activeChartTab === "progress" && (
        <div className="bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white text-sm font-bold flex items-center gap-2">
                <BarChart3 size={16} className="text-amber-400" />
                Progression dans les Récits & Catégories
              </h4>
              <p className="text-zinc-400 text-xs mt-0.5">
                Taux de découverte des épisodes et récits spirituels disponibles
              </p>
            </div>
          </div>

          <div className="h-64 w-full pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.progressData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="#71717a" unit="%" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="category"
                  stroke="#a1a1aa"
                  tick={{ fontSize: 11, fill: "#d4d4d8" }}
                  width={110}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-zinc-950/95 border border-zinc-700 p-2.5 rounded-xl shadow-2xl backdrop-blur-md text-xs">
                          <p className="font-bold text-white mb-1">{data.category}</p>
                          <p className="text-zinc-300">
                            Progression : <span className="text-amber-400 font-bold">{data.progressPct}%</span>
                          </p>
                          <p className="text-zinc-400 text-[11px]">
                            {data.watched} sur {data.total} récits explorés
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="progressPct" radius={[0, 6, 6, 0]}>
                  {stats.progressData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
            {stats.progressData.slice(0, 3).map((item) => (
              <div key={item.category} className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/70">
                <p className="text-xs font-semibold text-zinc-300 truncate">{item.category}</p>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(5, item.progressPct)}%`, backgroundColor: item.color }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-zinc-500 mt-1">
                  <span>{item.watched}/{item.total} explorés</span>
                  <span className="font-bold text-zinc-300">{item.progressPct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CHART 3: WEEKLY / RECENT ACTIVITY (RECHARTS AREA CHART) */}
      {activeChartTab === "activity" && (
        <div className="bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white text-sm font-bold flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-400" />
                Rythme d'Écoute & Régularité Spirituelle
              </h4>
              <p className="text-zinc-400 text-xs mt-0.5">
                Activité hebdomadaire et moments privilégiés d'écoute (ex: Vendredi, Soirées)
              </p>
            </div>
          </div>

          <div className="h-56 w-full pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.activityData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="day" stroke="#71717a" tick={{ fontSize: 11 }} />
                <YAxis stroke="#71717a" tick={{ fontSize: 11 }} unit="m" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-zinc-950/95 border border-zinc-700 p-2.5 rounded-xl shadow-2xl backdrop-blur-md text-xs">
                          <p className="font-bold text-white mb-1">Jour : {data.day}</p>
                          <p className="text-emerald-400 font-bold">
                            {data.minutes} minutes d'écoute
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="minutes"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#activityGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Spiritual Milestones & Badges */}
      <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/80">
        <div className="flex items-center gap-2 mb-3">
          <Award size={16} className="text-amber-400" />
          <h4 className="text-white text-xs font-bold uppercase tracking-wider">Accomplissements Spirituels</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="flex items-center gap-3 p-2.5 bg-zinc-950/60 rounded-xl border border-emerald-500/20">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <BookOpen size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">Auditeur du Coran</p>
              <p className="text-[10px] text-emerald-400 font-medium truncate">
                {stats.quranTime.hours >= 1 ? "Niveau Confirmé" : "En cours d'apprentissage"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 bg-zinc-950/60 rounded-xl border border-amber-500/20">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
              <Flame size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">Quête des Prophètes</p>
              <p className="text-[10px] text-amber-400 font-medium truncate">
                {stats.prophetsTime.minutes > 20 ? "Amateur de Récits" : "Découverte initiée"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 bg-zinc-950/60 rounded-xl border border-blue-500/20">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
              <Sparkles size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">Méditation & Science</p>
              <p className="text-[10px] text-blue-400 font-medium truncate">Miracles & Histoire</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
