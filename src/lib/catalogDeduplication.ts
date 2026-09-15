import type { ContentItem } from "@/data/catalog";

export interface DeduplicationDetail {
  youtubeId: string;
  retainedId: string;
  retainedTitle: string;
  retainedChannel: string;
  retainedScore: number;
  droppedId: string;
  droppedTitle: string;
  droppedChannel: string;
  droppedScore: number;
  mergedFields: string[];
}

export interface DeduplicationReport {
  initialCount: number;
  finalCount: number;
  removedCount: number;
  timestamp: string;
  context: string;
  duplicates: DeduplicationDetail[];
}

// Global witness cache for UI inspection / debugging
let lastDeduplicationReport: DeduplicationReport | null = null;

export function getLastDeduplicationReport(): DeduplicationReport | null {
  return lastDeduplicationReport;
}

/**
 * Parses a duration string (e.g. "15:30", "1:25:40", "45 min") into seconds.
 */
function parseDurationSec(dur?: string): number {
  if (!dur || dur === "—") return 0;
  const str = dur.trim();
  if (str.includes(":")) {
    const parts = str.split(":").map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
  }
  const hourMatch = str.match(/(\d+)\s*h/);
  const minMatch = str.match(/(\d+)\s*min/);
  const secMatch = str.match(/(\d+)\s*s/);
  let total = 0;
  if (hourMatch) total += parseInt(hourMatch[1], 10) * 3600;
  if (minMatch) total += parseInt(minMatch[1], 10) * 60;
  if (secMatch) total += parseInt(secMatch[1], 10);
  return total;
}

/**
 * Calculates a completeness score for a ContentItem to objectively determine
 * which item possesses richer and higher quality metadata when identical YouTube IDs are encountered.
 */
export function computeContentCompletenessScore(item: ContentItem): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // 1. Description richness
  const desc = (item.description || "").trim();
  if (desc.length > 0) {
    const descPts = Math.min(Math.round(desc.length / 5), 60);
    score += descPts;
    reasons.push(`description (${descPts} pts, ${desc.length} caractères)`);
  }

  // 2. Title quality & localization
  const title = (item.title || "").trim();
  if (title.length > 5) {
    score += 15;
    // Prefer genuine French titles over translated/raw titles
    if (/[éèêàâôûîïçÉÈÊÀÂÔÛÎÏÇ«»’]/.test(title)) {
      score += 10;
      reasons.push("titre français avec typographie soignée (+25 pts)");
    } else {
      reasons.push("titre (+15 pts)");
    }
  }

  // 3. Categories richness
  const catCount = (item.categories || []).length;
  if (catCount > 0) {
    const catPts = catCount * 8;
    score += catPts;
    reasons.push(`catégories (+${catPts} pts, ${catCount} catégories)`);
  }

  // 4. Duration completeness
  const durSec = parseDurationSec(item.duration);
  if (durSec >= 600) {
    score += 25;
    reasons.push(`durée complète ${item.duration} (+25 pts)`);
  } else if (durSec > 0) {
    score += 10;
  }

  // 5. Series & episode structure
  if (item.seriesId || item.seriesTitle) {
    score += 20;
    reasons.push(`série rattachée "${item.seriesTitle || item.seriesId}" (+20 pts)`);
  }
  if (typeof item.episodeNumber === "number" && item.episodeNumber > 0) {
    score += 15;
    reasons.push(`épisode n°${item.episodeNumber} (+15 pts)`);
  }

  // 6. Skip segments (intro / sponsors)
  if (item.skipSegments && item.skipSegments.length > 0) {
    score += 20;
    reasons.push(`segments de saut (+20 pts, ${item.skipSegments.length} segments)`);
  }

  // 7. Alternative audio tracks
  if (item.audioUrl || (item.audioTracks && item.audioTracks.length > 0)) {
    score += 15;
    reasons.push("pistes audio (+15 pts)");
  }

  // 8. Custom hero / high-resolution image
  if (item.heroImage) {
    score += 10;
    reasons.push("image hero (+10 pts)");
  }
  if (item.videoUrl) {
    score += 15;
    reasons.push("flux vidéo direct (+15 pts)");
  }

  // 9. Editorial flags
  if (item.featured) score += 5;
  if (item.isTrending) score += 5;
  if (item.isNew) score += 5;

  // 10. Engagement metrics
  if (item.viewsCount || item.viewsStr) score += 5;
  if (item.likesCount || item.likesStr) score += 5;
  if (item.rating) score += 5;

  return { score, reasons };
}

