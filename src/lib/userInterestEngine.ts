import { useMemo, useState, useEffect, useCallback } from "react";
import { type ContentItem, type Category, type Channel } from "@/data/catalog";
import {
  getLocalWatchHistory,
  HISTORY_UPDATE_EVENT,
  type StoredHistoryEntry,
} from "@/lib/watchHistory";
import { useViewerProfile } from "@/hooks/useViewerProfile";

export interface CategoryInterest {
  category: string;
  count: number;
  totalSeconds: number;
  weight: number; // 0 to 1
  label: string;
}

export interface ChannelInterest {
  channel: string;
  count: number;
  totalSeconds: number;
  weight: number; // 0 to 1
}

export interface UserInterestProfile {
  totalWatched: number;
  isProfileReady: boolean; // true if totalWatched >= 20
  progressTo20: number; // 0 to 20
  progressPercent: number; // 0 to 100%
  topCategories: CategoryInterest[];
  topChannels: ChannelInterest[];
  primaryInterest: string | null;
  secondaryInterest: string | null;
  scoringFunction: (item: ContentItem) => number;
}

const MIN_VIDEOS_FOR_PROFILE = 20;

/**
 * Calculates user interest profile based on watch history.
 * After 20 videos watched, the system accurately profiles user interests.
 */
export function calculateUserInterests(
  history: StoredHistoryEntry[],
  catalog: ContentItem[]
): UserInterestProfile {
  // Filter history entries that have actual watch progress
  const validHistory = history.filter((h) => (h.progress_seconds || 0) > 5);

  // Group by content_id to get unique watched videos and total engagement
  const watchedMap = new Map<string, { seconds: number; completed: boolean }>();
  validHistory.forEach((h) => {
    const existing = watchedMap.get(h.content_id);
    const duration = h.duration_seconds || 60;
    const completed = h.progress_seconds >= duration * 0.7;
    if (!existing || h.progress_seconds > existing.seconds) {
      watchedMap.set(h.content_id, {
        seconds: h.progress_seconds,
        completed,
      });
    }
  });

  const totalWatched = watchedMap.size;
  const isProfileReady = totalWatched >= MIN_VIDEOS_FOR_PROFILE;
  const progressTo20 = Math.min(totalWatched, MIN_VIDEOS_FOR_PROFILE);
  const progressPercent = Math.round((progressTo20 / MIN_VIDEOS_FOR_PROFILE) * 100);

  // Frequency and engagement tracking
  const categoryStats = new Map<string, { count: number; seconds: number }>();
  const channelStats = new Map<string, { count: number; seconds: number }>();

  let totalEngagementSeconds = 0;
  let totalVideoOccurrences = 0;

  watchedMap.forEach(({ seconds, completed }, contentId) => {
    const item = catalog.find((c) => c.id === contentId);
    if (!item) return;

    const completionBonus = completed ? 1.5 : 1.0;
    const effectiveSeconds = Math.max(seconds, 30) * completionBonus;

    // Channel stats
    if (item.channel) {
      const prev = channelStats.get(item.channel) || { count: 0, seconds: 0 };
      channelStats.set(item.channel, {
        count: prev.count + 1,
        seconds: prev.seconds + effectiveSeconds,
      });
    }

    // Categories stats
    if (item.categories && item.categories.length > 0) {
      item.categories.forEach((cat) => {
        const prev = categoryStats.get(cat) || { count: 0, seconds: 0 };
        categoryStats.set(cat, {
          count: prev.count + 1,
          seconds: prev.seconds + effectiveSeconds,
        });
        totalVideoOccurrences++;
        totalEngagementSeconds += effectiveSeconds;
      });
    }
  });

  // Calculate weighted categories
  const topCategories: CategoryInterest[] = Array.from(categoryStats.entries())
    .map(([cat, stats]) => {
      // 60% weight on video count, 40% weight on total watch time
      const countShare = totalVideoOccurrences > 0 ? stats.count / totalVideoOccurrences : 0;
      const timeShare = totalEngagementSeconds > 0 ? stats.seconds / totalEngagementSeconds : 0;
      const weight = countShare * 0.6 + timeShare * 0.4;
      return {
        category: cat,
        count: stats.count,
        totalSeconds: Math.round(stats.seconds),
        weight,
        label: cat,
      };
    })
    .sort((a, b) => b.weight - a.weight);

  // Calculate weighted channels
  const topChannels: ChannelInterest[] = Array.from(channelStats.entries())
    .map(([ch, stats]) => {
      const countShare = totalWatched > 0 ? stats.count / totalWatched : 0;
      return {
        channel: ch,
        count: stats.count,
        totalSeconds: Math.round(stats.seconds),
        weight: countShare,
      };
    })
    .sort((a, b) => b.weight - a.weight);

  const primaryInterest = topCategories[0]?.category || null;
  const secondaryInterest = topCategories[1]?.category || null;

  // Scoring function to evaluate recommendation affinity (0 to 100)
  const scoringFunction = (item: ContentItem): number => {
    let score = 0;

    // Weight allocations: once 20 videos watched, interest affinity dominates
    const catMultiplier = isProfileReady ? 65 : 45;
    const chMultiplier = isProfileReady ? 25 : 20;
    const qualityMultiplier = isProfileReady ? 0.10 : 0.25;

    // Base quality score of the video (normalized from item.score 0-100)
    const baseQuality = (item.score || 80) * qualityMultiplier;
    score += baseQuality;

    // Category affinity
    if (item.categories && item.categories.length > 0 && topCategories.length > 0) {
      let maxCatScore = 0;
      item.categories.forEach((cat) => {
        const match = topCategories.find((tc) => tc.category === cat);
        if (match) {
          const catPoints = match.weight * catMultiplier;
          if (catPoints > maxCatScore) {
            maxCatScore = catPoints;
          }
        }
      });
      score += maxCatScore;
    }

    // Creator / Channel affinity
    if (item.channel && topChannels.length > 0) {
      const chMatch = topChannels.find((tc) => tc.channel === item.channel);
      if (chMatch) {
        score += chMatch.weight * chMultiplier;
      }
    }

    // Novelty bonus (prefer not yet fully completed videos)
    const watchedState = watchedMap.get(item.id);
    if (!watchedState) {
      score += 8; // Unwatched discovery bonus
    } else if (!watchedState.completed) {
      score += 4; // Partially watched bonus
    }

    // Trending or New bonus (up to 5 pts)
    if (item.isTrending) score += 3;
    if (item.isNew) score += 2;

    return Math.min(100, Math.round(score));
  };

  return {
    totalWatched,
    isProfileReady,
    progressTo20,
    progressPercent,
    topCategories,
    topChannels,
    primaryInterest,
    secondaryInterest,
    scoringFunction,
  };
}

