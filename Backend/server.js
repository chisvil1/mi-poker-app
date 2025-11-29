const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto'); 
// Recuerda instalar: npm install pokersolver
const Hand = require('pokersolver').Hand; 

const app = express();
app.use(cors());
app.use(express.json()); 

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Permite conexiones desde cualquier lugar
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 4000;

// --- ESTADO GLOBAL ---
const tables = new Map();
const users = new Map();
const socketIdToUserId = new Map();
const pendingPayments = new Map(); 

// --- UTILIDADES DE PÓKER ---
const createDeck = () => {
  const suits = ['s', 'h', 'c', 'd']; 
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  let d = [];
  for (let s of suits) for (let r of ranks) d.push(r + s);
  return d.sort(() => Math.random() - 0.5);
};

const determineWinners = (table) => {
    const activePlayers = table.players.filter(p => p && !p.hasFolded);
    if (activePlayers.length === 0) return [];

    try {
        const hands = activePlayers.map(player => {
            const allCards = player.hand.concat(table.communityCards);
            const hand = Hand.solve(allCards);
            hand.player = player; 
            return hand;
        });
        const winnerHands = Hand.winners(hands); 
        return winnerHands.map(wHand => wHand.player);
    } catch (e) {
        console.error("Error evaluando manos:", e);
        // Fallback: gana el primero activo (solo si falla la librería)
        return [activePlayers[0]];
    }
};

// --- GESTIÓN DE MESAS ---
const createNewTable = (tableId, options = {}) => {
  const newTable = {
    id: tableId,
    name: options.name || `Mesa ${tableId}`,
    phase: 'lobby',
    pot: 0,
    communityCards: [],
    deck: [],
    players: Array(6).fill(null),
    activePlayerIndex: -1,
    dealerIndex: 0,
    currentBet: 0,
    minRaise: options.bigBlind || 20,
    message: "Esperando jugadores...",
    logs: [],
    smallBlind: options.smallBlind || 10,
    bigBlind: options.bigBlind || 20,
    currentHandId: null,
    gameType: options.gameType || 'NLH', 
  };
  tables.set(tableId, newTable);
  return newTable;
};

// --- MOTOR DEL JUEGO ---
const broadcastState = (tableId) => {
  const table = tables.get(tableId);
  if (!table) return;

  console.log(`Broadcasting state for table ${tableId}`);

  // Enviar estado específico a cada jugador para que vean sus propias cartas
  table.players.forEach(p => {
      if (p && p.isHuman) {
          console.log(`Processing player ${p.name}`);
          const playerSpecificPlayers = table.players.map(pp => {
              if(!pp) return null;
              const showCards = table.phase === 'showdown' && !pp.hasFolded;
              
              const formatCard = (c) => c ? { 
                  rank: c.slice(0, -1).replace('T', '10'), 
                  suit: c.slice(-1).toUpperCase() 
              } : null;

              if (pp.socketId === p.socketId) {
                   console.log(`Player ${p.name} hand:`, p.hand);
                   return {
                       ...pp,
                       hand: p.hand.map(formatCard)
                   };
              }
              // Ocultar cartas de otros
              return {
                 ...pp,
                 hand: pp.hand.map(c => showCards ? formatCard(c) : null),
                 showCards
              };
          });
          
          const communityPublic = table.communityCards.map(c => ({
            rank: c.slice(0, -1).replace('T', '10'), 
            suit: c.slice(-1).toUpperCase()
          }));

          console.log(`Sending update to ${p.name}`, playerSpecificPlayers.find(pl => pl && pl.socketId === p.socketId).hand.length);
          io.to(p.socketId).emit('game_update', { 
              ...table, 
              players: playerSpecificPlayers,
              communityCards: communityPublic
          });
      }
  });
};

