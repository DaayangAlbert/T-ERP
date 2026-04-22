import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "preferredTheme";
const THEMES = new Set(["light", "dark"]);

function normalizeTheme(value) {
  return THEMES.has(value) ? value : "light";
}

function readStoredTheme() {
  if (typeof window === "undefined") {
    return "light";
  }

  return normalizeTheme(window.localStorage.getItem(STORAGE_KEY));
}

const ThemeContext = createContext({
  theme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    const isDark = theme === "dark";

    root.classList.toggle("dark", isDark);
    root.classList.toggle("theme-dark", isDark);
    root.classList.toggle("theme-light", !isDark);
    root.style.colorScheme = isDark ? "dark" : "light";

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, theme);
    }
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme: (nextTheme) => setThemeState(normalizeTheme(nextTheme)),
      toggleTheme: () => setThemeState((currentTheme) => (currentTheme === "dark" ? "light" : "dark")),
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
