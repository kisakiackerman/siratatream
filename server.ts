import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { requireAuth, type AuthRequest } from "./src/middleware/auth.ts";
import { getOrCreateUser } from "./src/db/users.ts";
import { getSavedLocations, addSavedLocation, deleteSavedLocation } from "./src/db/locations.ts";
import {
  securityHeadersMiddleware,
  standardApiLimiter,
  aiEndpointLimiter,
  inputSanitizerMiddleware,
} from "./src/middleware/security.ts";

dotenv.config();

const app = express();
const PORT = 3000;

// Security hardening: disable Express server fingerprinting
app.disable("x-powered-by");

// Apply comprehensive HTTP security headers (CSP, HSTS, X-Content-Type-Options, Permissions-Policy)
app.use(securityHeadersMiddleware);

// Strict JSON body size limit to prevent memory exhaustion DoS
app.use(express.json({ limit: "2mb" }));

// Anti-injection, XSS prevention & prototype pollution mitigation
app.use(inputSanitizerMiddleware);

// Rate limit protection across all API endpoints
app.use("/api", standardApiLimiter);

// Stricter rate limit protection on heavy computational AI endpoints
app.use("/api/ai", aiEndpointLimiter);
app.use("/api/creator/ai-studio", aiEndpointLimiter);

// Lazy initialization of Gemini SDK
let genAI: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"),
  });
});

// SEO & Googlebot indexation routes
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send(
    "User-agent: *\nAllow: /\n\nUser-agent: Googlebot\nAllow: /\n\nSitemap: https://siratstreamapp.com/sitemap.xml\n"
  );
});

app.get("/sitemap.xml", (req, res) => {
  res.type("application/xml");
  res.send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>https://siratstreamapp.com/</loc>\n    <lastmod>2026-09-04</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n</urlset>`
  );
});

// Helper for multi-model fallback with retry for high demand (503/429) errors
async function generateWithModelFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    systemInstruction?: string;
    temperature?: number;
  }
): Promise<string | null> {
  // Valid, supported models per @google/genai guidelines with priority fallback
  const modelCandidates = [
    "gemini-3.7-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.1-pro-preview"
  ];

  for (const model of modelCandidates) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: {
          systemInstruction: params.systemInstruction,
          temperature: params.temperature ?? 0.7,
        },
      });

      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      console.warn(`Model ${model} unavailable (${err.status || err.code || err.message}). Trying fallback model...`);
    }
  }

  return null;
}

