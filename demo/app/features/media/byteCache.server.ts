/*
 * In-memory cache for fetched images (preview pictures, source logos), so repeat views don't re-download from the
 * source sites. One shared request per key while it is in flight; successes kept for an hour, failures only for a
 * minute (a short upstream blip must not hide a picture for an hour); the total size is capped, oldest dropped first.
 * Nothing is written to disk.
 */
const OK_MS = 60 * 60_000;
const FAIL_MS = 60_000;
const MAX_BYTES = 50_000_000;

type Entry<T> = { at: number; value: Promise<T | null>; size: number; ok: boolean };

export function byteCache<T extends { body: Uint8Array }>() {
  const entries = new Map<string, Entry<T>>();
  let total = 0;

  function drop(key: string) {
    const e = entries.get(key);
    if (!e) return;
    total -= e.size;
    entries.delete(key);
  }

  return async function cached(key: string, load: () => Promise<T | null>): Promise<T | null> {
    const hit = entries.get(key);
    if (hit && Date.now() - hit.at < (hit.ok ? OK_MS : FAIL_MS)) {
      entries.delete(key); // re-insert: most recently used last
      entries.set(key, hit);
      return hit.value;
    }
    drop(key);
    const entry: Entry<T> = { at: Date.now(), value: load().catch(() => null), size: 0, ok: false };
    entries.set(key, entry);
    const value = await entry.value;
    if (entries.get(key) === entry) {
      entry.ok = value !== null;
      entry.size = value?.body.byteLength ?? 0;
      total += entry.size;
      while (total > MAX_BYTES && entries.size > 1) drop(entries.keys().next().value!);
    }
    return value;
  };
}
