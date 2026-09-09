export type ReciterInfo = {
  id: string;
  name: string;
  arabicName: string;
  title: string;
  photoUrl: string;
  mosque: "La Mecque (Masjid Al-Haram)" | "Médine (Masjid An-Nabawi)" | "La Mecque & Médine";
  years: string;
  bio: string;
};

export const RECITERS_DATA: Record<string, ReciterInfo> = {
  ali_jaber: {
    id: "ali_jaber",
    name: "Sheikh Ali Jaber",
    arabicName: "الشيخ علي بن عبد الله بن صالح جابر رحمه الله",
    title: "Grand Imam de Masjid Al-Haram (1401H - 1409H / 1981 - 1989)",
    photoUrl: "/images/sheikh_ali_jaber.jpg",
    mosque: "La Mecque (Masjid Al-Haram)",
    years: "1981 - 1989",
    bio: "Né à Djeddah en 1373H (1953) et décédé en 2005, Sheikh Ali Jaber a mémorisé le Noble Coran dès l'âge de 15 ans. Diplômé de l'Université Islamique de Médine et titulaire d'un doctorat en droit comparé, il fut nommé Imam de la Grande Mosquée de La Mecque (Masjid Al-Haram) par décret royal du Roi Khalid en 1401H. Sa psalmodie unique, empreinte d'une douceur bouleversante et d'une émotion profonde, a marqué l'âge d'or des prières de Tarawih et continue d'inspirer des millions de croyants à travers le monde.",
  },
  sudais: {
    id: "sudais",
    name: "Sheikh Abdul Rahman Al-Sudais",
    arabicName: "الشيخ عبد الرحمن بن عبد العزيز السديس حفظه الله",
    title: "Président Général & Chef des Imams de Masjid Al-Haram",
    photoUrl: "/images/sheikh_sudais.jpg",
    mosque: "La Mecque (Masjid Al-Haram)",
    years: "1984 - Présent",
    bio: "Nommé Imam de Masjid Al-Haram à l'âge de 24 ans en 1404H (1984), Sheikh Al-Sudais est l'une des figures les plus célèbres de la récitation coranique contemporaine. Docteur en Charia islamique, sa voix puissante et rythmée, ses psalmodies vibrantes lors des nuits impaires et ses Douas Al-Qounout mondialement renommés accompagnent les fidèles de la Kaaba depuis plus de 40 ans.",
  },
  shuraim: {
    id: "shuraim",
    name: "Sheikh Saud Al-Shuraim",
    arabicName: "الشيخ الدكتور سعود بن إبراهيم الشريم حفظه الله",
    title: "Ancien Doyen de la Faculté de Charia & Imam de Masjid Al-Haram",
    photoUrl: "/images/sheikh_shuraim.jpg",
    mosque: "La Mecque (Masjid Al-Haram)",
    years: "1991 - 2022",
    bio: "Nommé Imam de la Sainte Mosquée de La Mecque en 1412H (1991), Sheikh Saud Al-Shuraim a formé avec Sheikh Sudais le binôme le plus légendaire de l'histoire moderne des Tarawih. Ancien doyen de la Faculté de Charia à l'Université Umm Al-Qura, sa récitation d'une précision parfaite et son style mélodieux empreint de solennité et de sérénité ont marqué les esprits.",
  },
  ayyub: {
    id: "ayyub",
    name: "Sheikh Muhammad Ayyub",
    arabicName: "الشيخ محمد أيوب بن محمد يوسف رحمه الله",
    title: "Imam de la Mosquée du Prophète ﷺ à Médine (Al-Masjid An-Nabawi)",
    photoUrl: "/images/sheikh_ayyub.jpg",
    mosque: "Médine (Masjid An-Nabawi)",
    years: "1990 - 1997 / 2015",
    bio: "Né en 1372H (1952) et décédé en 2016, Sheikh Muhammad Ayyub est le maître incontesté de la psalmodie hijazie médinoise. Élève des plus grands savants de Médine et professeur de Coran et Tafsir à l'Université Islamique, ses récitations nocturnes de Tarawih sous la coupole du Prophète ﷺ dans les années 90 sont considérées comme un sommet d'émotion et de spiritualité.",
  },
  hudhaify: {
    id: "hudhaify",
    name: "Sheikh Ali Al-Hudhaify",
    arabicName: "الشيخ الدكتور علي بن عبد الرحمن الحذيفي حفظه الله",
    title: "Doyen des Imams de la Mosquée du Prophète ﷺ à Médine",
    photoUrl: "/images/sheikh_hudhaify.jpg",
    mosque: "La Mecque & Médine",
    years: "1979 - Présent",
    bio: "Figure tutélaire de la psalmodie mondiale, Sheikh Ali Al-Hudhaify est considéré comme la référence absolue du Tajweed et de la récitation académique rigoureuse (Tartil). Imam à la Mosquée du Prophète ﷺ depuis 1399H (1979) et ayant également guidé les prières de Tarawih à La Mecque en 1408H/1409H, son enregistrement du Coran complet est la référence d'apprentissage par excellence.",
  },
  khulaifi: {
    id: "khulaifi",
    name: "Sheikh Abdullah Al-Khulaifi",
    arabicName: "الشيخ عبد الله بن محمد الخليفي رحمه الله",
    title: "Doyen historique des Imams de Masjid Al-Haram (1953 - 1993)",
    photoUrl: "/images/sheikh_khulaifi.jpg",
    mosque: "La Mecque (Masjid Al-Haram)",
    years: "1953 - 1993",
    bio: "Pendant quatre décennies ininterrompues (1373H à 1414H), Sheikh Al-Khulaifi a guidé les prières et les clôtures du Coran (Khatm Al-Quran) à la Kaaba. Pionnier de l'instauration des prières nocturnes de Tahajjud à La Mecque, sa voix douce et larmoyante a accompagné des générations de pèlerins à travers l'âge classique des Haramain.",
  },
  juhany: {
    id: "juhany",
    name: "Sheikh Abdullah Al-Juhany",
    arabicName: "الشيخ الدكتور عبد الله بن عواد الجهني حفظه الله",
    title: "Imam de Masjid Al-Haram à La Mecque",
    photoUrl: "/images/sheikh_juhany.jpg",
    mosque: "La Mecque & Médine",
    years: "1998 - Présent",
    bio: "Diplômé de la Faculté du Coran de Médine et titulaire d'un doctorat en Charia à Umm Al-Qura, Sheikh Al-Juhany est l'un des très rares imams à avoir officié dans les quatre mosquées majeures (Masjid Quba, Masjid Al-Qiblatayn, Masjid An-Nabawi et Masjid Al-Haram). Sa voix limpide, son souffle maîtrisé et sa douceur musicale sont admirés mondialement.",
  },
};

