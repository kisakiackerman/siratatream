export type HadithAuthenticity = "Sahih" | "Hasan";

export type HadithCategory =
  | "Toutes"
  | "Foi & Intention"
  | "Comportement & Morale"
  | "Prière & Adoration"
  | "Fraternité & Aumône"
  | "Pardon & Repentir"
  | "Savoir & Sagesse"
  | "Patience & Épreuves";

export interface HadithItem {
  id: string;
  narrator: string;
  source: string;
  authenticity: HadithAuthenticity;
  category: Exclude<HadithCategory, "Toutes">;
  textFr: string;
  textAr?: string;
  reference: string;
  lesson?: string;
}

export const HADITH_CATEGORIES: HadithCategory[] = [
  "Toutes",
  "Foi & Intention",
  "Comportement & Morale",
  "Prière & Adoration",
  "Fraternité & Aumône",
  "Pardon & Repentir",
  "Savoir & Sagesse",
  "Patience & Épreuves",
];

export const HADITHS_DATA: HadithItem[] = [
  {
    id: "hadith-1",
    narrator: "Omar ibn al-Khattab (qu'Allah l'agrée)",
    source: "Sahih al-Bukhari & Sahih Muslim",
    authenticity: "Sahih",
    category: "Foi & Intention",
    textFr: "Les actions ne valent que par leurs intentions, et chacun ne recevra la rétribution que selon ce qu'il a eu l'intention d'accomplir.",
    textAr: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى",
    reference: "Al-Bukhari (n°1), Muslim (n°1907)",
    lesson: "L'intention sincère tournée vers Allah est la condition première de l'acceptation de toute bonne action.",
  },
  {
    id: "hadith-2",
    narrator: "Abou Hourayra (qu'Allah l'agrée)",
    source: "Sahih al-Bukhari",
    authenticity: "Sahih",
    category: "Comportement & Morale",
    textFr: "Le Prophète ﷺ a dit : « Celui qui croit en Allah et au Jour dernier, qu'il dise du bien ou qu'il se taise. Celui qui croit en Allah et au Jour dernier, qu'il honore son voisin. Celui qui croit en Allah et au Jour dernier, qu'il honore son hôte. »",
    textAr: "مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ",
    reference: "Al-Bukhari (n°6018), Muslim (n°47)",
    lesson: "La retenue de la langue et la bienveillance envers le voisinage et les invités sont les fruits directs de la foi véritable.",
  },
  {
    id: "hadith-3",
    narrator: "Anas ibn Malik (qu'Allah l'agrée)",
    source: "Sahih al-Bukhari & Sahih Muslim",
    authenticity: "Sahih",
    category: "Fraternité & Aumône",
    textFr: "Aucun d'entre vous ne sera véritablement croyant tant qu'il n'aimera pas pour son frère ce qu'il aime pour lui-même.",
    textAr: "لاَ يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ",
    reference: "Al-Bukhari (n°13), Muslim (n°45)",
    lesson: "L'altruisme et la bienveillance fraternelle sont l'essence même de la perfection spirituelle.",
  },
  {
    id: "hadith-4",
    narrator: "Abou Hourayra (qu'Allah l'agrée)",
    source: "Sahih Muslim",
    authenticity: "Sahih",
    category: "Pardon & Repentir",
    textFr: "Par Celui qui tient mon âme dans Sa main, si vous ne commettiez pas de péchés, Allah vous ferait disparaître pour amener un peuple qui commettrait des péchés, demanderait ensuite pardon à Allah, et Il leur pardonnerait.",
    textAr: "وَالَّذِي نَفْسِي بِيَدِهِ لَوْ لَمْ تُذْنِبُوا لَذَهَبَ اللَّهُ بِكُمْ وَلَجَاءَ بِقَوْمٍ يُذْنِبُونَ فَيَسْتَغْفِرُونَ اللَّهَ فَيَغْفِرُ لَهُمْ",
    reference: "Muslim (n°2749)",
    lesson: "Allah aime le repentir sincère de Ses serviteurs et Sa miséricorde embrasse toute faute confessée avec humilité.",
  },
  {
    id: "hadith-5",
    narrator: "Ibn Abbas (qu'Allah l'agrée)",
    source: "Sunan at-Tirmidhi",
    authenticity: "Hasan",
    category: "Foi & Intention",
    textFr: "Le Prophète ﷺ m'a dit : « Ô jeune homme ! Je vais t'enseigner quelques paroles : Préserve les préceptes d'Allah, Il te préservera. Préserve les droits d'Allah, tu Le trouveras devant toi. Si tu demandes, demande à Allah ; et si tu implores secours, implore le secours d'Allah. »",
    textAr: "يَا غُلاَمُ إِنِّي أُعَلِّمُكَ كَلِمَاتٍ: احْفَظِ اللَّهَ يَحْفَظْكَ، احْفَظِ اللَّهَ تَجِدْهُ تُجَاهَكَ",
    reference: "At-Tirmidhi (n°2516), Hadith Sahih selon Al-Albani",
    lesson: "Le Tawhid absolu et la confiance totale en Allah offrent sérénité et protection en toute circonstance.",
  },
  {
    id: "hadith-6",
    narrator: "Abou Hourayra (qu'Allah l'agrée)",
    source: "Sahih Muslim",
    authenticity: "Sahih",
    category: "Savoir & Sagesse",
    textFr: "Celui qui emprunte un chemin à la recherche d'une science, Allah lui facilite par cela un chemin vers le Paradis.",
    textAr: "مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ",
    reference: "Muslim (n°2699)",
    lesson: "L'apprentissage religieux et spirituel est un investissement noble récompensé par la guidée vers le Paradis.",
  },
  {
    id: "hadith-7",
    narrator: "Suhaib ar-Rumi (qu'Allah l'agrée)",
    source: "Sahih Muslim",
    authenticity: "Sahih",
    category: "Patience & Épreuves",
    textFr: "Combien est étonnante l'affaire du croyant ! Toute son affaire est pour lui un bien : si un bonheur le touche, il remercie Allah et c'est un bien pour lui ; et si une épreuve le frappe, il fait preuve de patience et c'est un bien pour lui.",
    textAr: "عَجَبًا لأَمْرِ الْمُؤْمِنِ إِنَّ أَمْرَهُ كُلَّهُ خَيْرٌ",
    reference: "Muslim (n°2999)",
    lesson: "La foi transforme chaque moment de joie en reconnaissance et chaque épreuve en élévation spirituelle.",
  },
  {
    id: "hadith-8",
    narrator: "Abdullah ibn Amr (qu'Allah l'agrée)",
    source: "Sahih al-Bukhari",
    authenticity: "Sahih",
    category: "Comportement & Morale",
    textFr: "Le véritable musulman est celui dont les musulmans sont préservés du mal de sa langue et de sa main.",
    textAr: "الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ",
    reference: "Al-Bukhari (n°10), Muslim (n°40)",
    lesson: "La sainteté de la réputation et des biens d'autrui est un devoir sacré pour tout croyant.",
  },
  {
    id: "hadith-9",
    narrator: "Abou Hourayra (qu'Allah l'agrée)",
    source: "Sahih al-Bukhari",
    authenticity: "Sahih",
    category: "Fraternité & Aumône",
    textFr: "Le sourire que tu adresses à ton frère est une aumône, ordonner le convenable et interdire le blâmable est une aumône, et guider un homme qui s'égare sur son chemin est une aumône.",
    textAr: "تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ لَكَ صَدَقَةٌ",
    reference: "At-Tirmidhi (n°1956), Al-Bukhari dans Al-Adab al-Mufrad",
    lesson: "L'aumône en Islam ne se limite pas à l'argent : un geste bienveillant ou une parole douce réchauffent les cœurs.",
  },
  {
    id: "hadith-10",
    narrator: "Aïcha (qu'Allah l'agrée)",
    source: "Sahih al-Bukhari & Sahih Muslim",
    authenticity: "Sahih",
    category: "Prière & Adoration",
    textFr: "L'œuvre la plus aimée auprès d'Allah est celle qui est accomplie avec régularité, même si elle est modeste.",
    textAr: "أَحَبُّ الأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ",
    reference: "Al-Bukhari (n°6464), Muslim (n°783)",
    lesson: "La constance et la persévérance pèsent plus lourd que des efforts intenses mais éphémères.",
  },
  {
    id: "hadith-11",
    narrator: "Othman ibn Affan (qu'Allah l'agrée)",
    source: "Sahih al-Bukhari",
    authenticity: "Sahih",
    category: "Savoir & Sagesse",
    textFr: "Le meilleur d'entre vous est celui qui apprend le Coran et l'enseigne.",
    textAr: "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ",
    reference: "Al-Bukhari (n°5027)",
    lesson: "Transmettre et réciter le Noble Coran constituent le plus haut rang de noblesse spirituelle.",
  },
  {
    id: "hadith-12",
    narrator: "Abou Qatada (qu'Allah l'agrée)",
    source: "Sahih Muslim",
    authenticity: "Sahih",
    category: "Prière & Adoration",
    textFr: "Le jeûne du jour d'Arafat, j'espère d'Allah qu'il expie les péchés de l'année précédente et de l'année suivante ; et le jeûne du jour d'Achoura expie les péchés de l'année passée.",
    textAr: "صِيَامُ يَوْمِ عَرَفَةَ أَحْتَسِبُ عَلَى اللَّهِ أَنْ يُكَفِّرَ السَّنَةَ الَّتِي قَبْلَهُ وَالسَّنَةَ الَّتِي بَعْدَهُ",
    reference: "Muslim (n°1162)",
    lesson: "Les jours bénis du calendrier hégirien renferment d'immenses trésors de pardon divin.",
  },
];
