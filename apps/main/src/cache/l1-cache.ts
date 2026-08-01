/**
 * L1Cache — in-process LRU cache with byte-budget eviction.
 *
 * Blueprint §25 / directive Rule 26: L1 is sub-millisecond, per-pod,
 * with bounded entry count and approximate byte ceiling. We use a
 * doubly-linked list + Map for O(1) get/set/delete (classic LRU layout).
 * The byte ceiling is enforced on value serialization size, not physical
 * memory, which keeps the implementation dependency-free.
 */

interface Entry<V> {
  key: string;
  value: V;
  expiresAt: number; // epoch ms
  byteSize: number; // approximate serialized size
  prev: Entry<V> | null;
  next: Entry<V> | null;
}

export interface L1CacheOptions {
  maxEntries: number;
  /** Approximate max byte budget for all stored values (default 50 MB) */
  maxBytes?: number;
}

export class L1Cache<V = unknown> {
  private readonly maxEntries: number;
  private readonly maxBytes: number;
  private readonly map = new Map<string, Entry<V>>();
  private totalBytes = 0;
  // Doubly-linked list: head is the oldest (LRU), tail is the newest (MRU).
  private head: Entry<V> | null = null;
  private tail: Entry<V> | null = null;

  constructor(options: L1CacheOptions) {
    this.maxEntries = options.maxEntries;
    this.maxBytes = options.maxBytes ?? 50 * 1024 * 1024; // 50 MB default
  }

  get(key: string): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() >= entry.expiresAt) {
      this._remove(entry);
      return undefined;
    }
    // Move to tail (most-recently-used)
    this._moveToTail(entry);
    return entry.value;
  }

  set(key: string, value: V, ttlMs: number): void {
    // If an entry already exists for this key, remove it first.
    const existing = this.map.get(key);
    if (existing) this._remove(existing);

    const byteSize = this._estimateBytes(value);
    const entry: Entry<V> = {
      key,
      value,
      expiresAt: Date.now() + ttlMs,
      byteSize,
      prev: null,
      next: null,
    };

    this.map.set(key, entry);
    this._appendToTail(entry);
    this.totalBytes += byteSize;

    // Evict oldest entries until within bounds.
    while (
      this.head !== null &&
      (this.map.size > this.maxEntries || this.totalBytes > this.maxBytes)
    ) {
      this._remove(this.head);
    }
  }

  delete(key: string): void {
    const entry = this.map.get(key);
    if (entry) this._remove(entry);
  }

  has(key: string): boolean {
    const entry = this.map.get(key);
    if (!entry) return false;
    if (Date.now() >= entry.expiresAt) {
      this._remove(entry);
      return false;
    }
    return true;
  }

  clear(): void {
    this.map.clear();
    this.head = null;
    this.tail = null;
    this.totalBytes = 0;
  }

  size(): number {
    return this.map.size;
  }

  remainingTtlMs(key: string): number {
    const entry = this.map.get(key);
    if (!entry) return 0;
    const remaining = entry.expiresAt - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  // ── Private helpers ────────────────────────────────────────────────

  private _remove(entry: Entry<V>): void {
    if (entry.prev) entry.prev.next = entry.next;
    else this.head = entry.next;

    if (entry.next) entry.next.prev = entry.prev;
    else this.tail = entry.prev;

    entry.prev = null;
    entry.next = null;
    this.totalBytes -= entry.byteSize;
    this.map.delete(entry.key);
  }

  private _appendToTail(entry: Entry<V>): void {
    entry.prev = this.tail;
    entry.next = null;
    if (this.tail) this.tail.next = entry;
    else this.head = entry;
    this.tail = entry;
  }

  private _moveToTail(entry: Entry<V>): void {
    if (entry === this.tail) return;
    // Detach
    if (entry.prev) entry.prev.next = entry.next;
    else this.head = entry.next;
    if (entry.next) entry.next.prev = entry.prev;

    // Append to tail
    entry.prev = this.tail;
    entry.next = null;
    if (this.tail) this.tail.next = entry;
    this.tail = entry;
  }

  private _estimateBytes(value: V): number {
    try {
      return JSON.stringify(value)?.length ?? 0;
    } catch {
      return 256; // fallback for non-serializable values
    }
  }
}
