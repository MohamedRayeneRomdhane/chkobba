import { describe, it, expect } from 'vitest';
import { seatIndices, seatPositionFor, teamForSeat } from './geometry';

describe('seatIndices', () => {
  it('rotates 4-player layout so my seat is bottom', () => {
    const layout = seatIndices(2, 4);
    expect(layout.bottom).toBe(2);
    expect(layout.right).toBe(3);
    expect(layout.top).toBe(0);
    expect(layout.left).toBe(1);
  });

  it('handles 2-player layout (everyone else is the only opponent)', () => {
    const layout = seatIndices(0, 2);
    expect(layout.bottom).toBe(0);
    expect(layout.top).toBe(1);
    expect(layout.left).toBe(1);
    expect(layout.right).toBe(1);
  });

  it('defaults to seat 0 when mySeat is null', () => {
    const layout = seatIndices(null, 4);
    expect(layout.bottom).toBe(0);
    expect(layout.top).toBe(2);
  });
});

describe('seatPositionFor', () => {
  it('classifies seats correctly relative to local player', () => {
    expect(seatPositionFor(1, 1, 4)).toBe('bottom');
    expect(seatPositionFor(1, 3, 4)).toBe('top'); // (1+2)%4
    expect(seatPositionFor(1, 0, 4)).toBe('left'); // (1+3)%4
    expect(seatPositionFor(1, 2, 4)).toBe('right'); // (1+1)%4
  });
});

describe('teamForSeat', () => {
  it('alternates teams 0,1,0,1', () => {
    expect(teamForSeat(0)).toBe(0);
    expect(teamForSeat(1)).toBe(1);
    expect(teamForSeat(2)).toBe(0);
    expect(teamForSeat(3)).toBe(1);
  });
});
