import React from 'react';
import { getCardImage } from '../game/cardAssets';
import type { Card, GameState, PlayerIndex } from '../types';
import type { FlightSpec } from '../components/PlayAnimationsLayer';
import { seatPositionFor, type SeatPosition } from './geometry';

/* ==========================================================================
   useFlightChoreographer
   --------------------------------------------------------------------------
   Drives card-flight animations from server-authoritative `lastPlay`.
   Single source of truth: gameState.lastPlay.t. No hand-diffing.
   ========================================================================== */

type Rect = { x: number; y: number; w: number; h: number };

const FLIGHT_DURATION_MS = 460;
const CAPTURE_LEG2_DURATION_MS = 420;
const TABLE_CARD_FALLBACK = { w: 72, h: 108 };

function selectorRect(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = (el as HTMLElement).getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

function tableCardRect(id: string): Rect | null {
  return selectorRect(`[data-card-id="${id}"]`);
}

function handCardRect(id: string): Rect | null {
  return selectorRect(`[data-hand-card-id="${id}"]`);
}

function seatAnchorRect(pos: SeatPosition): Rect | null {
  return (
    selectorRect(`[data-seat-capture="${pos}"]`) ?? selectorRect(`[data-seat-anchor="${pos}"]`)
  );
}

function tableCardSize(): { w: number; h: number } {
  const el = document.querySelector('[data-card-id]');
  if (el) {
    const r = (el as HTMLElement).getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return { w: r.width, h: r.height };
  }
  return TABLE_CARD_FALLBACK;
}

function centerAlign(rect: Rect, w: number, h: number): { x: number; y: number } {
  return { x: rect.x + rect.w / 2 - w / 2, y: rect.y + rect.h / 2 - h / 2 };
}

function buildDiscardFlights(opts: {
  played: Card;
  source: Rect;
  target: Rect;
  size: { w: number; h: number };
  ts: number;
  seat: PlayerIndex;
}): FlightSpec[] {
  const start = centerAlign(opts.source, opts.size.w, opts.size.h);
  return [
    {
      id: `disc-${opts.seat}-${opts.ts}`,
      image: getCardImage(opts.played),
      from: { x: start.x, y: start.y, w: opts.size.w, h: opts.size.h },
      to: {
        x: opts.target.x,
        y: opts.target.y,
        w: opts.size.w,
        h: opts.size.h,
      },
      durationMs: FLIGHT_DURATION_MS,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    },
  ];
}

function buildCaptureFlights(opts: {
  played: Card;
  capturedRects: Map<string, Rect>;
  capturedCards: Card[];
  source: Rect;
  pile: Rect;
  size: { w: number; h: number };
  ts: number;
  seat: PlayerIndex;
}): { leg1: FlightSpec[]; leg2: FlightSpec[] } {
  const start = centerAlign(opts.source, opts.size.w, opts.size.h);
  const rects = [...opts.capturedRects.values()];

  if (rects.length === 0) {
    return {
      leg1: [
        {
          id: `cap-fallback-${opts.seat}-${opts.ts}`,
          image: getCardImage(opts.played),
          from: { x: start.x, y: start.y, w: opts.size.w, h: opts.size.h },
          to: {
            x: opts.pile.x,
            y: opts.pile.y,
            w: opts.size.w,
            h: opts.size.h,
          },
          durationMs: FLIGHT_DURATION_MS,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        },
      ],
      leg2: [],
    };
  }

  const cx = opts.source.x + opts.source.w / 2;
  const cy = opts.source.y + opts.source.h / 2;
  let nearest = rects[0]!;
  let nearestDist = Infinity;
  for (const r of rects) {
    const d = Math.hypot(r.x + r.w / 2 - cx, r.y + r.h / 2 - cy);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = r;
    }
  }

  const leg1: FlightSpec[] = [
    {
      id: `cap-play-${opts.seat}-${opts.ts}`,
      image: getCardImage(opts.played),
      from: { x: start.x, y: start.y, w: opts.size.w, h: opts.size.h },
      to: { x: nearest.x, y: nearest.y, w: opts.size.w, h: opts.size.h },
      durationMs: FLIGHT_DURATION_MS,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    },
  ];

  const leg2: FlightSpec[] = [];
  for (const card of opts.capturedCards) {
    const cr = opts.capturedRects.get(card.id);
    if (!cr) continue;
    leg2.push({
      id: `cap-ret-${card.id}-${opts.ts}`,
      image: getCardImage(card),
      from: { x: cr.x, y: cr.y, w: cr.w, h: cr.h },
      to: { x: opts.pile.x, y: opts.pile.y, w: cr.w, h: cr.h },
      durationMs: CAPTURE_LEG2_DURATION_MS,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    });
  }
  leg2.push({
    id: `cap-ret-play-${opts.seat}-${opts.ts}`,
    image: getCardImage(opts.played),
    from: { x: nearest.x, y: nearest.y, w: opts.size.w, h: opts.size.h },
    to: { x: opts.pile.x, y: opts.pile.y, w: opts.size.w, h: opts.size.h },
    durationMs: CAPTURE_LEG2_DURATION_MS,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  });
  return { leg1, leg2 };
}

