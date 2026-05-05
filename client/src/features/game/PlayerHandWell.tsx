import React from 'react';
import PlayerHand from '../../components/PlayerHand';
import { attemptPlay } from './PlayController';
import { useGameStore } from '../../store';
import { useGame, useRoom, useCanPlaySelected } from '../../store/selectors';
import type { GameNetwork } from '../../net/useGameNetwork';

type Props = {
  net: GameNetwork;
  onDealAnimStart: () => void;
};

function PlayerHandWell({ net, onDealAnimStart }: Props) {
  const { gameState, dealTick } = useGame();
  const { mySeat } = useRoom();
  const canPlay = useCanPlaySelected();

  const selectedHandId = useGameStore((s) => s.selectedHandId);
  const handGhostIndex = useGameStore((s) => s.handGhostIndex);
  const selectHandCard = useGameStore((s) => s.selectHandCard);

  const cards = React.useMemo(
    () => (mySeat != null && gameState?.hands ? (gameState.hands[mySeat] ?? []) : []),
    [mySeat, gameState]
  );

  const onSelect = React.useCallback(
    (id: string) => {
      const s = useGameStore.getState();
      // Re-clicking the same id either discards (no table cards selected) or deselects.
      if (s.selectedHandId === id) {
        if (canPlay && s.selectedTableIds.length === 0) {
          attemptPlay(net, id);
        } else {
          selectHandCard(null);
        }
      } else {
        selectHandCard(id);
      }
    },
    [canPlay, net, selectHandCard]
  );

  const onPlay = React.useCallback(
    (id: string) => {
      const s = useGameStore.getState();
      const seat = s.mySeat;
      if (seat == null) return;
      const card = (s.gameState?.hands?.[seat] ?? []).find((c) => c.id === id);
      if (!card) return;
      const byId = new Map((s.gameState?.tableCards ?? []).map((c) => [c.id, c]));
      const sum = s.selectedTableIds.reduce((t, tid) => t + (byId.get(tid)?.value ?? 0), 0);
      const combo =
        s.selectedTableIds.length && sum === card.value ? s.selectedTableIds : undefined;
      attemptPlay(net, id, combo);
    },
    [net]
  );

  return (
    <div className="player-hand-overlay absolute left-1/2 -translate-x-1/2 bottom-[clamp(4px,1.8vh,18px)] z-[45] w-[min(98%,1200px)] h-[clamp(120px,18vmin,200px)] sm:h-[clamp(160px,22vmin,260px)] px-1 flex items-end pointer-events-none overflow-visible">
      <div
        data-seat-capture="bottom"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-px"
      />
      <div className="no-scrollbar pointer-events-auto w-full h-full min-h-[clamp(90px,14vmin,150px)] sm:min-h-[clamp(110px,16vmin,180px)] overflow-x-auto overflow-y-hidden touch-pan-x overscroll-x-contain">
        <div className="min-w-full h-full flex items-end justify-center">
          <PlayerHand
            cards={cards}
            selectedId={selectedHandId}
            ghostIndex={handGhostIndex}
            onSelect={onSelect}
            onPlay={onPlay}
            dealTick={dealTick}
            onDealAnimStart={onDealAnimStart}
          />
        </div>
      </div>
    </div>
  );
}

export default React.memo(PlayerHandWell);