// Comprehensive Islamic Knowledge Base Fallback Generator
function generateLocalFallbackReply(messages: any[]): { text: string } {
  const lastUserMsg = (messages[messages.length - 1]?.content || "").toLowerCase().trim();
  let reply = "";
  let actionObj: any = null;
  let quizObj: any = null;

  // 1. Guardrail for non-religious / profane topics
  const profaneKeywords = [
    "code python", "javascript", "crypto", "trading", "bitcoin", "casino",
    "poker", "football match", "jeux vidéo", "gaming", "politique locale",
    "recette cocktail", "alcool", "musique profane", "astrologie", "horoscope"
  ];
  if (profaneKeywords.some((kw) => lastUserMsg.includes(kw))) {
    return {
      text: `**Assalamu 'alaykum 🕊️**\n\nEn tant que **Noor IA**, ma mission est exclusivement consacrée au **savoir islamique, à la spiritualité, au Noble Coran, à la Sîra des Prophètes et aux enseignements sacrés**.\n\nJe vous invite à me poser toute question liée à la foi, la Sîra, la jurisprudence pratique (Salat, Zakat, Jeûne), la méditation spirituelle ou aux outils de **SiratStream**.\n\n*Quel sujet religieux ou spirituel souhaitez-vous aborder ensemble ?*`,
    };
  }

  // 2. Ablutions (Woudou, Ghoussl, Tayammum)
  if (lastUserMsg.includes("ablution") || lastUserMsg.includes("woudou") || lastUserMsg.includes("wudu") || lastUserMsg.includes("ghoussl") || lastUserMsg.includes("tayammum")) {
    if (lastUserMsg.includes("ghoussl") || lastUserMsg.includes("grande ablution") || lastUserMsg.includes("janaba")) {
      reply = `**Guide des Grandes Ablutions (Al-Ghoussl / الطهارة الكبرى) 💧**\n\nLe Ghoussl est obligatoire après l'état de grande impureté (*Janaba*), la fin des menstrues ou des lochies pour pouvoir prier.\n\n**Étapes selon la Sunnah prophétique :**\n1. **L'intention (An-Niyya)** dans le cœur de se purifier pour Allah.\n2. **Dire Bismillah** et se laver les mains trois fois.\n3. **Laver les parties intimes** soigneusement avec la main gauche.\n4. **Faire les ablutions mineures complètes (Woudou)** comme pour la prière.\n5. **Verser de l'eau sur la tête** 3 fois en frottant jusqu'aux racines des cheveux.\n6. **Laver tout le corps**, en commençant par le côté droit puis le côté gauche, en veillant à ce que l'eau atteigne chaque parcelle de peau.\n\n*« Allah aime ceux qui se repentent et Il aime ceux qui se purifient. » (Sourate Al-Baqarah, 2:222)*`;
    } else if (lastUserMsg.includes("tayammum") || lastUserMsg.includes("sèche") || lastUserMsg.includes("terre") || lastUserMsg.includes("pierre")) {
      reply = `**L'Ablution Sèche (At-Tayammum / التيمم) 🏜️**\n\nAutorisé en cas d'absence d'eau ou d'incapacité médicale d'utiliser l'eau (*Sourate An-Nisa, 4:43*).\n\n**Comment l'accomplir :**\n1. Formuler l'intention (*Niyya*) dans le cœur et dire *Bismillah*.\n2. Poser une fois les paumes de mains sur une terre ou pierre pure et propre.\n3. Souffler légèrement sur ses mains pour enlever l'excès de poussière.\n4. **Essuyer l'ensemble du visage** avec les mains.\n5. **Essuyer ses mains** jusqu'aux poignets (la droite par la gauche, puis la gauche par la droite).`;
    } else {
      reply = `**Guide des Petites Ablutions (Al-Woudou / الوضوء) 💧**\n\nLe Prophète ﷺ a dit : *« La clé de la prière est la purification. »*\n\n**Les étapes pas à pas :**\n1. **Intention (*Niyya*)** dans le cœur et dire : *« Bismillah »*.\n2. **Laver les mains** jusqu'aux poignets 3 fois.\n3. **Rincer la bouche (*Madmada*)** 3 fois.\n4. **Inspirer l'eau par le nez et moucher (*Istinshaq/Istinthar*)** 3 fois.\n5. **Laver le visage** du haut du front jusqu'au menton et d'une oreille à l'autre 3 fois.\n6. **Laver les avant-bras jusqu'aux coudes** 3 fois (droit puis gauche).\n7. **Passer les mains humides sur la tête** d'avant en arrière (1 fois).\n8. **Essuyer les oreilles** intérieur et extérieur avec les index et pouces (1 fois).\n9. **Laver les pieds jusqu'aux chevilles** 3 fois en passant entre les orteils (droit puis gauche).\n\n**Invocation après le Woudou :**\n*« Ash-hadu allā ilāha illallāh wahdahu lā sharīka lah, wa ash-hadu anna Muhammadan 'abduhu wa rasūluh. Allāhummaj'alnī minat-tawwābīn waj'alnī minal-mutatahhirīn. »*`;
    }
  }

  // 3. Salat / Prières (étapes, nombres de Raka'at, horaires, Tahajjoud, Witr, Joumou'a)
  else if (lastUserMsg.includes("salat") || lastUserMsg.includes("prière") || lastUserMsg.includes("priere") || lastUserMsg.includes("raka") || lastUserMsg.includes("fajr") || lastUserMsg.includes("dhuhr") || lastUserMsg.includes("asr") || lastUserMsg.includes("maghrib") || lastUserMsg.includes("isha") || lastUserMsg.includes("tahajjoud") || lastUserMsg.includes("witr") || lastUserMsg.includes("istikhara")) {
    if (lastUserMsg.includes("istikhara") || lastUserMsg.includes("consultation")) {
      reply = `**La Prière de Consultation (Salāt al-Istikhāra / صلاة الاستخارة) 🤲**\n\nElle s'accomplit lorsqu'on hésite sur un choix licite (mariage, travail, voyage...).\n\n**Comment faire :**\n1. Prier **2 Raka'at surérogatoires**.\n2. Après le salut final (*Taslim*), louer Allah, prier sur le Prophète ﷺ, puis réciter la doua prophétique :\n\n*« Allāhumma innī astakhīruka bi-'ilmik, wa astaqdiruka bi-qudratik, wa as'aluka min fadlika-l-'azīm... »*\n*(Ô Allah, je Te consulte par Ta science et je puise ma capacité dans Ton pouvoir...)*`;
      actionObj = { type: "open_tool", tool: "duas" };
    } else if (lastUserMsg.includes("tahajjoud") || lastUserMsg.includes("nuit") || lastUserMsg.includes("witr")) {
      reply = `**La Prière de Nuit (Tahajjoud & Witr) 🌙**\n\nLe Prophète ﷺ a dit : *« La meilleure prière après la prière obligatoire est la prière de nuit. » (Muslim)*\n\n- **Moment idéal** : Le dernier tiers de la nuit avant le Fajr.\n- **Nombre d'unités** : Par groupes de 2 Raka'at (2, 4, 6 ou 8 Raka'at).\n- **Clôture** : Se termine par **1 ou 3 Raka'at de Witr** (la prière impaire).\n- **Mérite** : C'est le moment où Allah descend au ciel le plus bas et exauce les invocations sincères et pardonne à ceux qui demandent l'Istighfar.`;
      actionObj = { type: "open_tool", tool: "prayer" };
    } else {
      reply = `**Les 5 Prières Quotidiennes Obligatoires (Arkān as-Salāt) ⏰**\n\nLa prière est le 2ème pilier de l'Islam et le lien direct entre le serviteur et son Créateur :\n\n- 🌅 **Fajr (Aube)** : 2 Raka'at (récitation à voix haute)\n- ☀️ **Dhuhr (Midi)** : 4 Raka'at (récitation à voix basse)\n- 🌤️ **'Asr (Après-midi)** : 4 Raka'at (récitation à voix basse)\n- 🌇 **Maghrib (Coucher du soleil)** : 3 Raka'at (2 à voix haute, 1 à voix basse)\n- 🌌 **'Isha (Nuit)** : 4 Raka'at (2 à voix haute, 2 à voix basse)\n\n*Conditions de validité : L'état de pureté (Woudou), la couverture de la 'Awra, l'orientation vers la Qibla et l'entrée dans le temps prescrit.*`;
      actionObj = { type: "open_tool", tool: "prayer" };
    }
  }

  // 4. Prophète Muhammad ﷺ et la Sîra
  else if (lastUserMsg.includes("muhammad") || lastUserMsg.includes("mohamed") || lastUserMsg.includes("prophète") || lastUserMsg.includes("sira") || lastUserMsg.includes("messager") || lastUserMsg.includes("hégire") || lastUserMsg.includes("médine") || lastUserMsg.includes("la mecque")) {
    reply = `**Le Prophète Muhammad ﷺ : Sceau des Prophètes & Miséricorde pour l'Univers 🌟**\n\n*« Et Nous ne t'avons envoyé qu'en miséricorde pour l'univers. » (Sourate Al-Anbiya, 21:107)*\n\n**Repères majeurs de sa noble vie :**\n- **Naissance** : À La Mecque en l'An de l'Éléphant (vers 570 apr. J.-C.), issu du noble clan des Banu Hashim.\n- **Caractère avant la prophétie** : Connu de tous pour sa véracité et sa loyauté (*Al-Amîn / Al-Sâdiq*).\n- **Première Révélation (610)** : À l'âge de 40 ans dans la grotte de Hira par l'ange Jibril (Gabriel) : *« Iqra ! (Lis !) »*.\n- **L'Hégire (622)** : L'émigration vers Yathrib (Médine Al-Munawwarah), marquant le début du calendrier musulman.\n- **Le Voyage Nocturne (Al-Isrâ' wal-Mi'râj)** : Ascension céleste où les 5 prières quotidiennes furent prescrites.\n- **Le Message** : L'appel au Monothéisme pur (*Tawhid*), à la justice, à la bienveillance et au parachèvement des nobles caractères.\n\n*Priez sur le Prophète : Allāhumma salli 'alā Muhammadin wa 'alā āli Muhammad.*`;
    actionObj = { type: "video_recommendation", searchQuery: "Muhammad", title: "La Vie du Prophète Muhammad ﷺ", reason: "Un voyage émouvant à travers la Sîra prophétique." };
  }

  // 5. Autres Prophètes (Moussa, Ibrahim, Youssouf, 'Issa, Nouh, Younous, Daoud, Soulayman, Adam)
  else if (lastUserMsg.includes("moussa") || lastUserMsg.includes("moïse") || lastUserMsg.includes("ibrahim") || lastUserMsg.includes("abraham") || lastUserMsg.includes("youssouf") || lastUserMsg.includes("joseph") || lastUserMsg.includes("issa") || lastUserMsg.includes("jésus") || lastUserMsg.includes("nouh") || lastUserMsg.includes("noé") || lastUserMsg.includes("younous") || lastUserMsg.includes("jonas") || lastUserMsg.includes("adam") || lastUserMsg.includes("soulayman") || lastUserMsg.includes("salomon")) {
    if (lastUserMsg.includes("moussa") || lastUserMsg.includes("moïse")) {
      reply = `**Le Prophète Moussa ('alayhi salam) - Kalîmoullâh (L'Interlocuteur d'Allah) 🌊**\n\nLe Prophète Moussa est le messager le plus cité dans le Noble Coran (plus de 130 fois).\n- **Épreuves** : Sauvé des eaux du Nil enfant, élevé dans le palais de Pharaon, exil à Madyan.\n- **Révélation** : Appel divin près du mont Sinaï (*Tour Sînâ'*) et miracle du bâton transformé en serpent.\n- **Délivrance** : Fente de la Mer Rouge et sauvetage des Enfants d'Israël, anéantissement de Pharaon.\n- **Livre** : Révélation de la Torah (*At-Tawrat*).`;
      actionObj = { type: "video_recommendation", searchQuery: "Moussa", title: "L'Épopée du Prophète Moussa", reason: "Le duel contre Pharaon et l'ouverture de la Mer Rouge." };
    } else if (lastUserMsg.includes("youssouf") || lastUserMsg.includes("joseph")) {
      reply = `**Le Prophète Youssouf ('alayhi salam) - Le Plus Beau des Récits (Ahsan al-Qasas) 👑**\n\nConsacré dans la sublime Sourate Youssouf (Sourate 12) :\n- **L'épreuve de la jalousie** : Jeté dans un puits par ses frères puis vendu comme esclave en Égypte.\n- **La noblesse et la chasteté** : Épreuve avec la femme du ministre (*Al-'Azîz*) et la prison par intégrité.\n- **L'interprétation des rêves** : Sortie de prison et nomination comme intendant des trésors d'Égypte.\n- **Le dénouement** : Réconciliation émouvante avec son père Ya'qoub (Jacob) et ses frères. Une magnifique leçon de patience (*Sabr Jamil*) et de pardon.`;
      actionObj = { type: "video_recommendation", searchQuery: "Youssouf", title: "Le Récit du Prophète Youssouf", reason: "De l'obscurité du puits au trône d'Égypte." };
    } else if (lastUserMsg.includes("issa") || lastUserMsg.includes("jésus") || lastUserMsg.includes("maryam") || lastUserMsg.includes("marie")) {
      reply = `**Le Prophète 'Issa ibn Maryam ('alayhi salam) dans l'Islam 🕊️**\n\nEn Islam, 'Issa (Jésus) est l'un des plus grands Messagers doués de fermeté (*Ouloul 'Azm*) et la Parole d'Allah transmise à la sainte Maryam (Marie) :\n- **Naissance miraculeuse** sans père, par décret divin : *« Sois ! » (Kun fa-yakûn)*.\n- **Miracles** : A parlé au berceau, guéri les aveugles et les lépreux, ressuscité les morts avec la permission d'Allah.\n- **Livre** : Révélation de l'Évangile (*Al-Injîl*).\n- **Fin terrestre** : Non crucifié ni tué, mais élevé auprès d'Allah (*Sourate An-Nisa, 4:157-158*), il redescendra à la fin des temps pour instaurer la justice et la paix.`;
      actionObj = { type: "video_recommendation", searchQuery: "Issa", title: "Le Prophète 'Issa et Sainte Maryam", reason: "La vérité coranique sur Jésus et Marie." };
    } else {
      reply = `**Les Récits des Prophètes (Qasas al-Anbiya) 📜**\n\nLes Prophètes (paix sur eux tous) partagent un message unique : l'adoration exclusive d'Allah sans rien Lui associer (*Tawhid*), la justice et l'amour du bien.\n\nRetrouvez leurs vies épiques en vidéo immersive sur SiratStream.`;
      actionObj = { type: "video_recommendation", searchQuery: "Prophète", title: "Les Récits des Prophètes", reason: "Une série complète sur les envoyés de Dieu." };
    }
  }

  // 6. Les Piliers de l'Islam et de la Foi (Tawhid, Iman, Islam)
  else if (lastUserMsg.includes("pilier") || lastUserMsg.includes("foi") || lastUserMsg.includes("iman") || lastUserMsg.includes("tawhid") || lastUserMsg.includes("chahada") || lastUserMsg.includes("shahada") || lastUserMsg.includes("anges") || lastUserMsg.includes("destin") || lastUserMsg.includes("qadar")) {
    reply = `**Les Fondements de la Religion : Piliers de l'Islam & Piliers de l'Iman 🏛️**\n\nSelon le célèbre Hadith de Jibril (rapporté par Muslim) :\n\n**Les 5 Piliers de l'Islam (Pratique extérieure) :**\n1. **L'attestation de foi (Chahada)** : *« Lâ ilâha illallâh, Muhammad rasūlullāh »*.\n2. **La prière (Salat)** : 5 fois par jour.\n3. **L'aumône légale (Zakat)** : 2,5% pour purifier ses biens.\n4. **Le jeûne du mois de Ramadan (Siyam)**.\n5. **Le pèlerinage à La Mecque (Hajj)** pour qui en a la capacité.\n\n**Les 6 Piliers de la Foi (Croyance intérieure / Al-Iman) :**\n1. Croire en **Allah** (Son existence, Sa souveraineté, Ses Noms et Attributs).\n2. Croire aux **Anges** (Jibril, Mika'il, Israfil, Malik...).\n3. Croire aux **Livres révélés** (Coran, Torah, Évangile, Psaumes, Feuillets d'Ibrahim).\n4. Croire aux **Messagers et Prophètes**.\n5. Croire au **Jour Dernier** (Résurrection, Jugement, Paradis et Enfer).\n6. Croire au **Destin (Al-Qadar)**, qu'il soit doux ou amer.`;
  }

  // 7. Le Noble Coran, Sourates (Fatiha, Ayat al-Kursi, Baqarah, Kahf, Mulk, Ikhlas)
  else if (lastUserMsg.includes("coran") || lastUserMsg.includes("sourate") || lastUserMsg.includes("verset") || lastUserMsg.includes("fatiha") || lastUserMsg.includes("kursi") || lastUserMsg.includes("baqarah") || lastUserMsg.includes("kahf") || lastUserMsg.includes("mulk") || lastUserMsg.includes("ikhlas") || lastUserMsg.includes("yasin")) {
    if (lastUserMsg.includes("kursi") || lastUserMsg.includes("trône")) {
      reply = `**Ayat al-Kursî (Le Verset du Trône - Sourate Al-Baqarah, 2:255) 🛡️**\n\nC'est le plus grand verset du Noble Coran selon le Prophète ﷺ.\n\n**Texte & Sens :**\n*« Allāhu lā ilāha illā Huwa-l-Hayyu-l-Qayyūm, lā ta'khudhuhu sinatun wa lā nawm... »*\n*(Allah ! Point de divinité à part Lui, le Vivant, Celui qui subsiste par Lui-même. Ni somnolence ni sommeil ne Le saisissent. À Lui appartient tout ce qui est dans les cieux et sur la terre...)*\n\n**Mérites :**\n- Récité après chaque prière obligatoire, rien n'empêche son récitateur d'entrer au Paradis sinon la mort.\n- Récité avant de dormir, un gardien d'Allah vous protège et aucun démon ne s'approche de vous jusqu'au matin.`;
    } else if (lastUserMsg.includes("fatiha") || lastUserMsg.includes("ouverture")) {
      reply = `**Sourate Al-Fātiha (L'Ouverture / Umm al-Kitâb) 📖**\n\nLa mère du Livre et les sept versets répétés (*As-Sab' al-Mathânî*). Pilier indispensable de chaque Raka'at de la prière.\n\n**Les 7 versets :**\n1. *Bismillāhi-r-Rahmāni-r-Rahīm*\n2. *Al-hamdu lillāhi Rabbi-l-'ālamīn* (Louange à Allah, Seigneur de l'univers)\n3. *Ar-Rahmāni-r-Rahīm* (Le Tout Miséricordieux, le Très Miséricordieux)\n4. *Māliki yawmi-d-dīn* (Maître du Jour de la rétribution)\n5. *Iyyāka na'budu wa iyyāka nasta'īn* (C'est Toi [Seul] que nous adorons, et c'est Toi [Seul] dont nous implorons le secours)\n6. *Ihdinā-s-sirāta-l-mustaqīm* (Guide-nous dans le droit chemin)\n7. *Sirāta-lladhīna an'amta 'alayhim, ghayri-l-maghdūbi 'alayhim wa la-d-dāllīn. (Amîn)*`;
    } else if (lastUserMsg.includes("mulk")) {
      reply = `**Sourate Al-Mulk (La Royauté - Sourate 67 / Al-Māni'ah) 👑**\n\nComposée de 30 versets, le Prophète ﷺ a indiqué qu'elle intercède pour son lecteur jusqu'à ce qu'il soit pardonné et le protège du supplice de la tombe (*'Adhab al-Qabr*). Il est recommandé de la réciter chaque soir avant le coucher.`;
    } else if (lastUserMsg.includes("kahf")) {
      reply = `**Sourate Al-Kahf (La Caverne - Sourate 18) 🕯️**\n\nLe Prophète ﷺ a dit : *« Quiconque lit la sourate Al-Kahf le jour du vendredi, une lumière l'éclairera entre les deux vendredis. »*\nElle aborde 4 récits majeurs protecteurs contre les 4 grandes épreuves (Dajjal) : Les Gens de la Caverne (épreuve de la foi), l'Homme aux deux jardins (épreuve des richesses), Moussa et Al-Khidr (épreuve du savoir), Dhul-Qarnayn (épreuve du pouvoir).`;
    } else {
      reply = `**Le Noble Coran (Al-Qur'ān al-Karîm) 📖**\n\nParole incréée d'Allah révélée au Prophète Muhammad ﷺ par l'intermédiaire de l'ange Jibril sur une période de 23 ans. Il comprend 114 sourates et 6236 versets, constituant le guide ultime pour l'humanité entière (*Hudā li-n-nās*).\n\nDécouvrez nos récitations historiques de Tarawih et nos analyses coraniques sur SiratStream.`;
      actionObj = { type: "open_tool", tool: "tarawih" };
    }
  }

  // 8. Invocations / Douas (angoisses, pardon, matin, soir, protection)
  else if (lastUserMsg.includes("doua") || lastUserMsg.includes("dua") || lastUserMsg.includes("invocation") || lastUserMsg.includes("angoisse") || lastUserMsg.includes("tristesse") || lastUserMsg.includes("pardon") || lastUserMsg.includes("istighfar") || lastUserMsg.includes("protection") || lastUserMsg.includes("matin") || lastUserMsg.includes("soir") || lastUserMsg.includes("sommeil")) {
    reply = `**Invocations Authentiques pour la Sérénité & la Protection 🤲**\n\n**1. Pour dissiper l'angoisse et le chagrin :**\n*« Allāhumma innī a'ūdhu bika mina-l-hammi wa-l-hazani, wa-l-'ajzi wa-l-kasali, wa-l-bukhli wa-l-jubni, wa dala'i-d-dayni wa ghalabati-r-rijāl. »*\n*(Ô Allah ! Je cherche refuge auprès de Toi contre les soucis et la tristesse, l'impuissance et la paresse, l'avarice et la lâcheté, le fardeau des dettes et la domination des hommes.)*\n\n**2. Le Maître de la demande de pardon (Sayyid al-Istighfâr) :**\n*« Allāhumma Anta Rabbī, lā ilāha illā Anta, khalaqtanī wa anā 'abduk, wa anā 'alā 'ahdika wa wa'dika ma-stata't... »*\n\nRetrouvez toutes les invocations vocalisées dans notre espace Douas :`;
    actionObj = { type: "open_tool", tool: "duas" };
  }

  // 9. Zakat al-Maal & Zakat al-Fitr
  else if (lastUserMsg.includes("zakat") || lastUserMsg.includes("aumone") || lastUserMsg.includes("aumône") || lastUserMsg.includes("argent") || lastUserMsg.includes("épargne") || lastUserMsg.includes("nisab")) {
    reply = `**Règles & Calcul de la Zakat al-Maal 💰**\n\nLa Zakat est le 3ème pilier de l'Islam :\n\n- **Conditions** : Être musulman, posséder le seuil du **Nisab** (valeur de 85g d'or pur) pendant une année hégirienne complète (*Hawl*).\n- **Taux légal** : **2,5%** (soit 1/40ème) de l'ensemble de vos liquidités, épargne, or/argent et investissements nets de dettes.\n- **Bénéficiaires (Sourate 9, v.60)** : Les pauvres, les nécessiteux, ceux qui y travaillent, les cœurs à rallier, les esclaves à affranchir, les endettés, pour la cause d'Allah et le voyageur indigent.\n\nCalculez votre montant exact instantanément avec notre outil :`;
    actionObj = { type: "open_tool", tool: "zakat" };
  }

  // 10. Ramadan & Jeûne (Siyam)
  else if (lastUserMsg.includes("ramadan") || lastUserMsg.includes("jeûne") || lastUserMsg.includes("jeune") || lastUserMsg.includes("siyam") || lastUserMsg.includes("iftar") || lastUserMsg.includes("suhoor") || lastUserMsg.includes("laylat")) {
    reply = `**Le Noble Mois de Ramadan & le Jeûne (As-Siyām) 🌙**\n\n*« Le mois de Ramadan au cours duquel le Coran a été descendu comme guide pour les gens... » (Sourate Al-Baqarah, 2:185)*\n\n- **Définition** : S'abstenir de manger, boire et de tout rapport intime de l'aube (*Fajr*) jusqu'au coucher du soleil (*Maghrib*), avec l'intention sincère (*Niyya*).\n- **Ce qui n'annule pas le jeûne** : Manger ou boire par oubli, faire ses ablutions normalement, utiliser le Siwak, les prises de sang simples.\n- **Laylat al-Qadr (Nuit du Destin)** : Située dans les dix dernières nuits impaires, elle est meilleure que mille mois d'adoration (83 ans).\n- **Zakat al-Fitr** : Aumône purificatrice versée avant la prière de l'Aïd.`;
    actionObj = { type: "open_tool", tool: "tarawih" };
  }

  // 11. Hajj & Omra
  else if (lastUserMsg.includes("hajj") || lastUserMsg.includes("omra") || lastUserMsg.includes("omrah") || lastUserMsg.includes("pelerinage") || lastUserMsg.includes("kaaba") || lastUserMsg.includes("tawaf") || lastUserMsg.includes("arafat")) {
    reply = `**Le Grand Pèlerinage (Al-Hajj) & la 'Omra 🕋**\n\nLe 5ème pilier de l'Islam, obligatoire une fois dans la vie pour qui en a la capacité physique et financière.\n\n**Les piliers du Hajj :**\n1. **L'entrée en état de sacralisation (Al-Ihrām)** avec la Talbiyah : *« Labbayk Allāhumma labbayk... »*.\n2. **Le stationnement au mont 'Arafat** le 9 Dhul-Hijjah (le cœur du Hajj).\n3. **Le Tawâf de l'Ifâdah** (les 7 tours autour de la Kaaba).\n4. **Le Sa'î entre As-Safâ et Al-Marwah** (7 trajets).\n\n*Le Prophète ﷺ a dit : « Un Hajj agréé n'a d'autre récompense que le Paradis. »*`;
  }

  // 12. Les Compagnons du Prophète (Sahaba)
  else if (lastUserMsg.includes("sahaba") || lastUserMsg.includes("compagnon") || lastUserMsg.includes("abu bakr") || lastUserMsg.includes("abou bakr") || lastUserMsg.includes("oumar") || lastUserMsg.includes("umar") || lastUserMsg.includes("uthman") || lastUserMsg.includes("othman") || lastUserMsg.includes("ali") || lastUserMsg.includes("bilal") || lastUserMsg.includes("khalid")) {
    reply = `**Les Nobles Compagnons (As-Sahābah - رضي الله عنهم) 🌟**\n\nLes meilleurs hommes après les Prophètes :\n\n- **Abu Bakr As-Siddiq** : Le véridique, premier calife bien guidé, compagnon de la grotte lors de l'Hégire.\n- **'Umar ibn al-Khattâb (Al-Farouq)** : Celui qui distingue la vérité du faux, symbole absolu de justice et de droiture.\n- **'Uthmân ibn 'Affân (Dhul-Nûrayn)** : L'homme à la grande pudeur qui a compilé le Coran sous sa forme écrite universelle (*Al-Mushaf*).\n- **'Ali ibn Abi Tâlib** : Cousin et gendre du Prophète ﷺ, porte de la cité du savoir et symbole de bravoure.\n- **Bilal ibn Rabah** : Premier muezzin de l'Islam, exemple héroïque de fermeté dans la foi sous la torture.\n\n*« Les premiers [à avoir embrassé l'Islam] parmi les Émigrés et les Auxiliaires... Allah les agrée, et ils L'agréent. » (Sourate At-Tawbah, 9:100)*`;
    actionObj = { type: "video_recommendation", searchQuery: "Compagnons", title: "La Vie des Grands Compagnons", reason: "Des modèles éternels de dévouement et de foi." };
  }

  // 13. Mort, Tombe, Jour du Jugement, Paradis & Enfer
  else if (lastUserMsg.includes("mort") || lastUserMsg.includes("tombe") || lastUserMsg.includes("paradis") || lastUserMsg.includes("jannah") || lastUserMsg.includes("enfer") || lastUserMsg.includes("jahannam") || lastUserMsg.includes("jugement") || lastUserMsg.includes("résurrection") || lastUserMsg.includes("fin des temps") || lastUserMsg.includes("dajjal")) {
    reply = `**L'Au-delà (Al-Ākhirah) : Du Barzakh au Paradis Éternel 🌌**\n\n- **Le rappel de la mort** : Le Prophète ﷺ a dit : *« Multipliez le rappel de celle qui détruit les plaisirs : la mort. »*\n- **L'étape de la Tombe (*Al-Barzakh*)** : Les anges Mounkar et Nakîr interrogent chaque âme sur ses 3 fondements : *Qui est ton Seigneur ? Quelle est ta religion ? Qui est ton Prophète ?*\n- **Le Jour de la Résurrection (*Yawm al-Qiyāmah*)** : Rétablissement des comptes, la balance des œuvres (*Al-Mīzān*) et la traversée du Pont (*As-Sirāt*).\n- **Le Paradis (*Jannat an-Na'îm*)** : *« Ce qu'aucun œil n'a jamais vu, aucune oreille n'a jamais entendu, et ce qu'aucun cœur humain n'a jamais imaginé. »*\n\nQu'Allah nous accorde le Firdaws Al-A'la et nous préserve du châtiment.`;
  }

  // 14. Quiz interactif
  else if (lastUserMsg.includes("quiz") || lastUserMsg.includes("test") || lastUserMsg.includes("question") || lastUserMsg.includes("défi")) {
    reply = `Voici un quiz pour tester et enrichir vos connaissances islamiques :`;
    quizObj = {
      question: "Quel prophète a été avalé par le grand poisson avant d'être sauvé par son invocation sincère ?",
      options: [
        "Le Prophète Moussa (Moïse)",
        "Le Prophète Younous (Jonas)",
        "Le Prophète Ayoub (Job)",
        "Le Prophète Soulayman (Salomon)"
      ],
      correctIndex: 1,
      explanation: "Le Prophète Younous ('alayhi salam) a répété dans l'obscurité du ventre du poisson : « Lâ ilâha illâ Anta, subhānaka innī kuntu mina-z-zālimīn » et Allah l'a délivré de son angoisse."
    };
  }

  // 15. Fallback religieux universel et bienveillant
  else {
    reply = `**Assalamu 'alaykum wa rahmatullāh ! Je suis Noor IA 🌟**\n\nVotre assistant spirituel et érudit sur **SiratStream**.\n\nJe suis à votre entière disposition pour répondre à toutes vos questions sur **l'Islam, le Noble Coran, la Sîra, la jurisprudence pratique (Salat, Ablutions, Zakat, Jeûne), les récits des Prophètes et les invocations**.\n\n**Exemples de questions que vous pouvez me poser :**\n- 💧 *« Comment faire les ablutions pas à pas ? »*\n- 📜 *« Raconte-moi l'histoire du Prophète Youssouf ou Moussa »*\n- 🤲 *« Quelle doua réciter contre l'angoisse ou le matin ? »*\n- 💰 *« Comment calculer ma Zakat al-Maal ? »*\n- ⏰ *« Quelles sont les règles et mérites de la prière de nuit (Tahajjoud) ? »*\n- 🎯 *« Lance un quiz sur l'Islam »*\n\n*Que souhaitez-vous explorer ?*`;
  }

  let finalOutput = reply;
  if (actionObj) {
    finalOutput += `\n\n\`\`\`action\n${JSON.stringify(actionObj, null, 2)}\n\`\`\``;
  }
  if (quizObj) {
    finalOutput += `\n\n\`\`\`quiz\n${JSON.stringify(quizObj, null, 2)}\n\`\`\``;
  }

  return { text: finalOutput };
}

