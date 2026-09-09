import { useState, useEffect, useCallback } from "react";
import { db, collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

export type VideoSourceType = "youtube" | "direct" | "vimeo" | "dailymotion" | "hls" | "other";

export interface VideoSuggestion {
  id: string;
  title: string;
  url: string;
  videoSourceType?: VideoSourceType;
  category: string;
  note?: string;
  submittedBy: string;
  submitterEmail?: string;
  voteCount: number;
  voters: string[]; // List of user IDs or voter tokens
  status: "pending" | "approved" | "published" | "rejected";
  createdAt: string;
  updatedAt: string;
}

const STORAGE_SUGGESTIONS_KEY = "nexstream_video_suggestions_v1";

// Default initial suggestions to populate community interest if empty
const INITIAL_DEMO_SUGGESTIONS: VideoSuggestion[] = [];

export function useVideoSuggestions() {
  const { user, firebaseUser } = useAuth();
  const [suggestions, setSuggestions] = useState<VideoSuggestion[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_SUGGESTIONS_KEY);
      return stored ? JSON.parse(stored) : INITIAL_DEMO_SUGGESTIONS;
    } catch {
      return INITIAL_DEMO_SUGGESTIONS;
    }
  });
  const [loading, setLoading] = useState(false);

  // User identifier for voting
  const voterId = firebaseUser?.uid || user?.id || (typeof window !== "undefined" ? localStorage.getItem("nexstream_voter_token") || (() => {
    const token = "anon_" + Math.random().toString(36).substring(2, 10);
    localStorage.setItem("nexstream_voter_token", token);
    return token;
  })() : "anon_user");

  // Sync with Firestore in real-time
  useEffect(() => {
    try {
      const colRef = collection(db, "video_suggestions");
      const unsub = onSnapshot(
        colRef,
        (snap) => {
          if (!snap.empty) {
            const items: VideoSuggestion[] = [];
            snap.forEach((docSnap) => {
              items.push(docSnap.data() as VideoSuggestion);
            });
            // Sort by vote count descending
            items.sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
            setSuggestions(items);
            localStorage.setItem(STORAGE_SUGGESTIONS_KEY, JSON.stringify(items));
          } else {
            setSuggestions([]);
          }
        },
        (err) => {
          console.log("Suggestions snapshot notice (offline/local fallback):", err.message);
        }
      );

      return () => unsub();
    } catch (e) {
      console.warn("Firestore suggestions listener fallback:", e);
    }
  }, []);

  // Submit a new video suggestion
  const submitSuggestion = useCallback(
    async (data: {
      title: string;
      url: string;
      category: string;
      note?: string;
      submitterName?: string;
    }): Promise<{ success: boolean; error?: string }> => {
      try {
        const id = "sug_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
        
        let videoSourceType: VideoSourceType = "youtube";
        if (data.url.includes("vimeo.com")) videoSourceType = "vimeo";
        else if (data.url.includes("dailymotion.com") || data.url.includes("dai.ly")) videoSourceType = "dailymotion";
        else if (data.url.endsWith(".mp4") || data.url.endsWith(".webm") || data.url.includes("blob:") || data.url.startsWith("http")) {
          if (data.url.includes("youtube.com") || data.url.includes("youtu.be")) videoSourceType = "youtube";
          else videoSourceType = "direct";
        }

        const newSuggestion: VideoSuggestion = {
          id,
          title: data.title.trim(),
          url: data.url.trim(),
          videoSourceType,
          category: data.category || "Prophètes",
          note: data.note?.trim() || "",
          submittedBy: data.submitterName?.trim() || firebaseUser?.displayName || "Membre Communauté",
          submitterEmail: firebaseUser?.email || user?.email || "",
          voteCount: 1,
          voters: [voterId],
          status: "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const nextList = [newSuggestion, ...suggestions];
        setSuggestions(nextList);
        localStorage.setItem(STORAGE_SUGGESTIONS_KEY, JSON.stringify(nextList));

        // Firestore sync
        try {
          await setDoc(doc(db, "video_suggestions", id), newSuggestion);
        } catch (fbErr: any) {
          console.warn("Firestore suggestion save note:", fbErr.message);
        }

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || "Erreur d'envoi" };
      }
    },
    [suggestions, voterId, firebaseUser, user]
  );

  // Upvote / Toggle vote on a suggestion
  const toggleVote = useCallback(
    async (suggestionId: string): Promise<{ success: boolean; hasVoted: boolean }> => {
      const item = suggestions.find((s) => s.id === suggestionId);
      if (!item) return { success: false, hasVoted: false };

      const alreadyVoted = item.voters?.includes(voterId);
      let updatedVoters = item.voters || [];
      let nextCount = item.voteCount || 0;

      if (alreadyVoted) {
        updatedVoters = updatedVoters.filter((v) => v !== voterId);
        nextCount = Math.max(1, nextCount - 1);
      } else {
        updatedVoters = [...updatedVoters, voterId];
        nextCount += 1;
      }

      const updatedItem: VideoSuggestion = {
        ...item,
        voteCount: nextCount,
        voters: updatedVoters,
        updatedAt: new Date().toISOString(),
      };

      const nextList = suggestions.map((s) => (s.id === suggestionId ? updatedItem : s));
      nextList.sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
      setSuggestions(nextList);
      localStorage.setItem(STORAGE_SUGGESTIONS_KEY, JSON.stringify(nextList));

      try {
        await setDoc(doc(db, "video_suggestions", suggestionId), updatedItem);
      } catch (fbErr: any) {
        console.warn("Firestore suggestion vote note:", fbErr.message);
      }

      return { success: true, hasVoted: !alreadyVoted };
    },
    [suggestions, voterId]
  );

  // Admin delete suggestion
  const deleteSuggestion = useCallback(
    async (suggestionId: string) => {
      const nextList = suggestions.filter((s) => s.id !== suggestionId);
      setSuggestions(nextList);
      localStorage.setItem(STORAGE_SUGGESTIONS_KEY, JSON.stringify(nextList));

      try {
        await deleteDoc(doc(db, "video_suggestions", suggestionId));
      } catch (fbErr: any) {
        console.warn("Firestore suggestion delete note:", fbErr.message);
      }
    },
    [suggestions]
  );

  // Admin update status
  const updateStatus = useCallback(
    async (suggestionId: string, status: VideoSuggestion["status"]) => {
      const updatedList = suggestions.map((s) =>
        s.id === suggestionId ? { ...s, status, updatedAt: new Date().toISOString() } : s
      );
      setSuggestions(updatedList);
      localStorage.setItem(STORAGE_SUGGESTIONS_KEY, JSON.stringify(updatedList));

      try {
        await updateDoc(doc(db, "video_suggestions", suggestionId), {
          status,
          updatedAt: new Date().toISOString(),
        });
      } catch (fbErr: any) {
        console.warn("Firestore suggestion update status note:", fbErr.message);
      }
    },
    [suggestions]
  );

  return {
    suggestions,
    loading,
    voterId,
    submitSuggestion,
    toggleVote,
    deleteSuggestion,
    updateStatus,
  };
}
