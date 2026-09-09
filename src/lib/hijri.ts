export type HijriMonthInfo = {
  index: number;
  nameFr: string;
  nameAr: string;
  nameTranslit: string;
  isSacred: boolean;
  meaning: string;
};

export const HIJRI_MONTHS: readonly HijriMonthInfo[] = [
  { index: 1, nameFr: "Mouharram", nameAr: "مُحَرَّم", nameTranslit: "Muharram", isSacred: true, meaning: "Mois sacré, premier mois de l'année hégirienne" },
  { index: 2, nameFr: "Safar", nameAr: "صَفَر", nameTranslit: "Safar", isSacred: false, meaning: "Deuxième mois de l'année" },
  { index: 3, nameFr: "Rabi' al-Awwal", nameAr: "رَبِيع الأَوَّل", nameTranslit: "Rabi' al-Awwal", isSacred: false, meaning: "Mois de la naissance du Prophète ﷺ" },
  { index: 4, nameFr: "Rabi' ath-Thani", nameAr: "رَبِيع الآخِر", nameTranslit: "Rabi' ath-Thani", isSacred: false, meaning: "Quatrième mois hégirien" },
  { index: 5, nameFr: "Joumada al-Oula", nameAr: "جُمَادَى الأُولَى", nameTranslit: "Jumada al-Awwal", isSacred: false, meaning: "Cinquième mois hégirien" },
  { index: 6, nameFr: "Joumada al-Akhira", nameAr: "جُمَادَى الآخِرَة", nameTranslit: "Jumada ath-Thaniyah", isSacred: false, meaning: "Sixième mois hégirien" },
  { index: 7, nameFr: "Rajab", nameAr: "رَجَب", nameTranslit: "Rajab", isSacred: true, meaning: "Mois sacré, commémoration du Voyage Nocturne (Al-Isra wal-Mi'raj)" },
  { index: 8, nameFr: "Cha'bane", nameAr: "شَعْبَان", nameTranslit: "Sha'ban", isSacred: false, meaning: "Mois précédant Ramadan, mois du jeûne surérogatoire" },
  { index: 9, nameFr: "Ramadan", nameAr: "رَمَضَان", nameTranslit: "Ramadan", isSacred: false, meaning: "Mois béni du jeûne obligatoire et de la révélation du Coran" },
  { index: 10, nameFr: "Chawwal", nameAr: "شَوَّال", nameTranslit: "Shawwal", isSacred: false, meaning: "Mois de la fête de l'Aïd al-Fitr et des 6 jours de jeûne méritoires" },
  { index: 11, nameFr: "Dhou al-Qi'da", nameAr: "ذُو القَعْدَة", nameTranslit: "Dhu al-Qi'dah", isSacred: true, meaning: "Mois sacré précédant le grand pèlerinage" },
  { index: 12, nameFr: "Dhou al-Hijja", nameAr: "ذُو الحِجَّة", nameTranslit: "Dhu al-Hijjah", isSacred: true, meaning: "Mois du grand pèlerinage (Hajj), du jour d'Arafat et de l'Aïd al-Adha" },
] as const;

export type HijriDate = {
  day: number;
  month: number;
  year: number;
  monthName: string;
  monthNameAr: string;
  monthNameTranslit: string;
  dayNameFr: string;
  dayNameAr: string;
  formattedHijri: string;
  formattedHijriAr: string;
  formattedMiladi: string;
  isSacredMonth: boolean;
  isWhiteDay: boolean; // 13, 14, 15
  isFastingDay: boolean; // Lundi, Jeudi, Jours Blancs
  gregorianDate: Date;
};

const DAY_NAMES_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const DAY_NAMES_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

/**
 * Converts a Gregorian Date into an accurate Umm al-Qura Hijri Date
 */
