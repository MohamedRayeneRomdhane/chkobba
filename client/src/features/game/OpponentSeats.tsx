import React from 'react';
import OpponentHand from '../../components/OpponentHand';
import TeammateHand from '../../components/TeammateHand';
import Seat from './Seat';
import { seatIndices } from '../../animations/geometry';
import { useGame, useRoom } from '../../store/selectors';
import type { Profile } from '../../hooks/useProfile';
import type { PlayerIndex, RoomSnapshot } from '../../types';

type Props = {
  snapshot: RoomSnapshot | null;
  localProfile: Profile;
  playerCount: 2 | 4;
  phoneLandscape: boolean;
  onDealAnimStart: () => void;
  ghostSeat?: PlayerIndex | null;
};

function OpponentSeats({
  snapshot,
  localProfile,
  playerCount,
  phoneLandscape,
  onDealAnimStart,
  ghostSeat = null,
}: Props) {
  const { mySeat } = useRoom();
  const { gameState, dealTick } = useGame();
  const seats = seatIndices(mySeat, playerCount);
  const countAt = (i: number) => gameState?.handSizes?.[i] ?? gameState?.hands?.[i]?.length ?? 0;
  const topCards = gameState?.hands?.[seats.top] ?? [];
  const canSeeTopCards = playerCount === 4 && topCards.length > 0;

  return (
    <>
      {canSeeTopCards ? (
        <TeammateHand cards={topCards} dealTick={dealTick} onDealAnimStart={onDealAnimStart} />
      ) : (
        <OpponentHand
          position="top"
          count={countAt(seats.top)}
          dealTick={dealTick}
          onDealAnimStart={onDealAnimStart}
          showGhost={ghostSeat === seats.top}
        />
      )}
      {playerCount === 4 && (
        <>
          <OpponentHand
            position="left"
            count={countAt(seats.left)}
            dealTick={dealTick}
            onDealAnimStart={onDealAnimStart}
            showGhost={ghostSeat === seats.left}
          />
          <OpponentHand
            position="right"
            count={countAt(seats.right)}
            dealTick={dealTick}
            onDealAnimStart={onDealAnimStart}
            showGhost={ghostSeat === seats.right}
          />
        </>
      )}

      <Seat
        position="top"
        seatIndex={seats.top}
        snapshot={snapshot}
        localProfile={localProfile}
        compact
        dense={phoneLandscape}
      />
      {playerCount === 4 && (
        <>
          <Seat
            position="left"
            seatIndex={seats.left}
            snapshot={snapshot}
            localProfile={localProfile}
            compact
            dense={phoneLandscape}
          />
          <Seat
            position="right"
            seatIndex={seats.right}
            snapshot={snapshot}
            localProfile={localProfile}
            compact
            dense={phoneLandscape}
          />
        </>
      )}
    </>
  );
}

export default React.memo(OpponentSeats);
