import React from 'react';
import { usePhoneLandscape } from '../hooks/usePhoneLandscape';

type Props = {
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  footerLeft?: React.ReactNode;
  footerRight?: React.ReactNode;
};

export default function Layout({ headerRight, children, footerLeft, footerRight }: Props) {
  const phoneLandscape = usePhoneLandscape();
  const [headerCollapsed, setHeaderCollapsed] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (phoneLandscape) setHeaderCollapsed(true);
    else setHeaderCollapsed(false);
  }, [phoneLandscape]);

  // Phone-landscape: ensure we don't stop between sections (game/tutorial).
  // Some mobile browsers are inconsistent with CSS scroll snapping, so we enforce it on scroll end.
  React.useEffect(() => {
    if (!phoneLandscape) return;
    const root = scrollRef.current;
    if (!root) return;

    let raf: number | null = null;
    let lastPos = root.scrollTop;
    let stableFrames = 0;
    let lastSnappedTop: number | null = null;

    const snapToNearest = (cur: number) => {
      const sections = Array.from(root.querySelectorAll<HTMLElement>('.app-section'));
      if (sections.length === 0) return;
      let best = sections[0];
      let bestDist = Math.abs(sections[0].offsetTop - cur);

      for (const s of sections) {
        const d = Math.abs(s.offsetTop - cur);
        if (d < bestDist) {
          bestDist = d;
          best = s;
        }
      }

      const targetTop = best.offsetTop;
      if (lastSnappedTop != null && Math.abs(lastSnappedTop - targetTop) < 2) return;
      lastSnappedTop = targetTop;

      // If we're already close, don't fight the user.
      if (Math.abs(cur - targetTop) < 8) return;

      root.scrollTo({ top: targetTop, behavior: 'smooth' });
    };

    const tick = () => {
      const cur = root.scrollTop;
      if (Math.abs(cur - lastPos) < 0.5) stableFrames += 1;
      else stableFrames = 0;
      lastPos = cur;

      // Wait until scrolling inertia settles (a few stable frames).
      if (stableFrames >= 8) {
        raf = null;
        stableFrames = 0;
        snapToNearest(cur);
        return;
      }

      raf = window.requestAnimationFrame(tick);
    };

    const onScroll = () => {
      stableFrames = 0;
      if (raf == null) raf = window.requestAnimationFrame(tick);
    };

    root.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (raf != null) window.cancelAnimationFrame(raf);
      root.removeEventListener('scroll', onScroll);
    };
  }, [phoneLandscape]);

  return (
    <div className="h-[100svh] min-h-0 flex flex-col bg-tableWood bg-woodGrain overflow-hidden">
      {/* Top bar */}
      <div
        className={`cafe-header text-white relative z-[220] ${phoneLandscape && headerCollapsed ? 'cafe-header--collapsed' : ''}`}
      >
        <div className="cafe-header-inner max-w-[min(1600px,95vw)] mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex flex-nowrap items-center gap-2 sm:gap-4">
          <h1 className="cafe-title text-xl font-bold tracking-wide drop-shadow shrink-0">
            Chkobba
          </h1>

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
          <div
            ref={scrollRef}
            className="app-scroll w-full h-full min-h-0 max-w-full sm:max-w-[min(1600px,95vw)] mx-auto overflow-y-auto overflow-x-hidden sm:snap-y sm:snap-mandatory scroll-smooth motion-reduce:scroll-auto"
          >
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
