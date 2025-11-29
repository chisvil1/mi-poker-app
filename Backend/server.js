const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();


const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Permite conexiones desde cualquier frontend (local o nube)
    methods: ["GET", "POST"]
  }
});

// Servir archivos estáticos de React
app.use(express.static(path.join(__dirname, '../Frontend/dist')));

const PORT = process.env.PORT || 4000;

// --- ESTADO DEL JUEGO ---
let gameState = {
  phase: 'lobby', // lobby, preflop, flop, turn, river, showdown
  pot: 0,
  communityCards: [],
  deck: [],
  players: [], 
  activePlayerIndex: -1,
  dealerIndex: 0,
  currentBet: 0,
  minRaise: 20,
  message: "Esperando jugadores..."
};

const SMALL_BLIND = 10;
const BIG_BLIND = 20;

// --- UTILIDADES DE PÓKER ---
const createDeck = () => {
  const suits = ['S', 'H', 'C', 'D'];
  const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  let d = [];
  for(let s of suits) for(let r of ranks) d.push({suit: s, rank: r});
  return d.sort(() => Math.random() - 0.5);
};

// Evaluación de manos simplificada para la demo (Gana carta alta aleatoria si no hay pares)
const determineWinners = () => {
    // En una app real, aquí usarías una librería como 'pokersolver'
    const activePlayers = gameState.players.filter(p => !p.hasFolded);
    if (activePlayers.length === 0) return [];
    
    // Simulamos un ganador aleatorio entre los activos para esta demo
    const winnerIndex = Math.floor(Math.random() * activePlayers.length);
    return [activePlayers[winnerIndex]];
};

// --- MOTOR DEL JUEGO ---

const broadcastState = () => {
  // Sanitización: Ocultar cartas de rivales a menos que sea Showdown
  const publicPlayers = gameState.players.map(p => {
    if (gameState.phase === 'showdown') return p;
    return {
        ...p,
        hand: p.isHuman ? p.hand : p.hand.map(() => null) // Null oculta la carta
    };
  });

  io.emit('game_update', { ...gameState, players: publicPlayers });
};

const startNewHand = () => {
    gameState.deck = createDeck();
    gameState.pot = SMALL_BLIND + BIG_BLIND;
    gameState.communityCards = [];
    gameState.phase = 'preflop';
    gameState.currentBet = BIG_BLIND;
    gameState.message = "Nueva mano: Pre-flop";

    // Reiniciar estado de jugadores
    gameState.players.forEach(p => {
        p.hand = [gameState.deck.pop(), gameState.deck.pop()];
        p.currentBet = 0;
        p.hasFolded = false;
        p.isAllIn = false;
        p.isWinner = false;
    });

    // Mover Dealer
    gameState.dealerIndex = (gameState.dealerIndex + 1) % gameState.players.length;
    
    // Poner Ciegas
    const sbIndex = (gameState.dealerIndex + 1) % gameState.players.length;
    const bbIndex = (gameState.dealerIndex + 2) % gameState.players.length;
    
    gameState.players[sbIndex].chips -= SMALL_BLIND;
    gameState.players[sbIndex].currentBet = SMALL_BLIND;
    
    gameState.players[bbIndex].chips -= BIG_BLIND;
    gameState.players[bbIndex].currentBet = BIG_BLIND;

    // Turno inicial (UTG)
    gameState.activePlayerIndex = (bbIndex + 1) % gameState.players.length;
    
    broadcastState();

    // Si el primer jugador en actuar es un bot, inicia su turno.
    if (gameState.activePlayerIndex !== -1 && !gameState.players[gameState.activePlayerIndex].isHuman) {
      setTimeout(() => botPlay(gameState.activePlayerIndex), 1000);
    }
};

const nextPhase = () => {
    const { phase, deck } = gameState;
    
    // Recoger apuestas al centro
    gameState.players.forEach(p => p.currentBet = 0);
    gameState.currentBet = 0;

    if (phase === 'preflop') {
        gameState.phase = 'flop';
        gameState.communityCards = [deck.pop(), deck.pop(), deck.pop()];
    } else if (phase === 'flop') {
        gameState.phase = 'turn';
        gameState.communityCards.push(deck.pop());
    } else if (phase === 'turn') {
        gameState.phase = 'river';
        gameState.communityCards.push(deck.pop());
    } else if (phase === 'river') {
        gameState.phase = 'showdown';
        const winners = determineWinners();
        const winAmount = Math.floor(gameState.pot / winners.length);
        
        winners.forEach(w => {
            const p = gameState.players.find(pl => pl.id === w.id);
            p.chips += winAmount;
            p.isWinner = true;
        });
        gameState.message = `Ganador: ${winners[0].name}`;
        gameState.pot = 0;
        broadcastState();
        setTimeout(() => startNewHand(), 5000); // Inicia la siguiente mano después de 5 segundos
        return;
    }
    
    // Iniciar ronda de apuestas de la nueva fase
    gameState.activePlayerIndex = (gameState.dealerIndex + 1) % gameState.players.length;
    while(gameState.players[gameState.activePlayerIndex].hasFolded) {
        gameState.activePlayerIndex = (gameState.activePlayerIndex + 1) % gameState.players.length;
    }
    broadcastState();
};

