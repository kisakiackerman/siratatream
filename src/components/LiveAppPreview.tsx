import { useState, useMemo, useRef } from "react";
import {
  Monitor,
  Tablet,
  Smartphone,
  RotateCw,
  Search,
  Play,
  ExternalLink,
  X,
} from "lucide-react";
import Hero from "@/components/Hero";
import ContentRow from "@/components/ContentRow";
import DailyReminder from "@/components/DailyReminder";
import PrayerTimes from "@/components/PrayerTimes";
import { useCreatorCatalog } from "@/hooks/useCreatorCatalog";
import {
  getContentByCategory,
  getContentByChannel,
  type Category,
  type ContentItem,
} from "@/data/catalog";

interface LiveAppPreviewProps {
  onPlayVideo?: (item: ContentItem) => void;
  onInspectItem?: (item: ContentItem) => void;
  onExitToApp?: () => void;
}

type ViewportDevice = "desktop" | "tablet" | "mobile";

const PREVIEW_CATEGORY_TABS = [
  { id: "all", label: "Accueil" },
  { id: "Coran", label: "Coran" },
  { id: "Prophètes", label: "Prophètes" },
  { id: "Compagnons", label: "Compagnons" },
  { id: "Miracles du Coran", label: "Miracles" },
  { id: "Eschatologie", label: "Eschatologie" },
  { id: "creators", label: "Créateurs" },
];

