import React from 'react';

const PotDisplay = ({ totalPot }) => {
  if (!totalPot || totalPot <= 0) return null;
  return (
    <div className="relative z-20 text-center">
        <div className="text-white text-opacity-80 text-sm">
            Pot
        </div>
        <div className="text-xl font-bold text-yellow-300 drop-shadow-lg">
            ${totalPot}
        </div>
    </div>
  );
};

export default PotDisplay;