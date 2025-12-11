import React, { useState } from "react";

export default function CoffeeProp() {
  const [hover, setHover] = useState(false);
  const [glow, setGlow] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => { console.log("coffee-clicked"); setGlow(true); setTimeout(() => setGlow(false), 500); }}
      style={{
        position: "absolute",
        bottom: 20,
        left: 40,
        width: 100,
        height: 60,
        background: hover ? "#f7e7d0" : "#e6d3b0",
        border: "3px solid #6b4f2f",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: glow ? "0 0 10px 4px rgba(255,200,0,0.8)" : "0 2px 6px rgba(0,0,0,0.3)",
        cursor: "pointer"
      }}
    >
      Coffee
    </div>
  );
}
