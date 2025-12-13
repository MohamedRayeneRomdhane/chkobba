import React from 'react';

interface TableMatProps {
  children?: React.ReactNode;
}

export default function TableMat({ children }: TableMatProps) {
  return (
    <div className="relative w-full max-w-5xl mx-auto table-felt overflow-hidden aspect-[4/3] sm:aspect-[16/9]">
      {children}
    </div>
  );
}
