import { useState, useCallback, useMemo, useEffect } from "react";
import { AnimatePresence } from "motion/react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ViewerProfileProvider, useViewerProfile } from "@/hooks/useViewerProfile";
import { ThemeProvider } from "@/hooks/useTheme";
import { MyListProvider } from "@/lib/useMyList";
import { CreatorCatalogProvider, useCreatorCatalog } from "@/hooks/useCreatorCatalog";
import { enrichCatalogWithYouTubeAPI } from "@/lib/youtubeApi";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ContentRow from "@/components/ContentRow";
import ContinueWatchingRow from "@/components/ContinueWatchingRow";
import RecommendedRow from "@/components/RecommendedRow";
import PreferenceRow from "@/components/PreferenceRow";
import PlayerModal from "@/components/PlayerModal";
import MiniPlayer from "@/components/MiniPlayer";
import InfoModal from "@/components/InfoModal";
import OfflineModal from "@/components/OfflineModal";
import MyListModal from "@/components/MyListModal";
import WatchHistoryModal from "@/components/WatchHistoryModal";
import AccountSettingsModal, { type SettingsTab } from "@/components/AccountSettingsModal";
import ProfileSelector from "@/components/ProfileSelector";
import CatalogPage from "@/components/CatalogPage";
import RandomPage from "@/components/RandomPage";
import LegalModal from "@/components/LegalModal";
import IslamicHubModal, { type HubTab } from "@/components/IslamicHubModal";
import AIAssistantModal from "@/components/AIAssistantModal";
import PersonalSpaceModal from "@/components/PersonalSpaceModal";
import CreatorStudioModal from "@/components/CreatorStudioModal";
import VideoSuggestionModal from "@/components/VideoSuggestionModal";
import GoogleMapsExplorerModal from "@/components/GoogleMapsExplorerModal";
import VideoTitleTooltip from "@/components/VideoTitleTooltip";
import IntroSplash from "@/components/IntroSplash";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import DailyReminder from "@/components/DailyReminder";
import PrayerTimes from "@/components/PrayerTimes";
import { RECITERS_DATA } from "@/lib/reciterData";
import {
  catalog as defaultCatalog,
  getFeaturedContent,
  getContentByCategory,
  getContentByChannel,
  categories,
  type Category,
} from "@/data/catalog";
import {
  Loader2,
  Sparkles,
  DownloadCloud,
  Layers,
  Compass,
  BookOpen,
  CalendarDays,
  Clock3,
  Bookmark,
  Play,
  Wand2,
  MapPin,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Le scroll de toute l'app se fait DANS la carte encadrée
// (data-scroll-container), pas sur la fenêtre. Ce helper permet
// à n'importe quel bouton "revenir en haut" de cibler le bon
// élément, où qu'il soit dans l'arbre de composants.
// ─────────────────────────────────────────────────────────────
function scrollAppToTop() {
  const container = document.querySelector<HTMLElement>("[data-scroll-container]");
  if (container) {
    container.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function AuthScreen() {
  const { signInDemo, signInWithGoogle, signInWithApple, loading } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-emerald-400/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-lg w-full text-center space-y-8 liquid-glass-card p-8 sm:p-10 rounded-3xl border border-emerald-300/30 backdrop-blur-2xl shadow-2xl shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)]">
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-8 bg-emerald-400 rounded-sm shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
          <div className="w-2 h-5 bg-zinc-400 rounded-sm" />
          <div className="w-2 h-9 bg-white rounded-sm" />
          <span className="text-white font-black text-3xl tracking-tight ml-2">
            SiratStream<span className="text-emerald-400 text-lg font-semibold">.app</span>
          </span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Plateforme Streaming &amp; Connaissance
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Récits des Prophètes, miracles, compagnons, mode hors-ligne et espace personnel synchronisé.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          {/* Les 3 options d'accès côte à côte : Début / Mode Invité, Connexion Google et Synchro Apple */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* 1. Début / Mode Invité (Accès immédiat sans mot de passe) */}
            <button
              onClick={signInDemo}
              disabled={loading}
              className="flex items-center sm:flex-col justify-center gap-2 sm:gap-1.5 py-3.5 px-3 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_12px_rgba(16,185,129,0.35)] active:scale-95 disabled:opacity-50 text-xs sm:text-xs text-center"
              title="Démarrer directement en mode invité"
            >
              <div className="flex items-center gap-1.5">
                <Sparkles size={16} className="text-zinc-950 flex-shrink-0" />
                <span className="font-extrabold text-sm sm:text-xs">Début</span>
              </div>
              <span className="text-[10px] text-zinc-900 font-semibold opacity-90">Mode Invité</span>
            </button>

            {/* 2. Connexion Google */}
            <button
              onClick={signInWithGoogle}
              disabled={loading}
              className="flex items-center sm:flex-col justify-center gap-2 sm:gap-1.5 py-3.5 px-3 rounded-2xl bg-white hover:bg-zinc-100 text-black font-bold transition-all shadow-xl active:scale-95 disabled:opacity-50 text-xs sm:text-xs text-center"
              title="Connexion avec votre compte Google"
            >
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="font-extrabold text-sm sm:text-xs">Google</span>
              </div>
              <span className="text-[10px] text-zinc-600 font-semibold">Connexion</span>
            </button>

            {/* 3. Synchronisation Apple */}
            <button
              onClick={() => signInWithApple()}
              disabled={loading}
              className="flex items-center sm:flex-col justify-center gap-2 sm:gap-1.5 py-3.5 px-3 rounded-2xl bg-emerald-400/15 hover:bg-emerald-400/25 border border-emerald-300/35 text-emerald-100 font-bold transition-all backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)] active:scale-95 disabled:opacity-50 text-xs sm:text-xs text-center"
              title="Synchronisation avec votre identifiant Apple / iCloud"
            >
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 flex-shrink-0 fill-current text-white" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.68-7.83-11.97-14.35-6.19-9.35-11.04-19.98-14.56-31.9-3.52-11.92-5.28-23.32-5.28-34.2 0-14.35 3.65-26.2 10.96-35.54 7.3-9.35 16.5-14.12 27.59-14.33 4.9 0 10.37 1.25 16.42 3.75 6.04 2.5 10.14 3.79 12.3 3.87 1.63 0 5.92-1.4 12.87-4.22 6.96-2.82 12.92-4.04 17.89-3.66 13.39.87 23.95 5.56 31.67 14.07-11.75 7.18-17.51 16.97-17.29 29.38.22 9.79 4.02 18.06 11.4 24.81 7.39 6.74 16.14 10.45 26.27 11.1-2.28 7.07-5.1 13.92-8.45 20.54zm-28.76-105.7c0 7.39-2.72 14.46-8.15 21.22-5.44 6.75-12.18 10.77-20.24 12.04-.22-1.09-.33-2.18-.33-3.26 0-7.18 2.94-14.36 8.81-21.54 5.87-7.18 12.78-11.2 20.73-12.06.11 1.2.18 2.4.18 3.6z" />
                </svg>
                <span className="font-extrabold text-sm sm:text-xs">Apple</span>
              </div>
              <span className="text-[10px] text-emerald-300/80 font-semibold">Synchro iCloud</span>
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-emerald-300/15 text-xs text-zinc-400">
          Sauvegarde automatique de vos favoris et historique · 100% gratuit
        </div>
      </div>
    </div>
  );
}

