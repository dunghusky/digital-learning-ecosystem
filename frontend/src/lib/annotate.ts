import type { GlossaryTerm } from "@/lib/api/documents";

export type Segment = string | { text: string; term: GlossaryTerm };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Splits one line of text into plain strings and glossary hits. Only the first occurrence of
 * each term in the whole document is marked (pass the same `seen` set for every line), so a
 * word repeated in every verse is not underlined over and over. Longer terms win over the
 * shorter terms they contain ("chằm nón" before "nón").
 */
export function annotate(line: string, glossary: GlossaryTerm[], seen: Set<string>): Segment[] {
  const pending = glossary.filter((entry) => !seen.has(entry.term.toLowerCase()));
  if (pending.length === 0) {
    return [line];
  }
  const byLength = [...pending].sort((a, b) => b.term.length - a.term.length);
  // Letters on either side would mean the term is only part of a longer word.
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{M}])(${byLength.map((entry) => escapeRegExp(entry.term)).join("|")})(?![\\p{L}\\p{M}])`,
    "giu",
  );
  const lookup = new Map(pending.map((entry) => [entry.term.toLowerCase(), entry]));

  const segments: Segment[] = [];
  let cursor = 0;
  for (const match of line.matchAll(pattern)) {
    const key = match[0].toLowerCase();
    const entry = lookup.get(key);
    if (!entry || seen.has(key)) {
      continue;
    }
    seen.add(key);
    if (match.index > cursor) {
      segments.push(line.slice(cursor, match.index));
    }
    segments.push({ text: match[0], term: entry });
    cursor = match.index + match[0].length;
  }
  if (cursor < line.length) {
    segments.push(line.slice(cursor));
  }
  return segments;
}
