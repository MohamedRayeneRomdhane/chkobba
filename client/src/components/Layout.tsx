import React from "react";

type Props = {
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  footerLeft?: React.ReactNode;
  footerRight?: React.ReactNode;
};

export default function Layout({ headerRight, children, footerLeft, footerRight }: Props) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const footerRef = React.useRef<HTMLElement | null>(null);

  React.useLayoutEffect(() => {
    const update = () => {
      const h = footerRef.current?.offsetHeight ?? 0;
      if (rootRef.current) rootRef.current.style.setProperty("--footer-h", `${h}px`);
    };
    update();

    // Guarded ResizeObserver usage (no optional chaining on constructor)
    let ro: any = null;
    const RO = (typeof window !== "undefined" && (window as any).ResizeObserver) ? (window as any).ResizeObserver : null;
    if (RO && footerRef.current) {
      ro = new RO(() => update());
      ro.observe(footerRef.current);
    }
    window.addEventListener("resize", update);
    return () => {
      try {
        if (ro && footerRef.current) ro.unobserve(footerRef.current);
        if (ro && typeof ro.disconnect === "function") ro.disconnect();
      } catch {}
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div ref={rootRef} className="min-h-screen flex flex-col bg-tableWood">
      {/* Top bar */}
      <div className="cafe-header text-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-wide drop-shadow">Chkobba</h1>
          <div className="ml-auto flex items-center gap-4">
            {headerRight}
          </div>
        </div>
      </div>

      {/* Content: keep it simple, robust, and centered */}
      <div className="flex-1 min-h-0 flex">
        {/* Left margin (ads placeholder) on large screens */}
        <aside className="hidden lg:block w-24 bg-tableWood-dark/40 border-r border-tableWood-dark" />

        {/* Main game area: centered; bottom padding matches footer height */}
        <main className="flex-1 flex items-center justify-center p-3" style={{ paddingBottom: "calc(var(--footer-h, 56px) + 8px)" }}>
          <div className="w-full max-w-5xl mx-auto">
            {children}
          </div>
        </main>

        {/* Right margin (ads placeholder) on large screens */}
        <aside className="hidden lg:block w-24 bg-tableWood-dark/40 border-l border-tableWood-dark" />
      </div>

      {/* Footer */}
      <footer ref={footerRef} className="cafe-header text-white">
        <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 text-sm">
            {footerLeft}
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3 text-xs sm:text-sm opacity-90">
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
