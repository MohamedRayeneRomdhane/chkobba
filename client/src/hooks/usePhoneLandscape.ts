/* eslint-disable prettier/prettier */
/* eslint linebreak-style: 0 */
import React from 'react';

const DEFAULT_QUERY = '(max-height: 500px) and (orientation: landscape)';

export function usePhoneLandscape(query: string = DEFAULT_QUERY) {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();

    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }

    // Safari fallback
    mq.addListener(update);
    return () => mq.removeListener(update);
  }, [query]);

  return matches;
}
