export type DuaTheme =
  | "Réveil"
  | "Sommeil"
  | "Repas"
  | "Voyage"
  | "Anxiété"
  | "Protection"
  | "Après la prière";

export type Dua = {
  id: string;
  theme: DuaTheme;
  arabic: string;
  transliteration: string;
  translation: string;
  reference: string;
};

export const DUA_THEMES: DuaTheme[] = [
  "Réveil",
  "Sommeil",
  "Repas",
  "Voyage",
  "Anxiété",
  "Protection",
  "Après la prière",
];

export const duas: Dua[] = [
  {
    id: "wake-1",
    theme: "Réveil",
    arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ",
    transliteration: "Al-hamdu lillahil-ladhi ahyana ba'da ma amatana wa ilayhin-nushur.",
    translation: "Louange à Allah qui nous a fait revivre après nous avoir fait mourir, et vers Lui est la résurrection.",
    reference: "Al-Bukhari",
  },
  {
    id: "wake-2",
    theme: "Réveil",
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا طَيِّبًا وَعَمَلًا مُتَقَبَّلًا",
    transliteration: "Allahumma inni as'aluka ilman nafi'an, wa rizqan tayyiban, wa amalan mutaqabbalan.",
    translation: "Ô Allah, je Te demande une science utile, une bonne subsistance et une oeuvre acceptée.",
    reference: "Ibn Majah",
  },
  {
    id: "sleep-1",
    theme: "Sommeil",
    arabic: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا",
    transliteration: "Bismika Allahumma amutu wa ahya.",
    translation: "C'est en Ton nom, ô Allah, que je meurs et que je vis.",
    reference: "Al-Bukhari",
  },
  {
    id: "sleep-2",
    theme: "Sommeil",
    arabic: "اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ",
    transliteration: "Allahumma qini adhabaka yawma tab'athu ibadak.",
    translation: "Ô Allah, protège-moi de Ton châtiment le jour où Tu ressusciteras Tes serviteurs.",
    reference: "Abu Dawud, At-Tirmidhi",
  },
  {
    id: "meal-1",
    theme: "Repas",
    arabic: "بِسْمِ اللَّهِ",
    transliteration: "Bismillah.",
    translation: "Au nom d'Allah.",
    reference: "Abu Dawud, At-Tirmidhi",
  },
  {
    id: "meal-2",
    theme: "Repas",
    arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ",
    transliteration: "Al-hamdu lillahil-ladhi at'amani hadha wa razaqanihi min ghayri hawlin minni wa la quwwah.",
    translation: "Louange à Allah qui m'a nourri de ceci et me l'a accordé sans force ni puissance de ma part.",
    reference: "Abu Dawud, At-Tirmidhi",
  },
  {
    id: "meal-3",
    theme: "Repas",
    arabic: "بِسْمِ اللَّهِ فِي أَوَّلِهِ وَآخِرِهِ",
    transliteration: "Bismillahi fi awwalihi wa akhirihi.",
    translation: "Au nom d'Allah au début et à la fin.",
    reference: "Abu Dawud, At-Tirmidhi",
  },
  {
    id: "travel-1",
    theme: "Voyage",
    arabic: "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنقَلِبُونَ",
    transliteration: "Subhanal-ladhi sakhkhara lana hadha wa ma kunna lahu muqrinin, wa inna ila rabbina lamunqalibun.",
    translation: "Gloire à Celui qui a soumis cela à notre service, alors que nous n'aurions pas pu le maîtriser. Et c'est vers notre Seigneur que nous retournerons.",
    reference: "Muslim",
  },
  {
    id: "travel-2",
    theme: "Voyage",
    arabic: "اللَّهُمَّ هَوِّنْ عَلَيْنَا سَفَرَنَا هَذَا وَاطْوِ عَنَّا بُعْدَهُ",
    transliteration: "Allahumma hawwin alayna safarana hadha watwi anna bu'dahu.",
    translation: "Ô Allah, facilite-nous ce voyage et raccourcis-en la distance.",
    reference: "Muslim",
  },
  {
    id: "travel-3",
    theme: "Voyage",
    arabic: "اللَّهُمَّ أَنْتَ الصَّاحِبُ فِي السَّفَرِ وَالْخَلِيفَةُ فِي الأَهْلِ",
    transliteration: "Allahumma antas-sahibu fis-safari wal-khalifatu fil-ahl.",
    translation: "Ô Allah, Tu es le Compagnon durant le voyage et le Protecteur de la famille.",
    reference: "Muslim",
  },
  {
    id: "anxiety-1",
    theme: "Anxiété",
    arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الهَمِّ وَالْحَزَنِ وَأَعُوذُ بِكَ مِنَ الْعَجْزِ وَالْكَسَلِ",
    transliteration: "Allahumma inni a'udhu bika minal-hammi wal-hazan, wa a'udhu bika minal-ajzi wal-kasal.",
    translation: "Ô Allah, je cherche refuge auprès de Toi contre l'angoisse et la tristesse, contre l'incapacité et la paresse.",
    reference: "Al-Bukhari",
  },
  {
    id: "anxiety-2",
    theme: "Anxiété",
    arabic: "حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ",
    transliteration: "Hasbiyallahu la ilaha illa Huwa, alayhi tawakkaltu wa Huwa Rabbul-'Arshil-'Azim.",
    translation: "Allah me suffit. Il n'y a de divinité que Lui. En Lui je place ma confiance et Il est le Seigneur du Trône immense.",
    reference: "Coran 9:129",
  },
  {
    id: "anxiety-3",
    theme: "Anxiété",
    arabic: "رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي",
    transliteration: "Rabbishrah li sadri wa yassir li amri.",
    translation: "Seigneur, ouvre-moi la poitrine et facilite-moi ma tâche.",
    reference: "Coran 20:25-26",
  },
  {
    id: "protection-1",
    theme: "Protection",
    arabic: "قُلْ هُوَ اللَّهُ أَحَدٌ  اللَّهُ الصَّمَدُ  لَمْ يَلِدْ وَلَمْ يُولَدْ  وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ",
    transliteration: "Qul Huwa Allahu Ahad. Allahus-Samad. Lam yalid wa lam yulad. Wa lam yakun lahu kufuwan ahad.",
    translation: "Dis : Il est Allah, l'Unique. Allah, Le Seul à être imploré. Il n'a jamais engendré et n'a pas été engendré. Nul n'est égal à Lui.",
    reference: "Coran 112",
  },
  {
    id: "protection-2",
    theme: "Protection",
    arabic: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",
    transliteration: "A'udhu bi kalimatillahit-tammati min sharri ma khalaq.",
    translation: "Je cherche refuge dans les paroles parfaites d'Allah contre le mal de ce qu'Il a créé.",
    reference: "Muslim",
  },
  {
    id: "protection-3",
    theme: "Protection",
    arabic: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
    transliteration: "Bismillahil-ladhi la yadurru ma'as-mihi shay'un fil-ardi wa la fis-sama'i wa Huwas-Sami'ul-'Alim.",
    translation: "Au nom d'Allah, avec le nom duquel rien sur terre ni au ciel ne peut nuire. Il est l'Audient, l'Omniscient.",
    reference: "Abu Dawud, At-Tirmidhi",
  },
  {
    id: "after-prayer-1",
    theme: "Après la prière",
    arabic: "أَسْتَغْفِرُ اللَّهَ، أَسْتَغْفِرُ اللَّهَ، أَسْتَغْفِرُ اللَّهَ",
    transliteration: "Astaghfirullah, astaghfirullah, astaghfirullah.",
    translation: "Je demande pardon à Allah, trois fois.",
    reference: "Muslim",
  },
  {
    id: "after-prayer-2",
    theme: "Après la prière",
    arabic: "اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالإِكْرَامِ",
    transliteration: "Allahumma antas-salam wa minkas-salam, tabarakta ya dhal-jalali wal-ikram.",
    translation: "Ô Allah, Tu es la Paix et la paix vient de Toi. Béni sois-Tu, ô Possesseur de majesté et de générosité.",
    reference: "Muslim",
  },
  {
    id: "after-prayer-3",
    theme: "Après la prière",
    arabic: "اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ",
    transliteration: "Allahumma a'inni ala dhikrika wa shukrika wa husni ibadatik.",
    translation: "Ô Allah, aide-moi à T'évoquer, à Te remercier et à bien T'adorer.",
    reference: "Abu Dawud, An-Nasa'i",
  },
];
