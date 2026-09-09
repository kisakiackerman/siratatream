import { catalog, type ContentItem } from "@/data/catalog";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  parsedAction?: ParsedAction | null;
  parsedQuiz?: ParsedQuiz | null;
  isStreaming?: boolean;
}

export interface ParsedAction {
  type: "video_recommendation" | "open_tool" | "play_video";
  title?: string;
  searchQuery?: string;
  reason?: string;
  tool?: "qibla" | "prayer" | "zakat" | "duas" | "tasbih" | "tarawih" | "offline" | "mylist" | "history" | "catalog";
  videoItem?: ContentItem;
}

export interface ParsedQuiz {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  userSelectedIndex?: number;
}

// Normalize strings for accurate semantic matching
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
}

// Prophet and character aliases mapping
const characterAliases: Record<string, string[]> = {
  moussa: ["moussa", "moise", "pharaon", "mer rouge", "nil", "sina"],
  ibrahim: ["ibrahim", "abraham", "kaaba", "nimrod", "feu", "statues", "ismael", "sacrifice"],
  youssouf: ["youssouf", "joseph", "puits", "egypte", "potiphar", "reves"],
  issa: ["issa", "jesus", "marie", "maryam", "evangile", "berceau", "aveugle", "apotre"],
  nouh: ["nouh", "noe", "arche", "deluge"],
  younous: ["younous", "jonas", "poisson", "baleine", "ninive"],
  adam: ["adam", "eve", "hawa", "arbre", "paradis"],
  soulayman: ["soulayman", "salomon", "fourmis", "djinn", "royaume", "huppe", "bilqis"],
  daoud: ["daoud", "david", "goliath", "jalout", "psaumes", "fer"],
  ayoub: ["ayoub", "job", "patience", "epreuve"],
  ali: ["ali", "fatima", "khaybar", "dhou al fiqar"],
  "abu bakr": ["abu bakr", "abou bakr", "siddiq", "grotte", "thawr"],
  umar: ["umar", "oumar", "farouq", "justice"],
  uthman: ["uthman", "othman", "dhul nurayn", "coran mushaf"],
  bilal: ["bilal", "muezzin", "abyssinie", "ahad"],
  khalid: ["khalid", "epee d allah", "sayf"],
  tarawih: ["tarawih", "taraweeh", "sudais", "shuraim", "haramain", "mecque 199", "recitation", "ali jaber"],
  dajjal: ["dajjal", "antechrist", "fin des temps", "eschatologie", "gog", "magog", "yajuj", "majuj", "barzakh", "tombe"],
  miracles: ["miracle", "fente de la lune", "expansion de l univers", "mer"],
};

