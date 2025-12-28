import React from 'react';

type Props = {
  position: 'bottom' | 'top' | 'left' | 'right';
  avatar?: string;
  nickname?: string;
  highlight?: boolean;
  teamLabel?: string;
  teamIndex?: 0 | 1;
  compact?: boolean;
  absolute?: boolean;
};

export default function SeatPanel({
  position,
  avatar,
  nickname,
  highlight,
  teamLabel,
  teamIndex,
  compact,
  absolute = true,
}: Props) {
  const vertical = position === 'left' || position === 'right';
  const isLeft = position === 'left';
  const isRight = position === 'right';
  // Responsive scales using CSS clamp to adapt across screen sizes
  const avatarSize = compact ? 'clamp(14px, 2.4vw, 22px)' : 'clamp(20px, 3.2vw, 30px)';
  const gap = compact ? 'clamp(2px, 0.8vw, 6px)' : 'clamp(4px, 1vw, 8px)';
  const pad = compact ? 'clamp(3px, 0.8vw, 6px)' : 'clamp(4px, 1vw, 8px)';
  const radius = compact ? 'clamp(4px, 0.8vw, 6px)' : 'clamp(6px, 1vw, 8px)';
  const nameFontSize = compact ? 'clamp(10px, 1.4vw, 12px)' : 'clamp(11px, 1.4vw, 13px)';
  const turnFontSize = compact ? 'clamp(9px, 1.3vw, 11px)' : 'clamp(10px, 1.3vw, 12px)';

  // Anchor offsets responsive to viewport
  const bottomOffset = compact ? 'clamp(6px, 1.6vh, 12px)' : 'clamp(10px, 2.2vh, 18px)';
  const topOffset = compact ? 'clamp(12px, 4vh, 28px)' : 'clamp(18px, 5vh, 40px)';
  const sideOffset = compact ? 'clamp(10px, 3.5vw, 28px)' : 'clamp(16px, 4vw, 44px)';

  const baseStyle: React.CSSProperties = {
    position: absolute ? 'absolute' : 'relative',
    display: vertical ? 'flex' : compact ? 'grid' : 'flex',
    flexDirection: vertical ? 'column' : undefined,
    justifyContent: vertical ? 'center' : undefined,
    gridTemplateColumns: !vertical && compact ? `${avatarSize} auto` : undefined,
    gridAutoFlow: !vertical && compact ? 'column' : undefined,
    alignItems: 'center',
    textAlign: vertical ? 'center' : undefined,
    gap,
    padding: pad,
    borderRadius: radius as unknown as number, // TS accepts string but keep cast for safety
    background: highlight ? 'rgba(255,240,180,0.95)' : 'rgba(255,255,255,0.9)',
    boxShadow: highlight ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.2)',
    border: highlight ? '2px solid #e0c200' : '1px solid #b08968',
    WebkitBackdropFilter: 'blur(2px)',
    backdropFilter: 'blur(2px)',
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

  return (
    <div style={{ ...baseStyle, ...posStyle }}>
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
