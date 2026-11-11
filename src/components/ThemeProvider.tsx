import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * Light/dark theme for the whole platform.
 *
 * The two palettes live in `index.css` (`:root` = daylight, `.dark` = black).
 * This provider only decides which class is on <html>, so every `dark:` utility
 * written across the app resolves against the palette that is actually active.
 *
 * Resolution order:
 *   1. the visitor's own choice, persisted in localStorage;
 *   2. otherwise the default theme the administrator set in Appearance
 *      (`setDefaultTheme`, never persisted — so changing the default later
 *      still reaches visitors who never picked one);
 *   3. otherwise the device preference.
 */

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "cloudie-theme";

type ThemeContextValue = {
  /** What the visitor (or the platform default) asked for. */
  theme: Theme;
  /** What is actually painted: "light" or "dark". */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  /** Brand default, used only while the visitor has not chosen a theme. */
  setDefaultTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  resolvedTheme: "light",
  setTheme: () => undefined,
  toggleTheme: () => undefined,
  setDefaultTheme: () => undefined,
});

export function useTheme() {
  return useContext(ThemeContext);
}

function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" || stored === "system"
      ? stored
      : null;
  } catch {
    // Storage blocked (private browsing) — fall through to the default.
    return null;
  }
}

function deviceTheme(): ResolvedTheme {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [choice, setChoice] = useState<Theme | null>(() => readStoredTheme());
  // Matches the shipped default in `platformConfig` and the pre-paint script in
  // index.html, so nothing flips while the brand config is still loading.
  const [fallback, setFallback] = useState<Theme>("light");
  const [device, setDevice] = useState<ResolvedTheme>(deviceTheme);

  // Follow the OS while the visitor is on "system".
  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) =>
      setDevice(event.matches ? "dark" : "light");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const theme: Theme = choice ?? fallback;
  const resolvedTheme: ResolvedTheme = theme === "system" ? device : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.classList.toggle("light", resolvedTheme === "light");
    root.style.colorScheme = resolvedTheme;

    // Browser chrome should frame the page, so it takes the background token
    // rather than the accent — an emerald status bar around black content reads
    // as a rendering glitch.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const background = getComputedStyle(root)
        .getPropertyValue("--background")
        .trim();
      if (background) meta.setAttribute("content", background);
    }
  }, [resolvedTheme]);

  const setTheme = useCallback((next: Theme) => {
    setChoice(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage blocked — the choice still holds for this session.
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  const setDefaultTheme = useCallback((next: Theme) => {
    setFallback(next);
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme, setDefaultTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme, setDefaultTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
