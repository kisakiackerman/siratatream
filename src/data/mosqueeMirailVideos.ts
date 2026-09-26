export interface VideoMetadata {
  duration?: string;
  badge?: string;
  isTrending?: boolean;
  isNew?: boolean;
  featured?: boolean;
  categories?: string[];
}

export const mosqueeMirailRaw: [string, string, string][] = [
  ["YpT3MfK6vVs", "L'islam au quotidien #115", "Conférence et questions-réponses en direct par la Mosquée Mirail Toulouse : « L'islam au quotidien #115 »."],
  ["ILsNRaU4v9U", "Psalmodier le Coran #2", "Cours d'apprentissage et règles de récitation coranique par la Mosquée Mirail Toulouse : « Psalmodier le Coran #2 »."],
  ["Maq4ZPpehNE", "L’insatisfaction", "Sermon et rappel spirituel par la Mosquée Mirail Toulouse : « L’insatisfaction »."],
  ["mHKTGmcxCCw", "L'islam au quotidien #114", "Conférence et questions-réponses en direct par la Mosquée Mirail Toulouse : « L'islam au quotidien #114 »."],
  ["gbJ_ZOttBQ0", "Psalmodier le Coran #1 - Al qalqalah", "Cours d'apprentissage et règles de récitation coranique par la Mosquée Mirail Toulouse : « Psalmodier le Coran #1 - Al qalqalah »."],
  ["Hbkfe-FNjIo", "Redouter la pauvreté", "Exhortation et rappel spirituel par la Mosquée Mirail Toulouse : « Redouter la pauvreté »."],
  ["V8XVPshuL6k", "L'islam au quotidien #113", "Conférence et questions-réponses en direct par la Mosquée Mirail Toulouse : « L'islam au quotidien #113 »."],
  ["0rWG9U-qj14", "Les dangers inhérents aux jeux de hasard (témoignage d'un repenti)", "Témoignage édifiant et rappel par la Mosquée Mirail Toulouse : « Les dangers inhérents aux jeux de hasard »."],
  ["KSBzU2B7Gt4", "Prendre le droit d’autrui", "Rappel sur la justice et les droits envers autrui par la Mosquée Mirail Toulouse : « Prendre le droit d’autrui »."],
  ["caQWWvkP8OQ", "L'islam au quotidien #112", "Conférence et questions-réponses en direct par la Mosquée Mirail Toulouse : « L'islam au quotidien #112 »."],
  ["MEojnlq3Sow", "Le divorce en islam : mode d’emploi", "Éclairage juridique et éthique par la Mosquée Mirail Toulouse : « Le divorce en islam : mode d’emploi »."],
  ["awIVIHzOuOs", "Le manque d’empathie", "Éducation du cœur et comportement par la Mosquée Mirail Toulouse : « Le manque d’empathie »."],
  ["vbPQwRbqOco", "L'islam au quotidien #111", "Conférence et questions-réponses en direct par la Mosquée Mirail Toulouse : « L'islam au quotidien #111 »."],
  ["yskSv__kD2s", "Comprendre les conflits pour préserver le foyer musulman", "Conseils familiaux et de vie de couple par la Mosquée Mirail Toulouse : « Comprendre les conflits pour préserver le foyer musulman »."],
  ["CLC_Oa-mmlc", "Les maux des mots", "Rappel éthique sur la maîtrise de la parole par la Mosquée Mirail Toulouse : « Les maux des mots »."],
  ["fWiy4SMOA6Y", "L'islam au quotidien #110", "Conférence et questions-réponses en direct par la Mosquée Mirail Toulouse : « L'islam au quotidien #110 »."],
  ["s45qQDJXY8E", "La famille : socle de la société", "Conférence sur les fondements familiaux par la Mosquée Mirail Toulouse : « La famille : socle de la société »."],
  ["hbOgja6Gw00", "L'impatience", "Sermon sur la patience et l'épreuve par la Mosquée Mirail Toulouse : « L'impatience »."],
  ["FoqnFSRE1Pg", "L'islam au quotidien #109", "Conférence et questions-réponses en direct par la Mosquée Mirail Toulouse : « L'islam au quotidien #109 »."],
  ["FgbPGs2c86U", "Comment tirer le meilleur profit du temps ?", "Exhortation sur la gestion du temps de vie par la Mosquée Mirail Toulouse : « Comment tirer le meilleur profit du temps ? »."],
  ["sICI4uP2FkM", "Vivre pour les gens", "Sermon sur la sincérité et le regard des gens par la Mosquée Mirail Toulouse : « Vivre pour les gens »."],
  ["bShCLC8o7OU", "L'islam au quotidien #108", "Conférence et questions-réponses en direct par la Mosquée Mirail Toulouse : « L'islam au quotidien #108 »."],
  ["fyh5JavkyFM", "La valeur du temps", "Rappel du vendredi sur l'importance du temps par la Mosquée Mirail Toulouse : « La valeur du temps »."],
  ["JonGYpgUWRE", "[Best Of] L'islam au quotidien - Best Of des questions par téléphone #32", "Questions-réponses sélectionnées par la Mosquée Mirail Toulouse : « Best Of des questions par téléphone #32 »."],
  ["m7S5B3Rq9Kc", "[Best Of] L'islam au quotidien - Best Of des questions par téléphone #31", "Questions-réponses sélectionnées par la Mosquée Mirail Toulouse : « Best Of des questions par téléphone #31 »."],
  ["CMPhk6BwVd8", "[Best Of] L'islam au quotidien - Best Of des questions par téléphone #30", "Questions-réponses sélectionnées par la Mosquée Mirail Toulouse : « Best Of des questions par téléphone #30 »."],
  ["3Aq4cs13Enw", "L’hypocrisie comportementale", "Sermon sur les signes de l'hypocrisie pratique par la Mosquée Mirail Toulouse : « L’hypocrisie comportementale »."],
  ["34BQGxnMOJs", "L'islam au quotidien #107", "Conférence et questions-réponses en direct par la Mosquée Mirail Toulouse : « L'islam au quotidien #107 »."],
  ["GmgD9megfRk", "Islam, savoir et cultures #38 - L’historique de la mise par écrit du Coran", "Histoire et sciences du Coran par la Mosquée Mirail Toulouse : « L’historique de la mise par écrit du Coran »."],
  ["VJ0vAwaAZ1o", "Le reniement des messages et signes", "Méditation sur les signes divins par la Mosquée Mirail Toulouse : « Le reniement des messages et signes »."],
];

