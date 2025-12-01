import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, Volume2, VolumeX, Trophy, 
  Menu, DollarSign, RefreshCw, ChevronRight, 
  Users, CreditCard, LogOut, X, ShieldCheck, Filter, Play, Plus,
  MessageSquare, History, Send, Mail, Smartphone, Key
} from 'lucide-react';
import { io } from 'socket.io-client';

// --- 1. CONFIGURACIÓN DE CONEXIÓN ---
const getBackendUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return 'http://localhost:4000';
  }
  // Tu URL de producción de Render
  return 'https://mi-poker-app.onrender.com'; 
};

const socket = io(getBackendUrl(), {
    transports: ['websocket', 'polling'],
    reconnection: true,
});

// --- 2. UTILIDADES (Sonidos) ---
const playSound = (type) => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  const now = ctx.currentTime;

  if (type === 'fold') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
    gainNode.gain.setValueAtTime(0.1, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(); osc.stop(now + 0.1);
  } else if (type === 'check') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    gainNode.gain.setValueAtTime(0.05, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc.start(); osc.stop(now + 0.05);
  } else if (type === 'bet') { 
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);
    gainNode.gain.setValueAtTime(0.05, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc.start(); osc.stop(now + 0.05);
  } else if (type === 'message') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    gainNode.gain.setValueAtTime(0.02, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.start(); osc.stop(now + 0.1);
  }
};

// --- 3. COMPONENTES VISUALES ---

