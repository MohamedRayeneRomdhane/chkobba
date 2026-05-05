import { useCallback, useEffect, useState } from 'react';
import {
  onConsentChange,
  readConsent,
  showConsentRevocationDialog,
  type ConsentDecision,
} from '../lib/adsense';

export type CookieConsentStatus = 'granted' | 'denied' | null;

const LEGACY_STORAGE_KEY = 'chkobba_cookie_consent_v1';

function decisionToStatus(decision: ConsentDecision): CookieConsentStatus {
  if (decision === 'granted') return 'granted';
  if (decision === 'denied') return 'denied';
  return null;
}

function readLegacyConsent(): CookieConsentStatus {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw === 'granted' || raw === 'denied') return raw;
  } catch {
    /* noop */
  }
  return null;
}

export type CookieConsent = ReturnType<typeof useCookieConsent>;

/**
 * Reads consent from Google Funding Choices via the IAB TCF v2.2 `__tcfapi`.
 * Falls back to the legacy localStorage flag while Funding Choices is still loading
 * so existing users aren't prompted twice on the first page after the migration.
 *
 * The returned `accept` / `decline` are no-ops kept for backwards compatibility —
 * the actual UI is rendered by Funding Choices, not by us. `reset` reopens the
 * Funding Choices revocation dialog so users can change their decision.
 */
export function useCookieConsent() {
  const [status, setStatus] = useState<CookieConsentStatus>(() => readLegacyConsent());

  useEffect(() => {
    let cancelled = false;
    void readConsent().then((decision) => {
      if (cancelled) return;
      if (decision !== 'unknown') setStatus(decisionToStatus(decision));
    });
    const unsubscribe = onConsentChange((decision) => {
      if (cancelled) return;
      setStatus(decisionToStatus(decision));
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const accept = useCallback(() => {
    setStatus('granted');
  }, []);

  const decline = useCallback(() => {
    setStatus('denied');
  }, []);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      /* noop */
    }
    if (!showConsentRevocationDialog()) {
      setStatus(null);
    }
  }, []);

  return { status, accept, decline, reset };
}
