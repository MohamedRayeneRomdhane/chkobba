import React, { useState } from "react";

export default function ChichaProp() {
  const [hover, setHover] = useState(false);
  const [glow, setGlow] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => { console.log("chicha-clicked"); setGlow(true); setTimeout(() => setGlow(false), 500); }}
      style={{
        position: "absolute",
        bottom: 20,
        right: 40,
        width: 120,
        height: 80,
        background: hover ? "#9bd1e8" : "#7fb8d1",
        border: "3px solid #6b4f2f",
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: glow ? "0 0 10px 4px rgba(100,200,255,0.8)" : "0 2px 6px rgba(0,0,0,0.3)",
        cursor: "pointer"
      }}
    >
      Chicha
    </div>
  );
}
