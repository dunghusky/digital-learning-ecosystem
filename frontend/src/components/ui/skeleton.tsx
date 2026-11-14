/** Pulsing grey block shown while content loads. Size it with `className`. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-line/70 ${className}`} aria-hidden />;
}
