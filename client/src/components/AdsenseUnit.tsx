import { useEffect } from 'react';
import type React from 'react';

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

type Props = {
  slot: string; // Your AdSense ad slot id
  style?: React.CSSProperties;
  format?: string; // e.g., 'auto'
  responsive?: 'true' | 'false';
  enabled?: boolean;
};

export default function AdsenseUnit({
  slot,
  style,
  format = 'auto',
  responsive = 'true',
  enabled = true,
}: Props) {
  useEffect(() => {
    if (!enabled) return;
    try {
      if (!window.adsbygoogle) return;
      window.adsbygoogle.push({});
    } catch {
      // ignore
    }
  }, [slot, enabled]);

  if (!enabled) return null;

  return (
    <ins
      className="adsbygoogle"
      style={style ?? { display: 'block' }}
      data-ad-client="ca-pub-9124857144736473"
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive}
      aria-label="Advertisement"
    />
  );
}
