import { useState, useMemo } from "react";
import {
  X,
  Radio,
  Sparkles,
  Check,
  Bell,
  AlertTriangle,
  Send,
  Trash2,
  Eye,
  Layers,
  ChevronRight,
  ExternalLink,
  Flame,
  ShieldAlert,
  Clock,
  CheckCircle2,
  RefreshCw,
  Film,
  Search,
  Sliders,
  Volume2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/hooks/useAuth";
import {
  useCreatorCatalog,
  type GlobalAnnouncement,
  type CreatorAlertBroadcast,
} from "@/hooks/useCreatorCatalog";
import { type ContentItem } from "@/data/catalog";

interface CreatorAlertModalProps {
  onClose: () => void;
  onPlayVideo?: (item: ContentItem) => void;
}

const PRESET_ALERT_TEMPLATES = [
  {
    title: "🔥 Nouvel Épisode en Ligne",
    badge: "NOUVEAUTÉ",
    badgeColor: "emerald" as const,
    priority: "normal" as const,
    text: "Un nouvel épisode exclusif vient d'être ajouté au catalogue !",
    subtext: "Disponible dès maintenant en qualité HD 100% sans interruption publicitaire.",
    buttonText: "Regarder",
  },
  {
    title: "🌙 Rappel & Spiritualité du Vendredi",
    badge: "JUMU'A",
    badgeColor: "emerald" as const,
    priority: "normal" as const,
    text: "N'oubliez pas la lecture de la Sourate Al-Kahf et les invocations.",
    subtext: "Retrouvez les plus belles récitations du Haramain dans la section Coran.",
    buttonText: "Écouter",
  },
  {
    title: "📢 Annonce Officielle du Créateur",
    badge: "CRÉATEUR",
    badgeColor: "amber" as const,
    priority: "event" as const,
    text: "Merci à toute la communauté pour vos suggestions et retours !",
    subtext: "De nouveaux récits historiques et thématiques sont en cours de préparation.",
    buttonText: "Découvrir",
  },
  {
    title: "⚡ Maintenance & Optimisation",
    badge: "MAINTENANCE",
    badgeColor: "rose" as const,
    priority: "urgent" as const,
    text: "Mise à niveau de nos serveurs de streaming haute fidélité.",
    subtext: "Aucune coupure prévue, votre expérience reste fluide.",
    buttonText: "Info",
  },
  {
    title: "⭐ Tarawih Historiques Rares",
    badge: "HARAMAIN",
    badgeColor: "sky" as const,
    priority: "event" as const,
    text: "Archives d'exception : Tarawih de La Mecque 1410H (1990) disponibles.",
    subtext: "Revivez l'émotion des récitations légendaires de La Mecque et Médine.",
    buttonText: "Écouter",
  },
  {
    title: "⚠️ Message Urgent aux Spectateurs",
    badge: "URGENT",
    badgeColor: "red" as const,
    priority: "urgent" as const,
    text: "Information importante concernant les prochaines diffusions.",
    subtext: "Consultez les détails pour ne rien manquer.",
    buttonText: "Lire",
  },
];

export default function CreatorAlertModal({ onClose, onPlayVideo }: CreatorAlertModalProps) {
  const { user, firebaseUser } = useAuth();
  const {
    catalog,
    announcement,
    creatorAlerts,
    setAnnouncement,
    broadcastCreatorAlert,
    deleteCreatorAlert,
  } = useCreatorCatalog();

  const [activeSubTab, setActiveSubTab] = useState<"banner" | "broadcast" | "history">("banner");

  // Banner configuration form
  const [bannerForm, setBannerForm] = useState<GlobalAnnouncement>(
    announcement || {
      enabled: true,
      text: "✨ Bienvenue sur SiratStream — Récits des Prophètes & Tarawih Historiques",
      subtext: "Catalogue sans publicité, respectueux et synchronisé dans le cloud.",
      badge: "BIENVENUE",
      badgeColor: "emerald",
      priority: "normal",
      buttonText: "Découvrir",
      linkContentId: "",
    }
  );

  // Broadcast push form
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastBadge, setBroadcastBadge] = useState("ALERTE");
  const [broadcastBadgeColor, setBroadcastBadgeColor] = useState<"amber" | "emerald" | "sky" | "rose" | "purple" | "red">("emerald");
  const [broadcastPriority, setBroadcastPriority] = useState<"normal" | "urgent" | "event">("normal");
  const [broadcastLinkContentId, setBroadcastLinkContentId] = useState("");

  const [searchVideoQuery, setSearchVideoQuery] = useState("");
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);
  const [testSimulatedAlert, setTestSimulatedAlert] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Video search for linking
  const matchingVideos = useMemo(() => {
    if (!searchVideoQuery.trim()) return catalog.slice(0, 8);
    const q = searchVideoQuery.toLowerCase();
    return catalog.filter(
      (c) => c.title.toLowerCase().includes(q) || c.channel.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [catalog, searchVideoQuery]);

  const selectedBannerVideo = useMemo(() => {
    return bannerForm.linkContentId ? catalog.find((c) => c.id === bannerForm.linkContentId) : null;
  }, [catalog, bannerForm.linkContentId]);

  // Apply a template preset
  const handleApplyTemplate = (tpl: typeof PRESET_ALERT_TEMPLATES[0]) => {
    setBannerForm((prev) => ({
      ...prev,
      text: tpl.text,
      subtext: tpl.subtext,
      badge: tpl.badge,
      badgeColor: tpl.badgeColor,
      priority: tpl.priority,
      buttonText: tpl.buttonText,
      enabled: true,
    }));
    setBroadcastTitle(tpl.title);
    setBroadcastMessage(`${tpl.text} — ${tpl.subtext}`);
    setBroadcastBadge(tpl.badge);
    setBroadcastBadgeColor(tpl.badgeColor);
    setBroadcastPriority(tpl.priority);
  };

  // Save banner configuration
  const handleSaveBanner = async () => {
    const res = await setAnnouncement(bannerForm);
    if (res.success) {
      setSaveSuccessNotice("✅ Bannière d'alerte enregistrée et mise en ligne avec succès !");
      setTimeout(() => setSaveSuccessNotice(null), 4000);
    }
  };

  // Turn off banner
  const handleDisableBanner = async () => {
    const updated = { ...bannerForm, enabled: false };
    setBannerForm(updated);
    await setAnnouncement(updated);
    setSaveSuccessNotice("Bannière d'alerte désactivée.");
    setTimeout(() => setSaveSuccessNotice(null), 3000);
  };

  // Broadcast immediate alert
  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      alert("Veuillez renseigner un titre et un message pour diffuser l'alerte.");
      return;
    }

    setIsBroadcasting(true);
    try {
      await broadcastCreatorAlert({
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
        badge: broadcastBadge,
        badgeColor: broadcastBadgeColor,
        priority: broadcastPriority,
        linkContentId: broadcastLinkContentId || undefined,
        active: true,
      });

      // Also optionally update the main banner
      await setAnnouncement({
        enabled: true,
        text: broadcastTitle.trim(),
        subtext: broadcastMessage.trim(),
        badge: broadcastBadge,
        badgeColor: broadcastBadgeColor,
        priority: broadcastPriority,
        linkContentId: broadcastLinkContentId || undefined,
      });

      setSaveSuccessNotice("🚀 Alerte diffusée instantanément à tous les spectateurs !");
      setBroadcastTitle("");
      setBroadcastMessage("");
      setTimeout(() => setSaveSuccessNotice(null), 4500);
    } catch (err: any) {
      alert("Erreur lors de la diffusion : " + err.message);
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
      />

      {/* Modal Dialog Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-6xl h-[92vh] bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-100 font-sans"
      >
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-red-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
              <Radio size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Studio des Alertes Créateur & Flash Info
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-black uppercase tracking-wider">
                  LIVE BROADCAST
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Diffusez des annonces en direct, flash infos et notifications à tous les spectateurs de SiratStream.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTestSimulatedAlert((p) => !p)}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                testSimulatedAlert
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                  : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white"
              }`}
            >
              <Eye size={14} />
              <span>Simulateur Spectateur {testSimulatedAlert ? "ON" : "OFF"}</span>
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
              aria-label="Fermer la page des alertes"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="px-6 border-b border-zinc-800 bg-zinc-950/60 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveSubTab("banner")}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeSubTab === "banner"
                ? "border-amber-500 text-amber-400 bg-amber-500/10"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Radio size={15} />
            <span>Bannière Flash Info & En-Tête</span>
            {bannerForm.enabled && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveSubTab("broadcast")}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeSubTab === "broadcast"
                ? "border-red-500 text-red-400 bg-red-500/10"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Send size={15} />
            <span>Envoi d'Alerte Immédiate</span>
          </button>

          <button
            onClick={() => setActiveSubTab("history")}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeSubTab === "history"
                ? "border-sky-500 text-sky-400 bg-sky-500/10"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Clock size={15} />
            <span>Historique des Alertes ({creatorAlerts.length})</span>
          </button>
        </div>

        {/* Global Feedback Banner */}
        {saveSuccessNotice && (
          <div className="px-6 py-2.5 bg-emerald-950/80 border-b border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>{saveSuccessNotice}</span>
            </div>
            <button onClick={() => setSaveSuccessNotice(null)} className="text-emerald-400 hover:text-emerald-200">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: BANNER CONFIGURATION */}
          {activeSubTab === "banner" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Form Controls */}
              <div className="lg:col-span-7 space-y-5">
                <div className="bg-zinc-900/70 p-5 rounded-3xl border border-zinc-800/80 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Radio size={18} className={bannerForm.enabled ? "text-emerald-400" : "text-zinc-500"} />
                      <span className="font-bold text-white text-sm">État de la bannière</span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bannerForm.enabled}
                        onChange={(e) => setBannerForm({ ...bannerForm, enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      <span className="ml-3 text-xs font-semibold text-zinc-300">
                        {bannerForm.enabled ? "Activée (En ligne)" : "Désactivée"}
                      </span>
                    </label>
                  </div>

                  {/* Badge & Color Picker */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-zinc-400">Texte du Badge</label>
                      <input
                        type="text"
                        value={bannerForm.badge || ""}
                        onChange={(e) => setBannerForm({ ...bannerForm, badge: e.target.value.toUpperCase() })}
                        placeholder="Ex: FLASH INFO, DIRECT, NOUVEAUTÉ..."
                        className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white uppercase font-bold focus:border-amber-500 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-zinc-400">Couleur du Badge</label>
                      <div className="flex items-center gap-2 pt-1">
                        {[
                          { id: "emerald", label: "Vert", bg: "bg-emerald-500" },
                          { id: "amber", label: "Or", bg: "bg-amber-500" },
                          { id: "rose", label: "Rose", bg: "bg-rose-500" },
                          { id: "sky", label: "Cyan", bg: "bg-sky-500" },
                          { id: "purple", label: "Violet", bg: "bg-purple-500" },
                          { id: "red", label: "Rouge", bg: "bg-red-600" },
                        ].map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setBannerForm({ ...bannerForm, badgeColor: c.id as any })}
                            className={`w-6 h-6 rounded-full ${c.bg} transition-all ${
                              bannerForm.badgeColor === c.id ? "ring-2 ring-white scale-110" : "opacity-60 hover:opacity-100"
                            }`}
                            title={c.label}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Main text */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-zinc-400">
                      Titre principal de l'annonce (Obligatoire)
                    </label>
                    <input
                      type="text"
                      value={bannerForm.text}
                      onChange={(e) => setBannerForm({ ...bannerForm, text: e.target.value })}
                      placeholder="Ex: ✨ Bienvenue sur SiratStream — Récits des Prophètes"
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs sm:text-sm text-white font-medium focus:border-amber-500 outline-none"
                    />
                  </div>

                  {/* Subtext */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-zinc-400">
                      Sous-texte ou précision complémentaire
                    </label>
                    <input
                      type="text"
                      value={bannerForm.subtext || ""}
                      onChange={(e) => setBannerForm({ ...bannerForm, subtext: e.target.value })}
                      placeholder="Ex: Explorez notre catalogue 100% sans publicité et synchronisé dans le cloud."
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:border-amber-500 outline-none"
                    />
                  </div>

                  {/* Action Button Label & Priority */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-zinc-400">Texte du bouton d'action</label>
                      <input
                        type="text"
                        value={bannerForm.buttonText || ""}
                        onChange={(e) => setBannerForm({ ...bannerForm, buttonText: e.target.value })}
                        placeholder="Ex: Regarder, Découvrir, Écouter..."
                        className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:border-amber-500 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-zinc-400">Niveau de Priorité</label>
                      <select
                        value={bannerForm.priority || "normal"}
                        onChange={(e) => setBannerForm({ ...bannerForm, priority: e.target.value as any })}
                        className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:border-amber-500 outline-none"
                      >
                        <option value="normal">Standard (Sobre)</option>
                        <option value="event">Événement Spécial (Doré)</option>
                        <option value="urgent">Alerte Urgente (Pulsante Rouge)</option>
                      </select>
                    </div>
                  </div>

                  {/* Link to a Video in Catalog */}
                  <div className="space-y-2 pt-2 border-t border-zinc-800">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-zinc-400">
                        Relier l'alerte à une vidéo spécifique du catalogue
                      </label>
                      {bannerForm.linkContentId && (
                        <button
                          type="button"
                          onClick={() => setBannerForm({ ...bannerForm, linkContentId: "" })}
                          className="text-[11px] text-red-400 hover:underline"
                        >
                          Détacher la vidéo
                        </button>
                      )}
                    </div>

                    {selectedBannerVideo && (
                      <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <img
                            src={selectedBannerVideo.thumbnail}
                            alt=""
                            className="w-12 h-8 rounded-lg object-cover shrink-0"
                          />
                          <div className="truncate">
                            <p className="text-xs font-bold text-white truncate">{selectedBannerVideo.title}</p>
                            <p className="text-[10px] text-zinc-400">{selectedBannerVideo.channel} • {selectedBannerVideo.duration}</p>
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-bold">
                          Attachée
                        </span>
                      </div>
                    )}

                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-3 text-zinc-500" />
                      <input
                        type="text"
                        value={searchVideoQuery}
                        onChange={(e) => setSearchVideoQuery(e.target.value)}
                        placeholder="Rechercher une vidéo à relier (titre ou chaîne)..."
                        className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:border-amber-500 outline-none"
                      />
                    </div>

                    {searchVideoQuery.trim() && (
                      <div className="max-h-40 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-xl p-1 divide-y divide-zinc-800/60">
                        {matchingVideos.map((v) => (
                          <div
                            key={v.id}
                            onClick={() => {
                              setBannerForm({ ...bannerForm, linkContentId: v.id });
                              setSearchVideoQuery("");
                            }}
                            className="p-2 flex items-center gap-3 hover:bg-zinc-800/70 rounded-lg cursor-pointer transition-colors"
                          >
                            <img src={v.thumbnail} alt="" className="w-10 h-6 rounded object-cover" />
                            <div className="truncate flex-1">
                              <p className="text-xs font-medium text-white truncate">{v.title}</p>
                              <p className="text-[10px] text-zinc-400">{v.channel}</p>
                            </div>
                            <span className="text-[10px] text-amber-400 font-bold shrink-0">Choisir</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Save Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                    {bannerForm.enabled && (
                      <button
                        type="button"
                        onClick={handleDisableBanner}
                        className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
                      >
                        Désactiver l'Alerte
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleSaveBanner}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/60 transition-all active:scale-95"
                    >
                      <Check size={16} />
                      <span>Enregistrer & Diffuser en Direct</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Real-time Live Preview & Templates */}
              <div className="lg:col-span-5 space-y-5">
                {/* Live Banner Preview Box */}
                <div className="bg-zinc-900/70 p-5 rounded-3xl border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                      <Eye size={14} className="text-amber-400" />
                      <span>Aperçu en Temps Réel</span>
                    </span>
                    <span className="text-[10px] text-zinc-400">Rendu exact spectateur</span>
                  </div>

                  {/* Simulated Top Banner Container */}
                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-inner">
                    <div
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                        bannerForm.priority === "urgent" || bannerForm.badgeColor === "red"
                          ? "bg-red-950/60 border-red-500/40 text-red-200"
                          : "bg-zinc-900 border-zinc-800 text-zinc-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span
                            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                              bannerForm.priority === "urgent" || bannerForm.badgeColor === "red"
                                ? "bg-red-400"
                                : "bg-emerald-400"
                            }`}
                          ></span>
                          <span
                            className={`relative inline-flex rounded-full h-2 w-2 ${
                              bannerForm.priority === "urgent" || bannerForm.badgeColor === "red"
                                ? "bg-red-500"
                                : "bg-emerald-500"
                            }`}
                          ></span>
                        </span>

                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0 ${
                            bannerForm.badgeColor === "amber"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : bannerForm.badgeColor === "rose"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : bannerForm.badgeColor === "purple"
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              : bannerForm.badgeColor === "sky"
                              ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                              : bannerForm.badgeColor === "red"
                              ? "bg-red-500/25 text-red-300 border border-red-500/40"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          {bannerForm.badge || "ANNONCE"}
                        </span>

                        <div className="truncate">
                          <span className="font-semibold text-white">{bannerForm.text || "Titre de l'annonce..."}</span>
                          {bannerForm.subtext && (
                            <span className="text-zinc-400 hidden sm:inline ml-2 text-[11px]">• {bannerForm.subtext}</span>
                          )}
                        </div>
                      </div>

                      <button className="px-2 py-1 rounded bg-white/10 text-white font-bold text-[10px] shrink-0">
                        {bannerForm.buttonText || "Regarder"}
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Cette alerte s'affiche en tête de page pour tous les visiteurs et reste synchronisée via Firestore.
                  </p>
                </div>

                {/* Ready-to-use Presets */}
                <div className="bg-zinc-900/70 p-5 rounded-3xl border border-zinc-800 space-y-3">
                  <span className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={14} className="text-amber-400" />
                    <span>Modèles d'Alertes en 1 Clic</span>
                  </span>

                  <div className="space-y-2">
                    {PRESET_ALERT_TEMPLATES.map((tpl, i) => (
                      <div
                        key={i}
                        onClick={() => handleApplyTemplate(tpl)}
                        className="p-3 bg-zinc-950/80 hover:bg-zinc-800/80 border border-zinc-800 rounded-2xl cursor-pointer transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                              {tpl.title}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                              {tpl.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 truncate mt-0.5">{tpl.text}</p>
                        </div>
                        <span className="text-xs text-amber-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                          Appliquer
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IMMEDIATE BROADCAST PUSH */}
          {activeSubTab === "broadcast" && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-zinc-900/80 p-6 rounded-3xl border border-zinc-800 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
                    <Send size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Diffuser une Alerte Push Communauté</h3>
                    <p className="text-xs text-zinc-400">
                      Envoie immédiatement une alerte à tous les spectateurs connectés sur la plateforme.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-zinc-400">Titre de l'Alerte</label>
                    <input
                      type="text"
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      placeholder="Ex: 🔥 Nouvel épisode sur la Sîra Prophétique disponible !"
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs sm:text-sm text-white font-medium focus:border-red-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-zinc-400">Message détaillé</label>
                    <textarea
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      rows={3}
                      placeholder="Ex: Plongez au cœur des récits authentiques avec une narration immersive en haute définition..."
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:border-red-500 outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-zinc-400">Badge</label>
                      <input
                        type="text"
                        value={broadcastBadge}
                        onChange={(e) => setBroadcastBadge(e.target.value.toUpperCase())}
                        placeholder="Ex: DIRECT, ALERTE..."
                        className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white uppercase font-bold focus:border-red-500 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-zinc-400">Couleur du Badge</label>
                      <select
                        value={broadcastBadgeColor}
                        onChange={(e) => setBroadcastBadgeColor(e.target.value as any)}
                        className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:border-red-500 outline-none"
                      >
                        <option value="emerald">Émeraude (Vert)</option>
                        <option value="amber">Ambre (Or)</option>
                        <option value="red">Rouge vif (Urgence)</option>
                        <option value="sky">Cyan (Bleu)</option>
                        <option value="rose">Rubis (Rose)</option>
                        <option value="purple">Pourpre (Violet)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      disabled={isBroadcasting}
                      onClick={handleSendBroadcast}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold shadow-xl shadow-red-950/80 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Send size={16} />
                      <span>{isBroadcasting ? "Diffusion en cours..." : "Diffuser l'Alerte Maintenant"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ALERT HISTORY */}
          {activeSubTab === "history" && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">Historique des alertes créées</h3>
                  <p className="text-xs text-zinc-400">Consultez, réactivez ou supprimez vos diffusions précédentes.</p>
                </div>
              </div>

              {creatorAlerts.length === 0 ? (
                <div className="p-12 text-center bg-zinc-900/40 border border-zinc-800 rounded-3xl text-zinc-500 text-xs">
                  Aucune alerte n'a encore été diffusée.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {creatorAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-2xl flex items-center justify-between gap-4 hover:border-zinc-700 transition-colors"
                    >
                      <div className="space-y-1 truncate">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              alert.badgeColor === "red"
                                ? "bg-red-500/20 text-red-300"
                                : alert.badgeColor === "amber"
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-emerald-500/20 text-emerald-300"
                            }`}
                          >
                            {alert.badge || "ALERTE"}
                          </span>
                          <span className="font-bold text-white text-xs truncate">{alert.title}</span>
                        </div>
                        <p className="text-xs text-zinc-400 truncate">{alert.message}</p>
                        <p className="text-[10px] text-zinc-500">
                          Diffusée le : {new Date(alert.sentAt).toLocaleString("fr-FR")}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setBannerForm({
                              enabled: true,
                              text: alert.title,
                              subtext: alert.message,
                              badge: alert.badge || "ALERTE",
                              badgeColor: alert.badgeColor || "emerald",
                              priority: alert.priority || "normal",
                            });
                            setActiveSubTab("banner");
                          }}
                          className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
                        >
                          Réutiliser
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteCreatorAlert(alert.id)}
                          className="p-2 rounded-xl bg-red-950/40 hover:bg-red-950/80 text-red-400 transition-colors"
                          title="Supprimer de l'historique"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
