import { useThemeStore } from "@/stores/themeStore";
import Icon from "./Icon";

interface Props {
  className?: string;
}

// Sun/moon toggle wired to the theme store (persists + toggles the `.dark`
// class). Shows the icon of the theme you'd switch *to*.
export default function ThemeToggle({ className }: Props) {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 ${className ?? ""}`}
    >
      <Icon name={isDark ? "sun" : "moon"} size={18} />
    </button>
  );
}
