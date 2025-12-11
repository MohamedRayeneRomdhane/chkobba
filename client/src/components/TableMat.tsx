import React from "react";

interface TableMatProps {
  children?: React.ReactNode;
}

export default function TableMat({ children }: TableMatProps) {
  return (
    <div className="relative w-full h-full max-w-5xl mx-auto table-felt">
      {children}
    </div>
  );
}
