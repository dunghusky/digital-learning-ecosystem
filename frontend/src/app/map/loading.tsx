import { Skeleton } from "@/components/ui/skeleton";

export default function MapLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6" aria-busy>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-2 h-5 w-96 max-w-full" />
      <Skeleton className="mt-6 h-[calc(100dvh-16rem)] min-h-[420px] w-full rounded-xl" />
    </main>
  );
}
