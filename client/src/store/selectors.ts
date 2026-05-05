import { useGameStore, useShallow } from './index';
import type { Card } from '../types';

export const useConnection = () =>
  useGameStore(
    useShallow((s) => ({
      connected: s.connected,
      socketId: s.socketId,
      clockSkewMs: s.clockSkewMs,
    }))
  );

export const useRoom = () =>
  useGameStore(
    useShallow((s) => ({
      roomCode: s.roomCode,
      snapshot: s.snapshot,
      mySeat: s.mySeat,
      phase: s.phase,
    }))
  );

export const useGame = () =>
  useGameStore(
    useShallow((s) => ({
      gameState: s.gameState,
      turn: s.turn,
      lastRound: s.lastRound,
      replayWaiting: s.replayWaiting,
      roundBanner: s.roundBanner,
      dealTick: s.dealTick,
    }))
  );

export const useSelection = () =>
  useGameStore(
    useShallow((s) => ({
      selectedHandId: s.selectedHandId,
      selectedTableIds: s.selectedTableIds,
      handGhostIndex: s.handGhostIndex,
      selectHandCard: s.selectHandCard,
      toggleTableCard: s.toggleTableCard,
      clearSelection: s.clearSelection,
      setHandGhostIndex: s.setHandGhostIndex,
    }))
  );

export const useAudio = () =>
  useGameStore(
    useShallow((s) => ({
      soundboardEvent: s.soundboardEvent,
      mutedSoundboardSeats: s.mutedSoundboardSeats,
      speakingSeat: s.speakingSeat,
      seatBars: s.seatBars,
      toggleMutedSeat: s.toggleMutedSeat,
      setSpeakingSeat: s.setSpeakingSeat,
      setSeatBars: s.setSeatBars,
      setSoundboardEvent: s.setSoundboardEvent,
    }))
  );

/** Selected hand card object (computed). */
export const useSelectedHandCard = (): Card | null =>
  useGameStore((s) => {
    if (s.mySeat == null || !s.gameState?.hands) return null;
    return s.gameState.hands[s.mySeat]?.find((c) => c.id === s.selectedHandId) ?? null;
  });

/** Sum of currently-selected table cards. */
export const useSelectedSum = (): number =>
  useGameStore((s) => {
    const cards = s.gameState?.tableCards ?? [];
    const byId = new Map(cards.map((c) => [c.id, c]));
    return s.selectedTableIds.reduce((sum, id) => sum + (byId.get(id)?.value ?? 0), 0);
  });

/** Whether the current selection forms a legal play (place or capture). */
export const useCanPlaySelected = (): boolean =>
  useGameStore((s) => {
    if (s.mySeat == null || !s.gameState?.hands) return false;
    const card = s.gameState.hands[s.mySeat]?.find((c) => c.id === s.selectedHandId);
    if (!card) return false;
    if (s.selectedTableIds.length === 0) return true;
    const byId = new Map(s.gameState.tableCards.map((c) => [c.id, c]));
    const sum = s.selectedTableIds.reduce((t, id) => t + (byId.get(id)?.value ?? 0), 0);
    return sum === card.value;
  });

export const useIsMyTurn = (): boolean =>
  useGameStore((s) => s.mySeat != null && s.gameState?.currentPlayerIndex === s.mySeat);