const handlePlayerAction = (socketId, action, amount) => {
    const playerIndex = gameState.players.findIndex(p => p.socketId === socketId);
    if (playerIndex !== gameState.activePlayerIndex) return; // No es su turno

    const player = gameState.players[playerIndex];

    // 1. Ejecutar la acción del jugador
    if (action === 'fold') {
        player.hasFolded = true;
    } else if (action === 'call') {
        const toCall = gameState.currentBet - player.currentBet;
        const actualBet = Math.min(toCall, player.chips);
        player.chips -= actualBet;
        player.currentBet += actualBet;
        gameState.pot += actualBet;
    } else if (action === 'raise') {
        const totalBet = amount; // Total a poner en la mesa
        const added = totalBet - player.currentBet;
        if (player.chips >= added) {
            player.chips -= added;
            player.currentBet = totalBet;
            gameState.pot += added;
            gameState.currentBet = totalBet;
        }
    } else if (action === 'check') {
        // No se hace nada con el dinero, solo se pasa el turno.
    }

    // 2. Lógica de fin de mano (victoria inmediata)
    const remainingPlayers = gameState.players.filter(p => !p.hasFolded);
    if (remainingPlayers.length === 1) {
        const winner = remainingPlayers[0];
        winner.chips += gameState.pot;
        gameState.pot = 0;
        gameState.phase = 'showdown';
        gameState.message = `Ganador: ${winner.name}`;
        broadcastState();
        setTimeout(() => startNewHand(), 5000);
        return;
    }

    // 3. Lógica de fin de ronda de apuestas
    const playersInHand = gameState.players.filter(p => !p.hasFolded);
    const allMatched = playersInHand.every(p => p.currentBet === gameState.currentBet || p.isAllIn);
    
    const isPreflop = gameState.phase === 'preflop';
    const bbIndex = (gameState.dealerIndex + 2) % gameState.players.length;
    // La opción de la ciega grande ocurre si la acción le llega y nadie ha subido aún.
    const isBBOnOption = isPreflop && playerIndex === bbIndex && gameState.currentBet === BIG_BLIND;

    if (allMatched && !isBBOnOption) {
        // La ronda de apuestas terminó, vamos a la siguiente fase
        nextPhase();
    } else {
        // La ronda continúa, avanza al siguiente jugador.
        let nextIndex = (playerIndex + 1) % gameState.players.length;
        let loopSafety = 0;
        while ((gameState.players[nextIndex].hasFolded || gameState.players[nextIndex].isAllIn) && loopSafety < 10) {
            nextIndex = (nextIndex + 1) % gameState.players.length;
            loopSafety++;
        }
        gameState.activePlayerIndex = nextIndex;
        
        if (!gameState.players[nextIndex].isHuman) {
            setTimeout(() => botPlay(nextIndex), 1000);
        }
        broadcastState();
    }
};

const botPlay = (index) => {
    const bot = gameState.players[index];
    // IA muy simple: 80% Call/Check, 20% Fold si hay apuesta
    const toCall = gameState.currentBet - bot.currentBet;
    
    if (toCall > 0) {
        if (Math.random() > 0.2) handlePlayerAction(bot.socketId, 'call');
        else handlePlayerAction(bot.socketId, 'fold');
    } else {
        handlePlayerAction(bot.socketId, 'check');
    }
};

// --- SOCKET CONNECTION ---

io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);

  socket.on('join_game', (joinData) => {
      // Reiniciar juego si está vacío o unir
      if (gameState.players.length === 0) {
          const playerName = (joinData && joinData.playerName) ? joinData.playerName : 'Hero';
          // Crear jugador humano + 5 bots
          gameState.players = [
              { id: 0, socketId: socket.id, name: playerName, chips: 1000, hand: [], isHuman: true, currentBet: 0 },
              ...Array.from({length: 5}, (_, i) => ({
                  id: i+1, socketId: `bot_${i}`, name: `Bot ${i+1}`, chips: 1000, hand: [], isHuman: false, currentBet: 0
              }))
          ];
          startNewHand();
      } else {
          // Reconexión simple (en app real buscaría hueco)
          socket.emit('game_update', gameState);
      }
  });

  socket.on('action', ({ action, amount }) => {
      handlePlayerAction(socket.id, action, amount);
  });
  
  socket.on('chat_message', (msg) => {
    io.emit('chat_message', msg);
  });

  socket.on('restart', () => {
      startNewHand();
  });
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../Frontend/dist/index.html'));
});

server.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));