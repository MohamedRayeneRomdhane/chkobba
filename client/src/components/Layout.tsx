import React from 'react';

type Props = {
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  footerLeft?: React.ReactNode;
  footerRight?: React.ReactNode;
};

export default function Layout({ headerRight, children, footerLeft, footerRight }: Props) {
  return (
    <div className="h-[100svh] min-h-0 flex flex-col bg-tableWood bg-woodGrain overflow-hidden">
      {/* Top bar */}
      <div className="cafe-header text-white">
        <div className="max-w-[min(1600px,95vw)] mx-auto px-4 py-3 flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-wide drop-shadow">Chkobba</h1>
          <div className="ml-auto flex items-center gap-4">{headerRight}</div>
        </div>
      </div>

      {/* Content: keep it simple, robust, and centered */}
      <div className="flex-1 min-h-0 flex">
        {/* Left margin (ads placeholder) on large screens */}
        <aside className="hidden lg:block w-24 bg-tableWood-dark/40 border-r border-tableWood-dark" />

        {/* Main game area: centered; bottom padding matches footer height */}
        <main className="flex-1 min-h-0 flex items-center justify-center p-2 sm:p-3 overflow-hidden">
          <div className="w-full h-full min-h-0 max-w-[min(1600px,95vw)] mx-auto">{children}</div>
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
