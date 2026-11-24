import { createContext, useContext, useEffect, useMemo, useCallback, ReactNode } from "react";

export type ThemeMode = "dark";
export type ResolvedTheme = "dark";

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
  isSystem: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const LEGACY_STORAGE_KEY = "siratstream_theme_preference";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applyDarkThemeToDOM() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const body = document.body;

  root.classList.remove("light");
  root.classList.add("dark");
  root.setAttribute("data-theme", "dark");
  root.style.colorScheme = "dark";

  if (body) {
    body.classList.remove("light");
    body.classList.add("dark");
    body.setAttribute("data-theme", "dark");
  }

  try {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", "#09090b");
    }
    const metaColorScheme = document.querySelector('meta[name="color-scheme"]');
    if (metaColorScheme) {
      metaColorScheme.setAttribute("content", "dark");
    }
  } catch {
    // ignore
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // ignore
    }
    applyDarkThemeToDOM();
  }, []);

  const setTheme = useCallback((_newTheme: ThemeMode) => {
    applyDarkThemeToDOM();
  }, []);

  const toggleTheme = useCallback(() => {
    applyDarkThemeToDOM();
  }, []);

  const value = useMemo<ThemeContextType>(
    () => ({
      theme: "dark",
      resolvedTheme: "dark",
      systemTheme: "dark",
      isSystem: false,
      setTheme,
      toggleTheme,
    }),
    [setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
