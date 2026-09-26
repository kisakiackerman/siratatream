import { useMemo } from "react";
import { useViewerProfile } from "@/hooks/useViewerProfile";
import { useCreatorCatalog } from "@/hooks/useCreatorCatalog";
import { diversifyCatalogByChannel } from "@/lib/catalogDiversity";
import ContentRow from "@/components/ContentRow";
import { useUserInterests, sortCatalogByRecommendation } from "@/lib/userInterestEngine";

type RecommendedRowProps = {
  onPlay: (id: string) => void;
  onInfo: (id: string) => void;
};

export default function RecommendedRow({ onPlay, onInfo }: RecommendedRowProps) {
  const { activeProfile } = useViewerProfile();
  const { catalog } = useCreatorCatalog();
  const {
    totalWatched,
    isProfileReady,
    primaryInterest,
    secondaryInterest,
    scoringFunction,
  } = useUserInterests(catalog);

  const recommendations = useMemo(() => {
    if (!catalog || catalog.length === 0) return [];

    // Sort catalog by recommendation score (highest recommendation first)
    const sorted = sortCatalogByRecommendation(catalog, scoringFunction);

    // Apply diversity so not all recommendations come from a single creator
    const diversified = diversifyCatalogByChannel(sorted, { prioritizeQuality: true });
    return diversified.slice(0, 14);
  }, [catalog, scoringFunction]);

  if (!activeProfile || recommendations.length === 0) return null;

  return (
    <ContentRow
      label="Recommandés pour vous"
      items={recommendations}
      onPlay={onPlay}
      onInfo={onInfo}
      limit={14}
    />
  );
}

