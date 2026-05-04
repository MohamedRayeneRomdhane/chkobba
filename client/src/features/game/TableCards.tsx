import React from 'react';
import { getCardImage } from '../../game/cardAssets';
import { useGame } from '../../store/selectors';
import { useGameStore } from '../../store';

function TableCards() {
  const { gameState } = useGame();
  const selectedTableIds = useGameStore((s) => s.selectedTableIds);
  const toggleTableCard = useGameStore((s) => s.toggleTableCard);

  return (
    <div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 sm:gap-2 place-items-center max-w-[90%]"
      id="table-grid"
    >
      {(gameState?.tableCards ?? []).map((c) => {
        const selected = selectedTableIds.includes(c.id);
        return (
          <div
            key={c.id}
            data-card-id={c.id}
            onClick={() => toggleTableCard(c.id)}
            className={`w-[clamp(60px,9.5vmin,120px)] aspect-[2/3] rounded-lg bg-white border-2 shadow-md overflow-hidden transition-transform duration-200 ease-out cursor-pointer touch-manipulation ${
              selected
                ? 'ring-2 ring-amber-400 border-gray-800 -translate-y-1'
                : 'border-gray-800 sm:hover:-translate-y-0.5'
            }`}
          >
            <img
              src={getCardImage(c)}
              alt={`${c.rank} of ${c.suit}`}
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        );
      })}
    </div>
  );
}

export default React.memo(TableCards);
