import fs from "fs";
import path from "path";

// Load exports
const miVideos = JSON.parse(
  fs.readFileSync("./public/minute_islam_videos_over_10min.json", "utf-8")
);
const slcVideos = JSON.parse(
  fs.readFileSync("./public/sur_le_chemin_videos_over_10min.json", "utf-8")
);

// Existing minuteIslam descriptions from catalog.ts
const catalogContent = fs.readFileSync("./src/data/catalog.ts", "utf-8");
const existingDescMap = new Map();
const matches = catalogContent.matchAll(/\["([^"]+)",\s*"([^"]+)",\s*"([^"]+)"\]/g);
for (const match of matches) {
  existingDescMap.set(match[1], match[3]);
}

function categorize(title) {
  const t = title.toLowerCase();
  const cats = [];

  if (/\b(coran|quran|sourate|verset|versets|tarawih|récitation|recitation|tajwid|psaumes)\b/i.test(t)) {
    cats.push("Coran");
  }
  if (/\b(prophète|prophetes|prophete|prophètes|ibrahim|moussa|youssef|yousouf|jésus|jesus|\bissa\b|adam|mohammed|muhammad|messager|sira|nouh|soulayman|daoud|ayyoub|zakariya|yahya)\b/i.test(t)) {
    cats.push("Prophètes");
  }
  if (/\b(compagnon|compagnons|sahaba|sahabi|sahabis|abou bakr|othman|khalid ibn al-walid|bilal ibn rabah)\b/i.test(t)) {
    cats.push("Compagnons");
  }
  if (/\b(ange|anges|djinn|djinns|iblis|satan|chaytan|roqya|possession|qarin)\b/i.test(t)) {
    cats.push("Anges & Djinns");
  }
  if (/\b(fin des temps|dajjal|mahdi|apocalypse|jugement dernier|la tombe|paradis|enfer|résurrection|resurrection|la mort|gog|signes)\b/i.test(t)) {
    cats.push("Eschatologie");
  }
  if (/\b(miracle|miracles|science|univers|preuves|preuve|athée|athéisme|athéiste|création|evolution)\b/i.test(t)) {
    cats.push("Miracles du Coran");
  }
  if (/\b(témoignage|temoignage|converti|convertie|conversion|catholique|chrétien|chretien|prêtre|pretre|rabbin|pasteur|moine|devenu|devenue|embrassé|embrasse|ex-athée|ex athée)\b/i.test(t)) {
    cats.push("Héros & Personnages");
  }
  if (cats.length === 0) {
    cats.push("Histoire & Mystère");
  }
  return cats;
}

function cleanTitle(t) {
  return t
    .replace(/["\\]/g, "")
    .trim();
}

function escapeString(str) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// 1. Generate src/data/minuteIslamVideos.ts
const miRawEntries = [];
const miMetaEntries = [];

miVideos.forEach((v, index) => {
  const ytId = v.id;
  const title = cleanTitle(v.title);
  const existingDesc = existingDescMap.get(ytId);
  const description = existingDesc
    ? existingDesc
    : `Rappel et analyse documentaire approfondie par Minute Islam : « ${title} ». Un enseignement clair pour méditer et fortifier sa foi (${v.duration}).`;
  
  const cats = categorize(title);
  const isTrending = index < 15;
  const isNew = index < 25;
  const featured = index === 0;

  miRawEntries.push(
    `  ["${ytId}", "${escapeString(title)}", "${escapeString(description)}"]`
  );

  miMetaEntries.push(
    `  "${ytId}": {\n` +
    `    cats: ${JSON.stringify(cats)},\n` +
    `    year: 2025,\n` +
    `    duration: "${v.duration}",\n` +
    `    featured: ${featured},\n` +
    `    isNew: ${isNew},\n` +
    `    isTrending: ${isTrending}\n` +
    `  }`
  );
});

const miFileContent = `// Export exhaustif des vidéos de la chaîne Minute Islam (>= 10 minutes)
// Total : ${miVideos.length} vidéos cataloguées
import type { Category } from "./catalog";

export type MinuteIslamMetaItem = {
  cats: Category[];
  year: number;
  featured?: boolean;
  isNew?: boolean;
  isTrending?: boolean;
  duration?: string;
};

export const minuteIslamRaw: [string, string, string][] = [
${miRawEntries.join(",\n")}
];

export const minuteIslamMeta: Record<string, MinuteIslamMetaItem> = {
${miMetaEntries.join(",\n")}
};
`;

fs.writeFileSync("./src/data/minuteIslamVideos.ts", miFileContent, "utf-8");
console.log("Successfully generated ./src/data/minuteIslamVideos.ts with", miVideos.length, "videos.");

// 2. Generate src/data/surLeCheminVideos.ts
const slcRawEntries = [];
const slcMetaEntries = [];

slcVideos.forEach((v, index) => {
  const ytId = v.id;
  const title = cleanTitle(v.title);
  const description = `Récit et témoignage captivant de la chaîne Sur le chemin de la prophétie : « ${title} ». Un voyage spirituel bouleversant et inspirant (${v.duration}).`;
  
  const cats = categorize(title);
  const isTrending = index < 20;
  const isNew = index < 35;
  const featured = index === 0;

  slcRawEntries.push(
    `  ["${ytId}", "${escapeString(title)}", "${escapeString(description)}"]`
  );

  slcMetaEntries.push(
    `  "${ytId}": {\n` +
    `    cats: ${JSON.stringify(cats)},\n` +
    `    year: 2025,\n` +
    `    duration: "${v.duration}",\n` +
    `    featured: ${featured},\n` +
    `    isNew: ${isNew},\n` +
    `    isTrending: ${isTrending}\n` +
    `  }`
  );
});

const slcFileContent = `// Export exhaustif des vidéos de la chaîne Sur le chemin de la prophétie (>= 10 minutes)
// Total : ${slcVideos.length} vidéos cataloguées
import type { Category } from "./catalog";

export type SurLeCheminMetaItem = {
  cats: Category[];
  year: number;
  featured?: boolean;
  isNew?: boolean;
  isTrending?: boolean;
  duration?: string;
};

export const surLeCheminRaw: [string, string, string][] = [
${slcRawEntries.join(",\n")}
];

export const surLeCheminMeta: Record<string, SurLeCheminMetaItem> = {
${slcMetaEntries.join(",\n")}
};
`;

fs.writeFileSync("./src/data/surLeCheminVideos.ts", slcFileContent, "utf-8");
console.log("Successfully generated ./src/data/surLeCheminVideos.ts with", slcVideos.length, "videos.");