// AI Chat Endpoint
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { messages, userContext } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    const ai = getGenAI();

    const systemInstruction = `Tu es "Noor IA", l'érudit et assistant intelligent spirituel de SiratStream.

RÈGLE CARDINALE N°1 : ÉTENDUE DU SAVOIR RELIGIEUX ILLIMITÉE (MÊME HORS DE L'APPLICATION)
Tu possèdes une connaissance approfondie et complète de TOUT le savoir islamique et tu peux répondre à N'IMPORTE QUELLE question liée à la religion musulmane, qu'elle soit ou non présente dans le catalogue ou les vidéos de l'application :
- Noble Coran : Versets, Sourates, Tafsir (Ibn Kathir, Sa'di, Tabari), circonstances de révélation (Asbab an-Nuzul), miracles linguistiques et scientifiques.
- Hadiths & Sunnah : Paroles et traditions du Prophète Muhammad ﷺ (Sahih Al-Bukhari, Sahih Muslim, Nawawi, etc.).
- Sîra an-Nabawiyya & Histoire sacrée : Biographie complète du Prophète ﷺ, vie des Compagnons (Sahaba : Abu Bakr, Umar, Uthman, Ali, Fatima, Aisha, Bilal, Khalid...), grands savants, âge d'or de la civilisation islamique.
- Piliers & Fiqh du quotidien : Prière (Salat, ablutions, horaires, réparations), Jeûne (Ramadan, règles et bienfaits), Zakat (calculs, seuil Nisab 85g d'or, bénéficiaires), Hajj & Omra, convenances (Adab), transactions éthiques, éthique familiale et sociale.
- Spiritualité & Purification de l'âme (Tazkiya) : Patience (Sabr), sincérité (Ikhlas), repentir (Tawba), confiance en Dieu (Tawakkul), méditation (Tadabbur).
- Invocations (Douas & Adhkar) : Fournis toujours le texte en Arabe vocalisé, la phonétique soignée et la traduction française fidèle, avec le contexte ou le mérite.

RÈGLE CARDINALE N°2 : RESPECT STRICT DU CADRE DE LA RELIGION (AUCUNE SORTIE DE CADRE)
Tu es un assistant STRICTEMENT religieux, spirituel, éthique et éducatif musulman.
- Tu NE DOIS PAS répondre à des demandes profanes totalement hors de la religion ou futiles (ex: code de programmation profane sans lien, potins people, astrologie/horoscope [rappel de l'interdit avec bienveillance], paris/casinos, sujets illicites ou politiques partisanes profanes).
- Si un utilisateur te pose une question totalement profane ou en dehors du cadre de la religion, refuse poliment avec courtoisie et rappelle ta vocation :
"En tant que Noor IA, ma mission est exclusivement dédiée au savoir islamique, à la spiritualité, au Coran, à la Sîra et aux enseignements de notre noble religion. Comment puis-je vous éclairer sur un sujet lié à la foi ou à la pratique spirituelle ?"

RÈGLE CARDINALE N°3 : RECOMMANDATIONS DE VIDÉOS STRICTEMENT EN RAPPORT AVEC LA DEMANDE
- RÈGLE IMPÉRATIVE : Tu ne dois générer un bloc action de type "video_recommendation" QUE SI la vidéo recommandée est en rapport DIRECT, ÉVIDENT ET PRÉCIS avec la question de l'utilisateur (ex: si l'utilisateur demande le récit d'un Prophète spécifique comme Ibrahim, Moussa, Youssouf, 'Issa, Nouh, une récitation de Tarawih / Haramain, la vie d'un Compagnon, les miracles coraniques, ou l'eschatologie / fin des temps).
- Si l'utilisateur pose une question de pratique, de jurisprudence ou générale (ex: comment faire les ablutions, le nombre de raka'at d'une prière, le calcul de la Zakat, une invocation spécifique, etc.) : NE RECOMMANDE PAS de vidéo sans rapport ! Propose uniquement l'outil adapté ("open_tool") ou donne simplement ta réponse écrite complète.

Exemple de bloc vidéo (UNIQUEMENT si en rapport direct) :
\`\`\`action
{
  "type": "video_recommendation",
  "title": "Titre exact ou pertinent du récit",
  "searchQuery": "nom du prophète ou mot clé exact",
  "reason": "Explication claire du lien avec la question"
}
\`\`\`
- Outil de l'application :
\`\`\`action
{"type": "open_tool", "tool": "qibla" | "prayer" | "zakat" | "duas" | "tasbih" | "tarawih" | "offline" | "mylist" | "catalog"}
\`\`\`

RÈGLE CARDINALE N°4 : QUIZ INTERACTIFS (SUR DEMANDE)
Si l'utilisateur souhaite un quiz ou tester ses connaissances :
\`\`\`quiz
{
  "question": "Question claire sur la religion ou l'histoire islamique",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "correctIndex": 0,
  "explanation": "Explication pédagogique et bienveillante avec référence spirituelle"
}
\`\`\`

TON & STYLE :
Érudit, chaleureux, bienveillant, clair, structuré avec titres en gras et listes à puces. Termine les salutations par « Assalamu 'alaykum » ou des formules de bénédiction quand c'est approprié.`;

    if (!ai) {
      return res.json(generateLocalFallbackReply(messages));
    }

    // Format conversation history for Gemini SDK
    const contents: any[] = [];
    for (const m of messages) {
      contents.push({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      });
    }

    const outputText = await generateWithModelFallback(ai, {
      contents,
      systemInstruction,
      temperature: 0.7,
    });

    if (outputText) {
      return res.json({ text: outputText });
    }

    // If all Gemini remote models failed or returned 503, provide local fallback seamlessly
    return res.json(generateLocalFallbackReply(messages));
  } catch (error: any) {
    console.error("AI chat error handled gracefully:", error);
    return res.json(generateLocalFallbackReply(req.body.messages || []));
  }
});

