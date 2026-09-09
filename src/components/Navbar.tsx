import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  Bell,
  X,
  Play,
  Sparkles,
  Clock,
  Mic,
  ChevronDown,
  Check,
  CheckCheck,
  Film,
  Compass,
  Dices,
  Sliders,
  MapPin,
} from "lucide-react";
import { type ContentItem } from "@/data/catalog";
import { useCreatorCatalog } from "@/hooks/useCreatorCatalog";
import { smartSearch, searchSuggestions } from "@/lib/smartSearch";
import ProfileMenu from "@/components/ProfileMenu";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useViewerProfile } from "@/hooks/useViewerProfile";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { SettingsTab } from "@/components/AccountSettingsModal";

type NavbarProps = {
  currentCategoryTab?: string;
  onSelectCategoryTab?: (cat: string) => void;
  onSelectContent: (id: string) => void;
  onOpenCreatorStudio?: () => void;
  onOpenCreatorAlerts?: () => void;
  onOpenPersonalSpace?: () => void;
  onOpenMyList: () => void;
  onOpenWatchHistory: () => void;
  onOpenAccountSettings: (tab?: SettingsTab) => void;
  onSwitchProfile: () => void;
  onOpenCatalog: () => void;
  onOpenRandom?: () => void;
  onOpenIslamicHub: () => void;
  onOpenOffline: () => void;
  onOpenAIAssistant?: () => void;
  onOpenSuggestions?: () => void;
  onOpenGoogleMaps?: () => void;
};

const CATALOG_MENU = [
  { id: "all", label: "Tous les genres (Vue Globale)", icon: "🌟" },
  { id: "Coran", label: "Coran & Tarawih (1980-2000)", icon: "📖", tag: "Haramain" },
  { id: "Prophètes", label: "Récits des Prophètes & Sîra", icon: "📜" },
  { id: "Compagnons", label: "Vie des Compagnons (Sahaba)", icon: "🛡️" },
  { id: "Miracles du Coran", label: "Miracles du Coran & Science", icon: "🔬" },
  { id: "Histoire & Mystère", label: "Histoire, Mystère & Enquêtes", icon: "🏛️" },
  { id: "Héros & Personnages", label: "Héros & Personnages Historiques", icon: "⚔️" },
  { id: "Eschatologie", label: "Eschatologie & Fin des Temps", icon: "⚡" },
  { id: "Anges & Djinns", label: "Monde Invisible (Anges & Djinns)", icon: "🌌" },
  { id: "creators", label: "Par Créateur & Chaîne", icon: "🎥" },
];

function getScrollContainer(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-scroll-container]");
}

