import type { GameNetwork } from '../../net/useGameNetwork';
import { useGameStore } from '../../store';

/**
 * Pure side-effects for playing a card. Doesn't render. Encapsulates the
 * "fade-out + ghost + emit + clear selection" sequence used by both PlayerHand
 * onSelect re-click and the action bar's "Play Selected" button.
 */
export function attemptPlay(net: GameNetwork, cardId: string, combo?: string[]) {
  const s = useGameStore.getState();
  const { roomCode, mySeat, gameState, setHandGhostIndex, clearSelection } = {
    roomCode: s.roomCode,
    mySeat: s.mySeat,
    gameState: s.gameState,
    setHandGhostIndex: s.setHandGhostIndex,
    clearSelection: s.clearSelection,
  };

  if (!roomCode || mySeat == null) return;
  if (gameState?.currentPlayerIndex !== mySeat) return;

  const el = document.querySelector(`[data-hand-card-id="${cardId}"]`) as HTMLElement | null;
  if (el) {
    el.style.willChange = 'opacity';
    el.style.transition = 'opacity 220ms ease-out';
    el.style.opacity = '0';
  }

  const hand = gameState.hands[mySeat] ?? [];
  const idx = hand.findIndex((c) => c.id === cardId);
  if (idx >= 0) setHandGhostIndex(idx);

  void net.play(roomCode, cardId, combo).then(() => {
    clearSelection();
  });
}
