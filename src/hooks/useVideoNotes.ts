import { useState, useCallback, useMemo, useEffect } from "react";
import { useAuth, type UserSpiritualNote } from "@/hooks/useAuth";
import { db, doc, setDoc, deleteDoc } from "@/lib/firebase";

export type SyncState = "idle" | "saving" | "synced" | "error";

export function useVideoNotes(contentId: string, contentTitle?: string) {
  const { user, userSpace, updateUserSpace, firebaseUser, isGuest } = useAuth();
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter notes specific to this video
  const videoNotes = useMemo(() => {
    if (!userSpace?.notes) return [];
    return userSpace.notes.filter((n) => n.contentId === contentId);
  }, [userSpace?.notes, contentId]);

  // Total count of all user notes
  const totalNotesCount = useMemo(() => {
    return userSpace?.notes?.length || 0;
  }, [userSpace?.notes]);

  // Add or update a note
  const saveNote = useCallback(
    async (data: {
      id?: string;
      title: string;
      content: string;
      verseReference?: string;
      verseText?: string;
      timestamp?: string;
    }): Promise<{ success: boolean; note?: UserSpiritualNote }> => {
      if (!data.title.trim() && !data.content.trim()) {
        return { success: false };
      }

      setSyncState("saving");
      setErrorMessage(null);

      try {
        const now = new Date();
        const dateStr = now.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });

        const isEditing = Boolean(data.id);
        const noteId = data.id || `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        const noteObj: UserSpiritualNote = {
          id: noteId,
          contentId,
          contentTitle: contentTitle || "",
          title: data.title.trim(),
          content: data.content.trim(),
          verseReference: data.verseReference?.trim() || undefined,
          verseText: data.verseText?.trim() || undefined,
          timestamp: data.timestamp?.trim() || undefined,
          date: dateStr,
          createdAt: isEditing
            ? userSpace?.notes?.find((n) => n.id === noteId)?.createdAt || now.toISOString()
            : now.toISOString(),
          updatedAt: now.toISOString(),
        };

        const currentNotes = userSpace?.notes || [];
        const nextNotes = isEditing
          ? currentNotes.map((n) => (n.id === noteId ? noteObj : n))
          : [noteObj, ...currentNotes];

        // 1. Update Personal Space (updates state, localStorage, and user document in Firestore)
        await updateUserSpace({ notes: nextNotes });

        // 2. Also persist individual document in Firestore subcollection if authenticated user
        const uid = firebaseUser?.uid || (user && !isGuest ? user.uid : null);
        if (uid) {
          try {
            const noteRef = doc(db, "users", uid, "notes", noteId);
            await setDoc(noteRef, noteObj, { merge: true });
          } catch (fsErr) {
            console.warn("Subcollection sync notice (fallback on user document):", fsErr);
          }
        }

        setSyncState("synced");
        setTimeout(() => setSyncState("idle"), 3000);
        return { success: true, note: noteObj };
      } catch (err: any) {
        console.error("Error saving video note:", err);
        setSyncState("error");
        setErrorMessage("Erreur lors de la sauvegarde. Veuillez réessayer.");
        return { success: false };
      }
    },
    [contentId, contentTitle, userSpace?.notes, updateUserSpace, firebaseUser, user, isGuest]
  );

  // Delete a note
  const deleteNote = useCallback(
    async (noteId: string): Promise<boolean> => {
      setSyncState("saving");
      try {
        const currentNotes = userSpace?.notes || [];
        const nextNotes = currentNotes.filter((n) => n.id !== noteId);

        await updateUserSpace({ notes: nextNotes });

        const uid = firebaseUser?.uid || (user && !isGuest ? user.uid : null);
        if (uid) {
          try {
            const noteRef = doc(db, "users", uid, "notes", noteId);
            await deleteDoc(noteRef);
          } catch (fsErr) {
            console.warn("Subcollection delete notice:", fsErr);
          }
        }

        setSyncState("synced");
        setTimeout(() => setSyncState("idle"), 2500);
        return true;
      } catch (err) {
        console.error("Error deleting note:", err);
        setSyncState("error");
        setErrorMessage("Impossible de supprimer la note.");
        return false;
      }
    },
    [userSpace?.notes, updateUserSpace, firebaseUser, user, isGuest]
  );

  return {
    notes: videoNotes,
    totalNotesCount,
    saveNote,
    deleteNote,
    syncState,
    errorMessage,
    isAuthenticated: Boolean(firebaseUser || (user && !isGuest)),
  };
}
