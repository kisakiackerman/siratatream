import { ContentItem } from "@/data/catalog";
import { supabaseAnonKey } from "@/lib/supabase";

export type YouTubeVideoMeta = {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  duration: string;
  durationSeconds: number;
  thumbnail: string;
  viewCount: number;
  likeCount: number;
  publishedAt: string;
  tags: string[];
  streamUrl?: string;
  audioUrl?: string;
};

export const DEFAULT_YOUTUBE_ENDPOINT =
  "https://tlfsqzdfssqlvikbkglp.supabase.co/functions/v1/fetch-youtube-content";

const CACHE_KEY_PREFIX = "yt_api_meta_v2_";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

export function getYouTubeApiKeyOrEndpoint(): string | null {
  // Check client env variable or local storage configuration
  const envKey = (import.meta as any).env?.VITE_YOUTUBE_API_KEY;
  if (
    envKey &&
    typeof envKey === "string" &&
    envKey.trim().length > 0 &&
    !envKey.includes("MY_") &&
    !envKey.includes("YOUR_")
  ) {
    return envKey.trim();
  }
  try {
    const customKey = localStorage.getItem("custom_youtube_api_key");
    if (customKey && customKey.trim().length > 0 && !customKey.includes("MY_")) {
      return customKey.trim();
    }
  } catch {
    // Ignore localStorage errors
  }
  return DEFAULT_YOUTUBE_ENDPOINT;
}

export function setCustomYouTubeApiKey(key: string) {
  try {
    if (key.trim()) {
      localStorage.setItem("custom_youtube_api_key", key.trim());
    } else {
      localStorage.removeItem("custom_youtube_api_key");
    }
  } catch {
    // Ignore
  }
}

/**
 * Parses ISO 8601 duration format (e.g. PT1H12M45S, PT15M33S, PT45S)
 */
