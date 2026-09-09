import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";

export type MessageCategory = "general" | "question" | "idea" | "thanks" | "technical";

export interface CreatorMessage {
  id: string;
  senderName: string;
  senderEmail?: string;
  subject: string;
  content: string;
  category: MessageCategory;
  videoContext?: string;
  status: "unread" | "read" | "archived";
  createdAt: string;
  updatedAt?: string;
}

const STORAGE_MESSAGES_KEY = "nexstream_creator_messages_v1";

const INITIAL_DEMO_MESSAGES: CreatorMessage[] = [];

export function useCreatorMessages() {
  const { user, firebaseUser, isCreator } = useAuth();
  const [messages, setMessages] = useState<CreatorMessage[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_MESSAGES_KEY);
      return stored ? JSON.parse(stored) : INITIAL_DEMO_MESSAGES;
    } catch {
      return INITIAL_DEMO_MESSAGES;
    }
  });
  const [loading, setLoading] = useState(false);

  // Real-time Firestore sync: only for authenticated creators to protect user privacy
  useEffect(() => {
    if (!isCreator) {
      return;
    }

    try {
      const colRef = collection(db, "creator_messages");
      const q = query(colRef, orderBy("createdAt", "desc"));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const items: CreatorMessage[] = [];
            snapshot.forEach((docSnap) => {
              items.push(docSnap.data() as CreatorMessage);
            });
            setMessages(items);
            localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(items));
          }
        },
        (err) => {
          console.warn("Firestore messages snapshot warning:", err.message);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      console.warn("Firestore messages setup fallback:", e);
    }
  }, [isCreator]);

  // Submit a message to the creator
  const sendMessage = useCallback(
    async (data: {
      senderName?: string;
      senderEmail?: string;
      subject: string;
      content: string;
      category?: MessageCategory;
      videoContext?: string;
    }): Promise<{ success: boolean; error?: string }> => {
      if (!data.content.trim()) {
        return { success: false, error: "Le contenu du message ne peut pas être vide." };
      }
      if (!data.subject.trim()) {
        return { success: false, error: "Veuillez préciser un sujet pour votre message." };
      }

      try {
        setLoading(true);
        const id = "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
        const name =
          data.senderName?.trim() ||
          user?.displayName ||
          firebaseUser?.displayName ||
          user?.email?.split("@")[0] ||
          "Utilisateur anonyme";

        const email =
          data.senderEmail?.trim() ||
          user?.email ||
          firebaseUser?.email ||
          "";

        const newMessage: CreatorMessage = {
          id,
          senderName: name,
          senderEmail: email,
          subject: data.subject.trim(),
          content: data.content.trim(),
          category: data.category || "general",
          videoContext: data.videoContext?.trim(),
          status: "unread",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const nextList = [newMessage, ...messages];
        setMessages(nextList);
        localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(nextList));

        // Firestore push
        try {
          await setDoc(doc(db, "creator_messages", id), newMessage);
        } catch (fbErr: any) {
          console.warn("Firestore message save warning:", fbErr.message);
        }

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || "Erreur d'envoi du message" };
      } finally {
        setLoading(false);
      }
    },
    [messages, user, firebaseUser]
  );

  // Mark message as read / unread
  const markAsRead = useCallback(
    async (messageId: string, status: "read" | "unread" | "archived" = "read") => {
      const updated = messages.map((m) => (m.id === messageId ? { ...m, status } : m));
      setMessages(updated);
      localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(updated));

      try {
        await updateDoc(doc(db, "creator_messages", messageId), {
          status,
          updatedAt: new Date().toISOString(),
        });
      } catch (e: any) {
        console.warn("Firestore update message status note:", e.message);
      }
    },
    [messages]
  );

  // Delete message
  const deleteMessage = useCallback(
    async (messageId: string) => {
      const updated = messages.filter((m) => m.id !== messageId);
      setMessages(updated);
      localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(updated));

      try {
        await deleteDoc(doc(db, "creator_messages", messageId));
      } catch (e: any) {
        console.warn("Firestore delete message note:", e.message);
      }
    },
    [messages]
  );

  const unreadCount = messages.filter((m) => m.status === "unread").length;

  return {
    messages,
    unreadCount,
    loading,
    sendMessage,
    markAsRead,
    deleteMessage,
  };
}
