// Export exhaustif des vidéos de la chaîne Blue Casquette (>= 10 minutes)
// Total : 16 vidéos cataloguées
import type { Category, SkipSegment } from "./catalog";

export type BlueCasquetteMetaItem = {
  cats: Category[];
  year: number;
  featured?: boolean;
  isNew?: boolean;
  isTrending?: boolean;
  duration?: string;
  skipSegments?: SkipSegment[];
};

export const blueCasquetteRaw: [string, string, string][] = [
  ["FJvdknduMog", "Le divorce est pire que la mort", "Enquête et reportage de société par Blue Casquette : « Le divorce est pire que la mort » (16:56). Récits, analyses et enseignements documentés."],
  ["VsoCFRS3Ltw", "4 semaines pour changer ta vie", "Enquête et reportage de société par Blue Casquette : « 4 semaines pour changer ta vie » (24:42). Récits, analyses et enseignements documentés."],
  ["NkF9qHup9UY", "Le principe du moindre intérêt", "Enquête et reportage de société par Blue Casquette : « Le principe du moindre intérêt » (12:19). Récits, analyses et enseignements documentés."],
  ["T3qnnDFhgQ8", "La vérité sur nos traumas", "Enquête et reportage de société par Blue Casquette : « La vérité sur nos traumas » (21:44). Récits, analyses et enseignements documentés."],
  ["7goSDQrTNAg", "Cocaine et Islam", "Enquête et reportage de société par Blue Casquette : « Cocaine et Islam » (16:45). Récits, analyses et enseignements documentés."],
  ["Kj-iYpIYvT8", "La TCC islamiquement modifiée", "Enquête et reportage de société par Blue Casquette : « La TCC islamiquement modifiée » (15:45). Récits, analyses et enseignements documentés."],
  ["6rxGjaoiMY0", "Psychologie islamique vs psychologie classique", "Enquête et reportage de société par Blue Casquette : « Psychologie islamique vs psychologie classique » (21:47). Récits, analyses et enseignements documentés."],
  ["ayf093a65_8", "\" Juste un verre \" : le piège parfait.", "Enquête et reportage de société par Blue Casquette : « \" Juste un verre \" : le piège parfait. » (19:53). Récits, analyses et enseignements documentés."],
  ["R3Clpnko1Ow", "Allah te récompense pour la douleur que tu ressens (thérapie du deuil)", "Enquête et reportage de société par Blue Casquette : « Allah te récompense pour la douleur que tu ressens (thérapie du deuil) » (33:51). Récits, analyses et enseignements documentés."],
  ["5WfDuET3CwU", "Accro au cannabis ? voilà comment décrocher facilement", "Enquête et reportage de société par Blue Casquette : « Accro au cannabis ? voilà comment décrocher facilement » (37:10). Récits, analyses et enseignements documentés."],
  ["k5Pzm3KCGFw", "En finir avec le démon de l'addiction à la pornographie", "Enquête et reportage de société par Blue Casquette : « En finir avec le démon de l'addiction à la pornographie » (34:11). Récits, analyses et enseignements documentés."],
  ["i508zOD8e3o", "Tu pries 5 fois par jour et tu fumes encore ? voici pourquoi", "Enquête et reportage de société par Blue Casquette : « Tu pries 5 fois par jour et tu fumes encore ? voici pourquoi » (30:18). Récits, analyses et enseignements documentés."],
  ["sLAWA2jsUC0", "Je me suis ENFIN détaché de la dunya", "Enquête et reportage de société par Blue Casquette : « Je me suis ENFIN détaché de la dunya » (30:53). Récits, analyses et enseignements documentés."],
  ["wGhDX-DIWko", "D'un coeur dur à un coeur vivant", "Enquête et reportage de société par Blue Casquette : « D'un coeur dur à un coeur vivant » (22:41). Récits, analyses et enseignements documentés."],
  ["ODrkY5wb964", "Je n'ai plus peur de mourir", "Enquête et reportage de société par Blue Casquette : « Je n'ai plus peur de mourir » (22:08). Récits, analyses et enseignements documentés."],
  ["10SOIUiWeDk", "Comment j'ai maitrisé mes crises de colère", "Enquête et reportage de société par Blue Casquette : « Comment j'ai maitrisé mes crises de colère » (23:53). Récits, analyses et enseignements documentés."],
];

export const blueCasquetteMeta: Record<string, BlueCasquetteMetaItem> = {
  "FJvdknduMog": {
    cats: ["Eschatologie"],
    year: 2024,
    duration: "16:56",
    featured: true,
    isNew: true,
  },
  "VsoCFRS3Ltw": {
    cats: ["Anges & Djinns"],
    year: 2024,
    duration: "24:42",
    isNew: true,
  },
  "NkF9qHup9UY": {
    cats: ["Histoire & Mystère"],
    year: 2024,
    duration: "12:19",
    isNew: true,
  },
  "T3qnnDFhgQ8": {
    cats: ["Histoire & Mystère"],
    year: 2024,
    duration: "21:44",
    isNew: true,
  },
  "7goSDQrTNAg": {
    cats: ["Histoire & Mystère"],
    year: 2024,
    duration: "16:45",
    isNew: true,
  },
  "Kj-iYpIYvT8": {
    cats: ["Histoire & Mystère"],
    year: 2024,
    duration: "15:45",
    isNew: true,
  },
  "6rxGjaoiMY0": {
    cats: ["Histoire & Mystère"],
    year: 2024,
    duration: "21:47",
    isNew: true,
  },
  "ayf093a65_8": {
    cats: ["Histoire & Mystère"],
    year: 2024,
    duration: "19:53",
    isNew: true,
  },
  "R3Clpnko1Ow": {
    cats: ["Histoire & Mystère"],
    year: 2024,
    duration: "33:51",
    isNew: true,
  },
  "5WfDuET3CwU": {
    cats: ["Histoire & Mystère"],
    year: 2024,
    duration: "37:10",
    isNew: true,
  },
  "k5Pzm3KCGFw": {
    cats: ["Histoire & Mystère"],
    year: 2024,
    duration: "34:11",
    isNew: true,
  },
  "i508zOD8e3o": {
    cats: ["Histoire & Mystère"],
    year: 2024,
    duration: "30:18",
    isNew: true,
  },
  "sLAWA2jsUC0": {
    cats: ["Histoire & Mystère"],
    year: 2024,
    duration: "30:53",
    isTrending: true,
  },
  "wGhDX-DIWko": {
    cats: ["Histoire & Mystère"],
    year: 2024,
    duration: "22:41",
    isTrending: true,
  },
  "ODrkY5wb964": {
    cats: ["Histoire & Mystère"],
    year: 2024,
    duration: "22:08",
    isTrending: true,
  },
  "10SOIUiWeDk": {
    cats: ["Histoire & Mystère"],
    year: 2024,
    duration: "23:53",
    isTrending: true,
  },
};