/**
 * Merges two duplicate items by preserving the highest-scoring primary item
 * while augmenting it with any non-empty fields present on the secondary item.
 */
function mergeDuplicatePair(
  itemA: ContentItem,
  itemB: ContentItem
): { winner: ContentItem; dropped: ContentItem; winnerScore: number; droppedScore: number; mergedFields: string[] } {
  const scoreA = computeContentCompletenessScore(itemA);
  const scoreB = computeContentCompletenessScore(itemB);

  const isAWinner = scoreA.score >= scoreB.score;
  const primary = isAWinner ? itemA : itemB;
  const secondary = isAWinner ? itemB : itemA;
  const winnerScore = isAWinner ? scoreA.score : scoreB.score;
  const droppedScore = isAWinner ? scoreB.score : scoreA.score;

  const mergedFields: string[] = [];
  const merged: ContentItem = { ...primary };

  // Combine categories without duplicates
  const allCategories = Array.from(new Set([...(primary.categories || []), ...(secondary.categories || [])]));
  if (allCategories.length > (primary.categories || []).length) {
    merged.categories = allCategories;
    mergedFields.push("catégories");
  }

  // Inherit series metadata if primary was missing it
  if (!merged.seriesId && secondary.seriesId) {
    merged.seriesId = secondary.seriesId;
    merged.seriesTitle = secondary.seriesTitle;
    merged.episodeNumber = secondary.episodeNumber;
    merged.totalEpisodes = secondary.totalEpisodes;
    mergedFields.push("série & épisode");
  }

  // Inherit skip segments
  if ((!merged.skipSegments || merged.skipSegments.length === 0) && secondary.skipSegments && secondary.skipSegments.length > 0) {
    merged.skipSegments = secondary.skipSegments;
    mergedFields.push("segments de saut");
  }

  // Inherit audio tracks
  if (!merged.audioUrl && secondary.audioUrl) {
    merged.audioUrl = secondary.audioUrl;
    mergedFields.push("audioUrl");
  }
  if ((!merged.audioTracks || merged.audioTracks.length === 0) && secondary.audioTracks && secondary.audioTracks.length > 0) {
    merged.audioTracks = secondary.audioTracks;
    mergedFields.push("audioTracks");
  }

  // Inherit editorial tags if secondary had them
  if (!merged.featured && secondary.featured) {
    merged.featured = true;
    mergedFields.push("featured");
  }
  if (!merged.isTrending && secondary.isTrending) {
    merged.isTrending = true;
    mergedFields.push("isTrending");
  }
  if (!merged.isNew && secondary.isNew) {
    merged.isNew = true;
    mergedFields.push("isNew");
  }

  // Inherit views/likes metrics if missing
  if (!merged.viewsStr && secondary.viewsStr) {
    merged.viewsStr = secondary.viewsStr;
    merged.viewsCount = secondary.viewsCount;
    mergedFields.push("vues");
  }
  if (!merged.likesStr && secondary.likesStr) {
    merged.likesStr = secondary.likesStr;
    merged.likesCount = secondary.likesCount;
    mergedFields.push("mentions j'aime");
  }

  // Inherit direct video URL if present
  if (!merged.videoUrl && secondary.videoUrl) {
    merged.videoUrl = secondary.videoUrl;
    merged.videoSourceType = secondary.videoSourceType;
    mergedFields.push("videoUrl");
  }

  return {
    winner: merged,
    dropped: secondary,
    winnerScore,
    droppedScore,
    mergedFields,
  };
}

