import React from 'react';
import Seat from './Seat';
import Soundboard from '../audio/Soundboard';
import { seatIndices } from '../../animations/geometry';
import type { Profile } from '../../hooks/useProfile';
import type { GameNetwork } from '../../net/useGameNetwork';
import type { SoundboardSoundFile } from '../../lib/soundboard';
import { useGameStore } from '../../store';
import { useRoom } from '../../store/selectors';
import { useSoundboardBridge } from '../audio/useSoundboardBridge';

type SoundboardOverlayPos = { left: number; bottom: number };

type Props = {
  net: GameNetwork;
  localProfile: Profile;
  playerCount: 2 | 4;
};

export default function BottomSeatRow({ net, localProfile, playerCount }: Props) {
  const { roomCode, mySeat, snapshot } = useRoom();
  const soundboardOpen = useGameStore((s) => s.soundboardOpen);
  const setSoundboardOpen = useGameStore((s) => s.setSoundboardOpen);

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const anchorRef = React.useRef<HTMLDivElement | null>(null);
  const [overlayPos, setOverlayPos] = React.useState<SoundboardOverlayPos | null>(null);

  const { playForSeat, suppressEcho } = useSoundboardBridge();

  // Close on outside click.
  React.useEffect(() => {
    if (!soundboardOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const root = containerRef.current;
      if (!root) return;
      if (e.target instanceof Node && root.contains(e.target)) return;
      setSoundboardOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [soundboardOpen, setSoundboardOpen]);

  // Track anchor rect for desktop popover placement.
  React.useEffect(() => {
    if (!soundboardOpen) {
      setOverlayPos(null);
      return;
    }
    const update = () => {
      const a = anchorRef.current;
      if (!a) return;
      const rect = a.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const left = Math.min(window.innerWidth - 12, Math.max(12, centerX));
      const gap = 10;
      const bottom = Math.max(12, window.innerHeight - rect.top + gap);
      setOverlayPos({ left, bottom });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update);
    };
  }, [soundboardOpen]);

  const seats = seatIndices(mySeat, playerCount);
  const idxBottom = seats.bottom;

  const onPick = (file: SoundboardSoundFile) => {
    if (!roomCode) return;
    suppressEcho(idxBottom, file);
    void playForSeat(idxBottom, file);
    void net.playSoundboard(roomCode, file);
    setSoundboardOpen(false);
  };

  return (
    <div className="player-seat-row w-full flex items-center justify-center py-0.5 sm:py-1">
      <div ref={containerRef} className="flex flex-col items-center">
        <Seat
          position="bottom"
          seatIndex={idxBottom}
          snapshot={snapshot}
          localProfile={localProfile}
          compact
          absolute={false}
          actionIcon={
            roomCode
              ? {
                  src: '/assets/icons/play.ico',
                  alt: 'Soundboard',
                  title: 'Soundboard',
                }
              : undefined
          }
          onActionClick={() => {
            if (!roomCode) return;
            setSoundboardOpen(!soundboardOpen);
          }}
          anchorRef={anchorRef}
        />

        {soundboardOpen && roomCode && overlayPos && (
          <>
            <div
              className="fixed inset-0 z-[255] bg-transparent"
              onClick={() => setSoundboardOpen(false)}
              aria-hidden
            />
            <Soundboard variant="mobile" onClose={() => setSoundboardOpen(false)} onPick={onPick} />
            <Soundboard
              variant="desktop"
              positionStyle={{ left: overlayPos.left, bottom: overlayPos.bottom }}
              onClose={() => setSoundboardOpen(false)}
              onPick={onPick}
            />
          </>
        )}
      </div>
    </div>
  );
}
