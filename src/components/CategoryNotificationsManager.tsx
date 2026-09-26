import { useState, useMemo } from "react";
import {
  Bell,
  BellRing,
  BellOff,
  Check,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Play,
  RotateCcw,
  Sliders,
  ShieldCheck,
  Layers,
  Zap,
  Radio,
  Clock,
  ExternalLink,
} from "lucide-react";
import { GlassPanel } from "@/components/GlassSurface";
import { useCategoryNotifications } from "@/hooks/useCategoryNotifications";
import { useCreatorCatalog } from "@/hooks/useCreatorCatalog";
import { Category } from "@/data/catalog";

interface CategoryNotificationsManagerProps {
  onShowToast: (message: string) => void;
  onPlayVideo?: (id: string) => void;
}

const ALL_CATALOG_CATEGORIES: {
  id: Category;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    id: "Coran",
    label: "Coran & Tarawih",
    icon: "📖",
    description: "Récitations authentiques et prières de nuit du Haramain",
  },
  {
    id: "Prophètes",
    label: "Récits des Prophètes",
    icon: "📜",
    description: "Histoire des messagers d'Allah et biographie prophétique (Sîra)",
  },
  {
    id: "Compagnons",
    label: "Vie des Compagnons",
    icon: "🛡️",
    description: "Récits inspirants des Sahaba et des pieux prédécesseurs",
  },
  {
    id: "Miracles du Coran",
    label: "Miracles & Sciences",
    icon: "🔬",
    description: "Preuves scientifiques, concorde linguistique et merveilles coraniques",
  },
  {
    id: "Histoire & Mystère",
    label: "Histoire & Enquêtes",
    icon: "🏛️",
    description: "Grandes épopées de la civilisation islamique et analyses historiques",
  },
  {
    id: "Héros & Personnages",
    label: "Héros Historiques",
    icon: "⚔️",
    description: "Figures marquantes, savants et bâtisseurs du monde musulman",
  },
  {
    id: "Eschatologie",
    label: "Fin des Temps",
    icon: "⚡",
    description: "Signes de l'Heure, résurrection et événements eschatologiques",
  },
  {
    id: "Anges & Djinns",
    label: "Monde de l'Invisible",
    icon: "🌌",
    description: "Connaissance du monde occulte, des anges et de la création divine",
  },
];

