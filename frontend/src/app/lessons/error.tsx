"use client";

import { RouteError } from "@/components/route-error";

export default function LessonsError({ reset }: { error: Error; reset: () => void }) {
  return <RouteError reset={reset} />;
}
