import React from 'react';
import { useCanPlaySelected, useSelectedHandCard, useSelectedSum } from '../../store/selectors';
import { attemptPlay } from './PlayController';
import type { GameNetwork } from '../../net/useGameNetwork';
import { useGameStore } from '../../store';

type Props = { net: GameNetwork };

function HandActionBar({ net }: Props) {
  const selected = useSelectedHandCard();
  const sum = useSelectedSum();
  const canPlay = useCanPlaySelected();

  const onPlay = React.useCallback(() => {
    if (!selected) return;
    const ids = useGameStore.getState().selectedTableIds;
    const combo = ids.length && sum === selected.value ? ids : undefined;
    attemptPlay(net, selected.id, combo);
  }, [net, selected, sum]);

  return (
    <div className="action-bar mt-0.5 sm:mt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-3 w-full px-2 sm:px-0">
      <div className="text-xs sm:text-sm px-2 py-1.5 rounded bg-white/70 shadow text-center sm:text-left">
        {selected ? `Selected: ${selected.rank} • Sum: ${sum}` : 'Select a card'}
      </div>
      <button
        disabled={!canPlay || !selected}
        className={`px-4 py-2 sm:px-3 sm:py-1 rounded-md text-white shadow-sm w-full sm:w-auto ${
          canPlay && selected
            ? 'bg-amber-600 hover:bg-amber-700'
            : 'bg-gray-500 opacity-60 cursor-not-allowed'
        }`}
        onClick={onPlay}
      >
        Play Selected
      </button>
    </div>
  );
}

export default React.memo(HandActionBar);
