/** LRU cache with per-entry TTL. Built on the native Map rather than a
 * hand-written doubly-linked-list + hashmap: Map already preserves insertion
 * order and gives O(1) get/set/delete/has, which is the same guarantee a
 * textbook LRU's DLL+hashmap gives — re-inserting a key on access (delete
 * then set) is what bumps it to "most recent" using that existing ordering. */
export class LRUCache<V> {
  private readonly store = new Map<string, { value: V; expiresAt: number }>();
  private readonly maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: string): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    this.store.delete(key);
    this.store.set(key, entry); // re-insert: Map iteration/eviction order now treats this as most-recent
    return entry.value;
  }

  set(key: string, value: V, ttlMs: number = 60_000): void {
    this.store.delete(key);
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    while (this.store.size > this.maxSize) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey === undefined) break;
      this.store.delete(oldestKey);
    }
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

export function demo(): void {
  const cache = new LRUCache<number>(2);
  cache.set("a", 1);
  cache.set("b", 2);
  cache.get("a"); // bump "a" to most-recent; "b" is now the eviction candidate
  cache.set("c", 3); // should evict "b", not "a"
  if (cache.has("b")) throw new Error("LRUCache did not evict the least-recently-used entry");
  if (!cache.has("a")) throw new Error("LRUCache evicted a recently-accessed entry");

  const ttlCache = new LRUCache<number>(10);
  ttlCache.set("expiring", 1, -1); // already expired
  if (ttlCache.has("expiring")) throw new Error("LRUCache did not honor a negative/expired TTL");
}
