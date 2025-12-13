import React, { useState } from 'react';

export default function CoffeeProp() {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => {
        console.log('coffee-clicked');
      }}
      className={`absolute bottom-5 left-10 w-24 h-16 border-2 rounded-md flex items-center justify-center cursor-pointer ${hover ? 'bg-amber-200' : 'bg-amber-300'} border-tableWood-dark shadow-caféGlow`}
    >
      Coffee
    </div>
  );
}
