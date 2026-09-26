import type { ContentItem } from "@/data/catalog";

export interface DiversifyOptions {
  /**
   * Whether to sort items within each channel group by score / featured / trending
   * before interleaving. Defaults to true.
   */
  prioritizeQuality?: boolean;
  /**
   * If provided, guarantees that this item ID is placed at the very first position (index 0).
   */
  spotlightId?: string | null;
}

/**
 * List of reference channels prioritized in round-robin turns
 */
const REFERENCE_CHANNELS_ORDER = [
  "Towards Eternity",
  "NARRO",
  "Sur le chemin de la prophétie",
  "Averroès Histoire",
  "Din-ul-Qayyima",
  "Minute Islam",
  "Yacine",
  "Croyant Rationnel",
  "NARRO DIN",
  "Récitations Haramain",
];

/**
 * Interleaves/diversifies an array of ContentItems across different channels/creators
 * so that consecutive videos are not from the same creator.
 *
 * Solves the issue where 100+ videos of one creator appear sequentially.
 */
export function diversifyCatalogByChannel(
  items: ContentItem[],
  options: DiversifyOptions = {}
): ContentItem[] {
  if (!Array.isArray(items) || items.length <= 2) {
    return items;
  }

  const { prioritizeQuality = true, spotlightId = null } = options;

  // Separate spotlight item if present
  let spotlightItem: ContentItem | null = null;
  const workingPool: ContentItem[] = [];

  for (const it of items) {
    if (spotlightId && it.id === spotlightId && !spotlightItem) {
      spotlightItem = it;
    } else {
      workingPool.push(it);
    }
  }

  // 1. Group items by channel
  const channelGroups = new Map<string, ContentItem[]>();
  for (const item of workingPool) {
    const ch = (item.channel || "Autre").trim();
    if (!channelGroups.has(ch)) {
      channelGroups.set(ch, []);
    }
    channelGroups.get(ch)!.push(item);
  }

  // 2. Sort within each channel by quality/score/featured status if enabled
  if (prioritizeQuality) {
    for (const [, group] of channelGroups.entries()) {
      group.sort((a, b) => {
        const scoreA =
          (a.featured ? 100 : 0) +
          (a.isTrending ? 50 : 0) +
          (a.heroImage ? 30 : 0) +
          (a.score || 0);
        const scoreB =
          (b.featured ? 100 : 0) +
          (b.isTrending ? 50 : 0) +
          (b.heroImage ? 30 : 0) +
          (b.score || 0);
        return scoreB - scoreA;
      });
    }
  }

  // 3. Determine channel rotation order:
  // Rank known reference channels with available videos first, then any other channels
  const allChannels = Array.from(channelGroups.keys());
  const sortedChannels = allChannels.sort((a, b) => {
    const idxA = REFERENCE_CHANNELS_ORDER.indexOf(a);
    const idxB = REFERENCE_CHANNELS_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;

    // Fallback: sort by top item score in group
    const topScoreA = channelGroups.get(a)?.[0]?.score || 0;
    const topScoreB = channelGroups.get(b)?.[0]?.score || 0;
    return topScoreB - topScoreA;
  });

  // 4. Interleave items round-robin across channels without back-to-back repetitions
  const result: ContentItem[] = [];
  if (spotlightItem) {
    result.push(spotlightItem);
  }

  // Pointers for O(1) dequeue instead of O(N) array shift()
  const queuePointers = new Map<string, number>();
  for (const ch of sortedChannels) {
    queuePointers.set(ch, 0);
  }

  let lastChannel: string | null = spotlightItem ? spotlightItem.channel : null;
  let remainingCount = workingPool.length;

  while (remainingCount > 0) {
    let progressed = false;

    for (const ch of sortedChannels) {
      const queue = channelGroups.get(ch);
      const ptr = queuePointers.get(ch) || 0;
      if (queue && ptr < queue.length) {
        // Prevent consecutive duplicates if another channel has items
        const hasOtherChannelsWithItems = sortedChannels.some((other) => {
          if (other === ch) return false;
          const otherQueue = channelGroups.get(other);
          const otherPtr = queuePointers.get(other) || 0;
          return otherQueue ? otherPtr < otherQueue.length : false;
        });

        if (ch === lastChannel && hasOtherChannelsWithItems) {
          continue;
        }

        const nextItem = queue[ptr];
        queuePointers.set(ch, ptr + 1);
        result.push(nextItem);
        lastChannel = ch;
        remainingCount--;
        progressed = true;
      }
    }

    // Safety fallback: if all remaining items belong to the same channel, append them
    if (!progressed) {
      for (const ch of sortedChannels) {
        const queue = channelGroups.get(ch);
        let ptr = queuePointers.get(ch) || 0;
        if (queue) {
          while (ptr < queue.length) {
            result.push(queue[ptr]);
            ptr++;
            remainingCount--;
          }
          queuePointers.set(ch, ptr);
        }
      }
      break;
    }
  }

  return result;
}

/**
 * Creates a diversified Hero carousel pool where each slide alternates to a different creator,
 * giving fair and engaging visibility to all channel productions.
 */
export function getDiversifiedHeroPool(
  catalog: ContentItem[],
  categoryTab = "all",
  spotlightId?: string | null
): ContentItem[] {
  let pool = catalog;

  if (categoryTab !== "all" && categoryTab !== "creators") {
    const catFiltered = catalog.filter((c) =>
      c.categories.some((cat) => cat.toLowerCase() === categoryTab.toLowerCase())
    );
    if (catFiltered.length > 0) {
      pool = catFiltered;
    }
  }

  // Interleave the pool so every consecutive slide represents a different creator
  return diversifyCatalogByChannel(pool, {
    prioritizeQuality: true,
    spotlightId,
  });
}