export function useFlightChoreographer(
  gameState: GameState | null,
  mySeat: PlayerIndex | null,
  playerCount: 2 | 4 = 4
): { flights: FlightSpec[]; clearFlights: () => void } {
  const [flights, setFlights] = React.useState<FlightSpec[]>([]);
  const lastTRef = React.useRef<number>(0);
  const leg2TimerRef = React.useRef<number | null>(null);

  // Snapshot of table card rects + cards from the previous render. The new
  // render's tableCards has already removed captured ids, so this mirror is
  // the only way to recover their on-screen positions.
  const prevTableRectsRef = React.useRef<Map<string, Rect>>(new Map());
  const prevTableCardsRef = React.useRef<Map<string, Card>>(new Map());

  React.useLayoutEffect(() => {
    const lp = gameState?.lastPlay;
    if (lp && lp.t !== lastTRef.current) {
      lastTRef.current = lp.t;

      if (leg2TimerRef.current != null) {
        window.clearTimeout(leg2TimerRef.current);
        leg2TimerRef.current = null;
      }

      const seat = lp.seatIndex;
      const isMyPlay = seat === mySeat;
      const size = tableCardSize();
      const seatPos = seatPositionFor(mySeat, seat, playerCount);

      const source = (isMyPlay ? handCardRect(lp.played.id) : null) ?? seatAnchorRect(seatPos);

      if (source) {
        if (lp.capturedTableCardIds.length > 0) {
          const capturedRects = new Map<string, Rect>();
          const capturedCards: Card[] = [];
          for (const id of lp.capturedTableCardIds) {
            const r = prevTableRectsRef.current.get(id);
            if (r) capturedRects.set(id, r);
            const c = prevTableCardsRef.current.get(id);
            if (c) capturedCards.push(c);
          }
          const pile = seatAnchorRect(seatPos) ?? source;
          const built = buildCaptureFlights({
            played: lp.played,
            capturedRects,
            capturedCards,
            source,
            pile,
            size,
            ts: lp.t,
            seat,
          });
          setFlights(built.leg1);
          if (built.leg2.length > 0) {
            leg2TimerRef.current = window.setTimeout(() => {
              setFlights(built.leg2);
              leg2TimerRef.current = null;
            }, FLIGHT_DURATION_MS + 20);
          }
        } else {
          // Discard: locate the newly-added table card.
          const prevIds = prevTableRectsRef.current;
          const newId = (gameState?.tableCards ?? [])
            .map((c) => c.id)
            .find((id) => !prevIds.has(id));
          const target = (newId && tableCardRect(newId)) ?? selectorRect('#table-grid');
          if (target) {
            setFlights(
              buildDiscardFlights({
                played: lp.played,
                source,
                target,
                size,
                ts: lp.t,
                seat,
              })
            );
          }
        }
      }
    }

    // After deciding, refresh the mirror for the *next* render to consume.
    const nextRects = new Map<string, Rect>();
    document.querySelectorAll('[data-card-id]').forEach((el) => {
      const id = (el as HTMLElement).getAttribute('data-card-id');
      if (!id) return;
      const r = (el as HTMLElement).getBoundingClientRect();
      nextRects.set(id, { x: r.left, y: r.top, w: r.width, h: r.height });
    });
    prevTableRectsRef.current = nextRects;

    const nextCards = new Map<string, Card>();
    for (const c of gameState?.tableCards ?? []) nextCards.set(c.id, c);
    prevTableCardsRef.current = nextCards;
  }, [gameState, mySeat, playerCount]);

  React.useEffect(() => {
    return () => {
      if (leg2TimerRef.current != null) window.clearTimeout(leg2TimerRef.current);
    };
  }, []);

  const clearFlights = React.useCallback(() => setFlights([]), []);
  return { flights, clearFlights };
}

export default useFlightChoreographer;
