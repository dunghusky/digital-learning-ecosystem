import { Skeleton } from "@/components/ui/skeleton";

const PLACEHOLDER_CARDS = 6;

/** Mirrors the layout of the archive page so nothing jumps when the real content arrives. */
export default function ArchiveLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12" aria-busy>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-2 h-5 w-96 max-w-full" />
      <Skeleton className="mt-8 h-11 w-full max-w-xl rounded-full" />
      <div className="mt-5 flex flex-wrap gap-2">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-24 rounded-full" />
        ))}
      </div>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: PLACEHOLDER_CARDS }, (_, index) => (
          <li key={index} className="rounded-card border border-line bg-surface p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-6 w-48" />
            <Skeleton className="mt-3 h-14 w-full" />
          </li>
        ))}
      </ul>
    </main>
  );
}
