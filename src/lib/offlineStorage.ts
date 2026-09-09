import { ContentItem, catalog } from "@/data/catalog";

const OFFLINE_STORAGE_KEY = "nexstream_offline_downloads";

export type OfflineDownload = {
  contentId: string;
  downloadedAt: string;
  sizeMB: number;
  item: ContentItem;
};

export function getOfflineDownloads(): OfflineDownload[] {
  try {
    const raw = localStorage.getItem(OFFLINE_STORAGE_KEY);
    if (!raw) return [];
    const list: OfflineDownload[] = JSON.parse(raw);
    return list;
  } catch {
    return [];
  }
}

export function isDownloadedOffline(contentId: string): boolean {
  const downloads = getOfflineDownloads();
  return downloads.some((d) => d.contentId === contentId);
}

export function saveOfflineDownload(item: ContentItem): OfflineDownload[] {
  const downloads = getOfflineDownloads();
  if (downloads.some((d) => d.contentId === item.id)) {
    return downloads;
  }
  const newEntry: OfflineDownload = {
    contentId: item.id,
    downloadedAt: new Date().toISOString(),
    sizeMB: Math.floor(Math.random() * 60) + 40, // 40-100MB simulated download package with cached audio/metadata
    item,
  };
  const updated = [newEntry, ...downloads];
  localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent("nexstream-offline-changed"));
  return updated;
}

export function removeOfflineDownload(contentId: string): OfflineDownload[] {
  const downloads = getOfflineDownloads();
  const updated = downloads.filter((d) => d.contentId !== contentId);
  localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent("nexstream-offline-changed"));
  return updated;
}