// Strict, high-precision search that only returns a video if genuinely relevant
export function findMatchingVideo(query: string): ContentItem | undefined {
  if (!query || query.trim().length < 3) return undefined;

  const cleanQuery = normalizeText(query);
  const words = cleanQuery.split(/\s+/).filter((w) => w.length > 2);
  if (words.length === 0) return undefined;

  let bestMatch: ContentItem | undefined = undefined;
  let highestScore = 0;

  for (const item of catalog) {
    const normTitle = normalizeText(item.title);
    const normDesc = normalizeText(item.description);
    const normCats = item.categories.map((c) => normalizeText(c)).join(" ");
    const normChannel = normalizeText(item.channel);

    let score = 0;

    // 1. Direct exact or substring match in title (massive boost)
    if (normTitle.includes(cleanQuery)) {
      score += 100;
    }

    // 2. Character alias matches
    for (const [key, aliases] of Object.entries(characterAliases)) {
      const queryMatchesAlias = aliases.some((a) => cleanQuery.includes(a));
      if (queryMatchesAlias) {
        const itemMatchesAlias =
          normTitle.includes(key) ||
          aliases.some((a) => normTitle.includes(a) || normDesc.includes(a));
        if (itemMatchesAlias) {
          score += 60;
        }
      }
    }

    // 3. Keyword matches in Title
    for (const w of words) {
      if (normTitle.includes(w)) {
        score += 25;
      } else if (normDesc.includes(w)) {
        score += 8;
      } else if (normCats.includes(w)) {
        score += 10;
      } else if (normChannel.includes(w)) {
        score += 5;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = item;
    }
  }

  // Require a minimum confidence score (at least 20) to avoid false positives
  return highestScore >= 20 ? bestMatch : undefined;
}

export function parseSpecialBlocks(rawText: string): {
  cleanText: string;
  action: ParsedAction | null;
  quiz: ParsedQuiz | null;
} {
  let cleanText = rawText;
  let action: ParsedAction | null = null;
  let quiz: ParsedQuiz | null = null;

  // Extract action block ```action ... ```
  const actionRegex = /```action\s*([\s\S]*?)\s*```/;
  const actionMatch = rawText.match(actionRegex);
  if (actionMatch) {
    try {
      const parsed = JSON.parse(actionMatch[1]);
      action = parsed;

      if (action && action.type === "video_recommendation") {
        const query = action.searchQuery || action.title || "";
        const matched = findMatchingVideo(query);
        if (matched) {
          action.videoItem = matched;
        } else {
          // If no video genuinely matches, discard the ungrounded video card
          action = null;
        }
      }
      cleanText = cleanText.replace(actionRegex, "").trim();
    } catch {
      // ignore JSON parse error
    }
  }

  // Extract quiz block ```quiz ... ```
  const quizRegex = /```quiz\s*([\s\S]*?)\s*```/;
  const quizMatch = rawText.match(quizRegex);
  if (quizMatch) {
    try {
      const parsed = JSON.parse(quizMatch[1]);
      quiz = parsed;
      cleanText = cleanText.replace(quizRegex, "").trim();
    } catch {
      // ignore JSON parse error
    }
  }

  return { cleanText, action, quiz };
}

export async function sendAIMessage(
  messages: { role: "user" | "assistant"; content: string }[],
  userContext?: { currentVideo?: string; category?: string }
): Promise<{ text: string; action: ParsedAction | null; quiz: ParsedQuiz | null }> {
  try {
    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, userContext }),
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const data = await response.json();
    const { cleanText, action, quiz } = parseSpecialBlocks(data.text || "");
    return { text: cleanText, action, quiz };
  } catch (error) {
    console.warn("AI service client fallback activated:", error);
    const lastMessage = messages[messages.length - 1]?.content || "";
    return generateClientFallbackReply(lastMessage);
  }
}

