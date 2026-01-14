import React from 'react';

type Props = {
  position: 'bottom' | 'top' | 'left' | 'right';
  avatar?: string;
  nickname?: string;
  highlight?: boolean;
  turnEndsAt?: number; // epoch ms (server time)
  turnDurationMs?: number;
  clockSkewMs?: number; // serverNow - clientNow
  teamLabel?: string;
  teamIndex?: 0 | 1;
  compact?: boolean;
  dense?: boolean;
  absolute?: boolean;
  actionIconSrc?: string;
  actionIconAlt?: string;
  actionIconTitle?: string;
  onActionClick?: () => void;
  speaking?: boolean;
  speakBars?: number[]; // 0..1 normalized per-bar levels for sound-reactive UI
};

export default function SeatPanel({
  position,
  avatar,
  nickname,
  highlight,
  turnEndsAt,
  turnDurationMs,
  clockSkewMs,
  teamLabel,
  teamIndex,
  compact,
  dense,
  absolute = true,
  actionIconSrc,
  actionIconAlt,
  actionIconTitle,
  onActionClick,
  speaking,
  speakBars,
}: Props) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const uid = React.useId();
  const svgUid = React.useMemo(() => uid.replace(/[^a-zA-Z0-9_-]/g, '_'), [uid]);
  const eqPathRef = React.useRef<SVGPathElement | null>(null);
  const vertical = position === 'left' || position === 'right';
  const isLeft = position === 'left';
  const isRight = position === 'right';
  const showAction = !!actionIconSrc && typeof onActionClick === 'function';
  // Only reserve header space for vertical panels where the action badge/button is overlaid.
  // Soundboard visuals are overlays and shouldn't affect layout.
  const headerPadPx = vertical && showAction ? 30 : 0;
  // Responsive scales using CSS clamp to adapt across screen sizes
  const avatarSize = dense
    ? 'clamp(12px, 2vw, 18px)'
    : compact
      ? 'clamp(14px, 2.4vw, 22px)'
      : 'clamp(20px, 3.2vw, 30px)';
  const gap = dense
    ? 'clamp(1px, 0.6vw, 4px)'
    : compact
      ? 'clamp(2px, 0.8vw, 6px)'
      : 'clamp(4px, 1vw, 8px)';
  const pad = dense
    ? 'clamp(2px, 0.6vw, 4px)'
    : compact
      ? 'clamp(3px, 0.8vw, 6px)'
      : 'clamp(4px, 1vw, 8px)';
  const radius = dense
    ? 'clamp(4px, 0.7vw, 6px)'
    : compact
      ? 'clamp(4px, 0.8vw, 6px)'
      : 'clamp(6px, 1vw, 8px)';
  const nameFontSize = dense
    ? 'clamp(9px, 1.2vw, 11px)'
    : compact
      ? 'clamp(10px, 1.4vw, 12px)'
      : 'clamp(11px, 1.4vw, 13px)';
  const turnFontSize = dense
    ? 'clamp(8px, 1.1vw, 10px)'
    : compact
      ? 'clamp(9px, 1.3vw, 11px)'
      : 'clamp(10px, 1.3vw, 12px)';

  // Anchor offsets responsive to viewport
  const bottomOffset = dense
    ? 'clamp(4px, 1.2vh, 8px)'
    : compact
      ? 'clamp(6px, 1.6vh, 12px)'
      : 'clamp(10px, 2.2vh, 18px)';
  const topOffset = dense
    ? 'clamp(6px, 2.4vh, 16px)'
    : compact
      ? 'clamp(12px, 4vh, 28px)'
      : 'clamp(18px, 5vh, 40px)';
  const sideOffset = dense
    ? 'clamp(6px, 2vw, 16px)'
    : compact
      ? 'clamp(10px, 3.5vw, 28px)'
      : 'clamp(16px, 4vw, 44px)';

  const baseStyle: React.CSSProperties = {
    position: absolute ? 'absolute' : 'relative',
    display: vertical ? 'flex' : compact ? (showAction || speaking ? 'flex' : 'grid') : 'flex',
    flexDirection: vertical ? 'column' : undefined,
    justifyContent: vertical ? (headerPadPx ? 'flex-start' : 'center') : undefined,
    gridTemplateColumns: !vertical && compact ? `${avatarSize} auto` : undefined,
    gridAutoFlow: !vertical && compact ? 'column' : undefined,
    alignItems: 'center',
    textAlign: vertical ? 'center' : undefined,
    gap,
    padding: pad,
    paddingTop: headerPadPx ? `calc(${pad} + ${headerPadPx}px)` : pad,
    borderRadius: radius as unknown as number, // TS accepts string but keep cast for safety
    background: highlight ? 'rgba(255,240,180,0.95)' : 'rgba(255,255,255,0.9)',
    boxShadow: highlight ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.2)',
    border: highlight ? '2px solid #e0c200' : '1px solid #b08968',
    WebkitBackdropFilter: 'blur(2px)',
    backdropFilter: 'blur(2px)',
    overflow: 'visible',
  };

  const posStyle: React.CSSProperties = !absolute
    ? {}
    : position === 'bottom'
      ? { bottom: bottomOffset, left: '50%', transform: 'translateX(-50%)' }
      : position === 'top'
        ? { top: topOffset, left: '50%', transform: 'translateX(-50%)' }
        : position === 'left'
          ? { left: sideOffset, top: '50%', transform: 'translateY(-50%)' }
          : { right: sideOffset, top: '50%', transform: 'translateY(-50%)' };

  const ringPathRef = React.useRef<SVGPathElement | null>(null);
  const rafRef = React.useRef<number | null>(null);

  const [ringGeom, setRingGeom] = React.useState<{
    w: number;
    h: number;
    r: number;
    inset: number;
    clipR: number;
    stroke: number;
  } | null>(null);

  React.useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const compute = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(0, rect.width);
      const h = Math.max(0, rect.height);
      if (w === 0 || h === 0) return;

      const cs = window.getComputedStyle(el);
      // SeatPanel uses a single borderRadius value; read computed px.
      const rPx = Number.parseFloat(cs.borderTopLeftRadius || '0') || 0;
      const borderW = Number.parseFloat(cs.borderTopWidth || '0') || 0;

      const minDim = Math.max(1, Math.min(w, h));
      // Stroke adapts to seat size (keeps the ring visually consistent).
      const stroke = Math.max(3, Math.min(6, Math.round(minDim * 0.06)));
      // We want the ring to visually hug the seat border. Using borderW/2 allows
      // a tiny overrun (since stroke is thicker than the border) which we clip.
      const inset = Math.max(0, borderW / 2);
      const maxR = Math.max(0, Math.min((w - inset * 2) / 2, (h - inset * 2) / 2));
      const r = Math.max(0, Math.min(rPx, maxR));
      const clipR = Math.max(0, Math.min(rPx, w / 2, h / 2));

      setRingGeom((prev) => {
        if (
          prev &&
          Math.abs(prev.w - w) < 0.5 &&
          Math.abs(prev.h - h) < 0.5 &&
          Math.abs(prev.r - r) < 0.5 &&
          Math.abs(prev.inset - inset) < 0.5 &&
          Math.abs(prev.clipR - clipR) < 0.5 &&
          Math.abs(prev.stroke - stroke) < 0.5
        ) {
          return prev;
        }
        return { w, h, r, inset, clipR, stroke };
      });
    };

    compute();
    const ro = new ResizeObserver(() => compute());
    ro.observe(el);

    return () => ro.disconnect();
  }, [highlight]);

  const ringPathD = React.useMemo(() => {
    if (!ringGeom) return null;
    const { w, h, r, inset } = ringGeom;

    const left = inset;
    const top = inset;
    const right = w - inset;
    const bottom = h - inset;

    const rr = Math.max(0, Math.min(r, (right - left) / 2, (bottom - top) / 2));
    const startX = w / 2;

    // Start at top-center so the countdown feels consistent.
    return [
      `M ${startX} ${top}`,
      `H ${right - rr}`,
      `A ${rr} ${rr} 0 0 1 ${right} ${top + rr}`,
      `V ${bottom - rr}`,
      `A ${rr} ${rr} 0 0 1 ${right - rr} ${bottom}`,
      `H ${left + rr}`,
      `A ${rr} ${rr} 0 0 1 ${left} ${bottom - rr}`,
      `V ${top + rr}`,
      `A ${rr} ${rr} 0 0 1 ${left + rr} ${top}`,
      `H ${startX}`,
    ].join(' ');
  }, [ringGeom]);

  const makeRoundedRectPath = React.useCallback(
    (geom: { w: number; h: number; r: number; inset: number }, extraOutsetPx: number) => {
      const { w, h, r, inset } = geom;
      const insetEq = inset - extraOutsetPx;

      const left = insetEq;
      const top = insetEq;
      const right = w - insetEq;
      const bottom = h - insetEq;

      const rrTarget = r + extraOutsetPx;
      const rr = Math.max(0, Math.min(rrTarget, (right - left) / 2, (bottom - top) / 2));
      const startX = w / 2;

      return [
        `M ${startX} ${top}`,
        `H ${right - rr}`,
        `A ${rr} ${rr} 0 0 1 ${right} ${top + rr}`,
        `V ${bottom - rr}`,
        `A ${rr} ${rr} 0 0 1 ${right - rr} ${bottom}`,
        `H ${left + rr}`,
        `A ${rr} ${rr} 0 0 1 ${left} ${bottom - rr}`,
        `V ${top + rr}`,
        `A ${rr} ${rr} 0 0 1 ${left + rr} ${top}`,
        `H ${startX}`,
      ].join(' ');
    },
    []
  );

  React.useEffect(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (!highlight) return;
    if (typeof turnEndsAt !== 'number' || typeof turnDurationMs !== 'number') return;
    if (!ringPathD) return;

    const skew = typeof clockSkewMs === 'number' ? clockSkewMs : 0;

    const tick = () => {
      const path = ringPathRef.current;
      if (!path) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const now = Date.now() + skew;
      const remaining = turnEndsAt - now;
      const progress = Math.max(0, Math.min(1, remaining / Math.max(1, turnDurationMs)));

      path.setAttribute('stroke-dashoffset', `${(1 - progress) * 100}`);
      path.setAttribute('stroke', `hsl(${Math.round(progress * 120)}, 92%, 54%)`);

      if (remaining > 0) rafRef.current = requestAnimationFrame(tick);
      else rafRef.current = null;
    };

    tick();
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [highlight, turnEndsAt, turnDurationMs, clockSkewMs, ringPathD]);

  const [fallbackBars, setFallbackBars] = React.useState<number[] | null>(null);

  React.useEffect(() => {
    // Some browsers don't support captureStream-based analysis. If we are "speaking" but
    // have no bar data, show a synthetic spike pattern so it still reads like sound.
    if (!speaking) {
      setFallbackBars(null);
      return;
    }
    if ((speakBars?.length ?? 0) > 0) {
      setFallbackBars(null);
      return;
    }

    const BARS = 48;
    const startT = performance.now();
    const phase = Math.random() * Math.PI * 2;
    let raf: number | null = null;

    const tick = () => {
      const t = (performance.now() - startT) / 1000;
      const vals: number[] = [];
      for (let i = 0; i < BARS; i++) {
        const x = i / BARS;
        const wave = 0.55 + 0.45 * Math.sin(phase + t * 6.2 + x * Math.PI * 2);
        const wobble = 0.18 * Math.sin(phase * 0.37 + t * 2.4 + i * 0.9);
        const v = Math.max(0, Math.min(1, wave + wobble));
        vals.push(Math.round(v * 100) / 100);
      }
      setFallbackBars(vals);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [speaking, speakBars]);

  const effectiveBars = React.useMemo(() => {
    const bars = (speakBars?.length ?? 0) > 0 ? speakBars : fallbackBars;
    return bars ?? null;
  }, [speakBars, fallbackBars]);

  const speakLevels = React.useMemo(() => {
    const raw = (effectiveBars ?? []).filter((v) => Number.isFinite(v)) as number[];
    if (raw.length === 0) return null;

    // Always render a dense ring so spikes appear all around the seat,
    // even if the analyser provides fewer bars.
    const TARGET = 48;
    const base = raw.map((v) => Math.max(0, Math.min(1, v)));

    const clamped: number[] = [];
    if (base.length === 1) {
      for (let i = 0; i < TARGET; i++) clamped.push(base[0]);
    } else {
      for (let i = 0; i < TARGET; i++) {
        const t = i / (TARGET - 1);
        const pos = t * (base.length - 1);
        const i0 = Math.floor(pos);
        const i1 = Math.min(base.length - 1, i0 + 1);
        const f = pos - i0;
        clamped.push(base[i0] * (1 - f) + base[i1] * f);
      }
    }

    const avg = clamped.reduce((s, v) => s + v, 0) / clamped.length;
    return { clamped, avg };
  }, [effectiveBars]);

  const showSpeakRing = (speaking || !!speakLevels) && !!ringGeom && !!ringPathD;

  const eqOutsetPx = React.useMemo(() => {
    if (!ringGeom) return 10;
    // Scale with the seat so it reads well on both compact and larger panels.
    const minDim = Math.max(1, Math.min(ringGeom.w, ringGeom.h));
    return Math.round(Math.max(10, Math.min(18, minDim * 0.12)));
  }, [ringGeom]);

  const eqPathD = React.useMemo(() => {
    if (!ringGeom) return null;
    return makeRoundedRectPath(ringGeom, eqOutsetPx);
  }, [ringGeom, eqOutsetPx, makeRoundedRectPath]);

  const [spikeAnchors, setSpikeAnchors] = React.useState<Array<{
    x: number;
    y: number;
    nx: number;
    ny: number;
  }> | null>(null);

  React.useLayoutEffect(() => {
    const path = eqPathRef.current;
    const bars = speakLevels?.clamped.length ?? 0;
    if (!path || !eqPathD || !ringGeom || bars <= 0) {
      setSpikeAnchors(null);
      return;
    }

    let total = 0;
    try {
      total = path.getTotalLength();
    } catch (e) {
      void e;
      setSpikeAnchors(null);
      return;
    }
    if (!Number.isFinite(total) || total <= 1) {
      setSpikeAnchors(null);
      return;
    }

    const eps = Math.max(0.5, total / 1200);
    const anchors: Array<{ x: number; y: number; nx: number; ny: number }> = [];

    for (let i = 0; i < bars; i++) {
      const l = (i / bars) * total;
      const p = path.getPointAtLength(l);
      const p2 = path.getPointAtLength(Math.min(total, l + eps));
      const dx = p2.x - p.x;
      const dy = p2.y - p.y;
      const mag = Math.max(1e-6, Math.hypot(dx, dy));

      // Our path is clockwise; outward normal is to the "right" of the tangent.
      const nx = dy / mag;
      const ny = -dx / mag;
      anchors.push({ x: p.x, y: p.y, nx, ny });
    }

    setSpikeAnchors(anchors);
  }, [eqPathD, ringGeom, speakLevels?.clamped.length]);

  return (
    <div ref={containerRef} style={{ ...baseStyle, ...posStyle }}>
      {showSpeakRing && ringGeom && eqPathD && (
        <svg
          viewBox={`0 0 ${ringGeom.w} ${ringGeom.h}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            // Keep spikes above other overlays like the turn timer ring.
            zIndex: 4,
            overflow: 'visible',
            // Do not animate/scale the entire overlay (reads like a pulsing box).
            // Spike intensity is driven per-bar.
            opacity: 1,
            filter:
              'drop-shadow(0 4px 16px rgba(0,0,0,0.28)) drop-shadow(0 0 26px rgba(0,245,255,0.55)) drop-shadow(0 0 24px rgba(139,92,246,0.42)) drop-shadow(0 0 22px rgba(255,45,149,0.34))',
          }}
        >
          <defs>
            <linearGradient
              id={`${svgUid}-seat-eq-grad`}
              gradientUnits="userSpaceOnUse"
              x1={0}
              y1={0}
              x2={ringGeom.w}
              y2={ringGeom.h}
            >
              <stop offset="0%" stopColor="#00f5ff" />
              <stop offset="32%" stopColor="#8b5cf6" />
              <stop offset="62%" stopColor="#ff2d95" />
              <stop offset="100%" stopColor="#ffd000" />
            </linearGradient>
          </defs>

          {/* Hidden path used for measuring perimeter points */}
          <path ref={eqPathRef} d={eqPathD} fill="none" stroke="transparent" strokeWidth={1} />

          {/* Equalizer spikes: outward bars whose length follows audio */}
          {spikeAnchors &&
            (speakLevels?.clamped ?? []).map((v, i) => {
              const a = spikeAnchors[i];
              if (!a) return null;

              const minDim = Math.max(1, Math.min(ringGeom.w, ringGeom.h));
              // Shorter spikes: keep them punchy but not huge.
              const baseLen = Math.max(6, Math.round(minDim * 0.05));
              const extraLen = Math.max(8, Math.round(minDim * 0.11));
              const len = baseLen + v * extraLen;

              // Offset outward so the spikes don't visually merge into the seat border.
              const startOut = 5;
              const x1 = a.x + a.nx * startOut;
              const y1 = a.y + a.ny * startOut;
              const x2 = a.x + a.nx * (startOut + len);
              const y2 = a.y + a.ny * (startOut + len);

              // Thinner spikes: reduce width range.
              const wMin = Math.max(2, Math.round(minDim * 0.01));
              const wMax = Math.max(6, Math.round(minDim * 0.022));
              const sw = wMin + v * (wMax - wMin);

              const alpha = 0.35 + v * 0.65;

              return (
                <g key={i}>
                  {/* Dark outline: keeps spikes visible on bright/white seat panels */}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="rgba(0,0,0,0.48)"
                    strokeWidth={sw + 1}
                    strokeLinecap="round"
                    opacity={alpha * 0.6}
                  />
                  {/* Neon spike */}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={`url(#${svgUid}-seat-eq-grad)`}
                    strokeWidth={sw}
                    strokeLinecap="round"
                    opacity={alpha}
                  />
                </g>
              );
            })}
        </svg>
      )}

      {highlight &&
        typeof turnEndsAt === 'number' &&
        typeof turnDurationMs === 'number' &&
        ringGeom &&
        ringPathD && (
          <svg
            className="seat-timer-ring"
            viewBox={`0 0 ${ringGeom.w} ${ringGeom.h}`}
            preserveAspectRatio="none"
            aria-hidden="true"
            style={{
              overflow: 'visible',
              clipPath: `inset(0 round ${ringGeom.clipR}px)`,
              WebkitClipPath: `inset(0 round ${ringGeom.clipR}px)`,
            }}
          >
            {/* Rounded-rect perimeter path starting at top-center (no rotation => no distortion) */}
            <path
              d={ringPathD}
              fill="none"
              stroke="rgba(255, 255, 255, 0.14)"
              strokeWidth={ringGeom.stroke}
              strokeLinejoin="round"
            />
            <path
              ref={ringPathRef}
              d={ringPathD}
              fill="none"
              stroke="hsl(120, 92%, 54%)"
              strokeWidth={ringGeom.stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength="100"
              strokeDasharray="100"
              strokeDashoffset="0"
            />
          </svg>
        )}

      {showAction && (
        <button
          type="button"
          onClick={onActionClick}
          aria-label={actionIconAlt || actionIconTitle || 'Action'}
          title={actionIconTitle}
          style={{
            position: vertical ? 'absolute' : 'relative',
            right: vertical ? (isRight ? '6px' : undefined) : undefined,
            left: vertical ? (isLeft ? '6px' : undefined) : undefined,
            top: vertical ? '6px' : undefined,
            transform: vertical ? undefined : undefined,
            width: 24,
            height: 24,
            borderRadius: 6,
            border: '1px solid rgba(176,137,104,0.85)',
            background: 'rgba(255,255,255,0.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 6px rgba(0,0,0,0.18)',
            zIndex: 5,
            cursor: 'pointer',
            marginRight: vertical ? undefined : '6px',
          }}
        >
          <img
            src={actionIconSrc}
            alt={actionIconAlt || ''}
            style={{ width: 14, height: 14, display: 'block' }}
          />
        </button>
      )}

      <img
        src={avatar || '/assets/avatars/default.png'}
        alt={nickname || 'player'}
        onError={(e) => {
          const target = e.currentTarget as HTMLImageElement;
          target.src =
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36'><rect width='36' height='36' rx='6' fill='%23ddd'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='12' fill='%23666'>🙂</text></svg>";
        }}
        style={{
          width: avatarSize,
          height: avatarSize,
          borderRadius: 6,
          objectFit: 'cover',
          border: '1px solid #666',
          background: '#ddd',
          // For right seat, place avatar at the bottom of the vertical stack
          order: vertical && isRight ? 3 : undefined,
        }}
      />
      <div
        style={{
          fontWeight: 700,
          color: '#2b241f',
          fontSize: nameFontSize,
          lineHeight: 1.1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: vertical ? undefined : compact ? '16ch' : '20ch',
          ...(vertical
            ? ({
                writingMode: isLeft ? 'vertical-rl' : 'vertical-lr',
                textOrientation: 'mixed',
                letterSpacing: '0.02em',
                alignSelf: 'center',
                // Ensure name is first in the right vertical stack
                order: isRight ? 1 : undefined,
                // Flip right seat text by 180°
                transform: isRight ? 'rotate(180deg)' : undefined,
                transformOrigin: isRight ? 'center' : undefined,
              } as React.CSSProperties)
            : {}),
        }}
      >
        {nickname || 'Player'}
      </div>
      {(teamLabel || teamIndex !== undefined) && (
        <span
          className={`${vertical ? 'mt-0.5' : 'ml-1 sm:ml-1.5 md:ml-2'} px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] md:text-[11px] rounded-full shadow-caféGlow ${
            (teamIndex ?? (teamLabel === 'Team B' ? 1 : 0)) === 0
              ? 'bg-amber-200 text-amber-900 border border-amber-300'
              : 'bg-sky-200 text-sky-900 border border-sky-300'
          }`}
          style={
            vertical
              ? ({
                  writingMode: isLeft ? 'vertical-rl' : 'vertical-lr',
                  textOrientation: 'mixed',
                  letterSpacing: '0.02em',
                  alignSelf: 'center',
                  // Put badge at the top for right vertical stack
                  order: isRight ? 0 : undefined,
                  // Flip right seat team badge by 180°
                  transform: isRight ? 'rotate(180deg)' : undefined,
                  transformOrigin: isRight ? 'center' : undefined,
                } as React.CSSProperties)
              : undefined
          }
        >
          {teamLabel ?? (teamIndex === 0 ? 'Team A' : 'Team B')}
        </span>
      )}
      {highlight && (
        <div
          style={{
            marginLeft: vertical ? 0 : (gap as unknown as string),
            marginTop: vertical ? gap : 0,
            color: '#b58900',
            fontWeight: 700,
            fontSize: turnFontSize,
            whiteSpace: 'nowrap',
            ...(vertical
              ? ({
                  writingMode: isLeft ? 'vertical-rl' : 'vertical-lr',
                  textOrientation: 'mixed',
                  letterSpacing: '0.02em',
                  alignSelf: 'center',
                  order: isRight ? 4 : undefined,
                } as React.CSSProperties)
              : {}),
          }}
        >
          Your turn
        </div>
      )}
      {/* Profile editing from player card removed */}
    </div>
  );
}
