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
      className={`absolute bottom-0 right-8 cursor-pointer transition-transform duration-150 ease-out ${hover ? 'scale-[1.03]' : ''}`}
      style={{
        transform: `${hover ? 'translateY(-1px)' : 'translateY(2px)'} rotate(1.5deg)`,
        filter: 'drop-shadow(0 12px 18px rgba(0,0,0,0.38))',
      }}
    >
      <img
        src="/assets/props/chicha.png"
        alt="Hookah"
        className="w-[240px] h-[240px] sm:w-[280px] sm:h-[280px] md:w-[320px] md:h-[250px] object-contain select-none"
        draggable={false}
      />
    </div>
  );
}
