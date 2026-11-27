/**
 * Adaptive Connection Quality Engine
 * Évalue en continu la qualité réelle de la connexion (API réseau + mesure de débit réel + fluidité de lecture)
 * et force automatiquement chaque lecteur YouTube sur la résolution adaptée :
 * - Connexion mauvaise / instable -> 240p / 360p / 480p (lecture fluide sans coupure)
 * - Connexion moyenne -> 720p HD
 * - Bonne connexion -> 1080p Full HD / 1440p 2K
 * - Très bonne connexion -> jusqu'à 4K (hd2160 / highres)
 * Entièrement silencieux : aucun bouton ni texte affiché.
 */

export type ConnectionSpeedTier = "excellent" | "fast" | "medium" | "low" | "very_low";

export const QUALITY_LADDER = [
  "small",   // 240p
  "medium",  // 360p
  "large",   // 480p
  "hd720",   // 720p HD
  "hd1080",  // 1080p Full HD
  "hd1440",  // 1440p 2K QHD
  "hd2160",  // 4K Ultra HD
] as const;

export type AdaptiveYouTubeQuality = (typeof QUALITY_LADDER)[number];

export interface NetworkSpeedSample {
  tier: ConnectionSpeedTier;
  downlinkMbps: number;
  effectiveType: string;
  rttMs: number;
  suggestedQuality: AdaptiveYouTubeQuality;
  measuredAt: number;
}

// Cache de mesure réseau réelle (évite de re-sonder trop souvent et reste valable sur Safari/Firefox)
let cachedMeasuredMbps: number | null = null;
let cachedMeasuredRttMs: number | null = null;
let cachedMeasuredAt = 0;
let inflightProbePromise: Promise<NetworkSpeedSample> | null = null;

// Index d'ajustement dynamique en cas de saccades/buffering en cours de lecture (0 = pas de réduction)
let activeStallStepDown = 0;
let lastStallStepDownAt = 0;

const PROBE_TTL_MS = 45_000;
const STALL_RECOVERY_MS = 45_000;

export function getQualityForDownlink(
  downlinkMbps: number,
  effectiveType: string,
  rttMs: number,
  saveData = false
): {
  tier: ConnectionSpeedTier;
  quality: AdaptiveYouTubeQuality;
} {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { tier: "very_low", quality: "small" };
  }

  if (saveData) {
    return { tier: "low", quality: "medium" };
  }

  const eff = (effectiveType || "").toLowerCase();

  // Réseaux très faibles ou latence critique
  if (eff === "slow-2g" || downlinkMbps < 0.7 || rttMs >= 800) {
    return { tier: "very_low", quality: "small" }; // 240p
  }

  if (eff === "2g" || downlinkMbps < 1.8 || rttMs >= 450) {
    return { tier: "low", quality: "medium" }; // 360p
  }

  if (eff === "3g" || downlinkMbps < 4.0 || rttMs >= 250) {
    return { tier: "medium", quality: "large" }; // 480p
  }

  if (downlinkMbps < 8.5 || rttMs >= 160) {
    return { tier: "medium", quality: "hd720" }; // 720p
  }

  if (downlinkMbps < 18) {
    return { tier: "fast", quality: "hd1080" }; // 1080p Full HD
  }

  if (downlinkMbps < 35) {
    return { tier: "fast", quality: "hd1440" }; // 1440p 2K
  }

  return { tier: "excellent", quality: "hd2160" }; // 4K Ultra HD
}

function applyStallStepDown(baseQuality: AdaptiveYouTubeQuality): AdaptiveYouTubeQuality {
  if (activeStallStepDown <= 0) return baseQuality;
  if (Date.now() - lastStallStepDownAt > STALL_RECOVERY_MS * 2) {
    activeStallStepDown = 0;
    return baseQuality;
  }
  const baseIdx = QUALITY_LADDER.indexOf(baseQuality);
  if (baseIdx <= 0) return QUALITY_LADDER[0];
  const nextIdx = Math.max(0, baseIdx - activeStallStepDown);
  return QUALITY_LADDER[nextIdx];
}

export function stepDownQualityOnBuffering(): AdaptiveYouTubeQuality {
  activeStallStepDown = Math.min(QUALITY_LADDER.length - 1, activeStallStepDown + 1);
  lastStallStepDownAt = Date.now();
  return detectNetworkSpeed().suggestedQuality;
}

export function resetBufferingStepDownIfStable(): void {
  if (activeStallStepDown > 0 && Date.now() - lastStallStepDownAt >= STALL_RECOVERY_MS) {
    activeStallStepDown = Math.max(0, activeStallStepDown - 1);
    lastStallStepDownAt = Date.now();
  }
}

export function clearNetworkStallPenalty(): void {
  activeStallStepDown = 0;
  lastStallStepDownAt = 0;
}

