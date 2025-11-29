import React, { useState, useEffect, useRef } from 'react';
import { LogOut, MessageSquare } from 'lucide-react';
import { socket } from '../socket';
import Card from './Card';
import ChipStack from './ChipStack';
import PlayerSeat from './PlayerSeat';
import GameChat from './GameChat';
import Profile from './Profile';

const playSound = (type) => {
  const soundMap = {
    shuffle: '/sounds/shuffle.mp3',
    deal: '/sounds/deal.mp3',
    bet: '/sounds/bet.mp3',
    check: '/sounds/check.mp3',
    fold: '/sounds/fold.mp3',
    win: '/sounds/win.mp3',
  };

  if (soundMap[type]) {
    const audio = new Audio(soundMap[type]);
    audio.play().catch(e => console.error("Error playing sound:", e));
  }
};

const SEAT_POSITIONS = [
  { id: 0, top: '85%', left: '50%', align: 'bottom' }, // Hero
  { id: 1, top: '60%', left: '10%', align: 'left' },
  { id: 2, top: '25%', left: '20%', align: 'left' },
  { id: 3, top: '15%', left: '50%', align: 'top' },
  { id: 4, top: '25%', left: '80%', align: 'right' },
  { id: 5, top: '60%', left: '90%', align: 'right' },
];

