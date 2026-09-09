import { useState, useMemo, useEffect } from "react";
import {
  Bell,
  BellRing,
  BellOff,
  Clock,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Sparkles,
  Volume2,
  VolumeX,
  Check,
  Radio,
  Tv,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Play,
  Square,
  RotateCcw,
  Sliders,
  Shield,
  Smartphone,
  Download,
  ExternalLink,
  Music,
} from "lucide-react";
import { GlassPanel } from "@/components/GlassSurface";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useCreatorCatalog } from "@/hooks/useCreatorCatalog";
import { PrayerReminderPreferences } from "@/lib/userPreferences";
import AssabileAdhanModal from "./AssabileAdhanModal";
import {
  FEATURED_ASSABILE_OPTIONS,
  getAdhanSoundInfo,
  playAdhanAudio,
  stopAdhanAudio,
  exportAdhanMp3,
} from "@/lib/adhanAudio";

interface NotificationsSettingsSectionProps {
  onShowToast: (message: string) => void;
}

const PRAYER_ITEMS = [
  {
    key: "fajr" as const,
    name: "Fajr",
    period: "Aube",
    timeDescription: "Avant le lever du soleil",
    icon: Sunrise,
    color: "from-amber-500/20 to-orange-500/10 text-amber-300 border-amber-500/30",
  },
  {
    key: "dhuhr" as const,
    name: "Dhuhr",
    period: "Midi",
    timeDescription: "Zénith du soleil",
    icon: Sun,
    color: "from-yellow-500/20 to-amber-500/10 text-yellow-300 border-yellow-500/30",
  },
  {
    key: "asr" as const,
    name: "Asr",
    period: "Après-midi",
    timeDescription: "Milieu d'après-midi",
    icon: Sun,
    color: "from-amber-600/20 to-yellow-600/10 text-amber-200 border-amber-600/30",
  },
  {
    key: "maghrib" as const,
    name: "Maghrib",
    period: "Coucher du soleil",
    timeDescription: "Rupture du jeûne & crépuscule",
    icon: Sunset,
    color: "from-rose-500/20 to-orange-500/10 text-rose-300 border-rose-500/30",
  },
  {
    key: "isha" as const,
    name: "Isha",
    period: "Nuit",
    timeDescription: "Obscurité complète",
    icon: Moon,
    color: "from-indigo-500/20 to-sky-500/10 text-indigo-300 border-indigo-500/30",
  },
];

const COMPLEMENTARY_PRAYERS = [
  {
    key: "jumuah" as const,
    name: "Prière du Vendredi (Jumu'ah)",
    description: "Rappel le vendredi matin pour la grande prière et la lecture de la Sourate Al-Kahf",
    icon: Sparkles,
  },
  {
    key: "tahajjud" as const,
    name: "Prière de Nuit (Tahajjoud & Witr)",
    description: "Rappel au dernier tiers de la nuit avant l'aube pour les prières surérogatoires",
    icon: Moon,
  },
];

// Featured sounds from fr.assabile.com are imported via FEATURED_ASSABILE_OPTIONS

const LEAD_TIME_OPTIONS = [
  { minutes: 0, label: "À l'heure exacte" },
  { minutes: 5, label: "5 min avant" },
  { minutes: 10, label: "10 min avant" },
  { minutes: 15, label: "15 min avant" },
  { minutes: 30, label: "30 min avant" },
];

const DEFAULT_CHANNELS_METADATA: Record<
  string,
  { description: string; avatar: string; tag: string }
