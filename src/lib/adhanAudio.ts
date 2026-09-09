import { ASSABILE_ADHANS, AssabileAdhan } from "@/data/assabileAdhans";

let currentAudio: HTMLAudioElement | null = null;
let currentPlayingId: string | null = null;
let onStopCallback: (() => void) | null = null;

// Map legacy IDs to real authentic assabile adhans
export const LEGACY_SOUND_MAPPING: Record<string, { audioUrl: string; label: string; desc: string }> = {
  adhan_makkah: {
    audioUrl: "https://media.assabile.com/assabile/adhan_3435370/54944191e2e2.mp3",
    label: "Adhan Al-Haram (La Mecque) - Ali Ibn Ahmed Mala",
    desc: "Mélodie majestueuse de La Mecque (fr.assabile.com)",
  },
  adhan_madinah: {
    audioUrl: "https://media.assabile.com/assabile/adhan_3435370/b30ca9a3e115.mp3",
    label: "Adhan An-Nabawi (Médine) - Al-Haram Al-Madani",
    desc: "Mélodie douce et apaisante de Médine (fr.assabile.com)",
  },
};

/**
 * Find sound metadata by ID (handles legacy, beep, silent, and assabile IDs)
 */
export function getAdhanSoundInfo(soundId: string): {
  id: string;
  label: string;
  desc: string;
  audioUrl?: string;
  adhan?: AssabileAdhan;
} {
  if (soundId === "silent") {
    return {
      id: "silent",
      label: "Silencieux (Notification visuelle)",
      desc: "Bannière sans tonalité sonore",
    };
  }

  if (soundId === "beep") {
    return {
      id: "beep",
      label: "Bip discret",
      desc: "Tonalité brève électronique",
    };
  }

  if (LEGACY_SOUND_MAPPING[soundId]) {
    const legacy = LEGACY_SOUND_MAPPING[soundId];
    return {
      id: soundId,
      label: legacy.label,
      desc: legacy.desc,
      audioUrl: legacy.audioUrl,
    };
  }

  const found = ASSABILE_ADHANS.find((a) => a.id === soundId);
  if (found) {
    return {
      id: found.id,
      label: `${found.muezzin} - ${found.title} (${found.location})`,
      desc: `${found.location} · Durée : ${found.duration} (fr.assabile.com)`,
      audioUrl: found.audioUrl,
      adhan: found,
    };
  }

  // Fallback
  return {
    id: soundId,
    label: "Adhan Al-Haram (La Mecque)",
    desc: "Mélodie majestueuse de La Mecque",
    audioUrl: LEGACY_SOUND_MAPPING.adhan_makkah.audioUrl,
  };
}

/**
 * Top curated Assabile adhans for quick dropdown selection
 */
export const FEATURED_ASSABILE_OPTIONS: { id: string; label: string; desc: string }[] = [
  {
    id: "adhan_makkah",
    label: "La Mecque - Sheikh Ali Ibn Ahmed Mala",
    desc: "Adhan officiel Al-Haram Al-Makki (fr.assabile.com)",
  },
  {
    id: "adhan_madinah",
    label: "Médine - Al-Haram Al-Madani",
    desc: "Adhan noble Al-Masjid An-Nabawi (fr.assabile.com)",
  },
  {
    id: "assabile_768559b47c2e",
    label: "Al-Qods - Masjid Al-Aqsa (Palestine)",
    desc: "NurDin Hamza Al Maghriby (fr.assabile.com)",
  },
  {
    id: "assabile_b45e93f1efb3",
    label: "Koweït - Sheikh Mishary Rashid Alafasy",
    desc: "Récitation mélodieuse et poignante (fr.assabile.com)",
  },
  {
    id: "assabile_1125f640d83b",
    label: "Adhan Al-Fajr - Sheikh Abdelbasset Abdessamad",
    desc: "Enregistrement légendaire d'Égypte (fr.assabile.com)",
  },
  {
    id: "assabile_518b4e081437",
    label: "Adhan Al-Fajr - Al-Haram Al-Makki (La Mecque)",
    desc: "L'appel de l'aube à La Mecque (fr.assabile.com)",
  },
  {
    id: "assabile_efc564e3b1d2",
    label: "Adhan Al-Fajr - Al-Haram Al-Madani (Médine)",
    desc: "L'appel de l'aube à Médine (fr.assabile.com)",
  },
  {
    id: "assabile_0bf83c80b583",
    label: "Algérie - Rabih Ibn Darah Al Jazairi",
    desc: "Adane El Jazair mélodieux (fr.assabile.com)",
  },
  {
    id: "assabile_3073e5ff27a5",
    label: "Turquie - Istanbul (Adhan Maqam)",
    desc: "Adhan ottoman traditionnel (fr.assabile.com)",
  },
  {
    id: "assabile_c1dea6614fdb",
    label: "Dubaï - Émirats Arabes Unis",
    desc: "Adhan des grandes mosquées de Dubaï (fr.assabile.com)",
  },
  {
    id: "beep",
    label: "Bip discret",
    desc: "Tonalité brève et non intrusive",
  },
  {
    id: "silent",
    label: "Silencieux (Notification visuelle)",
    desc: "Bannière sans son",
  },
];

