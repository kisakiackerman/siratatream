import { useState, useMemo, useCallback } from "react";
import {
  X,
  Sparkles,
  Play,
  SlidersHorizontal,
  ChevronDown,
  Calendar,
  Mic,
  Check,
  RotateCcw,
  Film,
  Info,
  Tv,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { type ContentItem, type Category, type Channel } from "@/data/catalog";
import { useCreatorCatalog } from "@/hooks/useCreatorCatalog";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import YouTubeHoverPreview from "@/components/YouTubeHoverPreview";
import { getReciterForItem } from "@/lib/reciterData";
import VideoTitleTooltip from "@/components/VideoTitleTooltip";

type CatalogPageProps = {
  onClose: () => void;
  onPlay: (id: string) => void;
  onInfo: (id: string) => void;
  initialCategories?: string[];
  initialChannels?: string[];
};

type SortMode = "score" | "recent" | "title";

export default function CatalogPage({
  onClose,
  onPlay,
  onInfo,
  initialCategories = [],
  initialChannels = [],
}: CatalogPageProps) {
  const { catalog, allActiveCategories, allActiveChannels } = useCreatorCatalog();
  const [query, setQuery] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<string[]>(initialChannels);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategories);
  const [sortMode, setSortMode] = useState<SortMode>("score");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [minYear, setMinYear] = useState<number>(1980);
  const [maxYear, setMaxYear] = useState<number>(2026);

  const channelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ch of allActiveChannels) {
      counts[ch] = catalog.filter((c) => c.channel === ch).length;
    }
    return counts;
  }, [allActiveChannels, catalog]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of allActiveCategories) {
      counts[cat] = catalog.filter((c) => c.categories.includes(cat as Category)).length;
    }
    return counts;
  }, [allActiveCategories, catalog]);

  const toggleChannel = (ch: string) => {
    setSelectedChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const filtered: ContentItem[] = useMemo(() => {
    let result: ContentItem[] = catalog;

    // Recherche
    if (query.trim().length > 1) {
      const q = query.toLowerCase();
      result = catalog.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.channel.toLowerCase().includes(q) ||
          c.categories.some((cat) => cat.toLowerCase().includes(q))
      );
    }

    if (selectedChannels.length > 0) {
      result = result.filter((c) => selectedChannels.includes(c.channel));
    }

    if (selectedCategories.length > 0) {
      result = result.filter((c) =>
        c.categories.some((cat) => selectedCategories.includes(cat))
      );
    }

    if (minYear > 1980 || maxYear < 2026) {
      result = result.filter((c) => c.year >= minYear && c.year <= maxYear);
    }

    const sorted = [...result].sort((a, b) => {
      if (sortMode === "score") return b.score - a.score;
      if (sortMode === "title") return a.title.localeCompare(b.title, "fr");
      return b.year - a.year;
    });

    return sorted;
  }, [catalog, query, selectedChannels, selectedCategories, minYear, maxYear, sortMode]);

  const hasActiveFilters =
    selectedChannels.length > 0 ||
    selectedCategories.length > 0 ||
    minYear > 1980 ||
    maxYear < 2026 ||
    query.trim().length > 0;

  const clearFilters = () => {
    setSelectedChannels([]);
    setSelectedCategories([]);
    setMinYear(1980);
    setMaxYear(2026);
    setQuery("");
  };

  const handleVoiceResult = useCallback((transcript: string) => {
    setQuery(transcript);
  }, []);

  const { supported: voiceSupported, listening, start: startVoice } = useVoiceSearch(handleVoiceResult);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="fixed inset-0 z-50 bg-zinc-950 text-zinc-100 overflow-y-auto"
    >
      {/* Bouton de fermeture flottant en haut à droite */}
      <button
        onClick={onClose}
        aria-label="Fermer le catalogue"
        className="fixed top-5 right-5 sm:top-7 sm:right-8 z-30 w-10 h-10 rounded-full liquid-glass flex items-center justify-center text-zinc-300 hover:text-white border border-white/20 hover:scale-105 active:scale-95 transition-all shadow-xl"
      >
        <X size={20} />
      </button>

      {/* ═══════════════════════════════════════════
          1. EN-TÊTE HÉRO "EXPLORER"
          ═══════════════════════════════════════════ */}
      <div className="relative pt-12 pb-10 sm:pt-16 sm:pb-12 px-4 sm:px-6 lg:px-12 bg-gradient-to-b from-zinc-900/60 via-zinc-950 to-zinc-950 border-b border-white/10 overflow-hidden">
        {/* Vignette d'arrière-plan & halo lumineux subtil */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[250px] bg-emerald-500/10 blur-[120px] rounded-full" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800/20 via-transparent to-transparent" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center space-y-3">
          {/* Grand titre centré en majuscules */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-400 drop-shadow-md">
            EXPLORER
          </h1>

          {/* Sous-titre avec lignes horizontales décoratives vert émeraude */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 pt-1">
            <span className="w-8 sm:w-16 h-[2px] bg-emerald-400/80 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-[11px] sm:text-xs md:text-sm font-bold uppercase tracking-[0.25em] sm:tracking-[0.35em] text-zinc-300">
              LA BIBLIOTHÈQUE COMPLÈTE
            </span>
            <span className="w-8 sm:w-16 h-[2px] bg-emerald-400/80 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          </div>

          {/* Barre de recherche intégrée avec Liquid Glass */}
          <div className="pt-5 max-w-2xl mx-auto">
            <div className="flex items-center liquid-glass rounded-2xl p-1.5 shadow-2xl border border-white/20 focus-within:border-emerald-400/50 focus-within:bg-white/10 transition-all">
              <div className="pl-3.5 pr-2 text-zinc-400">
                <Sparkles size={18} className="text-emerald-400" />
              </div>
              <input
                type="text"
                placeholder="Rechercher par titre, prophète, créateur, sujet..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="bg-transparent text-white text-sm px-2 py-2.5 flex-1 outline-none placeholder-zinc-400"
              />
              {voiceSupported && (
                <button
                  type="button"
                  onClick={startVoice}
                  className={`p-2 rounded-xl transition-colors ${
                    listening
                      ? "text-red-300 bg-red-500/25 animate-pulse"
                      : "text-zinc-300 hover:text-white hover:bg-white/10"
                  }`}
                  title={listening ? "Écoute en cours..." : "Recherche vocale"}
                >
                  <Mic size={16} />
                </button>
              )}
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="p-2 text-zinc-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                  title="Effacer la recherche"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          BOUTON FILTRES MOBILE (Affiché uniquement sur petits écrans)
          ═══════════════════════════════════════════ */}
      <div className="lg:hidden px-4 pt-4">
        <button
          onClick={() => setMobileFiltersOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 liquid-glass rounded-2xl border border-white/18 text-sm font-semibold text-zinc-200"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-emerald-400" />
            <span>Filtres de recherche</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            )}
          </div>
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${mobileFiltersOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* ═══════════════════════════════════════════
          STRUCTURE PRINCIPALE : COLONNE FILTRES + GRILLE
          ═══════════════════════════════════════════ */}
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 py-6">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* ═══════════════════════════════════════════
              2. BARRE DE FILTRES LATÉRALE (STICKY AU SCROLL)
              ═══════════════════════════════════════════ */}
          <aside
            className={`w-full lg:w-64 xl:w-72 flex-shrink-0 lg:sticky lg:top-6 space-y-6 ${
              mobileFiltersOpen ? "block" : "hidden lg:block"
            }`}
          >
            <div className="p-5 rounded-2xl liquid-glass border border-white/20 shadow-2xl space-y-6">
              {/* En-tête des filtres avec bouton réinitialiser */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-200 flex items-center gap-2">
                  <SlidersHorizontal size={14} className="text-emerald-400" />
                  <span>FILTRES</span>
                </span>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-[11px] font-semibold text-emerald-300 hover:text-emerald-200 transition-colors flex items-center gap-1 liquid-glass-subtle px-2 py-0.5 rounded-full border border-emerald-400/30"
                  >
                    <RotateCcw size={11} />
                    <span>Réinitialiser</span>
                  </button>
                )}
              </div>

              {/* SECTION 1: CATÉGORIE */}
              <div className="space-y-3">
                <div className="pb-1.5 border-b border-white/10">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-200">
                    CATÉGORIE
                  </h3>
                </div>
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                  {allActiveCategories.map((cat) => {
                    const isChecked = selectedCategories.includes(cat);
                    const count = categoryCounts[cat] || 0;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className="group w-full flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Case à cocher carrée style émeraude */}
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${
                              isChecked
                                ? "liquid-glass-badge-emerald border-emerald-400/50 text-emerald-200"
                                : "border-white/20 liquid-glass-subtle group-hover:border-white/40"
                            }`}
                          >
                            {isChecked && <Check size={12} strokeWidth={3.5} />}
                          </div>
                          <span
                            className={`text-xs truncate transition-colors ${
                              isChecked ? "text-white font-semibold" : "text-zinc-300 group-hover:text-white"
                            }`}
                          >
                            {cat}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400 group-hover:text-zinc-200 ml-2">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2: CHAÎNE / CRÉATEURS */}
              <div className="space-y-3">
                <div className="pb-1.5 border-b border-white/10">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-200">
                    CHAÎNE
                  </h3>
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                  {allActiveChannels.map((ch) => {
                    const isChecked = selectedChannels.includes(ch);
                    const count = channelCounts[ch] || 0;
                    return (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => toggleChannel(ch)}
                        className="group w-full flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Case à cocher carrée */}
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${
                              isChecked
                                ? "liquid-glass-badge-emerald border-emerald-400/50 text-emerald-200"
                                : "border-white/20 liquid-glass-subtle group-hover:border-white/40"
                            }`}
                          >
                            {isChecked && <Check size={12} strokeWidth={3.5} />}
                          </div>
                          <span
                            className={`text-xs truncate transition-colors ${
                              isChecked ? "text-white font-semibold" : "text-zinc-300 group-hover:text-white"
                            }`}
                          >
                            {ch}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400 group-hover:text-zinc-200 ml-2">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 3: ANNÉE */}
              <div className="space-y-3">
                <div className="pb-1.5 border-b border-white/10">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-200">
                    ANNÉE
                  </h3>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex-1">
                    <span className="text-[10px] text-zinc-400 block mb-1 font-medium">De</span>
                    <select
                      value={minYear}
                      onChange={(e) => setMinYear(Math.min(Number(e.target.value), maxYear))}
                      className="w-full liquid-glass-input rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-400 transition-colors"
                    >
                      {[1980, 1990, 2000, 2010, 2020, 2022, 2023, 2024, 2025, 2026].map((y) => (
                        <option key={y} value={y} className="bg-zinc-900 text-white">
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] text-zinc-400 block mb-1 font-medium">À</span>
                    <select
                      value={maxYear}
                      onChange={(e) => setMaxYear(Math.max(Number(e.target.value), minYear))}
                      className="w-full liquid-glass-input rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-400 transition-colors"
                    >
                      {[1980, 1990, 2000, 2010, 2020, 2022, 2023, 2024, 2025, 2026].map((y) => (
                        <option key={y} value={y} className="bg-zinc-900 text-white">
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* ═══════════════════════════════════════════
              ZONE RÉSULTATS (BARRE SUPÉRIEURE + GRILLE 5 COLONNES)
              ═══════════════════════════════════════════ */}
          <main className="flex-1 min-w-0 w-full space-y-5">
            {/* ═══════════════════════════════════════════
                3. BARRE DE RÉSULTATS (AU-DESSUS DE LA GRILLE)
                ═══════════════════════════════════════════ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              {/* Gauche : Icône + RÉSULTATS + compteur */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl liquid-glass-badge-emerald flex items-center justify-center shadow-sm">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h2 className="text-xs font-black uppercase tracking-wider text-white">
                    RÉSULTATS
                  </h2>
                  <p className="text-xs text-zinc-300 font-medium">
                    {filtered.length} titre{filtered.length > 1 ? "s" : ""} trouvé{filtered.length > 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {/* Droite : Pilules / Tabs de tri arrondies en Liquid Glass */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-zinc-400 font-medium mr-1 hidden sm:inline">
                  Trier par :
                </span>
                <button
                  type="button"
                  onClick={() => setSortMode("score")}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    sortMode === "score"
                      ? "liquid-glass-emerald border border-emerald-300/40 text-emerald-200 font-bold shadow-lg scale-[1.02]"
                      : "liquid-glass-subtle hover:bg-white/15 text-zinc-300 hover:text-white border border-white/18"
                  }`}
                >
                  Nouveautés
                </button>
                <button
                  type="button"
                  onClick={() => setSortMode("recent")}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    sortMode === "recent"
                      ? "liquid-glass-emerald border border-emerald-300/40 text-emerald-200 font-bold shadow-lg scale-[1.02]"
                      : "liquid-glass-subtle hover:bg-white/15 text-zinc-300 hover:text-white border border-white/18"
                  }`}
                >
                  Récents
                </button>
                <button
                  type="button"
                  onClick={() => setSortMode("title")}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    sortMode === "title"
                      ? "liquid-glass-emerald border border-emerald-300/40 text-emerald-200 font-bold shadow-lg scale-[1.02]"
                      : "liquid-glass-subtle hover:bg-white/15 text-zinc-300 hover:text-white border border-white/18"
                  }`}
                >
                  A-Z
                </button>
              </div>
            </div>

            {/* ═══════════════════════════════════════════
                4. GRILLE DE RÉSULTATS (FORMAT PORTRAIT VERTICAL)
                ═══════════════════════════════════════════ */}
            {filtered.length === 0 ? (
              <div className="py-20 text-center space-y-3 liquid-glass rounded-3xl border border-white/18 p-8">
                <div className="w-12 h-12 rounded-full liquid-glass-subtle flex items-center justify-center mx-auto text-zinc-400 border border-white/15">
                  <Film size={22} />
                </div>
                <p className="text-base font-bold text-zinc-100">Aucun résultat trouvé</p>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Essayez d'ajuster vos mots-clés ou réinitialisez les filtres pour afficher tout le contenu.
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 rounded-full liquid-glass-emerald border border-emerald-300/40 text-emerald-200 text-xs font-bold transition-all hover:scale-105 inline-flex items-center gap-1.5 mt-2 shadow-lg"
                  >
                    <RotateCcw size={13} />
                    <span>Effacer tous les filtres</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4 md:gap-5">
                {filtered.map((item) => {
                  const isTarawih =
                    item.channel === "Récitations Haramain" || item.categories.includes("Coran");
                  const reciter = isTarawih
                    ? getReciterForItem(item.title, item.description, item.channel)
                    : null;
                  const isNew = item.year >= 2025 || item.score >= 97;

                  return (
                    <div
                      key={item.id}
                      onClick={() => onInfo(item.id)}
                      className="video-thumb-interactive group relative flex flex-col rounded-2xl liquid-glass-card hover:bg-white/10 border border-white/18 hover:border-emerald-400/40 shadow-xl cursor-pointer"
                    >
                      {/* Image format portrait vertical */}
                      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-2xl bg-zinc-950">
                        <YouTubeHoverPreview
                          youtubeId={item.youtubeId}
                          image={item.image}
                          alt={item.title}
                          imageClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          fallbackImage={reciter?.photoUrl || "/images/sheikh_ali_jaber.jpg"}
                        />

                        {/* Dégradé sombre du bas vers le haut pour lisibilité */}
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/25 to-transparent pointer-events-none" />

                        {/* Badge haut gauche : Série, Nouveau ou Catégorie en Liquid Glass */}
                        <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 items-start max-w-[85%]">
                          {item.seriesId ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/25 border border-amber-400/50 text-amber-200 text-[10px] font-black uppercase tracking-wider backdrop-blur-xl shadow-md">
                              {item.episodeNumber ? `Ép. ${item.episodeNumber}` : "Série"}
                            </span>
                          ) : isNew ? (
                            <span className="px-2 py-0.5 rounded-full liquid-glass-badge-emerald text-[10px] font-black uppercase tracking-wider shadow-md">
                              Nouveau
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full liquid-glass-badge text-zinc-100 text-[10px] font-bold truncate max-w-full shadow-sm border border-white/20">
                              {item.categories[0] || item.channel}
                            </span>
                          )}
                        </div>

                        {/* Badge récitateur si Tarawih/Coran */}
                        {reciter && (
                          <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 liquid-glass-subtle px-1.5 py-0.5 rounded-full border border-white/25 shadow">
                            <img
                              src={reciter.photoUrl}
                              alt={reciter.name}
                              className="w-3.5 h-3.5 rounded-full object-cover border border-white/40"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                            <span className="text-[9px] text-zinc-200 font-semibold truncate leading-none max-w-[65px]">
                              {reciter.name.replace("Sheikh ", "")}
                            </span>
                          </div>
                        )}

                        {/* Année affichée en bas à gauche en overlay sur l'image */}
                        <div className="absolute bottom-2.5 left-3 z-10 flex items-center gap-2">
                          <span className="text-[11px] font-extrabold text-zinc-200 font-mono liquid-glass-badge px-1.5 py-0.5 rounded-md border border-white/20">
                            {item.year}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-300 drop-shadow">
                            {item.score}%
                          </span>
                        </div>

                        {/* Bouton de lecture rapide au survol */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlay(item.id);
                            }}
                            className="w-11 h-11 rounded-full liquid-glass-emerald flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:scale-105 active:scale-95 transition-all shadow-xl border border-emerald-300/50 cursor-pointer"
                            title="Lire la vidéo"
                          >
                            <Play size={18} fill="currentColor" className="ml-0.5" />
                          </button>
                        </div>
                      </div>

                      {/* Informations textuelles sous la miniature */}
                      <div className="p-3 flex-1 flex flex-col justify-between space-y-1.5">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider font-bold text-amber-300/90 line-clamp-1">
                            {item.channel}
                          </p>
                          <VideoTitleTooltip
                            item={item}
                            as="h4"
                            titleClassName="text-xs sm:text-sm font-bold text-white leading-snug mt-0.5 group-hover:text-emerald-300 transition-colors"
                            lineClamp={2}
                          />
                        </div>

                        <div className="pt-1.5 flex items-center justify-between border-t border-white/10 text-[10px] text-zinc-300">
                          <span className="truncate max-w-[120px]">
                            {item.categories.slice(0, 2).join(" · ")}
                          </span>
                          <span className="font-mono text-zinc-400">{item.duration || "15 min"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </motion.div>
  );
}

