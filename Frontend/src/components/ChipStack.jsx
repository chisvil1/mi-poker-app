import React from 'react';

const Chip = ({ color, shadowColor, topShadowColor, ringColor, className = "" }) => (
  <div className={`relative w-8 h-8 rounded-full border-2 ${ringColor} ${className}`}
       style={{
         backgroundColor: color,
         boxShadow: `inset 0 0 5px ${topShadowColor}, 0 0 3px rgba(0,0,0,0.5), 0 2px 0 ${shadowColor}`
       }}>
    <div className="absolute inset-0 rounded-full"
         style={{
           background: `radial-gradient(circle at 50% 25%, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 70%)`
         }}></div>
  </div>
);

const ChipStack = ({ amount }) => {
  if (!amount || amount <= 0) return null;

  // Determine chip color based on amount (simple example)
  let chipColor = 'bg-gray-400'; // Default
  let shadowColor = '#9ca3af'; // Default shadow
  let topShadowColor = 'rgba(255,255,255,0.5)';
  let ringColor = 'border-gray-500';

  if (amount >= 1000) {
    chipColor = 'bg-black';
    shadowColor = '#1f2937';
    ringColor = 'border-gray-800';
  } else if (amount >= 500) {
    chipColor = 'bg-purple-700';
    shadowColor = '#6d28d9';
    ringColor = 'border-purple-800';
  } else if (amount >= 100) {
    chipColor = 'bg-yellow-500';
    shadowColor = '#facc15';
    ringColor = 'border-yellow-600';
  } else if (amount >= 50) {
    chipColor = 'bg-red-600';
    shadowColor = '#dc2626';
    ringColor = 'border-red-700';
  } else if (amount >= 25) {
    chipColor = 'bg-green-500';
    shadowColor = '#22c55e';
    ringColor = 'border-green-600';
  } else if (amount >= 10) {
    chipColor = 'bg-blue-600';
    shadowColor = '#2563eb';
    ringColor = 'border-blue-700';
  } else { // For smaller amounts, maybe white or light gray
    chipColor = 'bg-white';
    shadowColor = '#d1d5db';
    ringColor = 'border-gray-300';
  }


  const chipsToRender = Math.min(Math.ceil(amount / 50), 4); // Render up to 4 chips, or fewer for small amounts

  const chipElements = Array.from({ length: chipsToRender }).map((_, i) => (
    <Chip
      key={i}
      color={chipColor.replace('bg-', '#')} // Tailwind bg- classes converted to hex for style
      shadowColor={shadowColor}
      topShadowColor={topShadowColor}
      ringColor={ringColor}
      className={`absolute transition-all duration-200`}
      style={{
        bottom: `${i * 6}px`, // Stacking effect
        zIndex: chipsToRender - i,
      }}
    />
  ));


  return (
    <div className="relative flex flex-col items-center justify-center h-20 w-12 pt-10">
      {chipElements}
      <div className="absolute top-0 bg-black/70 px-2 py-1 rounded-full text-white font-bold text-xs border border-gray-600 shadow-md">
        ${amount}
      </div>
    </div>
  );
};

export default ChipStack;