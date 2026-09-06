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
      className={`tb-icon-button ${className ?? ""}`}
    >
      <Icon name={isDark ? "sun" : "moon"} size={18} />
    </button>
  );
}
