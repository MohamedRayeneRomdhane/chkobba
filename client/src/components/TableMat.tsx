import React from "react";

interface TableMatProps {
  children?: React.ReactNode;
}

export default function TableMat({ children }: TableMatProps) {
  return (
    <div className="relative w-[80%] h-[60vh] mx-auto bg-felt rounded-mat shadow-insetDeep border-[8px] border-tableWood-dark">
      {children}
    </div>
  );
}
