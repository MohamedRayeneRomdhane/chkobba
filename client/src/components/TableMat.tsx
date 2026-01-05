import React from 'react';

interface TableMatProps {
  children?: React.ReactNode;
}

export default function TableMat({ children }: TableMatProps) {
  return (
    <div className="table-mat-root relative table-felt overflow-visible w-full h-full sm:mx-auto sm:w-auto sm:h-full sm:max-h-full sm:aspect-[16/9]">
      {children}
      <div id="table-mat-overlay" className="pointer-events-none absolute inset-0 z-[50]" />
    </div>
  );
}
