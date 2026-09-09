import { type StoredHistoryEntry, getLocalWatchHistory } from "./watchHistory";

export interface WatchStreakInfo {
  currentStreak: number;
  bestStreak: number;
  isActiveToday: boolean;
  streakDates: string[];
  encouragement: string;
}

const STREAK_DATES_PREFIX = "sirat_streak_days_";

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Record a watch day for streak tracking
 */
export function recordWatchDay(profileId?: string | null): void {
  if (!profileId) return;
  try {
    const today = getLocalDateString();
    const key = STREAK_DATES_PREFIX + profileId;
    const raw = localStorage.getItem(key);
    const set = new Set<string>(raw ? JSON.parse(raw) : []);
    if (!set.has(today)) {
      set.add(today);
      localStorage.setItem(key, JSON.stringify(Array.from(set)));
    }
  } catch {
    // ignore
  }
}

/**
 * Calculates current and best streak based on watch history and recorded days
 */
export function calculateWatchStreak(
  history: StoredHistoryEntry[],
  profileId?: string | null
): WatchStreakInfo {
  const dateSet = new Set<string>();

  // 1. Extract from history entries
  history.forEach((entry) => {
    if (entry.updated_at && (entry.progress_seconds || 0) >= 10) {
      try {
        const d = new Date(entry.updated_at);
        if (!isNaN(d.getTime())) {
          dateSet.add(getLocalDateString(d));
        }
      } catch {
        // ignore
      }
    }
  });

  // 2. Extract from recorded streak days in localStorage
  if (profileId) {
    try {
      const raw = localStorage.getItem(STREAK_DATES_PREFIX + profileId);
      if (raw) {
        const storedDates: string[] = JSON.parse(raw);
        storedDates.forEach((d) => dateSet.add(d));
      }
    } catch {
      // ignore
    }
  }

  const today = getLocalDateString(new Date());
  const yesterday = getLocalDateString(new Date(Date.now() - 86400000));

  const isActiveToday = dateSet.has(today);

  // If user was active today, we also ensure today is persisted
  if (isActiveToday && profileId) {
    recordWatchDay(profileId);
  }

  // Calculate current streak
  let currentStreak = 0;
  let checkDate = isActiveToday
    ? new Date()
    : dateSet.has(yesterday)
    ? new Date(Date.now() - 86400000)
    : null;

  if (checkDate) {
    while (true) {
      const dateStr = getLocalDateString(checkDate);
      if (dateSet.has(dateStr)) {
        currentStreak++;
        checkDate = new Date(checkDate.getTime() - 86400000);
      } else {
        break;
      }
    }
  }

  // Calculate best streak across all history
  const sortedDates = Array.from(dateSet).sort();
  let bestStreak = 0;
  let running = 0;
  let prevTime: number | null = null;

  sortedDates.forEach((dateStr) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const currTime = new Date(y, m - 1, d).getTime();

    if (prevTime === null) {
      running = 1;
    } else {
      const diffDays = Math.round((currTime - prevTime) / 86400000);
      if (diffDays === 1) {
        running++;
      } else if (diffDays > 1) {
        running = 1;
      }
    }
    prevTime = currTime;
    if (running > bestStreak) {
      bestStreak = running;
    }
  });

  if (currentStreak > bestStreak) {
    bestStreak = currentStreak;
  }

  // Encouragement text
  let encouragement = "Commencez votre série aujourd'hui ! Regardez un récit ou un rappel.";
  if (currentStreak === 0) {
    encouragement = "Commencez votre série aujourd'hui en regardant un rappel ou une récitation !";
  } else if (currentStreak === 1) {
    encouragement = isActiveToday
      ? "1er jour validé ! Qu'Allâh bénisse votre apprentissage."
      : "1 jour enregistré ! Regardez aujourd'hui pour garder le cap.";
  } else if (currentStreak === 2) {
    encouragement = "2 jours d'affilée ! La régularité est la clé de la foi.";
  } else if (currentStreak >= 3 && currentStreak < 7) {
    encouragement = `${currentStreak} jours d'affilée ! Mâ shâ' Allâh 🌟`;
  } else if (currentStreak >= 7 && currentStreak < 14) {
    encouragement = `${currentStreak} jours d'affilée ! Une semaine de constance, Allâhoumma bârik !`;
  } else if (currentStreak >= 14 && currentStreak < 30) {
    encouragement = `${currentStreak} jours d'affilée ! Mâ shâ' Allâh, une habitude vertueuse et solide.`;
  } else {
    encouragement = `${currentStreak} jours d'affilée ! Un mois d'assiduité remarquable, qu'Allâh accepte !`;
  }

  return {
    currentStreak,
    bestStreak,
    isActiveToday,
    streakDates: sortedDates,
    encouragement,
  };
}
