// Source: Google Maps Platform Code Assist
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
} from "@vis.gl/react-google-maps";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  MapPin,
  Compass,
  Layers,
  Bookmark,
  Plus,
  Trash2,
  ExternalLink,
  Search,
  Key,
  Sparkles,
  Info,
  Navigation,
  Check,
  Building,
  Landmark,
  Eye,
  RotateCw,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export interface HistoricalSite {
  id: string;
  name: string;
  arabicName?: string;
  city: string;
  country: string;
  category: "holy_site" | "historic_mosque" | "historical_monument" | "prophetic_site";
  lat: number;
  lng: number;
  description: string;
  historicalSignificance: string;
  relatedTopic: string;
}

export const HISTORICAL_SITES: HistoricalSite[] = [
  {
    id: "kaaba-makkah",
    name: "Masjid al-Haram & La Kaaba",
    arabicName: "المسجد الحرام والكعبة المشرفة",
    city: "La Mecque",
    country: "Arabie Saoudite",
    category: "holy_site",
    lat: 21.4225,
    lng: 39.8262,
    description: "Le lieu le plus sacré de l'Islam vers lequel tous les musulmans s'orientent (Qibla) pour la prière.",
    historicalSignificance: "Construite par le Prophète Ibrahim et son fils Isma'il ('alayhimas-salam).",
    relatedTopic: "Hajj & Prophète Ibrahim",
  },
  {
    id: "prophet-mosque-madinah",
    name: "Masjid an-Nabawi",
    arabicName: "المسجد النبوي الشريف",
    city: "Médine",
    country: "Arabie Saoudite",
    category: "holy_site",
    lat: 24.4672,
    lng: 39.6111,
    description: "La mosquée du Prophète Muhammad ﷺ abritant la noble Rawdah ash-Sharifah.",
    historicalSignificance: "Fondée par le Messager d'Allah ﷺ dès son arrivée après l'Hégire en 622.",
    relatedTopic: "Sîra & L'Hégire",
  },
  {
    id: "al-aqsa-jerusalem",
    name: "Masjid Al-Aqsa & Dôme du Rocher",
    arabicName: "المسجد الأقصى وقبة الصخرة",
    city: "Jérusalem (Al-Quds)",
    country: "Palestine",
    category: "holy_site",
    lat: 31.7761,
    lng: 35.2358,
    description: "Le troisième lieu saint de l'Islam et première Qibla des premiers musulmans.",
    historicalSignificance: "Destination du voyage nocturne (Al-Isrâ') et point d'ascension céleste (Al-Mi'râj).",
    relatedTopic: "Al-Isrâ' wal-Mi'râj",
  },
  {
    id: "hira-cave",
    name: "Grotte de Hira (Jabal an-Nour)",
    arabicName: "غار حراء (جبل النور)",
    city: "La Mecque",
    country: "Arabie Saoudite",
    category: "prophetic_site",
    lat: 21.4578,
    lng: 39.8592,
    description: "La grotte isolée au sommet du mont de la lumière où le Prophète se recueillait.",
    historicalSignificance: "Lieu de la toute première révélation du Coran (Sourate Al-'Alaq, 'Iqra!').",
    relatedTopic: "Première Révélation",
  },
  {
    id: "uhud-mountain",
    name: "Mont Uhud & Cimetière des Martyrs",
    arabicName: "جبل أحد ومقبرة الشهداء",
    city: "Médine",
    country: "Arabie Saoudite",
    category: "prophetic_site",
    lat: 24.5034,
    lng: 39.6125,
    description: "Le mont béni aimé du Prophète ﷺ et théâtre de la célèbre bataille d'Uhud.",
    historicalSignificance: "Sépulture de Sayyid ash-Shuhada Hamza ibn 'Abd al-Muttalib et 70 compagnons.",
    relatedTopic: "Bataille d'Uhud & Hamza",
  },
  {
    id: "umayyad-damascus",
    name: "Grande Mosquée des Omeyyades",
    arabicName: "جامع بني أمية الكبير",
    city: "Damas",
    country: "Syrie",
    category: "historic_mosque",
    lat: 33.5119,
    lng: 36.3067,
    description: "Un chef-d'œuvre architectural de la dynastie omeyyade érigé au VIIIe siècle.",
    historicalSignificance: "Contient le tombeau présumé du Prophète Yahya (Jean le Baptiste) et minaret de 'Issa.",
    relatedTopic: "Civilisation Omeyyade",
  },
  {
    id: "cordoba-mosque",
    name: "Mosquée-Cathédrale de Cordoue",
    arabicName: "جامع قرطبة الكبير",
    city: "Cordoue (Al-Andalus)",
    country: "Espagne",
    category: "historic_mosque",
    lat: 37.8789,
    lng: -4.7794,
    description: "Le joyau d'Al-Andalus aux 856 colonnes de jaspe, d'onyx et de marbre.",
    historicalSignificance: "Symbole rayonnant de l'âge d'or islamique et de la cohabitation culturelle en Andalousie.",
    relatedTopic: "L'Âge d'Or d'Al-Andalus",
  },
  {
    id: "blue-mosque-istanbul",
    name: "Mosquée Sultanahmet (Mosquée Bleue)",
    arabicName: "جامع السلطان أحمد",
    city: "Istanbul",
    country: "Turquie",
    category: "historic_mosque",
    lat: 41.0054,
    lng: 28.9768,
    description: "Célèbre pour ses céramiques bleues d'Iznik et ses six minarets majestueux.",
    historicalSignificance: "Édifiée sous le sultan ottoman Ahmet Ier au début du XVIIe siècle.",
    relatedTopic: "Empire Ottoman",
  },
  {
    id: "kairouan-mosque",
    name: "Grande Mosquée de Kairouan",
    arabicName: "جامع عقبة بن نافع بالقيروان",
    city: "Kairouan",
    country: "Tunisie",
    category: "historic_mosque",
    lat: 35.6814,
    lng: 10.1039,
    description: "Fondée par 'Oqba ibn Nafi' en 670, le plus ancien sanctuaire d'Occident musulman.",
    historicalSignificance: "Centre pionnier de diffusion de la théologie malikite et du savoir en Afrique du Nord.",
    relatedTopic: "Expansion au Maghreb",
  },
  {
    id: "al-azhar-cairo",
    name: "Mosquée et Université Al-Azhar",
    arabicName: "الجامع الأزهر الشريف",
    city: "Le Caire",
    country: "Égypte",
    category: "historic_mosque",
    lat: 30.0457,
    lng: 31.2625,
    description: "L'un des plus anciens et prestigieux centres d'enseignement supérieur islamique au monde.",
    historicalSignificance: "Fondée sous le califat fatimide en 970 avant de devenir le phare sunnite mondial.",
    relatedTopic: "Savoir & Érudits",
  },
  {
    id: "algiers-monument",
    name: "Monument des Martyrs & Djamaâ el-Djazaïr",
    arabicName: "مقام الشهيد وجامع الجزائر الأعظم",
    city: "Alger",
    country: "Algérie",
    category: "historical_monument",
    lat: 36.7412,
    lng: 3.0697,
    description: "Symboles d'histoire, de mémoire nationale et troisième plus grande mosquée du monde.",
    historicalSignificance: "Rappelle le sacrifice des martyrs et la riche histoire méditerranéenne d'Algérie.",
    relatedTopic: "Histoire d'Algérie & Martyrs",
  },
];

