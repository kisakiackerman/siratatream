import { Star } from "lucide-react";

type RatingStarsProps = {
  averageRating: number;
  ratingCount: number;
  userRating: number | null;
  onRate?: (rating: number) => void;
};

export default function RatingStars({
  averageRating,
  ratingCount,
  userRating,
  onRate,
}: RatingStarsProps) {
  const highlightedRating = userRating ?? Math.round(averageRating);

  return (
    <div className="flex items-center gap-2" aria-label={`Note moyenne ${averageRating.toFixed(1)} sur 5, ${ratingCount} avis`}>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onRate?.(rating)}
            disabled={!onRate}
            aria-label={`Noter ${rating} sur 5`}
            className={`transition-colors ${
              onRate ? "cursor-pointer hover:text-amber-300" : "cursor-default"
            } ${rating <= highlightedRating ? "text-amber-400" : "text-zinc-600"}`}
          >
            <Star size={16} fill="currentColor" />
          </button>
        ))}
      </div>
      <span className="text-zinc-400 text-xs font-medium">
        {averageRating > 0 ? averageRating.toFixed(1) : "-"} ({ratingCount})
      </span>
      {onRate && userRating && (
        <span className="text-zinc-400 text-xs">Votre note : {userRating}/5</span>
      )}
    </div>
  );
}
