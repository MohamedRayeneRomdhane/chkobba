import { describe, it, expect } from 'vitest';
import type { Card } from '../../../shared/types';
import { computeRoundScore } from './scoring';

const c = (id: string, suit: Card['suit'], rank: Card['rank'], value = 1): Card => ({
  id,
  suit,
  rank,
  value,
});

describe('computeRoundScore', () => {
  it('awards most-cards point to the team with more captures', () => {
    const t0 = [c('a', 'spades', 'A'), c('b', 'spades', '2')];
    const t1 = [c('c', 'hearts', 'A')];
    const r = computeRoundScore([t0, t1], [0, 0]);
    expect(r.details.mostCards).toBe(0);
    expect(r.teamPoints[0]).toBeGreaterThan(r.teamPoints[1]);
  });

  it('grants seven-of-diamonds point regardless of card count', () => {
    const t0 = [c('a', 'diamonds', '7')];
    const t1 = [c('b', 'spades', 'A'), c('c', 'spades', '2'), c('d', 'spades', '3')];
    const r = computeRoundScore([t0, t1], [0, 0]);
    expect(r.details.sevenDiamonds).toBe(0);
  });

  it('counts chkobba bonuses', () => {
    const r = computeRoundScore([[], []], [2, 1]);
    expect(r.teamPoints).toEqual([2, 1]);
    expect(r.details.chkobba).toEqual([2, 1]);
  });

  it('breaks 7s tie via 6s count', () => {
    const t0 = [c('a', 'spades', '7'), c('b', 'spades', '6')];
    const t1 = [c('c', 'hearts', '7')];
    const r = computeRoundScore([t0, t1], [0, 0]);
    expect(r.details.mostSevens).toBe(0);
  });
});
