export const pct = (inTune: number, total: number) => (total ? Math.round((inTune / total) * 100) : 0);

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' });

/** Consecutive practice days ending today (or yesterday, so an unfinished day does not break a streak). Dates are UTC days. */
export function streakDays(isoDates: string[], now = new Date()): number {
  const days = new Set(isoDates.map((d) => d.slice(0, 10)));
  const key = (d: Date) => d.toISOString().slice(0, 10);
  const cur = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (!days.has(key(cur))) cur.setUTCDate(cur.getUTCDate() - 1);
  let n = 0;
  while (days.has(key(cur))) { n++; cur.setUTCDate(cur.getUTCDate() - 1); }
  return n;
}