/**
 * Mesure ou extrait le débit réseau instantané (API navigateur + mesure réelle mise en cache)
 */
export function detectNetworkSpeed(): NetworkSpeedSample {
  if (typeof window === "undefined") {
    return {
      tier: "fast",
      downlinkMbps: 15,
      effectiveType: "4g",
      rttMs: 40,
      suggestedQuality: "hd1080",
      measuredAt: Date.now(),
    };
  }

  try {
    const nav = navigator as any;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

    const saveData = Boolean(conn?.saveData);
    const connEff = conn?.effectiveType || (conn?.type === "cellular" ? "3g" : "4g");
    const connRtt = typeof conn?.rtt === "number" && conn.rtt > 0 ? conn.rtt : 50;
    const connDownlink = typeof conn?.downlink === "number" && conn.downlink > 0 ? conn.downlink : null;

    const hasFreshProbe =
      cachedMeasuredMbps !== null && Date.now() - cachedMeasuredAt < PROBE_TTL_MS * 2;

    // Chromium plafonne navigator.connection.downlink à 10 Mbps même en fibre :
    // si une vraie mesure HTTP récente existe, on l'utilise (sauf si le navigateur signale déjà un réseau lent < 5 Mbps)
    let effectiveDownlink = 12; // défaut équilibré 1080p si aucune sonde/API dispo (Safari/Firefox)
    let effectiveRtt = connRtt;

    if (connDownlink !== null && (connDownlink < 8 || !hasFreshProbe)) {
      effectiveDownlink = connDownlink;
    }
    if (hasFreshProbe && cachedMeasuredMbps !== null) {
      if (connDownlink === null || connDownlink >= 8 || cachedMeasuredMbps < connDownlink) {
        effectiveDownlink = cachedMeasuredMbps;
      }
      if (cachedMeasuredRttMs !== null) {
        effectiveRtt = Math.max(connRtt, cachedMeasuredRttMs);
      }
    }

    const { tier, quality } = getQualityForDownlink(
      effectiveDownlink,
      connEff,
      effectiveRtt,
      saveData
    );
    const adaptedQuality = applyStallStepDown(quality);

    return {
      tier,
      downlinkMbps: effectiveDownlink,
      effectiveType: connEff,
      rttMs: effectiveRtt,
      suggestedQuality: adaptedQuality,
      measuredAt: Date.now(),
    };
  } catch {
    return {
      tier: "fast",
      downlinkMbps: 12,
      effectiveType: "4g",
      rttMs: 50,
      suggestedQuality: applyStallStepDown("hd1080"),
      measuredAt: Date.now(),
    };
  }
}

/**
 * Mesure silencieusement le débit réel en téléchargeant une petite ressource locale (compatible tous navigateurs, dépasse le plafond 10 Mbps de Chrome pour détecter les connexions 2K/4K ou lentes)
 */
export async function probeConnectionBandwidth(force = false): Promise<NetworkSpeedSample> {
  if (typeof window === "undefined") {
    return detectNetworkSpeed();
  }

  const now = Date.now();
  if (!force && cachedMeasuredMbps !== null && now - cachedMeasuredAt < PROBE_TTL_MS) {
    return detectNetworkSpeed();
  }

  if (inflightProbePromise) {
    return inflightProbePromise;
  }

  inflightProbePromise = (async () => {
    try {
      const nav = navigator as any;
      const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
      if (conn?.saveData || ["slow-2g", "2g"].includes(conn?.effectiveType || "")) {
        return detectNetworkSpeed();
      }

      // 1. Latence rapide (RTT)
      const rttStart = performance.now();
      const pingCtrl = new AbortController();
      const pingTimer = window.setTimeout(() => pingCtrl.abort(), 3000);
      try {
        await fetch(`/manifest.webmanifest?_p=${Date.now()}`, {
          cache: "no-store",
          signal: pingCtrl.signal,
        });
      } finally {
        window.clearTimeout(pingTimer);
      }
      const rttMs = Math.max(10, Math.round(performance.now() - rttStart));

      // 2. Débit réel sur une icône statique (~50-200 Ko)
      const dlStart = performance.now();
      const dlCtrl = new AbortController();
      const dlTimer = window.setTimeout(() => dlCtrl.abort(), 4500);
      let bytes = 0;
      try {
        const res = await fetch(`/icon-512.png?_bw=${Date.now()}`, {
          cache: "no-store",
          signal: dlCtrl.signal,
        });
        if (res.ok) {
          const buf = await res.arrayBuffer();
          bytes = buf.byteLength;
        }
      } finally {
        window.clearTimeout(dlTimer);
      }
      const elapsedSec = Math.max(0.005, (performance.now() - dlStart) / 1000);

      if (bytes > 1024) {
        const rawMbps = (bytes * 8) / elapsedSec / 1_000_000;
        // Pondération douce avec une éventuelle limite API navigateur lente
        const connDownlink =
          typeof conn?.downlink === "number" && conn.downlink > 0 && conn.downlink < 8
            ? conn.downlink
            : null;
        cachedMeasuredMbps = connDownlink !== null ? Math.min(rawMbps, connDownlink * 1.2) : rawMbps;
        cachedMeasuredRttMs = rttMs;
        cachedMeasuredAt = Date.now();
      }
    } catch {
      // Échec ou timeout réseau -> considère la connexion comme dégradée
      cachedMeasuredMbps = 1.2;
      cachedMeasuredRttMs = 450;
      cachedMeasuredAt = Date.now();
    } finally {
      inflightProbePromise = null;
    }

    return detectNetworkSpeed();
  })();

  return inflightProbePromise;
}

