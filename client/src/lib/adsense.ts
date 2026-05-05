const ADSENSE_CLIENT = 'ca-pub-9124857144736473';

declare global {
  interface Window {
    adsbygoogle: unknown[];
    __tcfapi?: (
      command: string,
      version: number,
      callback: (data: TcData | null, success: boolean) => void,
      ...args: unknown[]
    ) => void;
    googlefc?: {
      callbackQueue?: Array<{ [key: string]: () => void } | (() => void)>;
      showRevocationMessage?: () => void;
    };
  }
}

export type TcData = {
  cmpStatus?: 'stub' | 'loading' | 'loaded' | 'error';
  eventStatus?: 'tcloaded' | 'cmpuishown' | 'useractioncomplete';
  gdprApplies?: boolean;
  tcString?: string;
  purpose?: { consents?: Record<string, boolean> };
};

export type ConsentDecision = 'granted' | 'denied' | 'unknown';

let loadPromise: Promise<void> | null = null;

export function loadAdsenseScript(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();

  if (
    document.querySelector('script[data-adsense="true"]') ||
    Array.from(document.getElementsByTagName('script')).some((s) =>
      (s.getAttribute('src') || '').includes('pagead/js/adsbygoogle.js')
    )
  ) {
    return Promise.resolve();
  }

  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-adsense', 'true');

    script.onload = () => {
      window.adsbygoogle = window.adsbygoogle || [];
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load AdSense script'));

    document.head.appendChild(script);
  });

  return loadPromise;
}

/** Reads the IAB TCF state once. Returns 'unknown' if no CMP is present. */
export function readConsent(): Promise<ConsentDecision> {
  const tcfapi = typeof window !== 'undefined' ? window.__tcfapi : undefined;
  if (!tcfapi) return Promise.resolve('unknown');
  return new Promise<ConsentDecision>((resolve) => {
    let settled = false;
    const finish = (decision: ConsentDecision) => {
      if (settled) return;
      settled = true;
      resolve(decision);
    };
    try {
      tcfapi('getTCData', 2, (data, success) => {
        if (!success || !data || data.cmpStatus !== 'loaded') {
          finish('unknown');
          return;
        }
        if (data.gdprApplies === false) {
          finish('granted');
          return;
        }
        const purposes = data.purpose?.consents ?? {};
        // Purpose 1 = "Store and/or access information on a device". Required for ad cookies.
        finish(purposes['1'] ? 'granted' : 'denied');
      });
    } catch {
      finish('unknown');
    }
    setTimeout(() => finish('unknown'), 1500);
  });
}

/** Subscribes to consent changes from the CMP. Returns an unsubscribe function. */
export function onConsentChange(cb: (decision: ConsentDecision) => void): () => void {
  const tcfapi = typeof window !== 'undefined' ? window.__tcfapi : undefined;
  if (!tcfapi) return () => {};
  let listenerId: number | null = null;
  try {
    tcfapi('addEventListener', 2, (data, success) => {
      if (!success || !data) return;
      const withListener = data as TcData & { listenerId?: number };
      if (typeof withListener.listenerId === 'number') {
        listenerId = withListener.listenerId;
      }
      if (data.cmpStatus !== 'loaded') return;
      if (data.gdprApplies === false) {
        cb('granted');
        return;
      }
      const consented = !!data.purpose?.consents?.['1'];
      cb(consented ? 'granted' : 'denied');
    });
  } catch {
    /* noop */
  }
  return () => {
    if (listenerId == null) return;
    const teardownApi = typeof window !== 'undefined' ? window.__tcfapi : undefined;
    if (!teardownApi) return;
    try {
      teardownApi('removeEventListener', 2, () => {}, listenerId);
    } catch {
      /* noop */
    }
  };
}

/** Asks Funding Choices to show its revocation dialog so the user can change their answer. */
export function showConsentRevocationDialog(): boolean {
  if (typeof window === 'undefined') return false;
  const fc = window.googlefc;
  if (!fc || !fc.callbackQueue) return false;
  fc.callbackQueue.push({
    CONSENT_DATA_READY: () => {
      try {
        fc.showRevocationMessage?.();
      } catch {
        /* noop */
      }
    },
  });
  return true;
}
