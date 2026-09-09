import { useState, useMemo } from "react";
import {
  Sparkles,
  Search,
  Key,
  ExternalLink,
  Play,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  LayoutGrid,
  List,
  Flame,
  Radio,
} from "lucide-react";
import type { ContentItem } from "@/data/catalog";
import { catalog } from "@/data/catalog";
import { RECITERS_DATA, getReciterForItem } from "@/lib/reciterData";

type TarawihSearchProps = {
  onPlayVideo?: (video: ContentItem) => void;
  onClose?: () => void;
};

type VideoResult = {
  id: string;
  title: string;
  channel: string;
  duration: number; // in seconds
  thumbnail?: string;
  reciter?: string;
  mosque?: string;
};

const API_BASE = "https://www.googleapis.com/youtube/v3";
const QUERIES = [
  "tarawih 1989",
  "tarawih ali jaber",
  "tarawih sudais 1990",
  "tarawih shuraim 1995",
  "tarawih muhammad ayyub",
  "tarawih hudhaify",
  "salat tarawih makkah",
  "madinah tarawih",
  "priere tarawih complet",
  "صلاة التراويح مكة المكرمة",
  "تراويح الحرم المكي",
  "تراويح الحرم النبوي",
];

const TARGET = 100;

function decodeHtml(str: string) {
  const t = document.createElement("textarea");
  t.innerHTML = str;
  return t.value;
}

function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const h = parseInt(m[1] || "0", 10);
  const min = parseInt(m[2] || "0", 10);
  const s = parseInt(m[3] || "0", 10);
  return h * 3600 + min * 60 + s;
}