const PokerTable = ({ tableConfig, user, onLeave, isReplayer = false }) => {
  const [gameState, setGameState] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userBetAmount, setUserBetAmount] = useState(20);
  const [chatMessages, setChatMessages] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [viewingProfileOf, setViewingProfileOf] = useState(null);

  useEffect(() => {
    if(isReplayer) {
        setGameState(tableConfig);
        setIsConnected(true);
        return;
    };

    const onConnect = () => {
      setIsConnected(true);
      socket.emit('join_game', { 
          tableId: tableConfig.id, 
          playerName: user.username,
          minBuyIn: tableConfig.minBuyIn,
          smallBlind: tableConfig.smallBlind,
          bigBlind: tableConfig.bigBlind,
          gameType: tableConfig.gameType,
      });
    };

    const onGameUpdate = (data) => {
        if (data.id === tableConfig.id) {
            if(gameState && gameState.phase !== 'preflop' && data.phase === 'preflop'){
                playSound('shuffle');
            }
            if(gameState && gameState.phase === 'preflop' && data.phase === 'flop'){
                playSound('deal');
            }
            if(gameState && gameState.phase === 'flop' && data.phase === 'turn'){
                playSound('deal');
            }
            if(gameState && gameState.phase === 'turn' && data.phase === 'river'){
                playSound('deal');
            }
            if(gameState && gameState.phase !== 'showdown' && data.phase === 'showdown'){
                if(data.players.find(p => p && p.isWinner && p.userId === user.userId)){
                    playSound('win');
                }
            }
            setGameState(data);
        }
    };

    const onChatMessage = (msg) => {
        setChatMessages(prev => [...prev, msg]);
        playSound('message');
    };

    socket.on('connect', onConnect);
    socket.on('game_update', onGameUpdate);
    socket.on('chat_message', onChatMessage);

    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('game_update', onGameUpdate);
      socket.off('chat_message', onChatMessage);
    };
  }, [tableConfig.id, user.username, isReplayer, gameState]);

  const handleSendMessage = (text) => {
      if(isReplayer) return;
      socket.emit('chat_message', { tableId: tableConfig.id, player: user.username, text });
  };

  const handleAction = (action, amount = 0) => {
      if(isReplayer) return;
      playSound(action);
      socket.emit('action', { tableId: tableConfig.id, action, amount });
  };
  
  const handleViewProfile = (userId) => {
      setViewingProfileOf(userId);
  };
  
  const currentGameState = isReplayer ? tableConfig : gameState;

  if (!isConnected || !currentGameState) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Conectando a la mesa...</div>;

  const myPlayer = user ? currentGameState.players.find(p => p && p.userId === user.userId) : null;
  const myIndex = user ? currentGameState.players.findIndex(p => p && p.userId === user.userId) : -1;

  const visualPlayers = SEAT_POSITIONS.map((pos, i) => {
      if (myIndex === -1) { // Spectator or replayer
          const player = currentGameState.players[i];
          return { player, position: pos };
      }
      const playerIndex = (myIndex + i) % 6;
      const player = currentGameState.players[playerIndex];
      return { player, position: pos };
  });

  const isMyTurn = currentGameState.activePlayerIndex === myIndex;

  return (
    <div className="fixed inset-0 bg-[#1a1a1a] text-white font-sans select-none flex flex-col">
        {viewingProfileOf && <Profile userId={viewingProfileOf} onClose={() => setViewingProfileOf(null)} />}
        
        <header className="h-12 bg-base-200 border-b border-base-300 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-4">
          <button onClick={onLeave} className="text-gray-400 hover:text-white flex items-center gap-1 text-sm font-bold uppercase">
            <LogOut className="w-4 h-4" /> Salir
          </button>
          <span className="text-xs text-gray-400 hidden md:inline">Mesa: {currentGameState.name} | ${currentGameState.smallBlind}/${currentGameState.bigBlind}</span>
        </div>
        <div className="flex items-center gap-4">
           <span className="text-green-400 font-mono text-sm">${myPlayer?.chips}</span>
           <button onClick={()=>setShowChat(!showChat)} className="md:hidden text-gray-400"><MessageSquare size={20}/></button>
        </div>
      </header>
      
      <div className="flex-1 flex relative overflow-hidden">
        <main className="flex-1 relative flex items-center justify-center bg-[radial-gradient(circle_at_center,theme('colors.secondary')_0%,theme('colors.base-100')_100%)]">
            <div className="relative w-[95%] max-w-6xl aspect-[2/1] rounded-[200px] shadow-[0_0_100px_rgba(0,0,0,0.8)] border-[12px] border-base-300">
                <div className="absolute inset-0 rounded-[180px] border border-base-100 shadow-inner bg-[url('https://www.transparenttextures.com/patterns/felt.png')] bg-repeat opacity-10"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4 z-10">
                    <div className="flex gap-2 h-16 md:h-20">
                        {currentGameState.communityCards.map((c,i) => <Card key={i} rank={c.rank} suit={c.suit}/>)}
                        {[...Array(5-(currentGameState.communityCards.length || 0))].map((_,i)=><div key={i} className="w-10 h-14 md:w-14 md:h-20 rounded border-2 border-base-300 bg-base-200/50"></div>)}
                    </div>
                    <div className="bg-base-300/50 text-white px-6 py-1 rounded-full border border-primary/30 shadow-lg backdrop-blur-sm flex flex-col items-center">
                       <span className="text-[10px] text-gray-400 uppercase">Total Pot</span>
                       <span className="text-primary font-bold text-lg">${currentGameState.pot}</span>
                    </div>
                    <div className="text-white font-bold text-sm drop-shadow-md">{currentGameState.message}</div>
                </div>
                 {visualPlayers.map(({ player, position }, i) => 
                    player ? (
                        <PlayerSeat 
                            key={player.id} 
                            player={player} 
                            position={position} 
                            isMe={user && player.userId === user.userId} 
                            isActive={currentGameState.activePlayerIndex === player.id}
                            onViewProfile={handleViewProfile}
                            gamePhase={currentGameState.phase}
                        />
                    ) : (
                        <div key={`empty-${i}`} className={`absolute`} style={{ top: position.top, left: position.left, transform: 'translate(-50%, -50%)' }}>
                            <div className="w-16 h-16 rounded-full bg-base-200/50 flex items-center justify-center text-gray-600 text-xs">Vacío</div>
                        </div>
                    )
                )}
            </div>
        </main>

        <aside className={`
            w-80 bg-base-200 border-l border-base-300 flex flex-col absolute right-0 top-0 bottom-0 z-40 transform transition-transform duration-300
            ${showChat ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0 md:relative
        `}>
            <GameChat chatMessages={chatMessages} onSendMessage={handleSendMessage} gameLogs={currentGameState.logs || []} />
        </aside>
      </div>

      <footer className="h-20 bg-base-200 border-t border-base-300 flex items-center justify-center gap-4 px-4 z-50">
        { isReplayer ? null :
        currentGameState.phase === 'showdown' || currentGameState.phase === 'lobby' ? (
           <button onClick={() => socket.emit('restart', { tableId: tableConfig.id })} className="bg-primary hover:bg-primary/80 text-black font-bold py-3 px-10 rounded-full shadow-lg active:scale-95 transition-all text-lg">
             SIGUIENTE MANO
           </button>
        ) : (
            isMyTurn && myPlayer ? (
                <>
                    <button onClick={() => handleAction('fold')} className="bg-red-900/80 hover:bg-red-700 border border-red-600 text-white font-bold py-3 px-6 rounded-lg active:scale-95 transition">FOLD</button>
                    <button onClick={() => handleAction(currentGameState.currentBet > myPlayer.currentBet ? 'call' : 'check')} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg active:scale-95 transition">
                        {currentGameState.currentBet > myPlayer.currentBet ? `CALL ${currentGameState.currentBet - myPlayer.currentBet}` : 'CHECK'}
                    </button>
                    <div className="flex bg-base-300 rounded-lg p-1 border border-base-100">
                        <input type="number" value={userBetAmount} onChange={(e)=>setUserBetAmount(Number(e.target.value))} className="w-20 bg-transparent text-white text-center font-bold outline-none"/>
                        <button onClick={() => handleAction('raise', userBetAmount)} className="bg-accent hover:bg-accent/80 text-white font-bold py-2 px-4 rounded active:scale-95 transition">RAISE</button>
                    </div>
                </>
            ) : <div className="text-gray-500 italic">Esperando turno...</div>
        )}
      </footer>
    </div>
  );
};

export default PokerTable;