const CATALOGUE_TABS: { id: string; label: string; icon?: string }[] = [
  { id: "all", label: "🌟 Tous les Catalogues" },
  { id: "Coran", label: "📖 Coran (1980-2000)" },
  { id: "Prophètes", label: "📜 Prophètes & Sîra" },
  { id: "Compagnons", label: "🛡️ Compagnons" },
  { id: "Miracles du Coran", label: "🔬 Miracles & Science" },
  { id: "Histoire & Mystère", label: "🏛️ Histoire & Mystère" },
  { id: "Héros & Personnages", label: "⚔️ Héros & Figures" },
  { id: "Eschatologie", label: "⚡ Fin des Temps" },
  { id: "Anges & Djinns", label: "🌌 Monde Invisible" },
  { id: "creators", label: "🎥 Par Créateur / Chaîne" },
];

function MainStreamingApp() {
  const { activeProfile, switchProfile } = useViewerProfile();
  const { isCreator } = useAuth();
  const { catalog, customItems } = useCreatorCatalog();

  const [currentCategoryTab, setCurrentCategoryTab] = useState<string>("all");

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playerStartTime, setPlayerStartTime] = useState<number | undefined>(undefined);
  const [playerAudioMode, setPlayerAudioMode] = useState<boolean>(false);
  const [minimizedItem, setMinimizedItem] = useState<{ id: string; time: number; mode: "video" | "audio" } | null>(null);
  const [infoId, setInfoId] = useState<string | null>(null);
  const [showPersonalSpace, setShowPersonalSpace] = useState(false);
  const [showCreatorStudio, setShowCreatorStudio] = useState(false);
  const [showMyList, setShowMyList] = useState(false);
  const [showWatchHistory, setShowWatchHistory] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [accountSettingsTab, setAccountSettingsTab] = useState<SettingsTab>("account");
  const [showCatalog, setShowCatalog] = useState(false);
  const [showRandomPage, setShowRandomPage] = useState(false);
  const [catalogInitialCategories, setCatalogInitialCategories] = useState<Category[] | undefined>(undefined);
  const [showOffline, setShowOffline] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showGoogleMaps, setShowGoogleMaps] = useState(false);
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | null>(null);

  const [islamicHubTab, setIslamicHubTab] = useState<HubTab | null>(null);

  useEffect(() => {
    enrichCatalogWithYouTubeAPI(catalog).catch(() => {});
  }, [catalog]);

  const handlePlay = useCallback((id: string, startSec?: number, audioMode = false) => {
    setInfoId(null);
    setMinimizedItem(null);
    setPlayerStartTime(startSec);
    setPlayerAudioMode(audioMode);
    setPlayingId(id);
  }, []);

  const handleInfo = useCallback((id: string) => {
    setInfoId(id);
  }, []);

  const handleClosePlayer = useCallback(() => {
    setPlayingId(null);
    setPlayerStartTime(undefined);
    setPlayerAudioMode(false);
  }, []);

  const handleMinimizePlayer = useCallback((currentTime?: number, mode: "video" | "audio" = "video") => {
    if (playingId) {
      setMinimizedItem({ id: playingId, time: currentTime || 0, mode });
    }
    setPlayingId(null);
    setPlayerStartTime(undefined);
    setPlayerAudioMode(false);
  }, [playingId]);

  const handleExpandMiniPlayer = useCallback((currentTime?: number, mode: "video" | "audio" = "video") => {
    if (minimizedItem) {
      setPlayerStartTime(currentTime !== undefined ? currentTime : minimizedItem.time);
      setPlayerAudioMode(mode === "audio");
      setPlayingId(minimizedItem.id);
      setMinimizedItem(null);
    }
  }, [minimizedItem]);

  const handleCloseMiniPlayer = useCallback(() => {
    setMinimizedItem(null);
  }, []);

  const handleCloseInfo = useCallback(() => {
    setInfoId(null);
  }, []);

  const openHubWithTab = useCallback((tab: HubTab = "prayer") => {
    setIslamicHubTab(tab);
  }, []);

  const isKid = activeProfile?.is_kid;
  const filteredCatalog = useMemo(() => {
    if (!isKid) return catalog;
    return catalog.filter((c) => !c.categories.includes("Eschatologie"));
  }, [isKid, catalog]);

  const playingItem = useMemo(() => (playingId ? catalog.find((c) => c.id === playingId) : null), [playingId, catalog]);
  const miniItem = useMemo(() => (minimizedItem ? catalog.find((c) => c.id === minimizedItem.id) : null), [minimizedItem, catalog]);
  const infoItem = useMemo(() => (infoId ? catalog.find((c) => c.id === infoId) : null), [infoId, catalog]);

  return (
    <div className="fixed inset-0 bg-black text-white selection:bg-white selection:text-black">
      {/* Fond d'ambiance derrière le cadre — masqué maintenant que la carte occupe tout l'écran */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% -10%, #232323 0%, #050505 55%), radial-gradient(70% 60% at 85% 100%, rgba(255,255,255,0.05) 0%, transparent 70%)",
        }}
      />

      {/* ── CADRE PRINCIPAL — toute l'app en plein écran, sans marge ── */}
      <div
        data-scroll-container
        className="absolute inset-0 bg-zinc-950 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* Creator Global Announcement Banner */}
        <AnnouncementBanner
          onPlayContent={(item) => handlePlay(item.id)}
          onOpenCreatorStudio={() => setShowCreatorStudio(true)}
        />

        {/* Navbar with unified hub launcher & catalog selector */}
        <Navbar
          currentCategoryTab={currentCategoryTab}
          onSelectCategoryTab={setCurrentCategoryTab}
          onSelectContent={handleInfo}
          onOpenCreatorStudio={() => setShowCreatorStudio(true)}
          onOpenPersonalSpace={() => setShowPersonalSpace(true)}
          onOpenMyList={() => setShowMyList(true)}
          onOpenWatchHistory={() => setShowWatchHistory(true)}
          onOpenAccountSettings={(tab) => {
            setAccountSettingsTab(tab || "account");
            setShowAccountSettings(true);
          }}
          onSwitchProfile={switchProfile}
          onOpenCatalog={() => {
            setCatalogInitialCategories(undefined);
            setShowCatalog(true);
          }}
          onOpenRandom={() => setShowRandomPage(true)}
          onOpenIslamicHub={() => openHubWithTab("prayer")}
          onOpenOffline={() => setShowOffline(true)}
          onOpenAIAssistant={() => setShowAIAssistant(true)}
          onOpenSuggestions={() => setShowSuggestions(true)}
          onOpenGoogleMaps={() => setShowGoogleMaps(true)}
        />

        {/* Hero Banner */}
        <Hero
          onPlay={handlePlay}
          onInfo={handleInfo}
          onOpenAI={() => setShowAIAssistant(true)}
          categoryTab={currentCategoryTab}
        />

        {/* Main content body */}
        <main className="relative z-10 -mt-6 sm:-mt-10 space-y-6 pb-20">
          {/* Catalogues Selection Bar (Categorized Navigation) */}
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12">
            <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/80 p-2 rounded-2xl flex items-center justify-between gap-2.5 sm:gap-3 shadow-xl">
              <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto scrollbar-none min-w-0 flex-1 py-0.5 pr-1">
                {CATALOGUE_TABS.map((tab) => {
                  const isActive = currentCategoryTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setCurrentCategoryTab(tab.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex-shrink-0 whitespace-nowrap ${
                        isActive
                          ? "bg-white text-black font-semibold shadow-lg"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-800/80"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowGoogleMaps(true)}
                  className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex-shrink-0 whitespace-nowrap shadow-sm"
                  title="Explorer les Lieux Saints et Historiques sur Google Maps"
                >
                  <MapPin size={14} className="text-emerald-400" />
                  <span className="hidden xs:inline">Carte des Lieux</span>
                  <span className="xs:hidden">Carte</span>
                </button>

                <button
                  onClick={() => openHubWithTab("prayer")}
                  className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 bg-zinc-800/60 hover:bg-zinc-700/80 text-zinc-200 border border-zinc-700/60 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex-shrink-0 whitespace-nowrap"
                >
                  <Sparkles size={14} />
                  <span className="hidden xs:inline">Espace Spiritualité</span>
                  <span className="xs:hidden">Spiritualité</span>
                </button>
              </div>
            </div>
          </div>

          {/* VIEW 1: GLOBAL OVERVIEW (ALL) */}
          {currentCategoryTab === "all" && (
            <div className="space-y-4">
              {/* Quick spiritual bar */}
              <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <DailyReminder compact onOpenModal={() => openHubWithTab("reminder")} />
                  <PrayerTimes compact onClose={() => {}} />
                </div>
              </div>

              {/* Continue watching */}
              <ContinueWatchingRow onPlay={handlePlay} />

              {/* Custom Creator Content Row if available */}
              {customItems.length > 0 && (
                <ContentRow
                  label="✨ Ajouts Exclusifs & Nouvelles Publications du Créateur"
                  items={customItems}
                  onPlay={handlePlay}
                  onInfo={handleInfo}
                  limit={12}
                />
              )}

              {/* Smart personalized recommendations */}
              <RecommendedRow onPlay={handlePlay} onInfo={handleInfo} />

              {/* Preference Row based on active profile setup */}
              <PreferenceRow onPlay={handlePlay} onInfo={handleInfo} />

              {/* Featured Selection: Coran & Tarawih (1980-2000) */}
              <ContentRow
                label="📖 Tarawih Historiques de La Mecque & Médine (1980 - 2000)"
                items={getContentByCategory("Coran")}
                onPlay={handlePlay}
                onInfo={handleInfo}
                limit={8}
              />

              {/* Featured Selection: Prophètes */}
              <ContentRow
                label="Récits des Prophètes (Sélection majeure)"
                items={getContentByCategory("Prophètes")}
                onPlay={handlePlay}
                onInfo={handleInfo}
                limit={8}
              />

              {/* Featured Selection: Eschatologie */}
              {!isKid && (
                <ContentRow
                  label="Eschatologie & Fin des Temps"
                  items={getContentByCategory("Eschatologie")}
                  onPlay={handlePlay}
                  onInfo={handleInfo}
                  limit={8}
                />
              )}

              {/* Featured Selection: Miracles */}
              <ContentRow
                label="Miracles du Coran & Sciences"
                items={getContentByCategory("Miracles du Coran")}
                onPlay={handlePlay}
                onInfo={handleInfo}
                limit={8}
              />
            </div>
          )}

          {/* VIEW 2: CATEGORY CATALOGUE */}
          {currentCategoryTab !== "all" && currentCategoryTab !== "creators" && (
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12 space-y-8">
              <div className="border-b border-zinc-800/80 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <span>Catalogue : {currentCategoryTab}</span>
                    {currentCategoryTab === "Coran" && (
                      <span className="text-xs bg-zinc-800 text-zinc-300 font-semibold px-2.5 py-0.5 rounded-full border border-zinc-700">
                        Archives Haramain 1980-2000
                      </span>
                    )}
                  </h2>
                  <p className="text-zinc-400 text-sm mt-1">
                    {currentCategoryTab === "Coran"
                      ? "Les enregistrements historiques et légendaires des Tarawih de La Mecque et Médine entre 1980 et 2000."
                      : "Tous les épisodes et récits classés sous cette thématique"}
                  </p>
                </div>
                <button
                  onClick={() => setCurrentCategoryTab("all")}
                  className="text-xs text-zinc-400 hover:text-white bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800"
                >
                  ← Revenir à l'accueil
                </button>
              </div>

              {currentCategoryTab === "Coran" ? (
                <div className="space-y-8">
                  {/* Visual Reciter Showcase Gallery */}
                  <div className="bg-zinc-900/60 p-5 sm:p-6 rounded-2xl border border-zinc-800/80 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-white font-bold text-lg flex items-center gap-2">
                          <span>🎙️ Les Grands Récitateurs & Imams des Haramain</span>
                        </h3>
                        <p className="text-zinc-400 text-xs mt-0.5">
                          Portraits des voix historiques de La Mecque et Médine (1980 - 2000)
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                      {Object.values(RECITERS_DATA).map((reciter) => (
                        <div
                          key={reciter.id}
                          className="group flex flex-col items-center text-center p-3 rounded-xl bg-zinc-950/70 hover:bg-zinc-800/90 border border-zinc-800/80 hover:border-zinc-600/60 transition-all duration-300 shadow"
                        >
                          <div className="relative mb-2">
                            <img
                              src={reciter.photoUrl}
                              alt={reciter.name}
                              className="w-16 h-16 sm:w-18 sm:h-18 rounded-full object-cover border-2 border-white/30 group-hover:border-white/60 group-hover:scale-105 transition-all shadow-md"
                            />
                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-white text-black text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase">
                              Imam
                            </span>
                          </div>
                          <h4 className="text-white font-bold text-xs line-clamp-1 group-hover:text-zinc-300 transition-colors">
                            {reciter.name.replace("Sheikh ", "")}
                          </h4>
                          <p className="text-zinc-400 text-[10px] font-semibold mt-0.5">
                            {reciter.years}
                          </p>
                          <p className="text-zinc-500 text-[9px] line-clamp-1 mt-0.5">
                            {reciter.mosque.includes("Mecque") ? "Makkah" : "Madinah"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <ContentRow
                    label="✨ Les Récitations Légendaires du Sheikh Ali Jaber (رحمه الله)"
                    items={getContentByCategory("Coran").filter((item) =>
                      item.title.toLowerCase().includes("ali jaber")
                    )}
                    onPlay={handlePlay}
                    onInfo={handleInfo}
                  />
                  <ContentRow
                    label="🕋 Tarawih de La Mecque — Sheikh Sudais & Sheikh Shuraim (Années 90)"
                    items={getContentByCategory("Coran").filter(
                      (item) =>
                        item.title.toLowerCase().includes("sudais") ||
                        item.title.toLowerCase().includes("shuraim")
                    )}
                    onPlay={handlePlay}
                    onInfo={handleInfo}
                  />
                  <ContentRow
                    label="🕌 Tarawih de Médine — Sheikh Muhammad Ayyub (رحمه الله)"
                    items={getContentByCategory("Coran").filter((item) =>
                      item.title.toLowerCase().includes("ayyub")
                    )}
                    onPlay={handlePlay}
                    onInfo={handleInfo}
                  />
                  <ContentRow
                    label="📜 Clôtures du Coran (Khatm) & Grands Imams (Al-Khulaifi, Al-Hudhaify)"
                    items={getContentByCategory("Coran").filter(
                      (item) =>
                        item.title.toLowerCase().includes("khulaifi") ||
                        item.title.toLowerCase().includes("hudhaify") ||
                        item.title.toLowerCase().includes("khatm") ||
                        item.title.toLowerCase().includes("juhany")
                    )}
                    onPlay={handlePlay}
                    onInfo={handleInfo}
                  />
                  <ContentRow
                    label="Tous les Enregistrements du Catalogue Coran (1980 - 2000)"
                    items={getContentByCategory("Coran")}
                    onPlay={handlePlay}
                    onInfo={handleInfo}
                  />
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Nouveautés & Sélections de la catégorie */}
                  {getContentByCategory(currentCategoryTab as Category).some((item) => item.isNew) && (
                    <ContentRow
                      label={`🔥 Nouveautés & Épisodes Récents — ${currentCategoryTab}`}
                      items={getContentByCategory(currentCategoryTab as Category).filter((item) => item.isNew)}
                      onPlay={handlePlay}
                      onInfo={handleInfo}
                    />
                  )}

                  {/* Ligne principale */}
                  <ContentRow
                    label={`Sélection Recommandée — ${currentCategoryTab}`}
                    items={getContentByCategory(currentCategoryTab as Category)}
                    onPlay={handlePlay}
                    onInfo={handleInfo}
                  />

                  {/* Grille complète de tous les épisodes de la catégorie */}
                  <div className="bg-zinc-900/40 p-4 sm:p-6 rounded-2xl border border-zinc-800/80">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-white font-bold text-base sm:text-lg">
                          Tous les Épisodes de la Catégorie ({getContentByCategory(currentCategoryTab as Category).length})
                        </h3>
                        <p className="text-zinc-400 text-xs mt-0.5">
                          Parcourez l'ensemble des récits et vidéos disponibles pour cette thématique
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                      {getContentByCategory(currentCategoryTab as Category).map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleInfo(item.id)}
                          className="video-thumb-interactive group bg-zinc-950/80 hover:bg-zinc-800/90 border border-zinc-800/80 rounded-xl cursor-pointer flex flex-col shadow relative"
                        >
                          <div className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-zinc-900">
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                const img = e.target as HTMLImageElement;
                                if (!img.src.includes("hqdefault")) {
                                  img.src = `https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg`;
                                }
                              }}
                            />
                            {item.isNew && (
                              <span className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded shadow uppercase tracking-wider">
                                NEW
                              </span>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePlay(item.id);
                                }}
                                className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                                title="Lire maintenant"
                              >
                                <Play size={18} className="fill-black ml-0.5" />
                              </button>
                            </div>
                          </div>

                          <div className="p-3 flex-1 flex flex-col justify-between">
                            <div>
                              <VideoTitleTooltip
                                item={item}
                                as="p"
                                titleClassName="text-white text-xs font-semibold leading-tight group-hover:text-zinc-200"
                                lineClamp={2}
                              />
                              <p className="text-zinc-400 text-[11px] mt-1 line-clamp-1">
                                {item.channel}
                              </p>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-2 pt-2 border-t border-zinc-900">
                              <span>{item.categories[0]}</span>
                              <span>{item.year}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW 3: CREATORS CATALOGUE */}
          {currentCategoryTab === "creators" && (
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12 space-y-8">
              <div className="border-b border-zinc-800/80 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Catalogue par Créateurs & Lieux Saints
                  </h2>
                  <p className="text-zinc-400 text-sm mt-1">
                    Explorez les créations immersives et les archives des Haramain
                  </p>
                </div>
                <button
                  onClick={() => setCurrentCategoryTab("all")}
                  className="text-xs text-zinc-400 hover:text-white bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800"
                >
                  ← Revenir à l'accueil
                </button>
              </div>

              <ContentRow
                label="🌟 NARRO DIN (Voyages & Histoires Prophétiques)"
                items={getContentByChannel("NARRO DIN")}
                onPlay={handlePlay}
                onInfo={handleInfo}
              />
              <ContentRow
                label="🕌 Archives & Récitations des Haramain (1980 - 2000)"
                items={getContentByChannel("Récitations Haramain")}
                onPlay={handlePlay}
                onInfo={handleInfo}
              />
              <ContentRow
                label="Les Récits de NARRO"
                items={getContentByChannel("NARRO")}
                onPlay={handlePlay}
                onInfo={handleInfo}
              />
              <ContentRow
                label="Les Émissions de Yacine"
                items={getContentByChannel("Yacine")}
                onPlay={handlePlay}
                onInfo={handleInfo}
              />
              <ContentRow
                label="Towards Eternity (Méditations & Rappels)"
                items={getContentByChannel("Towards Eternity")}
                onPlay={handlePlay}
                onInfo={handleInfo}
              />
              <ContentRow
                label="Croyant Rationnel (Miracles & Science)"
                items={getContentByChannel("Croyant Rationnel")}
                onPlay={handlePlay}
                onInfo={handleInfo}
              />
              <ContentRow
                label="Minute Islam (Rappels Courts & Sagesses)"
                items={getContentByChannel("Minute Islam")}
                onPlay={handlePlay}
                onInfo={handleInfo}
              />
            </div>
          )}
        </main>

        {/* Clean Structured Footer */}
        <footer className="mt-auto border-t border-zinc-900 bg-zinc-950 px-6 pt-12 pb-28 sm:pb-16 text-zinc-500 text-sm">
          <div className="max-w-screen-2xl mx-auto space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-xs sm:text-sm">
              <div className="space-y-2.5">
                <p className="text-white font-semibold text-xs uppercase tracking-wider">
                  Catalogues
                </p>
                <ul className="space-y-2">
                  <li>
                    <button
                      onClick={() => {
                        setCurrentCategoryTab("Prophètes");
                        scrollAppToTop();
                      }}
                      className="hover:text-white transition-colors"
                    >
                      Récits des Prophètes
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        setCurrentCategoryTab("Compagnons");
                        scrollAppToTop();
                      }}
                      className="hover:text-white transition-colors"
                    >
                      Vie des Compagnons
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        setCurrentCategoryTab("Miracles du Coran");
                        scrollAppToTop();
                      }}
                      className="hover:text-white transition-colors"
                    >
                      Miracles du Coran
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setShowCatalog(true)}
                      className="hover:text-white transition-colors"
                    >
                      Tout le catalogue (Filtres)
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setShowRandomPage(true)}
                      className="hover:text-emerald-400 transition-colors flex items-center gap-1"
                    >
                      <span>🎲 Générateur Aléatoire</span>
                    </button>
                  </li>
                </ul>
              </div>

              <div className="space-y-2.5">
                <p className="text-white font-semibold text-xs uppercase tracking-wider">
                  Espace Pratique
                </p>
                <ul className="space-y-2">
                  <li>
                    <button
                      onClick={() => openHubWithTab("prayer")}
                      className="hover:text-white transition-colors"
                    >
                      Horaires de prière
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => openHubWithTab("qibla")}
                      className="hover:text-white transition-colors"
                    >
                      Direction de la Qibla
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => openHubWithTab("tasbih")}
                      className="hover:text-white transition-colors"
                    >
                      Compteur de Tasbih
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => openHubWithTab("duas")}
                      className="hover:text-white transition-colors"
                    >
                      Invocations (Douas)
                    </button>
                  </li>
                </ul>
              </div>

              <div className="space-y-2.5">
                <p className="text-white font-semibold text-xs uppercase tracking-wider">
                  Ma Bibliothèque
                </p>
                <ul className="space-y-2">
                  <li>
                    <button
                      onClick={() => setShowMyList(true)}
                      className="hover:text-white transition-colors flex items-center gap-1.5"
                    >
                      <Bookmark size={13} /> Ma Liste
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setShowWatchHistory(true)}
                      className="hover:text-white transition-colors flex items-center gap-1.5"
                    >
                      <Clock3 size={13} /> Historique
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setShowOffline(true)}
                      className="hover:text-white transition-colors flex items-center gap-1.5"
                    >
                      <DownloadCloud size={13} /> Mode Hors-Ligne
                    </button>
                  </li>
                </ul>
              </div>

              <div className="space-y-2.5">
                <p className="text-white font-semibold text-xs uppercase tracking-wider">
                  Compte & Légal
                </p>
                <ul className="space-y-2">
                  <li>
                    <button
                      onClick={() => setShowAccountSettings(true)}
                      className="hover:text-white transition-colors"
                    >
                      Paramètres du compte
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setLegalModal("privacy")}
                      className="hover:text-white transition-colors"
                    >
                      Confidentialité
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setLegalModal("terms")}
                      className="hover:text-white transition-colors"
                    >
                      Conditions d'utilisation
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            {/* Brand & SEO Identity for Google indexing (sirat-stream, siratstreamapp, siratstreamapp.com) */}
            <div className="pt-6 border-t border-zinc-900/80 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-400">
              <div className="space-y-1.5 md:col-span-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white tracking-tight">SiratStream</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-semibold">
                    sirat-stream · siratstreamapp
                  </span>
                </div>
                <p className="text-zinc-400 text-xs leading-relaxed max-w-2xl">
                  <strong>SiratStream</strong> (<a href="https://siratstreamapp.com/" className="text-emerald-400 hover:underline">siratstreamapp.com</a>) est la plateforme de référence (connue sous <em>sirat-stream</em> et <em>siratstreamapp</em>) pour le visionnage et l'écoute de récits islamiques, du Coran, des Tarawih historiques (1980-2000) et des horaires de prière.
                </p>
              </div>
              <div className="flex md:justify-end items-start gap-3">
                <a
                  href="https://siratstreamapp.com/"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors"
                >
                  <span>siratstreamapp.com</span>
                </a>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-zinc-900 text-xs">
              <p className="flex items-center gap-1.5">
                <span>© {new Date().getFullYear()} SiratStream (siratstreamapp.com) · sirat-stream · Fait pour la communauté</span>
              </p>
              <p className="text-zinc-600">
                Contenus vidéos issus de créateurs YouTube indépendants
              </p>
            </div>
          </div>
        </footer>
      </div>

      {/* Modals & Fullscreens — en dehors du cadre pour rester en plein écran réel */}
      {/* Modals with AnimatePresence */}
      <AnimatePresence>
        {playingItem && (
          <PlayerModal
            key="player-modal"
            item={playingItem}
            initialStartTime={playerStartTime}
            initialAudioMode={playerAudioMode}
            onClose={handleClosePlayer}
            onMinimize={handleMinimizePlayer}
            onChangeItem={handlePlay}
          />
        )}
      </AnimatePresence>

      {!playingItem && miniItem && (
        <MiniPlayer
          item={miniItem}
          initialTime={minimizedItem?.time}
          mode={minimizedItem?.mode || "video"}
          onExpand={handleExpandMiniPlayer}
          onClose={handleCloseMiniPlayer}
        />
      )}

      <AnimatePresence>
        {infoItem && (
          <InfoModal
            key="info-modal"
            item={infoItem}
            onClose={handleCloseInfo}
            onPlay={handlePlay}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showOffline && (
          <OfflineModal
            key="offline-modal"
            onClose={() => setShowOffline(false)}
            onPlay={handlePlay}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPersonalSpace && (
          <PersonalSpaceModal
            key="personal-space-modal"
            onClose={() => setShowPersonalSpace(false)}
            onPlayVideo={handlePlay}
            onOpenIslamicHub={() => openHubWithTab("prayer")}
            onOpenCreatorStudio={() => setShowCreatorStudio(true)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuggestions && (
          <VideoSuggestionModal
            key="suggestions-modal"
            onClose={() => setShowSuggestions(false)}
            onPlayVideo={handlePlay}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMyList && (
          <MyListModal
            key="mylist-modal"
            onClose={() => setShowMyList(false)}
            onPlay={handlePlay}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWatchHistory && (
          <WatchHistoryModal
            key="history-modal"
            onClose={() => setShowWatchHistory(false)}
            onPlay={handlePlay}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAccountSettings && (
          <AccountSettingsModal
            key="settings-modal"
            initialTab={accountSettingsTab}
            onClose={() => setShowAccountSettings(false)}
            onPlayVideo={handlePlay}
            onOpenLegal={(type) => {
              setShowAccountSettings(false);
              setLegalModal(type);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCatalog && (
          <CatalogPage
            key="catalog-page"
            initialCategories={catalogInitialCategories}
            onClose={() => {
              setShowCatalog(false);
              setCatalogInitialCategories(undefined);
            }}
            onPlay={handlePlay}
            onInfo={handleInfo}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRandomPage && (
          <RandomPage
            key="random-page"
            onClose={() => setShowRandomPage(false)}
            onPlay={(id) => {
              setShowRandomPage(false);
              handlePlay(id);
            }}
            onBrowseCatalog={(cats) => {
              setCatalogInitialCategories(cats);
              setShowRandomPage(false);
              setShowCatalog(true);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {islamicHubTab && (
          <IslamicHubModal
            key="hub-modal"
            initialTab={islamicHubTab}
            onClose={() => setIslamicHubTab(null)}
            onPlayVideo={(video) => handlePlay(video.id)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGoogleMaps && (
          <GoogleMapsExplorerModal
            key="google-maps-explorer-modal"
            isOpen={showGoogleMaps}
            onClose={() => setShowGoogleMaps(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {legalModal && (
          <LegalModal
            key="legal-modal"
            type={legalModal}
            onClose={() => setLegalModal(null)}
          />
        )}
      </AnimatePresence>

      {/* Floating Creator Studio Button (Discreet, hidden on mobile to avoid layout crowding; accessible in ProfileMenu) */}
      {isCreator && (
        <button
          onClick={() => setShowCreatorStudio(true)}
          className="fixed bottom-6 left-6 z-30 hidden md:flex items-center gap-2 px-3.5 py-2 bg-zinc-900/90 hover:bg-zinc-800 text-amber-300 hover:text-white rounded-full shadow-2xl border border-amber-500/40 hover:scale-105 active:scale-95 transition-all group backdrop-blur-md"
          title="Ouvrir le Studio Créateur (IA Studio)"
        >
          <Wand2 size={15} className="text-amber-400 group-hover:rotate-12 transition-transform" />
          <span className="text-xs font-bold tracking-tight">Studio Créateur</span>
          <span className="px-1.5 py-0.5 bg-amber-400/20 text-amber-200 rounded text-[9px] font-black uppercase tracking-wider border border-amber-500/30">
            ADMIN
          </span>
        </button>
      )}

      {/* Floating Noor IA Assistant Button (Hidden when MiniPlayer is active to prevent overlapping) */}
      {!miniItem && (
        <button
          onClick={() => setShowAIAssistant(true)}
          className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-30 flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-full shadow-2xl shadow-emerald-950/80 border border-emerald-400/40 hover:scale-105 active:scale-95 transition-all group backdrop-blur-md"
          title="Discuter avec Noor IA (Assistant Universel)"
        >
          <div className="relative">
            <Sparkles size={16} className="text-emerald-200 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-300 rounded-full animate-ping" />
          </div>
          <span className="text-xs sm:text-sm font-bold tracking-tight">Noor IA</span>
        </button>
      )}

      {/* Creator Studio & AI Assistant Modal */}
      <AnimatePresence>
        {showCreatorStudio && (
          <CreatorStudioModal
            key="creator-studio-dialog"
            onClose={() => setShowCreatorStudio(false)}
            onPlayVideo={(item) => handlePlay(item.id)}
          />
        )}
      </AnimatePresence>

      {/* Universal AI Assistant Modal */}
      <AIAssistantModal
        isOpen={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
        onSelectContent={handlePlay}
        onOpenIslamicHubTab={(tab) => {
          setShowAIAssistant(false);
          openHubWithTab(tab as any);
        }}
        onOpenMyList={() => {
          setShowAIAssistant(false);
          setShowMyList(true);
        }}
        onOpenOffline={() => {
          setShowAIAssistant(false);
          setShowOffline(true);
        }}
        onOpenCatalog={() => {
          setShowAIAssistant(false);
          setShowCatalog(true);
        }}
      />
    </div>
  );
}

function RootApp() {
  const { user, loading: authLoading } = useAuth();
  const { activeProfile, loading: profileLoading } = useViewerProfile();

  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem("intro_played") !== "true";
    } catch {
      return false;
    }
  });

  const handleIntroComplete = useCallback(() => {
    try {
      sessionStorage.setItem("intro_played", "true");
    } catch {
      // Ignore if storage is blocked
    }
    setShowIntro(false);
  }, []);

  return (
    <>
      {showIntro && <IntroSplash onComplete={handleIntroComplete} />}

      {authLoading && !showIntro ? (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <Loader2 size={40} className="text-white animate-spin" />
        </div>
      ) : !user ? (
        <AuthScreen />
      ) : profileLoading && !activeProfile ? (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <Loader2 size={40} className="text-white animate-spin" />
        </div>
      ) : !activeProfile ? (
        <ProfileSelector onSelect={() => {}} />
      ) : (
        <CreatorCatalogProvider>
          <MyListProvider>
            <MainStreamingApp />
          </MyListProvider>
        </CreatorCatalogProvider>
      )}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ViewerProfileProvider>
          <RootApp />
        </ViewerProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}