export default function CategoryNotificationsManager({
  onShowToast,
  onPlayVideo,
}: CategoryNotificationsManagerProps) {
  const { catalog } = useCreatorCatalog();
  const {
    permission,
    isSupported,
    enabled,
    favoriteCategories,
    history,
    matchingNewVideos,
    unnotifiedCount,
    requestPermission,
    toggleEnabled,
    toggleCategory,
    setAllCategories,
    clearAllCategories,
    checkPublicationsNow,
    sendTestNotification,
    resetHistory,
    lastCheckTimestamp,
  } = useCategoryNotifications(onPlayVideo);

  const [checking, setChecking] = useState(false);

  // Compute category statistics from actual catalog data
  const categoryStats = useMemo(() => {
    const stats: Record<string, { total: number; newCount: number }> = {};

    ALL_CATALOG_CATEGORIES.forEach((cat) => {
      stats[cat.id] = { total: 0, newCount: 0 };
    });

    (catalog || []).forEach((item) => {
      item.categories.forEach((cat) => {
        if (!stats[cat]) {
          stats[cat] = { total: 0, newCount: 0 };
        }
        stats[cat].total += 1;
        if (item.isNew || (item.year && item.year >= 2024)) {
          stats[cat].newCount += 1;
        }
      });
    });

    return stats;
  }, [catalog]);

  const handleRequestPermission = async () => {
    const result = await requestPermission();
    if (result === "granted") {
      onShowToast("Notifications navigateur autorisées avec succès !");
      sendTestNotification();
    } else if (result === "denied") {
      onShowToast("Les notifications ont été bloquées dans votre navigateur.");
    }
  };

  const handleManualCheck = () => {
    setChecking(true);
    setTimeout(() => {
      const res = checkPublicationsNow(3);
      setChecking(false);
      if (res.alertedCount > 0) {
        onShowToast(
          `${res.alertedCount} notification${res.alertedCount > 1 ? "s" : ""} envoyée${res.alertedCount > 1 ? "s" : ""} sur votre bureau !`
        );
      } else if (permission !== "granted") {
        onShowToast("Autorisez d'abord les notifications du navigateur pour les recevoir.");
      } else if (favoriteCategories.length === 0) {
        onShowToast("Sélectionnez au moins une catégorie favorite.");
      } else {
        onShowToast("Vous êtes à jour ! Aucune nouvelle publication non notifiée.");
      }
    }, 400);
  };

  const handleSendTest = () => {
    if (permission !== "granted") {
      onShowToast("Veuillez autoriser les notifications du navigateur d'abord.");
      return;
    }
    const success = sendTestNotification(favoriteCategories[0] || "Coran");
    if (success) {
      onShowToast("Notification de test envoyée au navigateur !");
    } else {
      onShowToast("Impossible d'envoyer la notification de test.");
    }
  };

  const handleReset = () => {
    resetHistory();
    onShowToast("Historique des alertes réinitialisé. Les alertes pourront être re-déclenchées.");
  };

  return (
    <GlassPanel variant="card" className="p-5 sm:p-6 border border-white/15 space-y-6">
      {/* Header with status badge and master toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-zinc-950 shadow-md shadow-emerald-500/20">
              <BellRing size={18} className="animate-pulse" />
            </div>
            <h3 className="text-white text-base sm:text-lg font-black tracking-tight">
              Notifications Navigateur par Catégories Favorites
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[11px] font-semibold flex items-center gap-1">
              <Sparkles size={11} /> Données Catalogue
            </span>
          </div>
          <p className="text-zinc-400 text-xs mt-1 max-w-2xl leading-relaxed">
            Recevez des alertes locales discrètes sur votre bureau ou smartphone dès qu'un nouvel épisode ou une récitation est publié dans vos thématiques préférées.
          </p>
        </div>

        {/* Master Toggle */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <span className="text-xs font-semibold text-zinc-300">
            {enabled ? "Alertes Activées" : "Désactivées"}
          </span>
          <button
            type="button"
            onClick={toggleEnabled}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 focus:outline-none cursor-pointer ${
              enabled
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                : "bg-white/10 border border-white/15"
            }`}
            aria-label="Activer ou désactiver les notifications par catégorie"
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Permission Status Banner */}
      <div className="p-3.5 rounded-2xl liquid-glass border border-white/10 bg-zinc-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {permission === "granted" ? (
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <CheckCircle2 size={18} />
            </div>
          ) : permission === "denied" ? (
            <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-400 flex-shrink-0">
              <BellOff size={18} />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 flex-shrink-0">
              <AlertCircle size={18} />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">
                Autorisation du navigateur :
              </span>
              {permission === "granted" && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-semibold">
                  ✓ Autorisée
                </span>
              )}
              {permission === "default" && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 font-semibold">
                  En attente d'accord
                </span>
              )}
              {permission === "denied" && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-300 font-semibold">
                  Bloquée dans le navigateur
                </span>
              )}
              {permission === "unsupported" && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-700/50 text-zinc-400 font-semibold">
                  Non supportée
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {permission === "granted"
                ? "Votre navigateur est configuré pour afficher instantanément les notifications natives sur votre système."
                : permission === "denied"
                ? "Les notifications sont désactivées dans les permissions de votre navigateur. Cliquez sur le cadenas de la barre d'adresse pour autoriser."
                : "Une invite de permission apparaîtra lorsque vous cliquerez sur le bouton ci-contre."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
          {permission !== "granted" && isSupported && (
            <button
              type="button"
              onClick={handleRequestPermission}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Bell size={13} />
              <span>Autoriser les alertes</span>
            </button>
          )}

          {permission === "granted" && (
            <button
              type="button"
              onClick={handleSendTest}
              className="px-3 py-1.5 rounded-xl liquid-glass hover:bg-white/15 text-zinc-200 hover:text-white font-semibold text-xs border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles size={13} className="text-emerald-400" />
              <span>Tester l'alerte</span>
            </button>
          )}
        </div>
      </div>

      {/* Category selection grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-white text-xs sm:text-sm font-bold flex items-center gap-1.5">
              <Layers size={15} className="text-emerald-400" />
              <span>Catégories à surveiller ({favoriteCategories.length} sélectionnée{favoriteCategories.length > 1 ? "s" : ""})</span>
            </h4>
            <p className="text-zinc-400 text-[11px] mt-0.5">
              Sélectionnez les thématiques qui vous intéressent pour recevoir une alerte locale à chaque nouveauté
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAllCategories(ALL_CATALOG_CATEGORIES.map((c) => c.id))}
              className="px-2.5 py-1 rounded-lg liquid-glass hover:bg-white/15 text-zinc-300 hover:text-white text-[10px] font-semibold border border-white/10 transition-colors cursor-pointer"
            >
              Tout cocher
            </button>
            <button
              type="button"
              onClick={clearAllCategories}
              className="px-2.5 py-1 rounded-lg liquid-glass hover:bg-white/15 text-zinc-400 hover:text-rose-300 text-[10px] font-semibold border border-white/10 transition-colors cursor-pointer"
            >
              Tout effacer
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {ALL_CATALOG_CATEGORIES.map((cat) => {
            const isSelected = favoriteCategories.includes(cat.id);
            const stats = categoryStats[cat.id] || { total: 0, newCount: 0 };

            return (
              <div
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`p-3 rounded-2xl liquid-glass border cursor-pointer select-none transition-all duration-200 relative group flex flex-col justify-between ${
                  isSelected
                    ? "border-emerald-400/50 bg-emerald-950/20 shadow-[inset_0_1px_1px_rgba(167,243,208,0.2),0_4px_12px_rgba(16,185,129,0.1)]"
                    : "border-white/10 hover:border-white/20 bg-zinc-900/40 opacity-75 hover:opacity-100"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xl flex-shrink-0">{cat.icon}</span>
                      <span
                        className={`text-xs font-bold leading-tight ${
                          isSelected ? "text-white" : "text-zinc-300"
                        }`}
                      >
                        {cat.label}
                      </span>
                    </div>

                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 transition-all ${
                        isSelected
                          ? "bg-emerald-500 text-zinc-950 font-black shadow-sm"
                          : "border border-white/20 text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                  </div>

                  <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">
                    {cat.description}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5 text-[10px]">
                  <span className="text-zinc-500 font-medium">
                    {stats.total} vidéo{stats.total > 1 ? "s" : ""}
                  </span>
                  {stats.newCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded bg-emerald-400/15 border border-emerald-400/30 text-emerald-300 font-bold">
                      +{stats.newCount} nouveauté{stats.newCount > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real-time Scan & Diagnostic Bar */}
      <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400">
              <Zap size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">
                  Détection automatique de publications
                </span>
                <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                  {matchingNewVideos.length} dans vos catégories
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {unnotifiedCount > 0
                  ? `${unnotifiedCount} nouvelle${unnotifiedCount > 1 ? "s" : ""} publication${unnotifiedCount > 1 ? "s" : ""} prête${unnotifiedCount > 1 ? "s" : ""} à être notifiée${unnotifiedCount > 1 ? "s" : ""}.`
                  : "Toutes les nouveautés de vos catégories ont déjà été signalées."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualCheck}
              disabled={checking}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <BellRing size={13} className={checking ? "animate-spin" : ""} />
              <span>{checking ? "Vérification..." : "Vérifier maintenant"}</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="p-2 rounded-xl liquid-glass hover:bg-white/15 text-zinc-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
              title="Réinitialiser l'historique des alertes pour tester à nouveau"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* History of Sent Notifications */}
      {history.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={13} className="text-emerald-400" />
              Historique des alertes locales envoyées ({history.length})
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="text-[10px] text-zinc-400 hover:text-rose-300 transition-colors cursor-pointer"
            >
              Vider l'historique
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
            {history.map((item) => (
              <div
                key={`${item.id}-${item.notifiedAt}`}
                className="p-2.5 rounded-xl liquid-glass border border-white/10 hover:border-white/20 bg-zinc-900/50 flex items-center justify-between gap-3 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-12 h-8 rounded object-cover flex-shrink-0 border border-white/10"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate group-hover:text-emerald-300 transition-colors">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                      <span className="text-emerald-400 font-medium">
                        {item.category}
                      </span>
                      <span>•</span>
                      <span className="truncate">{item.channel}</span>
                      <span>•</span>
                      <span>
                        {new Date(item.notifiedAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {onPlayVideo && (
                  <button
                    type="button"
                    onClick={() => onPlayVideo(item.id)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-emerald-300 text-xs font-semibold flex items-center gap-1 transition-colors flex-shrink-0 cursor-pointer"
                  >
                    <Play size={11} className="fill-emerald-300" />
                    <span>Lire</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </GlassPanel>
  );
}
