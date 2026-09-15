// Export exhaustif des vidéos de la chaîne La Quête (>= 10 minutes)
// Total : 6 vidéos cataloguées
import type { Category, SkipSegment } from "./catalog";

export type LaQueteMetaItem = {
  cats: Category[];
  year: number;
  featured?: boolean;
  isNew?: boolean;
  isTrending?: boolean;
  duration?: string;
  skipSegments?: SkipSegment[];
};

export const laQueteRaw: [string, string, string][] = [
  [
    "VPLXtdU2is4",
    "Un chrétien réagit au Coran : la Sourate Mariam sur la naissance de Jésus",
    "Découverte et réaction sincère d'un chrétien à la lecture de la Sourate Maryam, explorant le récit coranique de la nativité de 'Isa (Jésus) et la pureté de sa mère.",
  ],
  [
    "CiAvtw6RLPI",
    "Je suis chrétien et je réagis à la récitation de l'histoire de Noé dans le Coran",
    "Immersion dans le récit du Prophète Nouh (Noé), son arche et le déluge racontés dans le Saint Coran avec émotion et respect.",
  ],
  [
    "rALBBxipLNI",
    "9 faits choquants du Coran vus par un chrétien (je suis choqué)",
    "Analyse et mise en perspective de 9 réalités et faits remarquables relevés dans le Coran par un lecteur chrétien.",
  ],
  [
    "pn5Kk1JY93g",
    "Un chrétien lit le Coran : Jésus et Marie dans la Sourate Al-Imran",
    "Une lecture attentive et respectueuse des versets coraniques dédiés à 'Isa (Jésus) et Maryam (Marie) dans la Sourate Al-Imran, mettant en lumière la haute estime de leurs figures en Islam.",
  ],
  [
    "GKluKEAATfs",
    "J'ai écouté le Coran pour la première fois : voici ce que j'ai ressenti",
    "Partage d'expérience et ressenti profond lors de la toute première écoute d'une récitation coranique psalmodiée.",
  ],
  [
    "-c0HwYyEuDw",
    "Je suis chrétien et je lis le Coran pour la première fois (Al-Fatiha / Al-Baqara)",
    "Premiers pas d'un lecteur chrétien dans le texte coranique à travers la Sourate Al-Fatiha et les premiers passages de la Sourate Al-Baqara.",
  ],
];

export const laQueteMeta: Record<string, LaQueteMetaItem> = {
  "VPLXtdU2is4": {
    cats: ["Coran", "Prophètes"],
    year: 2026,
    duration: "30:28",
    featured: true,
    isNew: true,
  },
  "CiAvtw6RLPI": {
    cats: ["Coran", "Prophètes"],
    year: 2026,
    duration: "21:15",
    isNew: true,
  },
  "rALBBxipLNI": {
    cats: ["Coran", "Histoire & Mystère"],
    year: 2026,
    duration: "30:18",
    isNew: true,
  },
  "pn5Kk1JY93g": {
    cats: ["Coran", "Prophètes", "Histoire & Mystère"],
    year: 2025,
    duration: "1:13:47",
    isTrending: true,
  },
  "GKluKEAATfs": {
    cats: ["Coran", "Histoire & Mystère"],
    year: 2025,
    duration: "18:25",
  },
  "-c0HwYyEuDw": {
    cats: ["Coran", "Histoire & Mystère"],
    year: 2025,
    duration: "1:25:18",
  },
};