function fmtDuration(sec: number): string {
  if (!sec || isNaN(sec)) return "19:30";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function TarawihSearch({ onPlayVideo }: TarawihSearchProps) {
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem("yt_data_api_key") || "";
  });
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeTab, setActiveTab] = useState<"curated" | "search">("curated");
  const [minMinutes, setMinMinutes] = useState<number>(19);
  const [maxMinutes, setMaxMinutes] = useState<number>(20);
  const [results, setResults] = useState<VideoResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [selectedReciterFilter, setSelectedReciterFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const minSec = useMemo(() => minMinutes * 60, [minMinutes]);
  const maxSec = useMemo(() => maxMinutes * 60, [maxMinutes]);

  // Curated Haramain Tarawih videos from catalog
  const curatedTarawihVideos: ContentItem[] = useMemo(() => {
    return catalog.filter(
      (c) =>
        c.channel === "Récitations Haramain" ||
        c.categories.includes("Coran") ||
        c.title.toLowerCase().includes("taraweeh") ||
        c.title.toLowerCase().includes("tarawih") ||
        c.title.toLowerCase().includes("tahajjud")
    );
  }, []);

  const filteredCuratedVideos = useMemo(() => {
    return curatedTarawihVideos.filter((item) => {
      const matchQuery =
        !searchQuery.trim() ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());

      const reciter = getReciterForItem(item.title, item.description, item.channel);
      const matchReciter =
        selectedReciterFilter === "all" ||
        (reciter && reciter.id === selectedReciterFilter);

      return matchQuery && matchReciter;
    });
  }, [curatedTarawihVideos, searchQuery, selectedReciterFilter]);

  const handleQuickDuration = (min: number, max: number, label: string) => {
    setMinMinutes(min);
    setMaxMinutes(max);
    setSelectedFilter(label);
  };

  const handleSearch = async () => {
    const key = apiKey.trim();
    if (!key) {
      setErrorMessage("Merci d'entrer votre clé API YouTube Data v3 avant de lancer la recherche.");
      return;
    }

    localStorage.setItem("yt_data_api_key", key);
    setErrorMessage("");
    setIsLoading(true);
    setResults([]);
    const found = new Map<string, VideoResult>();
    let searchCalls = 0;
    const MAX_SEARCH_CALLS = 25;

    try {
      outer: for (const q of QUERIES) {
        let pageToken = "";
        for (let page = 0; page < 4; page++) {
          if (found.size >= TARGET || searchCalls >= MAX_SEARCH_CALLS) break outer;
          searchCalls++;
          setStatusMessage(`Recherche en cours (${found.size}/${TARGET} trouvées)… requête : "${q}"`);

          let searchUrl = `${API_BASE}/search?part=snippet&type=video&maxResults=50&q=${encodeURIComponent(q)}&key=${key}`;
          if (pageToken) searchUrl += `&pageToken=${pageToken}`;

          const res = await fetch(searchUrl);
          const searchData = await res.json();

          if (searchData.error) {
            const msg = searchData.error.message || "Erreur inconnue";
            setErrorMessage(`Erreur API: ${msg}. Vérifiez votre clé et votre quota disponible.`);
            setIsLoading(false);
            setStatusMessage("");
            return;
          }

          const ids = (searchData.items || [])
            .map((it: any) => it.id && it.id.videoId)
            .filter(Boolean)
            .filter((id: string) => !found.has(id));

          if (ids.length > 0) {
            try {
              const detailUrl = `${API_BASE}/videos?part=contentDetails,snippet&id=${ids.join(",")}&key=${key}`;
              const detailRes = await fetch(detailUrl);
              const detailData = await detailRes.json();
              if (detailData.items) {
                for (const item of detailData.items) {
                  const sec = parseDuration(item.contentDetails.duration);
                  const inDuration =
                    selectedFilter === "all" ||
                    (sec >= minSec && sec <= maxSec);

                  if (inDuration && !found.has(item.id)) {
                    found.set(item.id, {
                      id: item.id,
                      title: item.snippet.title,
                      channel: item.snippet.channelTitle,
                      duration: sec,
                      thumbnail:
                        item.snippet.thumbnails?.maxres?.url ||
                        item.snippet.thumbnails?.high?.url ||
                        item.snippet.thumbnails?.medium?.url ||
                        `https://i.ytimg.com/vi/${item.id}/mqdefault.jpg`,
                    });
                  }
                  if (found.size >= TARGET) break;
                }
              }
            } catch (e) {
              // continue
            }
            setResults(Array.from(found.values()));
          }

          pageToken = searchData.nextPageToken;
          if (!pageToken) break;
          if (found.size >= TARGET) break outer;
        }
      }

      setStatusMessage(
        found.size > 0
          ? `Terminé — ${found.size} vidéo(s) trouvée(s).`
          : `Terminé — aucune vidéo trouvée pour ces critères.`
      );
    } catch (e: any) {
      setErrorMessage(
        "Impossible de contacter l'API YouTube Data. Vérifiez que l'API est activée sur votre console Google Cloud."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayCurated = (item: ContentItem) => {
    if (onPlayVideo) {
      onPlayVideo(item);
    }
  };

  const handlePlayResult = (v: VideoResult) => {
    if (onPlayVideo) {
      onPlayVideo({
        id: v.id,
        youtubeId: v.id,
        title: decodeHtml(v.title),
        description: `Enregistrement Tarawih — Chaîne : ${decodeHtml(v.channel)}`,
        channel: "Récitations Haramain",
        categories: ["Coran"],
        year: new Date().getFullYear(),
        rating: "Tous publics",
        duration: fmtDuration(v.duration),
        score: 98,
        thumbnail: `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`,
        image: `https://i.ytimg.com/vi/${v.id}/maxresdefault.jpg`,
      });
    }
  };

  return (
    <div className="space-y-6 text-white pb-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/60 backdrop-blur-xl p-5 sm:p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white flex-shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                Prières de Tarawih & Tahajjud
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Vidéos en miniatures, archives d'or des Haramain (La Mecque & Médine) et calibrage de durée
              </p>
            </div>
          </div>

          {/* Mode d'affichage (Miniatures vs Liste) */}
          <div className="flex items-center gap-1 bg-black/40 border border-white/10 backdrop-blur-md p-1 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === "grid"
                  ? "bg-white text-black shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
              title="Affichage en miniatures (Vignettes)"
            >
              <LayoutGrid size={14} />
              <span>Miniatures</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === "list"
                  ? "bg-white text-black shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
              title="Affichage en liste compacte"
            >
              <List size={14} />
              <span>Liste</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Archives Prêtes vs Recherche Clé API) */}
        <div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("curated")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === "curated"
                ? "bg-white/15 text-white border border-white/20"
                : "bg-white/5 text-zinc-400 hover:text-white border border-transparent"
            }`}
          >
            <Flame size={14} />
            <span>Collection Haramain ({curatedTarawihVideos.length} vidéos)</span>
          </button>
          <button
            onClick={() => setActiveTab("search")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === "search"
                ? "bg-white/15 text-white border border-white/20"
                : "bg-white/5 text-zinc-400 hover:text-white border border-transparent"
            }`}
          >
            <Radio size={14} />
            <span>Recherche YouTube API (Plage 19-20m)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: CURATED HARAMAIN ARCHIVE IN MINIATURES */}
      {activeTab === "curated" && (
        <div className="space-y-4">
          {/* Quick Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-zinc-950/40 backdrop-blur-xl border border-white/10 p-3 rounded-2xl">
            {/* Search filter */}
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrer par sourate, année, imam..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/20"
              />
            </div>

            {/* Reciter filter buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedReciterFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex-shrink-0 whitespace-nowrap ${
                  selectedReciterFilter === "all"
                    ? "bg-white text-black"
                    : "bg-white/5 text-zinc-400 hover:text-white border border-white/10"
                }`}
              >
                Tous les Imams
              </button>
              {Object.values(RECITERS_DATA).map((reciter) => (
                <button
                  key={reciter.id}
                  onClick={() => setSelectedReciterFilter(reciter.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex-shrink-0 whitespace-nowrap ${
                    selectedReciterFilter === reciter.id
                      ? "bg-white text-black font-semibold"
                      : "bg-white/5 text-zinc-400 hover:text-white border border-white/10"
                  }`}
                >
                  {reciter.name.replace("Sheikh ", "")}
                </button>
              ))}
            </div>
          </div>

          {/* GRID OF MINIATURES */}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCuratedVideos.map((video) => {
                const reciter = getReciterForItem(video.title, video.description, video.channel);
                return (
                  <div
                    key={video.id}
                    className="video-thumb-interactive group relative bg-zinc-950/60 backdrop-blur-xl border border-white/10 hover:border-white/25 rounded-2xl overflow-hidden flex flex-col shadow-lg"
                  >
                    {/* Thumbnail Image Container (16:9 Aspect Ratio) */}
                    <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
                      <img
                        src={`https://i.ytimg.com/vi/${video.youtubeId}/mqdefault.jpg`}
                        alt={video.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />

                      {/* Dark gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                      {/* Play Button Overlay on Hover */}
                      <div
                        onClick={() => handlePlayCurated(video)}
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 cursor-pointer backdrop-blur-[2px]"
                      >
                        <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                          <Play size={20} className="fill-black ml-0.5" />
                        </div>
                      </div>

                      {/* Duration / Year Tag */}
                      <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[11px] font-mono font-medium text-white border border-white/15">
                        {video.year || "Archive"}
                      </div>

                      {/* Mosque / Imam Badge */}
                      {reciter && (
                        <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-semibold text-zinc-200 border border-white/15">
                          {reciter.mosque.includes("Médine") ? "Médine" : "La Mecque"}
                        </div>
                      )}
                    </div>

                    {/* Card Content Details */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        {reciter && (
                          <p className="text-[11px] font-semibold text-zinc-400 mb-1">
                            {reciter.name}
                          </p>
                        )}
                        <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-zinc-200 transition-colors">
                          {video.title}
                        </h3>
                        <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                          {video.description}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                        <button
                          onClick={() => handlePlayCurated(video)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-white text-black hover:bg-zinc-200 font-semibold rounded-xl text-xs transition-colors shadow-sm"
                        >
                          <Play size={13} className="fill-black" />
                          <span>Lire la prière</span>
                        </button>
                        <a
                          href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-400 hover:text-white transition-colors"
                          title="Ouvrir sur YouTube"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* COMPACT LIST VIEW */
            <div className="grid gap-2 sm:gap-2.5">
              {filteredCuratedVideos.map((video, idx) => {
                const reciter = getReciterForItem(video.title, video.description, video.channel);
                return (
                  <div
                    key={video.id}
                    className="p-3 rounded-2xl bg-zinc-950/60 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all flex items-center gap-3 group"
                  >
                    {/* Index */}
                    <span className="text-xs font-mono font-bold text-zinc-400 w-5 text-center flex-shrink-0">
                      {idx + 1}
                    </span>

                    {/* Miniature thumbnail */}
                    <div
                      onClick={() => handlePlayCurated(video)}
                      className="video-thumb-interactive relative w-28 sm:w-32 aspect-video rounded-xl overflow-hidden bg-zinc-900 flex-shrink-0 cursor-pointer"
                    >
                      <img
                        src={`https://i.ytimg.com/vi/${video.youtubeId}/mqdefault.jpg`}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play size={16} className="fill-white text-white" />
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      {reciter && (
                        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                          {reciter.name}
                        </span>
                      )}
                      <h3
                        onClick={() => handlePlayCurated(video)}
                        className="text-xs sm:text-sm font-semibold text-white truncate cursor-pointer hover:text-zinc-200"
                      >
                        {video.title}
                      </h3>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                        {video.year} · {video.channel}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handlePlayCurated(video)}
                        className="px-3.5 py-1.5 bg-white text-black hover:bg-zinc-200 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Play size={12} className="fill-black" />
                        <span className="hidden sm:inline">Lire</span>
                      </button>
                      <a
                        href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-400 hover:text-white transition-colors"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LIVE YOUTUBE API SEARCH (19-20 MIN CALIBRATION) */}
      {activeTab === "search" && (
        <div className="space-y-4">
          {/* API Key Panel */}
          <div className="p-5 rounded-2xl bg-zinc-950/60 backdrop-blur-xl border border-white/10 space-y-3 shadow-2xl">
            <label className="block text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Key size={14} />
              Clé API YouTube Data v3 (Google Cloud)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Collez votre clé API YouTube Data v3 ici..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/25"
              />
              <button
                onClick={handleSearch}
                disabled={isLoading}
                className="px-6 py-2.5 bg-white hover:bg-zinc-200 text-black font-semibold rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Search size={15} />
                {isLoading ? "Recherche…" : "Rechercher en miniatures"}
              </button>
            </div>

            {/* Filter range presets */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
              <span className="text-xs text-zinc-400 flex items-center gap-1">
                <Filter size={13} />
                Durée cible :
              </span>
              {[
                { label: "19-20", min: 19, max: 20, text: "19 à 20 min (Recommandé)" },
                { label: "15-25", min: 15, max: 25, text: "15 à 25 min" },
                { label: "20-30", min: 20, max: 30, text: "20 à 30 min" },
                { label: "all", min: 0, max: 999, text: "Toutes les durées" },
              ].map((f) => (
                <button
                  key={f.label}
                  onClick={() => handleQuickDuration(f.min, f.max, f.label)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedFilter === f.label
                      ? "bg-white text-black shadow-sm"
                      : "bg-white/5 text-zinc-400 hover:text-white border border-white/10"
                  }`}
                >
                  {f.text}
                </button>
              ))}
            </div>
          </div>

          {/* Status or Error Display */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>{errorMessage}</div>
            </div>
          )}

          {statusMessage && !errorMessage && (
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-zinc-200 text-xs flex items-center gap-2">
              <CheckCircle2 size={15} className="text-white flex-shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* API Search Results */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Résultats YouTube</span>
                {results.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs bg-white/10 text-zinc-200 border border-white/15">
                    {results.length} / {TARGET}
                  </span>
                )}
              </h2>
            </div>

            {results.length === 0 && !isLoading && (
              <div className="text-center py-10 text-zinc-400 text-xs bg-zinc-950/40 border border-white/10 rounded-2xl p-6">
                Lancez une recherche avec votre clé API pour scanner et afficher les vidéos de Tarawih en miniatures.
              </div>
            )}

            {/* Results in Miniatures */}
            {results.length > 0 && viewMode === "grid" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((v) => (
                  <div
                    key={v.id}
                    className="video-thumb-interactive group relative bg-zinc-950/60 backdrop-blur-xl border border-white/10 hover:border-white/25 rounded-2xl overflow-hidden flex flex-col shadow-lg"
                  >
                    <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
                      <img
                        src={v.thumbnail || `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`}
                        alt={v.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div
                        onClick={() => handlePlayResult(v)}
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 cursor-pointer backdrop-blur-[2px]"
                      >
                        <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-xl">
                          <Play size={20} className="fill-black ml-0.5" />
                        </div>
                      </div>

                      <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[11px] font-mono font-semibold text-white border border-white/15 flex items-center gap-1">
                        <Clock size={11} />
                        <span>{fmtDuration(v.duration)}</span>
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <p className="text-[11px] font-semibold text-zinc-400 truncate mb-1">
                          {decodeHtml(v.channel)}
                        </p>
                        <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug">
                          {decodeHtml(v.title)}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                        <button
                          onClick={() => handlePlayResult(v)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-white text-black hover:bg-zinc-200 font-semibold rounded-xl text-xs transition-colors shadow-sm"
                        >
                          <Play size={13} className="fill-black" />
                          <span>Lire</span>
                        </button>
                        <a
                          href={`https://www.youtube.com/watch?v=${v.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-400 hover:text-white transition-colors"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Results in List Mode */}
            {results.length > 0 && viewMode === "list" && (
              <div className="grid gap-2 sm:gap-2.5">
                {results.map((v, i) => (
                  <div
                    key={v.id}
                    className="p-3 rounded-2xl bg-zinc-950/60 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all flex items-center gap-3 group"
                  >
                    <span className="font-mono font-bold text-zinc-400 text-xs w-6 text-center">
                      {i + 1}
                    </span>

                    <div
                      onClick={() => handlePlayResult(v)}
                      className="video-thumb-interactive relative w-28 sm:w-32 aspect-video rounded-xl overflow-hidden bg-zinc-900 flex-shrink-0 cursor-pointer"
                    >
                      <img
                        src={v.thumbnail || `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`}
                        alt={v.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play size={16} className="fill-white text-white" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3
                        onClick={() => handlePlayResult(v)}
                        className="text-xs sm:text-sm font-semibold text-white truncate cursor-pointer hover:text-zinc-200"
                      >
                        {decodeHtml(v.title)}
                      </h3>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                        {decodeHtml(v.channel)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-zinc-200 text-xs font-mono">
                      <Clock size={11} />
                      <span>{fmtDuration(v.duration)}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handlePlayResult(v)}
                        className="px-3.5 py-1.5 bg-white text-black hover:bg-zinc-200 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Play size={12} className="fill-black" />
                        <span className="hidden sm:inline">Lire</span>
                      </button>
                      <a
                        href={`https://www.youtube.com/watch?v=${v.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-400 hover:text-white transition-colors"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
