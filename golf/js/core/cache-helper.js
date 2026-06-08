// v2/js/core/cache-helper.js
// 간단한 inmemory cache for query results
// TTL 짧게 (10초) — mutate 후 자연 갱신, 강제 invalidate 불필요
// 페이지 전환 시 cache hit으로 즉시 표시

const _cache = new Map();

export async function cached(key, ttlMs, fetcher) {
  const entry = _cache.get(key);
  if (entry && (Date.now() - entry.t) < ttlMs) {
    return entry.v;
  }
  const v = await fetcher();
  _cache.set(key, { v, t: Date.now() });
  return v;
}

export function invalidate(keyPrefix) {
  if (!keyPrefix) { _cache.clear(); return; }
  for (const k of _cache.keys()) {
    if (k.startsWith(keyPrefix)) _cache.delete(k);
  }
}

export function cacheStats() {
  return { size: _cache.size, keys: [..._cache.keys()] };
}
