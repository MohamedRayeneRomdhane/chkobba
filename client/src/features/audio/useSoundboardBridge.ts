import React from 'react';
import type { SoundboardSoundFile } from '../../lib/soundboard';
import { useGameStore } from '../../store';
import { useSoundboardAudio } from './useSoundboardAudio';
import type { PlayerIndex } from '../../types';

/**
 * Bridges socket-delivered soundboard events to the local audio layer,
 * applying mute filters and a "self-suppress" window so a player who
 * triggered a sound locally doesn't double up when the server echoes it.
 */
export function useSoundboardBridge() {
  const { playForSeat, stopForSeat } = useSoundboardAudio();

  const lastHandledTRef = React.useRef<number>(0);
  const suppressNextRef = React.useRef<{
    seatIndex: PlayerIndex;
    soundFile: SoundboardSoundFile;
    until: number;
  } | null>(null);

  const event = useGameStore((s) => s.soundboardEvent);
  const muted = useGameStore((s) => s.mutedSoundboardSeats);

  React.useEffect(() => {
    if (!event || event.t <= lastHandledTRef.current) return;
    lastHandledTRef.current = event.t;
    const seat = event.seatIndex;

    if (muted.has(seat)) {
      stopForSeat(seat);
      return;
    }

    const sup = suppressNextRef.current;
    if (
      sup &&
      sup.seatIndex === seat &&
      sup.soundFile === event.soundFile &&
      Date.now() < sup.until
    ) {
      suppressNextRef.current = null;
      return;
    }

    void playForSeat(seat, event.soundFile);
  }, [event, muted, playForSeat, stopForSeat]);

  /** Mark the next echo of (seat,file) as already handled locally. */
  const suppressEcho = React.useCallback(
    (seatIndex: PlayerIndex, soundFile: SoundboardSoundFile) => {
      suppressNextRef.current = {
        seatIndex,
        soundFile,
        until: Date.now() + 2500,
      };
    },
    []
  );

  return { playForSeat, stopForSeat, suppressEcho };
}
