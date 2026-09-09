import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock3, MapPin, Navigation, X, Volume2, Download } from "lucide-react";
import { useViewerProfile } from "@/hooks/useViewerProfile";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import AssabileAdhanModal from "./AssabileAdhanModal";

type PrayerTimesProps = {
  compact?: boolean;
  onClose?: () => void;
};

type PrayerName = "Fajr" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";
type Prayer = { name: PrayerName; label: string; time: string };
type Location = { lat: number; lng: number; city: string };

const PRAYERS: { name: PrayerName; label: string }[] = [
  { name: "Fajr", label: "Fajr (Aube)" },
  { name: "Dhuhr", label: "Dhohr (Midi)" },
  { name: "Asr", label: "Asr (Après-midi)" },
  { name: "Maghrib", label: "Maghrib (Coucher du soleil)" },
  { name: "Isha", label: "Icha (Nuit)" },
];

function todayString() {
  const date = new Date();
  return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
}

function timeToDate(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

function formatCountdown(seconds: number) {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainingSeconds = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export default function PrayerTimes({ compact = false, onClose }: PrayerTimesProps) {
  const { activeProfile, updateProfile } = useViewerProfile();
  const { preferences, setPrayerSound } = useUserPreferences();
  const [adhanModalOpen, setAdhanModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const savedLocation = activeProfile?.prayer_location as Location | null | undefined;
  const [location, setLocation] = useState<Location | null>(savedLocation ?? null);
  const [cityInput, setCityInput] = useState(savedLocation?.city ?? "Paris");
  const [prayers, setPrayers] = useState<Prayer[]>([
    { name: "Fajr", label: "Fajr (Aube)", time: "05:42" },
    { name: "Dhuhr", label: "Dhohr (Midi)", time: "13:48" },
    { name: "Asr", label: "Asr (Après-midi)", time: "17:42" },
    { name: "Maghrib", label: "Maghrib (Coucher du soleil)", time: "20:54" },
    { name: "Isha", label: "Icha (Nuit)", time: "22:30" },
  ]);
  const [nextPrayer, setNextPrayer] = useState<Prayer | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsCity, setNeedsCity] = useState(!savedLocation);

  const loadTimings = useCallback(async (nextLocation: Location) => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = `https://api.aladhan.com/v1/timings/${Math.floor(Date.now() / 1000)}?latitude=${nextLocation.lat}&longitude=${nextLocation.lng}&method=2`;
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error("Impossible de récupérer les horaires.");
      const payload = await response.json();
      const timings = payload.data?.timings as Record<string, string> | undefined;
      if (!timings) throw new Error("Horaires indisponibles.");
      const nextPrayers = PRAYERS.map(({ name, label }) => ({
        name,
        label,
        time: timings[name]?.split(" ")[0] || "00:00",
      }));
      setPrayers(nextPrayers);
      setLocation(nextLocation);
      setNeedsCity(false);
      if (activeProfile) {
        await updateProfile(activeProfile.id, { prayerLocation: nextLocation });
      }
    } catch {
      // Keep default timings as fallback
    } finally {
      setLoading(false);
    }
  }, [activeProfile?.id, updateProfile]);

  useEffect(() => {
    if (savedLocation) {
      setLocation(savedLocation);
      setCityInput(savedLocation.city);
      loadTimings(savedLocation);
      return;
    }
    if (!navigator.geolocation) {
      setNeedsCity(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        loadTimings({ lat: coords.latitude, lng: coords.longitude, city: "Position actuelle" });
      },
      () => setNeedsCity(true),
      { enableHighAccuracy: false, timeout: 6000 }
    );
  }, [loadTimings, savedLocation]);

  useEffect(() => {
    const updateNext = () => {
      if (prayers.length === 0) return;
      const now = new Date();
      const upcoming = prayers.find((prayer) => timeToDate(prayer.time) > now);
      const selected = upcoming ?? prayers[0];
      const target = timeToDate(selected.time);
      if (!upcoming) target.setDate(target.getDate() + 1);
      setNextPrayer(selected);
      setCountdown(Math.floor((target.getTime() - now.getTime()) / 1000));
    };
    updateNext();
    const timer = setInterval(updateNext, 1000);
    return () => clearInterval(timer);
  }, [prayers]);

  const locationLabel = useMemo(() => location?.city ?? "France (Défaut)", [location]);

  async function useCity() {
    if (!cityInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const endpoint = `https://api.aladhan.com/v1/timingsByCity/${todayString()}?city=${encodeURIComponent(cityInput.trim())}&country=France&method=2`;
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error();
      const payload = await response.json();
      const meta = payload.data?.meta;
      const lat = Number(meta?.latitude);
      const lng = Number(meta?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error();
      await loadTimings({ lat, lng, city: cityInput.trim() });
    } catch {
      setLoading(false);
      setError("Ville introuvable. Essayez avec le nom d'une grande ville.");
    }
  }

  function requestLocation() {
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => loadTimings({ lat: coords.latitude, lng: coords.longitude, city: "Position GPS" }),
      () => setNeedsCity(true)
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 sm:gap-4 rounded-2xl liquid-glass px-4 py-3 h-full border border-emerald-300/30 transition-all hover:bg-emerald-400/15">
        <Clock3 size={18} className="text-emerald-400 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          {nextPrayer ? (
            <p className="text-xs sm:text-sm text-zinc-200 truncate">
              Prochaine prière : <strong className="text-white font-semibold">{nextPrayer.label}</strong> à {nextPrayer.time}
              <span className="ml-2 font-mono font-bold bg-emerald-400/15 border border-emerald-300/30 text-emerald-200 px-2 py-0.5 rounded-full text-[11px] shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)]">
                {formatCountdown(countdown)}
              </span>
            </p>
          ) : (
            <p className="text-xs sm:text-sm text-zinc-300">Horaires de prière configurés.</p>
          )}
        </div>
        {location && (
          <span className="flex-shrink-0 hidden sm:flex items-center gap-1 text-[11px] text-emerald-200 bg-emerald-400/15 border border-emerald-300/30 px-2 py-0.5 rounded-full shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)]">
            <MapPin size={11} className="text-emerald-400" />
            {locationLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950 text-white">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-screen-2xl items-center gap-4 px-6 py-4 lg:px-10">
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700" aria-label="Fermer les horaires">
            <X size={17} />
          </button>
          <Clock3 className="text-zinc-400" size={20} />
          <h1 className="text-xl font-bold">Horaires de prière musulmane</h1>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-8">
        <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-lg">
          <p className="mb-3 text-sm text-zinc-300">Indiquez votre ville ou autorisez la géolocalisation pour des horaires exacts :</p>
          <div className="flex gap-2">
            <input
              value={cityInput}
              onChange={(event) => setCityInput(event.target.value)}
              placeholder="Paris, Lyon, Marseille, Alger, Casablanca..."
              className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white outline-none focus:border-zinc-500 text-sm"
            />
            <button onClick={useCity} className="rounded-lg bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-zinc-200 transition-colors">
              Rechercher
            </button>
          </div>
          <button onClick={requestLocation} className="mt-3 flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors">
            <Navigation size={13} />
            Utiliser ma position GPS
          </button>
        </section>

        {error && <p className="mb-4 rounded-lg border border-red-800/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</p>}
        
        <div className="mb-5 flex items-center justify-between">
          <p className="flex items-center gap-2 text-zinc-400 text-sm">
            <MapPin size={15} className="text-zinc-400" />
            Ville actuelle : <strong className="text-white">{locationLabel}</strong>
          </p>
          {loading && <span className="text-xs text-zinc-500">Mise à jour...</span>}
        </div>

        {nextPrayer && (
          <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 text-center shadow-xl">
            <p className="text-xs uppercase tracking-widest text-zinc-400 font-semibold">Prochaine prière</p>
            <p className="mt-2 text-3xl sm:text-4xl font-black text-white">{nextPrayer.label} · {nextPrayer.time}</p>
            <p className="mt-3 font-mono text-2xl font-bold text-zinc-200">{formatCountdown(countdown)}</p>
          </section>
        )}

        <div className="grid gap-3">
          {prayers.map((prayer) => (
            <div
              key={prayer.name}
              className={`flex items-center justify-between rounded-xl border p-4 transition-colors ${
                nextPrayer?.name === prayer.name
                  ? "border-zinc-500 bg-zinc-800/80"
                  : "border-zinc-800 bg-zinc-900/80"
              }`}
            >
              <span className="font-semibold text-sm sm:text-base">{prayer.label}</span>
              <span className="font-mono text-lg font-bold text-zinc-200">{prayer.time}</span>
            </div>
          ))}
        </div>

        {/* Section Sonneries d'Adhan (fr.assabile.com) */}
        <div className="mt-5 p-4 rounded-xl border border-zinc-800 bg-zinc-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <Volume2 size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-white text-sm font-semibold">Sonneries d'Adhan</p>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30">
                  fr.assabile.com
                </span>
              </div>
              <p className="text-zinc-400 text-xs mt-0.5">
                259 appels à la prière authentiques à écouter, définir en rappel et exporter en MP3
              </p>
            </div>
          </div>
          <button
            onClick={() => setAdhanModalOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-center shadow-md shadow-emerald-500/20 whitespace-nowrap"
          >
            <Download size={13} />
            <span>Explorer & Exporter</span>
          </button>
        </div>

        {toastMsg && (
          <div className="mt-3 p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 text-xs text-center font-medium">
            {toastMsg}
          </div>
        )}

        <p className="mt-6 text-xs text-zinc-500 text-center">
          Méthode de calcul : Ligue Islamique Mondiale (MWL / UOIF).
        </p>
      </main>

      <AssabileAdhanModal
        isOpen={adhanModalOpen}
        onClose={() => setAdhanModalOpen(false)}
        selectedSoundId={preferences.prayer_reminders.sound}
        onSelectSound={async (soundId, title) => {
          await setPrayerSound(soundId);
          setToastMsg(`Sonnerie configurée : ${title}`);
          setTimeout(() => setToastMsg(null), 4000);
        }}
        onShowToast={(msg) => {
          setToastMsg(msg);
          setTimeout(() => setToastMsg(null), 4000);
        }}
      />
    </div>
  );
}
