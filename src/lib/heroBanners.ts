import { type ContentItem, type Category } from "@/data/catalog";

export interface HeroBannerPreset {
  id: string;
  name: string;
  description: string;
  categoryHint: string;
  url: string;
}

/**
 * Bannières haute définition 16:9 immersives libres de droits,
 * sélectionnées pour sublimer les récits et vidéos dépourvus de visuel hero natif.
 */
export const HERO_BANNER_PRESETS: HeroBannerPreset[] = [
  {
    id: "prophetic-dawn",
    name: "Dôme doré & Aube Prophétique",
    description: "Architecture majestueuse et lueur spirituelle dorée",
    categoryHint: "Prophètes",
    url: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1600&auto=format&fit=crop&q=80",
  },
  {
    id: "celestial-stars",
    name: "Nuit Étoilée & Voûte Céleste",
    description: "Ciel profond d'Arabie et contemplation de l'univers",
    categoryHint: "Méditations",
    url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1600&auto=format&fit=crop&q=80",
  },
  {
    id: "golden-dunes",
    name: "Désert Sacré & Dunes Dorées",
    description: "Horizon paisible et évocation des caravanes de la Sîra",
    categoryHint: "Sahaba",
    url: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=1600&auto=format&fit=crop&q=80",
  },
  {
    id: "sacred-sanctuary",
    name: "Sanctuaire Illuminé & Sérénité",
    description: "Colonnes historiques et cour apaisante",
    categoryHint: "Coran",
    url: "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=1600&auto=format&fit=crop&q=80",
  },
  {
    id: "cosmic-miracles",
    name: "Cosmos & Miracles de la Création",
    description: "Nébuleuse cosmique et grandeur des cieux",
    categoryHint: "Miracles",
    url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80",
  },
  {
    id: "divine-rays",
    name: "Rayons de Lumière & Paix",
    description: "Lumière douce traversant la coupole",
    categoryHint: "Spiritualité",
    url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1600&auto=format&fit=crop&q=80",
  },
  {
    id: "ancient-heritage",
    name: "Patrimoine & Histoire Prophétique",
    description: "Arches de pierre millénaires et lanternes chaleureuses",
    categoryHint: "Histoire",
    url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80",
  },
];

/**
 * Retourne une bannière 16:9 adaptée selon la catégorie ou la chaîne
 */
export function getThematicFallbackBanner(item: { categories?: string[]; channel?: string }): string {
  const cat = (item.categories?.[0] || "").toLowerCase();

  if (cat.includes("miracle")) {
    return HERO_BANNER_PRESETS.find((p) => p.id === "cosmic-miracles")!.url;
  }
  if (cat.includes("prophète") || cat.includes("sîra") || cat.includes("sira")) {
    return HERO_BANNER_PRESETS.find((p) => p.id === "prophetic-dawn")!.url;
  }
  if (cat.includes("sahaba") || cat.includes("compagnon") || cat.includes("histoire")) {
    return HERO_BANNER_PRESETS.find((p) => p.id === "golden-dunes")!.url;
  }
  if (cat.includes("coran") || cat.includes("récitation") || cat.includes("salat")) {
    return HERO_BANNER_PRESETS.find((p) => p.id === "sacred-sanctuary")!.url;
  }
  if (cat.includes("méditation") || cat.includes("rappel") || cat.includes("spiritualité")) {
    return HERO_BANNER_PRESETS.find((p) => p.id === "celestial-stars")!.url;
  }

  // Par défaut : Dôme doré
  return HERO_BANNER_PRESETS[0].url;
}

/**
 * Calcule une palette d'ambiance adaptée pour l'effet de flou et de lueur
 */
export function getChannelAmbientTheme(channel: string | undefined): {
  glowColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
} {
  const ch = (channel || "").toLowerCase();

  if (ch.includes("towards eternity")) {
    return {
      glowColor: "rgba(56, 189, 248, 0.22)",
      badgeBg: "bg-sky-400/15",
      badgeBorder: "border-sky-300/30",
      badgeText: "text-sky-200",
    };
  }
  if (ch.includes("croyant rationnel")) {
    return {
      glowColor: "rgba(129, 140, 248, 0.22)",
      badgeBg: "bg-indigo-400/15",
      badgeBorder: "border-indigo-300/30",
      badgeText: "text-indigo-200",
    };
  }
  if (ch.includes("récitations") || ch.includes("haramain")) {
    return {
      glowColor: "rgba(251, 191, 36, 0.22)",
      badgeBg: "bg-amber-400/15",
      badgeBorder: "border-amber-300/30",
      badgeText: "text-amber-200",
    };
  }

  // Défaut émeraude NARRO
  return {
    glowColor: "rgba(52, 211, 153, 0.22)",
    badgeBg: "bg-emerald-400/15",
    badgeBorder: "border-emerald-300/30",
    badgeText: "text-emerald-200",
  };
}