export const mosqueeMirailMeta: Record<string, VideoMetadata> = {
  "YpT3MfK6vVs": { duration: "1:26:28", isTrending: true, isNew: true, categories: ["Histoire & Mystère"] },
  "ILsNRaU4v9U": { duration: "1:13:10", categories: ["Coran"] },
  "Maq4ZPpehNE": { duration: "1:12:42", categories: ["Histoire & Mystère"] },
  "mHKTGmcxCCw": { duration: "1:17:00", categories: ["Histoire & Mystère"] },
  "gbJ_ZOttBQ0": { duration: "1:19:29", categories: ["Coran"] },
  "Hbkfe-FNjIo": { duration: "1:21:28", categories: ["Histoire & Mystère"] },
  "V8XVPshuL6k": { duration: "1:45:24", categories: ["Histoire & Mystère"] },
  "0rWG9U-qj14": { duration: "1:39:22", featured: true, categories: ["Histoire & Mystère"] },
  "KSBzU2B7Gt4": { duration: "1:31:27", categories: ["Histoire & Mystère"] },
  "caQWWvkP8OQ": { duration: "1:39:22", categories: ["Histoire & Mystère"] },
  "MEojnlq3Sow": { duration: "1:43:41", categories: ["Histoire & Mystère"] },
  "awIVIHzOuOs": { duration: "1:22:08", categories: ["Histoire & Mystère"] },
  "vbPQwRbqOco": { duration: "1:34:45", categories: ["Histoire & Mystère"] },
  "yskSv__kD2s": { duration: "1:33:20", categories: ["Histoire & Mystère"] },
  "CLC_Oa-mmlc": { duration: "1:33:54", categories: ["Histoire & Mystère"] },
  "fWiy4SMOA6Y": { duration: "1:31:27", categories: ["Histoire & Mystère"] },
  "s45qQDJXY8E": { duration: "1:34:29", categories: ["Histoire & Mystère"] },
  "hbOgja6Gw00": { duration: "1:16:47", categories: ["Histoire & Mystère"] },
  "FoqnFSRE1Pg": { duration: "1:35:30", categories: ["Histoire & Mystère"] },
  "FgbPGs2c86U": { duration: "1:29:46", categories: ["Histoire & Mystère"] },
  "sICI4uP2FkM": { duration: "1:08:16", categories: ["Histoire & Mystère"] },
  "bShCLC8o7OU": { duration: "1:33:57", categories: ["Histoire & Mystère"] },
  "fyh5JavkyFM": { duration: "1:26:37", categories: ["Histoire & Mystère"] },
  "JonGYpgUWRE": { duration: "20:36", categories: ["Histoire & Mystère"] },
  "m7S5B3Rq9Kc": { duration: "25:02", categories: ["Histoire & Mystère"] },
  "CMPhk6BwVd8": { duration: "26:12", categories: ["Histoire & Mystère"] },
  "3Aq4cs13Enw": { duration: "1:17:09", categories: ["Histoire & Mystère"] },
  "34BQGxnMOJs": { duration: "1:27:05", categories: ["Histoire & Mystère"] },
  "GmgD9megfRk": { duration: "1:37:47", categories: ["Coran", "Histoire & Mystère"] },
  "VJ0vAwaAZ1o": { duration: "1:24:06", categories: ["Histoire & Mystère"] },
};
