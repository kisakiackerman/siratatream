import { lazy, ComponentType } from "react";

/**
 * Resilient dynamic lazy loader that retries failed chunk imports
 * caused by Vite dev rebuilds, stale cache or transient network blips.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      console.warn("Dynamic import failed, retrying module load...", error);
      // Wait 300ms before retrying
      await new Promise((resolve) => setTimeout(resolve, 300));
      try {
        return await factory();
      } catch (retryError) {
        console.error("Second attempt failed. Reloading browser window to sync chunks.", retryError);
        // If chunk is stale or replaced after a build, reload window
        if (typeof window !== "undefined") {
          window.location.reload();
        }
        throw retryError;
      }
    }
  });
}
