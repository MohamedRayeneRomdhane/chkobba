import React, { useState } from 'react';

export default function CoffeeProp({ scale = 0.75 }: { scale?: number }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => {
        console.log('coffee-clicked');
      }}
      className={`absolute bottom-6 left-12 cursor-pointer transition-transform duration-150 ease-out`}
      style={{
        transform: `${hover ? 'translateY(-1px)' : 'translateY(0)'} rotate(-2deg) scale(${hover ? scale * 1.03 : scale})`,
        transformOrigin: 'bottom left',
        filter: 'drop-shadow(0 10px 16px rgba(0,0,0,0.38))',
      }}
    >
      <img
        src="/assets/props/coffee.png"
        alt="Coffee cup"
        className="w-[180px] h-[128px] sm:w-[210px] sm:h-[150px] md:w-[240px] md:h-[170px] object-contain select-none"
        draggable={false}
      />
    </div>
  );
}
