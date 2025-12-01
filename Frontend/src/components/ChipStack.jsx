import React from 'react';

const ChipStack = ({ amount }) => {
  if (!amount) return null;
  return (
    <div className="flex flex-col items-center relative group animate-bounce-small">
      <div className="absolute -top-6 bg-black/80 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
        ${amount}
      </div>
      <div className="w-6 h-4 rounded-[50%] bg-red-600 border border-red-800 shadow-[0_2px_0_#991b1b] z-30"></div>
      <div className="w-6 h-4 rounded-[50%] bg-blue-600 border border-blue-800 shadow-[0_2px_0_#1e40af] -mt-3 z-20"></div>
      <div className="w-6 h-4 rounded-[50%] bg-green-600 border border-green-800 shadow-[0_2px_0_#166534] -mt-3 z-10"></div>
      <div className="mt-1 bg-black/60 px-2 rounded-full text-[10px] font-bold text-yellow-400 border border-yellow-600/30 backdrop-blur-sm">
        {amount}
      </div>
    </div>
  );
};

export default ChipStack;