export function gregorianToHijri(date: Date = new Date()): HijriDate {
  // Ensure valid date
  const validDate = isNaN(date.getTime()) ? new Date() : date;
  
  let hDay = 1;
  let hMonth = 1;
  let hYear = 1448;

  try {
    const formatter = new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
    const parts = formatter.formatToParts(validDate);
    for (const part of parts) {
      if (part.type === "day") hDay = parseInt(part.value, 10);
      if (part.type === "month") hMonth = parseInt(part.value, 10);
      if (part.type === "year") hYear = parseInt(part.value, 10);
    }
  } catch {
    // Fallback algorithmic calculation if Intl umalqura fails
    const julian = gregorianToJulianDay(validDate);
    const fallback = julianDayToHijriFallback(julian);
    hDay = fallback.day;
    hMonth = fallback.month;
    hYear = fallback.year;
  }

  // Safety clamps
  hMonth = Math.max(1, Math.min(12, hMonth));
  const monthInfo = HIJRI_MONTHS[hMonth - 1] || HIJRI_MONTHS[0];

  const dayOfWeek = validDate.getUTCDay();
  const dayNameFr = DAY_NAMES_FR[dayOfWeek] || "";
  const dayNameAr = DAY_NAMES_AR[dayOfWeek] || "";

  const isWhiteDay = hDay === 13 || hDay === 14 || hDay === 15;
  const isMondayOrThursday = dayOfWeek === 1 || dayOfWeek === 4;
  const isFastingDay = isWhiteDay || isMondayOrThursday || (hMonth === 9);

  const formattedMiladi = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(validDate);

  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  const toArabicDigits = (num: number) =>
    num.toString().split("").map((c) => arabicDigits[parseInt(c, 10)] ?? c).join("");

  return {
    day: hDay,
    month: hMonth,
    year: hYear,
    monthName: monthInfo.nameFr,
    monthNameAr: monthInfo.nameAr,
    monthNameTranslit: monthInfo.nameTranslit,
    dayNameFr,
    dayNameAr,
    formattedHijri: `${hDay} ${monthInfo.nameFr} ${hYear} H`,
    formattedHijriAr: `${toArabicDigits(hDay)} ${monthInfo.nameAr} ${toArabicDigits(hYear)} هـ`,
    formattedMiladi,
    isSacredMonth: monthInfo.isSacred,
    isWhiteDay,
    isFastingDay,
    gregorianDate: validDate,
  };
}

/**
 * Converts a Hijri (Umm al-Qura) Date into a Gregorian Date accurately
 */
export function hijriToGregorian(year: number, month: number, day: number = 1): Date {
  const hYear = Math.max(1300, Math.min(1600, year));
  const hMonth = Math.max(1, Math.min(12, month));
  const hDay = Math.max(1, Math.min(30, day));

  // Approximate date using average lunar year (354.367 days)
  const approxEpochMs =
    Date.UTC(622, 6, 16) +
    (hYear - 1) * 354.367 * 86400000 +
    (hMonth - 1) * 29.53 * 86400000 +
    (hDay - 1) * 86400000;

  let testDate = new Date(approxEpochMs);
  testDate = new Date(Date.UTC(testDate.getUTCFullYear(), testDate.getUTCMonth(), testDate.getUTCDate()));

  let h = gregorianToHijri(testDate);

  for (let i = 0; i < 50; i++) {
    if (h.year === hYear && h.month === hMonth && h.day === hDay) {
      return testDate;
    }

    const diffMonths = (hYear * 12 + hMonth) - (h.year * 12 + h.month);
    const diffDays = diffMonths * 29.53 + (hDay - h.day);
    const step = Math.round(diffDays);

    if (step === 0) {
      if (h.day < hDay) {
        testDate = new Date(testDate.getTime() + 86400000);
      } else {
        testDate = new Date(testDate.getTime() - 86400000);
      }
    } else {
      testDate = new Date(testDate.getTime() + step * 86400000);
    }
    h = gregorianToHijri(testDate);
  }

  return testDate;
}

/**
 * Returns the number of days in a given Hijri month (29 or 30 days)
 */
export function getHijriMonthLength(year: number, month: number): number {
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const firstDayCurrent = hijriToGregorian(year, month, 1);
  const firstDayNext = hijriToGregorian(nextYear, nextMonth, 1);

  const diffMs = firstDayNext.getTime() - firstDayCurrent.getTime();
  const diffDays = Math.round(diffMs / 86400000);

  return diffDays === 30 ? 30 : 29;
}

export type HijriCalendarDay = {
  hijriDay: number;
  hijriMonth: number;
  hijriYear: number;
  gregorianDate: Date;
  gregorianDay: number;
  gregorianMonthName: string;
  isToday: boolean;
  isWhiteDay: boolean;
  isFriday: boolean;
  isFastingDay: boolean;
  events: string[];
};

/**
 * Returns full day grid for a given Hijri month and year
 */
