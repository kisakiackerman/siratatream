import { useState, useCallback } from "react";
import {
  X,
  Sparkles,
  Search,
  BookOpen,
  Moon,
  BookOpenCheck,
  Music,
  Dices,
  Play,
} from "lucide-react";
import { motion } from "motion/react";
import { type ContentItem, type Category } from "@/data/catalog";
import { useCreatorCatalog } from "@/hooks/useCreatorCatalog";

type RandomPageProps = {
  onClose: () => void;
  onPlay: (id: string) => void;
  onBrowseCatalog: (categories: Category[]) => void;
};

type ThemeCard = {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof BookOpen;
  categories: Category[];
  filterFn?: (item: ContentItem) => boolean;
  accentColor: string;
  hoverBorder: string;
  glowColor: string;
};

const THEMES: ThemeCard[] = [
  {
    id: "prophets",
    title: "RÉCITS PROPHÉTIQUES",
    subtitle: "PROPHÈTES & COMPAGNONS",
    icon: BookOpen,
    categories: ["Prophètes", "Compagnons", "Héros & Personnages"],
    accentColor: "text-emerald-400",
    hoverBorder: "hover:border-emerald-500/60",
    glowColor: "hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]",
  },
  {
    id: "mysteries",
    title: "MYSTÈRES & SIGNES",
    subtitle: "ANGES, DJINNS & ESCHATOLOGIE",
    icon: Moon,
    categories: ["Anges & Djinns", "Eschatologie", "Histoire & Mystère"],
    accentColor: "text-teal-400",
    hoverBorder: "hover:border-teal-500/60",
    glowColor: "hover:shadow-[0_0_30px_rgba(45,212,191,0.15)]",
  },
  {
    id: "miracles",
    title: "MIRACLES DU CORAN",
    subtitle: "SCIENCE & RÉVÉLATION",
    icon: BookOpenCheck,
    categories: ["Miracles du Coran"],
    accentColor: "text-amber-400",
    hoverBorder: "hover:border-amber-500/60",
    glowColor: "hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]",
  },
  {
    id: "recitations",
    title: "RÉCITATIONS",
    subtitle: "SÉRÉNITÉ & RECUEILLEMENT",
    icon: Music,
    categories: ["Coran"],
    filterFn: (item) =>
      item.categories.includes("Coran") || item.channel === "Récitations Haramain",
    accentColor: "text-emerald-300",
    hoverBorder: "hover:border-emerald-400/60",
    glowColor: "hover:shadow-[0_0_30px_rgba(52,211,153,0.15)]",
  },
];

