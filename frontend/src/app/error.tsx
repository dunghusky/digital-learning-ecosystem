"use client";

import { RouteError } from "@/components/route-error";

export default function HomeError({ reset }: { reset: () => void }) {
  return <RouteError reset={reset} />;
}
