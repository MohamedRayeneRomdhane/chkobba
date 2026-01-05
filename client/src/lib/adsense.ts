const ADSENSE_CLIENT = 'ca-pub-9124857144736473';

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

let loadPromise: Promise<void> | null = null;

export function loadAdsenseScript(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();

  if (document.querySelector('script[data-adsense="true"]')) {
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
