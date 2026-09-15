// Export exhaustif des vidéos de la chaîne Minute Islam (>= 10 minutes)
// Total : 101 vidéos cataloguées
import type { Category, SkipSegment } from "./catalog";

export type MinuteIslamMetaItem = {
  cats: Category[];
  year: number;
  featured?: boolean;
  isNew?: boolean;
  isTrending?: boolean;
  duration?: string;
  skipSegments?: SkipSegment[];
};

export const minuteIslamRaw: [string, string, string][] = [
  ["Z7AXlDMrEug", "Cataclysme au NÉPAL : La Vérité Choc que PERSONNE ne veut voir", "Rappel et analyse documentaire approfondie par Minute Islam : « Cataclysme au NÉPAL : La Vérité Choc que PERSONNE ne veut voir ». Un enseignement clair pour méditer et fortifier sa foi (13:52)."],
  ["WUx1ErC39EQ", "J’ai Enquêté sur Les Nourrices Musulmanes en France : (ce n'est pas normal)", "Une grande enquête percutante sur la situation et les défis des nourrices et assistantes maternelles musulmanes en France, entre vocation, foi et pressions sociétales."],
  ["VWvVZdhYFtk", "Pourquoi les Hommes Ressemblent de plus en plus à des Femmes", "Analyse sociologique et spirituelle à la lumière des prophéties islamiques sur la perte des repères masculins et les bouleversements de notre époque contemporaine."],
  ["6Z-umY6WInU", "CANICULE : LA DÉRANGEANTE VÉRITÉ QUE NOUS CACHENT LES MÉDIAS", "Les chaleurs extrêmes et la canicule à la lumière des enseignements islamiques : un souffle de l'Enfer et un rappel des réalités de l'Au-delà."],
  ["nkvx27zE6Mo", "J'ai Enquêté sur Les Dessous du Poulet KFC Halal en France (AVS? ACHAHADA? MOSQUÉE DE LYON?)", "Grande enquête d'investigation sur la traçabilité de la viande et les organismes de certification halal (AVS, Achahada, Mosquée de Lyon) dans les fast-foods en France."],
  ["SkKnO_g1BrA", "LES SIGNES DE LA FIN DES TEMPS AVEC PREUVES L'INTÉGRALE", "Le grand documentaire intégral sur les signes mineurs et majeurs de la fin des temps, étayé par les textes authentiques du Coran et de la Sunnah."],
  ["Do_s-1BLe24", "ISRAEL et L'IRAN Vous cachent Quelque chose", "Décryptage des coulisses géopolitiques et eschatologiques entre Israël et l'Iran. Ce que les récits médiatiques traditionnels ne vous disent pas."],
  ["hF_VXUaKjGk", "D'où vient l'Obsession des Hommes à l'Infidélité ?", "Analyse des causes psychologiques et spirituelles de la trahison et de la tromperie, et comment la foi fortifie le foyer et le respect des engagements."],
  ["dWu6NUFfCvE", "J'ai Enquêté sur Ce GOUROU - Ancien Imam ( Et C'est parti Beaucoup Trop Loin)", "Une enquête exclusive et documentée sur les dérives sectaires d'un ancien imam devenu gourou, et les mécanismes de manipulation spirituelle."],
  ["aOg_IuF48AM", "Ils ont Falsifiés Le Nom d'Allah dans le Coran et Tu ne le sais Même Pas", "Rappel et analyse documentaire approfondie par Minute Islam : « Ils ont Falsifiés Le Nom d'Allah dans le Coran et Tu ne le sais Même Pas ». Un enseignement clair pour méditer et fortifier sa foi (13:23)."],
  ["WRzmmLgVnt4", "J'ai Enquêté sur Les FRÈRES 2.0 et c'est bien PIRE que ce que vous Croyez", "Une investigation choc sur les dérives du cyber-activisme et les faux influenceurs prétendant agir au nom de la communauté."],
  ["ce_fE_ROiRQ", "J'ai Enquêté sur Les OUKHTY 2.0 (et c'est bien Plus Troublant Que Vous Ne Le Croyez..)", "Rappel et analyse documentaire approfondie par Minute Islam : « J'ai Enquêté sur Les OUKHTY 2.0 (et c'est bien Plus Troublant Que Vous Ne Le Croyez..) ». Un enseignement clair pour méditer et fortifier sa foi (11:21)."],
  ["4H-Y9KhNHgI", "Ils ont Découvert Le Point Faible des Musulmans - c'est Affolant", "Rappel et analyse documentaire approfondie par Minute Islam : « Ils ont Découvert Le Point Faible des Musulmans - c'est Affolant ». Un enseignement clair pour méditer et fortifier sa foi (15:16)."],
  ["K4-DNtDbAfQ", "J'ai Enquêté sur Trump, les Rothschild et Le Pacte Secret Des Sionistes Chrétiens Contre l’islam", "Enquête géopolitique approfondie sur les alliances évangéliques, le sionisme chrétien aux États-Unis et leurs ambitions eschatologiques au Moyen-Orient."],
  ["upDdQeXbnMw", "Ne pose JAMAIS cette Question Religieuse à l'Intelligence Artificielle", "Rappel et analyse documentaire approfondie par Minute Islam : « Ne pose JAMAIS cette Question Religieuse à l'Intelligence Artificielle ». Un enseignement clair pour méditer et fortifier sa foi (14:40)."],
  ["8EQGUdUPPvs", "J'ai Enquêté sur le Documentaire de Micode - Voici Ce qu'il Vous a Vraiment Caché", "Rappel et analyse documentaire approfondie par Minute Islam : « J'ai Enquêté sur le Documentaire de Micode - Voici Ce qu'il Vous a Vraiment Caché ». Un enseignement clair pour méditer et fortifier sa foi (17:29)."],
  ["g9OyU6keq6k", "J'ai Enquêté sur les Imams de la République (il fallait s'y attendre...)", "Rappel et analyse documentaire approfondie par Minute Islam : « J'ai Enquêté sur les Imams de la République (il fallait s'y attendre...) ». Un enseignement clair pour méditer et fortifier sa foi (13:21)."],
  ["QUeue4K92X8", "L'Islam Au JAPON N'est pas ce que vous Croyez", "Rappel et analyse documentaire approfondie par Minute Islam : « L'Islam Au JAPON N'est pas ce que vous Croyez ». Un enseignement clair pour méditer et fortifier sa foi (12:58)."],
  ["WZnTMTwxVN0", "Ce Djinn te Suit jusqu'à la Mort - Et ce n'est pas le plus Choquant", "Les révélations authentiques sur le Qarin (le compagnon djinn assigné à chaque individu), ses murmures (waswas) et les moyens spirituels de s'en protéger."],
  ["FQ-fBfh4oDY", "Iran et Grand Israel, Mahdi et Mashia (fin des temps)", "Rappel et analyse documentaire approfondie par Minute Islam : « Iran et Grand Israel, Mahdi et Mashia (fin des temps) ». Un enseignement clair pour méditer et fortifier sa foi (13:11)."],
  ["eDR8LIihOZA", "J’ai Enquêté sur les ONG & Association internationale (vous n’êtes pas prêts)", "Enquête immersive sur le fonctionnement trouble de certaines grandes ONG et associations humanitaires internationales : où va réellement l'argent des dons ?"],
  ["6zm_ktPWG1Y", "J'ai Enquêté sur Les French Arabics (et c'est bien Plus Troublant Que Vous Ne Le Croyez..)", "Rappel et analyse documentaire approfondie par Minute Islam : « J'ai Enquêté sur Les French Arabics (et c'est bien Plus Troublant Que Vous Ne Le Croyez..) ». Un enseignement clair pour méditer et fortifier sa foi (22:15)."],
  ["MlJ-tz6t4kc", "J'ai Enquêté sur EPSTEIN et son Obsession Secrète de L'islam", "Rappel et analyse documentaire approfondie par Minute Islam : « J'ai Enquêté sur EPSTEIN et son Obsession Secrète de L'islam ». Un enseignement clair pour méditer et fortifier sa foi (11:36)."],
  ["l25LowW5j-s", "J'ai Enquêté sur l'Horrible Imam de CNEWS (et c'était pas facile)", "Rappel et analyse documentaire approfondie par Minute Islam : « J'ai Enquêté sur l'Horrible Imam de CNEWS (et c'était pas facile) ». Un enseignement clair pour méditer et fortifier sa foi (10:23)."],
  ["eE0xruxZxUA", "Peu de Musulmans savent ce que cache réellement Baphomet & Le Temple Satanique", "Rappel et analyse documentaire approfondie par Minute Islam : « Peu de Musulmans savent ce que cache réellement Baphomet & Le Temple Satanique ». Un enseignement clair pour méditer et fortifier sa foi (10:07)."],
  ["L7S72BYjym0", "Personne ne s'attend à ÇA après sa M0rt", "Rappel et analyse documentaire approfondie par Minute Islam : « Personne ne s'attend à ÇA après sa M0rt ». Un enseignement clair pour méditer et fortifier sa foi (16:41)."],
  ["k4h1C3fEodE", "Ce que révèle la chronologie de la fin des temps est surprenant !", "Rappel et analyse documentaire approfondie par Minute Islam : « Ce que révèle la chronologie de la fin des temps est surprenant ! ». Un enseignement clair pour méditer et fortifier sa foi (31:51)."],
  ["xJU9XAK6F7o", "Cette Coutume Va Leur Coûter Très Cher…", "Rappel et analyse documentaire approfondie par Minute Islam : « Cette Coutume Va Leur Coûter Très Cher… ». Un enseignement clair pour méditer et fortifier sa foi (10:12)."],
  ["_FfCo4qEIwo", "La Majorité des Musulmans Se Trompent Sur la Prière de la Consultation", "Rappel et analyse documentaire approfondie par Minute Islam : « La Majorité des Musulmans Se Trompent Sur la Prière de la Consultation ». Un enseignement clair pour méditer et fortifier sa foi (12:03)."],
  ["W7C4KfbEt2M", "J'ai Enquêté sur La Colonisation Française et sa Stratégie pour Supprimer l'islam d'Algerie", "Recherche historique détaillée sur les politiques de défrancisation et de tentative d'éradication de l'identité islamique durant la colonisation en Algérie."],
  ["BZMnrplvNHE", "J'ai enquêté sur Hassen CHELGHOUMI - Le Faux imam, le plus Imposteur de France", "Rappel et analyse documentaire approfondie par Minute Islam : « J'ai enquêté sur Hassen CHELGHOUMI - Le Faux imam, le plus Imposteur de France ». Un enseignement clair pour méditer et fortifier sa foi (11:30)."],
  ["CW1Prjn-3cs", "J'ai Enquêté sur ce que Cachent les Médias en France sur L’Islam…", "Décryptage méthodique du traitement médiatique de l'Islam en France : manipulation de l'opinion, omissions volontaires et discours de stigmatisation."],
  ["BfsSFo0CqvU", "CES 3 FILMS ont-ils COPIÉS le CORAN ?", "Rappel et analyse documentaire approfondie par Minute Islam : « CES 3 FILMS ont-ils COPIÉS le CORAN ? ». Un enseignement clair pour méditer et fortifier sa foi (11:55)."],
  ["XA6mE-2R6Es", "7 CHOSES À FAIRE AVANT TA MORT", "Rappel et analyse documentaire approfondie par Minute Islam : « 7 CHOSES À FAIRE AVANT TA MORT ». Un enseignement clair pour méditer et fortifier sa foi (11:03)."],
  ["yFdM8UxACfw", "LE FAUX IMAM SALAFI, PSEUDO APOSTAT, EXPOSÉ AU GRAND JOUR", "Rappel et analyse documentaire approfondie par Minute Islam : « LE FAUX IMAM SALAFI, PSEUDO APOSTAT, EXPOSÉ AU GRAND JOUR ». Un enseignement clair pour méditer et fortifier sa foi (14:59)."],
  ["xw-ENGyuTPQ", "QUEL EST LE PLAN D'ALLAH POUR GAZA ?", "Rappel et analyse documentaire approfondie par Minute Islam : « QUEL EST LE PLAN D'ALLAH POUR GAZA ? ». Un enseignement clair pour méditer et fortifier sa foi (10:09)."],
  ["wsp7jDqaxsQ", "TOP 5 Shirk au Bled : Ne fait surtout pas comme eux", "Rappel et analyse documentaire approfondie par Minute Islam : « TOP 5 Shirk au Bled : Ne fait surtout pas comme eux ». Un enseignement clair pour méditer et fortifier sa foi (10:23)."],
  ["FPF_NeDZnIc", "OÙ SONT PASSÉS LES VÊTEMENTS DES MUSULMANS ?", "Rappel et analyse documentaire approfondie par Minute Islam : « OÙ SONT PASSÉS LES VÊTEMENTS DES MUSULMANS ? ». Un enseignement clair pour méditer et fortifier sa foi (13:27)."],
  ["k0Qno1O_P4E", "4 Preuves que la MUSIQUE est une ARME du DIABLE", "Rappel et analyse documentaire approfondie par Minute Islam : « 4 Preuves que la MUSIQUE est une ARME du DIABLE ». Un enseignement clair pour méditer et fortifier sa foi (11:15)."],
  ["5l2-NAG0w7c", "Ce qu'Allah a Mis Sur Notre Route En Bosnie Nous a CHOQUÉ", "Carnet de voyage et témoignage poignant en Bosnie-Herzégovine sur les traces de l'histoire musulmane européenne et les leçons de résilience."],
  ["5q2o6PpwGbI", "LES SIGNES DE LA FIN DES TEMPS VISIBLE EN 2025", "Rappel et analyse documentaire approfondie par Minute Islam : « LES SIGNES DE LA FIN DES TEMPS VISIBLE EN 2025 ». Un enseignement clair pour méditer et fortifier sa foi (50:34)."],
  ["Pqowprr_qlA", "L'APPARITION DU DAJJAL, DU MAHDI, DE ISSA ET DE GOG ET MAGOG À LA FIN DES TEMPS", "Rappel et analyse documentaire approfondie par Minute Islam : « L'APPARITION DU DAJJAL, DU MAHDI, DE ISSA ET DE GOG ET MAGOG À LA FIN DES TEMPS ». Un enseignement clair pour méditer et fortifier sa foi (1:26:30)."],
  ["_6m-BRNc34Y", "J'ai enquêté sur l'HORREUR des Imams 2.0 égareurs", "Enquête critique sur les faux prédicateurs et pseudo-savants du web qui déforment les textes et égarent la jeunesse pour des vues et des abonnés."],
  ["n3YzO8nGUUs", "Un Rabbin Révèle La VÉRITÉ sur La Guerre Actuelle et le Si0nisme", "Témoignage et analyse d'un rabbin orthodoxe antisioniste distinguant le judaïsme traditionnel des visées politiques et militaires nationalistes."],
  ["r8m4KPc2nxc", "Personne n'ose parler de L'homosexualité En Islam", "Rappel et analyse documentaire approfondie par Minute Islam : « Personne n'ose parler de L'homosexualité En Islam ». Un enseignement clair pour méditer et fortifier sa foi (17:50)."],
  ["CRPlrOuJxT0", "J'ai enquêté sur les INFLUENCEURS MUSULMANS qui vous mentent", "Décryptage salutaire sur le business, les placements de produits douteux et les dérives de certains influenceurs musulmans sur les réseaux sociaux."],
  ["esavIbKE9Ss", "TOUTES LES RELIGIONS ATTENDAIENT CE SIGNE VISIBLE", "Rappel et analyse documentaire approfondie par Minute Islam : « TOUTES LES RELIGIONS ATTENDAIENT CE SIGNE VISIBLE ». Un enseignement clair pour méditer et fortifier sa foi (10:24)."],
  ["hEMb_xSviOc", "COMMENT SERAIT CETTE PLANÈTE SI TOUT LE MONDE ÉTAIT MUSULMAN", "Rappel et analyse documentaire approfondie par Minute Islam : « COMMENT SERAIT CETTE PLANÈTE SI TOUT LE MONDE ÉTAIT MUSULMAN ». Un enseignement clair pour méditer et fortifier sa foi (10:10)."],
  ["v3wRX1cgfv8", "IL SERA BIENTÔT TROP TARD POUR FAIRE SA HIJRA", "Rappel et analyse documentaire approfondie par Minute Islam : « IL SERA BIENTÔT TROP TARD POUR FAIRE SA HIJRA ». Un enseignement clair pour méditer et fortifier sa foi (12:56)."],
  ["1B1Ne2woMNg", "SCANDALE EN TURQUIE : LA VÉRITÉ SUR ADNAN OKTAR", "Rappel et analyse documentaire approfondie par Minute Islam : « SCANDALE EN TURQUIE : LA VÉRITÉ SUR ADNAN OKTAR ». Un enseignement clair pour méditer et fortifier sa foi (11:04)."],
  ["KU5G71NwzPY", "L'HISTOIRE TROUBLANTE DE JAMMAATE AL QOURBA", "Rappel et analyse documentaire approfondie par Minute Islam : « L'HISTOIRE TROUBLANTE DE JAMMAATE AL QOURBA ». Un enseignement clair pour méditer et fortifier sa foi (13:31)."],
  ["4DPFfF8Qbl8", "Derrière les flammes : l’origine méconnue des incendies en Californie", "Rappel et analyse documentaire approfondie par Minute Islam : « Derrière les flammes : l’origine méconnue des incendies en Californie ». Un enseignement clair pour méditer et fortifier sa foi (10:43)."],
  ["WUlcZFjjfqA", "5 SIGNES MAJEURS ANNONCÉS DEPUIS DES SIÈCLES", "Rappel et analyse documentaire approfondie par Minute Islam : « 5 SIGNES MAJEURS ANNONCÉS DEPUIS DES SIÈCLES ». Un enseignement clair pour méditer et fortifier sa foi (11:18)."],
  ["fNsZkzUkd6s", "Issa (Jésus) : Est-il un signe majeur avant la fin ?", "Rappel et analyse documentaire approfondie par Minute Islam : « Issa (Jésus) : Est-il un signe majeur avant la fin ? ». Un enseignement clair pour méditer et fortifier sa foi (13:40)."],
  ["68dlQDUyvmc", "Ce que disent les textes sur le Dajjal et les derniers temps", "Rappel et analyse documentaire approfondie par Minute Islam : « Ce que disent les textes sur le Dajjal et les derniers temps ». Un enseignement clair pour méditer et fortifier sa foi (12:37)."],
  ["_yFtVSq6Fbs", "Le Mahdi et les prophéties : que dit la situation en Syrie ?", "Rappel et analyse documentaire approfondie par Minute Islam : « Le Mahdi et les prophéties : que dit la situation en Syrie ? ». Un enseignement clair pour méditer et fortifier sa foi (13:49)."],
  ["-rOaYHPoAJk", "GOG ET MAGOG À LA FIN DES TEMPS", "Rappel et analyse documentaire approfondie par Minute Islam : « GOG ET MAGOG À LA FIN DES TEMPS ». Un enseignement clair pour méditer et fortifier sa foi (11:24)."],
  ["OiWFnHhKcvg", "Dhul-Qarnayn et Gog et Magog : leçons de la fin des temps à travers les prophéties", "Rappel et analyse documentaire approfondie par Minute Islam : « Dhul-Qarnayn et Gog et Magog : leçons de la fin des temps à travers les prophéties ». Un enseignement clair pour méditer et fortifier sa foi (14:00)."],
  ["A80TSvjDHZk", "Révélation sur l’affaire Puff Daddy : témoignage exclusif d’un proche", "Rappel et analyse documentaire approfondie par Minute Islam : « Révélation sur l’affaire Puff Daddy : témoignage exclusif d’un proche ». Un enseignement clair pour méditer et fortifier sa foi (12:45)."],
  ["Zyy_5-d-Y9c", "Le conflit Iran-Israël : signes d’un changement global à venir ?", "Analyse stratégique et eschatologique sur l'escalade militaire entre l'Iran et Israël et ses répercussions sur l'équilibre mondial."],
  ["YuIDtvYwtz0", "Tu as ces 5 choses chez toi ? Il est temps de s’en débarrasser !", "5 objets ou pratiques souvent présents dans les foyers qui empêchent l'entrée des anges de miséricorde selon les hadiths prophétiques."],
  ["wCqt7QOA2QA", "Pourquoi certaines femmes choisissent de quitter cette mosquée ?", "Rappel et analyse documentaire approfondie par Minute Islam : « Pourquoi certaines femmes choisissent de quitter cette mosquée ? ». Un enseignement clair pour méditer et fortifier sa foi (13:42)."],
  ["p4xfNG1DiBg", "5 dessins animés qui ont choqué les musulmans", "Rappel et analyse documentaire approfondie par Minute Islam : « 5 dessins animés qui ont choqué les musulmans ». Un enseignement clair pour méditer et fortifier sa foi (13:20)."],
  ["UeRjMfySejA", "Quel est le sens de la vie ? Médite avant de mourir", "Méditation profonde sur la raison d'être de l'être humain, l'épreuve de l'ici-bas et la préparation lucide du départ vers l'éternité."],
  ["iEHTCoPrVjY", "Les signes de l'existence de Dieu à travers la science et la foi", "Rappel et analyse documentaire approfondie par Minute Islam : « Les signes de l'existence de Dieu à travers la science et la foi ». Un enseignement clair pour méditer et fortifier sa foi (15:44)."],
  ["nUeAmJU8q0Y", "LA FIN DES TEMPS AVEC PREUVES : LES DERNIERS SIGNES AVANT L'HEURE", "Rappel et analyse documentaire approfondie par Minute Islam : « LA FIN DES TEMPS AVEC PREUVES : LES DERNIERS SIGNES AVANT L'HEURE ». Un enseignement clair pour méditer et fortifier sa foi (56:44)."],
  ["XmFP9_4bClI", "Que nous révèlent les premiers signes de la fin des temps", "Rappel et analyse documentaire approfondie par Minute Islam : « Que nous révèlent les premiers signes de la fin des temps ». Un enseignement clair pour méditer et fortifier sa foi (38:58)."],
  ["25dfnvi64UQ", "L'Origine de la Race des Djinns (Les vérités Invisibles)", "Rappel et analyse documentaire approfondie par Minute Islam : « L'Origine de la Race des Djinns (Les vérités Invisibles) ». Un enseignement clair pour méditer et fortifier sa foi (41:16)."],
  ["hDXAUhZsJHo", "Les mystères des sociétés secrètes : impact sur les religions", "Rappel et analyse documentaire approfondie par Minute Islam : « Les mystères des sociétés secrètes : impact sur les religions ». Un enseignement clair pour méditer et fortifier sa foi (26:49)."],
  ["k7MfJ2twdow", "LES DÉBUTS DE L'EXISTANCE DE CE MONDE", "Rappel et analyse documentaire approfondie par Minute Islam : « LES DÉBUTS DE L'EXISTANCE DE CE MONDE ». Un enseignement clair pour méditer et fortifier sa foi (13:58)."],
  ["azNhz19wiSk", "L'ISLAM EN TUNISIE - Épisode 6 : La Route du Tawhid", "Rappel et analyse documentaire approfondie par Minute Islam : « L'ISLAM EN TUNISIE - Épisode 6 : La Route du Tawhid ». Un enseignement clair pour méditer et fortifier sa foi (14:33)."],
  ["IoGqok1BLX0", "Les critiques des hadiths : qui sont ceux qui ne les acceptent pas ?", "Une réfutation argumentée et pédagogique du courant coraniste et des sceptiques qui rejettent la Sunnah et l'autorité des recueils prophétiques authentiques."],
  ["T1McI_5mTuM", "PEU DE MUSULMANS SAVENT CECI ET C'EST INCROYABLE !", "Rappel et analyse documentaire approfondie par Minute Islam : « PEU DE MUSULMANS SAVENT CECI ET C'EST INCROYABLE ! ». Un enseignement clair pour méditer et fortifier sa foi (11:22)."],
  ["tm6V_S6KtaI", "Les forces opposées à l'Islam dans l'histoire", "Rappel et analyse documentaire approfondie par Minute Islam : « Les forces opposées à l'Islam dans l'histoire ». Un enseignement clair pour méditer et fortifier sa foi (15:08)."],
  ["YRGqrM_-eJk", "L'ISLAM EN AMÉRIQUE - Épisode 5 : La Route du Tawhid", "Rappel et analyse documentaire approfondie par Minute Islam : « L'ISLAM EN AMÉRIQUE - Épisode 5 : La Route du Tawhid ». Un enseignement clair pour méditer et fortifier sa foi (16:10)."],
  ["yaJu7x6dUhY", "L'ISLAM EN PALESTINE  - Épisode 4 : La Route du Tawhid", "Rappel et analyse documentaire approfondie par Minute Islam : « L'ISLAM EN PALESTINE  - Épisode 4 : La Route du Tawhid ». Un enseignement clair pour méditer et fortifier sa foi (13:41)."],
  ["SuhW1K1CmSs", "Les influences religieuses des rappeurs musulmans", "Rappel et analyse documentaire approfondie par Minute Islam : « Les influences religieuses des rappeurs musulmans ». Un enseignement clair pour méditer et fortifier sa foi (13:23)."],
  ["AuaaPTx3Zns", "L'ISLAM EN ALGÉRIE - Épisode 3 : La Route du Tawhid", "Rappel et analyse documentaire approfondie par Minute Islam : « L'ISLAM EN ALGÉRIE - Épisode 3 : La Route du Tawhid ». Un enseignement clair pour méditer et fortifier sa foi (12:45)."],
  ["pQxNxFl9ktY", "L'ISLAM AU MAROC - (Épisode 2 : La Route du Tawhid)", "Rappel et analyse documentaire approfondie par Minute Islam : « L'ISLAM AU MAROC - (Épisode 2 : La Route du Tawhid) ». Un enseignement clair pour méditer et fortifier sa foi (14:07)."],
  ["ns9AQV0yw0g", "LES SIGNES DE LA NUIT DU DESTIN QUE BEAUCOUP DE MUSULMANS IGNORENT", "Rappel et analyse documentaire approfondie par Minute Islam : « LES SIGNES DE LA NUIT DU DESTIN QUE BEAUCOUP DE MUSULMANS IGNORENT ». Un enseignement clair pour méditer et fortifier sa foi (10:57)."],
  ["XP56-mFflbU", "5 PRATIQUES HARAM QUE BEAUCOUP PENSENT HALAL PENDANT LE RAMADAN", "Rappel et analyse documentaire approfondie par Minute Islam : « 5 PRATIQUES HARAM QUE BEAUCOUP PENSENT HALAL PENDANT LE RAMADAN ». Un enseignement clair pour méditer et fortifier sa foi (10:16)."],
  ["JbzgmB6I60g", "Qui se Cache Derrière la Fitna Maroc vs Algérie ?", "Rappel et analyse documentaire approfondie par Minute Islam : « Qui se Cache Derrière la Fitna Maroc vs Algérie ? ». Un enseignement clair pour méditer et fortifier sa foi (12:11)."],
  ["YOu1on5c3kw", "CE QU'IL SE PASSERA LE JOUR DU JUGEMENT DERNIER", "Description saisissante des étapes du Jour du Jugement Dernier : le souffle de la Trompe, le rassemblement, les comptes et la traversée du pont As-Sirat."],
  ["X19CsM5BH6A", "CE QU'IL SE PASSERA LE JOUR DE LA FIN DES TEMPS", "Le bouleversement de l'Univers, l'effondrement des cieux et des montagnes : les descriptions bibliques et coraniques de la fin du monde."],
  ["f0MkDH4e-28", "2 SIGNES DE L'APPARITION DU MAHDI À LA FIN DES TEMPS", "Rappel et analyse documentaire approfondie par Minute Islam : « 2 SIGNES DE L'APPARITION DU MAHDI À LA FIN DES TEMPS ». Un enseignement clair pour méditer et fortifier sa foi (11:36)."],
  ["B2MC9HWhGQQ", "PERSONNE N’AURAIT CRU À SA CONVERTION", "Rappel et analyse documentaire approfondie par Minute Islam : « PERSONNE N’AURAIT CRU À SA CONVERTION ». Un enseignement clair pour méditer et fortifier sa foi (10:33)."],
  ["sFOy2cBK5yE", "LES 99 PLUS BEAUX NOMS D'ALLAH", "Rappel et analyse documentaire approfondie par Minute Islam : « LES 99 PLUS BEAUX NOMS D'ALLAH ». Un enseignement clair pour méditer et fortifier sa foi (12:32)."],
  ["QvFAocIgcac", "PERSONNE N’OSE SE POSER CETTE QUESTION !", "Rappel et analyse documentaire approfondie par Minute Islam : « PERSONNE N’OSE SE POSER CETTE QUESTION ! ». Un enseignement clair pour méditer et fortifier sa foi (10:34)."],
  ["B6loYRu2GU0", "Les racines de la magie sur Terre", "Rappel et analyse documentaire approfondie par Minute Islam : « Les racines de la magie sur Terre ». Un enseignement clair pour méditer et fortifier sa foi (10:10)."],
  ["8Y5XPKx3JfE", "ES-TU AIMÉ PAR ALLAH ?", "Rappel et analyse documentaire approfondie par Minute Islam : « ES-TU AIMÉ PAR ALLAH ? ». Un enseignement clair pour méditer et fortifier sa foi (13:59)."],
  ["UREqEb_DVKY", "3 secrets sur les sociétés secrètes et leurs influences", "Rappel et analyse documentaire approfondie par Minute Islam : « 3 secrets sur les sociétés secrètes et leurs influences ». Un enseignement clair pour méditer et fortifier sa foi (11:42)."],
  ["c7KgiteoAoA", "Les mystères des sociétés secrètes et leur influence sur le monde", "Rappel et analyse documentaire approfondie par Minute Islam : « Les mystères des sociétés secrètes et leur influence sur le monde ». Un enseignement clair pour méditer et fortifier sa foi (11:11)."],
  ["ZwY6Gx4KD1s", "Omra à petit prix : partir seul sans agence pour moins de 500€", "Guide complet et conseils pratiques pour accomplir son pèlerinage de l'Omra en toute autonomie à moindre coût, sans compromettre sa dévotion."],
  ["0vI11-TcE84", "Pourquoi l'Islam suscite-t-il des craintes en France ?", "Rappel et analyse documentaire approfondie par Minute Islam : « Pourquoi l'Islam suscite-t-il des craintes en France ? ». Un enseignement clair pour méditer et fortifier sa foi (21:21)."],
  ["lyV9Z2WQoOw", "Pourquoi le miel à 2€ n'a rien à voir avec celui à 2000€", "Rappel et analyse documentaire approfondie par Minute Islam : « Pourquoi le miel à 2€ n'a rien à voir avec celui à 2000€ ». Un enseignement clair pour méditer et fortifier sa foi (10:00)."],
  ["fQbFAVYqPQ0", "ESSAYE DE RÉPONDRE À CES QUESTIONS", "Rappel et analyse documentaire approfondie par Minute Islam : « ESSAYE DE RÉPONDRE À CES QUESTIONS ». Un enseignement clair pour méditer et fortifier sa foi (10:19)."],
  ["HNQ611NodfY", "7 SECRETS DU DIABLE ! - LE MONDE INVISIBLE DES DJINNS", "Rappel et analyse documentaire approfondie par Minute Islam : « 7 SECRETS DU DIABLE ! - LE MONDE INVISIBLE DES DJINNS ». Un enseignement clair pour méditer et fortifier sa foi (10:08)."],
  ["2E21pRKtkmU", "LE DIABLE COMME SI TU LE VOYAIS - LE MONDE INVISIBLE DES DJINNS EP2", "Rappel et analyse documentaire approfondie par Minute Islam : « LE DIABLE COMME SI TU LE VOYAIS - LE MONDE INVISIBLE DES DJINNS EP2 ». Un enseignement clair pour méditer et fortifier sa foi (10:06)."],
  ["RjKl2jWa9Eg", "CE QUE CACHENT LES ANIMÉS JAPONAIS (MANGA)", "Rappel et analyse documentaire approfondie par Minute Islam : « CE QUE CACHENT LES ANIMÉS JAPONAIS (MANGA) ». Un enseignement clair pour méditer et fortifier sa foi (10:00)."],
  ["iqmGNWRzArA", "ZAKAT AL MAAL - SAUVE DES VIES GRÂCE À CETTE ADORATION !", "Rappel et analyse documentaire approfondie par Minute Islam : « ZAKAT AL MAAL - SAUVE DES VIES GRÂCE À CETTE ADORATION ! ». Un enseignement clair pour méditer et fortifier sa foi (10:46)."],
  ["3RQ-9Q8-Vl4", "LES SOURATES PAR ORDRE DE REVELATION", "Rappel et analyse documentaire approfondie par Minute Islam : « LES SOURATES PAR ORDRE DE REVELATION ». Un enseignement clair pour méditer et fortifier sa foi (13:15)."]
];

