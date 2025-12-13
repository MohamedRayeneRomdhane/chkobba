import React, { useState } from 'react';

export default function CigarettesProp() {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => {
        console.log('cigs-clicked');
      }}
      className={`absolute top-5 right-52 w-24 h-16 border-2 rounded-md flex items-center justify-center cursor-pointer ${hover ? 'bg-neutral-300' : 'bg-neutral-400'} border-tableWood-dark shadow-caféGlow`}
    >
      Cigs
    </div>
  );
}
