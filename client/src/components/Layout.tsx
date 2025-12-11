import React from "react";

type Props = {
  headerRight?: React.ReactNode;
  children: React.ReactNode;
};

export default function Layout({ headerRight, children }: Props) {
  return (
    <div className="min-h-screen flex flex-col bg-tableWood">
      {/* Top bar */}
      <div className="w-full bg-tableWood-dark text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-wide">Chkobba</h1>
          <div className="ml-auto flex items-center gap-4">
            {headerRight}
          </div>
        </div>
      </div>

      {/* Content: keep it simple, robust, and centered */}
      <div className="flex-1 flex">
        {/* Left margin (ads placeholder) on large screens */}
        <aside className="hidden lg:block w-24 bg-tableWood-dark/40 border-r border-tableWood-dark" />

        {/* Main game area: full-height minus header, centered */}
        <main className="flex-1 h-[calc(100vh-64px)] flex items-center justify-center p-3">
          <div className="w-full max-w-5xl h-full mx-auto">
            {children}
          </div>
        </main>

        {/* Right margin (ads placeholder) on large screens */}
        <aside className="hidden lg:block w-24 bg-tableWood-dark/40 border-l border-tableWood-dark" />
      </div>
    </div>
  );
}