interface CloudSqlSavedLocation {
  id: number;
  name: string;
  description: string | null;
  category: string;
  lat: number;
  lng: number;
  placeId: string | null;
  notes: string | null;
  createdAt: string;
}

interface GoogleMapsExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GoogleMapsExplorerModal({
  isOpen,
  onClose,
}: GoogleMapsExplorerModalProps) {
  const { user } = useAuth();
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  
  const [selectedSite, setSelectedSite] = useState<HistoricalSite | null>(HISTORICAL_SITES[0]);
  const [mapType, setMapType] = useState<"roadmap" | "satellite" | "hybrid" | "terrain">("roadmap");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [savedLocations, setSavedLocations] = useState<CloudSqlSavedLocation[]>([]);
  const [savingLocation, setSavingLocation] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: 21.4225, lng: 39.8262 });
  const [zoom, setZoom] = useState<number>(6);

  // Fetch saved locations from Cloud SQL backend
  const fetchCloudSqlLocations = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/locations", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.locations)) {
          setSavedLocations(data.locations);
        }
      }
    } catch (err) {
      console.warn("Could not fetch Cloud SQL locations:", err);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      fetchCloudSqlLocations();
    }
  }, [isOpen, fetchCloudSqlLocations]);

  // Save a location to Cloud SQL
  const handleSaveToCloudSql = async (site: HistoricalSite) => {
    if (!user) return;
    setSavingLocation(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: site.name,
          description: site.description,
          category: site.category,
          lat: site.lat,
          lng: site.lng,
          notes: site.historicalSignificance,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.location) {
          setSavedLocations((prev) => [data.location, ...prev]);
          setSaveSuccess(site.name);
          setTimeout(() => setSaveSuccess(null), 3500);
        }
      }
    } catch (err) {
      console.error("Failed to save location to Cloud SQL:", err);
    } finally {
      setSavingLocation(false);
    }
  };

  const handleDeleteSavedLocation = async (id: number) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/locations/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setSavedLocations((prev) => prev.filter((loc) => loc.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete location:", err);
    }
  };

  const filteredSites = useMemo(() => {
    return HISTORICAL_SITES.filter((site) => {
      const matchCat =
        activeCategory === "all" ||
        (activeCategory === "saved" ? false : site.category === activeCategory);
      const matchSearch =
        searchQuery.trim() === "" ||
        site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.relatedTopic.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [activeCategory, searchQuery]);

  const handleSelectSite = (site: HistoricalSite) => {
    setSelectedSite(site);
    setCenter({ lat: site.lat, lng: site.lng });
    setZoom(14);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="google-maps-explorer-modal"
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-7xl h-[92vh] max-h-[920px] bg-zinc-900 border border-zinc-700/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-950/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold tracking-tight text-white">
                    Google Maps Platform • Lieux Historiques & Sacrés
                  </h2>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Cloud SQL Persisté
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Explorez les hauts lieux spirituels, sanctuaires et mosquées emblématiques de nos récits
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Map layer switcher */}
              <div className="hidden sm:flex items-center bg-zinc-800 rounded-lg p-0.5 border border-zinc-700">
                <button
                  type="button"
                  onClick={() => setMapType("roadmap")}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                    mapType === "roadmap"
                      ? "bg-zinc-700 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Plan
                </button>
                <button
                  type="button"
                  onClick={() => setMapType("satellite")}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                    mapType === "satellite"
                      ? "bg-zinc-700 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Satellite
                </button>
                <button
                  type="button"
                  onClick={() => setMapType("hybrid")}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                    mapType === "hybrid"
                      ? "bg-zinc-700 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Hybride
                </button>
                <button
                  type="button"
                  onClick={() => setMapType("terrain")}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                    mapType === "terrain"
                      ? "bg-zinc-700 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Relief
                </button>
              </div>

              <button
                type="button"
                id="close-maps-explorer-button"
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Save notification toast */}
          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-emerald-600 text-white rounded-lg shadow-lg flex items-center gap-2 text-xs font-semibold"
            >
              <Check className="w-4 h-4" />
              <span>« {saveSuccess} » enregistré dans votre base Cloud SQL !</span>
            </motion.div>
          )}

          {/* Main layout */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
            {/* Sidebar list & controls */}
            <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-zinc-800 bg-zinc-950/60 flex flex-col overflow-hidden">
              {/* Search bar */}
              <div className="p-3 border-b border-zinc-800">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Rechercher un lieu, ville, récit..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Categories */}
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setActiveCategory("all")}
                    className={`px-2.5 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                      activeCategory === "all"
                        ? "bg-emerald-500 text-white font-medium"
                        : "bg-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    Tous ({HISTORICAL_SITES.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCategory("holy_site")}
                    className={`px-2.5 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                      activeCategory === "holy_site"
                        ? "bg-emerald-500 text-white font-medium"
                        : "bg-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    Lieux Saints
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCategory("historic_mosque")}
                    className={`px-2.5 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                      activeCategory === "historic_mosque"
                        ? "bg-emerald-500 text-white font-medium"
                        : "bg-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    Mosquées
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCategory("prophetic_site")}
                    className={`px-2.5 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                      activeCategory === "prophetic_site"
                        ? "bg-emerald-500 text-white font-medium"
                        : "bg-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    Récits Prophétiques
                  </button>
                  {savedLocations.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveCategory("saved")}
                      className={`px-2.5 py-1 text-xs rounded-full whitespace-nowrap transition-colors flex items-center gap-1 ${
                        activeCategory === "saved"
                          ? "bg-amber-500 text-zinc-950 font-bold"
                          : "bg-zinc-800 text-amber-300 hover:text-white"
                      }`}
                    >
                      <Bookmark className="w-3 h-3" />
                      Cloud SQL ({savedLocations.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Sites list */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
                {activeCategory === "saved" ? (
                  savedLocations.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500 text-xs">
                      Aucun lieu sauvegardé dans Cloud SQL pour le moment.
                    </div>
                  ) : (
                    savedLocations.map((loc) => (
                      <div
                        key={`saved-${loc.id}`}
                        onClick={() => {
                          setCenter({ lat: loc.lat, lng: loc.lng });
                          setZoom(15);
                        }}
                        className="p-3 bg-zinc-900 hover:bg-zinc-850 rounded-xl border border-zinc-800 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-xs font-semibold text-white group-hover:text-amber-300 transition-colors">
                              {loc.name}
                            </h4>
                            <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                              {loc.description || loc.notes || "Lieu sauvegardé"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSavedLocation(loc.id);
                            }}
                            className="p-1 text-zinc-500 hover:text-red-400 rounded-md transition-colors"
                            title="Supprimer de Cloud SQL"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-[10px] text-zinc-500">
                          <span className="flex items-center gap-0.5 text-amber-400">
                            <Bookmark className="w-3 h-3" /> Cloud SQL
                          </span>
                          <span>•</span>
                          <span>
                            {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  filteredSites.map((site) => {
                    const isSelected = selectedSite?.id === site.id;
                    const isSaved = savedLocations.some((l) => l.name === site.name);

                    return (
                      <div
                        key={site.id}
                        id={`site-item-${site.id}`}
                        onClick={() => handleSelectSite(site)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-emerald-500/10 border-emerald-500/40 shadow-sm"
                            : "bg-zinc-900/80 hover:bg-zinc-850 border-zinc-800/80"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              <h4
                                className={`text-xs font-bold leading-tight ${
                                  isSelected ? "text-emerald-400" : "text-white"
                                }`}
                              >
                                {site.name}
                              </h4>
                              {isSaved && (
                                <span title="Enregistré dans Cloud SQL">
                                  <Bookmark className="w-3 h-3 text-amber-400 fill-amber-400" />
                                </span>
                              )}
                            </div>
                            {site.arabicName && (
                              <p className="text-[10px] text-emerald-300/70 font-arabic mt-0.5">
                                {site.arabicName}
                              </p>
                            )}
                            <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                              {site.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-zinc-800/60 text-[10px]">
                          <span className="text-zinc-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-zinc-500" />
                            {site.city}, {site.country}
                          </span>
                          <span className="text-emerald-400 font-medium">
                            {site.relatedTopic}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Map Canvas */}
            <div className="flex-1 relative flex flex-col min-h-[350px]">
              {apiKey ? (
                <APIProvider apiKey={apiKey}>
                  <div className="w-full h-full relative" style={{ minHeight: "100%", height: "100%" }}>
                    <Map
                      mapId="DEMO_MAP_ID"
                      center={center}
                      zoom={zoom}
                      mapTypeId={mapType}
                      onCenterChanged={(ev) => setCenter(ev.detail.center)}
                      onZoomChanged={(ev) => setZoom(ev.detail.zoom)}
                      // Mandatory usage attribution tracking ID as governed by google-maps-platform skill
                      internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
                      style={{ width: "100%", height: "100%" }}
                      gestureHandling="greedy"
                      fullscreenControl={false}
                    >
                      {/* Historical Sites Markers */}
                      {HISTORICAL_SITES.map((site) => (
                        <AdvancedMarker
                          key={site.id}
                          position={{ lat: site.lat, lng: site.lng }}
                          title={site.name}
                          onClick={() => {
                            setSelectedSite(site);
                            setCenter({ lat: site.lat, lng: site.lng });
                          }}
                        >
                          <Pin
                            background={
                              site.category === "holy_site"
                                ? "#10b981"
                                : site.category === "prophetic_site"
                                ? "#3b82f6"
                                : "#8b5cf6"
                            }
                            glyphColor="#ffffff"
                            borderColor="#047857"
                          />
                        </AdvancedMarker>
                      ))}

                      {/* Saved Cloud SQL Locations Markers */}
                      {savedLocations.map((loc) => (
                        <AdvancedMarker
                          key={`saved-marker-${loc.id}`}
                          position={{ lat: loc.lat, lng: loc.lng }}
                          title={loc.name}
                        >
                          <Pin background="#f59e0b" glyphColor="#000000" borderColor="#b45309" />
                        </AdvancedMarker>
                      ))}

                      {/* Info window for selected site */}
                      {selectedSite && (
                        <InfoWindow
                          position={{ lat: selectedSite.lat, lng: selectedSite.lng }}
                          onCloseClick={() => setSelectedSite(null)}
                        >
                          <div className="p-1 max-w-[260px] text-zinc-900">
                            <h3 className="text-xs font-bold text-zinc-900">{selectedSite.name}</h3>
                            {selectedSite.arabicName && (
                              <p className="text-[10px] text-emerald-700 font-arabic">
                                {selectedSite.arabicName}
                              </p>
                            )}
                            <p className="text-[11px] text-zinc-600 mt-1">
                              {selectedSite.description}
                            </p>
                            <div className="mt-2 text-[10px] text-zinc-500 border-t pt-1">
                              <strong>Récit lié :</strong> {selectedSite.relatedTopic}
                            </div>
                          </div>
                        </InfoWindow>
                      )}
                    </Map>
                  </div>
                </APIProvider>
              ) : (
                /* Interactive Prototyping & Demo Key Quickstart UI */
                <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
                  {/* Subtle map pattern background */}
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

                  <div className="relative z-10 max-w-md bg-zinc-900/90 border border-zinc-800 p-6 rounded-2xl shadow-xl">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-4">
                      <Key className="w-6 h-6" />
                    </div>

                    <h3 className="text-base font-bold text-white mb-1">
                      Configuration de la clé Google Maps Platform
                    </h3>
                    <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                      L'application est prête avec <strong>@vis.gl/react-google-maps</strong> et la persistance <strong>Cloud SQL</strong>.
                      Vous pouvez utiliser une clé d'API standard ou générer gratuitement une <strong>Maps Demo Key</strong> sans carte bancaire requise.
                    </p>

                    <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 text-left mb-4 text-xs space-y-1.5">
                      <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Option Prototypage Rapide (Gratuit) :
                      </div>
                      <ol className="list-decimal list-inside text-zinc-400 space-y-1 text-[11px]">
                        <li>
                          Ouvrez{" "}
                          <a
                            href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 underline hover:text-emerald-300"
                          >
                            mapsplatform.google.com/maps-demo-key
                          </a>
                        </li>
                        <li>Connectez-vous avec votre compte Google (aucun moyen de paiement)</li>
                        <li>Générez votre Demo Key et collez-la dans la variable <code className="text-amber-300">VITE_GOOGLE_MAPS_API_KEY</code></li>
                      </ol>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <a
                        href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Obtenir une Maps Demo Key
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Selected site detail footer drawer */}
              {selectedSite && (
                <div className="absolute bottom-3 left-3 right-3 z-10 bg-zinc-900/95 backdrop-blur-md border border-zinc-700/70 p-4 rounded-xl shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{selectedSite.name}</h3>
                      <span className="text-xs text-zinc-400">({selectedSite.city}, {selectedSite.country})</span>
                    </div>
                    <p className="text-xs text-zinc-300 mt-1 line-clamp-1">
                      {selectedSite.historicalSignificance}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {user && (
                      <button
                        type="button"
                        id="save-location-cloudsql-btn"
                        onClick={() => handleSaveToCloudSql(selectedSite)}
                        disabled={savingLocation}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors shadow"
                      >
                        {savingLocation ? (
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Bookmark className="w-3.5 h-3.5" />
                        )}
                        <span>Sauvegarder dans Cloud SQL</span>
                      </button>
                    )}

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedSite.lat},${selectedSite.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Google Maps</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
