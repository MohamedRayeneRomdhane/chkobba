import type { PlayerIndex } from '../types';

export type SeatPosition = 'bottom' | 'top' | 'left' | 'right';

export function seatPositionFor(
  mySeat: PlayerIndex | null,
  seatIndex: PlayerIndex,
  playerCount: 2 | 4
): SeatPosition {
  const idxBottom = mySeat ?? 0;
  if (playerCount === 2) {
    return seatIndex === idxBottom ? 'bottom' : 'top';
  }
  const idxTop = ((idxBottom + 2) % 4) as PlayerIndex;
  const idxLeft = ((idxBottom + 3) % 4) as PlayerIndex;
  if (seatIndex === idxBottom) return 'bottom';
  if (seatIndex === idxTop) return 'top';
  if (seatIndex === idxLeft) return 'left';
  return 'right';
}

export type SeatLayout = {
  bottom: PlayerIndex;
  right: PlayerIndex;
  top: PlayerIndex;
  left: PlayerIndex;
};

export function seatIndices(mySeat: PlayerIndex | null, playerCount: 2 | 4 = 4): SeatLayout {
  const bottom = (mySeat ?? 0) as PlayerIndex;
  if (playerCount === 2) {
    const top = (bottom === 0 ? 1 : 0) as PlayerIndex;
    return { bottom, right: top, top, left: top };
  }
  return {
    bottom,
    right: ((bottom + 1) % 4) as PlayerIndex,
    top: ((bottom + 2) % 4) as PlayerIndex,
    left: ((bottom + 3) % 4) as PlayerIndex,
  };
}

export const teamForSeat = (seat: number): 0 | 1 => (seat % 2 === 0 ? 0 : 1);

export function rectOf(selector: string): DOMRect | null {
  const el = document.querySelector(selector);
  return el ? (el as HTMLElement).getBoundingClientRect() : null;
}
