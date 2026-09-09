export type DailyReminder = {
  arabic?: string;
  translation: string;
  reference: string;
};

export const dailyReminders: DailyReminder[] = [
  { arabic: "إِنَّ مَعَ الْعُسْرِ يُسْرًا", translation: "Avec la difficulté vient certes la facilité.", reference: "Coran 94:6" },
  { arabic: "فَاذْكُرُونِي أَذْكُرْكُمْ", translation: "Évoquez-Moi, Je vous évoquerai.", reference: "Coran 2:152" },
  { arabic: "وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ", translation: "Il est avec vous où que vous soyez.", reference: "Coran 57:4" },
  { arabic: "إِنَّ اللَّهَ مَعَ الصَّابِرِينَ", translation: "Allah est certes avec les patients.", reference: "Coran 2:153" },
  { arabic: "وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ", translation: "Quiconque place sa confiance en Allah, Il lui suffit.", reference: "Coran 65:3" },
  { arabic: "وَقُل رَّبِّ زِدْنِي عِلْمًا", translation: "Et dis : Seigneur, augmente ma science.", reference: "Coran 20:114" },
  { arabic: "إِنَّ اللَّهَ يُحِبُّ التَّوَّابِينَ", translation: "Allah aime ceux qui se repentent constamment.", reference: "Coran 2:222" },
  { arabic: "وَاللَّهُ خَيْرٌ حَافِظًا", translation: "Allah est le meilleur gardien.", reference: "Coran 12:64" },
  { arabic: "لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ", translation: "Ne désespérez pas de la miséricorde d'Allah.", reference: "Coran 39:53" },
  { translation: "Les actes ne valent que par leurs intentions.", reference: "Hadith, Al-Bukhari et Muslim" },
  { translation: "Le meilleur d'entre vous est celui qui apprend le Coran et l'enseigne.", reference: "Hadith, Al-Bukhari" },
  { translation: "La parole bonne est une aumône.", reference: "Hadith, Al-Bukhari et Muslim" },
  { translation: "Allah ne regarde ni vos corps ni vos apparences, mais vos coeurs et vos oeuvres.", reference: "Hadith, Muslim" },
  { translation: "La douceur n'est présente dans une chose qu'elle ne l'embellit.", reference: "Hadith, Muslim" },
  { translation: "Le fort est celui qui se maîtrise dans la colère.", reference: "Hadith, Al-Bukhari et Muslim" },
  { translation: "Aucun de vous ne croit vraiment jusqu'à ce qu'il aime pour son frère ce qu'il aime pour lui-même.", reference: "Hadith, Al-Bukhari et Muslim" },
  { translation: "Facilitez et ne rendez pas les choses difficiles.", reference: "Hadith, Al-Bukhari et Muslim" },
  { translation: "Qu'il dise du bien ou qu'il se taise.", reference: "Hadith, Al-Bukhari et Muslim" },
  { translation: "Allah est beau et Il aime la beauté.", reference: "Hadith, Muslim" },
  { translation: "Le croyant pour le croyant est comme un édifice dont les parties se soutiennent.", reference: "Hadith, Al-Bukhari et Muslim" },
  { translation: "Quiconque croit en Allah et au Jour dernier, qu'il honore son voisin.", reference: "Hadith, Al-Bukhari et Muslim" },
  { translation: "Sourire à ton frère est une aumône.", reference: "Hadith, At-Tirmidhi" },
  { translation: "La propreté est la moitié de la foi.", reference: "Hadith, Muslim" },
  { translation: "Celui qui ne remercie pas les gens ne remercie pas Allah.", reference: "Hadith, At-Tirmidhi" },
  { translation: "La miséricorde n'est retirée qu'à celui qui est malheureux.", reference: "Hadith, Abu Dawud" },
  { translation: "La meilleure aumône est celle que tu donnes alors que tu es en bonne santé.", reference: "Hadith, Al-Bukhari et Muslim" },
  { translation: "Celui qui aide son frère, Allah l'aide.", reference: "Hadith, Muslim" },
  { translation: "Le musulman est celui dont les musulmans sont à l'abri de sa langue et de sa main.", reference: "Hadith, Al-Bukhari et Muslim" },
  { translation: "Ne vous détestez pas, ne vous enviez pas, soyez des frères.", reference: "Hadith, Al-Bukhari et Muslim" },
  { translation: "La foi comporte plus de soixante-dix branches.", reference: "Hadith, Muslim" },
];

export function getDailyReminder(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000);
  const index = Math.abs((dayOfYear - 1) % dailyReminders.length);
  return dailyReminders[index];
}
