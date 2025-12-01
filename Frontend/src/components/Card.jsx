import React from 'react';

const Card = ({ rank, suit, isFaceDown = false, size = 'normal', className = "" }) => {
  const isRed = suit === 'h' || suit === 'd' || suit === '♥️' || suit === '♦️'; // Soporte para formatos del server
  const suitIcon = { 's': '♠', 'h': '♥', 'c': '♣', 'd': '♦', '♠️': '♠', '♥️': '♥', '♣️': '♣', '♦️': '♦' }[suit] || suit;
  
  const sizeClasses = { 
    normal: 'w-10 h-14 md:w-14 md:h-20', 
    small: 'w-8 h-12 md:w-10 md:h-14 text-xs' 
  };
  const currentSizeClass = sizeClasses[size] || sizeClasses.normal;

  if (isFaceDown || !rank) {
    return (
      <div className={`${currentSizeClass} rounded-md border border-gray-900 shadow-xl relative overflow-hidden transform transition-all duration-500 hover:-translate-y-2 bg-[#6b0f0f] ${className}`}>
        <div className="absolute inset-1 border border-white/20 rounded-sm"></div>
      </div>
    );
  }

  return (
    <div className={`${currentSizeClass} bg-white rounded-md shadow-xl border border-gray-300 flex flex-col items-center justify-between p-1 select-none transition-transform duration-300 hover:-translate-y-2 ${className}`}>
      <div className={`text-xs md:text-sm font-bold self-start ${isRed ? 'text-red-600' : 'text-black'}`}>{rank}</div>
      <div className={`text-lg md:text-2xl ${isRed ? 'text-red-600' : 'text-black'}`}>{suitIcon}</div>
    </div>
  );
};

export default Card;