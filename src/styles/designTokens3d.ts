/**
 * Design Tokens pour le système 3D de NexStream / SiratStream.
 * Définit les constantes de perspective, élévation Z, angles d'inclinaison,
 * ombres de profondeur physique et lueurs dorées / émeraudes.
 */

export const TOKENS_3D = {
  // Perspectives
  perspective: {
    stage: "1200px",
    card: "900px",
    modal: "1400px",
    coverflow: "1100px",
  },

  // Inclinaisons maximales (selon directives : 8° à 10° max pour élégance & lisibilité)
  tilt: {
    maxAngle: 8.5, // degrés
    settleDuration: 0.22, // secondes
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
  },

  // Profondeurs Z (couches 3D physiques)
  depth: {
    base: "0px",
    recessed: "-30px",
    deepRecessed: "-80px",
    floatingLow: "10px",
    floatingMid: "22px",
    floatingHigh: "42px",
    hoverZ: "18px",
  },

  // Ombres physiques d'occlusion ambiante
  shadows: {
    cardRest:
      "inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.22), inset 0 -2.5px 5px 0 rgba(0, 0, 0, 0.55), 0 6px 14px -2px rgba(0, 0, 0, 0.5), 0 16px 32px -6px rgba(0, 0, 0, 0.65)",
    cardElevated:
      "inset 0 2px 1.5px 0 rgba(255, 255, 255, 0.4), inset 0 -3px 6px 0 rgba(0, 0, 0, 0.65), 0 20px 40px -4px rgba(0, 0, 0, 0.75), 0 36px 72px -10px rgba(0, 0, 0, 0.85), 0 0 28px 2px rgba(245, 158, 11, 0.22)",
    goldGlow: "0 0 24px -2px rgba(245, 158, 11, 0.45)",
    emeraldGlow: "0 0 24px -2px rgba(16, 185, 129, 0.35)",
    navbarFloating:
      "inset 0 1px 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1.5px 3px 0 rgba(0, 0, 0, 0.4), 0 16px 36px -6px rgba(0, 0, 0, 0.65)",
  },

  // Couleurs emblématiques 3D (Ambiance nocturne islamique sobre : or ambré & vert émeraude)
  colors: {
    gold: {
      light: "#fef3c7",
      glow: "#fbbf24",
      primary: "#f59e0b",
      deep: "#b45309",
    },
    emerald: {
      light: "#a7f3d0",
      glow: "#34d399",
      primary: "#10b981",
      dark: "#064e3b",
    },
    night: {
      deep: "#050807",
      surface: "#0c1410",
      card: "rgba(18, 28, 22, 0.92)",
    },
  },
} as const;