/**
 * Sélectionne la qualité YouTube la plus proche disponible pour le niveau cible (jusqu'à 4K hd2160)
 */
export function selectAdaptiveQuality(
  player: any,
  availableLevels?: string[],
  overrideTarget?: AdaptiveYouTubeQuality
): string {
  const target = overrideTarget || detectNetworkSpeed().suggestedQuality;
  const levels: string[] =
    availableLevels && availableLevels.length > 0
      ? availableLevels
      : player?.getAvailableQualityLevels?.() || [];

  if (!levels || levels.length === 0) {
    return target;
  }

  const targetIdx = QUALITY_LADDER.indexOf(target);

  // Si connexion excellente (4K), autoriser aussi highres / hd4320 / hd2160 si disponible
  if (target === "hd2160") {
    for (const candidate of ["hd2160", "highres", "hd4320", "hd1440", "hd1080", "hd720", "large", "medium", "small"]) {
      if (levels.includes(candidate)) return candidate;
    }
  }

  // Sinon, prendre la meilleure résolution qui ne dépasse pas la cible adaptée à la connexion
  for (let i = targetIdx; i >= 0; i--) {
    const level = QUALITY_LADDER[i];
    if (levels.includes(level)) {
      return level;
    }
  }

  // Fallback vers la plus petite résolution disponible si aucune <= cible
  for (let i = targetIdx + 1; i < QUALITY_LADDER.length; i++) {
    const level = QUALITY_LADDER[i];
    if (levels.includes(level)) {
      return level;
    }
  }

  return levels[0];
}

/**
 * Applique silencieusement et automatiquement la qualité adaptée à la connexion sur un lecteur YouTube
 */
export function applyAdaptiveConnectionQuality(
  player: any,
  onQualityResolved?: (quality: string) => void,
  overrideTarget?: AdaptiveYouTubeQuality
): string {
  const sample = detectNetworkSpeed();
  const target = overrideTarget || sample.suggestedQuality;

  if (!player) return target;

  try {
    const chosen = selectAdaptiveQuality(player, undefined, target);
    const maxBound = target === "hd2160" ? "highres" : chosen;

    player.setPlaybackQuality?.(chosen);
    player.setSuggestedQuality?.(chosen);
    player.setPlaybackQualityRange?.(chosen, maxBound);

    const iframe = player.getIframe?.();
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: "setPlaybackQuality", args: [chosen] }),
        "*"
      );
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: "setPlaybackQualityRange", args: [chosen, maxBound] }),
        "*"
      );
    }

    if (onQualityResolved) {
      onQualityResolved(chosen);
    }
    return chosen;
  } catch (err) {
    console.warn("Adaptive quality application error:", err);
    return target;
  }
}

/**
 * Écouteur en continu des changements de puissance réseau (passage Wi-Fi <-> 4G / 5G, coupure, reprise)
 * pour ajuster la qualité en temps réel sans jamais couper la vidéo.
 */
export function subscribeToNetworkQualityChanges(
  onNetworkChange: (sample: NetworkSpeedSample) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleConnectionUpdate = () => {
    clearNetworkStallPenalty();
    cachedMeasuredAt = 0;
    const immediate = detectNetworkSpeed();
    onNetworkChange(immediate);
    void probeConnectionBandwidth(true).then((measured) => {
      onNetworkChange(measured);
    });
  };

  const nav = navigator as any;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

  if (conn?.addEventListener) {
    conn.addEventListener("change", handleConnectionUpdate);
  }

  window.addEventListener("online", handleConnectionUpdate);
  window.addEventListener("offline", handleConnectionUpdate);

  return () => {
    if (conn?.removeEventListener) {
      conn.removeEventListener("change", handleConnectionUpdate);
    }
    window.removeEventListener("online", handleConnectionUpdate);
    window.removeEventListener("offline", handleConnectionUpdate);
  };
}
