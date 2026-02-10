/**
 * Parses a leading number from a string (e.g. "01. Intro", "02. How the web works.mp4" -> 1, 2).
 * Returns Infinity if no leading digits, so such items sort last.
 */
function parseLeadingNumber(title: string): number {
  const m = title.trim().match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : Infinity;
}

/**
 * Sorts an array by the numbers in item titles (client-side), then by order, then by title.
 * Use for subsection videos so "01. ...", "02. ..." appear in numeric order.
 */
export function sortByTitleNumber<T extends { title: string; order?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const na = parseLeadingNumber(a.title);
    const nb = parseLeadingNumber(b.title);
    if (na !== nb) return na - nb;
    if (a.order != null && b.order != null) return a.order - b.order;
    return a.title.localeCompare(b.title, undefined, { numeric: true });
  });
}
