import React, { useState } from 'react';
import { LogOut, MessageSquare } from 'lucide-react';
import Card from '@/components/Card';
import ChipStack from '@/components/ChipStack';
import DealerButton from '@/components/DealerButton';
import PotDisplay from '@/components/PotDisplay';
import PlayerSeat from '@/components/PlayerSeat';
import GameChat from '@/components/GameChat';

// This is now a presentational component. It receives all state and handlers as props.
const PokerTable = ({ gameState, user, onLeave, onAction, onSendMessage, onRestart, chatMessages }) => {
  const [userBetAmount, setUserBetAmount] = useState(20);
  const [showChat, setShowChat] = useState(false);

  const SEAT_POSITIONS = [
    { id: 0, top: '82%', left: '50%', align: 'bottom' },
    { id: 1, top: '60%', left: '15%', align: 'left' },
    { id: 2, top: '25%', left: '20%', align: 'left' },
    { id: 3, top: '15%', left: '50%', align: 'top' },
    { id: 4, top: '25%', left: '80%', align: 'right' },
    { id: 5, top: '60%', left: '85%', align: 'right' },
  ];

  if (!gameState || !gameState.players) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Esperando estado del juego...</div>;
  }

  // Logic to calculate player positions relative to the user
  const myIndex = gameState.players.findIndex(p => p && p.userId === user.id);
  const visualPlayers = gameState.players.map((p, i) => {
      const relativeIndex = myIndex !== -1 ? (i - myIndex + 6) % 6 : i;
      return { ...p, position: SEAT_POSITIONS[relativeIndex] };
  });
  const myPlayer = gameState.players[myIndex] || {};
  const isMyTurn = gameState.activePlayerIndex === myIndex;

  return (
    <div className="fixed inset-0 bg-[#1a1a1a] text-white font-sans select-none flex flex-col h-screen">
       <header className="h-12 bg-[#0f0f0f] border-b border-[#333] flex items-center justify-between px-4 z-50 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onLeave} className="text-gray-400 hover:text-white flex items-center gap-1 text-sm font-bold uppercase">
            <LogOut className="w-4 h-4" /> Lobby
          </button>
          <span className="text-xs text-gray-400 hidden md:inline">Mesa: {gameState?.name || 'Mesa Pública'}</span>
        </div>
        <div className="flex items-center gap-4">
           <span className="text-green-400 font-mono text-sm">${myPlayer?.chips || 0}</span>
           <button onClick={()=>setShowChat(!showChat)} className="md:hidden text-gray-400"><MessageSquare size={20}/></button>
        </div>
      </header>
      
      <div className="flex-1 flex relative overflow-hidden">
        <main className="flex-1 relative flex items-center justify-center bg-[radial-gradient(circle_at_center,#1a472a_0%,#000000_100%)]">
            {/* New Poker Table Structure */}
            <div className="relative w-[95%] max-w-6xl aspect-[2/1] rounded-full shadow-[0_0_100px_rgba(0,0,0,0.8)] bg-[#1a1a1a] p-4"> {/* Outer Rail */}
              <div className="relative w-full h-full rounded-full bg-gray-800 p-4"> {/* Racetrack */}
                <div className="relative w-full h-full rounded-full bg-[#0a5c2b] shadow-inner shadow-black/50"> {/* Felt */}
                  <div className="absolute inset-0 rounded-full border-2 border-yellow-700/50 opacity-50"></div> {/* Inner line detail */}
                  <div className="absolute inset-0 rounded-full bg-[url('https://www.transparenttextures.com/patterns/felt.png')] bg-repeat opacity-50"></div>
                  
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translatey-1/2 flex flex-col items-center gap-6 z-10">
                      <div className="flex gap-2 h-16 md:h-20">
                          {gameState.communityCards.map((c,i) => <Card key={i} rank={c?.rank} suit={c?.suit}/>)}
                      </div>
                      <PotDisplay totalPot={gameState.pot} />
                      <div className="text-green-300 font-bold text-sm drop-shadow-md animate-pulse">{gameState.message}</div>
                  </div>

                  {visualPlayers.map((p, i) => (
                      <PlayerSeat key={i} player={p} position={p.position} isMe={p?.userId === user.id} isActive={gameState.activePlayerIndex === p?.id} />
                  ))}
                </div>
              </div>
            </div>
        </main>
        <aside className={`w-80 bg-[#111] border-l border-[#333] flex flex-col absolute right-0 top-0 bottom-0 z-40 transform transition-transform duration-300 ${showChat ? 'translate-x-0' : 'translate-x-full'} md:relative md:translate-x-0`}>
            <GameChat 
                chatMessages={chatMessages} 
                onSendMessage={(text) => onSendMessage(text, gameState.id)} 
                gameLogs={gameState.logs || []}
                userId={user.id} 
            />
        </aside>
      </div>

      <footer className="h-24 bg-[#121212] border-t border-[#333] flex items-center justify-center gap-4 px-4 z-50 flex-shrink-0">
        {gameState.phase === 'showdown' || gameState.phase === 'lobby' ? (
           <button onClick={() => onRestart(gameState.id)} className="bg-blue-700 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-full shadow-lg active:scale-95 transition-all text-lg animate-pulse uppercase tracking-wide">
             {gameState.phase === 'lobby' ? 'EMPEZAR PARTIDA' : 'SIGUIENTE MANO'}
           </button>
        ) : (
            isMyTurn ? (
                <div className="flex gap-3 items-end">
                    <button onClick={() => onAction('fold')} className="bg-red-800 hover:bg-red-700 border-b-4 border-red-900 text-white font-bold py-3 px-6 rounded-lg active:translate-y-0.5 active:border-b-0 transition-all duration-150 shadow-md uppercase">FOLD</button>
                    <button onClick={() => onAction(gameState.currentBet > myPlayer.currentBet ? 'call' : 'check')} className="bg-gray-700 hover:bg-gray-600 border-b-4 border-gray-800 text-white font-bold py-3 px-6 rounded-lg active:translate-y-0.5 active:border-b-0 transition-all duration-150 shadow-md uppercase">
                        {gameState.currentBet > myPlayer.currentBet ? `CALL $${gameState.currentBet - myPlayer.currentBet}` : 'CHECK'}
                    </button>
                    <div className="flex items-center bg-gray-800 rounded-lg p-1 border-b-4 border-gray-900 shadow-md">
                        <input
                            type="number"
                            value={userBetAmount}
                            onChange={(e)=>setUserBetAmount(Number(e.target.value))}
                            className="w-20 bg-transparent text-white text-center font-bold outline-none text-lg px-2"
                            min={gameState.minBet || 0} // Add min attribute for better UX
                            max={myPlayer?.chips || 0} // Add max attribute
                        />
                        <button onClick={() => onAction('raise', userBetAmount)} className="bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md active:translate-y-0.5 active:border-b-0 transition-all duration-150 shadow-md uppercase ml-2">RAISE</button>
                    </div>
                </div>
            ) : (
                <div className="text-gray-500 italic flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div> Esperando turno...
                </div>
            )
        )}
      </footer>
    </div>
  );
};

export default PokerTable;