import fs from "fs";
import path from "path";

// Load JSON collected from YouTube
const vids = JSON.parse(fs.readFileSync("./dinul_qayyima_videos.json", "utf-8"));
const streams = JSON.parse(fs.readFileSync("./dinul_qayyima_streams.json", "utf-8"));

const all = [...vids];
const seen = new Set(vids.map((v) => v.id));
for (const s of streams) {
  if (!seen.has(s.id)) {
    seen.add(s.id);
    all.push(s);
  }
}

console.log(`Processing ${all.length} videos from @DinulQayyima1 (Institut Din-ul-Qayyima - Mohamed Nadhir)...`);

function cleanTitle(title) {
  return title
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

function detectMeta(title, index) {
  let seriesTitle = undefined;
  let episodeNumber = undefined;
  let seriesId = undefined;
  let cats = ["Histoire & Mystère"];
  let year = 2024;

  if (index < 30) year = 2026;
  else if (index < 120) year = 2025;
  else if (index < 240) year = 2024;
  else year = 2023;

  if (/Nūr al-ʿUyūn|Nur al-Uyun/i.test(title)) {
    seriesId = "nur-al-uyun";
    seriesTitle = "Nūr al-ʿUyūn — Sîra du Prophète ﷺ";
    cats = ["Prophètes", "Histoire & Mystère"];
    const epMatch = title.match(/ép(?:isode)?\s*(\d+)/i) || title.match(/séance\s*(\d+)/i) || title.match(/cours\s*(\d+)/i);
    if (epMatch) episodeNumber = parseInt(epMatch[1], 10);
  } else if (/al-Akhdarī|al-Akhdari|al-Akhḍarī/i.test(title)) {
    seriesId = "al-akhdari";
    seriesTitle = "Mukhtaṣar al-Akhdarī — Fiqh Mālikite";
    cats = ["Histoire & Mystère", "Coran"];
    const epMatch = title.match(/cours\s*(\d+)/i) || title.match(/séance\s*(\d+)/i);
    if (epMatch) episodeNumber = parseInt(epMatch[1], 10);
  } else if (/Musāʿadat al-Ikhwān|Musaadat al-Ikhwan/i.test(title)) {
    seriesId = "musaadat-al-ikhwan";
    seriesTitle = "Musāʿadat al-Ikhwān — Fiqh Mālikite";
    cats = ["Histoire & Mystère", "Coran"];
    const epMatch = title.match(/cours\s*(\d+)/i) || title.match(/séance\s*(\d+)/i);
    if (epMatch) episodeNumber = parseInt(epMatch[1], 10);
  } else if (/Tadhkirat as-Sāmiʿ|Tadhkirat as-Sami/i.test(title)) {
    seriesId = "tadhkirat-as-sami";
    seriesTitle = "Tadhkirat as-Sāmiʿ — Adab & Science";
    cats = ["Héros & Personnages", "Histoire & Mystère"];
    const epMatch = title.match(/séance\s*(\d+)/i) || title.match(/cours\s*(\d+)/i);
    if (epMatch) episodeNumber = parseInt(epMatch[1], 10);
  } else if (/Jawharat|Tawḥīd|Tawhid/i.test(title)) {
    seriesId = "jawharat-at-tawhid";
    seriesTitle = "Jawharat at-Tawḥīd — Croyance Musulmane";
    cats = ["Histoire & Mystère"];
    const epMatch = title.match(/cours\s*(\d+)/i) || title.match(/séance\s*(\d+)/i);
    if (epMatch) episodeNumber = parseInt(epMatch[1], 10);
  } else if (/Tafsīr|Tafsir|Sourate|Juz|Verset/i.test(title)) {
    seriesId = "tafsir-coran";
    seriesTitle = "Tafsīr — Exégèse du Coran";
    cats = ["Coran"];
  } else if (/Muwaṭṭa|Muwatta/i.test(title)) {
    seriesId = "al-muwatta";
    seriesTitle = "Al-Muwaṭṭa de l'Imam Mālik";
    cats = ["Histoire & Mystère", "Héros & Personnages"];
    const epMatch = title.match(/cours\s*(\d+)/i) || title.match(/séance\s*(\d+)/i);
    if (epMatch) episodeNumber = parseInt(epMatch[1], 10);
  } else if (/Nawawī|Nawawi|40 hadith/i.test(title)) {
    seriesId = "40-hadiths-nawawi";
    seriesTitle = "Les 40 Hadiths de l'Imam an-Nawawī";
    cats = ["Héros & Personnages", "Histoire & Mystère"];
    const epMatch = title.match(/hadith\s*(\d+)/i) || title.match(/cours\s*(\d+)/i);
    if (epMatch) episodeNumber = parseInt(epMatch[1], 10);
  } else if (/Prophète|Messager|Muhammad|Sîra|Sira/i.test(title)) {
    cats = ["Prophètes", "Histoire & Mystère"];
  } else if (/Compagnon|Ṣaḥāb|Abou Bakr|Omar|Othmān|Ali|Khaldoun|Ghazali/i.test(title)) {
    cats = ["Compagnons", "Héros & Personnages"];
  } else if (/Mort|Tombe|Jugement|Enfer|Paradis|Fin des temps|Dajjāl|Dajjal/i.test(title)) {
    cats = ["Eschatologie", "Histoire & Mystère"];
  } else if (/Ange|Djinn|Shayṭān|Iblīs|Roqya|Satan/i.test(title)) {
    cats = ["Anges & Djinns"];
  } else if (/Miracle/i.test(title)) {
    cats = ["Miracles du Coran"];
  }

  return { seriesId, seriesTitle, episodeNumber, cats, year };
}

function generateDescription(title, seriesTitle) {
  if (seriesTitle) {
    return `Enseignement dispensé par l'Institut Din-ul-Qayyima (Mohamed Nadhir) dans le cadre de l'étude approfondie de : « ${seriesTitle} ». Analyse des textes classiques, fiqh, compréhension spirituelle et mise en pratique.`;
  }
  return `Enseignement et rappel islamique bénéfique dispensé par Mohamed Nadhir (Institut Din-ul-Qayyima) : « ${title} ». Approfondissement des sciences religieuses, réflexion et guidance.`;
}

// Build TS file content
const rawEntries = [];
const metaEntries = [];

all.forEach((item, index) => {
  const title = cleanTitle(item.title);
  const meta = detectMeta(title, index);
  const desc = generateDescription(title, meta.seriesTitle);

  rawEntries.push(`  ["${item.id}", ${JSON.stringify(title)}, ${JSON.stringify(desc)}]`);

  const metaObj = {
    cats: meta.cats,
    year: meta.year,
    duration: item.duration || "25:00",
    ...(meta.seriesId ? { seriesId: meta.seriesId } : {}),
    ...(meta.seriesTitle ? { seriesTitle: meta.seriesTitle } : {}),
    ...(meta.episodeNumber ? { episodeNumber: meta.episodeNumber } : {}),
    ...(index < 6 ? { isTrending: true } : {}),
    ...(index === 0 ? { featured: true } : {}),
  };

  metaEntries.push(`  "${item.id}": ${JSON.stringify(metaObj)}`);
});

const tsCode = `// Export complet de la chaîne YouTube Din-ul-Qayyima / Mohamed Nadhir (@DinulQayyima1)
// Total : ${all.length} vidéos et cours catalogués avec métadonnées, séries et durées

import type { Category, SkipSegment } from "./catalog";

export type DinulQayyimaMetaItem = {
  cats: Category[];
  year: number;
  featured?: boolean;
  isNew?: boolean;
  isTrending?: boolean;
  duration?: string;
  skipSegments?: SkipSegment[];
  seriesId?: string;
  seriesTitle?: string;
  episodeNumber?: number;
  totalEpisodes?: number;
};

export const dinulQayyimaRaw: [string, string, string][] = [
${rawEntries.join(",\n")}
];

export const dinulQayyimaMeta: Record<string, DinulQayyimaMetaItem> = {
${metaEntries.join(",\n")}
};
`;

fs.writeFileSync("./src/data/dinulQayyimaVideos.ts", tsCode, "utf-8");
console.log(`Generated src/data/dinulQayyimaVideos.ts with ${all.length} videos!`);