export function getHijriMonthDays(year: number, month: number): HijriCalendarDay[] {
  const daysCount = getHijriMonthLength(year, month);
  const today = new Date();
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

  const days: HijriCalendarDay[] = [];

  for (let d = 1; d <= daysCount; d++) {
    const gregDate = hijriToGregorian(year, month, d);
    const gregUTC = Date.UTC(gregDate.getUTCFullYear(), gregDate.getUTCMonth(), gregDate.getUTCDate());
    const isToday = gregUTC === todayUTC;
    const isFriday = gregDate.getUTCDay() === 5;
    const isMondayOrThursday = gregDate.getUTCDay() === 1 || gregDate.getUTCDay() === 4;
    const isWhiteDay = d === 13 || d === 14 || d === 15;

    // Check special events
    const dayEvents: string[] = [];
    if (month === 1 && d === 1) dayEvents.push("Nouvel An Hégirien");
    if (month === 1 && d === 9) dayEvents.push("Tachou'a (Veille d'Achoura)");
    if (month === 1 && d === 10) dayEvents.push("Jour d'Achoura");
    if (month === 3 && d === 12) dayEvents.push("Mawlid an-Nabawi ﷺ");
    if (month === 7 && d === 27) dayEvents.push("Al-Isra wal-Mi'raj");
    if (month === 8 && d === 15) dayEvents.push("Nuit de la mi-Cha'bane");
    if (month === 9 && d === 1) dayEvents.push("1er Ramadan");
    if (month === 9 && (d === 21 || d === 23 || d === 25 || d === 27 || d === 29)) dayEvents.push("Nuits impaires du Destin");
    if (month === 9 && d === 27) dayEvents.push("Laylat al-Qadr (estimée)");
    if (month === 10 && d === 1) dayEvents.push("Aïd al-Fitr");
    if (month === 12 && d === 1) dayEvents.push("Début des 10 premiers jours bénis de Dhou al-Hijja");
    if (month === 12 && d === 8) dayEvents.push("Jour de Tarwiya (Hajj)");
    if (month === 12 && d === 9) dayEvents.push("Jour d'Arafat (Jeûne méritoire)");
    if (month === 12 && d === 10) dayEvents.push("Aïd al-Adha (Fête du Sacrifice)");
    if (month === 12 && (d === 11 || d === 12 || d === 13)) dayEvents.push("Jours de Tachriq");

    days.push({
      hijriDay: d,
      hijriMonth: month,
      hijriYear: year,
      gregorianDate: gregDate,
      gregorianDay: gregDate.getUTCDate(),
      gregorianMonthName: new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" }).format(gregDate),
      isToday,
      isWhiteDay,
      isFriday,
      isFastingDay: isWhiteDay || isMondayOrThursday || month === 9 || (month === 12 && d <= 9),
      events: dayEvents,
    });
  }

  return days;
}

export type IslamicEvent = {
  id: string;
  hijriMonth: number;
  hijriDay: number;
  titleFr: string;
  titleAr: string;
  description: string;
  importance: "major" | "recommended" | "historical";
};

