import { useEffect } from 'react';
import type React from 'react';
import { loadAdsenseScript } from '../lib/adsense';

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
    let cancelled = false;
    loadAdsenseScript()
      .then(() => {
        if (cancelled) return;
        try {
          window.adsbygoogle = window.adsbygoogle || [];
          window.adsbygoogle.push({});
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* ads optional */
      });
    return () => {
      cancelled = true;
    };
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
