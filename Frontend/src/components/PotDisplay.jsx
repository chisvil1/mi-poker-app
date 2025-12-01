import React from 'react';

const PotDisplay = ({ totalPot }) => {
  if (!totalPot || totalPot <= 0) return null;
  return (
    <div className="relative z-20">
        <div className="bg-black/60 px-4 py-1 rounded-full border border-yellow-500/50 text-yellow-400 font-bold shadow-lg backdrop-blur-sm">
            Pot: ${totalPot}
        </div>
    </div>
  );
};

export default PotDisplay;