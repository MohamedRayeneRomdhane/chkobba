/* eslint-disable prettier/prettier */
/* eslint linebreak-style: 0 */
import React from 'react';
import type { GameState, Card } from '../types';
import { getCardImage, CARD_BACK_IMAGE } from '../game/cardAssets';
import type { FlightSpec } from '../components/PlayAnimationsLayer';

function valueCardDataUri(value: number): string {
  const v = Number.isFinite(value) ? Math.max(0, Math.min(99, Math.round(value))) : 0;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#00f5ff" stop-opacity="0.35"/>
      <stop offset="55%" stop-color="#8b5cf6" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#ff2d95" stop-opacity="0.20"/>
    </linearGradient>
    <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect x="8" y="8" width="184" height="284" rx="18" fill="#ffffff" filter="url(#s)"/>
  <rect x="10" y="10" width="180" height="280" rx="16" fill="url(#g)" opacity="0.9"/>
  <rect x="10" y="10" width="180" height="280" rx="16" fill="none" stroke="#111827" stroke-width="6" opacity="0.9"/>
  <text x="100" y="172" text-anchor="middle" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="96" font-weight="800" fill="#111827">${v}</text>
  <text x="26" y="56" text-anchor="start" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="34" font-weight="800" fill="#111827">${v}</text>
  <text x="174" y="284" text-anchor="end" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="34" font-weight="800" fill="#111827">${v}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function getSeatPos(mySeat: number | null, seatIndex: number): 'bottom' | 'top' | 'left' | 'right' {
  const idxBottom = mySeat ?? 0;
  const idxTop = (idxBottom + 2) % 4;
  const idxLeft = (idxBottom + 3) % 4;
  return seatIndex === idxBottom
    ? 'bottom'
    : seatIndex === idxTop
      ? 'top'
      : seatIndex === idxLeft
        ? 'left'
        : 'right';
}

function getSeatSelector(mySeat: number | null, seatIndex: number): string {
  const pos = getSeatPos(mySeat, seatIndex);
  return `[data-seat-anchor="${pos}"]`;
}

function getSeatCaptureSelector(mySeat: number | null, seatIndex: number): string {
  const pos = getSeatPos(mySeat, seatIndex);
  // Prefer an explicit capture anchor if present, else fall back to the general seat anchor.
  return `[data-seat-capture="${pos}"], [data-seat-anchor="${pos}"]`;
}

function measureRect(selector: string): DOMRect | null {
  const el = document.querySelector(selector) as HTMLElement | null;
  return el ? el.getBoundingClientRect() : null;
}

function measureHandCardRect(cardId: string): DOMRect | null {
  const el = document.querySelector(`[data-hand-card-id="${cardId}"]`) as HTMLElement | null;
  return el ? el.getBoundingClientRect() : null;
}

function measureOpponentCardRect(mySeat: number | null, seatIndex: number): DOMRect | null {
  const seatSel = getSeatSelector(mySeat, seatIndex);
  const el = document.querySelector(`${seatSel} [data-op-card]`) as HTMLElement | null;
  if (el) return el.getBoundingClientRect();
  return measureRect(seatSel);
}

function getTableCardSize(): { w: number; h: number } {
  const el = document.querySelector('[data-card-id]') as HTMLElement | null;
  if (el) {
    const r = el.getBoundingClientRect();
    return { w: r.width, h: r.height };
  }
  // Fallback to a sensible default near the mid of clamp(52px, 9vw, 96px)
  const w = 72;
  const h = Math.round((72 * 3) / 2); // aspect 2/3
  return { w, h };
}

function centerAlign(rect: DOMRect, w: number, h: number): { x: number; y: number } {
  return {
    x: rect.left + rect.width / 2 - w / 2,
    y: rect.top + rect.height / 2 - h / 2,
  };
}

// Helper reserved for future use if needed
// function measureTableCardRect(cardId: string): DOMRect | null {
//   const el = document.querySelector(`[data-card-id="${cardId}"]`) as HTMLElement | null;
//   return el ? el.getBoundingClientRect() : null;
// }

export function usePlayAnimations(
  gameState: GameState | null,
  mySeat: number | null,
  selectedHandCard: Card | null
) {
  const tableRectsPrevRef = React.useRef<Map<string, DOMRect>>(new Map());
  const tableRectsCurrRef = React.useRef<Map<string, DOMRect>>(new Map());
  const pendingThrowTimerRef = React.useRef<number | null>(null);
  const scheduledThrowRef = React.useRef<FlightSpec | null>(null);
  const revealTimerRef = React.useRef<number | null>(null);
  const hiddenTargetRef = React.useRef<HTMLElement | null>(null);
  const captureReturnTimerRef = React.useRef<number | null>(null);
  const hiddenPlayedRef = React.useRef<HTMLElement | null>(null);
  const hiddenPlayedRevealTimerRef = React.useRef<number | null>(null);
  const prevStateRef = React.useRef<GameState | null>(gameState);
  const [flights, setFlights] = React.useState<FlightSpec[]>([]);

  // Track table card rects each render: keep both previous and current snapshot
  React.useEffect(() => {
    const nextMap = new Map<string, DOMRect>();
    document.querySelectorAll('[data-card-id]')?.forEach((el) => {
      const id = (el as HTMLElement).getAttribute('data-card-id');
      if (id) nextMap.set(id, (el as HTMLElement).getBoundingClientRect());
    });
    tableRectsPrevRef.current = tableRectsCurrRef.current;
    tableRectsCurrRef.current = nextMap;
  });

  React.useEffect(() => {
    const prev = prevStateRef.current;
    const next = gameState;
    prevStateRef.current = next;
    if (!prev || !next) return;

    const prevTable = prev.tableCards || [];
    const nextTable = next.tableCards || [];
    const prevIds = new Set(prevTable.map((c) => c.id));
    const nextIds = new Set(nextTable.map((c) => c.id));

    const capturedIds: string[] = [];
    prevIds.forEach((id) => {
      if (!nextIds.has(id)) capturedIds.push(id);
    });
    const addedIds: string[] = [];
    nextIds.forEach((id) => {
      if (!prevIds.has(id)) addedIds.push(id);
    });

    const prevHands = prev.hands || [];
    const nextHands = next.hands || [];

    // Determine played seat by hand size decreased.
    // Note: the server hides opponent hands (empty arrays) but provides `handSizes`.
    const prevSizes: number[] = (prev as unknown as { handSizes?: number[] }).handSizes
      ? ((prev as unknown as { handSizes: number[] }).handSizes ?? []).slice(0, 4)
      : [0, 1, 2, 3].map((i) => (prevHands[i] || []).length);
    const nextSizes: number[] = (next as unknown as { handSizes?: number[] }).handSizes
      ? ((next as unknown as { handSizes: number[] }).handSizes ?? []).slice(0, 4)
      : [0, 1, 2, 3].map((i) => (nextHands[i] || []).length);

    let playedSeat: number | null = null;
    for (let i = 0; i < 4; i++) {
      const p = prevSizes[i] ?? 0;
      const n = nextSizes[i] ?? 0;
      if (n < p) {
        playedSeat = i;
        break;
      }
    }
    if (playedSeat == null) return;

    // Identify the actual played card by diffing the hands
    const prevHand = prevHands[playedSeat] || [];
    const nextHand = nextHands[playedSeat] || [];
    const nextIdsSet = new Set(nextHand.map((c) => c.id));
    const playedCardObj: Card | null = prevHand.find((c) => !nextIdsSet.has(c.id)) || null;

    // Decide what to show for the flying "played" card.
    // Opponent hands may be hidden (empty arrays), so we use server-provided `lastPlay`
    // (public metadata) and only fall back if we truly cannot resolve a face.
    const lastPlay = (next as unknown as { lastPlay?: { seatIndex: number; played: Card } })
      .lastPlay;
    let playedImage: string =
      lastPlay && lastPlay.seatIndex === playedSeat && lastPlay.played
        ? getCardImage(lastPlay.played)
        : playedCardObj
          ? getCardImage(playedCardObj)
          : CARD_BACK_IMAGE;

    // Only use heuristics if we still have no face.
    if (playedImage === CARD_BACK_IMAGE && addedIds.length > 0) {
      const addedCard = nextTable.find((c) => c.id === addedIds[0]) || null;
      if (addedCard) playedImage = getCardImage(addedCard);
    }
    if (playedImage === CARD_BACK_IMAGE && capturedIds.length > 0) {
      const capCards = capturedIds
        .map((id) => prevTable.find((c) => c.id === id) || null)
        .filter((c): c is Card => !!c);
      const sumValue = capCards.reduce((s, c) => s + (c.value ?? 0), 0);
      if (sumValue > 0) playedImage = valueCardDataUri(sumValue);
    }

    const flightsLocal: FlightSpec[] = [];

    // Source: prefer actual hand card element when it's me
    const myPlayedRect =
      selectedHandCard && playedSeat === (mySeat ?? -1)
        ? measureHandCardRect(selectedHandCard.id) ||
          measureRect(getSeatSelector(mySeat, playedSeat))
        : measureOpponentCardRect(mySeat, playedSeat);
    if (!myPlayedRect) return;

    const tableCenter =
      document.getElementById('table-grid')?.getBoundingClientRect() || myPlayedRect;

    if (capturedIds.length > 0) {
      // Cancel any pending throw flight if a capture is confirmed
      if (pendingThrowTimerRef.current) {
        window.clearTimeout(pendingThrowTimerRef.current);
        pendingThrowTimerRef.current = null;
        scheduledThrowRef.current = null;
      }
      // If the played card element appears on the table (transiently), hide it until after the animation
      if (playedCardObj?.id) {
        const playedOnTableEl = document.querySelector(
          `[data-card-id="${playedCardObj.id}"]`
        ) as HTMLElement | null;
        if (playedOnTableEl) {
          // Clear any previous hidden
          if (hiddenPlayedRef.current) hiddenPlayedRef.current.style.visibility = '';
          playedOnTableEl.style.visibility = 'hidden';
          hiddenPlayedRef.current = playedOnTableEl;
          if (hiddenPlayedRevealTimerRef.current)
            window.clearTimeout(hiddenPlayedRevealTimerRef.current);
          hiddenPlayedRevealTimerRef.current = window.setTimeout(() => {
            if (hiddenPlayedRef.current) {
              hiddenPlayedRef.current.style.visibility = '';
              hiddenPlayedRef.current = null;
            }
            hiddenPlayedRevealTimerRef.current = null;
          }, 1400); // longer than both legs
        }
      }
      // Ensure any previously hidden target is revealed
      if (hiddenTargetRef.current) {
        hiddenTargetRef.current.style.visibility = '';
        hiddenTargetRef.current = null;
      }
      if (revealTimerRef.current) {
        window.clearTimeout(revealTimerRef.current);
        revealTimerRef.current = null;
      }
      // Played card flies to first captured card position
      const candidateRects = capturedIds
        .map((id) => tableRectsPrevRef.current.get(id) || null)
        .filter((r): r is DOMRect => !!r);
      let targetRect = candidateRects[0] || tableCenter;
      if (candidateRects.length > 1) {
        const sCx = myPlayedRect.left + myPlayedRect.width / 2;
        const sCy = myPlayedRect.top + myPlayedRect.height / 2;
        let best = candidateRects[0];
        let bestD = Infinity;
        for (const r of candidateRects) {
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const d = Math.hypot(cx - sCx, cy - sCy);
          if (d < bestD) {
            bestD = d;
            best = r;
          }
        }
        targetRect = best;
      }
      const img = playedImage;
      const tableSize = getTableCardSize();
      const leg1DurationMs = 820;
      const leg1Ease = 'cubic-bezier(0.25, 0.9, 0.25, 1)';
      const start = centerAlign(myPlayedRect, tableSize.w, tableSize.h);
      // Leg 1: Played card flies to the captured card position immediately
      flightsLocal.push({
        id: `played-${playedSeat}-${Date.now()}`,
        image: img,
        from: { x: start.x, y: start.y, w: tableSize.w, h: tableSize.h },
        to: { x: targetRect.left, y: targetRect.top, w: tableSize.w, h: tableSize.h },
        durationMs: leg1DurationMs,
        easing: leg1Ease,
      });
      // Prepare return flights (leg 2) for captured cards and the played card together
      const seatRect =
        playedSeat === (mySeat ?? -1)
          ? measureRect(getSeatCaptureSelector(mySeat, playedSeat)) || myPlayedRect
          : measureOpponentCardRect(mySeat, playedSeat) || myPlayedRect;
      const returnFlights: FlightSpec[] = [];
      for (const id of capturedIds) {
        const capRect = tableRectsPrevRef.current.get(id);
        if (!capRect) continue;
        const cardObj = prevTable.find((c) => c.id === id) || null;
        const capImg = cardObj ? getCardImage(cardObj) : CARD_BACK_IMAGE;
        returnFlights.push({
          id: `captured-${id}-${Date.now()}`,
          image: capImg,
          from: { x: capRect.left, y: capRect.top, w: capRect.width, h: capRect.height },
          // keep size constant on return to avoid growth effect
          to: { x: seatRect.left, y: seatRect.top, w: capRect.width, h: capRect.height },
          durationMs: 750,
        });
      }
      // Include the played card returning with the others
      returnFlights.push({
        id: `played-return-${playedSeat}-${Date.now()}`,
        image: playedImage,
        from: { x: targetRect.left, y: targetRect.top, w: tableSize.w, h: tableSize.h },
        // keep size constant on return to avoid growth effect
        to: { x: seatRect.left, y: seatRect.top, w: tableSize.w, h: tableSize.h },
        durationMs: 750,
      });
      // Schedule leg 2 to start right after leg 1 completes
      if (captureReturnTimerRef.current) window.clearTimeout(captureReturnTimerRef.current);
      captureReturnTimerRef.current = window.setTimeout(() => {
        setFlights((prev) => [...prev, ...returnFlights]);
        captureReturnTimerRef.current = null;
      }, leg1DurationMs);
    } else if (addedIds.length > 0) {
      // Discard (thrown to table): schedule overlay slightly delayed
      const newId = addedIds[0];
      const targetEl = document.querySelector(`[data-card-id="${newId}"]`) as HTMLElement | null;
      const targetRect = targetEl ? targetEl.getBoundingClientRect() : tableCenter;
      const sourceRect = myPlayedRect;
      const tableSize = getTableCardSize();
      const img = playedImage;
      const leg1Ease = 'cubic-bezier(0.25, 0.9, 0.25, 1)';
      const start = centerAlign(sourceRect, tableSize.w, tableSize.h);
      // Hide the real table card until the overlay finishes to avoid early appearance
      if (targetEl) {
        targetEl.style.visibility = 'hidden';
        hiddenTargetRef.current = targetEl;
      }
      // Prepare the flight but delay emitting; cancel if a capture comes in shortly after
      const spec: FlightSpec = {
        id: `played-${playedSeat}-${Date.now()}`,
        image: img,
        from: { x: start.x, y: start.y, w: tableSize.w, h: tableSize.h },
        to: { x: targetRect.left, y: targetRect.top, w: tableSize.w, h: tableSize.h },
        durationMs: 750,
        easing: leg1Ease,
      };
      scheduledThrowRef.current = spec;
      if (pendingThrowTimerRef.current) window.clearTimeout(pendingThrowTimerRef.current);
      pendingThrowTimerRef.current = window.setTimeout(() => {
        if (scheduledThrowRef.current) {
          setFlights([scheduledThrowRef.current]);
        }
        scheduledThrowRef.current = null;
        pendingThrowTimerRef.current = null;
        // Reveal target after the flight duration to avoid premature appearance
        if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current);
        revealTimerRef.current = window.setTimeout(() => {
          if (hiddenTargetRef.current) {
            hiddenTargetRef.current.style.visibility = '';
            hiddenTargetRef.current = null;
          }
          revealTimerRef.current = null;
        }, spec.durationMs ?? 750);
      }, 250);
    }

    if (flightsLocal.length) setFlights(flightsLocal);
  }, [gameState, mySeat, selectedHandCard]);

  const clearFlights = React.useCallback(() => setFlights([]), []);

  // Cleanup any pending timers on unmount
  React.useEffect(() => {
    return () => {
      if (pendingThrowTimerRef.current) {
        window.clearTimeout(pendingThrowTimerRef.current);
        pendingThrowTimerRef.current = null;
      }
      if (captureReturnTimerRef.current) {
        window.clearTimeout(captureReturnTimerRef.current);
        captureReturnTimerRef.current = null;
      }
      if (revealTimerRef.current) {
        window.clearTimeout(revealTimerRef.current);
        revealTimerRef.current = null;
      }
      if (hiddenTargetRef.current) {
        hiddenTargetRef.current.style.visibility = '';
        hiddenTargetRef.current = null;
      }
      if (hiddenPlayedRevealTimerRef.current) {
        window.clearTimeout(hiddenPlayedRevealTimerRef.current);
        hiddenPlayedRevealTimerRef.current = null;
      }
      if (hiddenPlayedRef.current) {
        hiddenPlayedRef.current.style.visibility = '';
        hiddenPlayedRef.current = null;
      }
      scheduledThrowRef.current = null;
    };
  }, []);

  return { flights, clearFlights } as const;
}

export default usePlayAnimations;
