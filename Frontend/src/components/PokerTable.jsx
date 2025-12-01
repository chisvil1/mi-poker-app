import React, { useState, useEffect, useRef } from 'react';
import { LogOut, MessageSquare, Send } from 'lucide-react';
import { socket } from '@/socket';
import { playSound } from '@/utils/playSound';

const Card = ({ rank, suit, isFaceDown = false, size = 'normal', className = "" }) => {
  const isRed = suit === 'h' || suit === 'd' || suit === '♥️' || suit === '♦️';
  const suitIcon = { 's': '♠', 'h': '♥', 'c': '♣', 'd': '♦', '♠️': '♠', '♥️': '♥', '♣️': '♣', '♦️': '♦' }[suit] || suit;
  
  const sizeClasses = { 
    normal: 'w-10 h-14 md:w-14 md:h-20', 
    small: 'w-8 h-12 md:w-10 md:h-14 text-xs' 
  };
  const currentSizeClass = sizeClasses[size] || sizeClasses.normal;

  if (isFaceDown || !rank) {
    return (
      <div className={`${currentSizeClass} rounded-md border border-gray-900 shadow-xl relative overflow-hidden transform transition-all duration-500 hover:-translate-y-2 bg-[#6b0f0f] ${className}`}>
        <div className="absolute inset-1 border border-white/20 rounded-sm"></div>
      </div>
    );
  }

  return (
    <div className={`${currentSizeClass} bg-white rounded-md shadow-xl border border-gray-300 flex flex-col items-center justify-between p-1 select-none transition-transform duration-300 hover:-translate-y-2 ${className}`}>
      <div className={`text-xs md:text-sm font-bold self-start ${isRed ? 'text-red-600' : 'text-black'}`}>{rank}</div>
      <div className={`text-lg md:text-2xl ${isRed ? 'text-red-600' : 'text-black'}`}>{suitIcon}</div>
    </div>
  );
};

// ... (ChipStack, DealerButton, PotDisplay, PlayerSeat, GameChat can also be here or in their own files)

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

  if (!gameState || !gameState.players) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Conectando a la mesa...</div>;

  const myIndex = gameState.players.findIndex(p => p && p.name === user.username); 
  const visualPlayers = gameState.players.map((p, i) => {
      const relativeIndex = myIndex !== -1 ? (i - myIndex + 6) % 6 : i;
      return { ...p, position: SEAT_POSITIONS[relativeIndex] };
  });
  const myPlayer = gameState.players[myIndex] || {};
  const isMyTurn = gameState.activePlayerIndex === myIndex;

  return (
    <div className="fixed inset-0 bg-[#1a1a1a] text-white font-sans select-none flex flex-col">
      <header className="h-12 bg-[#0f0f0f] border-b border-[#333] flex items-center justify-between px-4 z-50">
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
      
      {/* ... rest of the JSX ... */}
    </div>
  );
};

export default PokerTable;