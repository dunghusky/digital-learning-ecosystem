"use client";

import { RouteError } from "@/components/route-error";

export default function QuizzesError({ reset }: { error: Error; reset: () => void }) {
  return <RouteError reset={reset} />;
}
