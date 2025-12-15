import type { Card } from '../types';

function rankKey(card: Card): string {
  const r = card.rank;
  if (r === 'A') return 'a';
  if (r === 'Q') return 'q';
  if (r === 'K') return 'k';
  if (r === 'J') {
    // Inconsistencies in provided assets: spades uses "jack", clubs uses capital "J".
    if (card.suit === 'spades') return 'jack';
    if (card.suit === 'clubs') return 'J';
    return 'j';
  }
  return String(r);
}

export function getCardImage(card: Card): string {
  const file = `${card.suit}_${rankKey(card)}.png`;
  return `/assets/cards/${file}`;
}

export const CARD_BACK_IMAGE = '/assets/cards/card_back.png';
