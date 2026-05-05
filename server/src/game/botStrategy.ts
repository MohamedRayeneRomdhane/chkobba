import type { Card, PlayerIndex } from '../../../shared/types';
import { findCombinationsForValue } from './rules';

interface BotMoveResult {
  cardId: string;
  comboIds?: string[];
}

/**
 * Pick the best move for a bot given its hand and the table.
 * Strategy: prefer captures; prefer chkobba (clearing table); then most cards captured; drop lowest value.
 */
export function pickBotMove(hand: Card[], tableCards: Card[]): BotMoveResult | null {
  if (hand.length === 0) return null;

  let best: { cardId: string; comboIds?: string[]; score: number } | null = null;

  for (const card of hand) {
    // Single match capture has priority in the rules
    const single = tableCards.find((c) => c.value === card.value);
    if (single) {
      const clears = tableCards.length === 1;
      const score = (clears ? 1_000 : 0) + 200 + 20 - card.value;
      const cand = { cardId: card.id, comboIds: undefined, score };
      if (!best || cand.score > best.score) best = cand;
      continue;
    }

    const combos = findCombinationsForValue(tableCards, card.value);
    if (combos.length > 0) {
      for (const combo of combos) {
        const clears = combo.length === tableCards.length;
        const score = (clears ? 1_000 : 0) + 100 + combo.length * 10 - card.value;
        const cand = { cardId: card.id, comboIds: combo.map((c) => c.id), score };
        if (!best || cand.score > best.score) best = cand;
      }
    } else {
      // No capture; dropping a low card is usually safer
      const score = -card.value;
      const cand = { cardId: card.id, comboIds: undefined, score };
      if (!best || cand.score > best.score) best = cand;
    }
  }

  if (!best) return null;
  return { cardId: best.cardId, comboIds: best.comboIds };
}
