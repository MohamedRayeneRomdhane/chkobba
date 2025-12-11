import React from "react";

type Props = {
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  footerLeft?: React.ReactNode;
  footerRight?: React.ReactNode;
};

export default function Layout({ headerRight, children, footerLeft, footerRight }: Props) {
  return (
    <div className="min-h-screen flex flex-col bg-tableWood">
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
      <div className="flex-1 flex">
        {/* Left margin (ads placeholder) on large screens */}
        <aside className="hidden lg:block w-24 bg-tableWood-dark/40 border-r border-tableWood-dark" />

        {/* Main game area: height accounts for header and footer, centered */}
        <main className="flex-1 h-[calc(100vh-64px-48px)] flex items-center justify-center p-3 pb-16">
          <div className="w-full max-w-5xl h-full mx-auto">
            {children}
          </div>
        </main>

        {/* Right margin (ads placeholder) on large screens */}
        <aside className="hidden lg:block w-24 bg-tableWood-dark/40 border-l border-tableWood-dark" />
      </div>

      {/* Footer */}
      <footer className="cafe-header text-white">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-4">
          <div className="flex items-center gap-2">
            {footerLeft}
          </div>
          <div className="ml-auto flex items-center gap-3 text-sm opacity-90">
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