export default function RandomPage({
  onClose,
  onPlay,
  onBrowseCatalog,
}: RandomPageProps) {
  const { catalog } = useCreatorCatalog();
  const [rollingThemeId, setRollingThemeId] = useState<string | null>(null);

  // Fonction de tirage aléatoire selon le thème
  const handleRandomPick = useCallback(
    (theme: ThemeCard) => {
      let pool: ContentItem[] = [];

      if (theme.filterFn) {
        pool = catalog.filter(theme.filterFn);
      } else {
        pool = catalog.filter((item) =>
          item.categories.some((cat) => theme.categories.includes(cat))
        );
      }

      if (pool.length === 0) {
        pool = catalog;
      }

      setRollingThemeId(theme.id);

      // Micro-délai pour animation immersive
      setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * pool.length);
        const chosen = pool[randomIndex];
        setRollingThemeId(null);
        if (chosen) {
          onPlay(chosen.id);
        }
      }, 350);
    },
    [catalog, onPlay]
  );

  // Tirage global tout catalogue
  const handleGlobalRandomPick = useCallback(() => {
    if (catalog.length === 0) return;
    setRollingThemeId("global");
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * catalog.length);
      const chosen = catalog[randomIndex];
      setRollingThemeId(null);
      if (chosen) {
        onPlay(chosen.id);
      }
    }, 350);
  }, [catalog, onPlay]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="fixed inset-0 z-50 bg-zinc-950 text-zinc-100 overflow-y-auto selection:bg-emerald-500 selection:text-black flex flex-col"
    >
      {/* Bouton de fermeture flottant en haut à droite */}
      <button
        onClick={onClose}
        aria-label="Fermer la page Aléatoire"
        className="fixed top-5 right-5 sm:top-7 sm:right-8 z-30 w-10 h-10 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-300 hover:text-white shadow-xl backdrop-blur-md transition-all active:scale-95 cursor-pointer"
      >
        <X size={20} />
      </button>

      {/* Fond d'ambiance et halo subtil */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[350px] bg-emerald-500/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-10 left-1/3 w-[500px] h-[300px] bg-teal-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-12 py-12 sm:py-16 my-auto flex flex-col items-center">
        {/* ═══════════════════════════════════════════
            1. EN-TÊTE
            ═══════════════════════════════════════════ */}
        <div className="text-center space-y-4 max-w-3xl mx-auto mb-12 sm:mb-16">
          {/* Petit badge pilule en haut, centré, cliquable */}
          <button
            onClick={handleGlobalRandomPick}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800/90 border border-emerald-500/30 text-emerald-400 text-[11px] sm:text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-950/40 backdrop-blur-md transition-all hover:scale-105 active:scale-95 group cursor-pointer"
            title="Tirer au sort dans toute la vidéothèque"
          >
            <Sparkles size={14} className="text-emerald-400 group-hover:rotate-12 transition-transform" />
            <span>GÉNÉRATEUR ISLAMIQUE</span>
            <Dices size={13} className="ml-0.5 opacity-70 group-hover:opacity-100" />
          </button>

          {/* Très grand titre centré : ALÉATOIRE */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black uppercase tracking-tight text-white drop-shadow-lg">
            <span>ALÉA</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600">
              TOIRE
            </span>
          </h1>

          {/* Sous-titre centré */}
          <p className="text-sm sm:text-base md:text-lg text-zinc-400 font-normal max-w-xl mx-auto leading-relaxed">
            Explorez l'inconnu. Un clic pour transcender votre bibliothèque.
          </p>
        </div>

        {/* ═══════════════════════════════════════════
            2. CARTES THÉMATIQUES (GRILLE DE 4)
            ═══════════════════════════════════════════ */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {THEMES.map((theme) => {
            const Icon = theme.icon;
            const isRolling = rollingThemeId === theme.id;

            return (
              <motion.div
                key={theme.id}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                onClick={() => handleRandomPick(theme)}
                className={`relative group flex flex-col items-center justify-between text-center p-7 sm:p-8 rounded-3xl bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-800/90 ${theme.hoverBorder} ${theme.glowColor} transition-all duration-300 backdrop-blur-md shadow-xl cursor-pointer select-none overflow-hidden`}
              >
                {/* Icône loupe en tout petit en haut à droite de la carte */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBrowseCatalog(theme.categories);
                  }}
                  className="absolute top-4 right-4 p-2 rounded-xl text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80 border border-transparent hover:border-zinc-700/60 transition-all cursor-pointer z-10"
                  title="Parcourir ces catégories dans le catalogue"
                >
                  <Search size={15} />
                </button>

                {/* Effet halo d'ambiance au survol dans la carte */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

                <div className="flex flex-col items-center space-y-5 my-auto py-2">
                  {/* Carré arrondi avec l'icône principale */}
                  <div
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-zinc-800/90 border border-zinc-700/70 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-zinc-800 transition-all duration-300 ${
                      isRolling ? "animate-spin" : ""
                    }`}
                  >
                    <Icon size={32} className={`${theme.accentColor} transition-transform`} />
                  </div>

                  {/* Nom du thème en très grand, gras, majuscules, blanc */}
                  <div className="space-y-1.5">
                    <h3 className="text-base sm:text-lg font-black uppercase tracking-wide text-white group-hover:text-emerald-300 transition-colors leading-tight">
                      {theme.title}
                    </h3>
                    {/* Courte accroche en dessous en majuscules petite taille gris */}
                    <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-zinc-500 group-hover:text-zinc-400 transition-colors">
                      {theme.subtitle}
                    </p>
                  </div>
                </div>

                {/* Indicateur d'action subtil au survol */}
                <div className="mt-4 pt-3 w-full border-t border-zinc-800/60 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-zinc-400 group-hover:text-emerald-400 transition-colors">
                  <Play size={12} fill="currentColor" />
                  <span>Lancer un épisode</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bouton de secours ou tirage instantané universel en bas */}
        <div className="mt-12 text-center">
          <button
            onClick={handleGlobalRandomPick}
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-emerald-500/50 text-zinc-300 hover:text-white text-xs sm:text-sm font-bold shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Dices size={16} className="text-emerald-400" />
            <span>Tirage 100% Aléatoire (Tous genres confondus)</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
