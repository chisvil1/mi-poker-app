import React, { useState, useEffect } from 'react';

const SUIT_MAP = {
  'S': '♠️',
  'H': '♥️',
  'C': '♣️',
  'D': '♦️',
};

const Card = ({ rank, suit, isFaceDown = false, size = 'normal', className = "", animate = false }) => {
  const [isDealt, setIsDealt] = useState(false);
  const isRed = suit === 'H' || suit === 'D';
  const suitIcon = SUIT_MAP[suit] || suit;
  
  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => setIsDealt(true), 100); // Small delay to trigger animation
      return () => clearTimeout(timer);
    }
  }, [animate]);

  const sizeClasses = {
    normal: 'w-10 h-14 md:w-14 md:h-20',
    small: 'w-8 h-12 md:w-10 md:h-14 text-xs',
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.normal;
  const animationClass = animate && !isDealt ? 'deal-in-start' : 'deal-in-end';

  if (isFaceDown) {
    return (
      <div 
        className={`${currentSizeClass} rounded-md border border-base-300 shadow-xl relative overflow-hidden transform transition-all duration-500 hover:-translate-y-2 ${className} ${animationClass}`}
        style={{
            backgroundColor: '#a22',
            backgroundImage: `
                radial-gradient(circle at 20% 20%, #fff4, #fff0 30%),
                radial-gradient(circle at 80% 80%, #fff4, #fff0 30%),
                repeating-linear-gradient(45deg, #0002 0, #0002 5px, #0000 5px, #0000 10px)
            `,
        }}
      >
        <div className="absolute inset-1 border-2 border-white/40 rounded-sm flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-white/40"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${currentSizeClass} bg-white rounded-md shadow-xl border border-gray-300 flex flex-col items-center justify-center p-1 select-none transition-transform duration-300 hover:-translate-y-2 ${className} ${animationClass}`}>
      <div className={`absolute top-1 left-2 text-sm md:text-base font-bold ${isRed ? 'text-red-600' : 'text-black'}`}>{rank}</div>
      <div className={`text-xl md:text-3xl ${isRed ? 'text-red-600' : 'text-black'}`}>{suitIcon}</div>
      <div className={`absolute bottom-1 right-2 text-sm md:text-base font-bold transform rotate-180 ${isRed ? 'text-red-600' : 'text-black'}`}>{rank}</div>
    </div>
  );
};

export default Card;
