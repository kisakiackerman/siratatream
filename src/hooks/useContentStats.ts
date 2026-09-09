import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useViewerProfile } from "@/hooks/useViewerProfile";

export function useContentStats(contentId: string) {
  const { activeProfile } = useViewerProfile();
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [views, setViews] = useState(0);
  const [userVote, setUserVote] = useState<boolean | null>(null);
  const [averageRating, setAverageRating] = useState<number>(4.8);
  const [ratingCount, setRatingCount] = useState<number>(0);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);

    const [likesRes, viewsRes, ratingsRes] = await Promise.all([
      supabase.from("content_like_counts").select("*").eq("content_id", contentId).maybeSingle(),
      supabase.from("content_view_counts").select("*").eq("content_id", contentId).maybeSingle(),
      supabase.from("content_rating_averages").select("*").eq("content_id", contentId).maybeSingle(),
    ]);

    setLikes(likesRes.data?.likes ?? 0);
    setDislikes(likesRes.data?.dislikes ?? 0);
    setViews(viewsRes.data?.views ?? 0);
    if (ratingsRes.data) {
      setAverageRating(Number(ratingsRes.data.average_rating) || 4.8);
      setRatingCount(Number(ratingsRes.data.rating_count) || 0);
    }

    if (activeProfile) {
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

      setUserVote(voteRes.data?.is_like ?? null);
      setUserRating(userRatingRes.data?.rating ?? null);
    } else {
      setUserVote(null);
      setUserRating(null);
    }

    setLoading(false);
  }, [contentId, activeProfile]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const vote = useCallback(
    async (isLike: boolean) => {
      if (!activeProfile) return;

      if (userVote === isLike) {
        await supabase
          .from("content_likes")
          .delete()
          .eq("viewer_profile_id", activeProfile.id)
          .eq("content_id", contentId);
        setUserVote(null);
      } else {
        await supabase.from("content_likes").upsert(
          {
            viewer_profile_id: activeProfile.id,
            content_id: contentId,
            is_like: isLike,
          },
          { onConflict: "viewer_profile_id,content_id" }
        );
        setUserVote(isLike);
      }
      fetchStats();
    },
    [activeProfile, contentId, userVote, fetchStats]
  );

  const rate = useCallback(
    async (rating: number) => {
      if (!activeProfile) return;

      await supabase.from("content_ratings").upsert(
        {
          viewer_profile_id: activeProfile.id,
          content_id: contentId,
          rating,
        },
        { onConflict: "viewer_profile_id,content_id" }
      );
      setUserRating(rating);
      fetchStats();
    },
    [activeProfile, contentId, fetchStats]
  );

  const logView = useCallback(async () => {
    if (!activeProfile) return;
    await supabase.from("content_views").insert({
      viewer_profile_id: activeProfile.id,
      content_id: contentId,
    });
    setViews((v) => v + 1);
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
