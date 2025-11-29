import React, { useState, useEffect } from 'react';
import { Settings, Volume2, VolumeX, Trophy, Menu, DollarSign, LogOut } from 'lucide-react';
import io from 'socket.io-client';

// URL dinámica para producción/local
const BACKEND_URL = window.location.hostname.includes('localhost') 
  ? 'http://localhost:4000' 
  : '[https://mi-backend-poker.onrender.com](https://mi-backend-poker.onrender.com)'; // CAMBIA ESTO CUANDO TENGAS LA URL DE RENDER

const socket = io(BACKEND_URL);

// --- COMPONENTES VISUALES (Card, ChipStack, etc.) ---
// (He simplificado esta parte para no repetir código, usa los mismos componentes visuales que ya tenías)

const Card = ({ rank, suit, isFaceDown = false, size = 'normal' }) => {
  const isRed = suit === '♥️' || suit === '♦️';
  const sizeClasses = { normal: 'w-10 h-14 md:w-14 md:h-20', small: 'w-8 h-12 md:w-10 md:h-14 text-xs' };
  if (isFaceDown) return <div className={`bg-red-900 rounded border border-white/20 ${sizeClasses[size] || sizeClasses.normal}`}></div>;
  return (
    <div className={`bg-white rounded text-center border border-gray-300 flex flex-col justify-center ${sizeClasses[size] || sizeClasses.normal}`}>
      <div className={`font-bold ${isRed ? 'text-red-600' : 'text-black'}`}>{rank}</div>
      <div className={`text-lg ${isRed ? 'text-red-600' : 'text-black'}`}>{suit}</div>
    </div>
  );
};

const ChipStack = ({ amount }) => (
    <div className="bg-black/80 text-white text-xs px-2 py-1 rounded-full border border-yellow-500 font-bold shadow-lg">
        ${amount}
    </div>
);

const PlayerSeat = ({ player, isActive }) => {
    if (!player) return null;
    return (
        <div className={`absolute flex flex-col items-center transition-all duration-300 ${player.hasFolded ? 'opacity-50' : 'opacity-100'} ${isActive ? 'scale-110 z-20' : 'z-10'}`}
             style={{ top: player.position.top, left: player.position.left, transform: 'translate(-50%, -50%)' }}>
            
            {/* Cartas */}
            <div className="flex -space-x-2 mb-1">
                {player.hand && player.hand.map((c, i) => (
                    <Card key={i} rank={c?.rank} suit={c?.suit} isFaceDown={!c} size="small" />
                ))}
            </div>
            
            {/* Avatar */}
            <div className={`w-14 h-14 rounded-full border-2 overflow-hidden bg-gray-800 ${isActive ? 'border-yellow-400 shadow-[0_0_15px_gold]' : 'border-gray-500'}`}>
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} alt="av" />
            </div>
            
            {/* Info */}
            <div className="bg-gray-900/90 px-2 py-0.5 rounded border border-gray-600 text-center min-w-[80px] -mt-2 z-30">
                <div className="text-[10px] text-gray-300 truncate">{player.name}</div>
                <div className="text-xs text-green-400 font-bold">${player.chips}</div>
            </div>

            {/* Apuesta */}
            {player.currentBet > 0 && <div className="mt-1"><ChipStack amount={player.currentBet} /></div>}
        </div>
    );
};

// --- APP PRINCIPAL ---

const App = () => {
  const [gameState, setGameState] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Posiciones visuales fijas para 6 jugadores
  const POSITIONS = [
      { top: '85%', left: '50%' }, // Hero
      { top: '60%', left: '10%' },
      { top: '25%', left: '20%' },
      { top: '15%', left: '50%' },
      { top: '25%', left: '80%' },
      { top: '60%', left: '90%' },
  ];

  useEffect(() => {
    socket.on('connect', () => {
        setIsConnected(true);
        socket.emit('join_game', 'Jugador Pro');
    });
    
    socket.on('game_update', (data) => {
        setGameState(data);
    });

    return () => socket.disconnect();
  }, []);

  if (!isConnected || !gameState) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Conectando al servidor...</div>;

  // Mapear jugadores del servidor a posiciones visuales
  // El usuario siempre debe estar en la posición 0 (abajo)
  const myIndex = gameState.players.findIndex(p => p.isHuman);
  const visualPlayers = gameState.players.map((p, i) => {
      // Calcular índice relativo para que "Yo" siempre esté abajo
      const relativeIndex = (i - myIndex + 6) % 6; 
      return { ...p, position: POSITIONS[relativeIndex] };
  });

  const myPlayer = gameState.players[myIndex];
  const isMyTurn = gameState.activePlayerIndex === myIndex;

  const handleAction = (type, amount = 0) => {
      socket.emit('action', { type, amount });
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white font-sans overflow-hidden">
      {/* Header Simple */}
      <header className="h-12 bg-[#0f0f0f] border-b border-gray-800 flex justify-between items-center px-4 z-50 relative">
          <div className="font-bold text-yellow-500">CASHPOKER</div>
          <div className="text-xs text-gray-400">{gameState.message}</div>
          <div className="text-green-400 text-sm font-mono">${myPlayer?.chips}</div>
      </header>

      {/* Mesa */}
      <main className="relative h-[calc(100vh-96px)] flex items-center justify-center bg-[radial-gradient(circle_at_center,#1a472a_0%,#000000_100%)]">
          <div className="relative w-[95%] max-w-6xl aspect-[2/1] rounded-[200px] shadow-2xl border-[12px] border-[#111] bg-[#0a5c2b]">
              
              {/* Cartas Comunitarias */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
                  <div className="flex gap-2 h-16">
                      {gameState.communityCards.map((c, i) => <Card key={i} rank={c.rank} suit={c.suit} />)}
                  </div>
                  <div className="bg-black/40 px-4 py-1 rounded-full text-yellow-400 font-bold border border-yellow-500/30">
                      Pot: ${gameState.pot}
                  </div>
              </div>

              {/* Jugadores */}
              {visualPlayers.map(p => (
                  <PlayerSeat key={p.id} player={p} isActive={gameState.activePlayerIndex === p.id} />
              ))}
          </div>
      </main>

      {/* Barra de Control */}
      <footer className="h-24 bg-[#121212] border-t border-gray-800 flex items-center justify-center gap-4 z-50 relative">
          {gameState.phase === 'showdown' ? (
              <button onClick={() => socket.emit('restart')} className="bg-blue-600 px-8 py-3 rounded-full font-bold hover:bg-blue-500">
                  SIGUIENTE MANO
              </button>
          ) : (
              isMyTurn ? (
                  <>
                    <button onClick={() => handleAction('fold')} className="bg-red-900 border border-red-600 px-6 py-3 rounded font-bold hover:bg-red-800">FOLD</button>
                    <button onClick={() => handleAction('check')} className="bg-gray-700 px-6 py-3 rounded font-bold hover:bg-gray-600">CHECK / CALL</button>
                    <button onClick={() => handleAction('raise', gameState.currentBet + 20)} className="bg-green-700 border border-green-500 px-6 py-3 rounded font-bold hover:bg-green-600">RAISE</button>
                  </>
              ) : (
                  <div className="text-gray-500 italic animate-pulse">Esperando a los rivales...</div>
              )
          )}
      </footer>
    </div>
  );
};

export default App;