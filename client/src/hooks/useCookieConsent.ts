import { useCallback, useState } from 'react';

export type CookieConsentStatus = 'granted' | 'denied' | null;

const STORAGE_KEY = 'chkobba_cookie_consent_v1';

function readStoredConsent(): CookieConsentStatus {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === 'granted' || raw === 'denied') return raw;
  return null;
}

export function useCookieConsent() {
  const [status, setStatus] = useState<CookieConsentStatus>(() => readStoredConsent());

  const accept = useCallback(() => {
    window.localStorage.setItem(STORAGE_KEY, 'granted');
    setStatus('granted');
  }, []);

  const decline = useCallback(() => {
    window.localStorage.setItem(STORAGE_KEY, 'denied');
    setStatus('denied');
  }, []);

  const reset = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setStatus(null);
  }, []);

  return { status, accept, decline, reset };
}
