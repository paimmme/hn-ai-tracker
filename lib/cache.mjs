// Simple in-memory TTL cache for serverless warm instances
// (best-effort; cold starts start empty — still protects against burst scrape)

const store = new Map();

/**
 * @param {string} key
 * @param {number} ttlMs
 * @param {() => Promise<any>} loader
 */
export async function cached(key, ttlMs, loader) {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.value;
  }

  const value = await loader();
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

export function cacheInvalidate(key) {
  if (key) store.delete(key);
  else store.clear();
}
