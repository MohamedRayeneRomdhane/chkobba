import React, { useState } from "react";

export default function CigarettesProp() {
  const [hover, setHover] = useState(false);
  const [glow, setGlow] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => { console.log("cigs-clicked"); setGlow(true); setTimeout(() => setGlow(false), 500); }}
      style={{
        position: "absolute",
        top: 20,
        right: 200,
        width: 90,
        height: 60,
        background: hover ? "#ddd" : "#cfcfcf",
        border: "3px solid #6b4f2f",
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: glow ? "0 0 10px 4px rgba(255,255,255,0.8)" : "0 2px 6px rgba(0,0,0,0.3)",
        cursor: "pointer"
      }}
    >
      Cigs
    </div>
  );
}
