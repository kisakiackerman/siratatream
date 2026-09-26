// Persistent Local Video Storage using browser IndexedDB
// Enables users to host and play their own MP4/WebM video files directly without YouTube or iframes

const DB_NAME = "siratstream_videos_db";
const DB_VERSION = 1;
const STORE_NAME = "video_blobs";

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.reject(new Error("IndexedDB not supported in this environment"));
  }

  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return dbPromise;
}

// Active in-memory Object URLs mapped by videoId to prevent leaks and enable instant playback
const activeObjectUrls = new Map<string, string>();

/**
 * Saves a local video file (Blob/File) to IndexedDB for persistent offline playback
 */
export async function saveLocalVideoFile(videoId: string, file: Blob | File): Promise<string> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(file, videoId);

    req.onsuccess = () => {
      // Revoke any previous URL for this ID
      const prev = activeObjectUrls.get(videoId);
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      const newUrl = URL.createObjectURL(file);
      activeObjectUrls.set(videoId, newUrl);
      resolve(newUrl);
    };

    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieves a stored video blob from IndexedDB
 */
export async function getLocalVideoBlob(videoId: string): Promise<Blob | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(videoId);

      req.onsuccess = () => {
        resolve(req.result || null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/**
 * Gets or recreates an Object URL for a stored local video
 */
export async function getLocalVideoUrl(videoId: string): Promise<string | null> {
  if (activeObjectUrls.has(videoId)) {
    return activeObjectUrls.get(videoId)!;
  }

  const blob = await getLocalVideoBlob(videoId);
  if (blob) {
    const url = URL.createObjectURL(blob);
    activeObjectUrls.set(videoId, url);
    return url;
  }
  return null;
}

/**
 * Generates an automatic video thumbnail and calculates duration from a video file or direct URL
 */
export function extractVideoMetadata(
  fileOrUrl: File | Blob | string
): Promise<{ thumbnail: string; duration: number; durationFormatted: string }> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      resolve({ thumbnail: "", duration: 0, durationFormatted: "0:00" });
      return;
    }

    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    const objectUrl =
      typeof fileOrUrl === "string" ? fileOrUrl : URL.createObjectURL(fileOrUrl);
    video.src = objectUrl;

    const cleanup = () => {
      if (typeof fileOrUrl !== "string") {
        URL.revokeObjectURL(objectUrl);
      }
      video.remove();
    };

    video.onloadedmetadata = () => {
      const duration = Math.round(video.duration || 0);
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      const durationFormatted = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

      // Seek to 1s or 15% of the video to capture a meaningful frame (not black)
      const seekTarget = Math.min(1.5, Math.max(0.5, video.duration * 0.1));

      video.currentTime = seekTarget;

      video.onseeked = () => {
        try {
          const canvas = document.createElement("canvas");
          const width = video.videoWidth || 640;
          const height = video.videoHeight || 360;
          canvas.width = Math.min(width, 1280);
          canvas.height = Math.round((canvas.width * height) / width);

          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbnail = canvas.toDataURL("image/jpeg", 0.85);
            cleanup();
            resolve({ thumbnail, duration, durationFormatted });
            return;
          }
        } catch {
          // Canvas capture may fail with cross-origin URLs
        }
        cleanup();
        resolve({ thumbnail: "", duration, durationFormatted });
      };

      video.onerror = () => {
        cleanup();
        resolve({ thumbnail: "", duration, durationFormatted });
      };
    };

    video.onerror = () => {
      cleanup();
      resolve({ thumbnail: "", duration: 0, durationFormatted: "0:00" });
    };

    // Safety timeout after 8s
    setTimeout(() => {
      cleanup();
      resolve({ thumbnail: "", duration: 0, durationFormatted: "0:00" });
    }, 8000);
  });
}
