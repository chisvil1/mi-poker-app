import React from 'react';
import Card from './Card';
import ChipStack from './ChipStack';
import DealerButton from './DealerButton';

const PlayerSeat = ({ player, position, isMe, isActive }) => {
  if (!player) return null;
  const { isWinner, hasFolded, isAllIn, showCards, hand, status, chips } = player;

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
    <div
      className="absolute flex flex-col items-center justify-center transition-all duration-500"
      style={{ top: position.top, left: position.left, transform: 'translate(-50%, -50%)', opacity: (hasFolded || status === 'away') ? 0.6 : 1, zIndex: isActive ? 40 : 20 }}
    >
      {/* Player Box */}
      <div className={`relative flex flex-col items-center p-2 rounded-lg bg-gray-900/70 border ${isActive ? 'border-yellow-500 shadow-lg' : 'border-gray-700'} transition-all duration-300`}>
        {/* Avatar */}
        <div className="relative w-20 h-20 rounded-full bg-gray-800 ring-2 ring-gray-600">
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} alt={player.name} className={`w-full h-full rounded-full p-1 ${hasFolded || status === 'away' ? 'grayscale' : ''}`} />
          {player.isDealer && <DealerButton />}
        </div>

        {/* Info */}
        <div className="mt-2 text-center">
          <div className="text-white text-sm font-bold truncate max-w-[100px]">{player.name}</div>
          <div className="text-green-400 text-xs font-bold font-mono">${chips}</div>
        </div>

        {/* Status Indicators */}
        {isAllIn && !hasFolded && <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-600 text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase shadow-md border border-white/20">All-in</div>}
        {hasFolded && <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white font-bold text-lg rounded-lg">FOLD</div>}
        {status === 'away' && <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white font-bold text-xs rounded-lg">AUSENTE</div>}

        {/* Cartas */}
        <div className={`absolute z-20 flex -space-x-2 transition-all duration-500 ${position.align === 'bottom' ? '-top-10' : 'top-10'}`}>
          {renderHand()}
        </div>
      </div>

      {/* Apuesta */}
      {player.currentBet > 0 && (
        <div className={`absolute z-0 transition-all duration-500 animate-in zoom-in ${position.align === 'bottom' ? '-bottom-10' : 'top-10'}`}>
          <ChipStack amount={player.currentBet} />
        </div>
      )}
    </div>
  );
};

export default PlayerSeat;