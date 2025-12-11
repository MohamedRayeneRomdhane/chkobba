import React, { useState } from "react";

export default function CigarettesProp() {
  const [hover, setHover] = useState(false);
  const [glow, setGlow] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => { console.log("cigs-clicked"); setGlow(true); setTimeout(() => setGlow(false), 500); }}
      className={`absolute top-5 right-52 w-24 h-16 border-2 rounded-md flex items-center justify-center cursor-pointer ${hover ? "bg-neutral-300" : "bg-neutral-400"} border-tableWood-dark ${glow ? "shadow-[0_0_10px_4px_rgba(255,255,255,0.8)]" : "shadow"}`}
    >
      Cigs
    </div>
  );
}