export const ISLAMIC_EVENTS: readonly IslamicEvent[] = [
  {
    id: "new_year",
    hijriMonth: 1,
    hijriDay: 1,
    titleFr: "Nouvel An Hégirien (1er Mouharram)",
    titleAr: "رأس السنة الهجرية",
    description: "Commémoration de l'Hégire (émigration) du Prophète Muhammad ﷺ de La Mecque vers Médine.",
    importance: "major",
  },
  {
    id: "ashura",
    hijriMonth: 1,
    hijriDay: 10,
    titleFr: "Jour d'Achoura (10 Mouharram)",
    titleAr: "يوم عاشوراء",
    description: "Jour béni du salut du Prophète Moussa (Moïse) عليه السلام. Le jeûne de ce jour expie les péchés de l'année précédente.",
    importance: "major",
  },
  {
    id: "mawlid",
    hijriMonth: 3,
    hijriDay: 12,
    titleFr: "Mawlid an-Nabawi (12 Rabi' al-Awwal)",
    titleAr: "المولد النبوي الشريف",
    description: "Rappel et méditation sur la naissance et la vie exemplaire du Messager d'Allah ﷺ.",
    importance: "recommended",
  },
  {
    id: "isra_miraj",
    hijriMonth: 7,
    hijriDay: 27,
    titleFr: "Al-Isra wal-Mi'raj (27 Rajab)",
    titleAr: "الإسراء والمعراج",
    description: "Le Voyage Nocturne et l'Ascension Céleste où les cinq prières quotidiennes furent prescrites.",
    importance: "historical",
  },
  {
    id: "nisf_shaban",
    hijriMonth: 8,
    hijriDay: 15,
    titleFr: "Nuit du milieu de Cha'bane (15 Cha'bane)",
    titleAr: "ليلة النصف من شعبان",
    description: "Nuit de pardon, de miséricorde divine et de préparation spirituelle à l'approche de Ramadan.",
    importance: "recommended",
  },
  {
    id: "ramadan_start",
    hijriMonth: 9,
    hijriDay: 1,
    titleFr: "1er jour du mois sacré de Ramadan",
    titleAr: "أول أيام شهر رمضان المبارك",
    description: "Début du mois de la piété, du jeûne obligatoire, de la générosité et des prières nocturnes de Tarawih.",
    importance: "major",
  },
  {
    id: "laylat_al_qadr",
    hijriMonth: 9,
    hijriDay: 27,
    titleFr: "Laylat al-Qadr (Nuit du Destin estimée)",
    titleAr: "ليلة القدر المباركة",
    description: "Nuit meilleure que mille mois (plus de 83 ans d'adoration), recherchée parmi les dix dernières nuits impaires.",
    importance: "major",
  },
  {
    id: "eid_fitr",
    hijriMonth: 10,
    hijriDay: 1,
    titleFr: "Aïd al-Fitr (Fête de la Rupture du Jeûne)",
    titleAr: "عيد الفطر المبارك",
    description: "Fête célébrant l'accomplissement du mois de jeûne, marquée par la prière de l'Aïd et la Zakat al-Fitr.",
    importance: "major",
  },
  {
    id: "ten_dhul_hijjah",
    hijriMonth: 12,
    hijriDay: 1,
    titleFr: "Début des 10 premiers jours de Dhou al-Hijja",
    titleAr: "عشر ذي الحجة",
    description: "Les meilleurs jours de l'année auprès d'Allah pour multiplier les bonnes actions, le dhikr et le jeûne.",
    importance: "major",
  },
  {
    id: "arafat",
    hijriMonth: 12,
    hijriDay: 9,
    titleFr: "Jour de Arafat (9 Dhou al-Hijja)",
    titleAr: "يوم عرفة",
    description: "Le pilier central du pèlerinage (Hajj). Le jeûne pour les non-pèlerins expie les péchés de l'année passée et future.",
    importance: "major",
  },
  {
    id: "eid_adha",
    hijriMonth: 12,
    hijriDay: 10,
    titleFr: "Aïd al-Adha (Fête du Grand Sacrifice)",
    titleAr: "عيد الأضحى المبارك",
    description: "Grande fête du sacrifice en souvenir de la foi d'Ibrahim عليه السلام et de son fils Ismaïl.",
    importance: "major",
  },
  {
    id: "tashriq",
    hijriMonth: 12,
    hijriDay: 11,
    titleFr: "Jours de Tachriq (11, 12 et 13 Dhou al-Hijja)",
    titleAr: "أيام التشريق",
    description: "Jours de festin, de remerciement et de souvenir d'Allah suite à l'Aïd al-Adha.",
    importance: "recommended",
  },
] as const;

// Internal helpers
function gregorianToJulianDay(date: Date) {
  let year = date.getUTCFullYear();
  let month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const century = Math.floor(year / 100);
  return (
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day -
    century +
    Math.floor(century / 4) -
    1524.5
  );
}

function julianDayToHijriFallback(julianDay: number) {
  const day = Math.floor(julianDay) + 0.5;
  const year = Math.floor((30 * (day - 1948439.5) + 10646) / 10631);
  const month = Math.min(
    12,
    Math.ceil((day - (29 + hijriToJulianDayFallback(year, 1, 1))) / 29.5) + 1
  );
  const hijriDay = Math.floor(day - hijriToJulianDayFallback(year, month, 1) + 1);
  return {
    day: hijriDay,
    month,
    year,
  };
}

function hijriToJulianDayFallback(year: number, month: number, day: number) {
  return (
    day +
    Math.ceil(29.5 * (month - 1)) +
    (year - 1) * 354 +
    Math.floor((3 + 11 * year) / 30) +
    1948439.5
  );
}

export type KeyIslamicEventCountdown = {
  id: string;
  nameFr: string;
  nameAr: string;
  description: string;
  hijriMonth: number;
  hijriDay: number;
  gregorianDate: Date;
  formattedMiladi: string;
  daysRemaining: number;
  isToday: boolean;
  isWithin7Days: boolean;
  keywords: string[];
  suggestedCategories: string[];
};

