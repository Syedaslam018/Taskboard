interface Props {
  /** Pixel size for width & height. Defaults to 20. */
  size?: number;
  className?: string;
}

// Indeterminate loading spinner. Inherits the current text color via
// currentColor, so it adapts to light/dark automatically.
export default function Spinner({ size = 20, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin ${className ?? ""}`}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        className="opacity-90"
      />
    </svg>
  );
}
