import { Skeleton } from "@/components/ui/skeleton";

const PLACEHOLDER_CARDS = 6;

/** Mirrors the layout of the villages page so nothing jumps when the real content arrives. */
export default function VillagesLoading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10" aria-busy>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-2 h-5 w-96 max-w-full" />
      <div className="mt-6 flex flex-wrap gap-2">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: PLACEHOLDER_CARDS }, (_, index) => (
          <li key={index} className="rounded-xl border border-stone-200 bg-white p-4">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="mt-3 h-6 w-48" />
            <Skeleton className="mt-2 h-4 w-40" />
            <Skeleton className="mt-3 h-12 w-full" />
          </li>
        ))}
      </ul>
    </main>
  );
}
