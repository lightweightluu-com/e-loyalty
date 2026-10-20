// Fixed-Window-Limiter im Speicher. Reicht für einen einzelnen Node-Prozess (SQLite-Setup);
// bei mehreren Instanzen durch Redis o. Ä. ersetzen – Schnittstelle bleibt gleich.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    return { ok: true as const };
  }
  b.count++;
  return b.count <= limit ? { ok: true as const } : { ok: false as const, retryAfterS: Math.ceil((b.resetAt - now) / 1000) };
}
