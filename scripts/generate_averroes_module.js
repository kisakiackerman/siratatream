import fs from "fs";

const videos = JSON.parse(fs.readFileSync("./averoeshistoire_videos_over_10min.json", "utf-8"));

function assignCategories(title) {
  const t = title.toLowerCase();
  const cats = ["Histoire & Mystère"];

  if (t.includes("prophète") || t.includes("muhammad") || t.includes("mahomet") || t.includes("issa")) {
    cats.push("Prophètes");
  }
  if (t.includes("saladin") || t.includes("ibn") || t.includes("souveraine") || t.includes("femme") || t.includes("hallâj") || t.includes("râbi'a") || t.includes("arwa") || t.includes("soufi")) {
    cats.push("Héros & Personnages");
  }
  if (t.includes("fin des temps") || t.includes("fin du monde") || t.includes("paradis") || t.includes("enfer") || t.includes("antéchrist") || t.includes("cataclysme")) {
    cats.push("Eschatologie");
  }
  if (t.includes("hadith") || t.includes("coran")) {
    cats.push("Coran");
  }
  return cats;
}

function parseYear(published) {
  if (!published) return 2023;
  const match = published.match(/(\d+)\s*(an|ans|année|années|mois|semaine|jour)/i);
  const currentYear = 2024;
  if (!match) return 2023;
  const num = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  if (unit.startsWith("an")) {
    return Math.max(2018, currentYear - num);
  }
  return 2024;
}

const rawList = [];
const metaObj = {};

videos.forEach((v, index) => {
  const cleanTitle = v.title.trim();
  const cleanDesc = `Documentaire historique et analyse par Averroès Histoire : « ${cleanTitle} » (${v.duration}). Exploration approfondie des faits, sources médiévales et enseignements de la civilisation islamique.`;
  rawList.push(`  [${JSON.stringify(v.id)}, ${JSON.stringify(cleanTitle)}, ${JSON.stringify(cleanDesc)}]`);

  const cats = assignCategories(cleanTitle);
  const year = parseYear(v.published);
  const isFeatured = index === 0 || cleanTitle.includes("Omeyyades de Cordoue") || cleanTitle.includes("Saladin");
  const isNew = index < 10;
  const isTrending = index < 15;

  metaObj[v.id] = {
    cats,
    year,
    duration: v.duration,
    ...(isFeatured ? { featured: true } : {}),
    ...(isNew ? { isNew: true } : {}),
    ...(isTrending ? { isTrending: true } : {}),
  };
});

const fileContent = `// Export exhaustif des documentaires de la chaîne Averroès Histoire (>= 10 minutes)
// Total : ${videos.length} vidéos consacrées à l'histoire, la théologie et la civilisation islamique
import type { Category, SkipSegment } from "./catalog";

export type AverroesHistoireMetaItem = {
  cats: Category[];
  year: number;
  featured?: boolean;
  isNew?: boolean;
  isTrending?: boolean;
  duration?: string;
  skipSegments?: SkipSegment[];
};

export const averroesHistoireRaw: [string, string, string][] = [
${rawList.join(",\n")}
];

export const averroesHistoireMeta: Record<string, AverroesHistoireMetaItem> = ${JSON.stringify(metaObj, null, 2)};
`;

fs.writeFileSync("./src/data/averroesHistoireVideos.ts", fileContent, "utf-8");
console.log("Successfully generated src/data/averroesHistoireVideos.ts with", videos.length, "items");
