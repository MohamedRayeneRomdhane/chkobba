import React from 'react';
import type { Card } from '../types';
import { getCardImage } from '../game/cardAssets';

interface PlayerHandProps {
  cards: Card[];
  onPlay: (_cardId: string) => void;
  selectedId?: string | null;
  onSelect?: (_cardId: string) => void;
  dealTick?: number;
  onDealAnimStart?: () => void;
  ghostIndex?: number | null;
}

export default function PlayerHand({
  cards,
  onPlay,
  selectedId,
  onSelect,
  dealTick,
  onDealAnimStart,
  ghostIndex = null,
}: PlayerHandProps) {
  const isDisabled = cards.length === 0;
  // Ensure the entire dealing sequence lasts ~3s
  const totalDurationMs = 1500;
  const cardAnimMs = 700; // per-card animation length
  const n = cards.length;
  const delaySpacingMs = n > 1 ? Math.max(0, (totalDurationMs - cardAnimMs) / (n - 1)) : 0;
  const items: Array<Card | '__ghost__'> = React.useMemo(() => {
    if (ghostIndex == null || ghostIndex < 0) return cards;
    const arr = cards.slice();
    const idx = Math.min(ghostIndex, arr.length);
    (arr as Array<Card | '__ghost__'>).splice(idx, 0, '__ghost__');
    return arr as Array<Card | '__ghost__'>;
  }, [cards, ghostIndex]);

  // FLIP animation for smooth reflow when items shift
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const prevRectsRef = React.useRef<Map<string, DOMRect>>(new Map());
  const lastDealTickRef = React.useRef<number | undefined>(undefined);

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // Identify slots by stable ids (card ids or ghost-i)
    const getCurrentRects = () => {
      const map = new Map<string, DOMRect>();
      container.querySelectorAll('[data-slot-id]')?.forEach((el) => {
        const id = (el as HTMLElement).getAttribute('data-slot-id');
        if (id) map.set(id, (el as HTMLElement).getBoundingClientRect());
      });
      return map;
    };

    // Skip FLIP during deal animation tick changes
    if (lastDealTickRef.current !== dealTick) {
      prevRectsRef.current = getCurrentRects();
      lastDealTickRef.current = dealTick;
      return;
    }

    const prevRects = prevRectsRef.current;
    const nextRects = getCurrentRects();

    // Apply FLIP transforms for elements present in both snapshots
    const animations: Array<HTMLElement> = [];
    nextRects.forEach((cur, id) => {
      const prev = prevRects.get(id);
      if (!prev) return;
      const dx = prev.left - cur.left;
      const dy = prev.top - cur.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      const el = container.querySelector(
        `[data-slot-id="${CSS.escape(id)}"]`
      ) as HTMLElement | null;
      if (!el) return;
      el.style.willChange = 'transform';
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      animations.push(el);
    });

    if (animations.length) {
      // Force reflow then animate to final positions
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      container.offsetHeight;
      for (const el of animations) {
        el.style.transition = 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)';
        el.style.transform = 'translate(0px, 0px)';
      }
      // Cleanup transition after it finishes
      const cleanup = () => {
        for (const el of animations) {
          el.style.transition = '';
          el.style.willChange = '';
        }
      };
      window.setTimeout(cleanup, 320);
    }

    // Store current rects for next pass
    prevRectsRef.current = nextRects;
  }, [items, dealTick]);
  return (
    <div
      className="flex justify-center gap-1.5 sm:gap-2 md:gap-3 p-1 sm:p-2 flex-nowrap max-w-full"
      data-seat-anchor="bottom"
      ref={containerRef}
    >
      {items.map((c, i) => (
        <div
          key={c === '__ghost__' ? `ghost-${dealTick}-${i}` : `${(c as Card).id}-${dealTick}`}
          data-slot-id={c === '__ghost__' ? `ghost-${i}` : (c as Card).id}
          onClick={() => {
            if (isDisabled) return;
            if (c === '__ghost__') return;
            const cc = c as Card;
            if (onSelect) onSelect(cc.id);
            else onPlay(cc.id);
          }}
          className={`${dealTick ? 'deal-in-bottom' : ''}`}
          style={{
            animationDelay: dealTick ? `${Math.round(i * delaySpacingMs)}ms` : undefined,
            animationDuration: dealTick ? `${cardAnimMs}ms` : undefined,
          }}
          onAnimationStart={() => {
            if (dealTick) onDealAnimStart?.();
          }}
          title={c === '__ghost__' ? '' : `${(c as Card).rank} of ${(c as Card).suit}`}
        >
          <div
            className={`w-[clamp(56px,8.2vmin,116px)] aspect-[2/3] rounded-lg bg-white border-2 shadow-md overflow-hidden transition-transform duration-200 ease-out ${isDisabled || c === '__ghost__' ? 'cursor-not-allowed' : 'cursor-pointer hover:-translate-y-1 hover:scale-[1.03]'} ${c !== '__ghost__' && selectedId === (c as Card).id ? 'ring-2 ring-amber-400 border-gray-800' : 'border-gray-800'} ${c === '__ghost__' ? 'opacity-0 pointer-events-none' : ''}`}
            data-hand-card-id={c === '__ghost__' ? undefined : (c as Card).id}
            data-hand-ghost={c === '__ghost__' ? 'true' : undefined}
            style={{ transform: `rotate(${(i - 1) * 4}deg)` }}
          >
            {c !== '__ghost__' ? (
              <img
                src={getCardImage(c as Card)}
                alt={`${(c as Card).rank} of ${(c as Card).suit}`}
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
