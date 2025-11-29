const getBackendUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return 'http://localhost:4000';
  }
  return 'https://mi-poker-app.onrender.com'; 
};

const socket = io(getBackendUrl());

// Generador de Sonidos Sintéticos
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
    osc.start();
    osc.stop(now + 0.1);
  } else if (type === 'check') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    gainNode.gain.setValueAtTime(0.05, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc.start();
    osc.stop(now + 0.05);
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(300, now + 0.1);
    gain2.gain.setValueAtTime(0.05, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.15);
  } else if (type === 'bet') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);
    gainNode.gain.setValueAtTime(0.05, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc.start();
    osc.stop(now + 0.05);
  } else if (type === 'deal') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(300, now + 0.1);
    gainNode.gain.setValueAtTime(0.05, now);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
    osc.start();
    osc.stop(now + 0.1);
  } else if (type === 'message') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    gainNode.gain.setValueAtTime(0.02, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.start();
    osc.stop(now + 0.1);
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

// --- COMPONENTES VISUALES ---

const Card = ({ rank, suit, isFaceDown = false, size = 'normal', className = "" }) => {
  const isRed = suit === '♥️' || suit === '♦️';
  const cardBackUrl = "https://placehold.co/64x96/4A0000/FFFFFF?text=BACK";
  
  const sizeClasses = {
    normal: 'w-10 h-14 md:w-14 md:h-20',
    small: 'w-8 h-12 md:w-10 md:h-14 text-xs',
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.normal;

  if (isFaceDown) {
    return (
      <div 
        className={`${currentSizeClass} rounded-md border border-gray-900 shadow-xl relative overflow-hidden transform transition-all duration-500 hover:-translate-y-2 ${className}`}
        style={{
            backgroundColor: '#6b0f0f',
            backgroundImage: `repeating-linear-gradient(45deg, #500b0b 25%, transparent 25%, transparent 75%, #500b0b 75%, #500b0b), repeating-linear-gradient(45deg, #500b0b 25%, #6b0f0f 25%, #6b0f0f 75%, #500b0b 75%, #500b0b)`,
            backgroundPosition: '0 0, 10px 10px',
            backgroundSize: '20px 20px'
        }}
      >
        <div className="absolute inset-1 border border-white/20 rounded-sm"></div>
      </div>
    );
  }

  return (
    <div className={`${currentSizeClass} bg-white rounded-md shadow-xl border border-gray-300 flex flex-col items-center justify-between p-1 select-none transition-transform duration-300 hover:-translate-y-2 ${className}`}>
      <div className={`text-xs md:text-sm font-bold self-start ${isRed ? 'text-red-600' : 'text-black'}`}>{rank}</div>
      <div className={`text-lg md:text-2xl ${isRed ? 'text-red-600' : 'text-black'}`}>{suit}</div>
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
  <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center text-black font-bold text-[10px] shadow-md border-2 border-gray-300 z-30">
    D
  </div>
);

const PlayerSeat = ({ player, position, isMe, isActive }) => {
  const { isWinner, hasFolded, isAllIn, showCards } = player;
  return (
    <div 
      className={`absolute flex flex-col items-center justify-center transition-all duration-500`}
      style={{ 
        top: position.top, 
        left: position.left, 
        transform: 'translate(-50%, -50%)',
        opacity: hasFolded ? 0.6 : 1 
      }}
    >
      <div className={`absolute z-20 flex -space-x-2 transition-all duration-500
        ${position.align === 'bottom' ? '-top-12' : ''}
        ${position.align === 'top' ? '-bottom-10' : ''}
        ${position.align === 'left' ? '-right-12 top-0' : ''}
        ${position.align === 'right' ? '-left-12 top-0' : ''}
        ${hasFolded ? 'opacity-0 scale-75' : 'opacity-100'}
      `}>
        {player.hand && player.hand.map((card, i) => (
          <div key={i} className={`transform ${i===0?'-rotate-6':'rotate-6'} ${isWinner ? 'animate-bounce' : ''} transition-all duration-500 origin-bottom-left`}>
             <Card rank={card.rank} suit={card.suit} isFaceDown={!isMe && !player.showCards && !isWinner} size="small" />
          </div>
        ))}
      </div>

      <div className={`relative w-14 h-14 md:w-16 md:h-16 rounded-full transition-all duration-300 z-10
        ${isActive ? 'ring-4 ring-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.6)] scale-105' : 'ring-2 ring-black/40 shadow-lg'}
        bg-gray-800
      `}>
        <img 
          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} 
          alt={player.name}
          className={`w-full h-full rounded-full p-0.5 ${hasFolded ? 'grayscale' : ''}`}
        />
        {player.isAllIn && !hasFolded && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase shadow-md border border-white/20">All-in</div>}
        {player.isDealer && <DealerButton />}
      </div>

      <div className={`mt-[-12px] z-30 bg-gray-900/90 backdrop-blur border border-gray-600 rounded-lg px-2 py-0.5 text-center shadow-xl min-w-[80px] transition-colors ${isActive ? 'border-yellow-500/50 bg-gray-800' : ''}`}>
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

// --- COMPONENTE DE CHAT Y LOG ---
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
                    )) : <div className="text-gray-600 text-center mt-4">¡Saluda a la mesa!</div>
                ) : (
                    gameLogs.map((log, i) => (
                        <div key={i} className="text-gray-400 border-b border-gray-800/50 pb-1 mb-1 last:border-0">
                            {log}
                        </div>
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

// --- COMPONENTE DE JUEGO (POKER TABLE) ---

const PokerTable = ({ tableConfig, userBalance, onLeave, onUpdateBalance }) => {
  const [gameState, setGameState] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userBetAmount, setUserBetAmount] = useState(20);
  const [chatMessages, setChatMessages] = useState([]);
  const [showChat, setShowChat] = useState(false);

  // Constantes de la mesa
  const SMALL_BLIND = tableConfig.smallBlind || 10;
  const BIG_BLIND = tableConfig.bigBlind || 20;

  const SEAT_POSITIONS = [
    { id: 0, top: '85%', left: '50%', align: 'bottom' },
    { id: 1, top: '60%', left: '10%', align: 'left' },
    { id: 2, top: '25%', left: '20%', align: 'left' },
    { id: 3, top: '15%', left: '50%', align: 'top' },
    { id: 4, top: '25%', left: '80%', align: 'right' },
    { id: 5, top: '60%', left: '90%', align: 'right' },
  ];

  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      socket.emit('join_game', { playerName: 'Jugador Pro', tableId: tableConfig.id });
    };

    const onGameUpdate = (data) => setGameState(data);
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
  }, [tableConfig.id]);

  const handleSendMessage = (text) => {
      socket.emit('chat_message', { player: 'Tú', text });
  };

  const handleAction = (action, amount = 0) => {
      socket.emit('action', { action, amount });
  };

  if (!isConnected || !gameState) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Conectando...</div>;

  const myIndex = gameState.players.findIndex(p => p.isHuman);
  const visualPlayers = gameState.players.map((p, i) => {
      const relativeIndex = (i - myIndex + 6) % 6; 
      return { ...p, position: SEAT_POSITIONS[relativeIndex] };
  });
  const myPlayer = gameState.players[myIndex];
  const isMyTurn = gameState.activePlayerIndex === myIndex;

  return (
    <div className="fixed inset-0 bg-[#1a1a1a] text-white font-sans select-none flex flex-col">
      <header className="h-12 bg-[#0f0f0f] border-b border-[#333] flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-4">
          <button onClick={onLeave} className="text-gray-400 hover:text-white flex items-center gap-1 text-sm font-bold uppercase">
            <LogOut className="w-4 h-4" /> Salir
          </button>
          <span className="text-xs text-gray-400 hidden md:inline">Mesa: {tableConfig?.name} | {tableConfig.blinds}</span>
        </div>
        <div className="flex items-center gap-4">
           <span className="text-green-400 font-mono text-sm">${myPlayer?.chips}</span>
           <button onClick={()=>setShowChat(!showChat)} className="md:hidden text-gray-400"><MessageSquare size={20}/></button>
        </div>
      </header>
      
      <div className="flex-1 flex relative overflow-hidden">
        {/* ÁREA DE JUEGO */}
        <main className="flex-1 relative flex items-center justify-center bg-[radial-gradient(circle_at_center,#1a472a_0%,#000000_100%)]">
            <div className="relative w-[95%] max-w-6xl aspect-[2/1] rounded-[200px] shadow-[0_0_100px_rgba(0,0,0,0.8)] border-[12px] border-[#111]">
                <div className="absolute inset-0 rounded-[180px] border border-[#ffffff10] shadow-inner bg-[url('https://www.transparenttextures.com/patterns/felt.png')] bg-repeat opacity-80"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4 z-10">
                    <div className="flex gap-2 h-16 md:h-20">
                        {gameState.communityCards.map((c,i) => <Card key={i} rank={c.rank} suit={c.suit}/>)}
                        {[...Array(5-gameState.communityCards.length)].map((_,i)=><div key={i} className="w-10 h-14 md:w-14 md:h-20 rounded border-2 border-white/10 bg-white/5"></div>)}
                    </div>
                    {/* Bote Principal */}
                    <div className="bg-black/50 text-white px-6 py-1 rounded-full border border-yellow-500/30 shadow-lg backdrop-blur-sm flex flex-col items-center">
                       <span className="text-[10px] text-gray-400 uppercase">Total Pot</span>
                       <span className="text-yellow-400 font-bold text-lg">${gameState.pot}</span>
                    </div>
                    <div className="text-green-300 font-bold text-sm drop-shadow-md">{gameState.message}</div>
                </div>
                {visualPlayers.map((p, i) => (
                    <PlayerSeat key={i} player={p} position={p.position} isMe={p.isHuman} isActive={gameState.activePlayerIndex === p.id} />
                ))}
            </div>
        </main>

        {/* CHAT / LOG */}
        <aside className={`
            w-80 bg-[#111] border-l border-[#333] flex flex-col absolute right-0 top-0 bottom-0 z-40 transform transition-transform duration-300
            ${showChat ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0 md:relative
        `}>
            <GameChat chatMessages={chatMessages} onSendMessage={handleSendMessage} gameLogs={gameState.logs || []} />
        </aside>
      </div>

      <footer className="h-20 bg-[#121212] border-t border-[#333] flex items-center justify-center gap-4 px-4 z-50">
        {gameState.phase === 'showdown' || gameState.phase === 'lobby' ? (
           <button onClick={() => socket.emit('restart')} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-10 rounded-full shadow-lg active:scale-95 transition-all text-lg">
             SIGUIENTE MANO
           </button>
        ) : (
            isMyTurn ? (
                <>
                    <button onClick={() => handleAction('fold')} className="bg-red-900/80 hover:bg-red-700 border border-red-600 text-white font-bold py-3 px-6 rounded-lg active:scale-95 transition">FOLD</button>
                    <button onClick={() => handleAction(gameState.currentBet > myPlayer.currentBet ? 'call' : 'check')} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg active:scale-95 transition">
                        {gameState.currentBet > myPlayer.currentBet ? `CALL` : 'CHECK'}
                    </button>
                    <div className="flex bg-black/40 rounded-lg p-1 border border-gray-700">
                        <input type="number" value={userBetAmount} onChange={(e)=>setUserBetAmount(Number(e.target.value))} className="w-20 bg-transparent text-white text-center font-bold outline-none"/>
                        <button onClick={() => handleAction('raise', gameState.currentBet + userBetAmount)} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded active:scale-95 transition">RAISE</button>
                    </div>
                </>
            ) : <div className="text-gray-500 italic">Esperando turno...</div>
        )}
      </footer>
    </div>
  );
};

// --- MODAL PARA CREAR MESA ---
const CreateTableModal = ({ onClose, onCreate }) => {
    const [name, setName] = useState('');
    const [blinds, setBlinds] = useState('0.50/1.00');
    const [buyIn, setBuyIn] = useState(50);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-gray-900 rounded-xl w-full max-w-md border border-gray-700 shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-white font-bold">Crear Nueva Mesa</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">Nombre de la Mesa</label>
                        <input type="text" value={name} onChange={(e)=>setName(e.target.value)} className="w-full bg-black border border-gray-700 rounded p-2 text-white focus:border-green-500 outline-none" placeholder="Ej: La Cueva de los Pros"/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">Ciegas</label>
                            <select value={blinds} onChange={(e)=>setBlinds(e.target.value)} className="w-full bg-black border border-gray-700 rounded p-2 text-white outline-none">
                                <option value="0.10/0.25">$0.10 / $0.25</option>
                                <option value="0.50/1.00">$0.50 / $1.00</option>
                                <option value="1/2">$1 / $2</option>
                                <option value="5/10">$5 / $10</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">Buy-in Mínimo</label>
                            <input type="number" value={buyIn} onChange={(e)=>setBuyIn(e.target.value)} className="w-full bg-black border border-gray-700 rounded p-2 text-white focus:border-green-500 outline-none"/>
                        </div>
                    </div>
                    <button onClick={() => onCreate({ name, blinds, minBuyIn: buyIn })} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded shadow-lg mt-2">
                        CREAR MESA
                    </button>
                </div>
            </div>
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
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2"><DollarSign className="text-green-500"/> Cajero</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><X /></button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-3 gap-3">
                        {['card', 'bitcoin', 'bank'].map(m => (
                            <button key={m} onClick={() => setMethod(m)} 
                                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition ${method===m ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750'}`}>
                                {m==='card' ? <CreditCard/> : m==='bitcoin' ? <DollarSign/> : <RefreshCw/>}
                                <span className="text-xs font-bold capitalize">{m}</span>
                            </button>
                        ))}
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Monto a depositar</label>
                        <div className="relative">
                            <span className="absolute left-4 top-3.5 text-gray-400">$</span>
                            <input type="number" value={amount} onChange={(e)=>setAmount(e.target.value)} 
                                className="w-full bg-black border border-gray-700 rounded-xl p-3 pl-8 text-white font-mono text-lg focus:border-green-500 focus:outline-none" placeholder="100.00"/>
                        </div>
                    </div>
                    <button onClick={() => { onDeposit(amount); onClose(); }} 
                        className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-900/20 transition transform active:scale-95">
                        CONFIRMAR DEPÓSITO
                    </button>
                    <p className="text-center text-xs text-gray-500 flex items-center justify-center gap-1"><ShieldCheck className="w-3 h-3"/> Pagos encriptados y seguros</p>
                </div>
            </div>
        </div>
    );
};

// --- LOBBY PRINCIPAL ---
const Lobby = ({ onJoinTable, balance, onOpenCashier }) => {
    const [tab, setTab] = useState('cash');
    const [showCreate, setShowCreate] = useState(false);
    // Lista inicial de mesas (ahora es estado para poder añadir más)
    const [tables, setTables] = useState([
        { id: 101, name: "La Cueva", blinds: "0.50/1.00", type: "NL Hold'em", players: 5, max: 6, minBuyIn: 50, smallBlind: 0.5, bigBlind: 1 },
        { id: 102, name: "High Rollers", blinds: "5/10", type: "NL Hold'em", players: 3, max: 6, minBuyIn: 500, smallBlind: 5, bigBlind: 10 },
        { id: 103, name: "Principiantes", blinds: "0.10/0.25", type: "NL Hold'em", players: 6, max: 9, minBuyIn: 10, smallBlind: 0.1, bigBlind: 0.25 },
    ]);
    
    const TOURNEYS = [
        { id: 201, name: "Sunday Million", buyIn: 109, prize: "1M Gtd", status: "Reg Tardío", enrolled: 4500 },
        { id: 202, name: "Freeroll Diario", buyIn: 0, prize: "100", status: "En curso", enrolled: 120 },
    ];

    const handleCreateTable = (newTableData) => {
        // Parsear las ciegas del string "SB/BB"
        const [sb, bb] = newTableData.blinds.split('/').map(parseFloat);
        const newTable = {
            id: Date.now(),
            name: newTableData.name || "Mesa Privada",
            blinds: newTableData.blinds,
            type: "NL Hold'em",
            players: 1,
            max: 6,
            minBuyIn: Number(newTableData.minBuyIn),
            smallBlind: sb,
            bigBlind: bb
        };
        setTables([...tables, newTable]);
        setShowCreate(false);
        onJoinTable(newTable); // Unirse automáticamente
    };

    return (
        <div className="flex h-[calc(100vh-64px)]">
            {showCreate && <CreateTableModal onClose={()=>setShowCreate(false)} onCreate={handleCreateTable} />}

            {/* Sidebar */}
            <aside className="w-20 md:w-64 bg-[#0f0f0f] border-r border-[#333] flex flex-col py-6">
                <nav className="space-y-2 px-2">
                    <button onClick={() => setTab('cash')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition ${tab==='cash' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}>
                        <DollarSign className="w-6 h-6"/> <span className="hidden md:inline font-bold">Cash Games</span>
                    </button>
                    <button onClick={() => setTab('tourney')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition ${tab==='tourney' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}>
                        <Trophy className="w-6 h-6"/> <span className="hidden md:inline font-bold">Torneos</span>
                    </button>
                </nav>
                <div className="mt-auto px-4">
                    <button className="flex items-center gap-3 text-gray-500 hover:text-white transition text-sm font-bold">
                        <LogOut className="w-5 h-5"/> <span className="hidden md:inline">Salir</span>
                    </button>
                </div>
            </aside>

            {/* Content */}
            <main className="flex-1 bg-[#1a1a1a] p-6 overflow-y-auto">
                <header className="flex justify-between items-end mb-8">
                    <div>
                        <h2 className="text-3xl font-black text-white mb-1">{tab === 'cash' ? 'Mesas de Cash' : 'Torneos'}</h2>
                        <p className="text-gray-500 text-sm">Selecciona una mesa para empezar a jugar</p>
                    </div>
                    <div className="flex gap-3">
                        {tab === 'cash' && (
                            <button onClick={()=>setShowCreate(true)} className="bg-green-600 hover:bg-green-500 text-white flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg font-bold transition">
                                <Plus className="w-5 h-5"/> Crear Mesa
                            </button>
                        )}
                        <button className="bg-[#333] hover:bg-[#444] text-white p-2 rounded-lg border border-gray-600"><Filter className="w-5 h-5"/></button>
                        <button className="bg-[#333] hover:bg-[#444] text-white p-2 rounded-lg border border-gray-600"><RefreshCw className="w-5 h-5"/></button>
                    </div>
                </header>

                <div className="bg-[#222] rounded-xl border border-[#333] overflow-hidden shadow-2xl">
                    <table className="w-full text-left">
                        <thead className="bg-[#111] text-gray-500 text-xs uppercase font-bold">
                            <tr>
                                <th className="p-4 pl-6">Nombre</th>
                                <th className="p-4">{tab==='cash'?'Ciegas':'Buy-in'}</th>
                                <th className="p-4 hidden md:table-cell">Tipo</th>
                                <th className="p-4">Jugadores</th>
                                <th className="p-4 text-right pr-6"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#333]">
                            {(tab === 'cash' ? tables : TOURNEYS).map((item) => (
                                <tr key={item.id} className="hover:bg-white/5 transition group cursor-pointer">
                                    <td className="p-4 pl-6 font-bold text-white flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${item.minBuyIn < 100 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                        {item.name}
                                    </td>
                                    <td className="p-4 text-green-400 font-mono font-bold">{tab==='cash' ? `$${item.blinds}` : `$${item.buyIn}`}</td>
                                    <td className="p-4 text-gray-400 text-sm hidden md:table-cell">{tab==='cash' ? item.type : item.prize}</td>
                                    <td className="p-4 text-gray-300 text-sm"><Users className="w-3 h-3 inline mr-1"/> {tab==='cash' ? `${item.players}/${item.max}` : item.enrolled}</td>
                                    <td className="p-4 text-right pr-6">
                                        <button onClick={() => onJoinTable(item)} className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-6 py-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                            {tab==='cash' ? 'JUGAR' : 'REGISTRAR'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
};

// --- APP CONTAINER ---
const App = () => {
  const [view, setView] = useState('lobby');
  const [activeTable, setActiveTable] = useState(null);
  const [balance, setBalance] = useState(1250.00);
  const [showCashier, setShowCashier] = useState(false);

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-gray-200 font-sans">
        {showCashier && <Cashier onClose={()=>setShowCashier(false)} onDeposit={(amt)=>setBalance(b=>b+parseFloat(amt))} />}
        
        {/* Top Bar Global */}
        {view === 'lobby' && (
            <header className="h-16 bg-[#0f0f0f] border-b border-[#333] flex items-center justify-between px-6 z-50 relative">
                <div className="flex items-center gap-2 select-none">
                    <span className="text-2xl">♠️</span>
                    <span className="text-2xl font-black text-white tracking-tighter">CASH<span className="text-red-600">POKER</span></span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-[#222] rounded-full pl-4 pr-1 py-1 border border-[#444] flex items-center gap-3">
                        <span className="text-green-400 font-mono font-bold tracking-wide">${balance.toFixed(2)}</span>
                        <button onClick={()=>setShowCashier(true)} className="bg-green-600 hover:bg-green-500 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold transition">+</button>
                    </div>
                    <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-full shadow-lg border border-white/10"></div>
                </div>
            </header>
        )}

        {view === 'lobby' 
            ? <Lobby onJoinTable={(t) => { setActiveTable(t); setView('table'); }} />
            : <PokerTable tableConfig={activeTable} userBalance={balance} onLeave={() => setView('lobby')} onUpdateBalance={(newBal)=>setBalance(newBal)} />
        }
    </div>
  );
};

export default App;