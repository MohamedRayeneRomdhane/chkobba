import React from 'react';

type Props = {
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  footerLeft?: React.ReactNode;
  footerRight?: React.ReactNode;
};

export default function Layout({ headerRight, children, footerLeft, footerRight }: Props) {
  const [phoneLandscape, setPhoneLandscape] = React.useState(false);
  const [headerCollapsed, setHeaderCollapsed] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia('(max-height: 500px) and (orientation: landscape)');
    const update = () => setPhoneLandscape(mq.matches);
    update();

    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }

    mq.addListener(update);
    return () => mq.removeListener(update);
  }, []);

  React.useEffect(() => {
    if (phoneLandscape) setHeaderCollapsed(true);
    else setHeaderCollapsed(false);
  }, [phoneLandscape]);

  return (
    <div className="h-[100svh] min-h-0 flex flex-col bg-tableWood bg-woodGrain overflow-hidden">
      {/* Top bar */}
      <div className={`cafe-header text-white relative z-[220] ${phoneLandscape && headerCollapsed ? 'cafe-header--collapsed' : ''}`}>
        <div className="cafe-header-inner max-w-[min(1600px,95vw)] mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex flex-nowrap items-center gap-2 sm:gap-4">
          <h1 className="cafe-title text-xl font-bold tracking-wide drop-shadow shrink-0">Chkobba</h1>

          {phoneLandscape && headerCollapsed ? (
            <div className="ml-auto flex items-center justify-end">
              <button
                type="button"
                className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white border border-white/15"
                onClick={() => setHeaderCollapsed(false)}
                aria-label="Expand header"
              >
                ▾
              </button>
            </div>
          ) : (
            <div className="ml-auto flex flex-nowrap items-center justify-end gap-2 sm:gap-4">
              {headerRight}
              {phoneLandscape && (
                <button
                  type="button"
                  className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white border border-white/15"
                  onClick={() => setHeaderCollapsed(true)}
                  aria-label="Collapse header"
                  title="Collapse header"
                >
                  ▴
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content: keep it simple, robust, and centered */}
      <div className="flex-1 min-h-0 flex">
        {/* Left margin (ads placeholder) on large screens */}
        <aside className="hidden lg:block w-24 bg-tableWood-dark/40 border-r border-tableWood-dark" />

        {/* Main game area: centered; bottom padding matches footer height */}
        <main className="flex-1 min-h-0 flex items-stretch justify-center p-0 sm:p-3 overflow-hidden">
          <div className="w-full h-full min-h-0 max-w-full sm:max-w-[min(1600px,95vw)] mx-auto overflow-y-auto overflow-x-hidden sm:snap-y sm:snap-mandatory scroll-smooth motion-reduce:scroll-auto">
            {children}
          </div>
        </main>

        {/* Right margin (ads placeholder) on large screens */}
        <aside className="hidden lg:block w-24 bg-tableWood-dark/40 border-l border-tableWood-dark" />
      </div>

      {/* Footer */}
      <footer className="cafe-header text-white">
        <div className="max-w-[min(1600px,95vw)] mx-auto px-4 py-2 flex flex-nowrap items-center gap-2 sm:gap-4">
          <div className="flex-1 min-w-0 flex items-center gap-2 text-sm">{footerLeft}</div>
          <div className="shrink-0 ml-auto flex items-center gap-2 sm:gap-3 text-xs sm:text-sm opacity-90">
            {footerRight ?? (
              <>
                <span>© Chkobba Café</span>
                <span className="hidden sm:inline">• Made for friendly games</span>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
