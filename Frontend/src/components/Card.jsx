import React from 'react';

const Card = ({ rank, suit, isFaceDown = false, size = 'normal', className = "" }) => {
  const isRed = suit === 'h' || suit === 'd' || suit === '♥️' || suit === '♦️';
  const suitIcon = { 's': '♠', 'h': '♥', 'c': '♣', 'd': '♦', '♠️': '♠', '♥️': '♥', '♣️': '♣', '♦️': '♦' }[suit] || suit;
  
  const sizeClasses = { 
    normal: 'w-16 h-24 text-base', // Adjusted size for better visibility
    small: 'w-12 h-18 text-sm' // Adjusted size for better visibility
  };
  const currentSizeClass = sizeClasses[size] || sizeClasses.normal;

  const cardBack = (
    <div className={`${currentSizeClass} rounded-lg border-2 border-gray-800 shadow-lg relative overflow-hidden transform transition-all duration-500 bg-gradient-to-br from-blue-700 to-blue-900 ${className}`}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-10 h-10 bg-blue-500 rounded-full opacity-30"></div>
      </div>
      <div className="absolute inset-0 border border-blue-400 rounded-lg"></div>
    </div>
  );

  if (isFaceDown || !rank) {
    return cardBack;
  }

  return (
    <div className={`${currentSizeClass} bg-white rounded-lg shadow-lg border border-gray-300 flex flex-col justify-between p-1 select-none transition-transform duration-300 ${className}`}>
      {/* Top-left rank and suit */}
      <div className={`flex flex-col items-center leading-none ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
        <span className="font-extrabold text-lg">{rank}</span>
        <span className="text-xs">{suitIcon}</span>
      </div>

      {/* Center suit icon (larger) */}
      <div className={`flex justify-center items-center flex-grow ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
        <span className="text-3xl">{suitIcon}</span>
      </div>

      {/* Bottom-right rank and suit (rotated) */}
      <div className={`flex flex-col items-center leading-none self-end rotate-180 ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
        <span className="font-extrabold text-lg">{rank}</span>
        <span className="text-xs">{suitIcon}</span>
      </div>
    </div>
  );
};

export default Card;