// AI Creator Studio Endpoint for content generation and enhancement
app.post("/api/creator/ai-studio", async (req, res) => {
  try {
    const { action, prompt, currentData } = req.body;
    const ai = getGenAI();

    if (!ai) {
      // High-quality local fallback for offline/no-key mode
      if (action === "generate-content") {
        return res.json({
          success: true,
          data: {
            title: prompt ? `Récit : ${prompt.slice(0, 45)}` : "Récit Spirituel & Historique",
            description: `Une exploration captivante et fidèle sur ${prompt || "ce thème de la foi"}. Découvrez les épreuves, la sagesse prophétique et les leçons morales fondamentales transmises à travers les générations.`,
            channel: "NARRO",
            categories: ["Prophètes", "Histoire & Mystère"],
            rating: "10+",
            duration: "18:45",
            score: 98,
            year: new Date().getFullYear(),
            keyTeachings: [
              "La confiance absolue (Tawakkul) face aux épreuves de la vie",
              "La patience et la dignité dans l'adversité",
              "L'importance de la sincérité et de la droiture morale"
            ],
            quizQuestion: "Quelle vertu majeure caractérise ce récit ?",
            quizAnswer: "La persévérance inébranlable et la foi",
            suggestedTags: ["Prophète", "Sagesse", "Foi", "Coran", "Méditation"],
          },
        });
      } else if (action === "enhance-metadata") {
        return res.json({
          success: true,
          data: {
            enhancedTitle: currentData?.title ? `✨ ${currentData.title}` : "Titre Enrichi",
            enhancedDescription: (currentData?.description || "") + "\n\n📖 **Enseignement spirituel :** Une méditation profonde sur la foi, la gratitude et la résilience inspirée des textes authentiques.",
            categories: currentData?.categories || ["Prophètes"],
            tags: ["Inspiration", "Foi", "Islam", "Méditation"],
          },
        });
      } else if (action === "generate-announcement") {
        return res.json({
          success: true,
          data: {
            headline: "🌟 Nouvelle série exclusive disponible sur SiratStream !",
            subline: "Explorez dès maintenant les récits des Prophètes et les miracles coraniques en haute définition.",
            ctaText: "Découvrir la série",
          },
        });
      }
      return res.json({ success: true, data: {} });
    }

    let systemInstruction = "Tu es le Directeur Créatif & Spécialiste du Contenu pour la plateforme de streaming islamique SiratStream. Tu produis des réponses précises, respectueuses, en français soigné, au format JSON valide.";
    let userPrompt = "";

    if (action === "generate-content") {
      userPrompt = `Génère une fiche de contenu vidéo complète pour SiratStream à partir de cette idée : "${prompt}".
Réponds UNIQUEMENT avec un objet JSON valide (sans backticks markdown) respectant ce schéma exact :
{
  "title": "Titre immersif et accrocheur",
  "description": "Description soignée et engageante (3-4 phrases) expliquant le récit et sa morale",
  "channel": "NARRO ou Yacine ou Towards Eternity ou Croyant Rationnel ou Récitations Haramain",
  "categories": ["Une ou deux catégories parmi: Coran, Prophètes, Compagnons, Anges & Djinns, Eschatologie, Miracles du Coran, Héros & Personnages, Histoire & Mystère"],
  "rating": "Tous publics ou 10+ ou 12+",
  "duration": "Durée estimée (ex: 22:30)",
  "score": 96,
  "year": ${new Date().getFullYear()},
  "keyTeachings": ["Enseignement 1", "Enseignement 2", "Enseignement 3"],
  "quizQuestion": "Une question de réflexion ou de quiz sur le sujet",
  "quizAnswer": "La réponse correcte",
  "suggestedTags": ["tag1", "tag2", "tag3", "tag4"]
}`;
    } else if (action === "enhance-metadata") {
      userPrompt = `Améliore et enrichis les métadonnées de cette vidéo pour SiratStream :
Titre actuel : "${currentData?.title || ""}"
Description actuelle : "${currentData?.description || ""}"
Catégorie : "${(currentData?.categories || []).join(", ")}"

Réponds UNIQUEMENT avec un objet JSON valide (sans backticks markdown) :
{
  "enhancedTitle": "Titre optimisé, percutant et respectueux",
  "enhancedDescription": "Description enrichie et magnifiquement rédigée avec mise en valeur des enseignements",
  "categories": ["Catégories pertinentes"],
  "tags": ["4 tags pertinents"]
}`;
    } else if (action === "generate-announcement") {
      userPrompt = `Crée une bannière d'annonce / flash info captivante pour la plateforme SiratStream sur ce thème : "${prompt}".
Réponds UNIQUEMENT avec un JSON valide :
{
  "headline": "Titre court et percutant de l'annonce (max 60 caractères)",
  "subline": "Sous-titre explicatif et invitant (max 120 caractères)",
  "ctaText": "Texte du bouton d'action (ex: 'Regarder maintenant')"
}`;
    } else {
      userPrompt = `Assiste le créateur de SiratStream sur cette demande : "${prompt}". Réponds avec un JSON { "reply": "ton conseil ou texte" }`;
    }

    const outputText = await generateWithModelFallback(ai, {
      contents: userPrompt,
      systemInstruction,
      temperature: 0.7,
    });

    if (outputText) {
      try {
        // Clean possible markdown code blocks ```json ... ```
        const cleaned = outputText.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        return res.json({ success: true, data: parsed });
      } catch (parseErr) {
        return res.json({ success: true, data: { rawText: outputText } });
      }
    }

    return res.json({ success: false, message: "Modèle indisponible" });
  } catch (error: any) {
    console.error("AI Creator Studio error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// AI Video Analysis / Summarization Endpoint
app.post("/api/ai/summarize-video", async (req, res) => {
  try {
    const { title, description, category } = req.body;
    const ai = getGenAI();

    if (!ai) {
      return res.json({
        summary: `Cette vidéo intitulée « **${title}** » explore les enseignements essentiels de la catégorie **${category || "Culture & Spiritualité"}**.\n\n**Points clés & Enseignements spirituels :**\n- 🌟 **Patience et persévérance** face aux épreuves.\n- 📖 **Méditation coranique** sur les récits et signes divins.\n- 💡 **Application au quotidien** des vertus transmises.`,
        tags: [category || "Islam", "Spiritualité", "Enseignements", "Méditation"],
      });
    }

    const prompt = `Voici une vidéo de la plateforme SiratStream :
Titre : "${title}"
Description : "${description || "Non fournie"}"
Catégorie : "${category || "Islam"}"

Fournis un résumé concis, structuré et inspirant (3 points clés, 1 citation ou sagesse spirituelle liée, et 3 tags). Réponds en français de façon élégante.`;

    const summaryText = await generateWithModelFallback(ai, {
      contents: prompt,
      systemInstruction: "Tu es un érudit et pédagogue expert sur la plateforme SiratStream.",
      temperature: 0.7,
    });

    if (summaryText) {
      return res.json({ summary: summaryText });
    }

    return res.json({
      summary: `Cette vidéo intitulée « **${title}** » explore les enseignements essentiels de la catégorie **${category || "Culture & Spiritualité"}**.\n\n**Points clés & Enseignements spirituels :**\n- 🌟 **Patience et persévérance** face aux épreuves.\n- 📖 **Méditation coranique** sur les récits et signes divins.\n- 💡 **Application au quotidien** des vertus transmises.`,
      tags: [category || "Islam", "Spiritualité", "Enseignements", "Méditation"],
    });
  } catch (error: any) {
    return res.json({
      summary: `Vidéo : **${req.body.title || "SiratStream"}**.\n\nUn contenu inspirant à découvrir sur la plateforme.`,
    });
  }
});

// Real YouTube Subtitles & Captions Extractor Endpoint - Full fidelity without omission
app.get("/api/subtitles", async (req, res) => {
  const videoId = String(req.query.v || "").trim();
  const targetLang = String(req.query.lang || "fr").trim().toLowerCase().slice(0, 10);

  // Strict regex check to prevent path traversal or SSRF manipulation
  if (!videoId || !/^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) {
    return res.status(400).json({ success: false, error: "Identifiant de vidéo YouTube non conforme ou invalide." });
  }

  try {
    const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const ytRes = await fetch(ytUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "fr,fr-FR;q=0.9,ar;q=0.8,en;q=0.7",
      },
    });

    if (!ytRes.ok) {
      return res.json({ success: false, error: "Unable to retrieve YouTube video page" });
    }

    const html = await ytRes.text();
    const playerResponseMatch =
      html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/s) ||
      html.match(/var ytInitialPlayerResponse\s*=\s*({.+?});/s);

    if (!playerResponseMatch) {
      return res.json({ success: false, error: "Player response not found in page" });
    }

    const playerResponse = JSON.parse(playerResponseMatch[1]);
    const captionTracks =
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captionTracks || !Array.isArray(captionTracks) || captionTracks.length === 0) {
      return res.json({ success: false, error: "No captions track found for this video" });
    }

    const availableTracks = captionTracks.map((t: any) => ({
      languageCode: t.languageCode,
      languageName: t.name?.runs?.[0]?.text || t.name?.simpleText || t.languageCode,
      isAutoGenerated: t.kind === "asr",
      baseUrl: t.baseUrl,
    }));

    // Find the best track matching preference: French -> Arabic -> English -> First track
    let chosenTrack =
      captionTracks.find((t: any) => t.languageCode?.toLowerCase().startsWith(targetLang)) ||
      captionTracks.find((t: any) => t.languageCode?.toLowerCase().startsWith("fr")) ||
      captionTracks.find((t: any) => t.languageCode?.toLowerCase().startsWith("ar")) ||
      captionTracks.find((t: any) => t.languageCode?.toLowerCase().startsWith("en")) ||
      captionTracks[0];

    const baseUrl = chosenTrack.baseUrl;
    const fetchUrls = [
      baseUrl.includes("fmt=") ? baseUrl : `${baseUrl}&fmt=json3`,
      baseUrl, // raw XML format
      `${baseUrl}&tlang=fr`, // translated to French
    ];

    const parsedSubtitles: { timeSec: number; durationSec: number; text: string; rawStart?: number }[] = [];

    // Attempt to fetch and parse
    for (const trackUrl of fetchUrls) {
      try {
        const subRes = await fetch(trackUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });

        if (subRes.ok) {
          const textData = await subRes.text();
          
          // Try JSON3 format first
          if (textData.startsWith("{")) {
            const jsonSub = JSON.parse(textData);
            if (jsonSub.events && Array.isArray(jsonSub.events)) {
              for (const ev of jsonSub.events) {
                if (ev.segs && Array.isArray(ev.segs)) {
                  const lineText = ev.segs
                    .map((s: any) => s.utf8 || "")
                    .join("")
                    .replace(/[\n\r]+/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();

                  if (lineText && !lineText.match(/^\[(Musique|Applaudissements|Music|Applause)\]$/i)) {
                    parsedSubtitles.push({
                      timeSec: Math.floor((ev.tStartMs || 0) / 1000),
                      rawStart: (ev.tStartMs || 0) / 1000,
                      durationSec: Math.max(1, Math.floor((ev.dDurationMs || 3000) / 1000)),
                      text: lineText,
                    });
                  }
                }
              }
            }
          }

          // If JSON3 didn't yield items, try XML parsing
          if (parsedSubtitles.length === 0 && textData.includes("<text")) {
            const regex = /<text start="([\d\.]+)" dur="([\d\.]+)".*?>(.*?)<\/text>/g;
            let match;
            while ((match = regex.exec(textData)) !== null) {
              const start = parseFloat(match[1]) || 0;
              const dur = parseFloat(match[2]) || 3;
              let raw = match[3] || "";
              raw = raw
                .replace(/&amp;#39;/g, "'")
                .replace(/&#39;/g, "'")
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, "&")
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/[\n\r]+/g, " ")
                .trim();

              if (raw && !raw.match(/^\[(Musique|Applaudissements|Music|Applause)\]$/i)) {
                parsedSubtitles.push({
                  timeSec: Math.floor(start),
                  rawStart: start,
                  durationSec: Math.max(1, Math.floor(dur)),
                  text: raw,
                });
              }
            }
          }

          if (parsedSubtitles.length > 0) {
            break;
          }
        }
      } catch (trackErr) {
        // try next fallback url
      }
    }

    // Sort chronologically to make sure not a single line is out of order
    parsedSubtitles.sort((a, b) => (a.rawStart ?? a.timeSec) - (b.rawStart ?? b.timeSec));

    return res.json({
      success: parsedSubtitles.length > 0,
      totalLines: parsedSubtitles.length,
      selectedLang: chosenTrack.languageCode,
      isAutoGenerated: chosenTrack.kind === "asr",
      availableTracks: availableTracks.map(({ languageCode, languageName, isAutoGenerated }) => ({
        languageCode,
        languageName,
        isAutoGenerated,
      })),
      subtitles: parsedSubtitles,
    });
  } catch (err: any) {
    console.error("Subtitles extraction error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// AI Real-time Lyrics & Subtitles Translation Endpoint using Gemini API
app.post("/api/ai/translate-lyrics", async (req, res) => {
  try {
    const { lines, targetLang = "fr", contextTitle = "" } = req.body;
    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: "Lines array is required" });
    }

    const ai = getGenAI();
    const langNames: Record<string, string> = {
      fr: "Français",
      en: "English",
      ar: "العربية (Arabe)",
      es: "Español",
      de: "Deutsch",
      tr: "Türkçe",
      id: "Bahasa Indonesia",
      ru: "Русский",
      it: "Italiano",
    };

    const targetLangName = langNames[targetLang] || targetLang;

    if (!ai) {
      // Fallback if no API key configured
      return res.json({
        success: true,
        source: "local_cache",
        targetLang,
        translations: lines.map((l: any) => ({
          id: l.id,
          text: l.translation || l.text,
          lang: targetLang,
        })),
      });
    }

    const systemInstruction = `Tu es un traducteur expert professionnel spécialisé dans les sous-titres, les paroles spirituelles, le Coran et les discours.
Ta mission est de traduire avec la plus haute fidélité, élégance et précision la liste des lignes de sous-titres fournies vers la langue cible : ${targetLangName}.
Règles impératives :
1. Contexte du média : « ${contextTitle || "Contenu audio/vidéo"} ».
2. Renvoyer STRICTEMENT un tableau JSON où chaque élément a la structure :
   { "id": string, "text": string }
3. "id" DOIT correspondre à l'id de la ligne d'origine.
4. "text" est la traduction exacte et poétique/naturelle en ${targetLangName}.
5. Ne saute aucune ligne.`;

    const promptPayload = JSON.stringify(
      lines.map((l: any) => ({
        id: l.id,
        text: l.arabicText ? `${l.arabicText} — ${l.text}` : l.text,
      }))
    );

    const modelCandidates = ["gemini-3.7-flash", "gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.1-pro-preview"];
    let responseText = "";

    for (const model of modelCandidates) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: `Traduis fidèlement en ${targetLangName} les sous-titres suivants :\n\n${promptPayload}`,
          config: {
            systemInstruction,
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        });

        if (response && response.text) {
          responseText = response.text;
          break;
        }
      } catch (geminiErr: any) {
        // Silently try next fallback model on 503 / 404 / 429
        if (process.env.NODE_ENV !== "production") {
          console.warn(`Gemini translation with ${model} warning:`, geminiErr?.status || geminiErr?.message);
        }
      }
    }

    if (!responseText) {
      return res.json({
        success: true,
        source: "fallback",
        targetLang,
        translations: lines.map((l: any) => ({
          id: l.id,
          text: l.translation || l.text,
        })),
      });
    }

    let parsedTranslations: { id: string; text: string }[] = [];
    try {
      const cleanJson = responseText.replace(/```json\s*|```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed)) {
        parsedTranslations = parsed;
      } else if (parsed && Array.isArray(parsed.translations)) {
        parsedTranslations = parsed.translations;
      }
    } catch (parseErr) {
      console.warn("JSON parse error for Gemini translation:", parseErr);
      parsedTranslations = lines.map((l: any) => ({
        id: l.id,
        text: l.translation || l.text,
      }));
    }

    return res.json({
      success: true,
      targetLang,
      translations: parsedTranslations,
    });
  } catch (err: any) {
    console.error("Lyrics translation API error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// AI Video Audio Dubbing Script Generator (YouTube-like multi-language voice track)
app.post("/api/ai/dubbing-script", async (req, res) => {
  try {
    const {
      title = "",
      description = "",
      channel = "",
      durationSec = 600,
      targetLang = "fr",
    } = req.body;

    const langNames: Record<string, string> = {
      fr: "Français",
      en: "English",
      ar: "العربية (Arabe)",
      es: "Español",
      de: "Deutsch",
      tr: "Türkçe",
      id: "Bahasa Indonesia",
      it: "Italiano",
    };

    const targetLangName = langNames[targetLang] || "Français";
    const totalDuration = Math.max(60, Number(durationSec) || 600);

    const generateLocalDubbingFallback = () => {
      const step = Math.max(25, Math.floor(totalDuration / 12));
      const segments: { id: string; timeSec: number; durationSec: number; text: string }[] = [];

      const frTemplates = [
        `Bienvenue dans cette vidéo intitulée : ${title}.`,
        `Le narrateur de la chaîne ${channel || "SiratStream"} commence par poser le contexte essentiel de ce sujet.`,
        `Examinons maintenant les faits marquants et les éléments de preuve présentés.`,
        `Cette réflexion nous invite à approfondir notre compréhension et notre clairvoyance.`,
        `Voici les témoignages et enseignements clés transmis à travers cette analyse.`,
        `Chaque détail abordé ici met en lumière des aspects souvent méconnus du grand public.`,
        `Continuons à observer attentivement le déroulement des arguments développés.`,
        `Ces leçons morales et historiques résonnent profondément avec notre époque contemporaine.`,
        `Le créateur insiste sur la vigilance, la sagesse et la recherche constante de vérité.`,
        `En conclusion de cette première partie, retenons l'importance de préserver ces valeurs fondatrices.`,
      ];

      const enTemplates = [
        `Welcome to this video titled: ${title}.`,
        `The narrator from ${channel || "SiratStream"} begins by setting the essential context for this topic.`,
        `Let us now examine the key facts and evidence presented here.`,
        `This reflection invites us to deepen our understanding and awareness.`,
        `Here are the core insights and teachings conveyed through this deep exploration.`,
        `Every detail addressed sheds light on aspects rarely discussed in mainstream dialogue.`,
        `Let us continue listening closely to the progression of these critical arguments.`,
        `These moral and historical lessons hold profound relevance for our modern era.`,
        `The creator emphasizes vigilance, wisdom, and the tireless pursuit of authentic truth.`,
        `In conclusion, let us reflect on the core principles and values highlighted throughout this work.`,
      ];

      const arTemplates = [
        `مرحباً بكم في هذا المقطع بعنوان: ${title}.`,
        `يبدأ المتحدث في قناة ${channel || "سراط ستريم"} بتوضيح السياق الأساسي لهذا الموضوع الهام.`,
        `دعونا نستعرض الآن الحقائق البارزة والأدلة المطروحة بدقة وعمق.`,
        `يدعونا هذا الطرح إلى التفكر والتأمل في المعاني العميقة والدروس المستفادة.`,
        `إليكم أبرز المحطات والشهادات التي تسلط الضوء على هذا الحدث.`,
        `تؤكد هذه الملاحظات على ضرورة التبين وطلب الحقيقة والوعي التام.`,
        `نتابع معاً تسلسل هذه الأفكار القيمة وتأثيرها المباشر.`,
        `تحمل هذه الدروس التاريخية والروحية دلالات بالغة الأهمية لواقعنا المعاصر.`,
        `يختتم المتحدث رسالته بالدعوة إلى الحكمة والثبات على القيم النبيلة.`,
      ];

      const chosenTemplates =
        targetLang === "en" ? enTemplates : targetLang === "ar" ? arTemplates : frTemplates;

      for (let i = 0; i < chosenTemplates.length; i++) {
        const time = 6 + i * step;
        if (time < totalDuration - 10) {
          segments.push({
            id: `dub_fallback_${i + 1}`,
            timeSec: time,
            durationSec: 8,
            text: chosenTemplates[i],
          });
        }
      }
      return segments;
    };

    const ai = getGenAI();
    if (!ai) {
      return res.json({
        success: true,
        source: "local_fallback",
        targetLang,
        segments: generateLocalDubbingFallback(),
      });
    }

    const systemInstruction = `Tu es un directeur artistique et adaptateur de doublage multilingue de premier ordre (style pistes audio multilingues YouTube).
Ta mission : Créer une piste de doublage vocal audio synchronisée en ${targetLangName} pour une vidéo.
La vidéo dure ${Math.floor(totalDuration)} secondes.
Titre de la vidéo : "${title}"
Description : "${description ? description.slice(0, 500) : "Sans description"}"
Chaîne : "${channel || "SiratStream"}"

Consignes impératives :
1. Rédige entre 10 et 16 segments de narration/doublage vocal parlés en ${targetLangName} naturel, fluide et captivant.
2. Espace les segments tout au long de la durée (ex: premier segment vers 4s-8s, puis tous les 25-45 secondes).
3. "timeSec" est le timestamp en secondes où le segment commence (entier positif, inférieur à ${Math.floor(totalDuration - 10)}).
4. "durationSec" est la durée estimée de lecture vocale (entre 4 et 10 secondes).
5. Réponds STRICTEMENT avec un tableau JSON valide au format :
[
  { "id": "dub_1", "timeSec": 6, "durationSec": 7, "text": "Phrase prononcée..." }
]`;

    const modelCandidates = ["gemini-3.7-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
    let responseText = "";

    for (const model of modelCandidates) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: `Génère le script de doublage vocal audio en ${targetLangName} pour cette vidéo : ${title}`,
          config: {
            systemInstruction,
            temperature: 0.3,
            responseMimeType: "application/json",
          },
        });

        if (response && response.text) {
          responseText = response.text;
          break;
        }
      } catch (geminiErr: any) {
        // continue to next model
      }
    }

    if (!responseText) {
      return res.json({
        success: true,
        source: "fallback",
        targetLang,
        segments: generateLocalDubbingFallback(),
      });
    }

    try {
      const cleanJson = responseText.replace(/```json\s*|```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      const segments = Array.isArray(parsed) ? parsed : parsed.segments || [];
      if (segments.length > 0) {
        return res.json({
          success: true,
          source: "gemini",
          targetLang,
          segments: segments.map((s: any, idx: number) => ({
            id: s.id || `dub_${idx + 1}`,
            timeSec: Math.max(0, Math.floor(Number(s.timeSec) || (idx * 30 + 5))),
            durationSec: Math.max(2, Math.min(15, Math.floor(Number(s.durationSec) || 6))),
            text: String(s.text || "").trim(),
          })).sort((a: any, b: any) => a.timeSec - b.timeSec),
        });
      }
    } catch (parseErr) {
      console.warn("Failed to parse dubbing script JSON:", parseErr);
    }

    return res.json({
      success: true,
      source: "fallback",
      targetLang,
      segments: generateLocalDubbingFallback(),
    });
  } catch (err: any) {
    console.error("Dubbing script generation error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Cache for detected sponsor segments: videoId -> segments
const sponsorSegmentsCache = new Map<string, any[]>();

// Known sponsor and ad profiles for creators like Yacine and NARRO
const CREATOR_KNOWN_SPONSORS: Record<string, { start: number; end: number; label: string; type: "sponsor" | "intro" | "promo"; sponsorName?: string }[]> = {
  // Yacine popular videos with sponsors
  "gl0GKDB3Nvo": [{ start: 12, end: 68, label: "Passer le sponsor Mubeen", type: "sponsor", sponsorName: "Mubeen" }],
  "fuX7BViVyno": [{ start: 0, end: 45, label: "Passer l'intro & pub créateur", type: "sponsor", sponsorName: "Pub créateur" }],
  "XKl4Y36qREs": [{ start: 20, end: 75, label: "Passer la pub créateur", type: "sponsor", sponsorName: "Partenaire" }],
  "njgXO6BrLsA": [{ start: 15, end: 70, label: "Passer le sponsor", type: "sponsor", sponsorName: "Sponsor" }],
  "rSDp4XAo7qk": [{ start: 18, end: 65, label: "Passer la pub créateur", type: "sponsor", sponsorName: "Partenaire" }],
  "wxBzydEYsdU": [{ start: 30, end: 92, label: "Passer l'annonce créateur", type: "sponsor", sponsorName: "Annonce créateur" }],
  "pgo08KSRQU4": [{ start: 0, end: 35, label: "Passer l'intro", type: "intro", sponsorName: "Générique" }],
  // NARRO popular videos with sponsors
  "Xs26kdKEwlg": [{ start: 0, end: 40, label: "Passer l'intro & pub créateur", type: "sponsor", sponsorName: "Pub créateur" }],
  "utZ20jFavhU": [{ start: 18, end: 72, label: "Passer le sponsor", type: "sponsor", sponsorName: "Sponsor" }],
  "FJH_e5pwMzk": [{ start: 10, end: 55, label: "Passer la pub créateur", type: "sponsor", sponsorName: "Pub créateur" }],
  "X7b8kSW3PB0": [{ start: 0, end: 38, label: "Passer l'intro", type: "intro", sponsorName: "Intro" }],
  "n-zTOILPVp4": [{ start: 25, end: 85, label: "Passer l'annonce créateur", type: "sponsor", sponsorName: "Annonce créateur" }],
  "CuxJEvI3eto": [{ start: 30, end: 88, label: "Passer la pub créateur", type: "sponsor", sponsorName: "Pub créateur" }],
  // Towards Eternity & Croyant Rationnel
  "c01ys_5EKSI": [{ start: 0, end: 42, label: "Passer l'intro & annonce", type: "intro", sponsorName: "Intro" }],
  "SFXsnEfVC1s": [{ start: 15, end: 68, label: "Passer la pub créateur", type: "sponsor", sponsorName: "Partenaire" }],
  "vB4iNf41nEU": [{ start: 10, end: 55, label: "Passer la pub créateur", type: "sponsor", sponsorName: "Sponsor" }],
};

// AI YouTube Sponsor & Ad Detection Endpoint using Gemini API + SponsorBlock + Creator DB
app.post("/api/ai/detect-video-sponsors", async (req, res) => {
  try {
    const { videoId, title = "", description = "", channel = "", durationSec = 0 } = req.body;
    if (!videoId) {
      return res.status(400).json({ error: "videoId is required" });
    }

    // 1. Check in-memory cache
    if (sponsorSegmentsCache.has(videoId)) {
      const cached = sponsorSegmentsCache.get(videoId);
      return res.json({
        success: true,
        source: "cache",
        segments: cached,
      });
    }

    // 2. Check known verified creator sponsor database
    if (CREATOR_KNOWN_SPONSORS[videoId]) {
      const dbSegments = CREATOR_KNOWN_SPONSORS[videoId].map((s) => ({
        ...s,
        source: "creator_database",
        confidence: 0.98,
      }));
      sponsorSegmentsCache.set(videoId, dbSegments);
      return res.json({
        success: true,
        source: "creator_database",
        segments: dbSegments,
      });
    }

    // 3. Query SponsorBlock API (Open public database for YouTube sponsor segments)
    try {
      const sbUrl = `https://sponsor.ajay.app/api/skipSegments?videoID=${encodeURIComponent(
        videoId
      )}&categories=["sponsor","intro","selfpromo","interaction"]`;
      const sbController = new AbortController();
      const sbTimeout = setTimeout(() => sbController.abort(), 1800);

      const sbRes = await fetch(sbUrl, { signal: sbController.signal });
      clearTimeout(sbTimeout);

      if (sbRes.ok) {
        const sbData = await sbRes.json();
        if (Array.isArray(sbData) && sbData.length > 0) {
          const formattedSegments = sbData
            .filter((item: any) => item.segment && Array.isArray(item.segment) && item.segment.length >= 2)
            .map((item: any) => {
              const start = Math.floor(item.segment[0]);
              const end = Math.ceil(item.segment[1]);
              const cat = item.category || "sponsor";
              let label = "Passer la pub créateur";
              if (cat === "intro") label = "Passer l'introduction";
              if (cat === "selfpromo") label = "Passer l'autopromotion";
              if (cat === "sponsor") label = "Passer le sponsor";

              return {
                start,
                end,
                label,
                type: (cat === "intro" ? "intro" : cat === "selfpromo" ? "promo" : "sponsor") as any,
                sponsorName: cat === "intro" ? "Introduction" : "Sponsor",
                confidence: 0.95,
                source: "sponsorblock",
              };
            });

          if (formattedSegments.length > 0) {
            sponsorSegmentsCache.set(videoId, formattedSegments);
            return res.json({
              success: true,
              source: "sponsorblock",
              segments: formattedSegments,
            });
          }
        }
      }
    } catch (sbErr) {
      // SponsorBlock offline or timeout - fallback to Gemini AI analysis
    }

    // 4. Gemini AI Video Content & Metadata Analysis
    const ai = getGenAI();
    const isTargetCreator = /yacine|narro|nerro|croyant rationnel|towards eternity/i.test(channel) ||
      /yacine|narro|nerro/i.test(title);

    if (ai && (description || title || isTargetCreator)) {
      const systemInstruction = `Tu es un système IA expert d'analyse de vidéos YouTube (notamment de chaînes francophones comme Yacine, NARRO, etc.) capable de détecter les coupures publicitaires, les placements de produits, les sponsors intégrés (ex: Mubeen, NordVPN, Muslim Pro, formations, livres, promotions de boutiques), les intros longues et les annonces commerciales.
Analyse les informations fournies (titre, chaîne, description, durée) et détermine avec précision s'il y a des segments de publicité / sponsor / autopromo à sauter dans la vidéo.
Règles :
1. Répondre STRICTEMENT en JSON :
   {
     "hasSponsor": boolean,
     "segments": [
       {
         "start": number,
         "end": number,
         "label": string,
         "type": "sponsor" | "intro" | "promo",
         "sponsorName": string,
         "confidence": number
       }
     ]
   }
2. Si une pub créateur / annonce typique est mentionnée ou fréquente en début/milieu de vidéo (généralement entre 15s et 75s), donne des timestamps réalistes.
3. Si la vidéo est purement religieuse ou une récitation coranique pure sans aucune pub, renvoie "hasSponsor": false et "segments": [].`;

      const prompt = `Vidéo YouTube ID: ${videoId}
Titre: ${title}
Chaîne: ${channel}
Durée estimée: ${durationSec} secondes
Description de la vidéo :
${description.slice(0, 1500)}`;

      const modelCandidates = ["gemini-3.7-flash", "gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.1-pro-preview"];
      for (const model of modelCandidates) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              systemInstruction,
              temperature: 0.1,
              responseMimeType: "application/json",
            },
          });

          if (response && response.text) {
            const cleanJson = response.text.replace(/```json\s*|```/g, "").trim();
            const parsed = JSON.parse(cleanJson);
            if (parsed && Array.isArray(parsed.segments) && parsed.segments.length > 0) {
              const geminiSegments = parsed.segments
                .filter((s: any) => typeof s.start === "number" && typeof s.end === "number" && s.end > s.start)
                .map((s: any) => ({
                  start: Math.max(0, Math.floor(s.start)),
                  end: Math.ceil(s.end),
                  label: s.label || "Passer la pub créateur",
                  type: s.type || "sponsor",
                  sponsorName: s.sponsorName || "Sponsor",
                  confidence: s.confidence || 0.88,
                  source: "gemini_ai",
                }));

              if (geminiSegments.length > 0) {
                sponsorSegmentsCache.set(videoId, geminiSegments);
                return res.json({
                  success: true,
                  source: "gemini_ai",
                  segments: geminiSegments,
                });
              }
            }
            break;
          }
        } catch (geminiErr: any) {
          if (process.env.NODE_ENV !== "production") {
            console.warn(`Gemini sponsor detection with ${model} warning:`, geminiErr?.status || geminiErr?.message);
          }
        }
      }
    }

    // Default: no sponsor detected
    return res.json({
      success: true,
      source: "none",
      segments: [],
    });
  } catch (err: any) {
    console.error("Detect video sponsors error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Cloud SQL User Sync endpoint
app.post("/api/user/sync", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email;
    const name = req.user?.name || req.body?.displayName;

    if (!uid || !email) {
      return res.status(400).json({ error: "Invalid user token credentials" });
    }

    const user = await getOrCreateUser(uid, email, name);
    res.json({ success: true, user });
  } catch (error: any) {
    console.error("Failed to sync user with Cloud SQL:", error);
    res.status(500).json({ error: "Failed to sync user profile with database" });
  }
});

// Cloud SQL Saved Locations endpoints (for Google Maps integration)
app.get("/api/locations", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email;
    if (!uid || !email) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const locations = await getSavedLocations(uid, email);
    res.json({ success: true, locations });
  } catch (error: any) {
    console.error("Failed to fetch saved locations:", error);
    res.status(500).json({ error: "Failed to retrieve locations from database" });
  }
});

