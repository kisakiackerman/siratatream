import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from "react";

export type ThemeMode = "system" | "dark" | "light";
export type ResolvedTheme = "dark" | "light";

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
  isSystem: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = "nexstream_theme_preference";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Always enforced in Dark Mode per user instruction
  const [theme, setThemeState] = useState<ThemeMode>("dark");
  const systemTheme: ResolvedTheme = "dark";
  const resolvedTheme: ResolvedTheme = "dark";

  // Enforce dark mode on HTML root and body
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const body = document.body;

    root.classList.remove("light");
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
    root.style.colorScheme = "dark";

    body.classList.remove("light");
    body.classList.add("dark");
    body.setAttribute("data-theme", "dark");

    try {
      localStorage.setItem(STORAGE_KEY, "dark");
    } catch {
      // ignore
    }
  }, []);

  const setTheme = (_newTheme: ThemeMode) => {
    // Permanent dark mode
    setThemeState("dark");
    try {
      localStorage.setItem(STORAGE_KEY, "dark");
    } catch {
      // ignore
    }
  };

  const toggleTheme = () => {
    // Kept in permanent dark mode
    setThemeState("dark");
    try {
      localStorage.setItem(STORAGE_KEY, "dark");
    } catch {
      // ignore
    }
  };

  const value = useMemo(
    () => ({
      theme: "dark" as ThemeMode,
      resolvedTheme: "dark" as ResolvedTheme,
      systemTheme: "dark" as ResolvedTheme,
      isSystem: false,
      setTheme,
      toggleTheme,
    }),
    []
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
