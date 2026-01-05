/* eslint-disable prettier/prettier */
/* eslint linebreak-style: 0 */
import React from 'react';

type Props = {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onLearnMore: () => void;
};

export default function CookieConsentBanner({ open, onAccept, onDecline, onLearnMore }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60]">
      <div className="max-w-[min(1600px,95vw)] mx-auto px-3 sm:px-4 pb-3">
        <div className="rounded-xl border border-white/10 bg-tableWood-dark/95 backdrop-blur-sm shadow-caféGlow text-white">
          <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-semibold tracking-wide">Cookies & ads</div>
              <p className="text-xs sm:text-sm text-white/85 mt-0.5 leading-relaxed">
                We use cookies to show ads and keep the lights on at the café. You can accept or decline.
              </p>
            </div>

            <div className="shrink-0 flex flex-wrap items-center gap-2 sm:ml-auto">
              <button
                type="button"
                className="px-3 py-1.5 rounded-md border border-white/20 bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm"
                onClick={onLearnMore}
              >
                Learn more
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-md border border-white/20 bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm"
                onClick={onDecline}
              >
                Decline
              </button>
              <button type="button" className="btn btn--desert" onClick={onAccept}>
                Accept
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