/**
 * Play an Adhan audio preview or stop current one
 */
export function playAdhanAudio(
  soundId: string,
  callbacks?: {
    onStart?: () => void;
    onEnded?: () => void;
    onError?: (err: unknown) => void;
  }
): HTMLAudioElement | null {
  // Stop existing audio if playing
  stopAdhanAudio();

  if (soundId === "silent") {
    callbacks?.onEnded?.();
    return null;
  }

  if (soundId === "beep") {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
      setTimeout(() => callbacks?.onEnded?.(), 400);
      return null;
    } catch {
      callbacks?.onEnded?.();
      return null;
    }
  }

  const info = getAdhanSoundInfo(soundId);
  const rawUrl = info.audioUrl || LEGACY_SOUND_MAPPING.adhan_makkah.audioUrl;
  const streamUrl = getAdhanStreamUrl(rawUrl);

  try {
    const audio = new Audio();
    audio.src = streamUrl;
    audio.preload = "auto";
    currentAudio = audio;
    currentPlayingId = soundId;
    onStopCallback = callbacks?.onEnded || null;

    audio.onplay = () => {
      callbacks?.onStart?.();
    };

    audio.onended = () => {
      currentAudio = null;
      currentPlayingId = null;
      callbacks?.onEnded?.();
    };

    audio.onerror = (e) => {
      // If proxied failed, try rawUrl fallback
      if (audio.src !== rawUrl) {
        console.warn("Proxied stream failed, trying raw URL fallback:", e);
        audio.src = rawUrl;
        audio.play().catch((err) => {
          currentAudio = null;
          currentPlayingId = null;
          callbacks?.onError?.(err);
          callbacks?.onEnded?.();
        });
        return;
      }
      currentAudio = null;
      currentPlayingId = null;
      callbacks?.onError?.(e);
      callbacks?.onEnded?.();
    };

    audio.play().catch((err) => {
      console.warn("Auto-play restriction or network issue:", err);
      callbacks?.onError?.(err);
      callbacks?.onEnded?.();
    });

    return audio;
  } catch (err) {
    callbacks?.onError?.(err);
    callbacks?.onEnded?.();
    return null;
  }
}

/**
 * Resolves an audio stream URL, using our proxy route if it's on media.assabile.com
 * to guarantee CORS compliance, range header seeking, and reliable playback across all devices.
 */
export function getAdhanStreamUrl(rawUrl: string): string {
  if (!rawUrl) return "";
  if (rawUrl.includes("assabile.com")) {
    return `/api/adhan/stream?url=${encodeURIComponent(rawUrl)}`;
  }
  return rawUrl;
}

/**
 * Returns direct download URL with attachment Content-Disposition header
 */
export function getAdhanDownloadUrl(rawUrl: string, filename: string): string {
  if (!rawUrl) return "";
  return `/api/adhan/download?url=${encodeURIComponent(rawUrl)}&filename=${encodeURIComponent(filename)}`;
}

/**
 * Stop currently playing Adhan audio
 */
export function stopAdhanAudio(): void {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio.src = "";
    } catch {
      // Ignore
    }
    currentAudio = null;
  }
  currentPlayingId = null;
  if (onStopCallback) {
    const cb = onStopCallback;
    onStopCallback = null;
    cb();
  }
}

export function getCurrentPlayingAdhanId(): string | null {
  return currentPlayingId;
}

export function getCurrentAudioElement(): HTMLAudioElement | null {
  return currentAudio;
}

/**
 * Export / Download an Adhan MP3 file locally to device
 */
export async function exportAdhanMp3(
  adhan: AssabileAdhan | { title: string; muezzin: string; location: string; audioUrl: string },
  onProgress?: (percent: number) => void
): Promise<boolean> {
  const sanitize = (str: string) =>
    str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 50);

  const cleanMuezzin = sanitize(adhan.muezzin || "Muezzin");
  const cleanTitle = sanitize(adhan.title || "Adhan");
  const cleanLocation = sanitize(adhan.location || "Islam");
  const filename = `Adhan_${cleanMuezzin}_${cleanLocation}_${cleanTitle}_Assabile.mp3`;

  const downloadApiUrl = getAdhanDownloadUrl(adhan.audioUrl, filename);
  const streamApiUrl = getAdhanStreamUrl(adhan.audioUrl);

  try {
    onProgress?.(15);
    // Method 1: Fetch via proxy and save Blob (best for mobile, webview, and direct user file save)
    const response = await fetch(streamApiUrl);
    if (response.ok) {
      onProgress?.(60);
      const blob = await response.blob();
      onProgress?.(85);

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
      onProgress?.(100);
      return true;
    }
  } catch (fetchErr) {
    console.warn("Blob fetch failed, falling back to direct server download URL:", fetchErr);
  }

  // Method 2: Trigger direct server download route
  try {
    onProgress?.(70);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = downloadApiUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onProgress?.(100);
    return true;
  } catch {
    // Method 3: window.open as absolute last resort
    window.open(downloadApiUrl, "_blank");
    return false;
  }
}
