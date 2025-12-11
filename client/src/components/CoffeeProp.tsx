import React, { useState } from "react";

export default function CoffeeProp() {
  const [hover, setHover] = useState(false);
  const [glow, setGlow] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => { console.log("coffee-clicked"); setGlow(true); setTimeout(() => setGlow(false), 500); }}
      className={`absolute bottom-5 left-10 w-24 h-16 border-2 rounded-md flex items-center justify-center cursor-pointer ${hover ? "bg-amber-100" : "bg-amber-200"} border-tableWood-dark ${glow ? "shadow-[0_0_10px_4px_rgba(255,200,0,0.8)]" : "shadow"}`}
    >
      Coffee
    </div>
  );
}