const startNewHand = (tableId) => {
    const table = tables.get(tableId);
    if (!table || table.players.filter(p=>p).length < 2) {
        if(table) {
            table.phase = 'lobby';
            table.message = "Esperando más jugadores...";
            // Notificar a todos
            io.to(tableId).emit('game_update', { ...table, players: table.players, communityCards: [] });
        }
        return;
    }
    
    console.log(`Starting new hand for table ${tableId}`);

    table.deck = createDeck();
    table.pot = table.smallBlind + table.bigBlind;
    table.communityCards = [];
    table.phase = 'preflop';
    table.currentBet = table.bigBlind;
    table.message = "Nueva mano";

    table.players.forEach(p => {
        if(p) {
            console.log(`Dealing cards to player ${p.name}`);
            p.hand = [table.deck.pop(), table.deck.pop()];
            console.log(`Player ${p.name} has ${p.hand.length} cards:`, p.hand);
            p.currentBet = 0;
            p.hasFolded = false;
            p.isAllIn = false;
            p.isWinner = false;
        }
    });

    // Dealer y Ciegas
    let nextDealer = (table.dealerIndex + 1) % 6;
    while(!table.players[nextDealer]) nextDealer = (nextDealer + 1) % 6;
    table.dealerIndex = nextDealer;

    let sbIndex = (table.dealerIndex + 1) % 6;
    while(!table.players[sbIndex]) sbIndex = (sbIndex + 1) % 6;

    let bbIndex = (sbIndex + 1) % 6;
    while(!table.players[bbIndex]) bbIndex = (bbIndex + 1) % 6;
    
    const sbP = table.players[sbIndex];
    sbP.chips -= table.smallBlind;
    sbP.currentBet = table.smallBlind;

    const bbP = table.players[bbIndex];
    bbP.chips -= table.bigBlind;
    bbP.currentBet = table.bigBlind;

    let utg = (bbIndex + 1) % 6;
    while(!table.players[utg]) utg = (utg + 1) % 6;
    table.activePlayerIndex = utg;
    
    broadcastState(tableId);
};

const nextPhase = (tableId) => {
    const table = tables.get(tableId);
    if(!table) return;

    table.players.forEach(p => { if(p) { table.pot += p.currentBet; p.currentBet = 0; } });
    table.currentBet = 0;

    if (table.phase === 'preflop') {
        table.phase = 'flop';
        table.communityCards = [table.deck.pop(), table.deck.pop(), table.deck.pop()];
    } else if (table.phase === 'flop') {
        table.phase = 'turn';
        table.communityCards.push(table.deck.pop());
    } else if (table.phase === 'turn') {
        table.phase = 'river';
        table.communityCards.push(table.deck.pop());
    } else if (table.phase === 'river') {
        table.phase = 'showdown';
        const winners = determineWinners(table);
        const winAmount = Math.floor(table.pot / winners.length);
        
        winners.forEach(w => {
            const p = table.players.find(pl => pl && pl.id === w.id);
            if(p) {
                p.chips += winAmount;
                p.isWinner = true;
                // Actualizar saldo global
                if(p.isHuman && users.has(p.userId)) {
                    const user = users.get(p.userId);
                    user.balance = p.chips; 
                    io.to(user.socketId).emit('balance_update', user.balance);
                }
            }
        });
        table.message = `Ganador: ${winners.map(w=>w.name).join(', ')}`;
        table.pot = 0;
        broadcastState(tableId);
        
        setTimeout(() => startNewHand(tableId), 5000);
        return;
    }
    
    let next = (table.dealerIndex + 1) % 6;
    while(!table.players[next] || table.players[next].hasFolded || table.players[next].isAllIn) {
        next = (next + 1) % 6;
        if(next === (table.dealerIndex + 1) % 6) break;
    }
    table.activePlayerIndex = next;
    broadcastState(tableId);
};

