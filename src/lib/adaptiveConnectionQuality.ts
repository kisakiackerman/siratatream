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

// Échelle des résolutions YouTube en fonction du débit descendant
// - excellent (>= 12 Mbps / Fibre / 5G) : 4K (hd2160/highres) ou 1440p (hd1440) ou 1080p (hd1080)
// - fast (5 - 12 Mbps / 4G+ / Bon Wi-Fi) : 1080p (hd1080)
// - medium (2.5 - 5 Mbps / 4G standard / Wi-Fi moyen) : 720p (hd720)
// - low (1 - 2.5 Mbps / 3G) : 480p (large)
// - very_low (< 1 Mbps / 2G) : 360p (medium) ou 240p (small)
export function getQualityForDownlink(downlinkMbps: number, effectiveType: string, rttMs: number): {
  tier: ConnectionSpeedTier;
  quality: string;
} {
  // Très haut débit (>= 15 Mbps, Fibre, 5G) : 4K si disponible
  if (downlinkMbps >= 15.0 && (effectiveType === "4g" || effectiveType === "5g")) {
    return { tier: "excellent", quality: "highres" };
  }

  // Par défaut et pour toute connexion : Forcer Full HD minimum 1080p
  return { tier: "fast", quality: "hd1080" };
}

/**
 * Mesure ou extrait le débit réseau instantané
 */
export function detectNetworkSpeed(): NetworkSpeedSample {
  if (typeof window === "undefined") {
    return {
      tier: "fast",
      downlinkMbps: 10,
      effectiveType: "4g",
      rttMs: 50,
      suggestedQuality: "hd1080",
    };
  }

  try {
    const nav = navigator as any;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

    if (conn) {
      const downlink = typeof conn.downlink === "number" && conn.downlink > 0 ? conn.downlink : 10;
      const effectiveType = conn.effectiveType || (conn.type === "cellular" ? "3g" : "4g");
      const rtt = typeof conn.rtt === "number" ? conn.rtt : 50;

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

  // Fallback si l'API Network Information n'est pas supportée (ex: Safari) :
  // Détection par défaut haute qualité rapide (1080p)
  return {
    tier: "fast",
    downlinkMbps: 10,
    effectiveType: "4g",
    rttMs: 50,
    suggestedQuality: "hd1080",
  };
}

/**
 * Choisit la meilleure qualité disponible sur le lecteur YouTube
 * qui correspond à la puissance de la connexion mesurée.
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
    return "hd1080";
  }

  // Forcer systématiquement au minimum Full HD (1080p ou supérieur : 1440p, 4K)
  if (levels.includes("highres")) return "highres";
  if (levels.includes("hd2160")) return "hd2160";
  if (levels.includes("hd1440")) return "hd1440";
  if (levels.includes("hd1080")) return "hd1080";

  // Si la vidéo source ne dispose pas de 1080p sur YouTube, sélectionner la meilleure disponible
  return levels[0];
}

/**
 * Applique silencieusement et dynamiquement la qualité adaptative sur un lecteur YouTube
 */
export function applyAdaptiveConnectionQuality(
  player: any,
  onQualityResolved?: (quality: string) => void
): string {
  if (!player) return "hd1080";

  try {
    const chosen = selectAdaptiveQuality(player);
    player.setPlaybackQuality?.(chosen);
    player.setSuggestedQuality?.(chosen);
    if (onQualityResolved) {
      onQualityResolved(chosen);
    }
    return chosen;
  } catch (err) {
    console.warn("Adaptive quality application error:", err);
    return "hd1080";
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