export function getKeyEventCountdowns(referenceDate: Date = new Date()): KeyIslamicEventCountdown[] {
  const todayHijri = gregorianToHijri(referenceDate);
  const now = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()));

  const targetEvents = [
    {
      id: "nuit_doute",
      nameFr: "Nuit du Doute (Observation lunaire)",
      nameAr: "ليلة الشك",
      description: "Nuit d'observation du croissant lunaire pour annoncer le début officiel du mois sacré de Ramadan.",
      hijriMonth: 8,
      hijriDay: 29,
      keywords: ["ramadan", "lune", "croissant", "jeûne"],
      suggestedCategories: ["Coran", "Spiritualité"],
    },
    {
      id: "ramadan",
      nameFr: "1er Ramadan (Début du jeûne)",
      nameAr: "أول رمضان",
      description: "Mois sacré du jeûne obligatoire, de la piété accrue et de la révélation du Noble Coran.",
      hijriMonth: 9,
      hijriDay: 1,
      keywords: ["ramadan", "jeûne", "coran", "tarawih", "tafsir"],
      suggestedCategories: ["Coran", "Spiritualité"],
    },
    {
      id: "eid_fitr",
      nameFr: "Aïd al-Fitr (Fête de la Rupture)",
      nameAr: "عيد الفطر",
      description: "Grande fête marquant la conclusion bénie du mois de jeûne de Ramadan et l'acquittement de la Zakat al-Fitr.",
      hijriMonth: 10,
      hijriDay: 1,
      keywords: ["aïd", "eid", "fitr", "zakat", "fête", "joie"],
      suggestedCategories: ["Spiritualité", "Comportement"],
    },
    {
      id: "eid_adha",
      nameFr: "Aïd al-Adha (Fête du Sacrifice)",
      nameAr: "عيد الأضحى",
      description: "Fête du grand sacrifice commémorant la soumission inébranlable du prophète Ibrahim عليه السلام.",
      hijriMonth: 12,
      hijriDay: 10,
      keywords: ["aïd", "adha", "sacrifice", "ibrahim", "hajj", "arafat"],
      suggestedCategories: ["Prophètes", "Spiritualité"],
    },
    {
      id: "ashura",
      nameFr: "Jour d'Achoura (10 Mouharram)",
      nameAr: "يوم عاشوراء",
      description: "Jour de délivrance de Moussa (Moïse) et des Enfants d'Israël, marqué par un jeûne expiatoire très méritoire.",
      hijriMonth: 1,
      hijriDay: 10,
      keywords: ["achoura", "ashura", "moussa", "moïse", "jeûne"],
      suggestedCategories: ["Prophètes", "Histoire"],
    },
  ];

  return targetEvents.map((event) => {
    let targetGreg = hijriToGregorian(todayHijri.year, event.hijriMonth, event.hijriDay);
    const targetUTC = new Date(Date.UTC(targetGreg.getUTCFullYear(), targetGreg.getUTCMonth(), targetGreg.getUTCDate()));
    let diffMs = targetUTC.getTime() - now.getTime();
    let diffDays = Math.round(diffMs / 86400000);

    // If event already passed in current hijri year, project to next hijri year
    if (diffDays < 0) {
      targetGreg = hijriToGregorian(todayHijri.year + 1, event.hijriMonth, event.hijriDay);
      const nextTargetUTC = new Date(Date.UTC(targetGreg.getUTCFullYear(), targetGreg.getUTCMonth(), targetGreg.getUTCDate()));
      diffMs = nextTargetUTC.getTime() - now.getTime();
      diffDays = Math.round(diffMs / 86400000);
    }

    const isToday = diffDays === 0;
    const isWithin7Days = diffDays >= 0 && diffDays <= 7;

    const formattedMiladi = new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(targetGreg);

    return {
      id: event.id,
      nameFr: event.nameFr,
      nameAr: event.nameAr,
      description: event.description,
      hijriMonth: event.hijriMonth,
      hijriDay: event.hijriDay,
      gregorianDate: targetGreg,
      formattedMiladi,
      daysRemaining: diffDays,
      isToday,
      isWithin7Days,
      keywords: event.keywords,
      suggestedCategories: event.suggestedCategories,
    };
  }).sort((a, b) => a.daysRemaining - b.daysRemaining);
}


