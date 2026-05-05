import React from 'react';
import { getCardImage } from '../game/cardAssets';
import type { Card, GameState, PlayerIndex } from '../types';
import type { FlightSpec } from '../components/PlayAnimationsLayer';
import { seatPositionFor, type SeatPosition } from './geometry';
import { FLIGHT } from './flightTiming';
import { useGameStore } from '../store';

/* ==========================================================================
   useFlightChoreographer
   --------------------------------------------------------------------------
   Drives card-flight animations from server-authoritative `lastPlay`.
   Single source of truth: gameState.lastPlay.t. No hand-diffing.
   ========================================================================== */

type Rect = { x: number; y: number; w: number; h: number };

/** Re-exported for compatibility — see flightTiming.ts for the source. */
export const FLIGHT_DURATION_MS = FLIGHT.LEG1_MS;
export const CAPTURE_LEG2_DURATION_MS = FLIGHT.LEG2_MS;

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
  return { w: 72, h: 108 };
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
}): { flights: FlightSpec[]; ids: string[] } {
  const start = centerAlign(opts.source, opts.size.w, opts.size.h);
  const id = `disc-${opts.seat}-${opts.ts}`;
  return {
    flights: [
      {
        id,
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
    ],
    ids: [id],
  };
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
}): { leg1: FlightSpec[]; leg2: FlightSpec[]; allIds: string[] } {
  const start = centerAlign(opts.source, opts.size.w, opts.size.h);
  const rects = [...opts.capturedRects.values()];

  if (rects.length === 0) {
    const id = `cap-fallback-${opts.seat}-${opts.ts}`;
    return {
      leg1: [
        {
          id,
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
      allIds: [id],
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

  const leg1Id = `cap-play-${opts.seat}-${opts.ts}`;
  const leg1: FlightSpec[] = [
    {
      id: leg1Id,
      image: getCardImage(opts.played),
      from: { x: start.x, y: start.y, w: opts.size.w, h: opts.size.h },
      to: { x: nearest.x, y: nearest.y, w: opts.size.w, h: opts.size.h },
      durationMs: FLIGHT_DURATION_MS,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    },
  ];

  const leg2: FlightSpec[] = [];
  const leg2Ids: string[] = [];
  for (const card of opts.capturedCards) {
    const cr = opts.capturedRects.get(card.id);
    if (!cr) continue;
    const id = `cap-ret-${card.id}-${opts.ts}`;
    leg2Ids.push(id);
    leg2.push({
      id,
      image: getCardImage(card),
      from: { x: cr.x, y: cr.y, w: cr.w, h: cr.h },
      to: { x: opts.pile.x, y: opts.pile.y, w: cr.w, h: cr.h },
      durationMs: CAPTURE_LEG2_DURATION_MS,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    });
  }
  const leg2PlayId = `cap-ret-play-${opts.seat}-${opts.ts}`;
  leg2Ids.push(leg2PlayId);
  leg2.push({
    id: leg2PlayId,
    image: getCardImage(opts.played),
    from: { x: nearest.x, y: nearest.y, w: opts.size.w, h: opts.size.h },
    to: { x: opts.pile.x, y: opts.pile.y, w: opts.size.w, h: opts.size.h },
    durationMs: CAPTURE_LEG2_DURATION_MS,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  });

  return { leg1, leg2, allIds: [leg1Id, ...leg2Ids] };
}

export function useFlightChoreographer(
  gameState: GameState | null,
  mySeat: PlayerIndex | null,
  playerCount: 2 | 4 = 4,
  setOpponentGhostSeat?: (seat: PlayerIndex | null) => void
): { flights: FlightSpec[]; clearFlights: () => void; notifyFlightDone: (id: string) => boolean } {
  const [flights, setFlights] = React.useState<FlightSpec[]>([]);
  const lastTRef = React.useRef<number>(0);
  const leg2TimerRef = React.useRef<number | null>(null);

  // pendingFlightIds: ALL flight IDs for the current play (leg1 + leg2 registered upfront).
  // notifyFlightDone returns true only when every expected flight has reported done.
  const pendingFlightIdsRef = React.useRef<Set<string>>(new Set());

  // Snapshot of table card rects + cards from the previous render. The new
  // render's tableCards has already removed captured ids, so this mirror is
  // the only way to recover their on-screen positions.
  const prevTableRectsRef = React.useRef<Map<string, Rect>>(new Map());
  const prevTableCardsRef = React.useRef<Map<string, Card>>(new Map());

  // Snapshot of hand card rects from the previous render. When a card is
  // played, it disappears from hands[] in the very render that carries
  // lastPlay — so handCardRect() returns null at that point. This ref holds
  // the last-seen position/size of every hand card so we can still read it.
  const prevHandRectsRef = React.useRef<Map<string, Rect>>(new Map());

  // displayedTableCards drives the board DOM. We depend on it so that when
  // it updates (after the delayed apply), we re-read rects and keep
  // prevTableRectsRef fresh for subsequent plays.
  const displayedTableCards = useGameStore((s) => s.displayedTableCards);

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

      // Priority: live DOM rect → previous-render snapshot → seat anchor fallback.
      const source =
        handCardRect(lp.played.id) ??
        prevHandRectsRef.current.get(lp.played.id) ??
        seatAnchorRect(seatPos);

      if (!isMyPlay && source) {
        setOpponentGhostSeat?.(seat);
      }

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

          // Register all expected flight IDs (leg1 + leg2) upfront so
          // notifyFlightDone can correctly detect completion after leg2.
          pendingFlightIdsRef.current = new Set(built.allIds);

          setFlights(built.leg1);
          if (built.leg2.length > 0) {
            // Capture commits the new table state at the SAME tick that leg2
            // starts: captured cards disappear from the board exactly as their
            // flight overlays appear. Single render → no double-render race.
            const committedTableCards = gameState?.tableCards ?? [];
            leg2TimerRef.current = window.setTimeout(() => {
              useGameStore.getState().setDisplayedTableCards(committedTableCards);
              setFlights(built.leg2);
              leg2TimerRef.current = null;
            }, FLIGHT_DURATION_MS + FLIGHT.GAP_MS);
          }
        } else {
          // Placement: useGameNetwork commits the new table state synchronously
          // for non-capture plays, so the played card is already in the DOM.
          // Read its rect directly. (Fall back to the grid container only if
          // the DOM hasn't caught up yet, which shouldn't happen in practice.)
          const playedRect = tableCardRect(lp.played.id);
          const target = playedRect ?? selectorRect('#table-grid');
          if (target) {
            // Hide the slot card while the flight overlay is in transit so
            // the user doesn't see two copies of the same card.
            useGameStore.getState().setFlightInProgressId(lp.played.id);

            const built = buildDiscardFlights({
              played: lp.played,
              source,
              target,
              size,
              ts: lp.t,
              seat,
            });
            pendingFlightIdsRef.current = new Set(built.ids);
            setFlights(built.flights);
          }
        }
      }
    }

    // After deciding, refresh the mirrors for the *next* render to consume.
    // This re-runs when displayedTableCards changes so positions stay accurate
    // after the delayed board update.
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

    const nextHandRects = new Map<string, Rect>();
    document.querySelectorAll('[data-hand-card-id]').forEach((el) => {
      const id = (el as HTMLElement).getAttribute('data-hand-card-id');
      if (!id) return;
      const r = (el as HTMLElement).getBoundingClientRect();
      if (r.width > 0 && r.height > 0)
        nextHandRects.set(id, { x: r.left, y: r.top, w: r.width, h: r.height });
    });
    prevHandRectsRef.current = nextHandRects;
  }, [gameState, mySeat, playerCount, displayedTableCards]);

  React.useEffect(() => {
    return () => {
      if (leg2TimerRef.current != null) window.clearTimeout(leg2TimerRef.current);
    };
  }, []);

  const clearFlights = React.useCallback(() => setFlights([]), []);

  // Returns true when ALL expected flights for the current play have finished.
  const notifyFlightDone = React.useCallback((id: string): boolean => {
    pendingFlightIdsRef.current.delete(id);
    return pendingFlightIdsRef.current.size === 0;
  }, []);

  return { flights, clearFlights, notifyFlightDone };
}

export default useFlightChoreographer;