/**
 * Helper to identify which reciter(s) correspond to a video item
 */
export function getReciterForItem(title: string, desc: string = "", channel: string = ""): ReciterInfo | null {
  const combined = `${title} ${desc} ${channel}`.toLowerCase();

  // Strict check: must be a Haramain / Tarawih / Sheikh recitation item
  const isRecitation =
    channel === "Récitations Haramain" ||
    combined.includes("taraweeh") ||
    combined.includes("tarawih") ||
    combined.includes("makkah") ||
    combined.includes("madinah") ||
    combined.includes("sheikh ");

  if (!isRecitation) {
    return null;
  }

  if (combined.includes("ali jaber") || (combined.includes("jaber") && combined.includes("sheikh"))) {
    return RECITERS_DATA.ali_jaber;
  }
  if (combined.includes("sudais") || combined.includes("soudais")) {
    return RECITERS_DATA.sudais;
  }
  if (combined.includes("shuraim") || combined.includes("chouraim")) {
    return RECITERS_DATA.shuraim;
  }
  if (combined.includes("ayyub") || combined.includes("ayyoub") || combined.includes("ayoub")) {
    return RECITERS_DATA.ayyub;
  }
  if (combined.includes("hudhaify") || combined.includes("hudhayfi")) {
    return RECITERS_DATA.hudhaify;
  }
  if (combined.includes("khulaifi") || combined.includes("kholeifi")) {
    return RECITERS_DATA.khulaifi;
  }
  if (combined.includes("juhany") || combined.includes("johany")) {
    return RECITERS_DATA.juhany;
  }

  if (channel === "Récitations Haramain") {
    return RECITERS_DATA.ali_jaber;
  }

  return null;
}