const Card = ({ rank, suit, isFaceDown = false, size = 'normal', className = "" }) => {
  const isRed = suit === 'h' || suit === 'd' || suit === '♥️' || suit === '♦️'; // Soporte para formatos del server
  // Mapeo de símbolos si el server envía letras (s, h, c, d)
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

const DealerButton = () => (
  <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center text-black font-bold text-[10px] shadow-md border-2 border-gray-300 z-30">D</div>
);

const PotDisplay = ({ totalPot }) => {
  if (!totalPot || totalPot <= 0) return null;
  return (
    <div className="relative z-20">
        <div className="bg-black/60 px-4 py-1 rounded-full border border-yellow-500/50 text-yellow-400 font-bold shadow-lg backdrop-blur-sm">
            Pot: ${totalPot}
        </div>
    </div>
  );
};

const PlayerSeat = ({ player, position, isMe, isActive }) => {
  if (!player) return null;
  const { isWinner, hasFolded, isAllIn, showCards, hand } = player;

  const renderHand = () => {
      if (!hand || hand.length === 0) return null;
      return hand.map((card, i) => {
          // Si el servidor envía null (carta oculta) o es carta de otro
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
      style={{ top: position.top, left: position.left, transform: 'translate(-50%, -50%)', opacity: hasFolded ? 0.6 : 1, zIndex: isActive ? 40 : 20 }}
    >
      {/* Cartas */}
      <div className={`absolute z-20 flex -space-x-2 transition-all duration-500 ${position.align === 'bottom' ? '-top-14' : '-bottom-12'}`}>
        {renderHand()}
      </div>

      {/* Avatar */}
      <div className={`relative w-16 h-16 rounded-full transition-all duration-300 z-10 bg-gray-800 ${isActive ? 'ring-4 ring-yellow-400 shadow-[0_0_25px_gold] scale-105' : 'ring-2 ring-black/50 shadow-lg'}`}>
        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} alt={player.name} className={`w-full h-full rounded-full p-1 ${hasFolded ? 'grayscale' : ''}`} />
        {isAllIn && !hasFolded && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase shadow-md border border-white/20">All-in</div>}
        {player.isDealer && <DealerButton />}
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

// --- PANTALLA DE LOGIN ---
const AuthScreen = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [serverStatus, setServerStatus] = useState('Conectando...');

    useEffect(() => {
        const onConnect = () => setServerStatus('Conectado 🟢');
        const onDisconnect = () => setServerStatus('Desconectado 🔴');

        if (socket.connected) onConnect();
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
        };
    }, []);

    return (
        <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4 flex-col">
            <div className="bg-[#1a1a1a] w-full max-w-md p-8 rounded-2xl border border-gray-700 shadow-2xl text-center">
                <h1 className="text-3xl font-black text-white mb-2">CASH<span className="text-red-600">POKER</span></h1>
                <div className="flex items-center justify-center gap-2 mb-6 text-xs bg-black/30 p-2 rounded border border-gray-800">
                    <span>Estado Servidor:</span>
                    <span className={`font-bold ${serverStatus.includes('Conectado') ? 'text-green-500' : 'text-red-500'}`}>{serverStatus}</span>
                </div>
                <input 
                    type="text" 
                    placeholder="Elige un nombre de usuario" 
                    className="w-full bg-black border border-gray-600 rounded-lg p-3 text-white mb-4 focus:border-green-500 outline-none"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <button 
                    onClick={() => username && onLogin(username)}
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition"
                >
                    JUGAR AHORA
                </button>
            </div>
        </div>
    );
};

// --- CHAT ---
const GameChat = ({ chatMessages, onSendMessage, gameLogs }) => {
    const [message, setMessage] = useState('');
    const [activeTab, setActiveTab] = useState('chat'); 
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages, gameLogs, activeTab]);

    const handleSend = (e) => {
        e.preventDefault();
        if (message.trim()) {
            onSendMessage(message);
            setMessage('');
        }
    };

    return (
        <div className="bg-gray-900 border-l border-gray-800 w-full h-full flex flex-col text-xs md:text-sm">
            <div className="flex border-b border-gray-800">
                <button onClick={()=>setActiveTab('chat')} className={`flex-1 py-2 font-bold ${activeTab==='chat'?'text-white border-b-2 border-red-600':'text-gray-500'}`}>Chat</button>
                <button onClick={()=>setActiveTab('log')} className={`flex-1 py-2 font-bold ${activeTab==='log'?'text-white border-b-2 border-red-600':'text-gray-500'}`}>Historial</button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {activeTab === 'chat' ? (
                    chatMessages.length > 0 ? chatMessages.map((msg, i) => (
                        <div key={i} className="break-words">
                            <span className="font-bold text-gray-400">{msg.player}: </span>
                            <span className="text-gray-200">{msg.text}</span>
                        </div>
                    )) : <div className="text-gray-600 text-center mt-4">¡Di hola!</div>
                ) : (
                    gameLogs.map((log, i) => (
                        <div key={i} className="text-gray-400 border-b border-gray-800/50 pb-1 mb-1 last:border-0">{log}</div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>
            {activeTab === 'chat' && (
                <form onSubmit={handleSend} className="p-2 border-t border-gray-800 flex gap-2">
                    <input type="text" value={message} onChange={(e)=>setMessage(e.target.value)} placeholder="Escribe..." className="flex-1 bg-black border border-gray-700 rounded px-2 py-1 text-white outline-none"/>
                    <button type="submit" className="bg-red-600 text-white p-1 rounded"><Send size={16}/></button>
                </form>
            )}
        </div>
    );
};

// --- POKER TABLE ---
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
    
    // Al montar, unirse a la sala
    socket.emit('join_game', { 
        roomId: tableConfig?.id.toString() || 'default', 
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
  }, [tableConfig?.id, user.username]);

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

        <aside className={`
            w-80 bg-[#111] border-l border-[#333] flex flex-col absolute right-0 top-0 bottom-0 z-40 transform transition-transform duration-300
            ${showChat ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0 md:relative
        `}>
            <GameChat chatMessages={chatMessages} onSendMessage={handleSendMessage} gameLogs={gameState.logs || []} />
        </aside>
      </div>

      <footer className="h-24 bg-[#121212] border-t border-[#333] flex items-center justify-center gap-4 px-4 z-50">
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

// --- VISTA DEL CAJERO (RECARGAS) ---
const Cashier = ({ onClose, onDeposit }) => {
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('card'); 

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2"><DollarSign className="text-green-500"/> Cajero Cripto</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><X /></button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-3 gap-2">
                        {['BTC', 'USDT', 'LTC'].map(c => (
                            <button key={c} onClick={() => setMethod(c)} className={`p-3 rounded border text-center font-bold ${method===c?'bg-green-900 border-green-500':'bg-black border-gray-700 text-gray-500'}`}>{c}</button>
                        ))}
                    </div>
                    <input type="number" value={amount} onChange={(e)=>setAmount(e.target.value)} className="w-full bg-black border border-gray-700 rounded p-3 text-white text-lg" placeholder="Monto USD"/>
                    <button onClick={() => { onDeposit(amount, method); onClose(); }} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl">GENERAR PAGO</button>
                </div>
            </div>
        </div>
    );
};

// --- LOBBY PRINCIPAL ---
const Lobby = ({ onJoinTable, balance, onOpenCashier }) => {
    const [tables, setTables] = useState([
        { id: 101, name: "La Cueva", blinds: "0.50/1.00", type: "NLH", players: 5, max: 6, minBuyIn: 50 },
        { id: 102, name: "High Rollers", blinds: "5/10", type: "NLH", players: 3, max: 6, minBuyIn: 500 },
        { id: 103, name: "Principiantes", blinds: "0.10/0.25", type: "NLH", players: 6, max: 9, minBuyIn: 10 },
    ]);

    return (
        <div className="flex h-full bg-[#1a1a1a]">
            <aside className="w-64 bg-[#0f0f0f] border-r border-[#333] p-4 hidden md:flex flex-col gap-2">
                <button className="bg-red-600 text-white p-3 rounded font-bold flex gap-2"><DollarSign/> Cash Games</button>
                <button className="text-gray-400 hover:bg-[#222] p-3 rounded font-bold flex gap-2"><Trophy/> Torneos</button>
            </aside>
            <div className="flex-1 p-6 overflow-y-auto">
                <div className="grid gap-3">
                    {tables.map(t => (
                        <div key={t.id} className="bg-[#222] p-4 rounded-xl border border-[#333] flex justify-between items-center hover:border-gray-500 transition">
                            <div>
                                <div className="font-bold text-white text-lg">{t.name}</div>
                                <div className="text-gray-400 text-sm">{t.type} - ${t.blinds}</div>
                            </div>
                            <button onClick={()=>onJoinTable(t)} className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-lg">JUGAR</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- APP CONTAINER ---
const App = () => {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('lobby');
  const [activeTable, setActiveTable] = useState(null);
  const [showCashier, setShowCashier] = useState(false);

  useEffect(() => {
    socket.on('logged_in', (userData) => setUser(userData));
    socket.on('balance_update', (newBalance) => setUser(prev => ({ ...prev, balance: newBalance })));
    
    return () => {
        socket.off('logged_in');
        socket.off('balance_update');
    };
  }, []);

  const handleLogin = (username) => {
      socket.emit('login', { username }); 
  };

  const handleDeposit = (amount, currency) => {
      socket.emit('deposit', { amount }); // Simulación por socket
      alert(`Generando dirección de depósito para ${amount} USD en ${currency} (Conectando a pasarela...)`);
  };

  if (!user) return <AuthScreen onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-gray-200 font-sans flex flex-col overflow-hidden">
        {showCashier && <Cashier onClose={()=>setShowCashier(false)} onDeposit={handleDeposit} />}
        
        {view === 'lobby' && (
            <header className="h-16 bg-[#0f0f0f] border-b border-[#333] flex items-center justify-between px-6 z-50 relative">
                            <div className="flex items-center gap-2 select-none">
                                <span className="text-2xl">♠️</span>
                                <span className="text-2xl font-black text-white tracking-tighter">CASH<span className="text-red-600">POKER</span></span>
                                <span className="text-xs text-gray-500 ml-2">v1.0.0</span>
                            </div>                <div className="flex items-center gap-4">
                    <div className="bg-[#222] rounded-full pl-4 pr-1 py-1 border border-[#444] flex items-center gap-3">
                        <span className="text-green-400 font-mono font-bold tracking-wide">${user.balance ? user.balance.toFixed(2) : '0.00'}</span>
                        <button onClick={()=>setShowCashier(true)} className="bg-green-600 hover:bg-green-500 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold transition">+</button>
                    </div>
                    <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-full shadow-lg border border-white/10 flex items-center justify-center text-white font-bold">
                        {user.username.substring(0, 2).toUpperCase()}
                    </div>
                </div>
            </header>
        )}

        <div className="flex-1 overflow-hidden">
            {view === 'lobby' 
                ? <Lobby onJoinTable={(t) => { setActiveTable(t); setView('table'); }} />
                : <PokerTable tableConfig={activeTable} user={user} onLeave={() => setView('lobby')} onUpdateBalance={(newBal)=>setUser(u=>({...u, balance: newBal}))} />
            }
        </div>
    </div>
  );
};

export default App;