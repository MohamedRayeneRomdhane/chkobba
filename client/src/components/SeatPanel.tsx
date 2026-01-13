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
}: Props) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const vertical = position === 'left' || position === 'right';
  const isLeft = position === 'left';
  const isRight = position === 'right';
  const showAction = !!actionIconSrc && typeof onActionClick === 'function';
  // Only reserve header space for vertical panels where the action badge/button is overlaid.
  // Horizontal panels render the action inline (same row), so they don't need extra top padding.
  const headerPadPx = vertical && (showAction || speaking) ? 30 : 0;
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

  return (
    <div ref={containerRef} style={{ ...baseStyle, ...posStyle }}>
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
      {speaking && (
        <div
          className="soundboard-speaking"
          style={{
            position: vertical ? 'absolute' : 'relative',
            left: vertical ? '50%' : undefined,
            top: vertical ? '6px' : undefined,
            transform: vertical ? 'translateX(-50%)' : undefined,
            pointerEvents: 'none',
            background: 'rgba(255,255,255,0.92)',
            border: '1px solid rgba(176,137,104,0.7)',
            borderRadius: 999,
            padding: '2px 6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
            animation: 'soundboardPulse 900ms ease-in-out infinite',
            zIndex: 4,
            marginRight: vertical ? undefined : '6px',
          }}
        >
          <img
            src="/assets/icons/play.ico"
            alt="Sound"
            style={{ width: 14, height: 14, display: 'block' }}
          />
        </div>
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
