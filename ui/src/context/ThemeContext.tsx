import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { type ColorThemeId, DEFAULT_COLOR_THEME } from "../lib/colorThemes";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  colorTheme: ColorThemeId;
  setColorTheme: (id: ColorThemeId) => void;
}

const THEME_STORAGE_KEY = "paperclip.theme";
const COLOR_THEME_STORAGE_KEY = "grace.colorTheme";
const DARK_THEME_COLOR = "#18181b";
const LIGHT_THEME_COLOR = "#ffffff";
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function resolveThemeFromDocument(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function resolveColorThemeFromStorage(): ColorThemeId {
  try {
    const stored = localStorage.getItem(COLOR_THEME_STORAGE_KEY);
    if (stored) return stored as ColorThemeId;
  } catch {
    // ignore
  }
  return DEFAULT_COLOR_THEME;
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const isDark = theme === "dark";
  const root = document.documentElement;
  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta instanceof HTMLMetaElement) {
    themeColorMeta.setAttribute("content", isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
  }
}

function applyColorTheme(id: ColorThemeId) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-color-theme", id);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => resolveThemeFromDocument());
  const [colorTheme, setColorThemeState] = useState<ColorThemeId>(() =>
    resolveColorThemeFromStorage(),
  );

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  const setColorTheme = useCallback((id: ColorThemeId) => {
    setColorThemeState(id);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore local storage write failures in restricted environments.
    }
  }, [theme]);

  useEffect(() => {
    applyColorTheme(colorTheme);
    try {
      localStorage.setItem(COLOR_THEME_STORAGE_KEY, colorTheme);
    } catch {
      // ignore
    }
  }, [colorTheme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      colorTheme,
      setColorTheme,
    }),
    [theme, setTheme, toggleTheme, colorTheme, setColorTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
