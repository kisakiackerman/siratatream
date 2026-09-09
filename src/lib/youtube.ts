// Loads the YouTube IFrame API once and resolves when ready.
// The API calls window.onYouTubeIframeAPIReady when loaded; we bridge
// it to a promise so callers can just `await`.

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;

export function loadYouTubeAPI(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.YT && window.YT.Player) {
    return Promise.resolve();
  }

  if (apiPromise) return apiPromise;

  apiPromise = new Promise<void>((resolve) => {
    // If already initialized
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }

    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousReady === "function") {
        try {
          previousReady();
        } catch {
          // ignore
        }
      }
      resolve();
    };

    // Polling fallback in case onYouTubeIframeAPIReady fired before event binding
    const pollInterval = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(pollInterval);
        resolve();
      }
    }, 100);

    // Timeout safety fallback after 4 seconds
    setTimeout(() => {
      clearInterval(pollInterval);
      resolve();
    }, 4000);

    const existing = document.getElementById("yt-iframe-api");
    if (!existing) {
      const tag = document.createElement("script");
      tag.id = "yt-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      tag.onerror = () => {
        clearInterval(pollInterval);
        resolve(); // resolve so fallback takes over without crashing
      };
      document.head.appendChild(tag);
    }
  });

  return apiPromise;
}

export { apiPromise };
