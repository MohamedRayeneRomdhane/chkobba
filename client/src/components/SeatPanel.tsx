import React from 'react';

type Props = {
  position: 'bottom' | 'top' | 'left' | 'right';
  avatar?: string;
  nickname?: string;
  highlight?: boolean;
  teamLabel?: string;
  teamIndex?: 0 | 1;
  compact?: boolean;
};

export default function SeatPanel({
  position,
  avatar,
  nickname,
  highlight,
  teamLabel,
  teamIndex,
  compact,
}: Props) {
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    display: compact ? 'grid' : 'flex',
    gridTemplateColumns: compact ? '24px auto' : undefined,
    gridAutoFlow: compact ? 'column' : undefined,
    alignItems: 'center',
    gap: compact ? 6 : 8,
    padding: compact ? 6 : 8,
    borderRadius: compact ? 8 : 10,
    background: highlight ? 'rgba(255,240,180,0.95)' : 'rgba(255,255,255,0.9)',
    boxShadow: highlight ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.2)',
    border: highlight ? '2px solid #e0c200' : '1px solid #b08968',
  };
  const posStyle: React.CSSProperties =
    position === 'bottom'
      ? { bottom: compact ? 14 : 24, left: '50%', transform: 'translateX(-50%)' }
      : position === 'top'
        ? { top: compact ? 40 : 64, left: '50%', transform: 'translateX(-50%)' }
        : position === 'left'
          ? { left: compact ? 40 : 64, top: '50%', transform: 'translateY(-50%)' }
          : { right: compact ? 40 : 64, top: '50%', transform: 'translateY(-50%)' };

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
          width: compact ? 24 : 36,
          height: compact ? 24 : 36,
          borderRadius: 6,
          objectFit: 'cover',
          border: '1px solid #666',
          background: '#ddd',
        }}
      />
      <div style={{ fontWeight: 700, color: '#2b241f', fontSize: compact ? 12 : 14 }}>
        {nickname || 'Player'}
      </div>
      {(teamLabel || teamIndex !== undefined) && (
        <span
          className={`ml-2 px-2 py-0.5 text-[11px] rounded-full shadow-caféGlow ${
            (teamIndex ?? (teamLabel === 'Team B' ? 1 : 0)) === 0
              ? 'bg-amber-200 text-amber-900 border border-amber-300'
              : 'bg-sky-200 text-sky-900 border border-sky-300'
          }`}
        >
          {teamLabel ?? (teamIndex === 0 ? 'Team A' : 'Team B')}
        </span>
      )}
      {highlight && (
        <div
          style={{
            marginLeft: compact ? 6 : 8,
            color: '#b58900',
            fontWeight: 700,
            fontSize: compact ? 11 : 14,
          }}
        >
          Your turn
        </div>
      )}
      {/* Profile editing from player card removed */}
    </div>
  );
}
