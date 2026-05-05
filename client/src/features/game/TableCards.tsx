import React from 'react';
import { getCardImage } from '../../game/cardAssets';
import { useGameStore } from '../../store';

function TableCards() {
  const displayedTableCards = useGameStore((s) => s.displayedTableCards);
  const selectedTableIds = useGameStore((s) => s.selectedTableIds);
  const toggleTableCard = useGameStore((s) => s.toggleTableCard);
  const flightInProgressId = useGameStore((s) => s.flightInProgressId);

  return (
    <div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 sm:gap-2 place-items-center max-w-[90%]"
      id="table-grid"
    >
      {displayedTableCards.map((c) => {
        const selected = selectedTableIds.includes(c.id);
        // The slot must keep its layout (so the flight target rect is correct)
        // while the flight overlay is animating. Hide visuals only, not the box.
        const inFlight = flightInProgressId === c.id;
        return (
          <div
            key={c.id}
            data-card-id={c.id}
            onClick={() => toggleTableCard(c.id)}
            className={`w-[clamp(60px,9.5vmin,120px)] aspect-[2/3] rounded-lg bg-white border-2 shadow-md overflow-hidden transition-transform duration-200 ease-out cursor-pointer touch-manipulation ${
              selected
                ? 'ring-2 ring-amber-400 border-gray-800 -translate-y-1'
                : 'border-gray-800 sm:hover:-translate-y-0.5'
            } ${inFlight ? 'opacity-0' : ''}`}
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
