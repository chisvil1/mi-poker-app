import React, { useEffect, useState } from 'react';
import Card from './Card';
import ChipStack from './ChipStack';

const DealerButton = () => (
  <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center text-black font-bold text-[10px] shadow-md border-2 border-gray-300 z-30">
    D
  </div>
);

const PlayerSeat = ({ player, position, isMe, isActive, onViewProfile, gamePhase }) => {
  const { isWinner, hasFolded, isAllIn, showCards } = player;
  const [dealtCards, setDealtCards] = useState([]);

  useEffect(() => {
    if (gamePhase === 'preflop') {
      const timeouts = player.hand.map((card, i) => 
        setTimeout(() => {
          setDealtCards(prev => [...prev, card]);
        }, 100 + i * 150) // Stagger animation
      );
      return () => timeouts.forEach(clearTimeout);
    } else {
        setDealtCards(player.hand);
    }
  }, [player.hand, gamePhase]);

  const handleAvatarClick = () => {
      if (player.isHuman) {
          onViewProfile(player.userId);
      }
  };

  return (
    <div
      className={`absolute flex flex-col items-center justify-center transition-all duration-500 ${isWinner ? 'winner-glow' : ''}`}
      style={{
        top: position.top,
        left: position.left,
        transform: 'translate(-50%, -50%)',
        opacity: hasFolded ? 0.6 : 1
      }}
    >
      <div className={`absolute z-20 flex -space-x-4 transition-all duration-500
        ${position.align === 'bottom' ? '-top-12' : ''}
        ${position.align === 'top' ? '-bottom-10' : ''}
        ${position.align === 'left' ? '-right-16 top-0' : ''}
        ${position.align === 'right' ? '-left-16 top-0' : ''}
        ${hasFolded ? 'opacity-0 scale-75' : 'opacity-100'}
      `}>
        {dealtCards.map((card, i) => (
          <div key={i} className={`transform ${ i===0 ? '-rotate-12' : i===1 ? '-rotate-4' : i===2 ? 'rotate-4' : 'rotate-12'} ${isWinner ? 'animate-bounce' : ''} transition-all duration-500 origin-bottom-center`}>
             <Card rank={card?.rank} suit={card?.suit} isFaceDown={!card || (!isMe && !player.showCards && !isWinner)} size="small" animate={gamePhase === 'preflop'}/>
          </div>
        ))}
      </div>

      <div
        className={`relative w-14 h-14 md:w-16 md:h-16 rounded-full transition-all duration-300 z-10 cursor-pointer
        ${isActive ? 'ring-4 ring-primary shadow-[0_0_25px_rgba(250,204,21,0.6)] scale-105' : 'ring-2 ring-base-300 shadow-lg'}
        bg-base-200`}
        onClick={handleAvatarClick}
      >
        <img
          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`}
          alt={player.name}
          className={`w-full h-full rounded-full p-0.5 ${hasFolded ? 'grayscale' : ''}`}
        />
        {player.isAllIn && !hasFolded && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase shadow-md border border-white/20">All-in</div>}
        {player.isDealer && <DealerButton />}
      </div>

      <div className={`mt-[-12px] z-30 bg-base-300/90 backdrop-blur border border-base-100 rounded-lg px-2 py-0.5 text-center shadow-xl min-w-[80px] transition-colors ${isActive ? 'border-primary/50 bg-base-200' : ''}`}>
        <div className="text-gray-300 text-[10px] font-bold truncate max-w-[70px] mx-auto">{player.name}</div>
        <div className="text-green-400 text-xs font-bold font-mono">${player.chips}</div>
      </div>

      {player.currentBet > 0 && (
        <div className={`absolute z-0 transition-all duration-500 animate-in zoom-in
          ${position.align === 'bottom' ? '-top-24' : ''}
          ${position.align === 'top' ? '-bottom-24' : ''}
          ${position.align === 'left' ? '-right-24' : ''}
          ${position.align === 'right' ? '-left-24' : ''}
        `}>
          <ChipStack amount={player.currentBet} />
        </div>
      )}
    </div>
  );
};

export default PlayerSeat;
