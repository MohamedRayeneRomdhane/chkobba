import React from "react";

interface TableMatProps {
  children?: React.ReactNode;
}

export default function TableMat({ children }: TableMatProps) {
  return (
    <div style={{
      position: "relative",
      width: "80%",
      height: "60vh",
      margin: "auto",
      background: "#1a7f38",
      borderRadius: 12,
      boxShadow: "0 0 20px rgba(0,0,0,0.4) inset",
      border: "8px solid #6b4f2f" // wooden rim
    }}>
      {children}
    </div>
  );
}