/**
 * Sorts catalog so that the videos with the highest recommendation score are at the top (en tête).
 */
export function sortCatalogByRecommendation(
  catalogList: ContentItem[],
  scoringFunction: (item: ContentItem) => number
): (ContentItem & { recommendationScore: number })[] {
  const scored = catalogList.map((item) => ({
    ...item,
    recommendationScore: scoringFunction(item),
  }));

  return scored.sort((a, b) => b.recommendationScore - a.recommendationScore);
}

/**
 * React hook to reactively subscribe to user watch history and compute recommendations.
 */
export function useUserInterests(catalog: ContentItem[]) {
  const { activeProfile } = useViewerProfile();
  const [history, setHistory] = useState<StoredHistoryEntry[]>([]);

  const refreshHistory = useCallback(() => {
    if (!activeProfile?.id) {
      setHistory([]);
      return;
    }
    const local = getLocalWatchHistory(activeProfile.id);
    setHistory(local);
  }, [activeProfile?.id]);

  useEffect(() => {
    refreshHistory();

    const handleUpdate = () => refreshHistory();
    window.addEventListener(HISTORY_UPDATE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(HISTORY_UPDATE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [refreshHistory]);

  const profile = useMemo(() => {
    return calculateUserInterests(history, catalog);
  }, [history, catalog]);

  const getScore = useCallback(
    (item: ContentItem) => {
      return profile.scoringFunction(item);
    },
    [profile]
  );

  return {
    ...profile,
    getScore,
    history,
  };
}