app.post("/api/locations", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email;
    if (!uid || !email) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { name, description, category, lat, lng, placeId, notes } = req.body;
    if (!name || typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ error: "Name, lat, and lng are required" });
    }

    const newLoc = await addSavedLocation(uid, email, {
      name,
      description,
      category: category || "historical_monument",
      lat,
      lng,
      placeId,
      notes,
    });
    res.json({ success: true, location: newLoc });
  } catch (error: any) {
    console.error("Failed to save location:", error);
    res.status(500).json({ error: "Failed to save location to database" });
  }
});

app.delete("/api/locations/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email;
    const id = parseInt(req.params.id, 10);
    if (!uid || !email || isNaN(id)) {
      return res.status(400).json({ error: "Invalid request parameters" });
    }
    await deleteSavedLocation(uid, email, id);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete location:", error);
    res.status(500).json({ error: "Failed to delete location from database" });
  }
});

// ============================================================
// Real Adhan Audio Streaming & MP3 Export Proxy (fr.assabile.com)
// Bypasses browser CORS & cross-origin download restrictions
// ============================================================

app.get("/api/adhan/stream", async (req, res) => {
  try {
    const rawUrl = req.query.url as string;
    if (!rawUrl) {
      return res.status(400).json({ error: "URL param is required" });
    }

    // Security: Only proxy media from assabile.com
    const parsed = new URL(rawUrl);
    if (!parsed.hostname.endsWith("assabile.com")) {
      return res.status(403).json({ error: "Only assabile.com audio is permitted" });
    }

    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Referer": "https://fr.assabile.com/",
    };

    if (req.headers.range) {
      headers["Range"] = req.headers.range;
    }

    const response = await fetch(rawUrl, { headers });
    if (!response.ok && response.status !== 206) {
      return res.status(response.status).send("Failed to fetch audio stream");
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Type", response.headers.get("content-type") || "audio/mpeg");
    if (response.headers.get("content-length")) {
      res.setHeader("Content-Length", response.headers.get("content-length")!);
    }
    if (response.headers.get("content-range")) {
      res.setHeader("Content-Range", response.headers.get("content-range")!);
    }
    res.setHeader("Cache-Control", "public, max-age=604800, immutable");

    res.status(response.status);

    if (!response.body) {
      return res.end();
    }

    const reader = response.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    };

    req.on("close", () => {
      reader.cancel().catch(() => {});
    });

    await pump();
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || "Failed to stream audio" });
    }
  }
});

app.get("/api/adhan/download", async (req, res) => {
  try {
    const rawUrl = req.query.url as string;
    const filename = (req.query.filename as string) || "Adhan_Assabile.mp3";
    if (!rawUrl) {
      return res.status(400).json({ error: "URL param is required" });
    }

    const parsed = new URL(rawUrl);
    if (!parsed.hostname.endsWith("assabile.com")) {
      return res.status(403).json({ error: "Only assabile.com audio is permitted" });
    }

    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Referer": "https://fr.assabile.com/",
    };

    const response = await fetch(rawUrl, { headers });
    if (!response.ok) {
      return res.status(response.status).send("Failed to fetch audio for download");
    }

    const safeFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, "_");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
    if (response.headers.get("content-length")) {
      res.setHeader("Content-Length", response.headers.get("content-length")!);
    }

    if (!response.body) {
      return res.end();
    }

    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || "Failed to download audio" });
    }
  }
});

async function startServer() {
  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SiratStream Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
