import { useState, useEffect, useCallback } from "react";
import { supabase, isValidUuid } from "@/lib/supabase";
import { useViewerProfile } from "@/hooks/useViewerProfile";

export function useContentStats(contentId: string) {
  const { activeProfile } = useViewerProfile();
  const profileId = activeProfile?.id || "guest";

  const [likes, setLikes] = useState(() => {
    if (typeof window === "undefined") return 0;
    try {
      const saved = localStorage.getItem(`sirat_likes_count_${contentId}`);
      return saved ? Number(saved) : 0;
    } catch {
      return 0;
    }
  });
  const [dislikes, setDislikes] = useState(0);
  const [views, setViews] = useState(0);
  const [userVote, setUserVote] = useState<boolean | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem(`sirat_likes_${profileId}_${contentId}`);
      if (saved !== null) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [averageRating, setAverageRating] = useState<number>(4.8);
  const [ratingCount, setRatingCount] = useState<number>(0);
  const [userRating, setUserRating] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem(`sirat_rating_${profileId}_${contentId}`);
      if (saved !== null) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [loading, setLoading] = useState(true);

  // Synchronise local state when profile changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedVote = localStorage.getItem(`sirat_likes_${profileId}_${contentId}`);
      setUserVote(savedVote !== null ? JSON.parse(savedVote) : null);

      const savedRating = localStorage.getItem(`sirat_rating_${profileId}_${contentId}`);
      setUserRating(savedRating !== null ? JSON.parse(savedRating) : null);
    } catch {}
  }, [profileId, contentId]);

  const fetchStats = useCallback(async () => {
    setLoading(true);

    try {
      const [likesRes, viewsRes, ratingsRes] = await Promise.all([
        supabase.from("content_like_counts").select("*").eq("content_id", contentId).maybeSingle(),
        supabase.from("content_view_counts").select("*").eq("content_id", contentId).maybeSingle(),
        supabase.from("content_rating_averages").select("*").eq("content_id", contentId).maybeSingle(),
      ]);

      if (likesRes.data?.likes !== undefined) {
        setLikes(likesRes.data.likes);
        try {
          localStorage.setItem(`sirat_likes_count_${contentId}`, String(likesRes.data.likes));
        } catch {}
      }
      if (likesRes.data?.dislikes !== undefined) setDislikes(likesRes.data.dislikes);
      if (viewsRes.data?.views !== undefined) setViews(viewsRes.data.views);
      if (ratingsRes.data) {
        setAverageRating(Number(ratingsRes.data.average_rating) || 4.8);
        setRatingCount(Number(ratingsRes.data.rating_count) || 0);
      }

      if (activeProfile && isValidUuid(activeProfile.id)) {
        const [voteRes, userRatingRes] = await Promise.all([
          supabase
            .from("content_likes")
            .select("is_like")
            .eq("viewer_profile_id", activeProfile.id)
            .eq("content_id", contentId)
            .maybeSingle(),
          supabase
            .from("content_ratings")
            .select("rating")
            .eq("viewer_profile_id", activeProfile.id)
            .eq("content_id", contentId)
            .maybeSingle(),
        ]);

        if (voteRes.data?.is_like !== undefined) {
          setUserVote(voteRes.data.is_like);
          try {
            localStorage.setItem(
              `sirat_likes_${activeProfile.id}_${contentId}`,
              JSON.stringify(voteRes.data.is_like)
            );
          } catch {}
        }
        if (userRatingRes.data?.rating !== undefined) {
          setUserRating(userRatingRes.data.rating);
          try {
            localStorage.setItem(
              `sirat_rating_${activeProfile.id}_${contentId}`,
              JSON.stringify(userRatingRes.data.rating)
            );
          } catch {}
        }
      }
    } catch (err) {
      console.warn("fetchStats fallback to local:", err);
    } finally {
      setLoading(false);
    }
  }, [contentId, activeProfile]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const vote = useCallback(
    async (isLike: boolean | null) => {
      const curProfileId = activeProfile?.id || "guest";
      const localKey = `sirat_likes_${curProfileId}_${contentId}`;

      // Si déjà dans cet état, on bascule à null (retire le like)
      const nextVote = userVote === isLike ? null : isLike;

      // Mise à jour optimiste instantanée
      setUserVote(nextVote);
      try {
        if (nextVote === null) {
          localStorage.removeItem(localKey);
        } else {
          localStorage.setItem(localKey, JSON.stringify(nextVote));
        }
      } catch {}

      setLikes((prev) => {
        let updated = prev;
        if (nextVote === true && userVote !== true) updated = prev + 1;
        else if (nextVote !== true && userVote === true) updated = Math.max(0, prev - 1);
        try {
          localStorage.setItem(`sirat_likes_count_${contentId}`, String(updated));
        } catch {}
        return updated;
      });

      // Synchronisation Supabase en arrière-plan sans bloquer
      if (activeProfile && isValidUuid(activeProfile.id)) {
        try {
          if (nextVote === null) {
            await supabase
              .from("content_likes")
              .delete()
              .eq("viewer_profile_id", activeProfile.id)
              .eq("content_id", contentId);
          } else {
            await supabase.from("content_likes").upsert(
              {
                viewer_profile_id: activeProfile.id,
                content_id: contentId,
                is_like: nextVote,
              },
              { onConflict: "viewer_profile_id,content_id" }
            );
          }
        } catch (err) {
          console.warn("Supabase like sync fallback to local:", err);
        }
      }
    },
    [activeProfile, contentId, userVote]
  );

  const rate = useCallback(
    async (rating: number) => {
      const curProfileId = activeProfile?.id || "guest";
      const localKey = `sirat_rating_${curProfileId}_${contentId}`;

      setUserRating(rating);
      try {
        localStorage.setItem(localKey, JSON.stringify(rating));
      } catch {}

      if (activeProfile && isValidUuid(activeProfile.id)) {
        try {
          await supabase.from("content_ratings").upsert(
            {
              viewer_profile_id: activeProfile.id,
              content_id: contentId,
              rating,
            },
            { onConflict: "viewer_profile_id,content_id" }
          );
        } catch (err) {
          console.warn("Supabase rating sync fallback to local:", err);
        }
      }
    },
    [activeProfile, contentId]
  );

  const logView = useCallback(async () => {
    setViews((v) => v + 1);
    if (!activeProfile || !isValidUuid(activeProfile.id)) return;
    try {
      await supabase.from("content_views").insert({
        viewer_profile_id: activeProfile.id,
        content_id: contentId,
      });
    } catch {}
  }, [activeProfile, contentId]);

  return {
    likes,
    dislikes,
    views,
    userVote,
    averageRating,
    ratingCount,
    userRating,
    loading,
    vote,
    rate,
    logView,
  };
}
