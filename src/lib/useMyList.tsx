import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useViewerProfile } from "@/hooks/useViewerProfile";
import { catalog, type ContentItem } from "@/data/catalog";

type FavoriteRow = {
  id: string;
  content_id: string;
  viewer_profile_id: string;
  created_at: string;
};

type MyListContextValue = {
  items: ContentItem[];
  inList: (contentId: string) => boolean;
  toggle: (item: ContentItem) => Promise<void>;
  remove: (contentId: string) => Promise<void>;
  loading: boolean;
};

const MyListContext = createContext<MyListContextValue | null>(null);

export function MyListProvider({ children }: { children: ReactNode }) {
  const { userSpace, toggleFavoriteInSpace, updateUserSpace } = useAuth();
  const { activeProfile } = useViewerProfile();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Sync with userSpace myList
  useEffect(() => {
    if (userSpace?.myList) {
      const listItems = userSpace.myList
        .map((id) => catalog.find((c) => c.id === id))
        .filter((c): c is ContentItem => c !== undefined);
      setItems(listItems);
    } else {
      setItems([]);
    }
  }, [userSpace?.myList]);

  const inList = useCallback(
    (contentId: string) => {
      if (!userSpace?.myList) return false;
      return userSpace.myList.includes(contentId);
    },
    [userSpace?.myList]
  );

  const toggle = useCallback(
    async (item: ContentItem) => {
      await toggleFavoriteInSpace(item.id);
    },
    [toggleFavoriteInSpace]
  );

  const remove = useCallback(
    async (contentId: string) => {
      if (!userSpace) return;
      const nextList = userSpace.myList.filter((id) => id !== contentId);
      await updateUserSpace({ myList: nextList });
    },
    [userSpace, updateUserSpace]
  );

  return (
    <MyListContext.Provider
      value={{
        items,
        inList,
        toggle,
        remove,
        loading,
      }}
    >
      {children}
    </MyListContext.Provider>
  );
}

export function useMyList() {
  const ctx = useContext(MyListContext);
  if (!ctx) throw new Error("useMyList must be used within MyListProvider");
  return ctx;
}
