import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './index';
import type { GameState, RoomSnapshot } from '../types';

const FRESH = useGameStore.getState();

beforeEach(() => {
  useGameStore.setState({
    ...FRESH,
    mutedSoundboardSeats: new Set<number>(),
    seatBars: {},
  });
});

describe('roomSlice', () => {
  it('setRoomCode transitions phase idle -> lobby', () => {
    expect(useGameStore.getState().phase).toBe('idle');
    useGameStore.getState().setRoomCode('ABCD');
    expect(useGameStore.getState().phase).toBe('lobby');
    expect(useGameStore.getState().roomCode).toBe('ABCD');
  });

  it('setSnapshot derives mySeat from socket id', () => {
    const snap = {
      code: 'ABCD',
      players: ['s1', 's2'],
      seats: ['s1', 's2', null, null],
      teams: [
        [0, 2],
        [1, 3],
      ],
      profiles: {},
    } as unknown as RoomSnapshot;
    useGameStore.getState().setSnapshot(snap, 's2');
    expect(useGameStore.getState().mySeat).toBe(1);
  });
});

describe('gameSlice phase machine', () => {
  it('setGameState lifts phase to playing', () => {
    useGameStore.getState().setRoomCode('ABCD');
    expect(useGameStore.getState().phase).toBe('lobby');
    useGameStore.getState().setGameState({} as GameState);
    expect(useGameStore.getState().phase).toBe('playing');
  });

  it('setLastRound flips phase to roundEnd', () => {
    useGameStore.getState().setGameState({} as GameState);
    useGameStore.getState().setLastRound({ scores: [10, 5], details: undefined });
    expect(useGameStore.getState().phase).toBe('roundEnd');
  });
});

describe('uiSlice', () => {
  it('toggleTableCard adds and removes ids', () => {
    const { toggleTableCard } = useGameStore.getState();
    toggleTableCard('a');
    toggleTableCard('b');
    expect(useGameStore.getState().selectedTableIds).toEqual(['a', 'b']);
    toggleTableCard('a');
    expect(useGameStore.getState().selectedTableIds).toEqual(['b']);
  });

  it('selectHandCard toggles same id off', () => {
    const { selectHandCard } = useGameStore.getState();
    selectHandCard('x');
    expect(useGameStore.getState().selectedHandId).toBe('x');
    selectHandCard('x');
    expect(useGameStore.getState().selectedHandId).toBe(null);
  });
});

describe('audioSlice', () => {
  it('toggleMutedSeat is reversible', () => {
    const { toggleMutedSeat } = useGameStore.getState();
    toggleMutedSeat(2);
    expect(useGameStore.getState().mutedSoundboardSeats.has(2)).toBe(true);
    toggleMutedSeat(2);
    expect(useGameStore.getState().mutedSoundboardSeats.has(2)).toBe(false);
  });
});

describe('phase transitions (regression)', () => {
  it('setLastRound(null) returns phase to playing', () => {
    useGameStore.getState().setGameState({} as GameState);
    useGameStore.getState().setLastRound({ scores: [10, 5], details: undefined });
    expect(useGameStore.getState().phase).toBe('roundEnd');
    useGameStore.getState().setLastRound(null);
    expect(useGameStore.getState().phase).toBe('playing');
  });

  it('setGameState(null) drops phase from playing to lobby', () => {
    useGameStore.getState().setRoomCode('ABCD');
    useGameStore.getState().setGameState({} as GameState);
    expect(useGameStore.getState().phase).toBe('playing');
    useGameStore.getState().setGameState(null);
    expect(useGameStore.getState().phase).toBe('lobby');
  });

  it('resetRoom clears all room+game state', () => {
    useGameStore.getState().setRoomCode('ABCD');
    useGameStore.getState().setGameState({} as GameState);
    useGameStore.getState().setLastRound({ scores: [1, 2], details: undefined });
    useGameStore.getState().setRoundBanner('hello');
    useGameStore.getState().setReplayWaiting({ count: 1, total: 2 });

    useGameStore.getState().resetRoom();

    const s = useGameStore.getState();
    expect(s.phase).toBe('idle');
    expect(s.roomCode).toBeNull();
    expect(s.gameState).toBeNull();
    expect(s.lastRound).toBeNull();
    expect(s.replayWaiting).toBeNull();
    expect(s.roundBanner).toBeNull();
    expect(s.snapshot).toBeNull();
    expect(s.mySeat).toBeNull();
  });

  it('bumpDealTick increments monotonically', () => {
    const initial = useGameStore.getState().dealTick;
    useGameStore.getState().bumpDealTick();
    useGameStore.getState().bumpDealTick();
    expect(useGameStore.getState().dealTick).toBe(initial + 2);
  });
});
