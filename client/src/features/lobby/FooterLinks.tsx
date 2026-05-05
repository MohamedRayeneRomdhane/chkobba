import React from 'react';
import { useGameStore } from '../../store';
import type { CookieConsent } from '../../hooks/useCookieConsent';
import { showConsentRevocationDialog } from '../../lib/adsense';

type Props = { cookieConsent: CookieConsent };

export default function FooterLinks({ cookieConsent }: Props) {
  const setLegal = useGameStore((s) => s.setLegal);

  const onManageConsent = () => {
    if (!showConsentRevocationDialog()) {
      cookieConsent.reset();
    }
  };

  return (
    <div className="shrink-0 ml-auto flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm opacity-90">
      <span>© Chkobba Café</span>
      <span className="hidden sm:inline">• Made for friendly games</span>
      <span className="hidden sm:inline">•</span>
      <a className="underline hover:no-underline" href="/about.html">
        About
      </a>
      <span>•</span>
      <a className="underline hover:no-underline" href="/how-to-play.html">
        How to play
      </a>
      <span>•</span>
      <a className="underline hover:no-underline" href="/privacy.html">
        Privacy
      </a>
      <span>•</span>
      <a className="underline hover:no-underline" href="/terms.html">
        Terms
      </a>
      <span>•</span>
      <a className="underline hover:no-underline" href="/cookies.html">
        Cookies
      </a>
      <span>•</span>
      <a className="underline hover:no-underline" href="/contact.html">
        Contact
      </a>
      <span>•</span>
      <button
        type="button"
        className="underline hover:no-underline"
        onClick={onManageConsent}
        title="Manage cookie / ad-personalization consent"
      >
        Manage consent
      </button>
      {/* Legal modal trigger left as global; setLegal kept available for future deep links. */}
      <span className="sr-only" aria-hidden onClick={() => setLegal(false)} />
    </div>
  );
}
