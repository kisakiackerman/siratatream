import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useViewerProfile } from "@/hooks/useViewerProfile";
import { catalog, type ContentItem } from "@/data/catalog";
import ContentRow from "@/components/ContentRow";

type RecommendedRowProps = {
  onPlay: (id: string) => void;
  onInfo: (id: string) => void;
};

type HistoryEntry = {
  content_id: string;
  progress_seconds: number;
  duration_seconds: number;
};

export default function RecommendedRow({ onPlay, onInfo }: RecommendedRowProps) {
  const { activeProfile } = useViewerProfile();
  const [source, setSource] = useState<ContentItem | null>(null);
  const [recommendations, setRecommendations] = useState<ContentItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadRecommendations() {
      if (!activeProfile) {
        setSource(null);
        setRecommendations([]);
        return;
      }

      const { data } = await supabase
        .from("watch_history")
        .select("content_id, progress_seconds, duration_seconds")
        .eq("viewer_profile_id", activeProfile.id)
        .gt("duration_seconds", 0)
        .order("updated_at", { ascending: false })
        .limit(20);

      if (cancelled) return;

      const watched = (data ?? []) as HistoryEntry[];
      const completedEnough = watched.find(
        (entry) => entry.duration_seconds > 0 && entry.progress_seconds / entry.duration_seconds > 0.4
      ) || watched[0];

      const watchedContent = completedEnough
        ? catalog.find((item) => item.id === completedEnough.content_id) ?? null
        : null;

      if (!watchedContent) {
        // Default smart top picks recommendation
        const defaultTop = catalog.filter((item) => item.score >= 90).slice(0, 10);
        setSource({
          id: "top",
          title: "les plus populaires",
          youtubeId: "",
          description: "",
          channel: "NARRO",
          categories: ["Prophètes"],
          year: 2026,
          rating: "TV-PG",
          duration: "—",
          score: 98,
          thumbnail: "",
          image: "",
        });
        setRecommendations(defaultTop);
        return;
      }

      const similar = catalog
        .filter((item) => item.id !== watchedContent.id)
        .filter(
          (item) =>
            item.channel === watchedContent.channel ||
            item.categories.some((category) => watchedContent.categories.includes(category))
        )
        .slice(0, 12);

      setSource(watchedContent);
      setRecommendations(similar.length > 0 ? similar : catalog.slice(0, 10));
    }

    loadRecommendations();
    return () => {
      cancelled = true;
    };
  }, [activeProfile]);

  if (!source || recommendations.length === 0) return null;

  return (
    <ContentRow
      label={source.id === "top" ? "Recommandés pour vous" : `Parce que vous avez regardé « ${source.title} »`}
      items={recommendations}
      onPlay={onPlay}
      onInfo={onInfo}
      limit={12}
    />
  );
}
