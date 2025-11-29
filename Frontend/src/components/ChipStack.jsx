import React, { useState, useEffect } from 'react';

const ChipStack = ({ amount }) => {
  const [isBet, setIsBet] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsBet(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!amount) return null;

  const animationClass = isBet ? 'bet-in-end' : 'bet-in-start';

  return (
    <div className={`flex flex-col items-center relative group ${animationClass}`}>
      <div className="absolute -top-6 bg-base-300/80 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
        ${amount}
      </div>
      <div className="w-8 h-5 rounded-[50%] bg-red-500 border-2 border-red-700 shadow-[0_2px_0_#900] z-30"></div>
      <div className="w-8 h-5 rounded-[50%] bg-blue-500 border-2 border-blue-700 shadow-[0_2px_0_#009] -mt-3.5 z-20"></div>
      <div className="w-8 h-5 rounded-[50%] bg-green-500 border-2 border-green-700 shadow-[0_2px_0_#090] -mt-3.5 z-10"></div>
      <div className="mt-1 bg-base-300/60 px-2 rounded-full text-[10px] font-bold text-primary border border-primary/30 backdrop-blur-sm">
        {amount}
      </div>
    </div>
  );
};

export default ChipStack;
