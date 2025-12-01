import React from 'react';
import Card from './Card';
import ChipStack from './ChipStack';
import DealerButton from './DealerButton';

const PlayerSeat = ({ player, position, isMe, isActive }) => {
  if (!player) return null;
  const { isWinner, hasFolded, isAllIn, showCards, hand, status } = player;

  const renderHand = () => {
      if (!hand || hand.length === 0) return null;
      return hand.map((card, i) => {
          const isHidden = !card || (!isMe && !showCards && !isWinner);
          return (
              <div key={i} className={`transform ${i===0?'-rotate-6':'rotate-6'} ${isWinner ? 'animate-bounce' : ''} transition-all duration-500 origin-bottom-left`}>
                  <Card rank={card?.rank} suit={card?.suit} isFaceDown={isHidden} size="small" />
              </div>
          );
      });
  };

  return (
    <div className="absolute flex flex-col items-center justify-center transition-all duration-500"
      style={{ top: position.top, left: position.left, transform: 'translate(-50%, -50%)', opacity: (hasFolded || status === 'away') ? 0.6 : 1, zIndex: isActive ? 40 : 20 }}
    >
      {/* Cartas */}
      <div className={`absolute z-20 flex -space-x-2 transition-all duration-500 ${position.align === 'bottom' ? '-top-14' : '-bottom-12'}`}>
        {renderHand()}
      </div>

      {/* Avatar */}
      <div className={`relative w-16 h-16 rounded-full transition-all duration-300 z-10 bg-gray-800 ${isActive ? 'ring-4 ring-yellow-400 shadow-[0_0_25px_gold] scale-105' : 'ring-2 ring-black/50 shadow-lg'}`}>
        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} alt={player.name} className={`w-full h-full rounded-full p-1 ${hasFolded || status === 'away' ? 'grayscale' : ''}`} />
        {isAllIn && !hasFolded && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase shadow-md border border-white/20">All-in</div>}
        {player.isDealer && <DealerButton />}
        {status === 'away' && <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white font-bold text-xs rounded-full">AUSENTE</div>}
      </div>

      {/* Info */}
      <div className={`mt-[-10px] z-30 bg-gray-900/90 backdrop-blur border border-gray-600 rounded-lg px-3 py-1 text-center shadow-xl min-w-[90px] ${isActive ? 'border-yellow-500' : ''}`}>
        <div className="text-gray-300 text-[10px] font-bold truncate max-w-[80px] mx-auto">{player.name}</div>
        <div className="text-green-400 text-xs font-bold font-mono">${player.chips}</div>
      </div>

      {/* Apuesta */}
      {player.currentBet > 0 && (
        <div className={`absolute z-0 transition-all duration-500 animate-in zoom-in ${position.align === 'bottom' ? '-top-28' : 'top-24'}`}>
          <ChipStack amount={player.currentBet} />
        </div>
      )}
    </div>
  );
};

export default PlayerSeat;