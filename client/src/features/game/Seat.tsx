import React from 'react';
import SeatPanel from '../../components/SeatPanel';
import { teamForSeat } from '../../animations/geometry';
import type { PlayerIndex, RoomSnapshot } from '../../types';
import type { Profile } from '../../hooks/useProfile';
import { useGameStore } from '../../store';
import { useAudio, useGame, useRoom } from '../../store/selectors';

type Props = {
  position: 'top' | 'left' | 'right' | 'bottom';
  seatIndex: PlayerIndex;
  snapshot: RoomSnapshot | null;
  localProfile: Profile;
  onActionClick?: () => void;
  actionIcon?: { src: string; alt: string; title: string };
  compact?: boolean;
  dense?: boolean;
  absolute?: boolean;
  anchorRef?: React.Ref<HTMLDivElement>;
};

function SeatInner({
  position,
  seatIndex,
  snapshot,
  localProfile,
  onActionClick,
  actionIcon,
  compact = true,
  dense = false,
  absolute = true,
  anchorRef,
}: Props) {
  const seats = snapshot?.seats ?? [null, null, null, null];
  const profiles = snapshot?.profiles ?? {};
  const teamNames = snapshot?.teamNames ?? (['Team A', 'Team B'] as [string, string]);

  const { gameState, turn } = useGame();
  void useRoom();
  const clockSkewMs = useGameStore((s) => s.clockSkewMs);
  const { mutedSoundboardSeats, speakingSeat, seatBars, toggleMutedSeat } = useAudio();

  const sid = seats[seatIndex] ?? null;
  const fromSnapshot = sid ? profiles[sid] : null;
  const isBottomSelf = position === 'bottom';
  const profile =
    fromSnapshot ??
    (isBottomSelf && (localProfile.nickname || localProfile.avatar)
      ? { nickname: localProfile.nickname, avatar: localProfile.avatar }
      : null);

  const display = sid
    ? { nickname: profile?.nickname, avatar: profile?.avatar }
    : { nickname: 'Empty seat', avatar: undefined };

  const current = gameState?.currentPlayerIndex ?? null;
  const isCurrent = current === seatIndex;
  const isSeated = !!sid;
  const muted = mutedSoundboardSeats.has(seatIndex);

  const computedActionIcon =
    actionIcon ??
    (isSeated && !isBottomSelf
      ? {
          src: muted ? '/assets/icons/mute.ico' : '/assets/icons/play.ico',
          alt: muted ? 'Muted' : 'Unmuted',
          title: muted ? 'Unmute soundboard' : 'Mute soundboard',
        }
      : undefined);

  const handleAction =
    onActionClick ??
    (() => {
      if (!isSeated) return;
      toggleMutedSeat(seatIndex);
    });

  const panel = (
    <SeatPanel
      position={position}
      avatar={display.avatar}
      nickname={display.nickname}
      highlight={isCurrent}
      turnEndsAt={isCurrent ? turn?.endsAt : undefined}
      turnDurationMs={isCurrent ? turn?.durationMs : undefined}
      clockSkewMs={isCurrent ? clockSkewMs : undefined}
      teamLabel={teamNames[teamForSeat(seatIndex)]}
      teamIndex={teamForSeat(seatIndex)}
      compact={compact}
      dense={dense}
      absolute={absolute}
      actionIconSrc={computedActionIcon?.src}
      actionIconAlt={computedActionIcon?.alt}
      actionIconTitle={computedActionIcon?.title}
      onActionClick={computedActionIcon ? handleAction : undefined}
      speaking={speakingSeat === seatIndex && isSeated}
      speakBars={seatBars[seatIndex]}
    />
  );

  if (anchorRef) {
    return (
      <div ref={anchorRef} className="relative">
        {panel}
      </div>
    );
  }
  return panel;
}

export default React.memo(SeatInner);
