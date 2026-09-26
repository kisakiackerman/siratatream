import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Layers,
  Sparkles,
  Calendar,
  Film,
} from "lucide-react";
import { type ContentItem } from "@/data/catalog";

interface CreatorStudioAnalyticsChartsProps {
  catalog: ContentItem[];
}

// Visual color palette matching spiritual and Islamic documentary themes
const CATEGORY_COLORS: Record<string, string> = {
  "Histoire & Mystère": "#ec4899", // Pink
  "Prophètes": "#f59e0b", // Amber
  "Héros & Personnages": "#3b82f6", // Blue
  "Eschatologie": "#ef4444", // Red
  "Coran": "#10b981", // Emerald
  "Anges & Djinns": "#a855f7", // Purple
  "Compagnons": "#8b5cf6", // Violet
  "Miracles du Coran": "#06b6d4", // Cyan
  "Récitations Haramain": "#10b981", // Emerald
  "Autre": "#71717a", // Zinc
};

const DEFAULT_COLOR_PALETTE = [
  "#10b981",
  "#f59e0b",
  "#3b82f6",
  "#ec4899",
  "#8b5cf6",
  "#06b6d4",
  "#ef4444",
  "#14b8a6",
  "#f97316",
  "#6366f1",
];

export default function CreatorStudioAnalyticsCharts({
  catalog,
}: CreatorStudioAnalyticsChartsProps) {
  const [categoryViewMode, setCategoryViewMode] = useState<"bar" | "pie">("bar");

  // 1. Répartition dynamique des vidéos par catégorie
  const categoryChartData = useMemo(() => {
    const counts = new Map<string, number>();
    catalog.forEach((item) => {
      const cats = item.categories && item.categories.length > 0 ? item.categories : ["Autre"];
      cats.forEach((cat) => {
        counts.set(cat, (counts.get(cat) || 0) + 1);
      });
    });

    const totalOccurrences = Array.from(counts.values()).reduce((a, b) => a + b, 0) || 1;

    return Array.from(counts.entries())
      .map(([name, count], index) => {
        const color =
          CATEGORY_COLORS[name] ||
          DEFAULT_COLOR_PALETTE[index % DEFAULT_COLOR_PALETTE.length];
        const percentage = Math.round((count / totalOccurrences) * 100);
        return {
          name,
          shortName: name.length > 13 ? name.slice(0, 11) + "…" : name,
          count,
          percentage,
          color,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [catalog]);

  // 2. Croissance chronologique du nombre de vidéos au fil du temps
  const growthTimelineData = useMemo(() => {
    const yearCounts = new Map<number, number>();
    let historicalArchivesCount = 0;

    catalog.forEach((item) => {
      const year = Number(item.year) || 2024;
      if (year <= 2000) {
        historicalArchivesCount += 1;
      } else {
        yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
      }
    });

    const data: Array<{
      period: string;
      added: number;
      cumul: number;
      description: string;
    }> = [];

    let runningCumul = 0;

    if (historicalArchivesCount > 0) {
      runningCumul += historicalArchivesCount;
      data.push({
        period: "Archives (1980-2000)",
        added: historicalArchivesCount,
        cumul: runningCumul,
        description: "Enregistrements et archives historiques Tarawih Haramain",
      });
    }

    const sortedYears = Array.from(yearCounts.keys()).sort((a, b) => a - b);

    sortedYears.forEach((year) => {
      const count = yearCounts.get(year) || 0;
      runningCumul += count;
      data.push({
        period: String(year),
        added: count,
        cumul: runningCumul,
        description: `Productions et diffusions de l'année ${year}`,
      });
    });

    return data;
  }, [catalog]);

  // Statistiques dérivées
  const topCategory = categoryChartData[0];
  const latestGrowthPoint = growthTimelineData[growthTimelineData.length - 1];

  return (
    <div className="space-y-6">
      {/* En-tête de section Analytique */}
      <div className="p-5 rounded-3xl liquid-glass-card border border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-sm">
            <TrendingUp size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <span>Analytique &amp; Visualisations Graphiques (Recharts)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Temps Réel
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              Distribution thématique du catalogue et modélisation de la croissance temporelle des contenus
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-3 py-1 rounded-xl liquid-glass border border-white/15 text-zinc-300">
            {catalog.length} vidéos analysées
          </span>
          <span className="px-3 py-1 rounded-xl liquid-glass border border-white/15 text-zinc-300">
            {categoryChartData.length} catégories
          </span>
        </div>
      </div>

      {/* Grille des 2 Graphiques Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ═══════════════════════════════════════════
            GRAPHIQUE 1 : RÉPARTITION PAR CATÉGORIE
            ═══════════════════════════════════════════ */}
        <div className="p-6 rounded-3xl liquid-glass-card border border-white/15 shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
                <Layers size={16} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  Répartition des vidéos par catégorie
                </h4>
                <p className="text-xs text-zinc-400">
                  Part relative de chaque registre spirituel et historique
                </p>
              </div>
            </div>

            {/* Toggle Bar / Pie */}
            <div className="flex items-center bg-zinc-950/60 p-1 rounded-xl border border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setCategoryViewMode("bar")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  categoryViewMode === "bar"
                    ? "bg-amber-400 text-zinc-950 shadow-md font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
                title="Vue Histogramme"
              >
                <BarChart3 size={13} />
                <span className="hidden sm:inline">Barres</span>
              </button>
              <button
                type="button"
                onClick={() => setCategoryViewMode("pie")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  categoryViewMode === "pie"
                    ? "bg-amber-400 text-zinc-950 shadow-md font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
                title="Vue Camembert"
              >
                <PieChartIcon size={13} />
                <span className="hidden sm:inline">Disque</span>
              </button>
            </div>
          </div>

          {/* Surface du Graphique Recharts */}
          <div className="h-64 w-full pt-2">
            {categoryViewMode === "bar" ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis
                    dataKey="shortName"
                    stroke="#a1a1aa"
                    fontSize={10}
                    tickLine={false}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="#a1a1aa"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${val}`}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-zinc-950/95 border border-white/20 p-3 rounded-2xl shadow-2xl backdrop-blur-xl text-xs space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: data.color }}
                              />
                              <p className="font-bold text-white text-sm">{data.name}</p>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-zinc-300 pt-1 border-t border-white/10 font-mono">
                              <span>Volume :</span>
                              <span className="font-bold text-amber-300">{data.count} vidéos</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-zinc-300 font-mono">
                              <span>Part du catalogue :</span>
                              <span className="font-bold text-emerald-300">{data.percentage}%</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`bar-cat-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-zinc-950/95 border border-white/20 p-3 rounded-2xl shadow-2xl backdrop-blur-xl text-xs space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: data.color }}
                              />
                              <p className="font-bold text-white text-sm">{data.name}</p>
                            </div>
                            <p className="text-zinc-300 font-mono pt-1">
                              {data.count} vidéos ({data.percentage}%)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Pie
                    data={categoryChartData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`pie-cat-${index}`} fill={entry.color} stroke="#09090b" strokeWidth={2} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Badges de résumé sous le graphique */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-400" />
              Catégorie dominante :{" "}
              <strong className="text-white font-semibold">
                {topCategory ? `${topCategory.name} (${topCategory.count} vidéos)` : "—"}
              </strong>
            </span>
            <span className="font-mono text-[11px] text-zinc-400">
              {categoryChartData.length} registres
            </span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            GRAPHIQUE 2 : CROISSANCE AU FIL DU TEMPS
            ═══════════════════════════════════════════ */}
        <div className="p-6 rounded-3xl liquid-glass-card border border-white/15 shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                <Calendar size={16} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  Croissance du catalogue au fil du temps
                </h4>
                <p className="text-xs text-zinc-400">
                  Évolution cumulative et rythme d'enrichissement par période
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-400/15 border border-amber-400/30 text-amber-300 font-mono">
                {latestGrowthPoint ? `+${latestGrowthPoint.added} en ${latestGrowthPoint.period}` : ""}
              </span>
            </div>
          </div>

          {/* Surface du Graphique Recharts AreaChart */}
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={growthTimelineData}
                margin={{ top: 10, right: 15, left: -20, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="growthCumulGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="growthAddedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis
                  dataKey="period"
                  stroke="#a1a1aa"
                  fontSize={10}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  stroke="#a1a1aa"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}`}
                />
                <Tooltip
                  cursor={{ stroke: "#ffffff25", strokeWidth: 1 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-zinc-950/95 border border-white/20 p-3 rounded-2xl shadow-2xl backdrop-blur-xl text-xs space-y-1.5">
                          <p className="font-bold text-white text-sm flex items-center gap-1.5">
                            <Calendar size={13} className="text-amber-400" />
                            <span>Période : {data.period}</span>
                          </p>
                          <p className="text-[11px] text-zinc-400">{data.description}</p>
                          <div className="pt-1.5 border-t border-white/10 space-y-1 font-mono">
                            <div className="flex items-center justify-between gap-4 text-zinc-300">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-400" />
                                Total cumulé :
                              </span>
                              <span className="font-bold text-amber-300">{data.cumul} vidéos</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-zinc-300">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                Nouveaux ajouts :
                              </span>
                              <span className="font-bold text-emerald-300">+{data.added} vidéos</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cumul"
                  name="Total cumulé"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#growthCumulGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="added"
                  name="Ajouts annuels"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fillOpacity={1}
                  fill="url(#growthAddedGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Badges de résumé sous le graphique */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Film size={13} className="text-emerald-400" />
              Volume actuel :{" "}
              <strong className="text-white font-semibold">
                {latestGrowthPoint ? `${latestGrowthPoint.cumul} vidéos répertoriées` : "—"}
              </strong>
            </span>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="flex items-center gap-1 text-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                Cumul
              </span>
              <span className="flex items-center gap-1 text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                Ajouts
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
