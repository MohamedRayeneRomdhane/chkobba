import { Card, Suit, Rank } from '../../../shared/types';
import { v4 as uuidv4 } from 'uuid';

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', 'Q', 'J', 'K'];

export function rankValue(rank: Rank): number {
  if (rank === 'A') return 1;
  if (rank === 'Q') return 8;
  if (rank === 'J') return 9;
  if (rank === 'K') return 10;
  return parseInt(rank, 10);
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: uuidv4(), suit, rank, value: rankValue(rank) });
    }
  }
  return deck;
}

export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
