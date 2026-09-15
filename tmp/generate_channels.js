const fs = require("fs");
const data = JSON.parse(fs.readFileSync("/tmp/fetched_channels.json", "utf8"));

function parseDurationToSeconds(str) {
  if (!str || str === "—") return 0;
  if (str.includes(":")) {
    const parts = str.split(":").map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
  }
  return 0;
}

function cleanString(s) {
  return s.replace(/[\n\r\t]+/g, " ").replace(/\\/g, "\\\\").replace(/"/g, "\\\"").trim();
}

function categorize(title) {
  const t = title.toLowerCase();
  const cats = [];
  if (t.includes("coran") || t.includes("sourate") || t.includes("récitation") || t.includes("verset") || t.includes("ayah") || t.includes("tajweed") || t.includes("tajwid") || t.includes("fatiha") || t.includes("baqara")) {
    cats.push("Coran");
  }
  if (t.includes("prophète") || t.includes("messager") || t.includes("sîra") || t.includes("sira") || t.includes("moussa") || t.includes("ibrahim") || t.includes("youssouf") || t.includes("yusuf") || t.includes("jesus") || t.includes("issa") || t.includes("adam") || t.includes("nouh") || t.includes("salih") || t.includes("hud") || t.includes("mohammed") || t.includes("muhammad") || t.includes("sunna") || t.includes("sunnah") || t.includes("prophete")) {
    cats.push("Prophètes");
  }
  if (t.includes("compagnon") || t.includes("sahaba") || t.includes("sahabi") || t.includes("abu bakr") || t.includes("abou bakr") || t.includes("omar") || t.includes("othman") || t.includes("uthman") || t.includes("ali ") || t.includes("aisha") || t.includes("aïcha") || t.includes("khadidja") || t.includes("fatima") || t.includes("khalid") || t.includes("bilal") || t.includes("salman")) {
    cats.push("Compagnons");
  }
  if (t.includes("djinn") || t.includes("ange") || t.includes("iblis") || t.includes("satan") || t.includes("diable") || t.includes("roqya") || t.includes("invisible") || t.includes("possession") || t.includes("sorcellerie") || t.includes("jinn")) {
    cats.push("Anges & Djinns");
  }
  if (t.includes("fin des temps") || t.includes("jugement") || t.includes("dajjal") || t.includes("antéchrist") || t.includes("tombe") || t.includes("mort") || t.includes("enfer") || t.includes("paradis") || t.includes("châtiment") || t.includes("ressusciter") || t.includes("résurrection") || t.includes("mahdi") || t.includes("gog") || t.includes("signes") || t.includes("heure") || t.includes("apocalypse")) {
    cats.push("Eschatologie");
  }
  if (t.includes("miracle") || t.includes("science") || t.includes("univers") || t.includes("création") || t.includes("preuve") || t.includes("médecine") || t.includes("scientifique")) {
    cats.push("Miracles du Coran");
  }
  if (t.includes("savant") || t.includes("cheikh") || t.includes("imam") || t.includes("héros") || t.includes("sheikh") || t.includes("salah ad-din") || t.includes("saladin") || t.includes("tariq") || t.includes("al-andalus") || t.includes("empire") || t.includes("calife") || t.includes("califat") || t.includes("ottoman") || t.includes("personnage") || t.includes("histoire de") || t.includes("guerre") || t.includes("bataille")) {
    cats.push("Héros & Personnages");
  }
  if (cats.length === 0) {
    cats.push("Histoire & Mystère");
  }
  return cats;
}

function generateChannelFile(vids, channelName, exportPrefix, rawName, metaName, defaultDesc) {
  // Filtre >= 10 min
  const filtered = vids.filter(v => parseDurationToSeconds(v.duration) >= 600);
  console.log(`${channelName}: filtered count (>= 10min) = ${filtered.length} / ${vids.length}`);
  
  let code = `// Export exhaustif des vidéos de la chaîne ${channelName} (>= 10 minutes)\n`;
  code += `// Total : ${filtered.length} vidéos cataloguées\n`;
  code += `import type { Category, SkipSegment } from "./catalog";\n\n`;
  code += `export type ${exportPrefix}MetaItem = {\n`;
  code += `  cats: Category[];\n`;
  code += `  year: number;\n`;
  code += `  featured?: boolean;\n`;
  code += `  isNew?: boolean;\n`;
  code += `  isTrending?: boolean;\n`;
  code += `  duration?: string;\n`;
  code += `  skipSegments?: SkipSegment[];\n`;
  code += `};\n\n`;
  code += `export const ${rawName}: [string, string, string][] = [\n`;
  
  for (const v of filtered) {
    const cTitle = cleanString(v.title);
    const desc = cleanString(`${defaultDesc} : « ${v.title} » (${v.duration}). Récits, analyses et enseignements documentés.`);
    code += `  ["${v.id}", "${cTitle}", "${desc}"],\n`;
  }
  
  code += `];\n\nexport const ${metaName}: Record<string, ${exportPrefix}MetaItem> = {\n`;
  
  filtered.forEach((v, index) => {
    const cats = categorize(v.title);
    const isNew = index < 12;
    const isTrending = index >= 12 && index < 25;
    const featured = index === 0;
    
    code += `  "${v.id}": {\n`;
    code += `    cats: ${JSON.stringify(cats)},\n`;
    code += `    year: 2024,\n`;
    code += `    duration: "${v.duration}",\n`;
    if (featured) code += `    featured: true,\n`;
    if (isNew) code += `    isNew: true,\n`;
    if (isTrending) code += `    isTrending: true,\n`;
    code += `  },\n`;
  });
  
  code += `};\n`;
  return { code, count: filtered.length };
}

// 1. Darifton Prod
const dariftonRes = generateChannelFile(
  data.darifton,
  "Darifton Prod",
  "DariftonProd",
  "dariftonProdRaw",
  "dariftonProdMeta",
  "Production et documentaire captivant par Darifton Prod"
);
fs.writeFileSync("src/data/dariftonProdVideos.ts", dariftonRes.code, "utf8");

// 2. L'Islam Simplement
const lislamRes = generateChannelFile(
  data.lislamsimplement,
  "L'Islam Simplement",
  "LislamSimplement",
  "lislamSimplementRaw",
  "lislamSimplementMeta",
  "Explication et enseignement accessible par L'Islam Simplement"
);
fs.writeFileSync("src/data/lislamSimplementVideos.ts", lislamRes.code, "utf8");

// 3. Blue Casquette
const blueRes = generateChannelFile(
  data.bluecasquette,
  "Blue Casquette",
  "BlueCasquette",
  "blueCasquetteRaw",
  "blueCasquetteMeta",
  "Enquête et reportage de société par Blue Casquette"
);
fs.writeFileSync("src/data/blueCasquetteVideos.ts", blueRes.code, "utf8");

console.log("Files created successfully!");
