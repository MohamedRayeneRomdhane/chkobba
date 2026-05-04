import React from 'react';
import TableMat from '../../components/TableMat';
import RoomLobbyPanel from '../../components/RoomLobbyPanel';
import ScoreBoard from '../../components/ScoreBoard';
import CoffeeProp from '../../components/CoffeeProp';
import ChichaProp from '../../components/ChichaProp';
import CigarettesProp from '../../components/CigarettesProp';
import PlayAnimationsLayer from '../../components/PlayAnimationsLayer';
import EndOverlay from '../../components/EndOverlay';
import OpponentSeats from './OpponentSeats';
import TableCards from './TableCards';
import HandActionBar from './HandActionBar';
import BottomSeatRow from './BottomSeatRow';
import PlayerHandWell from './PlayerHandWell';
import useFlightChoreographer from '../../animations/useFlightChoreographer';
import useSound from '../../hooks/useSound';
import { useGameStore } from '../../store';
import { useGame, useRoom } from '../../store/selectors';
import type { Profile } from '../../hooks/useProfile';
import type { GameNetwork } from '../../net/useGameNetwork';

type Props = {
  net: GameNetwork;
  localProfile: Profile;
  phoneLandscape: boolean;
};

export default function GameTable({ net, localProfile, phoneLandscape }: Props) {
  const { gameState, lastRound, replayWaiting, roundBanner } = useGame();
  const { roomCode, snapshot } = useRoom();
  const setHandGhostIndex = useGameStore((s) => s.setHandGhostIndex);

  const playerCount = (snapshot?.settings?.playerCount ?? 4) as 2 | 4;

  const { play: playDealTick } = useSound('/assets/soundeffects/deal.mp3', {
    volume: 0.7,
    loop: false,
    interrupt: true,
  });

  const mySeat = useGameStore((s) => s.mySeat);
  const { flights } = useFlightChoreographer(gameState, mySeat, playerCount);

  const soundboardOpen = useGameStore((s) => s.soundboardOpen);

  const waitingForReplay = replayWaiting ? replayWaiting.count < replayWaiting.total : true;
  const showOverlay = !!lastRound && waitingForReplay;

  return (
    <section className="app-section app-section--game sm:snap-start sm:snap-always h-full min-h-0 flex flex-col gap-0.5 sm:gap-0">
      {showOverlay && (
        <EndOverlay
          banner={roundBanner}
          scores={lastRound?.scores ?? gameState?.scoresByTeam ?? null}
          details={lastRound?.details ?? null}
          replayWaiting={replayWaiting}
          onReplay={() => {
            if (roomCode) void net.replay(roomCode);
          }}
          onQuit={() => {
            if (roomCode) void net.quit(roomCode);
          }}
        />
      )}

      <div className="game-table-area flex-1 min-h-0 flex items-stretch justify-stretch overflow-visible">
        <TableMat>
          {roomCode && snapshot && (
            <RoomLobbyPanel
              roomCode={roomCode}
              snapshot={snapshot}
              socketId={useGameStore.getState().socketId}
              gameStarted={!!gameState}
              onUpdateSettings={(settings) => net.updateRoomSettings(roomCode, settings)}
              onLaunchGame={() => net.launchGame(roomCode)}
            />
          )}

          <TableCards />

          <OpponentSeats
            snapshot={snapshot}
            localProfile={localProfile}
            playerCount={playerCount}
            phoneLandscape={phoneLandscape}
            onDealAnimStart={playDealTick}
          />

          <PlayerHandWell net={net} onDealAnimStart={playDealTick} />

          <CoffeeProp />
          <ChichaProp />
          <CigarettesProp />

          <ScoreBoard
            state={gameState ?? null}
            teamNames={snapshot?.teamNames}
            mySeat={mySeat}
            onRenameTeam={async (teamIndex, name) => {
              if (!roomCode) return { ok: false, msg: 'Not in a room' };
              return net.renameTeam(roomCode, teamIndex, name);
            }}
          />
        </TableMat>
      </div>

      <PlayAnimationsLayer flights={flights} onDone={() => setHandGhostIndex(null)} />

      <div
        className={`action-area w-full shrink-0 flex flex-col items-center justify-center ${
          soundboardOpen ? 'soundboard-open' : ''
        }`}
      >
        <BottomSeatRow net={net} localProfile={localProfile} playerCount={playerCount} />
        <HandActionBar net={net} />
      </div>
    </section>
  );
}
