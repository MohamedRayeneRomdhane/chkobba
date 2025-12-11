import React, { useState } from "react";

export default function ChichaProp() {
  const [hover, setHover] = useState(false);
  const [glow, setGlow] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => { console.log("chicha-clicked"); setGlow(true); setTimeout(() => setGlow(false), 500); }}
      className={`absolute bottom-5 right-10 w-32 h-20 border-2 rounded-xl flex items-center justify-center cursor-pointer ${hover ? "bg-sky-400" : "bg-sky-500"} border-tableWood-dark shadow-caféGlow`}
    >
      Chicha
    </div>
  );
}
