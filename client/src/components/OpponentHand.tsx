import React from 'react';

type Props = { position: 'top' | 'left' | 'right'; count?: number };

export default function OpponentHand({ position, count = 3 }: Props) {
  const isSmall =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(max-width: 640px)').matches;
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    display: 'flex',
    gap: isSmall ? 6 : 8,
  };
  const posStyle: React.CSSProperties =
    position === 'top'
      ? { top: 0, left: '50%', transform: 'translateX(-50%)', padding: isSmall ? 8 : 12 }
      : position === 'left'
        ? {
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            flexDirection: 'column',
            padding: isSmall ? 8 : 12,
          }
        : {
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            flexDirection: 'column',
            padding: isSmall ? 8 : 12,
          };

  const boxes = Math.max(0, Math.min(12, count));
  const nodes = Array.from({ length: boxes });
  return (
    <div style={{ ...baseStyle, ...posStyle }}>
      {nodes.map((_, i) => (
        <div
          key={i}
          style={{
            width: isSmall ? 44 : 60,
            height: isSmall ? 66 : 90,
            borderRadius: 8,
            background: '#334',
            border: '2px solid #222',
            boxShadow: '0 3px 6px rgba(0,0,0,0.3)',
          }}
        />
      ))}
    </div>
  );
}