// Client fallback reply with STRICT video relevancy
export function generateClientFallbackReply(userPrompt: string): {
  text: string;
  action: ParsedAction | null;
  quiz: ParsedQuiz | null;
} {
  const p = userPrompt.toLowerCase().trim();

  // Profane / off-topic guardrail
  const profaneKeywords = [
    "code python", "javascript", "crypto", "trading", "bitcoin", "casino",
    "poker", "football match", "jeux vidéo", "gaming", "politique locale",
    "recette cocktail", "alcool", "musique profane", "astrologie", "horoscope"
  ];
  if (profaneKeywords.some((kw) => p.includes(kw))) {
    return {
      text: `**Assalamu 'alaykum 🕊️**\n\nEn tant que **Noor IA**, ma mission est exclusivement consacrée au **savoir islamique, à la spiritualité, au Noble Coran, aux récits des Prophètes et aux enseignements sacrés**.\n\nJe vous invite à me poser toute question liée à la foi, la Sîra, la jurisprudence pratique (Salat, Ablutions, Zakat, Jeûne), la méditation spirituelle ou aux outils de **SiratStream**.\n\n*Quel sujet religieux ou spirituel souhaitez-vous approfondir ensemble ?*`,
      action: null,
      quiz: null,
    };
  }

  // Ablutions (No video - only tool or pure explanation)
  if (p.includes("ablution") || p.includes("woudou") || p.includes("wudu") || p.includes("ghoussl") || p.includes("tayammum")) {
    if (p.includes("ghoussl") || p.includes("grande ablution")) {
      return {
        text: `**Guide des Grandes Ablutions (Al-Ghoussl / الطهارة الكبرى) 💧**\n\n1. **Intention (Niyya)** dans le cœur et dire *Bismillah*.\n2. **Laver les mains** 3 fois et laver les parties intimes avec la main gauche.\n3. **Faire le Woudou complet** comme pour la prière.\n4. **Verser de l'eau sur la tête** 3 fois jusqu'aux racines.\n5. **Laver tout le corps** (côté droit puis gauche) sans oublier aucun pli.\n\n*« Allah aime ceux qui se repentent et Il aime ceux qui se purifient. » (2:222)*`,
        action: null,
        quiz: null,
      };
    }
    return {
      text: `**Guide des Petites Ablutions (Al-Woudou / الوضوء) 💧**\n\n1. Intention et dire *Bismillah*.\n2. Laver les mains 3 fois.\n3. Rincer la bouche 3 fois.\n4. Rincer le nez 3 fois.\n5. Laver le visage 3 fois.\n6. Laver les bras jusqu'aux coudes 3 fois (droit puis gauche).\n7. Passer les mains humides sur la tête (1 fois).\n8. Nettoyer les oreilles (1 fois).\n9. Laver les pieds jusqu'aux chevilles 3 fois (droit puis gauche).\n\n*Invocation de fin : Ash-hadu allā ilāha illallāh wahdahu lā sharīka lah, wa ash-hadu anna Muhammadan 'abduhu wa rasūluh.*`,
      action: null,
      quiz: null,
    };
  }

  // Salat & Prières
  if (p.includes("prière") || p.includes("priere") || p.includes("salat") || p.includes("fajr") || p.includes("maghrib") || p.includes("horaire") || p.includes("tahajjoud") || p.includes("witr")) {
    return {
      text: `**La Prière (Salat) & Horaires en Direct ⏰**\n\nLa prière est le pilier central de l'Islam reliant le croyant à son Créateur 5 fois par jour (Fajr, Dhuhr, Asr, Maghrib, Isha).\n\nLes prières nocturnes (Tahajjoud & Witr) apportent une paix immense et une élévation de l'âme.\n\nRetrouvez vos horaires précis et le compte à rebours dans l'espace dédié :`,
      action: { type: "open_tool", tool: "prayer" },
      quiz: null,
    };
  }

  // Zakat
  if (p.includes("zakat") || p.includes("argent") || p.includes("épargne") || p.includes("aumône")) {
    return {
      text: `**Calcul & Règles de la Zakat al-Maal 💰**\n\nLa Zakat est le 3ème pilier de l'Islam. Elle est due si votre épargne dépasse le seuil du **Nisab** (valeur de 85g d'or pur) pendant une année hégirienne entière (*Hawl*).\n\n- **Taux légal** : **2,5%** de votre patrimoine net liquide.\n\nCliquez ci-dessous pour ouvrir le calculateur de Zakat intégré à SiratStream :`,
      action: { type: "open_tool", tool: "zakat" },
      quiz: null,
    };
  }

  // Qibla
  if (p.includes("qibla") || p.includes("direction") || p.includes("boussole") || p.includes("mecque")) {
    return {
      text: `**Orientation de la Qibla 🧭**\n\nLa Qibla pointe en direction de la Kaaba sacrée (La Mecque). Grâce au capteur gyroscopique et GPS de votre appareil, notre boussole vous indique l'angle précis d'orientation.`,
      action: { type: "open_tool", tool: "qibla" },
      quiz: null,
    };
  }

  // Invocations
  if (p.includes("doua") || p.includes("dua") || p.includes("invocation") || p.includes("protection") || p.includes("tristesse") || p.includes("sommeil") || p.includes("angoisse")) {
    return {
      text: `**Invocation pour apaiser le cœur et chasser les soucis 🤲**\n\n**Arabe :**\nاللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ\n\n**Phonétique :**\n*Allāhumma innī a'ūdhu bika mina-l-hammi wa-l-hazani, wa-l-'ajzi wa-l-kasali...*\n\n**Traduction :**\n« Ô Allah ! Je cherche refuge auprès de Toi contre les soucis et la tristesse, l'impuissance et la paresse, l'avarice et la lâcheté... »`,
      action: { type: "open_tool", tool: "duas" },
      quiz: null,
    };
  }

  // Prophètes - ONLY attach video if genuinely matched
  if (p.includes("moussa") || p.includes("ibrahim") || p.includes("youssouf") || p.includes("issa") || p.includes("muhammad") || p.includes("mohamed") || p.includes("prophète") || p.includes("nouh") || p.includes("adam") || p.includes("soulayman") || p.includes("daoud") || p.includes("ayoub")) {
    const video = findMatchingVideo(p);
    return {
      text: `**Récits des Prophètes (Qasas al-Anbiya) 📜**\n\nLes envoyés d'Allah incarnent la foi inébranlable, la patience (*Sabr*) face aux épreuves et la confiance absolue en Dieu (*Tawakkul*).`,
      action: video
        ? {
            type: "video_recommendation",
            title: video.title,
            searchQuery: p,
            reason: `Récit en lien direct avec votre recherche sur ${video.title}.`,
            videoItem: video,
          }
        : null,
      quiz: null,
    };
  }

  // Quiz
  if (p.includes("quiz") || p.includes("test") || p.includes("défi") || p.includes("question")) {
    return {
      text: `Voici une question pour tester vos connaissances sur la vie des Prophètes :`,
      action: null,
      quiz: {
        question: "Quel prophète a parlé au berceau pour disculper sa mère de toute calomnie ?",
        options: [
          "Le Prophète Moussa (Moïse)",
          "Le Prophète 'Issa (Jésus, fils de Maryam)",
          "Le Prophète Youssouf (Joseph)",
          "Le Prophète Yahya (Jean)"
        ],
        correctIndex: 1,
        explanation: "Le Prophète 'Issa ('alayhi salam) a parlé dès le berceau par miracle divin pour proclamer sa servitude envers Allah et disculper sa mère sainte Maryam (Sourate Maryam)."
      },
    };
  }

  // Tarawih / Coran
  if (p.includes("tarawih") || p.includes("haramain") || p.includes("sudais") || p.includes("shuraim")) {
    const video = findMatchingVideo("tarawih");
    return {
      text: `**Récitations Historiques de Tarawih (1980-2000) 🌙**\n\nRevivez les veillées sacrées et les récitations légendaires de Sheikh Sudais, Shuraim, Ali Jaber et des plus grands imams de la Mecque et Médine.`,
      action: video
        ? {
            type: "video_recommendation",
            title: video.title,
            searchQuery: "tarawih",
            reason: "Une récitation émouvante et historique de la Mecque.",
            videoItem: video,
          }
        : { type: "open_tool", tool: "tarawih" },
      quiz: null,
    };
  }

  // Generic video matching - ONLY attach if score > 20
  const matchingVideo = findMatchingVideo(userPrompt);
  return {
    text: `**Assalamu 'alaykum ! Je suis Noor IA 🌟**\n\nJe réponds à toutes vos questions sur **l'Islam, le Noble Coran, la Sîra, la jurisprudence pratique (Salat, Zakat, Jeûne), les récits des Prophètes et les invocations**.\n\nN'hésitez pas à me poser vos questions spirituelles ou à me demander d'explorer un récit précis.`,
    action: matchingVideo
      ? {
          type: "video_recommendation",
          title: matchingVideo.title,
          searchQuery: matchingVideo.title,
          reason: `Vidéo correspondante : ${matchingVideo.title}`,
          videoItem: matchingVideo,
        }
      : null,
    quiz: null,
  };
}
