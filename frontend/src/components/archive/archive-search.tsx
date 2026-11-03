"use client";

import { LoaderCircle, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";

import type { VillageRef } from "@/lib/api/documents";

const DEBOUNCE_MS = 350;

interface ArchiveSearchProps {
  villages: Pick<VillageRef, "code" | "name">[];
}

/**
 * Search box and village picker that update the URL as the reader types, so results follow
 * without a submit button. It is still a GET form: without JavaScript, Enter submits it.
 * The URL stays the single source of truth; the input only buffers keystrokes.
 */
export function ArchiveSearch({ villages }: ArchiveSearchProps) {
  const t = useTranslations("archive");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const urlSearch = searchParams.get("search") ?? "";
  const [text, setText] = useState(urlSearch);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Follow the URL when it changes from outside (back button, "clear filters" link).
  const [lastUrlSearch, setLastUrlSearch] = useState(urlSearch);
  if (urlSearch !== lastUrlSearch) {
    setLastUrlSearch(urlSearch);
    setText(urlSearch);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  function navigate(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page"); // the old page may not exist in the new result set
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  function onType(value: string) {
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => navigate("search", value.trim()), DEBOUNCE_MS);
  }

  return (
    <form
      method="get"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        clearTimeout(timer.current);
        navigate("search", text.trim());
      }}
      className="flex flex-col gap-2 sm:flex-row"
    >
      {/* Keep the active chips when the form is submitted without JavaScript. */}
      {["genre", "grade_level"].map((key) => {
        const value = searchParams.get(key);
        return value ? <input key={key} type="hidden" name={key} value={value} /> : null;
      })}

      <label className="relative flex-1 rounded-full border border-line bg-surface shadow-card focus-within:border-primary/60 sm:max-w-xl">
        <span className="sr-only">{t("search")}</span>
        {isPending ? (
          <LoaderCircle
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 animate-spin text-primary"
            aria-hidden
          />
        ) : (
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-muted"
            aria-hidden
          />
        )}
        <input
          type="search"
          name="search"
          value={text}
          onChange={(event) => onType(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="min-h-11 w-full rounded-full bg-transparent py-2 pr-4 pl-10 text-sm text-ink placeholder:text-ink-muted/80 focus:outline-none"
        />
      </label>

      <label className="sm:w-64">
        <span className="sr-only">{t("village")}</span>
        <select
          name="village"
          value={searchParams.get("village") ?? ""}
          onChange={(event) => navigate("village", event.target.value)}
          className="min-h-11 w-full rounded-full border border-line bg-surface px-4 text-sm text-ink shadow-card focus:border-primary/60 focus:outline-none"
        >
          <option value="">{t("allVillages")}</option>
          {villages.map((village) => (
            <option key={village.code} value={village.code}>
              {village.name}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
