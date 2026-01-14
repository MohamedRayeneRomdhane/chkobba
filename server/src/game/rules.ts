import { Card, GameState, PlayerIndex, TEAM_FOR_SEAT, TeamIndex } from '../../../shared/types';

export function canCaptureSingle(played: Card, tableCards: Card[]): Card | null {
  return tableCards.find((c) => c.value === played.value) || null;
}

export function findCombinationsForValue(tableCards: Card[], target: number): Card[][] {
  const results: Card[][] = [];
  const cards = tableCards;
  function backtrack(start: number, combo: Card[], sum: number) {
    if (sum === target) {
      results.push([...combo]);
      return;
    }
    if (sum > target) return;
    for (let i = start; i < cards.length; i++) {
      combo.push(cards[i]);
      backtrack(i + 1, combo, sum + cards[i].value);
      combo.pop();
    }
  }
  backtrack(0, [], 0);
  return results;
}

// Optimized single-result search: returns the first valid combination that sums to target.
// Preserves traversal order used by findCombinationsForValue so logic remains consistent.
function findFirstCombinationForValue(tableCards: Card[], target: number): Card[] | null {
  const cards = tableCards;
  const combo: Card[] = [];

  // quick bound: if total sum is below target, early exit
  const total = cards.reduce((s, c) => s + c.value, 0);
  if (total < target) return null;

  function dfs(start: number, sum: number): Card[] | null {
    if (sum === target) return [...combo];
    if (sum > target) return null;
    for (let i = start; i < cards.length; i++) {
      combo.push(cards[i]);
      const res = dfs(i + 1, sum + cards[i].value);
      if (res) return res; // early exit on first found
      combo.pop();
    }
    return null;
  }

  return dfs(0, 0);
}

export interface MoveResult {
  captured: Card[];
  chkobba: boolean;
  newTable: Card[];
  newHand: Card[];
  nextPlayer: PlayerIndex;
  lastCaptureTeam?: TeamIndex;
}

export function applyMove(
  state: GameState,
  player: PlayerIndex,
  playedCardId: string,
  chosenCombinationIds?: string[],
  turnOrder?: readonly PlayerIndex[]
): MoveResult {
  const hand = state.hands[player];
  const playedIndex = hand.findIndex((c) => c.id === playedCardId);
  if (playedIndex === -1) throw new Error('Card not in hand');
  const played = hand[playedIndex];

  const single = canCaptureSingle(played, state.tableCards);
  let captured: Card[] = [];
  let newTable = [...state.tableCards];

  if (single) {
    // single match has priority
    captured = [single, played];
    newTable = newTable.filter((c) => c.id !== single.id);
  } else {
    let chosen: Card[] = [];
    if (chosenCombinationIds && chosenCombinationIds.length > 0) {
      const byId = new Map(state.tableCards.map((c) => [c.id, c]));
      chosen = chosenCombinationIds.map((id) => {
        const card = byId.get(id);
        if (!card) throw new Error('Invalid combination id');
        return card;
      });
      const sum = chosen.reduce((s, c) => s + c.value, 0);
      if (sum !== played.value) throw new Error('Combination must sum to played value');
    } else {
      const first = findFirstCombinationForValue(state.tableCards, played.value);
      if (first) chosen = first;
    }

    if (chosen.length > 0) {
      captured = [...chosen, played];
      const removeIds = new Set(chosen.map((c) => c.id));
      newTable = newTable.filter((c) => !removeIds.has(c.id));
    } else {
      // no capture, place on table
      newTable.push(played);
    }
  }

  const newHand = hand.filter((c) => c.id !== played.id);

  let chkobba = false;
  let lastCaptureTeam = state.lastCaptureTeam;
  if (captured.length > 0) {
    // capture made
    const team = TEAM_FOR_SEAT[player];
    lastCaptureTeam = team;
    // chkobba: table cleared by the move
    if (newTable.length === 0) {
      // dealer cannot score chkobba on last card of the deal is enforced at dealing stage;
      chkobba = true;
    }
  }

  const order = (
    turnOrder && turnOrder.length > 0 ? turnOrder : ([0, 1, 2, 3] as const)
  ) as readonly PlayerIndex[];
  const idx = order.indexOf(player);
  if (idx < 0) throw new Error('Invalid turn order');
  const nextPlayer = order[(idx + 1) % order.length] as PlayerIndex;
  return { captured, chkobba, newTable, newHand, nextPlayer, lastCaptureTeam };
}
