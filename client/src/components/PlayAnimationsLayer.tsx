/* eslint-disable prettier/prettier */
/* eslint linebreak-style: 0 */
import React from 'react';

export type FlightSpec = {
  id: string;
  image: string; // image source
  from: { x: number; y: number; w: number; h: number };
  to: { x: number; y: number; w: number; h: number };
  durationMs?: number;
};

function centerOf(r: { x: number; y: number; w: number; h: number }) {
  return { cx: r.x + r.w / 2, cy: r.y + r.h / 2 };
}

export default function PlayAnimationsLayer({
  flights,
  onDone,
}: {
  flights: FlightSpec[];
  onDone?: (id: string) => void;
}) {
  const [active, setActive] = React.useState<FlightSpec[]>([]);
  const watchdogsRef = React.useRef<Map<string, number>>(new Map());

  React.useEffect(() => {
    if (!flights || flights.length === 0) return;
    setActive((prev) => {
      const existing = new Set(prev.map((x) => x.id));
      const toAdd = flights.filter((f) => !existing.has(f.id));
      if (toAdd.length === 0) return prev;
      const next = [...prev, ...toAdd];
      // Set watchdogs for any newly added flights only
      for (const f of toAdd) {
        if (watchdogsRef.current.has(f.id)) continue;
        const dur = (f.durationMs ?? 600) + 300;
        const t = window.setTimeout(() => {
          // remove if still present
          setActive((cur) => cur.filter((x) => x.id !== f.id));
          watchdogsRef.current.delete(f.id);
          onDone?.(f.id);
        }, dur);
        watchdogsRef.current.set(f.id, t);
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(flights)]);

  // Clear watchdog when a flight ends
  const handleFlightEnd = React.useCallback(
    (id: string) => {
      const t = watchdogsRef.current.get(id);
      if (t) {
        window.clearTimeout(t);
        watchdogsRef.current.delete(id);
      }
      setActive((prev) => prev.filter((x) => x.id !== id));
      onDone?.(id);
    },
    [onDone]
  );

  // Cleanup all watchdogs on unmount
  React.useEffect(() => {
    return () => {
      for (const t of watchdogsRef.current.values()) window.clearTimeout(t);
      watchdogsRef.current.clear();
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]" data-flight-layer>
      {active.map((f) => (
        <Flight
          key={f.id}
          spec={f}
          onEnd={() => handleFlightEnd(f.id)}
        />
      ))}
    </div>
  );
}

function Flight({ spec, onEnd }: { spec: FlightSpec; onEnd: () => void }) {
  const nodeRef = React.useRef<HTMLDivElement | null>(null);
  // Keep a stable reference to onEnd so effect isn't restarted by re-renders
  const onEndRef = React.useRef(onEnd);
  onEndRef.current = onEnd;
  // Ensure we only signal completion once per flight
  const endedRef = React.useRef(false);

  React.useEffect(() => {
    const n = nodeRef.current;
    if (!n) return;
    endedRef.current = false;
    const { x: sx, y: sy, w: sw, h: sh } = spec.from;
    const { x: tx, y: ty, w: tw, h: th } = spec.to;
    // Prepare element at start using top-left coordinates with scale(1)
    n.style.transformOrigin = 'top left';
    n.style.backfaceVisibility = 'hidden';
    n.style.transformStyle = 'preserve-3d';
    n.style.transform = `translate3d(${sx}px, ${sy}px, 0) scale(1)`;
    n.style.width = `${sw}px`;
    n.style.height = `${sh}px`;
    // force reflow
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    n.offsetHeight;
    const dur = spec.durationMs ?? 600;
    const scaleX = sw ? tw / sw : 1;
    const scaleY = sh ? th / sh : 1;
    // Slightly snappier ease-out curve for cards
    n.style.transition = `transform ${dur}ms cubic-bezier(0.16, 1, 0.3, 1)`;
    n.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scaleX}, ${scaleY})`;
    const handle = (e: TransitionEvent) => {
      if (e.propertyName === 'transform' && !endedRef.current) {
        endedRef.current = true;
        onEndRef.current();
      }
    };
    n.addEventListener('transitionend', handle);
    // Safety timeout: ensure cleanup even if transitionend is interrupted
    const timer = window.setTimeout(() => {
      if (!endedRef.current) {
        endedRef.current = true;
        onEndRef.current();
      }
    }, dur + 80);
    // Clear on window resize to avoid stuck overlays
    const onResize = () => {
      n.removeEventListener('transitionend', handle);
      window.clearTimeout(timer);
      if (!endedRef.current) {
        endedRef.current = true;
        onEndRef.current();
      }
    };
    window.addEventListener('resize', onResize);
    return () => {
      n.removeEventListener('transitionend', handle);
      window.clearTimeout(timer);
      window.removeEventListener('resize', onResize);
      // If effect is torn down before completion (spec restarts/unmount), finalize
      if (!endedRef.current) {
        endedRef.current = true;
        onEndRef.current();
      }
    };
  }, [spec.id]);

  return (
    <div ref={nodeRef} className="absolute left-0 top-0 will-change-transform pointer-events-none" data-flight-id={spec.id}>
      <img src={spec.image} alt="flying card" className="w-full h-full object-cover rounded shadow-lg shadow-black/20" draggable={false} />
    </div>
  );
}