export default function LiveAppPreview({
  onPlayVideo,
  onInspectItem,
  onExitToApp,
}: LiveAppPreviewProps) {
  const { catalog, customItems, customCategories, customChannels } = useCreatorCatalog();

  const [device, setDevice] = useState<ViewportDevice>("desktop");
  const [categoryTab, setCategoryTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const availableCategories = useMemo(() => {
    const base = [...PREVIEW_CATEGORY_TABS];
    customCategories.forEach((cat) => {
      if (!base.some((b) => b.id === cat)) {
        base.splice(base.length - 1, 0, { id: cat, label: cat });
      }
    });
    return base;
  }, [customCategories]);

  const quranItems = useMemo(() => getContentByCategory("Coran"), [catalog]);
  const prophetsItems = useMemo(() => getContentByCategory("Prophètes"), [catalog]);
  const companionsItems = useMemo(() => getContentByCategory("Compagnons"), [catalog]);
  const miraclesItems = useMemo(() => getContentByCategory("Miracles du Coran"), [catalog]);
  const eschatologyItems = useMemo(() => getContentByCategory("Eschatologie"), [catalog]);
  const savantsItems = useMemo(
    () => getContentByChannel("Les Savants de la Sunnah"),
    [catalog]
  );

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return catalog
      .filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.channel.toLowerCase().includes(q) ||
          item.categories.some((c) => c.toLowerCase().includes(q))
      )
      .slice(0, 18);
  }, [catalog, searchQuery]);

  const handlePlayById = (id: string) => {
    const found = catalog.find((c) => c.id === id);
    if (found && onPlayVideo) {
      onPlayVideo(found);
    }
  };

  const handleInfoById = (id: string) => {
    const found = catalog.find((c) => c.id === id);
    if (!found) return;
    if (onInspectItem) {
      onInspectItem(found);
    } else if (onPlayVideo) {
      onPlayVideo(found);
    }
  };

  const handleRefresh = () => {
    setCategoryTab("all");
    setSearchQuery("");
    setRefreshKey((k) => k + 1);
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const frameWidthClass =
    device === "mobile"
      ? "max-w-[390px]"
      : device === "tablet"
      ? "max-w-[768px]"
      : "max-w-full";

  return (
    <div className="space-y-4 font-sans">
      {/* Barre d'outils d'aperçu */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Sélecteur d'appareil */}
          <div className="flex items-center gap-1 p-1 bg-zinc-950 rounded-lg border border-zinc-800">
            <button
              type="button"
              onClick={() => setDevice("desktop")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                device === "desktop"
                  ? "bg-emerald-500 text-zinc-950 font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Monitor size={14} />
              <span>Bureau</span>
            </button>
            <button
              type="button"
              onClick={() => setDevice("tablet")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                device === "tablet"
                  ? "bg-emerald-500 text-zinc-950 font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Tablet size={14} />
              <span>Tablette</span>
            </button>
            <button
              type="button"
              onClick={() => setDevice("mobile")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                device === "mobile"
                  ? "bg-emerald-500 text-zinc-950 font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Smartphone size={14} />
              <span>Mobile</span>
            </button>
          </div>

          <span className="text-xs text-zinc-400 tabular-nums hidden sm:inline">
            {catalog.length} vidéos · {customChannels.length + 18} chaînes
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            <RotateCw size={13} />
            <span>Actualiser</span>
          </button>

          {onExitToApp && (
            <button
              type="button"
              onClick={onExitToApp}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-xs font-semibold text-zinc-950 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              <ExternalLink size={13} />
              <span>Ouvrir l'application</span>
            </button>
          )}
        </div>
      </div>

      {/* Conteneur de prévisualisation de l'application SiratStream en direct */}
      <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-3 sm:p-4 flex justify-center overflow-hidden">
        <div
          key={refreshKey}
          ref={scrollContainerRef}
          data-theme="dark"
          className={`w-full ${frameWidthClass} h-[620px] overflow-y-auto overflow-x-hidden rounded-xl border border-zinc-800 shadow-2xl transition-all duration-200 relative bg-zinc-950 text-white ${
            device === "mobile"
              ? "[&_.hero-section]:!h-[360px] [&_.hero-section]:!min-h-[340px] [&_.hero-section>div:last-child]:!pb-10"
              : "[&_.hero-section]:!h-[450px] [&_.hero-section]:!min-h-[400px] [&_.hero-section>div:last-child]:!pb-14"
          }`}
        >
          {/* Barre de navigation en direct de l'application */}
          <header className="sticky top-0 z-30 border-b backdrop-blur-xl px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 bg-zinc-950/90 border-white/10 text-white">
            <button
              type="button"
              onClick={() => {
                setCategoryTab("all");
                setSearchQuery("");
                scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <div className="flex items-center gap-0.5">
                <span className="w-1 h-4 bg-emerald-500 rounded-sm" />
                <span className="w-1 h-3 bg-emerald-300/60 rounded-sm" />
                <span className="w-1 h-5 rounded-sm bg-white" />
              </div>
              <span className="font-extrabold text-sm sm:text-base tracking-tight whitespace-nowrap">
                SiratStream
              </span>
            </button>

            {device !== "mobile" && (
              <nav className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {availableCategories.map((tab) => {
                  const active = categoryTab === tab.id && !searchQuery.trim();
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setCategoryTab(tab.id);
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                        active
                          ? "bg-emerald-500/20 text-emerald-400 font-semibold"
                          : "text-zinc-300 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            )}

            <div className="relative w-36 sm:w-48 shrink-0">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-8 pr-7 py-1.5 rounded-lg text-xs border focus:outline-none focus:border-emerald-500 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                  aria-label="Effacer la recherche"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </header>

          {/* Barre de catégories mobile dans le cadre */}
          {device === "mobile" && (
            <div className="px-3 py-2 border-b flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-zinc-950 border-white/10">
              {availableCategories.map((tab) => {
                const active = categoryTab === tab.id && !searchQuery.trim();
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setCategoryTab(tab.id);
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? "bg-emerald-500 text-zinc-950 font-semibold"
                        : "bg-zinc-900 text-zinc-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Vue Recherche en direct */}
          {searchQuery.trim().length > 0 ? (
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">
                  Résultats pour « {searchQuery} » ({searchResults.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-emerald-400 hover:underline cursor-pointer"
                >
                  Revenir à l'accueil
                </button>
              </div>
              {searchResults.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-400 border border-dashed border-zinc-800 rounded-xl">
                  Aucune vidéo trouvée dans le catalogue actuel.
                </div>
              ) : (
                <div
                  className={`grid gap-3 ${
                    device === "mobile"
                      ? "grid-cols-1"
                      : device === "tablet"
                      ? "grid-cols-2"
                      : "grid-cols-3 lg:grid-cols-4"
                  }`}
                >
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handlePlayById(item.id)}
                      className="text-left rounded-xl overflow-hidden border border-zinc-800/80 bg-zinc-900/70 hover:border-emerald-500/50 transition-colors group cursor-pointer"
                    >
                      <div className="relative aspect-video bg-zinc-900 overflow-hidden">
                        <img
                          src={item.thumbnail || item.image}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <div className="w-9 h-9 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center">
                            <Play size={16} fill="currentColor" className="ml-0.5" />
                          </div>
                        </div>
                      </div>
                      <div className="p-3 space-y-1">
                        <p className="text-xs font-semibold line-clamp-2 text-white">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-zinc-400 truncate">
                          {item.channel} · {item.categories[0]}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Bannière Hero réelle synchronisée */}
              <Hero
                categoryTab={categoryTab}
                onPlay={(id) => handlePlayById(id)}
                onInfo={(id) => handleInfoById(id)}
              />

              {/* Corps de l'application */}
              <div className="relative z-10 -mt-4 space-y-6 pb-10">
                {categoryTab === "all" && (
                  <div className="space-y-5">
                    <div className="px-4 sm:px-6 lg:px-10">
                      <div
                        className={`grid gap-3 ${
                          device === "mobile" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
                        }`}
                      >
                        <DailyReminder compact />
                        <PrayerTimes compact onClose={() => {}} />
                      </div>
                    </div>

                    {customItems.length > 0 && (
                      <ContentRow
                        label="Ajouts récents du créateur"
                        items={customItems}
                        onPlay={(id) => handlePlayById(id)}
                        onInfo={(id) => handleInfoById(id)}
                        limit={10}
                      />
                    )}

                    <ContentRow
                      label="Les Savants de la Sunnah"
                      items={savantsItems}
                      onPlay={(id) => handlePlayById(id)}
                      onInfo={(id) => handleInfoById(id)}
                      limit={10}
                    />

                    <ContentRow
                      label="Le Noble Coran : Récitations & Prières"
                      items={quranItems}
                      onPlay={(id) => handlePlayById(id)}
                      onInfo={(id) => handleInfoById(id)}
                      limit={8}
                    />

                    <ContentRow
                      label="Récits des Prophètes"
                      items={prophetsItems}
                      onPlay={(id) => handlePlayById(id)}
                      onInfo={(id) => handleInfoById(id)}
                      limit={8}
                    />

                    <ContentRow
                      label="Vie des Compagnons"
                      items={companionsItems}
                      onPlay={(id) => handlePlayById(id)}
                      onInfo={(id) => handleInfoById(id)}
                      limit={8}
                    />

                    <ContentRow
                      label="Miracles du Coran & Sciences"
                      items={miraclesItems}
                      onPlay={(id) => handlePlayById(id)}
                      onInfo={(id) => handleInfoById(id)}
                      limit={8}
                    />

                    <ContentRow
                      label="Eschatologie & Fin des Temps"
                      items={eschatologyItems}
                      onPlay={(id) => handlePlayById(id)}
                      onInfo={(id) => handleInfoById(id)}
                      limit={8}
                    />
                  </div>
                )}

                {categoryTab === "creators" && (
                  <div className="space-y-6 pt-6">
                    <div className="px-4 sm:px-6 lg:px-10 flex items-center justify-between">
                      <h3 className="text-base font-bold">Par Créateur & Chaîne</h3>
                      <button
                        type="button"
                        onClick={() => setCategoryTab("all")}
                        className="text-xs text-emerald-400 hover:underline cursor-pointer"
                      >
                        Revenir à l'accueil
                      </button>
                    </div>
                    <ContentRow
                      label="Les Savants de la Sunnah"
                      items={getContentByChannel("Les Savants de la Sunnah")}
                      onPlay={(id) => handlePlayById(id)}
                      onInfo={(id) => handleInfoById(id)}
                    />
                    <ContentRow
                      label="Récitations Haramain"
                      items={getContentByChannel("Récitations Haramain")}
                      onPlay={(id) => handlePlayById(id)}
                      onInfo={(id) => handleInfoById(id)}
                    />
                    <ContentRow
                      label="NARRO"
                      items={getContentByChannel("NARRO")}
                      onPlay={(id) => handlePlayById(id)}
                      onInfo={(id) => handleInfoById(id)}
                    />
                    <ContentRow
                      label="Mosquée Mirail Toulouse"
                      items={getContentByChannel("Mosquée Mirail Toulouse")}
                      onPlay={(id) => handlePlayById(id)}
                      onInfo={(id) => handleInfoById(id)}
                    />
                    {customChannels.map((ch) => (
                      <ContentRow
                        key={ch.name}
                        label={ch.name}
                        items={catalog.filter((item) => item.channel === ch.name)}
                        onPlay={(id) => handlePlayById(id)}
                        onInfo={(id) => handleInfoById(id)}
                      />
                    ))}
                  </div>
                )}

                {categoryTab !== "all" && categoryTab !== "creators" && (
                  <div className="space-y-6 pt-6">
                    <div className="px-4 sm:px-6 lg:px-10 flex items-center justify-between">
                      <h3 className="text-base font-bold">Catégorie : {categoryTab}</h3>
                      <button
                        type="button"
                        onClick={() => setCategoryTab("all")}
                        className="text-xs text-emerald-400 hover:underline cursor-pointer"
                      >
                        Revenir à l'accueil
                      </button>
                    </div>
                    <ContentRow
                      label={`Sélection — ${categoryTab}`}
                      items={getContentByCategory(categoryTab as Category)}
                      onPlay={(id) => handlePlayById(id)}
                      onInfo={(id) => handleInfoById(id)}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
