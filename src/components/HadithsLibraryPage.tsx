import { useState, useMemo, useEffect } from "react";
import {
  BookOpenCheck,
  Search,
  Bookmark,
  BookmarkCheck,
  Copy,
  Check,
  Share2,
  Sparkles,
  X,
  ShieldCheck,
  Filter,
} from "lucide-react";
import {
  HADITHS_DATA,
  HADITH_CATEGORIES,
  type HadithCategory,
  type HadithAuthenticity,
  type HadithItem,
} from "@/data/hadiths";

type HadithsLibraryPageProps = {
  onClose?: () => void;
};

const FAVORITES_STORAGE_KEY = "sirat_hadith_favorites_v1";

export default function HadithsLibraryPage({ onClose }: HadithsLibraryPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<HadithCategory>("Toutes");
  const [selectedAuthenticity, setSelectedAuthenticity] = useState<"Tous" | HadithAuthenticity>("Tous");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const updated = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleCopy = async (hadith: HadithItem) => {
    const textToCopy = `« ${hadith.textFr} »\n\nRapporté par : ${hadith.narrator}\nSource : ${hadith.source} (${hadith.authenticity})\nRéférence : ${hadith.reference}\nPartagé depuis SiratStream`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(hadith.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const handleShare = async (hadith: HadithItem) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Hadith — ${hadith.category}`,
          text: `« ${hadith.textFr} » — Rapporté par ${hadith.narrator} (${hadith.source})`,
          url: window.location.href,
        });
      } catch {}
    } else {
      handleCopy(hadith);
    }
  };

  const filteredHadiths = useMemo(() => {
    return HADITHS_DATA.filter((item) => {
      if (onlyFavorites && !favorites.includes(item.id)) return false;
      if (selectedCategory !== "Toutes" && item.category !== selectedCategory) return false;
      if (selectedAuthenticity !== "Tous" && item.authenticity !== selectedAuthenticity) return false;

      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchText = item.textFr.toLowerCase().includes(q);
        const matchNarrator = item.narrator.toLowerCase().includes(q);
        const matchSource = item.source.toLowerCase().includes(q);
        const matchRef = item.reference.toLowerCase().includes(q);
        const matchLesson = item.lesson?.toLowerCase().includes(q);
        if (!matchText && !matchNarrator && !matchSource && !matchRef && !matchLesson) {
          return false;
        }
      }
      return true;
    });
  }, [searchQuery, selectedCategory, selectedAuthenticity, onlyFavorites, favorites]);

  return (
    <div className="w-full text-white space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl liquid-glass-emerald flex items-center justify-center text-emerald-300 border border-emerald-300/40 shadow-lg">
            <BookOpenCheck size={20} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Bibliothèque de Hadiths Authentiques</span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-400/20 text-emerald-300 border border-emerald-300/30">
                Sahih & Hasan
              </span>
            </h1>
            <p className="text-xs text-zinc-400">
              Enseignements prophétiques précieux classés par thématiques et vérifiés selon les recueils majeurs
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full liquid-glass hover:bg-white/15 text-zinc-300 hover:text-white flex items-center justify-center transition-all border border-white/20 shrink-0"
            aria-label="Fermer la bibliothèque"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Search & Filter Controls */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par mot-clé, narrateur (Abou Hourayra...), recueil..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl liquid-glass border border-white/15 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-400/60 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
                aria-label="Effacer la recherche"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Authenticity & Favorites Toggles */}
          <div className="flex items-center gap-2 shrink-0 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setOnlyFavorites((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                onlyFavorites
                  ? "bg-amber-500/25 border-amber-400/50 text-amber-200 shadow-lg shadow-amber-950/40"
                  : "liquid-glass border-white/15 text-zinc-300 hover:text-white"
              }`}
            >
              {onlyFavorites ? <BookmarkCheck size={14} className="text-amber-400" /> : <Bookmark size={14} />}
              <span>Favoris ({favorites.length})</span>
            </button>

            <div className="flex items-center liquid-glass p-1 rounded-xl border border-white/15">
              {(["Tous", "Sahih", "Hasan"] as const).map((auth) => (
                <button
                  key={auth}
                  onClick={() => setSelectedAuthenticity(auth)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    selectedAuthenticity === auth
                      ? "bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 font-bold shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {auth}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {HADITH_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition-all shrink-0 border cursor-pointer ${
                selectedCategory === cat
                  ? "liquid-glass-emerald border-emerald-300/60 text-emerald-200 shadow-md shadow-emerald-950/30 scale-102"
                  : "liquid-glass border-white/10 text-zinc-300 hover:border-white/20 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results Counter */}
      <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
        <span>
          {filteredHadiths.length} {filteredHadiths.length > 1 ? "hadiths trouvés" : "hadith trouvé"}
        </span>
        {(searchQuery || selectedCategory !== "Toutes" || selectedAuthenticity !== "Tous" || onlyFavorites) && (
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("Toutes");
              setSelectedAuthenticity("Tous");
              setOnlyFavorites(false);
            }}
            className="text-emerald-400 hover:underline cursor-pointer"
          >
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* Hadiths Grid */}
      {filteredHadiths.length === 0 ? (
        <div className="liquid-glass-card rounded-2xl p-10 text-center border border-white/10 my-6">
          <BookOpenCheck size={36} className="mx-auto text-zinc-500 mb-3 opacity-60" />
          <p className="text-zinc-300 font-semibold text-base mb-1">Aucun hadith ne correspond à vos critères</p>
          <p className="text-zinc-500 text-xs max-w-md mx-auto">
            Essayez de modifier votre mot-clé de recherche ou de réinitialiser les filtres thématiques.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredHadiths.map((hadith) => {
            const isFav = favorites.includes(hadith.id);
            const isCopied = copiedId === hadith.id;

            return (
              <article
                key={hadith.id}
                className="liquid-glass-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between border border-emerald-300/20 hover:border-emerald-400/40 transition-all duration-300 shadow-xl relative group"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-400/15 border border-emerald-300/30 text-emerald-200">
                        {hadith.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 border ${
                          hadith.authenticity === "Sahih"
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                        }`}
                      >
                        <ShieldCheck size={12} />
                        {hadith.authenticity}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleFavorite(hadith.id)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          isFav
                            ? "bg-amber-500/20 border-amber-400/40 text-amber-300"
                            : "liquid-glass border-white/10 text-zinc-400 hover:text-white"
                        }`}
                        title={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
                        aria-label="Favori"
                      >
                        {isFav ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                      </button>

                      <button
                        onClick={() => handleCopy(hadith)}
                        className="p-1.5 rounded-lg liquid-glass border border-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
                        title="Copier le texte du hadith"
                        aria-label="Copier le hadith"
                      >
                        {isCopied ? <Check size={15} className="text-emerald-300" /> : <Copy size={15} />}
                      </button>

                      <button
                        onClick={() => handleShare(hadith)}
                        className="p-1.5 rounded-lg liquid-glass border border-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
                        title="Partager"
                        aria-label="Partager"
                      >
                        <Share2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Arabic Text if available */}
                  {hadith.textAr && (
                    <p
                      dir="rtl"
                      lang="ar"
                      className="text-right text-xl sm:text-2xl leading-loose font-serif text-emerald-100/90 mb-4 pt-1"
                    >
                      {hadith.textAr}
                    </p>
                  )}

                  {/* French Translation */}
                  <p className="text-zinc-100 text-sm sm:text-base leading-relaxed mb-4 font-normal">
                    « {hadith.textFr} »
                  </p>

                  {/* Moral / Spiritual Lesson if available */}
                  {hadith.lesson && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200/90 leading-relaxed mb-4 flex items-start gap-2">
                      <Sparkles size={14} className="shrink-0 text-emerald-300 mt-0.5" />
                      <span>{hadith.lesson}</span>
                    </div>
                  )}
                </div>

                {/* Footer Metadata */}
                <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-zinc-400">
                  <div>
                    <span className="text-zinc-300 font-medium">Rapporté par : </span>
                    <span className="text-emerald-300/90">{hadith.narrator}</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate">
                    {hadith.source} • {hadith.reference}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
