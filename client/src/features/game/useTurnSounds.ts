import React from 'react';
import useSound from '../../hooks/useSound';
import { useGameStore } from '../../store';

/**
 * Plays the "your turn" jingle once when it becomes the local player's turn,
 * and a 5-second-warning beep before the timer expires.
 * Replaces the two large effect blocks that lived in App.tsx.
 */
export function useTurnSounds() {
  const { play: playTimerWarn, stop: stopTimerWarn } = useSound('/assets/soundeffects/Timer.mp3', {
    volume: 0.45,
    loop: false,
    interrupt: true,
  });
  const { play: playTurnStart } = useSound('/assets/soundeffects/turn.mp3', {
    volume: 0.4,
    loop: false,
    interrupt: true,
  });

  const turn = useGameStore((s) => s.turn);
  const mySeat = useGameStore((s) => s.mySeat);
  const currentPlayerIndex = useGameStore((s) => s.gameState?.currentPlayerIndex ?? null);
  const clockSkewMs = useGameStore((s) => s.clockSkewMs);

  const timerWarnTimeoutRef = React.useRef<number | null>(null);
  const timerWarnPlayedFor = React.useRef<number | null>(null);
  const turnStartPlayedFor = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (timerWarnTimeoutRef.current != null) {
      window.clearTimeout(timerWarnTimeoutRef.current);
      timerWarnTimeoutRef.current = null;
    }
    stopTimerWarn();

    if (!turn || mySeat == null || currentPlayerIndex !== mySeat) return;
    const now = Date.now() + clockSkewMs;
    const remainingMs = Math.max(0, turn.endsAt - now);
    if (remainingMs <= 0) return;

    const playAt = remainingMs - 5_000;
    if (timerWarnPlayedFor.current !== turn.endsAt && playAt <= 0) {
      timerWarnPlayedFor.current = turn.endsAt;
      void playTimerWarn();
      return;
    }
    if (timerWarnPlayedFor.current === turn.endsAt) return;

    timerWarnTimeoutRef.current = window.setTimeout(() => {
      timerWarnPlayedFor.current = turn.endsAt;
      void playTimerWarn();
    }, playAt);

    return () => {
      if (timerWarnTimeoutRef.current != null) {
        window.clearTimeout(timerWarnTimeoutRef.current);
        timerWarnTimeoutRef.current = null;
      }
      stopTimerWarn();
    };
  }, [turn, mySeat, currentPlayerIndex, clockSkewMs, playTimerWarn, stopTimerWarn]);

  React.useEffect(() => {
    if (!turn || mySeat == null || currentPlayerIndex !== mySeat) return;
    if (turnStartPlayedFor.current === turn.endsAt) return;
    turnStartPlayedFor.current = turn.endsAt;
    void playTurnStart();
  }, [turn, mySeat, currentPlayerIndex, playTurnStart]);
}
