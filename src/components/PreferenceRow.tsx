import { useViewerProfile } from "@/hooks/useViewerProfile";
import { catalog } from "@/data/catalog";
import ContentRow from "@/components/ContentRow";

type PreferenceRowProps = {
  onPlay: (id: string) => void;
  onInfo: (id: string) => void;
};

export default function PreferenceRow({ onPlay, onInfo }: PreferenceRowProps) {
  const { activeProfile } = useViewerProfile();
  const categories = activeProfile?.favorite_categories ?? [];

  if (!categories || categories.length === 0) return null;

  const items = catalog
    .filter((item) => item.categories.some((category) => categories.includes(category as any)))
    .slice(0, 12);

  if (items.length === 0) return null;

  return (
    <ContentRow
      label={`Recommandations basées sur vos centres d'intérêt (${categories.join(", ")})`}
      items={items}
      onPlay={onPlay}
      onInfo={onInfo}
      limit={12}
    />
  );
}
