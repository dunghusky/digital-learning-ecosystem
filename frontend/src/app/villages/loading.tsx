import { Skeleton } from "@/components/ui/skeleton";

const PLACEHOLDER_CARDS = 6;

/** Mirrors the layout of the villages page so nothing jumps when the real content arrives. */
export default function VillagesLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12" aria-busy>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-2 h-5 w-96 max-w-full" />
      <div className="mt-6 flex flex-wrap gap-2">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: PLACEHOLDER_CARDS }, (_, index) => (
          <li key={index} className="overflow-hidden rounded-card border border-line bg-surface">
            <Skeleton className="h-20 w-full rounded-none" />
            <div className="p-5">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="mt-3 h-10 w-full" />
              <Skeleton className="mt-5 h-4 w-32" />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
