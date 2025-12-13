import React, { useState } from 'react';

export default function ChichaProp() {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => {
        console.log('chicha-clicked');
      }}
      className={`absolute bottom-5 right-10 w-32 h-20 border-2 rounded-xl flex items-center justify-center cursor-pointer ${hover ? 'bg-sky-400' : 'bg-sky-500'} border-tableWood-dark shadow-caféGlow`}
    >
      Chicha
    </div>
  );
}
