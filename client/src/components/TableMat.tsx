import React from 'react';

interface TableMatProps {
  children?: React.ReactNode;
}

export default function TableMat({ children }: TableMatProps) {
  return (
    <div className="relative w-full max-w-5xl mx-auto table-felt overflow-hidden aspect-[4/3] sm:aspect-[16/9] max-h-[min(70svh,700px)]">
      {children}
      <div id="table-mat-overlay" className="pointer-events-none absolute inset-0 z-[50]" />
    </div>
  );
}
