import { create } from "zustand";

export type Theme = "light" | "dark";

// Keep this key in sync with the pre-paint script in index.html, which reads
// the same value to set the initial `.dark` class before React mounts (avoids
// a flash of the wrong theme).
const STORAGE_KEY = "taskboard-theme";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* localStorage unavailable (private mode) - fall through to system pref */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Reflects the theme onto <html> and persists it. */
function applyTheme(theme: Theme) {
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore persistence failures (private mode) */
  }
}

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitialTheme(),
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),
}));

// Called once from main.tsx (mirrors initSocketSync). The inline script in
// index.html has already set the class to avoid FOUC; this reconciles the
// store with that value and keeps them in lockstep for the rest of the session.
export function initTheme() {
  applyTheme(useThemeStore.getState().theme);
}
