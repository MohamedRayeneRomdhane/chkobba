import React from 'react';

interface TableMatProps {
  children?: React.ReactNode;
}

export default function TableMat({ children }: TableMatProps) {
  return (
    <div className="relative table-felt overflow-visible mx-auto h-full max-h-full w-auto max-w-full aspect-[4/3] sm:aspect-[16/9]">
      {children}
      <div id="table-mat-overlay" className="pointer-events-none absolute inset-0 z-[50]" />
    </div>
  );
}
