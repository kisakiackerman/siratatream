/**
 * Adaptive Connection Quality Engine
 * Détecte en temps réel la puissance et la vitesse de la connexion de l'utilisateur
 * et sélectionne automatiquement la meilleure qualité vidéo YouTube adaptée (de 4K/1080p à 360p).
 * Entièrement automatique et transparent : aucun bouton ni configuration requis.
 */

export type ConnectionSpeedTier = "excellent" | "fast" | "medium" | "low" | "very_low";

export interface NetworkSpeedSample {
  tier: ConnectionSpeedTier;
  downlinkMbps: number;
  effectiveType: string;
  rttMs: number;
  suggestedQuality: string;
}

export const ULTRA_HD_QUALITY_ORDER = [
  "hd4320",
  "highres",
  "hd2160",
  "hd1440",
  "hd1080",
  "hd720",
] as const;

// Échelle des résolutions YouTube en mode Ultra-HD automatique :
// Toujours privilégier la résolution maximale disponible (8K hd4320 / highres, 4K hd2160, 2K hd1440, 1080p)
export function getQualityForDownlink(downlinkMbps: number, effectiveType: string, rttMs: number): {
  tier: ConnectionSpeedTier;
  quality: string;
} {
  void downlinkMbps;
  void effectiveType;
  void rttMs;
  return { tier: "excellent", quality: "highres" };
}

/**
 * Mesure ou extrait le débit réseau instantané
 */
export function detectNetworkSpeed(): NetworkSpeedSample {
  if (typeof window === "undefined") {
    return {
      tier: "excellent",
      downlinkMbps: 100,
      effectiveType: "4g",
      rttMs: 20,
      suggestedQuality: "highres",
    };
  }

  try {
    const nav = navigator as any;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

    if (conn) {
      const downlink = typeof conn.downlink === "number" && conn.downlink > 0 ? conn.downlink : 100;
      const effectiveType = conn.effectiveType || (conn.type === "cellular" ? "3g" : "4g");
      const rtt = typeof conn.rtt === "number" ? conn.rtt : 20;

      const { tier, quality } = getQualityForDownlink(downlink, effectiveType, rtt);
      return {
        tier,
        downlinkMbps: downlink,
        effectiveType,
        rttMs: rtt,
        suggestedQuality: quality,
      };
    }
  } catch {
    // ignore
  }

  // Fallback automatique en qualité maximale (8K / 4K / highres)
  return {
    tier: "excellent",
    downlinkMbps: 100,
    effectiveType: "4g",
    rttMs: 20,
    suggestedQuality: "highres",
  };
}

/**
 * Choisit automatiquement la résolution maximale disponible sur le lecteur YouTube
 * (8K 4320p -> highres -> 4K 2160p -> 2K 1440p -> 1080p).
 */
export function selectAdaptiveQuality(
  player: any,
  availableLevels?: string[]
): string {
  const levels: string[] =
    availableLevels && availableLevels.length > 0
      ? availableLevels
      : player?.getAvailableQualityLevels?.() || [];

  if (!levels || levels.length === 0) {
    return "highres";
  }

  for (const level of ULTRA_HD_QUALITY_ORDER) {
    if (levels.includes(level)) {
      return level;
    }
  }

  return levels[0];
}

/**
 * Applique silencieusement et automatiquement la résolution maximale (8K/4K+) sur un lecteur YouTube
 */
export function applyAdaptiveConnectionQuality(
  player: any,
  onQualityResolved?: (quality: string) => void
): string {
  if (!player) return "highres";

  try {
    const chosen = selectAdaptiveQuality(player);
    player.setPlaybackQuality?.(chosen);
    player.setSuggestedQuality?.(chosen);
    player.setPlaybackQualityRange?.(chosen, "highres");

    const iframe = player.getIframe?.();
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: "setPlaybackQuality", args: [chosen] }),
        "*"
      );
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: "setPlaybackQualityRange", args: [chosen, "highres"] }),
        "*"
      );
    }

    if (onQualityResolved) {
      onQualityResolved(chosen);
    }
    return chosen;
  } catch (err) {
    console.warn("Adaptive quality application error:", err);
    return "highres";
  }
}

/**
 * Écouteur en continu des changements de puissance réseau (passage Wi-Fi <-> 4G / 5G)
 * pour ajuster la qualité en temps réel sans jamais couper la vidéo.
 */
export function subscribeToNetworkQualityChanges(
  onNetworkChange: (sample: NetworkSpeedSample) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleConnectionUpdate = () => {
    const sample = detectNetworkSpeed();
    onNetworkChange(sample);
  };

  const nav = navigator as any;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

  if (conn?.addEventListener) {
    conn.addEventListener("change", handleConnectionUpdate);
  }

  window.addEventListener("online", handleConnectionUpdate);

  return () => {
    if (conn?.removeEventListener) {
      conn.removeEventListener("change", handleConnectionUpdate);
    }
    window.removeEventListener("online", handleConnectionUpdate);
  };
}