export function parseISO8601Duration(durationStr: string): { formatted: string; seconds: number } {
  if (!durationStr) return { formatted: "—", seconds: 0 };

  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) {
    // Check if it's already a formatted string like "12:30" or "45 min"
    if (durationStr.includes(":") || durationStr.includes("min")) {
      return { formatted: durationStr, seconds: 0 };
    }
    return { formatted: "—", seconds: 0 };
  }

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  let formatted = "";
  if (hours > 0) {
    formatted = `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  } else if (minutes > 0) {
    formatted = `${minutes} min ${seconds > 0 ? `${seconds}s` : ""}`.trim();
  } else {
    formatted = `${seconds}s`;
  }

  return { formatted, seconds: totalSeconds };
}

/**
 * Fetch video direct stream or playback source from edge function
 */
export async function fetchVideoPlaybackSource(
  youtubeId: string
): Promise<{ streamUrl?: string; audioUrl?: string; meta?: YouTubeVideoMeta } | null> {
  const endpoint = getYouTubeApiKeyOrEndpoint();
  if (!endpoint || !endpoint.startsWith("http")) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        action: "get_stream",
        videoId: youtubeId,
        videoIds: [youtubeId],
      }),
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && (data.streamUrl || data.url || data.videoUrl)) {
        return {
          streamUrl: data.streamUrl || data.url || data.videoUrl,
          audioUrl: data.audioUrl,
          meta: data.meta,
        };
      }
      if (data && data.items && Array.isArray(data.items) && data.items[0]?.streamUrl) {
        return {
          streamUrl: data.items[0].streamUrl,
          audioUrl: data.items[0].audioUrl,
          meta: data.items[0],
        };
      }
    }
  } catch (err) {
    console.debug("Edge function stream fetch fallback:", err);
  }

  return null;
}

/**
 * Fetch video details for a batch of YouTube Video IDs (up to 50 per batch)
 */
export async function fetchYouTubeVideosBatch(
  videoIds: string[],
  apiKeyOrEndpoint?: string
): Promise<Record<string, YouTubeVideoMeta>> {
  const keyOrUrl = apiKeyOrEndpoint || getYouTubeApiKeyOrEndpoint();
  if (!keyOrUrl || videoIds.length === 0) {
    return {};
  }

  const result: Record<string, YouTubeVideoMeta> = {};
  const uncachedIds: string[] = [];

  // Check cache first
  const now = Date.now();
  for (const id of videoIds) {
    try {
      const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && now - parsed.timestamp < CACHE_TTL_MS && parsed.data) {
          result[id] = parsed.data;
          continue;
        }
      }
    } catch {
      // Ignore parse errors
    }
    uncachedIds.push(id);
  }

  if (uncachedIds.length === 0) {
    return result;
  }

  // 1. If keyOrUrl is a Supabase Edge Function or custom proxy URL
  if (keyOrUrl.startsWith("http://") || keyOrUrl.startsWith("https://")) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Try POST first
      let res = await fetch(keyOrUrl, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          action: "get_content",
          videoIds: uncachedIds,
        }),
      });

      // If POST not supported or method not allowed, try GET
      if (!res.ok && res.status === 405) {
        const getUrl = new URL(keyOrUrl);
        getUrl.searchParams.set("videoIds", uncachedIds.join(","));
        res = await fetch(getUrl.toString(), {
          signal: controller.signal,
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
        });
      }
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const items = Array.isArray(json) ? json : json.items || json.data || [];

        if (Array.isArray(items)) {
          for (const item of items) {
            const vidId = item.id || item.youtubeId || item.videoId;
            if (!vidId) continue;

            const durInfo = parseISO8601Duration(item.duration || item.contentDetails?.duration || "");
            const thumbs = item.snippet?.thumbnails || item.thumbnails || {};
            const bestThumb =
              item.thumbnail ||
              thumbs.maxres?.url ||
              thumbs.standard?.url ||
              thumbs.high?.url ||
              `https://i.ytimg.com/vi/${vidId}/maxresdefault.jpg`;

            const meta: YouTubeVideoMeta = {
              id: vidId,
              title: item.title || item.snippet?.title || "",
              description: item.description || item.snippet?.description || "",
              channelTitle: item.channelTitle || item.snippet?.channelTitle || item.channel || "",
              duration: item.durationFormatted || durInfo.formatted,
              durationSeconds: item.durationSeconds || durInfo.seconds,
              thumbnail: bestThumb,
              viewCount: parseInt(item.viewCount || item.statistics?.viewCount || "0", 10),
              likeCount: parseInt(item.likeCount || item.statistics?.likeCount || "0", 10),
              publishedAt: item.publishedAt || item.snippet?.publishedAt || "",
              tags: Array.isArray(item.tags || item.snippet?.tags) ? (item.tags || item.snippet?.tags) : [],
              streamUrl: item.streamUrl || item.url,
              audioUrl: item.audioUrl,
            };

            result[vidId] = meta;
            try {
              localStorage.setItem(`${CACHE_KEY_PREFIX}${vidId}`, JSON.stringify({ timestamp: now, data: meta }));
            } catch {
              // Ignore
            }
          }
        }
      }
    } catch (err) {
      console.debug("Edge function batch fetch unavailable, using built-in catalog data:", err);
    }
    return result;
  }

  // 2. If standard Google YouTube Data API key (e.g. AIzaSy...) - Only run if valid key length & structure
  if (!keyOrUrl || keyOrUrl.length < 20 || keyOrUrl.includes(" ")) {
    return result;
  }

  const chunks: string[][] = [];
  for (let i = 0; i < uncachedIds.length; i += 50) {
    chunks.push(uncachedIds.slice(i, i + 50));
  }

  for (const chunk of chunks) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${chunk.join(",")}&key=${encodeURIComponent(keyOrUrl)}`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        console.debug("YouTube API notice:", res.status, res.statusText);
        break;
      }

      const json = await res.json();
      if (!json.items || !Array.isArray(json.items)) {
        continue;
      }

      for (const item of json.items) {
        const id = item.id;
        const snippet = item.snippet || {};
        const contentDetails = item.contentDetails || {};
        const stats = item.statistics || {};

        const durationInfo = parseISO8601Duration(contentDetails.duration || "");

        const thumbs = snippet.thumbnails || {};
        const bestThumb =
          thumbs.maxres?.url ||
          thumbs.standard?.url ||
          thumbs.high?.url ||
          thumbs.medium?.url ||
          thumbs.default?.url ||
          `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;

        const meta: YouTubeVideoMeta = {
          id,
          title: snippet.title || "",
          description: snippet.description || "",
          channelTitle: snippet.channelTitle || "",
          duration: durationInfo.formatted,
          durationSeconds: durationInfo.seconds,
          thumbnail: bestThumb,
          viewCount: parseInt(stats.viewCount || "0", 10),
          likeCount: parseInt(stats.likeCount || "0", 10),
          publishedAt: snippet.publishedAt || "",
          tags: Array.isArray(snippet.tags) ? snippet.tags : [],
        };

        result[id] = meta;

        try {
          localStorage.setItem(
            `${CACHE_KEY_PREFIX}${id}`,
            JSON.stringify({ timestamp: now, data: meta })
          );
        } catch {
          // LocalStorage full or disabled
        }
      }
    } catch (err) {
      console.debug("YouTube batch fetch notice:", err);
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────
// UNPLAYABLE & RESTRICTED VIDEO ERROR MANAGER
// ─────────────────────────────────────────────────────────────

const UNPLAYABLE_STORAGE_KEY = "nour_unplayable_videos_v1";

export interface PlaybackErrorInfo {
  code?: number;
  title: string;
  message: string;
  subMessage: string;
  isRestricted: boolean;
  isInvalidOrDeleted: boolean;
  canRetry: boolean;
}

/**
 * Diagnostic tool translating YouTube Player error codes into clear, user-friendly French messages
 */
export function getYouTubeErrorDetails(errorCode?: number | string): PlaybackErrorInfo {
  const codeNum = typeof errorCode === "string" ? parseInt(errorCode, 10) : errorCode;

  switch (codeNum) {
    case 101:
    case 150:
      return {
        code: codeNum,
        title: "Lecture intégrée restreinte",
        message: "Le propriétaire de cette vidéo ou YouTube n'autorise pas sa diffusion dans un lecteur intégré tiers.",
        subMessage: "Vous pouvez toujours visionner cet épisode directement et gratuitement sur YouTube en un clic.",
        isRestricted: true,
        isInvalidOrDeleted: false,
        canRetry: false,
      };
    case 100:
      return {
        code: codeNum,
        title: "Vidéo introuvable ou retirée",
        message: "Cette vidéo a été supprimée ou passée en mode privé sur YouTube par son créateur.",
        subMessage: "L'épisode n'est plus disponible publiquement. Vous pouvez passer à l'épisode suivant.",
        isRestricted: false,
        isInvalidOrDeleted: true,
        canRetry: false,
      };
    case 2:
      return {
        code: codeNum,
        title: "Identifiant de vidéo invalide",
        message: "Le lien vers ce contenu contient un paramètre de lecture non reconnu ou mal formaté.",
        subMessage: "Vérifiez votre connexion ou passez au contenu suivant de la liste.",
        isRestricted: false,
        isInvalidOrDeleted: true,
        canRetry: false,
      };
    case 5:
      return {
        code: codeNum,
        title: "Erreur de lecteur HTML5",
        message: "Un problème temporaire est survenu lors du décodage du flux vidéo dans votre navigateur.",
        subMessage: "Cliquez sur 'Réessayer' ou basculez vers le mode secours iframe.",
        isRestricted: false,
        isInvalidOrDeleted: false,
        canRetry: true,
      };
    default:
      return {
        code: codeNum,
        title: "Vidéo indisponible pour le moment",
        message: "La lecture de cette vidéo n'a pas pu démarrer correctement (délai dépassé ou restriction).",
        subMessage: "Vous pouvez retenter la lecture ou ouvrir la vidéo directement sur YouTube.",
        isRestricted: false,
        isInvalidOrDeleted: false,
        canRetry: true,
      };
  }
}

/**
 * Marks a video ID as unplayable in local storage with error details
 */
export function markVideoAsUnplayable(youtubeId: string, details?: { reason?: string; errorCode?: number }) {
  if (!youtubeId) return;
  try {
    const raw = localStorage.getItem(UNPLAYABLE_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[youtubeId] = {
      timestamp: Date.now(),
      errorCode: details?.errorCode,
      reason: details?.reason || "Video unavailable in embedded player",
    };
    localStorage.setItem(UNPLAYABLE_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage issues
  }
}

/**
 * Checks if a video is known to be unplayable or restricted
 */
export function isKnownUnplayableVideo(youtubeId: string): boolean {
  if (!youtubeId) return false;
  try {
    const raw = localStorage.getItem(UNPLAYABLE_STORAGE_KEY);
    if (!raw) return false;
    const map = JSON.parse(raw);
    const entry = map[youtubeId];
    if (!entry) return false;
    // Cache for 7 days
    if (Date.now() - entry.timestamp > 7 * 24 * 60 * 60 * 1000) {
      delete map[youtubeId];
      localStorage.setItem(UNPLAYABLE_STORAGE_KEY, JSON.stringify(map));
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Clears unplayable status for a video
 */
export function clearUnplayableVideo(youtubeId: string) {
  if (!youtubeId) return;
  try {
    const raw = localStorage.getItem(UNPLAYABLE_STORAGE_KEY);
    if (!raw) return;
    const map = JSON.parse(raw);
    if (map[youtubeId]) {
      delete map[youtubeId];
      localStorage.setItem(UNPLAYABLE_STORAGE_KEY, JSON.stringify(map));
    }
  } catch {
    // Ignore
  }
}

/**
 * Enriches catalog items with live metadata fetched from YouTube API / Edge Function
 */
export async function enrichCatalogWithYouTubeAPI(
  items: ContentItem[],
  apiKeyOrEndpoint?: string
): Promise<ContentItem[]> {
  try {
    const key = apiKeyOrEndpoint || getYouTubeApiKeyOrEndpoint();
    if (!key) {
      return items;
    }

    const ids = items.map((it) => it.youtubeId).filter(Boolean);
    const metaMap = await fetchYouTubeVideosBatch(ids, key);

    if (!metaMap || Object.keys(metaMap).length === 0) {
      return items;
    }

    return items.map((item) => {
      const meta = metaMap[item.youtubeId];
      if (!meta) return item;

      return {
        ...item,
        title: meta.title || item.title,
        description: meta.description || item.description,
        duration: meta.duration !== "—" ? meta.duration : item.duration,
        thumbnail: meta.thumbnail || item.thumbnail,
        image: meta.thumbnail || item.image,
        heroImage: item.featured ? (meta.thumbnail || item.heroImage) : item.heroImage,
      };
    });
  } catch (err) {
    console.debug("Enrich catalog notice:", err);
    return items;
  }
}