function scrollAppToTop() {
  const container = getScrollContainer();
  if (container) {
    container.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function NavTooltip({
  label,
  sublabel,
  align = "center",
}: {
  label: string;
  sublabel?: string;
  align?: "center" | "left" | "right";
}) {
  const alignClass =
    align === "left"
      ? "left-0"
      : align === "right"
      ? "right-0"
      : "left-1/2 -translate-x-1/2";
  return (
    <div
      role="tooltip"
      className={`hidden sm:block absolute top-full mt-2.5 ${alignClass} pointer-events-none z-50 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out transform -translate-y-1 group-hover:translate-y-0`}
    >
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950/95 border border-emerald-300/30 text-emerald-100 text-[11px] font-medium shadow-2xl backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)]">
        <span>{label}</span>
        {sublabel && (
          <span className="text-emerald-300/70 text-[10px] font-normal">
            · {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

export default function Navbar({
  currentCategoryTab = "all",
  onSelectCategoryTab,
  onSelectContent,
  onOpenCreatorStudio,
  onOpenCreatorAlerts,
  onOpenPersonalSpace,
  onOpenMyList,
  onOpenWatchHistory,
  onOpenAccountSettings,
  onSwitchProfile,
  onOpenCatalog,
  onOpenRandom,
  onOpenIslamicHub,
  onOpenOffline,
  onOpenAIAssistant,
  onOpenSuggestions,
  onOpenGoogleMaps,
}: NavbarProps) {
  const { isCreator } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<"all" | "te" | "prophets" | "miracles" | "sahaba">("all");

  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("read_notification_ids");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const { catalog: liveCatalog, customItems } = useCreatorCatalog();
  const { activeProfile } = useViewerProfile();

  // Écoute le scroll de la carte
  useEffect(() => {
    const container = getScrollContainer();
    const target: HTMLElement | Window = container ?? window;

    const handler = () => {
      const y = container ? container.scrollTop : window.scrollY;
      setScrolled(y > 20);
    };

    target.addEventListener("scroll", handler);
    return () => target.removeEventListener("scroll", handler);
  }, []);

  // Fermeture des menus au clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-search-area]")) setSearchOpen(false);
      if (!target.closest("[data-notif-area]")) setNotifOpen(false);
      if (!target.closest("[data-cat-dropdown]")) setCatDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const searchResults = useMemo(
    () => (searchQuery.trim().length > 1 ? smartSearch(searchQuery, 10) : []),
    [searchQuery]
  );

  // Dernières vidéos ajoutées à l'application (vidéos personnalisées customItems + nouveautés isNew)
  const latestAddedVideos = useMemo(() => {
    const customList = Array.isArray(customItems) ? [...customItems] : [];
    const customIds = new Set(customList.map((c) => c.id));

    // Nouveautés officielles du catalogue
    const baseNew = (liveCatalog || []).filter(
      (item) => item.isNew && !customIds.has(item.id)
    );

    // Priorité aux vidéos ajoutées dans l'application (customItems), puis tri par année récente
    return [...customList, ...baseNew].sort((a, b) => {
      const aCustom = customIds.has(a.id);
      const bCustom = customIds.has(b.id);
      if (aCustom && !bCustom) return -1;
      if (!aCustom && bCustom) return 1;
      return (b.year || 0) - (a.year || 0);
    });
  }, [liveCatalog, customItems]);

  // Seules les nouveautés NON LUES doivent être présentes dans la notification
  const unreadLatestVideos = useMemo(() => {
    return latestAddedVideos.filter((item) => !readNotifIds.includes(item.id));
  }, [latestAddedVideos, readNotifIds]);

  const unreadCount = unreadLatestVideos.length;

  // Synchronisation des notifications lues avec Supabase si connecté
  useEffect(() => {
    let cancelled = false;

    async function loadNotificationReads() {
      if (!activeProfile || latestAddedVideos.length === 0) return;

      const newIds = latestAddedVideos.map((item) => item.id);
      const { data } = await supabase
        .from("user_notification_reads")
        .select("content_id")
        .eq("viewer_profile_id", activeProfile.id)
        .in("content_id", newIds);

      if (cancelled) return;
      if (data && data.length > 0) {
        const remoteReadIds = data.map((entry) => entry.content_id);
        setReadNotifIds((prev) => Array.from(new Set([...prev, ...remoteReadIds])));
      }
    }

    loadNotificationReads();
    return () => {
      cancelled = true;
    };
  }, [activeProfile, latestAddedVideos]);

  const filteredNotifEpisodes = useMemo(() => {
    if (notifFilter === "te") {
      return unreadLatestVideos.filter((item) => item.channel === "Towards Eternity");
    }
    if (notifFilter === "prophets") {
      return unreadLatestVideos.filter((item) => item.categories.includes("Prophètes"));
    }
    if (notifFilter === "miracles") {
      return unreadLatestVideos.filter((item) => item.categories.includes("Miracles du Coran"));
    }
    if (notifFilter === "sahaba") {
      return unreadLatestVideos.filter((item) => item.categories.includes("Compagnons"));
    }
    return unreadLatestVideos;
  }, [unreadLatestVideos, notifFilter]);

  const markAllAsRead = async () => {
    const allIds = latestAddedVideos.map((item) => item.id);
    const updated = Array.from(new Set([...readNotifIds, ...allIds]));
    setReadNotifIds(updated);
    try {
      localStorage.setItem("read_notification_ids", JSON.stringify(updated));
    } catch {}

    if (activeProfile) {
      const records = allIds.map((id) => ({
        viewer_profile_id: activeProfile.id,
        content_id: id,
        read_at: new Date().toISOString(),
      }));
      await supabase.from("user_notification_reads").upsert(records, {
        onConflict: "viewer_profile_id,content_id",
      });
    }
  };

  const markSingleAsRead = async (id: string) => {
    if (!readNotifIds.includes(id)) {
      const updated = [...readNotifIds, id];
      setReadNotifIds(updated);
      try {
        localStorage.setItem("read_notification_ids", JSON.stringify(updated));
      } catch {}

      if (activeProfile) {
        await supabase.from("user_notification_reads").upsert(
          {
            viewer_profile_id: activeProfile.id,
            content_id: id,
            read_at: new Date().toISOString(),
          },
          { onConflict: "viewer_profile_id,content_id" }
        );
      }
    }
  };

  const resetNotificationReads = () => {
    setReadNotifIds([]);
    try {
      localStorage.removeItem("read_notification_ids");
    } catch {}
  };

  const handleSelect = (id: string) => {
    onSelectContent(id);
    setSearchOpen(false);
    setSearchQuery("");
    setNotifOpen(false);
    setCatDropdownOpen(false);
  };

  const handleNotificationSelect = async (item: ContentItem) => {
    if (!readNotifIds.includes(item.id)) {
      const updated = [...readNotifIds, item.id];
      setReadNotifIds(updated);
      try {
        localStorage.setItem("read_notification_ids", JSON.stringify(updated));
      } catch {}

      if (activeProfile) {
        await supabase.from("user_notification_reads").upsert(
          {
            viewer_profile_id: activeProfile.id,
            content_id: item.id,
            read_at: new Date().toISOString(),
          },
          { onConflict: "viewer_profile_id,content_id" }
        );
      }
    }
    handleSelect(item.id);
  };

  const handleVoiceResult = useCallback((transcript: string) => {
    setSearchQuery(transcript);
  }, []);

  const { supported: voiceSupported, listening, start: startVoice } = useVoiceSearch(handleVoiceResult);

  const isThematicActive = currentCategoryTab !== "all";
  const activeGenreLabel = CATALOG_MENU.find((m) => m.id === currentCategoryTab)?.label;

  return (
    <nav
      className={`sticky top-0 z-40 rounded-t-3xl transition-all duration-500 ${
        scrolled
          ? "bg-zinc-950/90 backdrop-blur-xl shadow-2xl border-b border-emerald-300/20"
          : "bg-gradient-to-b from-zinc-950/90 via-zinc-950/40 to-transparent"
      }`}
    >
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12 h-16 flex items-center justify-between gap-3">
        {/* Logo */}
        <div className="relative group/logo flex-shrink-0">
          <div
            className="flex items-center gap-2 select-none cursor-pointer"
            onClick={() => {
              onSelectCategoryTab?.("all");
              scrollAppToTop();
            }}
            aria-label="SiratStream (sirat-stream / siratstreamapp) - siratstreamapp.com"
          >
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-6 bg-emerald-400 rounded-sm group-hover/logo:scale-y-110 transition-transform shadow-[0_0_12px_rgba(52,211,153,0.5)]" />
              <div className="w-1.5 h-4 bg-emerald-200/50 rounded-sm" />
              <div className="w-1.5 h-7 bg-white rounded-sm group-hover/logo:scale-y-110 transition-transform" />
            </div>
            <span className="text-white font-black text-lg sm:text-xl tracking-tight ml-1 whitespace-nowrap">
              SiratStream<span className="text-emerald-400 text-xs sm:text-sm font-semibold">.com</span>
            </span>
          </div>
          <NavTooltip label="SiratStream (siratstreamapp)" sublabel="siratstreamapp.com" align="left" />
        </div>

        {/* Navigation Capsule: 4 liens max (Accueil, Genres, Aléatoire, Suggestions) - Visible à partir de l'écran md */}
        <div className="hidden md:flex items-center justify-center flex-1 min-w-0 max-w-xl">
          <div className="flex items-center gap-1 sm:gap-1.5 bg-emerald-400/10 border border-emerald-300/30 backdrop-blur-xl rounded-full px-1.5 py-1 shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)]">
            {/* 1. Accueil */}
            <div className="relative group">
              <button
                onClick={() => {
                  onSelectCategoryTab?.("all");
                  scrollAppToTop();
                }}
                className={`flex-shrink-0 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                  currentCategoryTab === "all"
                    ? "bg-emerald-400 text-zinc-950 shadow-md font-bold"
                    : "text-emerald-100/80 hover:text-white hover:bg-emerald-400/15"
                }`}
              >
                Accueil
              </button>
              <NavTooltip label="Accueil" sublabel="Toutes les vidéos" />
            </div>

            {/* 2. Genres & Dropdown thématique */}
            <div className="relative group" data-cat-dropdown>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCatDropdownOpen((prev) => !prev);
                }}
                className={`flex items-center gap-1 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                  isThematicActive
                    ? "bg-emerald-400 text-zinc-950 shadow-md font-bold"
                    : "text-emerald-100/80 hover:text-white hover:bg-emerald-400/15"
                }`}
                aria-label="Choisir un genre"
              >
                <span>{isThematicActive ? activeGenreLabel?.split(" ")[0] || "Genre" : "Genres"}</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${catDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {!catDropdownOpen && (
                <NavTooltip label="Genres & Thématiques" sublabel="Explorer par catégorie" />
              )}

              {catDropdownOpen && (
                <div
                  className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 w-72 sm:w-80 bg-zinc-950/95 border border-emerald-300/30 backdrop-blur-2xl rounded-2xl shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25),0_20px_40px_rgba(0,0,0,0.6)] overflow-hidden py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                  style={{ zIndex: 100 }}
                >
                  <div className="px-3.5 py-2 border-b border-emerald-300/20 mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                      Catalogues & Thématiques
                    </span>
                    <span className="text-[10px] bg-emerald-400/15 border border-emerald-300/30 text-emerald-200 px-2 py-0.5 rounded-full">
                      {CATALOG_MENU.length} genres
                    </span>
                  </div>

                  <div className="max-h-80 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-zinc-800">
                    {CATALOG_MENU.map((entry) => {
                      const isSelected = currentCategoryTab === entry.id;
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => {
                            onSelectCategoryTab?.(entry.id);
                            setCatDropdownOpen(false);
                            scrollAppToTop();
                          }}
                          className={`w-full text-left px-3.5 py-2.5 text-xs transition-colors flex items-center justify-between group ${
                            isSelected
                              ? "bg-emerald-400/20 text-emerald-200 font-semibold"
                              : "text-zinc-300 hover:text-white hover:bg-emerald-400/10"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <span className="text-sm flex-shrink-0">{entry.icon}</span>
                            <span className="truncate">{entry.label}</span>
                          </div>
                          {entry.tag && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded border border-emerald-300/20 text-emerald-300 group-hover:border-emerald-300/40 flex-shrink-0">
                              {entry.tag}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Aléatoire */}
            {onOpenRandom && (
              <div className="relative group">
                <button
                  onClick={onOpenRandom}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap text-emerald-300 hover:text-emerald-200 hover:bg-emerald-400/15 border border-emerald-300/30 transition-colors"
                  aria-label="Découvrir un média aléatoire"
                >
                  <Dices size={14} className="text-emerald-400" />
                  <span>Aléatoire</span>
                </button>
                <NavTooltip label="Aléatoire" sublabel="Lecture surprise" />
              </div>
            )}

            {/* 4. Suggestions */}
            {onOpenSuggestions && (
              <div className="relative group">
                <button
                  onClick={onOpenSuggestions}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap text-emerald-200 hover:text-white hover:bg-emerald-400/15 transition-colors hidden sm:flex"
                  aria-label="Suggérer une vidéo"
                >
                  <Sparkles size={13} className="text-emerald-300" />
                  <span>Suggestions</span>
                </button>
                <NavTooltip label="Suggestions" sublabel="Proposer une vidéo" />
              </div>
            )}

            {/* 5. Google Maps Explorer */}
            {onOpenGoogleMaps && (
              <div className="relative group">
                <button
                  onClick={onOpenGoogleMaps}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap text-emerald-300 hover:text-white hover:bg-emerald-400/20 border border-emerald-400/30 transition-colors"
                  aria-label="Explorer les Lieux Saints sur Google Maps"
                >
                  <MapPin size={13} className="text-emerald-400" />
                  <span>Carte</span>
                </button>
                <NavTooltip label="Google Maps" sublabel="Lieux Saints & Récits" />
              </div>
            )}
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
          {/* Recherche */}
          <div className="relative" data-search-area>
            {searchOpen ? (
              <div className="flex items-center bg-zinc-900/95 border border-zinc-700 rounded-full overflow-hidden shadow-2xl">
                <Search size={16} className="ml-3 flex-shrink-0 text-zinc-400" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Rechercher une vidéo, un récit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-white text-sm px-3 py-2 w-36 sm:w-64 outline-none placeholder-zinc-500"
                />
                {voiceSupported && (
                  <button
                    onClick={startVoice}
                    className={`px-2 flex-shrink-0 transition-colors ${
                      listening ? "text-white animate-pulse" : "text-zinc-400 hover:text-white"
                    }`}
                    title={listening ? "Écoute en cours..." : "Recherche vocale"}
                  >
                    <Mic size={16} />
                  </button>
                )}
                <button
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery("");
                  }}
                  className="pr-3 text-zinc-400 hover:text-white"
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <div className="relative group">
                <button
                  onClick={() => setSearchOpen(true)}
                  className="text-zinc-300 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
                  aria-label="Rechercher"
                >
                  <Search size={18} />
                </button>
                <NavTooltip label="Recherche" sublabel="Titre, récit ou catégorie" align="right" />
              </div>
            )}

            {searchOpen && (
              <div className="absolute top-full mt-2 right-0 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden max-h-[70vh] overflow-y-auto z-50">
                {searchQuery.trim().length <= 1 ? (
                  <div className="p-4">
                    <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold mb-3">
                      Suggestions de recherche
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {searchSuggestions.map((sug) => (
                        <button
                          key={sug}
                          onClick={() => setSearchQuery(sug)}
                          className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs rounded-full border border-zinc-800 transition-colors"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div>
                    <p className="px-4 pt-3 pb-2 text-zinc-500 text-xs uppercase tracking-wider font-semibold">
                      {searchResults.length} résultat{searchResults.length > 1 ? "s" : ""}
                    </p>
                    {searchResults.map((item: ContentItem) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.id)}
                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-zinc-900 transition-colors text-left border-t border-zinc-800/50"
                      >
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-16 h-10 object-cover rounded-md flex-shrink-0"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            if (!img.src.includes("hqdefault")) {
                              img.src = `https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg`;
                            }
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-sm font-medium leading-tight truncate">
                            {item.title}
                          </p>
                          <p className="text-zinc-500 text-xs mt-0.5">
                            {item.categories.slice(0, 2).join(" · ")} · {item.channel}
                          </p>
                        </div>
                        <Play size={14} className="text-zinc-500 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-zinc-500 text-xs">
                    Aucun résultat trouvé pour "{searchQuery}".
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Logo / Menu Notifications : Affiche UNIQUEMENT les dernières vidéos ajoutées, et vide une fois toutes lues */}
          <div className="relative group" data-notif-area>
            <button
              onClick={() => setNotifOpen((prev) => !prev)}
              className="text-zinc-300 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10 relative"
              aria-label="Nouveautés & notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full min-w-[18px] h-[18px] flex items-center justify-center border-2 border-zinc-950 shadow-md animate-in zoom-in-50 duration-200">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {!notifOpen && (
              <NavTooltip
                label="Notifications"
                sublabel={unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : "À jour (0)"}
                align="right"
              />
            )}

            {notifOpen && (
              <div
                className="absolute top-full mt-2.5 right-0 w-80 sm:w-[420px] max-w-[calc(100vw-1.5rem)] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden max-h-[75vh] flex flex-col z-50 animate-in fade-in zoom-in-95 duration-150"
                style={{ zIndex: 100 }}
              >
                {/* Header de notifications */}
                <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        unreadCount > 0 ? "bg-red-500 animate-pulse" : "bg-emerald-500"
                      }`}
                    />
                    <div>
                      <p className="text-white font-bold text-xs">
                        Dernières Vidéos Ajoutées
                      </p>
                      <p className="text-zinc-400 text-[10px]">
                        {unreadCount > 0
                          ? `${unreadCount} nouvelle${unreadCount > 1 ? "s" : ""} vidéo${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`
                          : "Boîte vide · Vous êtes à jour"}
                      </p>
                    </div>
                  </div>

                  {unreadCount > 0 ? (
                    <button
                      onClick={markAllAsRead}
                      className="text-[11px] text-zinc-300 hover:text-white flex items-center gap-1 bg-zinc-800/80 hover:bg-zinc-700/80 px-2.5 py-1 rounded-lg transition-colors border border-zinc-700/50"
                      title="Marquer toutes les nouveautés comme lues"
                    >
                      <CheckCheck size={13} className="text-emerald-400" />
                      <span>Tout marquer lu</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCheck size={12} /> À jour
                    </span>
                  )}
                </div>

                {/* Filtres rapides par thématique des nouveautés non lues */}
                {unreadCount > 0 && (
                  <div className="px-3 py-2 border-b border-zinc-800/60 bg-zinc-900/40 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                    <button
                      onClick={() => setNotifFilter("all")}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors ${
                        notifFilter === "all"
                          ? "bg-white text-black"
                          : "bg-zinc-800/60 text-zinc-300 hover:text-white"
                      }`}
                    >
                      Toutes ({unreadLatestVideos.length})
                    </button>
                    {unreadLatestVideos.some((i) => i.channel === "Towards Eternity") && (
                      <button
                        onClick={() => setNotifFilter("te")}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors ${
                          notifFilter === "te"
                            ? "bg-white text-black"
                            : "bg-zinc-800/60 text-zinc-300 hover:text-white"
                        }`}
                      >
                        Towards Eternity ({unreadLatestVideos.filter((i) => i.channel === "Towards Eternity").length})
                      </button>
                    )}
                    {unreadLatestVideos.some((i) => i.categories.includes("Prophètes")) && (
                      <button
                        onClick={() => setNotifFilter("prophets")}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors ${
                          notifFilter === "prophets"
                            ? "bg-white text-black"
                            : "bg-zinc-800/60 text-zinc-300 hover:text-white"
                        }`}
                      >
                        Prophètes & Sîra
                      </button>
                    )}
                    {unreadLatestVideos.some((i) => i.categories.includes("Miracles du Coran")) && (
                      <button
                        onClick={() => setNotifFilter("miracles")}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors ${
                          notifFilter === "miracles"
                            ? "bg-white text-black"
                            : "bg-zinc-800/60 text-zinc-300 hover:text-white"
                        }`}
                      >
                        Miracles & Science
                      </button>
                    )}
                  </div>
                )}

                {/* Liste scrollable des nouveaux épisodes non lus, vide une fois tout lu */}
                <div className="overflow-y-auto flex-1 divide-y divide-zinc-800/40">
                  {unreadCount === 0 ? (
                    <div className="py-12 px-6 text-center flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
                        <CheckCheck size={22} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-white text-sm font-semibold">Toutes les nouveautés sont lues</p>
                        <p className="text-zinc-400 text-xs max-w-xs leading-relaxed">
                          Votre boîte de notifications est vide. Les prochaines vidéos ajoutées à l'application apparaîtront ici.
                        </p>
                      </div>
                      {readNotifIds.length > 0 && (
                        <button
                          onClick={resetNotificationReads}
                          className="mt-2 text-[11px] text-zinc-500 hover:text-zinc-300 hover:underline transition-colors"
                        >
                          Réinitialiser pour revoir les nouveautés
                        </button>
                      )}
                    </div>
                  ) : filteredNotifEpisodes.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 text-xs">
                      Aucune nouvelle vidéo non lue dans ce filtre.
                    </div>
                  ) : (
                    filteredNotifEpisodes.map((item: ContentItem) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 w-full p-3 hover:bg-zinc-900 transition-colors text-left group border-b border-zinc-800/40 last:border-b-0"
                      >
                        <button
                          onClick={() => handleNotificationSelect(item)}
                          className="relative flex-shrink-0 cursor-pointer"
                          title={`Lire ${item.title}`}
                        >
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-20 h-12 object-cover rounded-lg border border-zinc-800 group-hover:border-emerald-500/50 transition-colors"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              if (!img.src.includes("hqdefault")) {
                                img.src = `https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg`;
                              }
                            }}
                          />
                          <span className="absolute -top-1 -left-1 px-1.5 py-0.2 bg-emerald-600 text-white text-[9px] font-extrabold rounded shadow-md uppercase tracking-wider">
                            NOUVEAU
                          </span>
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <Play size={16} className="text-white fill-white" />
                          </div>
                        </button>

                        <div
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => handleNotificationSelect(item)}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 animate-pulse" />
                            <p className="text-white text-xs font-semibold leading-tight line-clamp-2 group-hover:text-emerald-300 transition-colors">
                              {item.title}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-zinc-400 text-[10px] mt-1">
                            <span className="text-zinc-300 font-medium">{item.channel}</span>
                            <span>·</span>
                            <span>{item.categories[0]}</span>
                            <span>·</span>
                            <span className="text-zinc-500">{item.year}</span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markSingleAsRead(item.id);
                          }}
                          className="p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 rounded-lg transition-colors flex-shrink-0"
                          title="Marquer comme lu et retirer de la liste"
                          aria-label="Marquer comme lu"
                        >
                          <Check size={15} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer avec lien vers catalogue complet et réglages des notifications */}
                <div className="p-3 border-t border-zinc-800 bg-zinc-950 flex items-center gap-2 text-xs">
                  <button
                    onClick={() => {
                      setNotifOpen(false);
                      onOpenCatalog();
                    }}
                    className="flex-1 text-center py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-1.5 border border-zinc-800"
                  >
                    <Film size={13} className="text-zinc-400" />
                    <span>Catalogue ({liveCatalog.length})</span>
                  </button>
                  <button
                    onClick={() => {
                      setNotifOpen(false);
                      onOpenAccountSettings("notifications");
                    }}
                    className="py-2 px-3 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 hover:text-emerald-200 rounded-xl font-semibold transition-colors flex items-center justify-center gap-1.5 border border-emerald-500/30"
                    title="Gérer les rappels de prière et les notifications par chaîne"
                  >
                    <Sliders size={13} />
                    <span>Réglages</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Noor IA Universal Assistant Button */}
          {onOpenAIAssistant && (
            <div className="relative group">
              <button
                onClick={onOpenAIAssistant}
                className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 transition-all shadow-sm active:scale-95"
                aria-label="Ouvrir Noor IA"
              >
                <Sparkles size={16} className="animate-pulse text-emerald-400" />
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-zinc-950"></span>
                </span>
              </button>
              <NavTooltip label="Noor IA" sublabel="Assistant Spirituel" align="right" />
            </div>
          )}

          {/* Profile & User Controls Dropdown (contains Thème, Date Hijri, Studio Créateur, Espace Pratique) */}
          <ProfileMenu
            onOpenCreatorStudio={onOpenCreatorStudio}
            onOpenCreatorAlerts={onOpenCreatorAlerts}
            onOpenPersonalSpace={onOpenPersonalSpace}
            onOpenMyList={onOpenMyList}
            onOpenWatchHistory={onOpenWatchHistory}
            onOpenAccountSettings={onOpenAccountSettings}
            onSwitchProfile={onSwitchProfile}
            onOpenIslamicHub={onOpenIslamicHub}
            onOpenOffline={onOpenOffline}
            onOpenSuggestions={onOpenSuggestions}
          />
        </div>
      </div>
    </nav>
  );
}
