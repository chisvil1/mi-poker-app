import React, { useState, useEffect, useRef } from 'react';
import { LogOut, MessageSquare } from 'lucide-react';
import { socket } from '@/socket';
import { playSound } from '@/utils/playSound';
import Card from '@/components/Card';
import ChipStack from '@/components/ChipStack';
import DealerButton from '@/components/DealerButton';
import PotDisplay from '@/components/PotDisplay';
import PlayerSeat from '@/components/PlayerSeat';
import GameChat from '@/components/GameChat';

const PokerTable = ({ tableConfig, user, onLeave }) => {
  const [gameState, setGameState] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userBetAmount, setUserBetAmount] = useState(20);
  const [chatMessages, setChatMessages] = useState([]);
  const [showChat, setShowChat] = useState(false);

  const SEAT_POSITIONS = [
    { id: 0, top: '82%', left: '50%', align: 'bottom' },
    { id: 1, top: '60%', left: '15%', align: 'left' },
    { id: 2, top: '25%', left: '20%', align: 'left' },
    { id: 3, top: '15%', left: '50%', align: 'top' },
    { id: 4, top: '25%', left: '80%', align: 'right' },
    { id: 5, top: '60%', left: '85%', align: 'right' },
  ];

  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    socket.on('connect', onConnect);
    
    socket.emit('join_game', { 
        roomId: tableConfig?.id.toString(), 
        playerName: user.username 
    });

    socket.on('game_update', (data) => {
        setGameState(data);
        if(!isConnected) setIsConnected(true);
        if (data.pot > 0) playSound('bet'); 
    });
    
    socket.on('chat_message', (msg) => {
        setChatMessages(prev => [...prev, msg]);
        playSound('message');
    });

    socket.on('error_joining', (data) => {
        alert(`Error al unirse a la mesa: ${data.message}`);
        onLeave();
    });

    if (socket.connected) onConnect();

    return () => {
        socket.off('connect', onConnect);
        socket.off('game_update');
        socket.off('chat_message');
        socket.off('error_joining');
    };
  }, [tableConfig?.id, user.username, onLeave]);

  const handleSendMessage = (text) => {
      socket.emit('chat_message', { player: user.username, text, roomId: tableConfig.id.toString() });
  };

  const handleAction = (action, amount = 0) => {
      socket.emit('action', { action, amount, roomId: tableConfig.id.toString() });
  };

  if (!gameState || !gameState.players) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Conectando a la mesa...</div>;
  }

  const myIndex = gameState.players.findIndex(p => p && p.name === user.username); 
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
          <span className="text-xs text-gray-400 hidden md:inline">Mesa: {tableConfig?.name || 'Mesa Pública'}</span>
        </div>
        <div className="flex items-center gap-4">
           <span className="text-green-400 font-mono text-sm">${myPlayer?.chips || 0}</span>
           <button onClick={()=>setShowChat(!showChat)} className="md:hidden text-gray-400"><MessageSquare size={20}/></button>
        </div>
      </header>
      
      <div className="flex-1 flex relative overflow-hidden">
        <main className="flex-1 relative flex items-center justify-center bg-[radial-gradient(circle_at_center,#1a472a_0%,#000000_100%)]">
            <div className="relative w-[95%] max-w-6xl aspect-[2/1] rounded-[200px] shadow-[0_0_100px_rgba(0,0,0,0.8)] border-[12px] border-[#111] bg-[#0a5c2b]">
                <div className="absolute inset-0 rounded-[180px] border border-[#ffffff10] shadow-inner bg-[url('https://www.transparenttextures.com/patterns/felt.png')] bg-repeat opacity-80"></div>
                
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-6 z-10">
                    <div className="flex gap-2 h-16 md:h-20">
                        {gameState.communityCards.map((c,i) => <Card key={i} rank={c?.rank} suit={c?.suit}/>)}
                    </div>
                    <PotDisplay totalPot={gameState.pot} />
                    <div className="text-green-300 font-bold text-sm drop-shadow-md animate-pulse">{gameState.message}</div>
                </div>

                {visualPlayers.map((p, i) => (
                    <PlayerSeat key={i} player={p} position={p.position} isMe={p?.name === user.username} isActive={gameState.activePlayerIndex === p?.id} />
                ))}
            </div>
        </main>
        <aside className={`w-80 bg-[#111] border-l border-[#333] flex flex-col absolute right-0 top-0 bottom-0 z-40 transform transition-transform duration-300 ${showChat ? 'translate-x-0' : 'translate-x-full'} md:relative md:translate-x-0`}>
            <GameChat chatMessages={chatMessages} onSendMessage={handleSendMessage} gameLogs={gameState.logs || []} />
        </aside>
      </div>

      <footer className="h-24 bg-[#121212] border-t border-[#333] flex items-center justify-center gap-4 px-4 z-50 flex-shrink-0">
        {gameState.phase === 'showdown' || gameState.phase === 'lobby' ? (
           <button onClick={() => socket.emit('restart', { roomId: tableConfig.id.toString() })} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-10 rounded-full shadow-lg active:scale-95 transition-all text-lg animate-pulse">
             {gameState.phase === 'lobby' ? 'EMPEZAR PARTIDA' : 'SIGUIENTE MANO'}
           </button>
        ) : (
            isMyTurn ? (
                <div className="flex gap-3 items-end">
                    <button onClick={() => handleAction('fold')} className="bg-red-900/80 hover:bg-red-700 border border-red-600 text-white font-bold py-3 px-6 rounded-lg active:scale-95 transition">FOLD</button>
                    <button onClick={() => handleAction(gameState.currentBet > myPlayer.currentBet ? 'call' : 'check')} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg active:scale-95 transition">
                        {gameState.currentBet > myPlayer.currentBet ? `CALL` : 'CHECK'}
                    </button>
                    <div className="flex bg-black/40 rounded-lg p-1 border border-gray-700">
                        <input type="number" value={userBetAmount} onChange={(e)=>setUserBetAmount(Number(e.target.value))} className="w-20 bg-transparent text-white text-center font-bold outline-none"/>
                        <button onClick={() => handleAction('raise', gameState.currentBet + userBetAmount)} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded active:scale-95 transition">RAISE</button>
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