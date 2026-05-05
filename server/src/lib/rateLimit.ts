type Entry = { count: number; resetAt: number };

export class RateLimiter {
  private map = new Map<string, Entry>();
  private interval: NodeJS.Timeout;

  constructor(pruneIntervalMs = 60_000) {
    this.interval = setInterval(() => this.prune(), pruneIntervalMs);
    if (typeof this.interval.unref === 'function') this.interval.unref();
  }

  /** Returns true if the call is allowed under the current window. */
  allow(key: string, windowMs: number, maxHits: number): boolean {
    const now = Date.now();
    const entry = this.map.get(key);
    if (!entry || now > entry.resetAt) {
      this.map.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    entry.count += 1;
    return entry.count <= maxHits;
  }

  prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.map) {
      if (now > entry.resetAt) this.map.delete(key);
    }
  }

  dispose(): void {
    clearInterval(this.interval);
    this.map.clear();
  }
}
