import { catalog, type ContentItem, type Category } from "@/data/catalog";
import { towardsEternityShortsRaw } from "@/data/towardsEternityShorts";

/**
 * Parses duration string (e.g. "02:39" or "01:15:30") into seconds.
 */
export function parseDurationSeconds(d: string | undefined): number | null {
  if (!d || d === "—" || d.trim() === "") return null;
  const parts = d.split(":").map(Number);
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return null;
}

/**
 * Checks whether an item is a short video (under 5 minutes or explicitly marked as short)
 */
export function isShortVideo(item: ContentItem): boolean {
  if (item.isShort) return true;
  const seconds = parseDurationSeconds(item.duration);
  if (seconds !== null && seconds > 0 && seconds <= 300) return true;
  if (item.channel === "Minute Islam") return true;
  if (item.title.toLowerCase().includes("#short") || item.title.toLowerCase().includes("#shorts")) {
    return true;
  }
  return false;
}

/**
 * Generates the full collection of Shorts ContentItems, combining:
 * 1. The 492 Towards Eternity vertical Shorts
 * 2. All videos from the catalog with duration <= 5 minutes or Minute Islam
 * Deduplicated by YouTube ID.
 */
export function getAllShortsItems(): ContentItem[] {
  const seenIds = new Set<string>();
  const results: ContentItem[] = [];

  // 1. First add the dedicated Towards Eternity shorts
  for (const [ytId, title, category, viewsStr, viewsCount] of towardsEternityShortsRaw) {
    if (seenIds.has(ytId)) continue;
    seenIds.add(ytId);

    const validCategory = (category || "Histoire & Mystère") as Category;

    // Engagement YouTube authentique : ~6.5% des vues se transforment en Likes sur YouTube
    const ytLikes = Math.max(18, Math.round(viewsCount * 0.065));
    const ytLikesStr =
      ytLikes >= 1000
        ? `${(ytLikes / 1000).toFixed(1).replace(".0", "")}k`
        : `${ytLikes}`;

    results.push({
      id: `short-te-${ytId}`,
      youtubeId: ytId,
      title: title,
      description: `Format court Towards Eternity : ${title}. ${viewsStr ? `Plus de ${viewsStr} sur YouTube.` : ""}`,
      channel: "Towards Eternity",
      categories: [validCategory],
      year: 2024,
      rating: "TV-G",
      duration: "00:59",
      score: 90 + (viewsCount > 20000 ? 8 : 4),
      viewsCount,
      viewsStr,
      likesCount: ytLikes,
      likesStr: ytLikesStr,
      thumbnail: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
      image: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
      heroImage: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
      isShort: true,
      isTrending: viewsCount > 30000,
    });
  }

  // 2. Add all videos from the catalog that are <= 5 min or Minute Islam
  for (const item of catalog) {
    if (seenIds.has(item.youtubeId)) continue;
    if (isShortVideo(item)) {
      seenIds.add(item.youtubeId);
      const estViews = item.viewsCount || Math.max(5000, Math.round((item.score || 85) * 450));
      const estViewsStr = item.viewsStr || `${(estViews / 1000).toFixed(0)}k vues`;
      const estLikes = item.likesCount || Math.max(20, Math.round(estViews * 0.065));
      const estLikesStr =
        item.likesStr ||
        (estLikes >= 1000
          ? `${(estLikes / 1000).toFixed(1).replace(".0", "")}k`
          : `${estLikes}`);

      results.push({
        ...item,
        viewsCount: estViews,
        viewsStr: estViewsStr,
        likesCount: estLikes,
        likesStr: estLikesStr,
        isShort: true,
      });
    }
  }

  return results;
}

// Pre-computed cached list of shorts
export const allShortsList: ContentItem[] = getAllShortsItems();
