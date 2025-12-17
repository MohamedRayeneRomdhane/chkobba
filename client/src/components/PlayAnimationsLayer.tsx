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

  React.useEffect(() => {
    if (!flights || flights.length === 0) return;
    setActive((prev) => [...prev, ...flights]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(flights)]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      {active.map((f) => (
        <Flight
          key={f.id}
          spec={f}
          onEnd={() => {
            setActive((prev) => prev.filter((x) => x.id !== f.id));
            onDone?.(f.id);
          }}
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

  React.useEffect(() => {
    const n = nodeRef.current;
    if (!n) return;
    const { x: sx, y: sy, w: sw, h: sh } = spec.from;
    const { x: tx, y: ty, w: tw, h: th } = spec.to;
    const s = centerOf({ x: sx, y: sy, w: sw, h: sh });
    const t = centerOf({ x: tx, y: ty, w: tw, h: th });
    const dx = t.cx - s.cx;
    const dy = t.cy - s.cy;
    // Position at start
    n.style.transform = `translate(${sx}px, ${sy}px)`;
    n.style.width = `${sw}px`;
    n.style.height = `${sh}px`;
    // force reflow
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    n.offsetHeight;
    const dur = spec.durationMs ?? 600;
    n.style.transition = `transform ${dur}ms cubic-bezier(0.22,1,0.36,1)`;
    n.style.transform = `translate(${sx + dx}px, ${sy + dy}px)`;
    const handle = (e: TransitionEvent) => {
      if (e.propertyName === 'transform') onEndRef.current();
    };
    n.addEventListener('transitionend', handle);
    // Safety timeout: ensure cleanup even if transitionend is interrupted
    const timer = window.setTimeout(() => onEndRef.current(), dur + 50);
    // Clear on window resize to avoid stuck overlays
    const onResize = () => {
      n.removeEventListener('transitionend', handle);
      window.clearTimeout(timer);
      onEndRef.current();
    };
    window.addEventListener('resize', onResize);
    return () => {
      n.removeEventListener('transitionend', handle);
      window.clearTimeout(timer);
      window.removeEventListener('resize', onResize);
    };
  }, [spec]);

  return (
    <div ref={nodeRef} className="absolute left-0 top-0 will-change-transform pointer-events-none">
      <img src={spec.image} alt="flying card" className="w-full h-full object-cover rounded" />
    </div>
  );
}
