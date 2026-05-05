import { describe, it, expect } from 'vitest';
import type { Card, GameState, PlayerIndex } from '../../../shared/types';
import { applyMove, canCaptureSingle, findCombinationsForValue } from './rules';

const c = (id: string, suit: Card['suit'], rank: Card['rank'], value: number): Card => ({
  id,
  suit,
  rank,
  value,
});

const baseState = (overrides: Partial<GameState> = {}): GameState => ({
  tableCards: [],
  hands: [[], [], [], []],
  capturesByTeam: [[], []],
  scoresByTeam: [0, 0],
  currentPlayerIndex: 0,
  roundNumber: 1,
  chkobbaByTeam: [0, 0],
  ...overrides,
});

describe('canCaptureSingle', () => {
  it('returns the matching card by value', () => {
    const played = c('p', 'hearts', '5', 5);
    const table = [c('t1', 'spades', '3', 3), c('t2', 'clubs', '5', 5)];
    expect(canCaptureSingle(played, table)?.id).toBe('t2');
  });

  it('returns null when no card matches', () => {
    const played = c('p', 'hearts', '5', 5);
    const table = [c('t1', 'spades', '3', 3)];
    expect(canCaptureSingle(played, table)).toBeNull();
  });
});

describe('findCombinationsForValue', () => {
  it('finds simple sums', () => {
    const table = [
      c('a', 'spades', '2', 2),
      c('b', 'hearts', '3', 3),
      c('c', 'clubs', '5', 5),
    ];
    const combos = findCombinationsForValue(table, 5);
    // expected: [5], [2+3]
    expect(combos).toHaveLength(2);
    const sums = combos.map((co) => co.reduce((s, x) => s + x.value, 0));
    expect(sums.every((s) => s === 5)).toBe(true);
  });

  it('returns empty when no combination sums to target', () => {
    const table = [c('a', 'spades', '2', 2), c('b', 'hearts', '3', 3)];
    expect(findCombinationsForValue(table, 9)).toEqual([]);
  });
});

describe('applyMove', () => {
  it('captures a single matching card (single match priority)', () => {
    const played = c('p', 'hearts', '5', 5);
    const state = baseState({
      tableCards: [
        c('t1', 'spades', '2', 2),
        c('t2', 'clubs', '3', 3), // 2+3=5 combo exists but single 5 must win
        c('t3', 'diamonds', '5', 5),
      ],
      hands: [[played], [], [], []],
    });
    const r = applyMove(state, 0, 'p');
    expect(r.captured.map((x) => x.id)).toEqual(['t3', 'p']);
    expect(r.newTable.map((x) => x.id).sort()).toEqual(['t1', 't2']);
    expect(r.chkobba).toBe(false);
  });

  it('captures a combination when no single match exists', () => {
    const played = c('p', 'hearts', '5', 5);
    const state = baseState({
      tableCards: [c('t1', 'spades', '2', 2), c('t2', 'clubs', '3', 3)],
      hands: [[played], [], [], []],
    });
    const r = applyMove(state, 0, 'p', ['t1', 't2']);
    expect(r.captured.map((x) => x.id).sort()).toEqual(['p', 't1', 't2']);
    expect(r.newTable).toEqual([]);
    expect(r.chkobba).toBe(true);
  });

  it('places card on empty/no-match table when no capture possible', () => {
    const played = c('p', 'hearts', '5', 5);
    const state = baseState({
      tableCards: [c('t1', 'spades', '2', 2)],
      hands: [[played], [], [], []],
    });
    const r = applyMove(state, 0, 'p');
    expect(r.captured).toEqual([]);
    expect(r.newTable.map((x) => x.id).sort()).toEqual(['p', 't1']);
    expect(r.chkobba).toBe(false);
  });

  it('throws when played card is not in hand', () => {
    const state = baseState({ hands: [[], [], [], []] });
    expect(() => applyMove(state, 0, 'missing')).toThrow(/not in hand/i);
  });

  it('throws when combo sum does not match played value', () => {
    const played = c('p', 'hearts', '6', 6);
    const state = baseState({
      tableCards: [c('t1', 'spades', '2', 2), c('t2', 'clubs', '3', 3)],
      hands: [[played], [], [], []],
    });
    expect(() => applyMove(state, 0, 'p', ['t1', 't2'])).toThrow(/sum/i);
  });

  it('throws when combo references a card not on the table', () => {
    const played = c('p', 'hearts', '5', 5);
    const state = baseState({
      tableCards: [c('t1', 'spades', '2', 2), c('t2', 'clubs', '3', 3)],
      hands: [[played], [], [], []],
    });
    expect(() => applyMove(state, 0, 'p', ['t1', 'nonexistent'])).toThrow(/Invalid combination id/i);
  });

  it('flags chkobba when capture clears the table', () => {
    const played = c('p', 'hearts', '5', 5);
    const state = baseState({
      tableCards: [c('t1', 'spades', '5', 5)],
      hands: [[played], [], [], []],
    });
    const r = applyMove(state, 0, 'p');
    expect(r.chkobba).toBe(true);
    expect(r.newTable).toEqual([]);
  });

  it('does not flag chkobba on a no-capture placement', () => {
    const played = c('p', 'hearts', '5', 5);
    const state = baseState({
      tableCards: [],
      hands: [[played], [], [], []],
    });
    const r = applyMove(state, 0, 'p');
    expect(r.captured).toEqual([]);
    expect(r.chkobba).toBe(false);
  });

  it('advances to next player using default order', () => {
    const played = c('p', 'hearts', '5', 5);
    const state = baseState({ hands: [[played], [], [], []] });
    const r = applyMove(state, 0, 'p');
    expect(r.nextPlayer).toBe(1);
  });

  it('advances using custom turn order (2-player)', () => {
    const played = c('p', 'hearts', '5', 5);
    const state = baseState({ hands: [[played], [], [], []] });
    const order: readonly PlayerIndex[] = [0, 2];
    const r = applyMove(state, 0, 'p', undefined, order);
    expect(r.nextPlayer).toBe(2);
  });

  it('updates lastCaptureTeam to capturing seat team', () => {
    const played = c('p', 'hearts', '5', 5);
    const state = baseState({
      tableCards: [c('t1', 'spades', '5', 5)],
      hands: [[], [played], [], []],
    });
    const r = applyMove(state, 1, 'p');
    expect(r.lastCaptureTeam).toBe(1);
  });

  it('preserves lastCaptureTeam on no-capture placement', () => {
    const played = c('p', 'hearts', '5', 5);
    const state = baseState({
      tableCards: [c('t1', 'spades', '2', 2)],
      hands: [[played], [], [], []],
      lastCaptureTeam: 1,
    });
    const r = applyMove(state, 0, 'p');
    expect(r.lastCaptureTeam).toBe(1);
  });
});
