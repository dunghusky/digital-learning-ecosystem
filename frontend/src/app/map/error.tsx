"use client";

import { RouteError } from "@/components/route-error";

export default function MapError({ reset }: { error: Error; reset: () => void }) {
  return <RouteError reset={reset} />;
}