/**
 * Deduplicates a catalog array based on youtubeId.
 * - Prevents multiple items with the same YouTube ID from appearing.
 * - Keeps the most complete video (based on completeness score) while merging complementary metadata.
 * - Adds a clear witness in console log stating how many duplicates were detected and removed.
 */
export function deduplicateCatalog(items: ContentItem[], contextLabel = "Chargement Catalogue"): ContentItem[] {
  if (!Array.isArray(items) || items.length <= 1) {
    return items;
  }

  const initialCount = items.length;
  const youtubeMap = new Map<string, ContentItem>();
  const nonYoutubeItems: ContentItem[] = [];
  const duplicatesList: DeduplicationDetail[] = [];

  for (const item of items) {
    const rawYtId = item.youtubeId?.trim();
    // Non-YouTube items or empty IDs are preserved by their unique ID
    if (!rawYtId) {
      nonYoutubeItems.push(item);
      continue;
    }

    if (!youtubeMap.has(rawYtId)) {
      youtubeMap.set(rawYtId, item);
    } else {
      // Duplicate detected! Compare completeness and retain the best
      const existing = youtubeMap.get(rawYtId)!;
      const { winner, dropped, winnerScore, droppedScore, mergedFields } = mergeDuplicatePair(existing, item);

      youtubeMap.set(rawYtId, winner);

      duplicatesList.push({
        youtubeId: rawYtId,
        retainedId: winner.id,
        retainedTitle: winner.title,
        retainedChannel: winner.channel,
        retainedScore: winnerScore,
        droppedId: dropped.id,
        droppedTitle: dropped.title,
        droppedChannel: dropped.channel,
        droppedScore: droppedScore,
        mergedFields,
      });
    }
  }

  const dedupedYoutubeItems = Array.from(youtubeMap.values());
  const finalCatalog = [...dedupedYoutubeItems, ...nonYoutubeItems];
  const removedCount = initialCount - finalCatalog.length;

  const report: DeduplicationReport = {
    initialCount,
    finalCount: finalCatalog.length,
    removedCount,
    timestamp: new Date().toISOString(),
    context: contextLabel,
    duplicates: duplicatesList,
  };

  lastDeduplicationReport = report;

  // Témoin dans le log conforme à la demande de l'utilisateur
  if (removedCount > 0) {
    console.info(
      `%c[Catalogue Déduplication] %c${removedCount} doublon(s) YouTube supprimé(s) au chargement (%c${contextLabel}%c). Total : ${initialCount} → ${finalCatalog.length} vidéos.`,
      "color: #10b981; font-weight: bold;",
      "color: #f59e0b; font-weight: bold;",
      "color: #38bdf8; text-decoration: underline;",
      "color: inherit;"
    );

    // Detailed breakdown in console group for transparency
    if (typeof console.groupCollapsed === "function") {
      console.groupCollapsed(`%c[Détails Déduplication] ${removedCount} doublon(s) écarté(s) au profit de la version la plus complète`, "color: #10b981; font-size: 11px;");
      duplicatesList.forEach((dup, index) => {
        console.info(
          `#${index + 1} [ID: ${dup.youtubeId}]\n` +
          `  ✓ Retenue (Score ${dup.retainedScore}) : [${dup.retainedChannel}] "${dup.retainedTitle}" (${dup.retainedId})\n` +
          `  ✗ Écartée (Score ${dup.droppedScore}) : [${dup.droppedChannel}] "${dup.droppedTitle}" (${dup.droppedId})\n` +
          (dup.mergedFields.length > 0 ? `  ✦ Métadonnées fusionnées : ${dup.mergedFields.join(", ")}\n` : "")
        );
      });
      console.groupEnd();
    }
  } else {
    console.info(
      `%c[Catalogue Déduplication] %cAucun doublon détecté lors du chargement (%c${contextLabel}%c). ${finalCatalog.length} vidéos uniques.`,
      "color: #10b981; font-weight: bold;",
      "color: #94a3b8;",
      "color: #38bdf8; text-decoration: underline;",
      "color: inherit;"
    );
  }

  return finalCatalog;
}