> = {
  "Towards Eternity": {
    description: "Séries & Dawa anglophone sous-titrée en français, réflexions spirituelles",
    avatar: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=120",
    tag: "Spiritualité",
  },
  "Récitations Haramain": {
    description: "Enregistrements complets des Tarawih, Tahajjoud et prières quotidiennes",
    avatar: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=120",
    tag: "Coran",
  },
  "NARRO DIN": {
    description: "Voyages immersifs, récits des Prophètes et miracles scientifiques du Coran",
    avatar: "https://i.ytimg.com/vi/GBxsINL9kWw/hqdefault.jpg",
    tag: "Prophètes & Science",
  },
  "NARRO": {
    description: "Documentaires immersifs, récits des Prophètes et histoire islamique authentique",
    avatar: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=120",
    tag: "Récits & Histoire",
  },
  "Yacine": {
    description: "Histoires captivantes, leçons de vie et méditations morales de la Sîra",
    avatar: "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=120",
    tag: "Rappels",
  },
  "Croyant Rationnel": {
    description: "Analyses théologiques, science, foi et réfutations intellectuelles",
    avatar: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=120",
    tag: "Science & Foi",
  },
};

export default function NotificationsSettingsSection({
  onShowToast,
}: NotificationsSettingsSectionProps) {
  const {
    preferences,
    loading,
    saving,
    source,
    browserPermission,
    togglePrayerReminderMaster,
    togglePrayer,
    setPrayerSound,
    setPrayerLeadTime,
    toggleChannelMaster,
    toggleChannelSubscription,
    setAllChannels,
    toggleNotificationType,
    requestBrowserPermission,
    sendTestNotification,
    refresh,
  } = useUserPreferences();

  const { allActiveChannels, customChannels } = useCreatorCatalog();

  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [isAssabileModalOpen, setIsAssabileModalOpen] = useState(false);
  const [exportingCurrentSound, setExportingCurrentSound] = useState(false);

  // Stop audio when unmounting
  useEffect(() => {
    return () => {
      stopAdhanAudio();
    };
  }, []);

  // Play real authentic Adhan preview from fr.assabile.com
  const handlePlaySoundPreview = (soundId: string) => {
    if (soundId === "silent") {
      onShowToast("Mode silencieux : aucune tonalité ne sera émise.");
      return;
    }

    if (playingAudio === soundId) {
      stopAdhanAudio();
      setPlayingAudio(null);
      return;
    }

    setPlayingAudio(soundId);
    playAdhanAudio(soundId, {
      onStart: () => setPlayingAudio(soundId),
      onEnded: () => setPlayingAudio(null),
      onError: () => {
        setPlayingAudio(null);
        onShowToast("Impossible de lire l'audio de la sonnerie.");
      },
    });
  };

  // Export / Download the currently active Adhan MP3 file
  const handleExportCurrentSound = async () => {
    const info = getAdhanSoundInfo(preferences.prayer_reminders.sound);
    if (!info.audioUrl) {
      onShowToast("Aucun fichier audio à exporter pour cette sonnerie.");
      return;
    }
    setExportingCurrentSound(true);
    try {
      const ok = await exportAdhanMp3({
        title: info.label,
        muezzin: info.adhan?.muezzin || "Muezzin",
        location: info.adhan?.location || "Islam",
        audioUrl: info.audioUrl,
      });
      if (ok) {
        onShowToast("Sonnerie d'Adhan téléchargée avec succès en MP3 !");
      } else {
        onShowToast("Téléchargement initié.");
      }
    } catch {
      onShowToast("Erreur lors de l'exportation du fichier audio.");
    } finally {
      setExportingCurrentSound(false);
    }
  };

  // Compile list of channels
  const channelsList = useMemo(() => {
    const list: Array<{
      name: string;
      description: string;
      avatar: string;
      tag: string;
    }> = [];

    // Add standard ones
    Object.keys(DEFAULT_CHANNELS_METADATA).forEach((name) => {
      list.push({
        name,
        ...DEFAULT_CHANNELS_METADATA[name],
      });
    });

    // Add any custom ones from creator
    if (customChannels && customChannels.length > 0) {
      customChannels.forEach((c) => {
        if (!list.some((existing) => existing.name.toLowerCase() === c.name.toLowerCase())) {
          list.push({
            name: c.name,
            description: c.description || "Chaîne SiratStream personnalisée",
            avatar:
              c.avatar ||
              "https://images.unsplash.com/photo-1542838132-92c53300491e?w=120",
            tag: "Créateur",
          });
        }
      });
    }

    return list;
  }, [customChannels]);

  const prayerReminders = preferences.prayer_reminders;
  const channelNotifs = preferences.channel_notifications;

  const subscribedCount = useMemo(() => {
    return channelsList.filter(
      (c) => channelNotifs.subscribedChannels[c.name] ?? true
    ).length;
  }, [channelsList, channelNotifs.subscribedChannels]);

  const handleTogglePrayer = async (
    key: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha" | "jumuah" | "tahajjud",
    name: string
  ) => {
    await togglePrayer(key);
    const nextState = !prayerReminders[key];
    onShowToast(
      nextState
        ? `Rappel activé pour ${name} (sauvegardé sur Supabase).`
        : `Rappel désactivé pour ${name}.`
    );
  };

  const handleToggleChannel = async (channelName: string) => {
    await toggleChannelSubscription(channelName);
    const isSubbed = channelNotifs.subscribedChannels[channelName] ?? true;
    onShowToast(
      !isSubbed
        ? `Abonné aux alertes de "${channelName}".`
        : `Désabonné des alertes de "${channelName}".`
    );
  };

  const handleToggleAllChannels = async (enable: boolean) => {
    await setAllChannels(
      enable,
      channelsList.map((c) => c.name)
    );
    onShowToast(
      enable
        ? "Toutes les chaînes ont été activées pour les notifications."
        : "Toutes les alertes de chaînes ont été désactivées."
    );
  };

  const handleRequestPermission = async () => {
    const res = await requestBrowserPermission();
    if (res === "granted") {
      onShowToast("Autorisation système accordée avec succès !");
      sendTestNotification(
        "SiratStream Notifications",
        "Les alertes de prière et de chaînes sont maintenant actives sur cet appareil !"
      );
    } else if (res === "denied") {
      onShowToast("Les notifications sont bloquées dans votre navigateur.");
    }
  };

  const handleTriggerTest = () => {
    const sent = sendTestNotification(
      "Rappel de Prière — Maghrib dans 5 min",
      "Il est temps de se préparer pour la prière du Maghrib. Qu'Allah accepte vos œuvres."
    );
    if (sent) {
      onShowToast("Notification de test envoyée au navigateur !");
    } else {
      onShowToast("Vérifiez que les notifications sont autorisées dans le navigateur.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Synchronization Status & Browser Permission Banner */}
      <GlassPanel
        variant="card"
        className="p-4 border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl liquid-glass-emerald border border-emerald-400/30 flex items-center justify-center text-emerald-300 flex-shrink-0">
            <BellRing size={20} className="text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white text-sm font-semibold">
                Centre de Préférences des Notifications
              </h3>
              {source === "supabase" ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Supabase user_preferences
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 text-[10px] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  Cache Local Synchronisé
                </span>
              )}
            </div>
            <p className="text-zinc-400 text-xs mt-0.5">
              Toutes vos préférences sont automatiquement synchronisées sur votre compte
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {browserPermission === "granted" ? (
            <button
              onClick={handleTriggerTest}
              className="px-3 py-1.5 liquid-glass hover:bg-white/15 text-emerald-300 border border-emerald-400/30 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
              title="Tester une notification push en direct"
            >
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>Tester une alerte</span>
            </button>
          ) : browserPermission === "denied" ? (
            <span className="px-3 py-1.5 liquid-glass text-rose-300 border border-rose-400/30 rounded-xl text-xs font-medium flex items-center gap-1.5">
              <AlertCircle size={13} className="text-rose-400" />
              <span>Bloqué par le navigateur</span>
            </span>
          ) : (
            <button
              onClick={handleRequestPermission}
              className="px-3 py-1.5 liquid-glass-emerald hover:bg-emerald-500/20 text-emerald-200 border border-emerald-300/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-md"
            >
              <Smartphone size={13} />
              <span>Autoriser les alertes push</span>
            </button>
          )}

          <button
            onClick={() => refresh()}
            className="p-1.5 liquid-glass hover:bg-white/15 text-zinc-300 hover:text-white rounded-xl border border-white/10 transition-all shadow-sm active:scale-95"
            title="Actualiser depuis Supabase"
          >
            <RotateCcw size={13} className={loading || saving ? "animate-spin text-emerald-400" : ""} />
          </button>
        </div>
      </GlassPanel>

      {/* ============================================================ */}
      {/* SECTION 1: RAPPELS DE PRIÈRE (SALÂT) */}
      {/* ============================================================ */}
      <GlassPanel variant="card" className="p-5 border border-white/15 space-y-5">
        {/* Header with Master Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-emerald-400" />
              <h3 className="text-white text-base font-bold">
                Rappels des Prières (Salât)
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 text-[10px] font-medium">
                Horaires automatiques
              </span>
            </div>
            <p className="text-zinc-400 text-xs mt-0.5">
              Soyez notifié avant chaque prière obligatoire et pour les prières spirituelles recommandées
            </p>
          </div>

          {/* Master Toggle Switch */}
          <button
            onClick={togglePrayerReminderMaster}
            disabled={saving}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 focus:outline-none ${
              prayerReminders.enabled
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                : "bg-white/10 border border-white/15"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                prayerReminders.enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* 5 Daily Prayers Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Les 5 Prières Quotidiennes Obligatoires
            </span>
            <span className="text-xs text-zinc-400">
              {PRAYER_ITEMS.filter((p) => prayerReminders[p.key]).length}/5 actives
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {PRAYER_ITEMS.map((prayer) => {
              const IconComp = prayer.icon;
              const isActive = prayerReminders.enabled && prayerReminders[prayer.key];

              return (
                <div
                  key={prayer.key}
                  className={`p-3.5 rounded-2xl liquid-glass border transition-all flex items-center justify-between gap-3 ${
                    isActive
                      ? "border-emerald-500/40 bg-emerald-950/15 shadow-[0_0_12px_rgba(16,185,129,0.06)]"
                      : "border-white/10 opacity-75 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border bg-gradient-to-br ${prayer.color}`}
                    >
                      <IconComp size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white font-bold text-sm truncate">
                          {prayer.name}
                        </span>
                        <span className="text-zinc-400 text-[11px]">
                          ({prayer.period})
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {prayer.timeDescription}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Button */}
                  <button
                    onClick={() => handleTogglePrayer(prayer.key, prayer.name)}
                    disabled={!prayerReminders.enabled}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                      isActive
                        ? "bg-emerald-500 shadow-sm"
                        : "bg-white/10 border border-white/15"
                    } ${!prayerReminders.enabled ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        isActive ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Complementary & Special Prayers */}
        <div className="space-y-2.5 pt-2">
          <span className="text-white text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Prières Particulières & Recommandées
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {COMPLEMENTARY_PRAYERS.map((item) => {
              const IconComp = item.icon;
              const isActive = prayerReminders.enabled && prayerReminders[item.key];

              return (
                <div
                  key={item.key}
                  className={`p-3.5 rounded-2xl liquid-glass border transition-all flex items-center justify-between gap-3 ${
                    isActive
                      ? "border-emerald-500/40 bg-emerald-950/15"
                      : "border-white/10 opacity-75 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl liquid-glass-subtle border border-white/10 flex items-center justify-center text-emerald-300 flex-shrink-0">
                      <IconComp size={18} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-white font-bold text-xs truncate block">
                        {item.name}
                      </span>
                      <p className="text-[11px] text-zinc-400 line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleTogglePrayer(item.key, item.name)}
                    disabled={!prayerReminders.enabled}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                      isActive
                        ? "bg-emerald-500 shadow-sm"
                        : "bg-white/10 border border-white/15"
                    } ${!prayerReminders.enabled ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        isActive ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Prayer Reminder Tuning: Lead Time & Sound */}
        <div className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Timing Before Prayer */}
          <div className="space-y-2">
            <label className="text-zinc-300 text-xs font-semibold flex items-center gap-1.5">
              <Clock size={13} className="text-emerald-400" />
              <span>Moment de la notification :</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {LEAD_TIME_OPTIONS.map((opt) => (
                <button
                  key={opt.minutes}
                  onClick={async () => {
                    await setPrayerLeadTime(opt.minutes);
                    onShowToast(`Rappel réglé : ${opt.label}`);
                  }}
                  disabled={!prayerReminders.enabled}
                  className={`py-1.5 px-2 rounded-xl text-xs font-semibold transition-all text-center border ${
                    prayerReminders.leadTimeMinutes === opt.minutes
                      ? "liquid-glass-emerald text-emerald-200 border-emerald-400/40 shadow-sm"
                      : "liquid-glass text-zinc-400 hover:text-white border-white/10"
                  } ${!prayerReminders.enabled ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sound & Real Adhan Selector with fr.assabile.com integration */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-zinc-300 text-xs font-semibold flex items-center gap-1.5">
                <Volume2 size={13} className="text-emerald-400" />
                <span>Sonnerie du rappel d'Adhan :</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30">
                  fr.assabile.com
                </span>
              </label>

              <div className="flex items-center gap-2">
                {prayerReminders.sound !== "silent" && (
                  <>
                    <button
                      onClick={() => handlePlaySoundPreview(prayerReminders.sound)}
                      disabled={!prayerReminders.enabled}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border flex items-center gap-1.5 font-semibold transition-all ${
                        playingAudio === prayerReminders.sound
                          ? "bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/30 animate-pulse"
                          : "bg-white/10 hover:bg-white/20 text-emerald-400 border-white/10"
                      } ${!prayerReminders.enabled ? "opacity-40 cursor-not-allowed" : ""}`}
                      title={playingAudio ? "Arrêter la sonnerie" : "Écouter la sonnerie réelle"}
                    >
                      {playingAudio === prayerReminders.sound ? (
                        <>
                          <Square size={10} />
                          <span>Arrêter</span>
                        </>
                      ) : (
                        <>
                          <Play size={10} />
                          <span>Écouter l'Adhan</span>
                        </>
                      )}
                    </button>

                    {prayerReminders.sound !== "beep" && (
                      <button
                        onClick={handleExportCurrentSound}
                        disabled={!prayerReminders.enabled || exportingCurrentSound}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white border-white/10 flex items-center gap-1.5 font-semibold transition-colors ${
                          !prayerReminders.enabled ? "opacity-40 cursor-not-allowed" : ""
                        }`}
                        title="Télécharger l'Adhan en MP3 pour votre alarme de téléphone"
                      >
                        <Download size={11} className={exportingCurrentSound ? "animate-bounce" : ""} />
                        <span>{exportingCurrentSound ? "Export..." : "Exporter MP3"}</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Active Adhan info card */}
            {(() => {
              const info = getAdhanSoundInfo(prayerReminders.sound);
              return (
                <div className="p-3 rounded-xl bg-zinc-900/90 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                      <Music size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-xs font-semibold truncate">
                        {info.label}
                      </p>
                      <p className="text-zinc-400 text-[11px] truncate">
                        {info.desc}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsAssabileModalOpen(true)}
                    disabled={!prayerReminders.enabled}
                    className="self-start sm:self-center px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-emerald-200 text-[11px] font-semibold border border-emerald-500/30 flex items-center gap-1.5 transition-colors disabled:opacity-40 whitespace-nowrap"
                  >
                    <Sparkles size={12} className="text-emerald-400" />
                    <span>Explorer & Exporter (259 Adhans)</span>
                  </button>
                </div>
              );
            })()}

            {/* Quick dropdown select */}
            <div className="space-y-1">
              <label className="text-zinc-400 text-[11px]">
                Choix rapide ou sélection personnalisée :
              </label>
              <select
                value={prayerReminders.sound}
                onChange={async (e) => {
                  const val = e.target.value;
                  if (val === "__open_modal__") {
                    setIsAssabileModalOpen(true);
                    return;
                  }
                  await setPrayerSound(val);
                  onShowToast("Sonnerie du rappel mise à jour.");
                  if (val !== "silent") handlePlaySoundPreview(val);
                }}
                disabled={!prayerReminders.enabled}
                className="w-full px-3 py-2 rounded-xl liquid-glass border border-white/15 text-white text-xs font-medium focus:outline-none focus:border-emerald-400/50 bg-zinc-900/80 cursor-pointer"
              >
                {FEATURED_ASSABILE_OPTIONS.map((s) => (
                  <option key={s.id} value={s.id} className="bg-zinc-900 text-white">
                    {s.label} ({s.desc})
                  </option>
                ))}
                {/* If selected sound is not in featured, include it */}
                {!FEATURED_ASSABILE_OPTIONS.some((s) => s.id === prayerReminders.sound) && (
                  <option value={prayerReminders.sound} className="bg-zinc-900 text-emerald-400">
                    ★ {getAdhanSoundInfo(prayerReminders.sound).label} (Actif)
                  </option>
                )}
                <option value="__open_modal__" className="bg-zinc-900 text-amber-300 font-semibold">
                  🔍 + Parcourir tous les 259 adhans (fr.assabile.com)...
                </option>
              </select>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* ============================================================ */}
      {/* SECTION 2: ABONNEMENTS AUX NOTIFICATIONS PAR CHAÎNE */}
      {/* ============================================================ */}
      <GlassPanel variant="card" className="p-5 border border-white/15 space-y-5">
        {/* Header with Master Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <Radio size={18} className="text-emerald-400" />
              <h3 className="text-white text-base font-bold">
                Abonnements aux Notifications par Chaîne
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-semibold">
                {subscribedCount}/{channelsList.length} chaînes
              </span>
            </div>
            <p className="text-zinc-400 text-xs mt-0.5">
              Choisissez précisément les chaînes dont vous souhaitez recevoir les nouveaux épisodes et directs
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleToggleAllChannels(true)}
                disabled={!channelNotifs.enabled}
                className="px-2.5 py-1 rounded-lg liquid-glass hover:bg-white/15 text-zinc-300 hover:text-white text-[11px] font-semibold border border-white/10 transition-colors disabled:opacity-40"
              >
                Tout activer
              </button>
              <button
                onClick={() => handleToggleAllChannels(false)}
                disabled={!channelNotifs.enabled}
                className="px-2.5 py-1 rounded-lg liquid-glass hover:bg-white/15 text-zinc-400 hover:text-rose-300 text-[11px] font-semibold border border-white/10 transition-colors disabled:opacity-40"
              >
                Tout couper
              </button>
            </div>

            {/* Master Toggle Switch */}
            <button
              onClick={toggleChannelMaster}
              disabled={saving}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 focus:outline-none ${
                channelNotifs.enabled
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                  : "bg-white/10 border border-white/15"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                  channelNotifs.enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Content Type Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div
            onClick={() => toggleNotificationType("notifyNewEpisodes")}
            className={`p-3 rounded-2xl liquid-glass border cursor-pointer select-none transition-all flex items-center justify-between gap-2 ${
              channelNotifs.notifyNewEpisodes && channelNotifs.enabled
                ? "border-emerald-500/30 bg-emerald-950/10"
                : "border-white/10 opacity-70"
            }`}
          >
            <div>
              <p className="text-white text-xs font-bold">Nouveaux Épisodes</p>
              <p className="text-[11px] text-zinc-400">Sorties quotidiennes & séries</p>
            </div>
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                channelNotifs.notifyNewEpisodes && channelNotifs.enabled
                  ? "bg-emerald-500 text-zinc-950 font-black"
                  : "border border-white/20 text-transparent"
              }`}
            >
              ✓
            </span>
          </div>

          <div
            onClick={() => toggleNotificationType("notifyLiveStreams")}
            className={`p-3 rounded-2xl liquid-glass border cursor-pointer select-none transition-all flex items-center justify-between gap-2 ${
              channelNotifs.notifyLiveStreams && channelNotifs.enabled
                ? "border-emerald-500/30 bg-emerald-950/10"
                : "border-white/10 opacity-70"
            }`}
          >
            <div>
              <p className="text-white text-xs font-bold">Diffusions Directes</p>
              <p className="text-[11px] text-zinc-400">Tarawih live & événements</p>
            </div>
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                channelNotifs.notifyLiveStreams && channelNotifs.enabled
                  ? "bg-emerald-500 text-zinc-950 font-black"
                  : "border border-white/20 text-transparent"
              }`}
            >
              ✓
            </span>
          </div>

          <div
            onClick={() => toggleNotificationType("notifyAnnouncements")}
            className={`p-3 rounded-2xl liquid-glass border cursor-pointer select-none transition-all flex items-center justify-between gap-2 ${
              channelNotifs.notifyAnnouncements && channelNotifs.enabled
                ? "border-emerald-500/30 bg-emerald-950/10"
                : "border-white/10 opacity-70"
            }`}
          >
            <div>
              <p className="text-white text-xs font-bold">Annonces & Mises à jour</p>
              <p className="text-[11px] text-zinc-400">Nouveautés & fonctionnalités</p>
            </div>
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                channelNotifs.notifyAnnouncements && channelNotifs.enabled
                  ? "bg-emerald-500 text-zinc-950 font-black"
                  : "border border-white/20 text-transparent"
              }`}
            >
              ✓
            </span>
          </div>
        </div>

        {/* Channel Toggles List */}
        <div className="space-y-2.5">
          <span className="text-white text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Toutes les chaînes actives
          </span>

          <div className="space-y-2">
            {channelsList.map((channel) => {
              const isSubscribed =
                channelNotifs.enabled &&
                (channelNotifs.subscribedChannels[channel.name] ?? true);

              return (
                <div
                  key={channel.name}
                  className={`p-3.5 rounded-2xl liquid-glass border transition-all flex items-center justify-between gap-3 ${
                    isSubscribed
                      ? "border-emerald-500/30 bg-emerald-950/10 shadow-[0_0_12px_rgba(16,185,129,0.05)]"
                      : "border-white/10 opacity-70 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={channel.avatar}
                      alt={channel.name}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-xl object-cover border border-white/15 flex-shrink-0 shadow-sm"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-sm truncate">
                          {channel.name}
                        </span>
                        <span className="px-2 py-0.2 rounded-md bg-white/5 border border-white/10 text-zinc-300 text-[10px] font-medium">
                          {channel.tag}
                        </span>
                      </div>
                      <p className="text-zinc-400 text-xs line-clamp-1 mt-0.5">
                        {channel.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span
                      className={`text-xs font-semibold hidden sm:inline-block ${
                        isSubscribed ? "text-emerald-300" : "text-zinc-500"
                      }`}
                    >
                      {isSubscribed ? "Abonné" : "Muet"}
                    </span>

                    <button
                      onClick={() => handleToggleChannel(channel.name)}
                      disabled={!channelNotifs.enabled}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                        isSubscribed
                          ? "bg-emerald-500 shadow-sm"
                          : "bg-white/10 border border-white/15"
                      } ${!channelNotifs.enabled ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          isSubscribed ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </GlassPanel>

      {/* Info & Privacy Note */}
      <div className="p-4 rounded-2xl liquid-glass border border-white/10 flex items-start gap-3 text-xs text-zinc-400">
        <Shield size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
        <p>
          Vos préférences de notification sont stockées dans Supabase (table{" "}
          <code className="px-1.5 py-0.5 rounded bg-white/10 text-emerald-300 font-mono text-[11px]">
            user_preferences
          </code>
          ) et sont synchronisées entre tous vos appareils connectés. Aucune notification non sollicitée ou publicitaire n'est envoyée.
        </p>
      </div>

      {/* Assabile Adhan Modal (259 authentic Adhans) */}
      <AssabileAdhanModal
        isOpen={isAssabileModalOpen}
        onClose={() => setIsAssabileModalOpen(false)}
        selectedSoundId={prayerReminders.sound}
        onSelectSound={async (soundId) => {
          await setPrayerSound(soundId);
          handlePlaySoundPreview(soundId);
        }}
        onShowToast={onShowToast}
      />
    </div>
  );
}
