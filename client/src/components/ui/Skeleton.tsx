interface Props {
  className?: string;
}

// Thin wrapper over the .tb-skeleton component class (animate-pulse + themed
// background). Use with width/height utilities via className, e.g.
// <Skeleton className="h-4 w-32" />.
export default function Skeleton({ className }: Props) {
  return <div className={`tb-skeleton ${className ?? ""}`} aria-hidden="true" />;
}
