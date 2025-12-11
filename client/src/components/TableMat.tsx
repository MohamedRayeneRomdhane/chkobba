import React from "react";

interface TableMatProps {
  children?: React.ReactNode;
}

export default function TableMat({ children }: TableMatProps) {
  return (
    <div className="relative w-full h-full max-w-5xl mx-auto bg-felt rounded-mat shadow-insetDeep border-[10px] border-tableWood-dark">
      {children}
    </div>
  );
}