export const minuteIslamMeta: Record<string, MinuteIslamMetaItem> = {
  "Z7AXlDMrEug": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "13:52",
    featured: true,
    isNew: true,
    isTrending: true
  },
  "WUx1ErC39EQ": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "16:23",
    featured: false,
    isNew: true,
    isTrending: true
  },
  "VWvVZdhYFtk": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "11:05",
    featured: false,
    isNew: true,
    isTrending: true
  },
  "6Z-umY6WInU": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "12:09",
    featured: false,
    isNew: true,
    isTrending: true
  },
  "nkvx27zE6Mo": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "14:46",
    featured: false,
    isNew: true,
    isTrending: true
  },
  "SkKnO_g1BrA": {
    cats: ["Eschatologie","Miracles du Coran"],
    year: 2025,
    duration: "2:16:45",
    featured: false,
    isNew: true,
    isTrending: true
  },
  "Do_s-1BLe24": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "15:05",
    featured: false,
    isNew: true,
    isTrending: true
  },
  "hF_VXUaKjGk": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "13:47",
    featured: false,
    isNew: true,
    isTrending: true
  },
  "dWu6NUFfCvE": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "29:05",
    featured: false,
    isNew: true,
    isTrending: true
  },
  "aOg_IuF48AM": {
    cats: ["Coran"],
    year: 2025,
    duration: "13:23",
    featured: false,
    isNew: true,
    isTrending: true
  },
  "WRzmmLgVnt4": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "15:08",
    featured: false,
    isNew: true,
    isTrending: true
  },
  "ce_fE_ROiRQ": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "11:21",
    featured: false,
    isNew: true,
    isTrending: true
  },
  "4H-Y9KhNHgI": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "15:16",
    featured: false,
    isNew: true,
    isTrending: true
  },
  "K4-DNtDbAfQ": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "15:50",
    featured: false,
    isNew: true,
    isTrending: true
  },
  "upDdQeXbnMw": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "14:40",
    featured: false,
    isNew: true,
    isTrending: true
  },
  "8EQGUdUPPvs": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "17:29",
    featured: false,
    isNew: true,
    isTrending: false
  },
  "g9OyU6keq6k": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "13:21",
    featured: false,
    isNew: true,
    isTrending: false
  },
  "QUeue4K92X8": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "12:58",
    featured: false,
    isNew: true,
    isTrending: false
  },
  "WZnTMTwxVN0": {
    cats: ["Anges & Djinns", "Histoire & Mystère"],
    year: 2025,
    duration: "17:26",
    featured: false,
    isNew: true,
    isTrending: true,
    skipSegments: [
      { start: 82, end: 151, label: "Présentation du Qarin", type: "intro" },
      { start: 151, end: 316, label: "Les murmures et influences" },
      { start: 316, end: 645, label: "Les invocations protectrices" },
      { start: 645, end: 720, label: "Conclusion spirituelle" },
    ]
  },
  "FQ-fBfh4oDY": {
    cats: ["Eschatologie"],
    year: 2025,
    duration: "13:11",
    featured: false,
    isNew: true,
    isTrending: false
  },
  "eDR8LIihOZA": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "11:30",
    featured: false,
    isNew: true,
    isTrending: false
  },
  "6zm_ktPWG1Y": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "22:15",
    featured: false,
    isNew: true,
    isTrending: false
  },
  "MlJ-tz6t4kc": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "11:36",
    featured: false,
    isNew: true,
    isTrending: false
  },
  "l25LowW5j-s": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "10:23",
    featured: false,
    isNew: true,
    isTrending: false
  },
  "eE0xruxZxUA": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "10:07",
    featured: false,
    isNew: true,
    isTrending: false
  },
  "L7S72BYjym0": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "16:41",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "k4h1C3fEodE": {
    cats: ["Eschatologie"],
    year: 2025,
    duration: "31:51",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "xJU9XAK6F7o": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "10:12",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "_FfCo4qEIwo": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "12:03",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "W7C4KfbEt2M": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "11:13",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "BZMnrplvNHE": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "11:30",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "CW1Prjn-3cs": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "10:09",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "BfsSFo0CqvU": {
    cats: ["Coran"],
    year: 2025,
    duration: "11:55",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "XA6mE-2R6Es": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "11:03",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "yFdM8UxACfw": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "14:59",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "xw-ENGyuTPQ": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "10:09",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "wsp7jDqaxsQ": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "10:23",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "FPF_NeDZnIc": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "13:27",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "k0Qno1O_P4E": {
    cats: ["Miracles du Coran"],
    year: 2025,
    duration: "11:15",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "5l2-NAG0w7c": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "18:21",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "5q2o6PpwGbI": {
    cats: ["Eschatologie"],
    year: 2025,
    duration: "50:34",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "Pqowprr_qlA": {
    cats: ["Prophètes","Eschatologie"],
    year: 2025,
    duration: "1:26:30",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "_6m-BRNc34Y": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "13:45",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "n3YzO8nGUUs": {
    cats: ["Héros & Personnages"],
    year: 2025,
    duration: "16:06",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "r8m4KPc2nxc": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "17:50",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "CRPlrOuJxT0": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "17:52",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "esavIbKE9Ss": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "10:24",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "hEMb_xSviOc": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "10:10",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "v3wRX1cgfv8": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "12:56",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "1B1Ne2woMNg": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "11:04",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "KU5G71NwzPY": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "13:31",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "4DPFfF8Qbl8": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "10:43",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "WUlcZFjjfqA": {
    cats: ["Eschatologie"],
    year: 2025,
    duration: "11:18",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "fNsZkzUkd6s": {
    cats: ["Prophètes"],
    year: 2025,
    duration: "13:40",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "68dlQDUyvmc": {
    cats: ["Eschatologie"],
    year: 2025,
    duration: "12:37",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "_yFtVSq6Fbs": {
    cats: ["Eschatologie"],
    year: 2025,
    duration: "13:49",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "-rOaYHPoAJk": {
    cats: ["Eschatologie"],
    year: 2025,
    duration: "11:24",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "OiWFnHhKcvg": {
    cats: ["Eschatologie"],
    year: 2025,
    duration: "14:00",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "A80TSvjDHZk": {
    cats: ["Héros & Personnages"],
    year: 2025,
    duration: "12:45",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "Zyy_5-d-Y9c": {
    cats: ["Eschatologie"],
    year: 2025,
    duration: "17:47",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "YuIDtvYwtz0": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "12:51",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "wCqt7QOA2QA": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "13:42",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "p4xfNG1DiBg": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "13:20",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "UeRjMfySejA": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "15:33",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "iEHTCoPrVjY": {
    cats: ["Eschatologie","Miracles du Coran"],
    year: 2025,
    duration: "15:44",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "nUeAmJU8q0Y": {
    cats: ["Eschatologie","Miracles du Coran"],
    year: 2025,
    duration: "56:44",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "XmFP9_4bClI": {
    cats: ["Eschatologie"],
    year: 2025,
    duration: "38:58",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "25dfnvi64UQ": {
    cats: ["Anges & Djinns"],
    year: 2025,
    duration: "41:16",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "hDXAUhZsJHo": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "26:49",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "k7MfJ2twdow": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "13:58",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "azNhz19wiSk": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "14:33",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "IoGqok1BLX0": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "10:55",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "T1McI_5mTuM": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "11:22",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "tm6V_S6KtaI": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "15:08",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "YRGqrM_-eJk": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "16:10",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "yaJu7x6dUhY": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "13:41",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "SuhW1K1CmSs": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "13:23",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "AuaaPTx3Zns": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "12:45",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "pQxNxFl9ktY": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "14:07",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "ns9AQV0yw0g": {
    cats: ["Eschatologie"],
    year: 2025,
    duration: "10:57",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "XP56-mFflbU": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "10:16",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "JbzgmB6I60g": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "12:11",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "YOu1on5c3kw": {
    cats: ["Eschatologie"],
    year: 2025,
    duration: "10:36",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "X19CsM5BH6A": {
    cats: ["Eschatologie"],
    year: 2025,
    duration: "12:22",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "f0MkDH4e-28": {
    cats: ["Eschatologie"],
    year: 2025,
    duration: "11:36",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "B2MC9HWhGQQ": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "10:33",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "sFOy2cBK5yE": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "12:32",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "QvFAocIgcac": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "10:34",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "B6loYRu2GU0": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "10:10",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "8Y5XPKx3JfE": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "13:59",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "UREqEb_DVKY": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "11:42",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "c7KgiteoAoA": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "11:11",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "ZwY6Gx4KD1s": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "18:39",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "0vI11-TcE84": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "21:21",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "lyV9Z2WQoOw": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "10:00",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "fQbFAVYqPQ0": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "10:19",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "HNQ611NodfY": {
    cats: ["Anges & Djinns"],
    year: 2025,
    duration: "10:08",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "2E21pRKtkmU": {
    cats: ["Anges & Djinns"],
    year: 2025,
    duration: "10:06",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "RjKl2jWa9Eg": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "10:00",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "iqmGNWRzArA": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "10:46",
    featured: false,
    isNew: false,
    isTrending: false
  },
  "3RQ-9Q8-Vl4": {
    cats: ["Histoire & Mystère"],
    year: 2025,
    duration: "13:15",
    featured: false,
    isNew: false,
    isTrending: false
  }
};
