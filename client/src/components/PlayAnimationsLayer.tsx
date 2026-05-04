/* eslint-disable prettier/prettier */
/* eslint linebreak-style: 0 */
import React from 'react';

export type FlightSpec = {
  id: string;
  image: string;
  from: { x: number; y: number; w: number; h: number };
  to: { x: number; y: number; w: number; h: number };
  durationMs?: number;
  easing?: string;
};

export default function PlayAnimationsLayer({
  flights,
  onDone,
}: {
  flights: FlightSpec[];
  onDone?: (id: string) => void;
}) {
  const [active, setActive] = React.useState<FlightSpec[]>([]);
  const watchdogsRef = React.useRef<Map<string, number>>(new Map());
  const seenRef = React.useRef<Set<string>>(new Set());

  const flightKey = flights.map((f) => f.id).join(',');

  React.useEffect(() => {
    if (!flights || flights.length === 0) return;
    setActive((prev) => {
      const existing = new Set(prev.map((x) => x.id));
      // Only add flights we haven't seen before (avoid re-adding completed flights)
      const toAdd = flights.filter((f) => !existing.has(f.id) && !seenRef.current.has(f.id));
      if (toAdd.length === 0) return prev;
      for (const f of toAdd) seenRef.current.add(f.id);
      const next = [...prev, ...toAdd];
      for (const f of toAdd) {
        if (watchdogsRef.current.has(f.id)) continue;
        const dur = (f.durationMs ?? 600) + 400;
        const t = window.setTimeout(() => {
          setActive((cur) => cur.filter((x) => x.id !== f.id));
          watchdogsRef.current.delete(f.id);
          onDone?.(f.id);
        }, dur);
        watchdogsRef.current.set(f.id, t);
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flightKey]);

  const handleFlightEnd = React.useCallback(
    (id: string) => {
      const t = watchdogsRef.current.get(id);
      if (t) { window.clearTimeout(t); watchdogsRef.current.delete(id); }
      setActive((prev) => prev.filter((x) => x.id !== id));
      onDone?.(id);
    },
    [onDone]
  );

  React.useEffect(() => {
    const map = watchdogsRef.current;
    return () => { for (const t of map.values()) window.clearTimeout(t); map.clear(); };
  }, []);

  // Prune very old IDs from the seenRef set to avoid memory leak
  React.useEffect(() => {
    if (seenRef.current.size > 200) {
      const arr = [...seenRef.current];
      seenRef.current = new Set(arr.slice(-50));
    }
  }, [flightKey]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999]" data-flight-layer>
      {active.map((f) => (
        <Flight key={f.id} spec={f} onEnd={() => handleFlightEnd(f.id)} />
      ))}
    </div>
  );
}

function Flight({ spec, onEnd }: { spec: FlightSpec; onEnd: () => void }) {
  const nodeRef = React.useRef<HTMLDivElement | null>(null);
  const onEndRef = React.useRef(onEnd);
  onEndRef.current = onEnd;
  const endedRef = React.useRef(false);

  /*
   * useLayoutEffect — positions the flight element BEFORE the browser paints.
   * This prevents a flash of the element at (0,0) before the transition starts.
   *
   * Since the layer is now `position: fixed; inset: 0`, the flight coordinates
   * (which come from getBoundingClientRect, i.e. viewport-relative) can be used
   * directly without any offset subtraction.
   */
  React.useLayoutEffect(() => {
    const n = nodeRef.current;
    if (!n) return;
    endedRef.current = false;

    const { x: sx, y: sy, w: sw, h: sh } = spec.from;
    const { x: tx, y: ty, w: tw, h: th } = spec.to;

    // Position at start BEFORE paint
    n.style.position = 'absolute';
    n.style.left = '0';
    n.style.top = '0';
    n.style.width = `${sw}px`;
    n.style.height = `${sh}px`;
    n.style.transformOrigin = 'top left';
    n.style.backfaceVisibility = 'hidden';
    n.style.willChange = 'transform';
    n.style.transition = 'none';
    n.style.transform = `translate3d(${sx}px, ${sy}px, 0) scale(1)`;

    // Force reflow — establishes the "from" computed value
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    n.offsetHeight;

    // Set transition + destination — animation begins on next paint
    const dur = spec.durationMs ?? 600;
    const scaleX = sw > 0 ? tw / sw : 1;
    const scaleY = sh > 0 ? th / sh : 1;
    n.style.transition = `transform ${dur}ms ${spec.easing ?? 'cubic-bezier(0.22, 1, 0.36, 1)'}`;
    n.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scaleX}, ${scaleY})`;

    const handle = (e: TransitionEvent) => {
      if (e.propertyName === 'transform' && !endedRef.current) {
        endedRef.current = true;
        onEndRef.current();
      }
    };
    n.addEventListener('transitionend', handle);

    const timer = window.setTimeout(() => {
      if (!endedRef.current) { endedRef.current = true; onEndRef.current(); }
    }, dur + 120);

    const onResize = () => {
      n.removeEventListener('transitionend', handle);
      window.clearTimeout(timer);
      if (!endedRef.current) { endedRef.current = true; onEndRef.current(); }
    };
    window.addEventListener('resize', onResize);

    return () => {
      n.removeEventListener('transitionend', handle);
      window.clearTimeout(timer);
      window.removeEventListener('resize', onResize);
      if (!endedRef.current) { endedRef.current = true; onEndRef.current(); }
    };
  }, [spec.id, spec.from, spec.to, spec.durationMs, spec.easing]);

  return (
    <div ref={nodeRef} className="pointer-events-none" data-flight-id={spec.id}>
      <img
        src={spec.image}
        alt="flying card"
        className="w-full h-full object-cover rounded shadow-lg shadow-black/20"
        draggable={false}
      />
    </div>
  );
}
