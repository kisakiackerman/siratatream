import { useState, useMemo, useCallback, useEffect } from "react";
import {
  X,
  Search,
  Mic,
  MicOff,
  Play,
  Zap,
  Filter,
  Sparkles,
  LayoutGrid,
  RotateCcw,
  Check,
  Eye,
  Heart,
  ChevronDown,
  Layers,
  ArrowUpDown,
  Film,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { type ContentItem, type Category } from "@/data/catalog";
import { allShortsList } from "@/data/shortsCatalog";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";

type ShortsCatalogPageProps = {
  onClose: () => void;
  onPlayShort: (id: string) => void;
  initialCategory?: string;
};

type SortOption = "score" | "views" | "title" | "recent";

const SHORTS_CATEGORIES: { id: string; label: string }[] = [
  { id: "all", label: "Tous les Shorts" },
  { id: "Coran", label: "Coran" },
  { id: "Prophètes", label: "Prophètes" },
  { id: "Miracles du Coran", label: "Miracles" },
  { id: "Compagnons", label: "Compagnons" },
  { id: "Héros & Personnages", label: "Rappels & Foi" },
  { id: "Histoire & Mystère", label: "Histoire" },
  { id: "Eschatologie", label: "Fin des Temps" },
];

export default function ShortsCatalogPage({
  onClose,
  onPlayShort,
  initialCategory = "all",
}: ShortsCatalogPageProps) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [sortOption, setSortOption] = useState<SortOption>("score");
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);
  const [voiceNotification, setVoiceNotification] = useState<string | null>(null);

  // Audio / Voice Search
  const handleVoiceResult = useCallback((transcript: string) => {
    if (transcript && transcript.trim().length > 0) {
      setQuery(transcript);
      setVoiceNotification(`Recherche vocale : "${transcript}"`);
      setTimeout(() => setVoiceNotification(null), 4000);
    }
  }, []);

  const {
    supported: voiceSupported,
    listening: isListening,
    error: voiceError,
    transcript: voiceTranscript,
    start: startListening,
    stop: stopListening,
    toggle: toggleVoice,
  } = useVoiceSearch(handleVoiceResult);

  useEffect(() => {
    if (voiceError) {
      setVoiceNotification(voiceError);
      const t = setTimeout(() => setVoiceNotification(null), 5000);
      return () => clearTimeout(t);
    }
  }, [voiceError]);

  useEffect(() => {
    if (isListening) {
      setVoiceNotification(voiceTranscript ? `"${voiceTranscript}"` : "Écoute audio en cours... Parlez maintenant");
    }
  }, [isListening, voiceTranscript]);

  // Channels available in shorts
  const channels = useMemo(() => {
    const set = new Set<string>();
    for (const item of allShortsList) {
      if (item.channel) set.add(item.channel);
    }
    return Array.from(set);
  }, []);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allShortsList.length };
    for (const cat of SHORTS_CATEGORIES) {
      if (cat.id === "all") continue;
      counts[cat.id] = allShortsList.filter((item) =>
        item.categories.includes(cat.id as Category)
      ).length;
    }
    return counts;
  }, []);

  // Filter and sort items
  const filteredShorts = useMemo(() => {
    let result = allShortsList;

    // Search query filter
    if (query.trim().length > 0) {
      const q = query.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.channel.toLowerCase().includes(q) ||
          item.categories.some((cat) => cat.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      result = result.filter((item) =>
        item.categories.includes(selectedCategory as Category)
      );
    }

    // Channel filter
    if (selectedChannel !== "all") {
      result = result.filter((item) => item.channel === selectedChannel);
    }

    // Sort
    return [...result].sort((a, b) => {
      if (sortOption === "views") {
        const viewsA = a.viewsCount || (a.score ? a.score * 1000 : 0);
        const viewsB = b.viewsCount || (b.score ? b.score * 1000 : 0);
        return viewsB - viewsA;
      }
      if (sortOption === "title") {
        return a.title.localeCompare(b.title);
      }
      if (sortOption === "recent") {
        return (b.year || 2024) - (a.year || 2024);
      }
      // Default score
      return (b.score || 0) - (a.score || 0);
    });
  }, [query, selectedCategory, selectedChannel, sortOption]);

  const toggleVoiceSearch = () => {
    toggleVoice();
  };

  const resetFilters = () => {
    setQuery("");
    setSelectedCategory("all");
    setSelectedChannel("all");
    setSortOption("score");
  };

  return (
    <motion.div
      id="shorts-catalog-page"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-xl text-white flex flex-col h-[100dvh] overflow-hidden"
    >
      {/* ── HEADER ── */}
      <header className="border-b border-white/10 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4 bg-zinc-900/60 backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500/30 to-emerald-400/10 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
            <Zap size={20} className="fill-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                Catalogue Short
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {allShortsList.length} vidéos
              </span>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">
              Explorez tous les formats courts verticaux avec recherche audio
            </p>
          </div>
        </div>

        {/* Header Right: Launch vertical player button & Close */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (filteredShorts.length > 0) {
                onPlayShort(filteredShorts[0].id);
              } else {
                onClose();
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95"
          >
            <Play size={14} className="fill-white" />
            <span className="hidden md:inline">Lancer le flux</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/[0.10] hover:bg-white/[0.20] border border-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition-all active:scale-95 shadow-sm"
            aria-label="Fermer le catalogue Short"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* ── SUBHEADER: SEARCH BAR & VOICE SEARCH + FILTERS ── */}
      <div className="border-b border-white/10 px-4 sm:px-6 lg:px-8 py-3.5 bg-zinc-950/80 space-y-3">
        {/* Search input with audio mic button */}
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <div className="relative flex-1">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un short par mot-clé, prophète, rappel, thème..."
              className="w-full bg-white/[0.07] focus:bg-white/[0.12] border border-white/20 focus:border-emerald-400/70 rounded-full pl-10 pr-24 py-2.5 text-sm text-white placeholder-zinc-400 outline-none transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"
            />

            {/* Clear button */}
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-12 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center text-xs transition-colors"
                title="Effacer la recherche"
              >
                <X size={12} />
              </button>
            )}

            {/* Audio Voice Search button inside input */}
            <button
              type="button"
              onClick={toggleVoiceSearch}
              className={`absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all active:scale-95 text-xs font-semibold ${
                isListening
                  ? "bg-rose-500 text-white animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.6)]"
                  : "bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/40 text-emerald-300"
              }`}
              title={isListening ? "Arrêter l'écoute vocale" : "Recherche audio / vocale (Parlez dans votre micro)"}
              aria-label="Recherche audio"
            >
              {isListening ? (
                <>
                  <div className="flex items-center gap-0.5 h-3">
                    <span className="w-0.5 h-3 bg-white animate-[bounce_0.8s_infinite_100ms]" />
                    <span className="w-0.5 h-3 bg-white animate-[bounce_0.8s_infinite_200ms]" />
                    <span className="w-0.5 h-3 bg-white animate-[bounce_0.8s_infinite_300ms]" />
                  </div>
                  <span className="text-[11px] hidden sm:inline">Écoute...</span>
                </>
              ) : (
                <>
                  <Mic size={14} className="text-emerald-400" />
                  <span className="text-[11px] hidden sm:inline">Audio</span>
                </>
              )}
            </button>
          </div>

          {/* Sort Selector */}
          <div className="relative">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="bg-white/[0.08] hover:bg-white/[0.14] border border-white/20 text-zinc-200 text-xs rounded-full px-3.5 py-2.5 outline-none cursor-pointer transition-all appearance-none pr-8 font-medium"
            >
              <option value="score" className="bg-zinc-900 text-white">⭐ Populaire</option>
              <option value="views" className="bg-zinc-900 text-white">👁️ Plus vus</option>
              <option value="title" className="bg-zinc-900 text-white">🔤 Titre (A-Z)</option>
              <option value="recent" className="bg-zinc-900 text-white">✨ Récents</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>
        </div>

        {/* Voice Feedback Notification Bar */}
        <AnimatePresence>
          {(isListening || voiceNotification) && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="max-w-4xl mx-auto flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs shadow-[0_0_20px_rgba(16,185,129,0.15)]"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>
                  {isListening
                    ? "Parlez maintenant (ex: 'Rappel de foi', 'Prophète Moussa', 'Le pardon', 'Coran')..."
                    : voiceNotification}
                </span>
              </div>
              {isListening && (
                <button
                  type="button"
                  onClick={stopListening}
                  className="text-rose-400 hover:text-rose-300 font-bold ml-2 underline"
                >
                  Arrêter
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category Filter Chips Carousel */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-4xl mx-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SHORTS_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const count = categoryCounts[cat.id] || 0;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-gradient-to-b from-emerald-500/35 to-emerald-600/20 border-emerald-400/70 text-emerald-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),0_0_15px_rgba(52,211,153,0.3)]"
                    : "bg-white/[0.06] hover:bg-white/[0.14] border-white/15 text-zinc-300 hover:text-white"
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected
                      ? "bg-emerald-400/25 text-emerald-200"
                      : "bg-white/10 text-zinc-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MAIN CONTENT: SHORTS GRID ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 [scrollbar-width:thin]">
        <div className="max-w-7xl mx-auto">
          {/* Results meta bar */}
          <div className="flex items-center justify-between mb-4 text-xs text-zinc-400">
            <p>
              Affichage de{" "}
              <strong className="text-white font-semibold">
                {filteredShorts.length}
              </strong>{" "}
              sur {allShortsList.length} shorts
              {selectedCategory !== "all" && (
                <span>
                  {" "}
                  dans la catégorie{" "}
                  <span className="text-emerald-400 font-semibold">
                    {SHORTS_CATEGORIES.find((c) => c.id === selectedCategory)?.label}
                  </span>
                </span>
              )}
              {query.trim().length > 0 && (
                <span>
                  {" "}
                  pour <span className="text-emerald-300">"{query}"</span>
                </span>
              )}
            </p>

            {(query || selectedCategory !== "all" || selectedChannel !== "all") && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1 text-zinc-400 hover:text-emerald-300 transition-colors"
              >
                <RotateCcw size={12} />
                <span>Réinitialiser les filtres</span>
              </button>
            )}
          </div>

          {/* Grid of 9:16 Shorts Cards */}
          {filteredShorts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {filteredShorts.map((item, idx) => {
                const primaryCat = item.categories[0] || "Rappels";
                const viewsStr = item.viewsStr || (item.score ? `${Math.floor(item.score * 5)}k vues` : "5k vues");

                return (
                  <div
                    key={item.id}
                    onClick={() => onPlayShort(item.id)}
                    className="group relative aspect-[9/16] rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 hover:border-emerald-400/60 transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.25)] hover:-translate-y-1 cursor-pointer flex flex-col justify-between p-3"
                  >
                    {/* Background poster image */}
                    <img
                      src={item.image}
                      alt={item.title}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-95 group-hover:brightness-105"
                    />

                    {/* Gradient overlay for readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/60 pointer-events-none" />

                    {/* Top row: Category tag & duration */}
                    <div className="relative z-10 flex items-start justify-between gap-1">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-md border border-white/20 text-emerald-300">
                        {primaryCat}
                      </span>

                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-black/70 backdrop-blur-md text-zinc-300 border border-white/10">
                        {item.duration || "00:59"}
                      </span>
                    </div>

                    {/* Center: Play icon on hover */}
                    <div className="relative z-10 flex items-center justify-center my-auto">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.7)]">
                        <Play size={22} className="fill-white ml-0.5" />
                      </div>
                    </div>

                    {/* Bottom: Title & stats */}
                    <div className="relative z-10 space-y-1.5">
                      <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-emerald-200 transition-colors drop-shadow-md">
                        {item.title}
                      </h3>

                      <div className="flex items-center justify-between text-[11px] text-zinc-300 font-medium">
                        <span className="truncate max-w-[100px] text-zinc-400">
                          {item.channel}
                        </span>
                        <div className="flex items-center gap-1 text-emerald-400">
                          <Eye size={12} />
                          <span>{viewsStr}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="py-20 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                <Search size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  Aucun short trouvé
                </h3>
                <p className="text-xs text-zinc-400">
                  {query
                    ? `Aucun résultat pour "${query}". Essayez avec d'autres mots-clés ou utilisez la recherche vocale.`
                    : "Aucune vidéo ne correspond aux filtres sélectionnés."}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-4 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-colors"
                >
                  Effacer les filtres
                </button>
                {voiceSupported && (
                  <button
                    type="button"
                    onClick={toggleVoiceSearch}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-colors"
                  >
                    <Mic size={14} />
                    <span>Essayer par la voix</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
