import { describe, it, expect, afterEach } from 'vitest';
import { RateLimiter } from './rateLimit';

let rl: RateLimiter | null = null;

afterEach(() => {
  rl?.dispose();
  rl = null;
});

describe('RateLimiter', () => {
  it('allows up to maxHits per window', () => {
    rl = new RateLimiter();
    expect(rl.allow('k', 60_000, 3)).toBe(true);
    expect(rl.allow('k', 60_000, 3)).toBe(true);
    expect(rl.allow('k', 60_000, 3)).toBe(true);
    expect(rl.allow('k', 60_000, 3)).toBe(false);
  });

  it('isolates keys', () => {
    rl = new RateLimiter();
    expect(rl.allow('a', 60_000, 1)).toBe(true);
    expect(rl.allow('a', 60_000, 1)).toBe(false);
    expect(rl.allow('b', 60_000, 1)).toBe(true);
  });
});
