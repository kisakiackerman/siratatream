import { useState, useEffect } from "react";
import { X, ChevronRight } from "lucide-react";
import { useCreatorCatalog } from "@/hooks/useCreatorCatalog";
import { type ContentItem } from "@/data/catalog";

interface AnnouncementBannerProps {
  onPlayContent?: (item: ContentItem) => void;
  onOpenCreatorStudio?: () => void;
}

export default function AnnouncementBanner({
  onPlayContent,
  onOpenCreatorStudio,
}: AnnouncementBannerProps) {
  const { announcement, catalog } = useCreatorCatalog();

  const getStorageKey = () => {
    if (!announcement) return "announcement_dismissed_default";
    const identifier = announcement.updatedAt || announcement.text || "active";
    return `announcement_dismissed_${identifier.slice(0, 40)}`;
  };

  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      if (!announcement?.text) return false;
      const key = `announcement_dismissed_${(announcement.updatedAt || announcement.text).slice(0, 40)}`;
      return localStorage.getItem(key) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!announcement?.text) return;
    try {
      const key = getStorageKey();
      setDismissed(localStorage.getItem(key) === "true");
    } catch {
      setDismissed(false);
    }
  }, [announcement?.text, announcement?.updatedAt]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      const key = getStorageKey();
      localStorage.setItem(key, "true");
    } catch {}
  };

  if (!announcement || !announcement.enabled || !announcement.text || dismissed) {
    return null;
  }

  const linkedItem = announcement.linkContentId
    ? catalog.find((c) => c.id === announcement.linkContentId)
    : null;

  const isUrgent = announcement.priority === "urgent" || announcement.badgeColor === "red";

  return (
    <div
      className={`relative z-40 w-full border-b px-4 py-2 text-xs flex items-center justify-between gap-3 shadow-md transition-all ${
        isUrgent
          ? "bg-gradient-to-r from-red-950/90 via-zinc-900 to-red-950/90 border-red-500/40"
          : "bg-zinc-950/90 backdrop-blur-xl border-emerald-300/20"
      }`}
    >
      <div className="flex items-center gap-3 overflow-hidden flex-1">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isUrgent ? "bg-red-400" : "bg-emerald-400"
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isUrgent ? "bg-red-500" : "bg-emerald-500"
              }`}
            ></span>
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
              isUrgent
                ? "bg-red-500/20 text-red-300 border-red-500/30"
                : "bg-emerald-400/15 text-emerald-200 border-emerald-300/30 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)]"
            }`}
          >
            {announcement.badge || (isUrgent ? "ALERTE" : "ANNONCE")}
          </span>
        </div>

        <div className="flex items-center gap-2 truncate">
          <span className="font-semibold text-zinc-100 truncate">{announcement.text}</span>
          {announcement.subtext && (
            <span className="text-zinc-400 hidden md:inline truncate">• {announcement.subtext}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {linkedItem && onPlayContent && (
          <button
            onClick={() => onPlayContent(linkedItem)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-400/15 hover:bg-emerald-400/25 text-emerald-200 border border-emerald-300/35 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)] font-medium text-[11px] transition-colors"
          >
            <span>{announcement.buttonText || "Regarder"}</span>
            <ChevronRight size={12} />
          </button>
        )}
        {announcement.externalLink && !linkedItem && (
          <a
            href={announcement.externalLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-400/15 hover:bg-emerald-400/25 text-emerald-200 border border-emerald-300/35 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(167,243,208,0.35),inset_0_-2px_4px_rgba(0,0,0,0.25)] font-medium text-[11px] transition-colors"
          >
            <span>{announcement.buttonText || "En savoir plus"}</span>
            <ChevronRight size={12} />
          </a>
        )}

        <button
          onClick={handleDismiss}
          className="p-1 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800 transition-colors"
          aria-label="Fermer définitivement l'annonce"
          title="Fermer définitivement"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