const handlePlayerAction = (socketId, action, amount) => {
    let tableId, playerIndex, table;
    for (const [tid, t] of tables.entries()) {
        const idx = t.players.findIndex(p => p && p.socketId === socketId);
        if (idx !== -1) {
            tableId = tid;
            table = t;
            playerIndex = idx;
            break;
        }
    }

    if (!table || table.activePlayerIndex !== playerIndex) return;

    const player = table.players[playerIndex];

    if (action === 'fold') {
        player.hasFolded = true;
    } else if (action === 'call') {
        const toCall = table.currentBet - player.currentBet;
        const bet = Math.min(toCall, player.chips);
        player.chips -= bet;
        player.currentBet += bet;
        if (player.chips === 0) player.isAllIn = true;
    } else if (action === 'raise') {
        const totalBet = amount;
        const added = totalBet - player.currentBet;
        if (player.chips >= added) {
            player.chips -= added;
            player.currentBet = totalBet;
            table.currentBet = totalBet;
        }
    }

    let next = (playerIndex + 1) % 6;
    while(!table.players[next] || table.players[next].hasFolded || table.players[next].isAllIn) {
        next = (next + 1) % 6;
        if(next === playerIndex) break; 
    }

    const active = table.players.filter(p => p && !p.hasFolded && !p.isAllIn);
    const allMatched = active.every(p => p.currentBet === table.currentBet);

    if (allMatched && active.length > 0) {
        nextPhase(tableId);
    } else {
        table.activePlayerIndex = next;
        broadcastState(tableId);
        if (table.players[next] && !table.players[next].isHuman) {
            setTimeout(() => botPlay(tableId, next), 1000);
        }
    }
};

const botPlay = (tableId, index) => {
    const table = tables.get(tableId);
    if (!table) return;
    const bot = table.players[index];
    const toCall = table.currentBet - bot.currentBet;
    if (toCall > 0) handlePlayerAction(bot.socketId, 'call');
    else handlePlayerAction(bot.socketId, 'check');
};

// --- API DE PAGOS ---
app.post('/api/create_payment', (req, res) => {
    const { amount, currency, userId } = req.body;
    // Simulación de pago exitoso tras 5s
    const paymentId = `pay_${Date.now()}`;
    pendingPayments.set(paymentId, { userId, amount: parseFloat(amount), status: 'waiting' });
    
    setTimeout(() => {
         const payment = pendingPayments.get(paymentId);
         if(payment) {
             const user = users.get(payment.userId);
             if(user) {
                 user.balance += payment.amount;
                 io.to(user.socketId).emit('payment_success', { newBalance: user.balance, added: payment.amount });
                 io.to(user.socketId).emit('balance_update', user.balance);
             }
         }
    }, 5000);

    res.json({
        payment_id: paymentId,
        pay_address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        pay_amount: amount,
        pay_currency: currency
    });
});

// --- SOCKET CONNECTION ---
io.on('connection', (socket) => {
  console.log('Conectado:', socket.id);

  socket.on('login', ({ username }) => {
      let userId = `user_${socket.id}`;
      users.set(userId, { id: userId, username, balance: 1000, socketId: socket.id });
      socketIdToUserId.set(socket.id, userId);
      socket.emit('logged_in', { userId, username, balance: 1000 });
  });

  socket.on('join_game', ({ roomId, playerName }) => {
      const userId = socketIdToUserId.get(socket.id);
      let table = tables.get(roomId);
      if (!table) table = createNewTable(roomId, { name: "Mesa Pública" });
      
      let seat = table.players.findIndex(p => p === null);
      if (seat === -1) return; 

      const newPlayer = {
          id: seat,
          userId,
          socketId: socket.id,
          name: playerName,
          chips: 1000,
          hand: [],
          isHuman: true,
          currentBet: 0,
          hasFolded: false,
          isAllIn: false
      };
      
      table.players[seat] = newPlayer;
      socket.join(roomId);

      // Rellenar con Bots si es necesario
      if (table.players.filter(p=>p).length === 1) {
           for(let i=0; i<6; i++) {
               if(table.players[i] === null) {
                   table.players[i] = { 
                       id: i, 
                       socketId: `bot_${i}`, 
                       name: `Bot ${i}`, 
                       chips: 1000, 
                       hand: [], 
                       currentBet: 0, 
                       hasFolded: false, 
                       isAllIn: false, 
                       isHuman: false 
                   };
               }
           }
           startNewHand(roomId);
      } else {
           broadcastState(roomId);
      }
  });

  socket.on('action', ({ action, amount }) => {
      handlePlayerAction(socket.id, action, amount);
  });

  socket.on('chat_message', (msg) => {
      io.to(msg.roomId).emit('chat_message', msg);
  });
  
  socket.on('restart', ({ roomId }) => {
      startNewHand(roomId);
  });
});

server.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));