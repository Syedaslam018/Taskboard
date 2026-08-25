interface Props {
  name: string;
  /** Optional avatar image URL. Falls back to initials when absent or on load error is not handled (kept simple). */
  src?: string | null;
  /** Pixel diameter. Defaults to 32. */
  size?: number;
  className?: string;
}

// Palette of tailwind bg/text pairs; picked deterministically from the name so
// a given person always gets the same color across the app.
const COLORS = [
  "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function Avatar({ name, src, size = 32, className }: Props) {
  const dimension = { width: size, height: size };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={dimension}
        className={`shrink-0 rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10 ${className ?? ""}`}
      />
    );
  }

  return (
    <span
      style={{ ...dimension, fontSize: Math.round(size * 0.4) }}
      title={name}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold ${colorFor(
        name
      )} ${className ?? ""}`}
    >
      {initials(name)}
    </span>
  );
}
