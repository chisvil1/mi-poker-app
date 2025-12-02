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
// CRÍTICO: Usamos el middleware express.raw SÓLO para la ruta del webhook,
// porque necesitamos el cuerpo del mensaje en formato RAW para verificar la firma.
app.use('/api/webhook', express.raw({ type: 'application/json' }));
app.use(express.json()); // El resto de la API usa JSON 

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Permite conexiones desde cualquier lugar
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 4000;

// --- CONFIGURACIÓN DE NOWPAYMENTS (¡ATENCIÓN! ESTOS VALORES ESTÁN SINCRONIZADOS) ---
// La aplicación intentará primero leer estas claves de las variables de entorno de Render.
const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY || 'J7HQREM-K1E4NTH-Q8XBEB0-666X41A';
const IPN_SECRET = process.env.IPN_SECRET || '+0pL34Ehrcu5Iwtvjn5CpFTbTRtcVDPx';
const YOUR_PAYOUT_ADDRESS = process.env.PAYOUT_ADDRESS || '0x263332BEC004486b2845186C13228Da60Bf6a93B'; // <-- TU DIRECCIÓN REAL
const NOWPAYMENTS_URL = 'https://api.nowpayments.io/v1';

// --- ESTADO GLOBAL ---
const tables = new Map();
const users = new Map();
const socketIdToUserId = new Map();
const pendingPayments = new Map();
const expulsionTimers = new Map(); 

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

  console.log(`[broadcastState] Broadcasting state for table ${tableId}`);

  // Enviar estado específico a cada jugador para que vean sus propias cartas
  table.players.forEach(p => {
      if (p && p.isHuman) {
          console.log(`[broadcastState] Processing player ${p.name}`);
          const playerSpecificPlayers = table.players.map(pp => {
              if(!pp) return null;
              const showCards = table.phase === 'showdown' && !pp.hasFolded;
              
              const formatCard = (c) => c ? { 
                  rank: c.slice(0, -1).replace('T', '10'), 
                  suit: c.slice(-1) 
              } : null;

              if (pp.socketId === p.socketId) {
                   console.log(`[broadcastState] Player ${p.name} hand:`, p.hand);
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
            suit: c.slice(-1)
          }));

          console.log(`[broadcastState] Sending update to ${p.name}, hand length:`, playerSpecificPlayers.find(pl => pl && pl.socketId === p.socketId).hand.length);
          io.to(p.socketId).emit('game_update', { 
              ...table, 
              players: playerSpecificPlayers,
              communityCards: communityPublic
          });
      }
  });
};

const startNewHand = (tableId) => {
    console.log(`[startNewHand] Attempting to start new hand for table ${tableId}`);
    const table = tables.get(tableId);
    if (!table) {
        console.error(`[startNewHand] Error: No table found for id ${tableId}`);
        return;
    }

    const players_at_table = table.players.filter(p => p);
    console.log(`[startNewHand] Players at table ${tableId}: ${players_at_table.length}`);

    if (players_at_table.length < 2) {
        console.log(`[startNewHand] Not enough players to start a new hand. Setting phase to lobby.`);
        if(table) {
            table.phase = 'lobby';
            table.message = "Esperando más jugadores...";
            broadcastState(tableId);
        }
        return;
    }
    
    console.log(`[startNewHand] Starting new hand for table ${tableId}`);

    table.deck = createDeck();
    table.pot = table.smallBlind + table.bigBlind;
    table.communityCards = [];
    table.phase = 'preflop';
    table.currentBet = table.bigBlind;
    table.message = "Nueva mano";

    table.players.forEach(p => {
        if(p) {
            console.log(`[startNewHand] Dealing cards to player ${p.name}`);
            p.hand = [table.deck.pop(), table.deck.pop()];
            console.log(`[startNewHand] Player ${p.name} has ${p.hand.length} cards:`, p.hand);
            p.currentBet = 0;
            p.hasFolded = false;
            p.isAllIn = false;
            p.isWinner = false;
            p.hasActed = false;
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

    // Auto-fold para el primer jugador si está ausente
    const firstPlayer = table.players[utg];
    if (firstPlayer && firstPlayer.status === 'away') {
        console.log(`[Auto-Fold] El primer jugador ${firstPlayer.name} está ausente. Se retira automáticamente.`);
        setTimeout(() => handlePlayerAction(firstPlayer.socketId, 'fold'), 1000);
    }
};

const nextPhase = (tableId) => {
    const table = tables.get(tableId);
    if(!table) return;

    table.players.forEach(p => { if(p) { p.hasActed = false; table.pot += p.currentBet; p.currentBet = 0; } });
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
        
        setTimeout(() => {
            console.log(`[nextPhase - setTimeout] Triggering startNewHand for table ${tableId}`);
            startNewHand(tableId)
        }, 5000);
        return;
    }
    
    let next = (table.dealerIndex + 1) % 6;
    while(!table.players[next] || table.players[next].hasFolded || table.players[next].isAllIn || table.players[next].disconnected) {
        next = (next + 1) % 6;
        if(next === (table.dealerIndex + 1) % 6) break;
    }
    table.activePlayerIndex = next;
    broadcastState(tableId);

    // Auto-fold para el siguiente jugador si está ausente
    const nextPlayer = table.players[next];
    if (nextPlayer && nextPlayer.status === 'away') {
        console.log(`[Auto-Fold] El jugador ${nextPlayer.name} está ausente. Se retira automáticamente.`);
        setTimeout(() => handlePlayerAction(nextPlayer.socketId, 'fold'), 1000);
    }
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

    if (!table || table.activePlayerIndex !== playerIndex) {
        console.log(`[handlePlayerAction] Action rejected for player ${playerIndex}. Active player is ${table.activePlayerIndex}.`);
        return;
    }

    const player = table.players[playerIndex];
    player.hasActed = true;

    if (action === 'fold') {
        player.hasFolded = true;
        const activePlayers = table.players.filter(p => p && !p.hasFolded);
        if (activePlayers.length === 1) {
            const winner = activePlayers[0];
            winner.chips += table.pot;
            table.players.forEach(p => { if (p) p.currentBet = 0; });
            table.pot = 0;
            table.phase = 'showdown'; // Or some other phase to indicate the hand is over
            table.message = `Ganador: ${winner.name}`;
            broadcastState(tableId);
            setTimeout(() => {
                console.log(`[handlePlayerAction - fold - setTimeout] Triggering startNewHand for table ${tableId}`);
                startNewHand(tableId)
            }, 5000);
            return;
        }
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
            table.players.forEach(p => { if (p && p.socketId !== socketId) p.hasActed = false; });
        }
    }

    let next = (playerIndex + 1) % 6;
    while(!table.players[next] || table.players[next].hasFolded || table.players[next].isAllIn || table.players[next].disconnected) {
        next = (next + 1) % 6;
        if(next === playerIndex) break; 
    }

    const active = table.players.filter(p => p && !p.hasFolded && !p.isAllIn);
    const allHaveActed = active.every(p => p.hasActed);
    const allMatched = active.every(p => p.currentBet === table.currentBet);

    if (allMatched && allHaveActed && active.length > 0) {
        nextPhase(tableId);
    } else {
        table.activePlayerIndex = next;
        broadcastState(tableId);

        // Auto-fold para el siguiente jugador si está ausente
        const nextPlayer = table.players[next];
        if (nextPlayer && nextPlayer.status === 'away') {
            console.log(`[Auto-Fold] El jugador ${nextPlayer.name} está ausente. Se retira automáticamente.`);
            setTimeout(() => handlePlayerAction(nextPlayer.socketId, 'fold'), 1000);
        }
    }
};

app.use(express.static(path.join(__dirname, '../Frontend/dist')));

// --- API DE PAGOS (CREATE PAYMENT) ---

app.post('/api/create_payment', async (req, res) => {
    const { amount, currency, userId } = req.body;

    if (!amount || parseFloat(amount) < 10) return res.status(400).json({ error: 'Monto insuficiente.' });

    try {
        const response = await fetch(`${NOWPAYMENTS_URL}/payment`, {
            method: 'POST',
            headers: { 'x-api-key': NOWPAYMENTS_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                price_amount: amount,
                price_currency: 'usd',
                pay_currency: currency.toLowerCase(),
                ipn_callback_url: `https://${req.headers.host}/api/webhook`,
                order_id: `ORDER_${userId}_${Date.now()}`,
                payout_address: YOUR_PAYOUT_ADDRESS
            })
        });
        const paymentData = await response.json();

        if (!response.ok) {
            console.error("Error desde NowPayments:", paymentData);
            return res.status(response.status).json({ error: 'Error al crear el pago en NowPayments.', details: paymentData });
        }

        pendingPayments.set(paymentData.payment_id, { userId, amount: parseFloat(amount), status: 'waiting' });
        res.json(paymentData);

    } catch (error) {
        console.error("Error de red o interno al llamar a NowPayments:", error);
        res.status(500).json({ error: 'Error interno o de red.' });
    }
});

// 2. Webhook (El Aviso de la Blockchain con Verificación de Seguridad)
app.post('/api/webhook', (req, res) => {
    const signature = req.headers['x-nowpayments-sig'];
    const bodyString = req.body.toString('utf8');

    // 1. Verificar la firma de seguridad (Antifraude)
    const generatedSignature = crypto.createHmac('sha512', IPN_SECRET).update(bodyString).digest('hex');

    if (signature !== generatedSignature) {
        // Si no coinciden, es un intento de fraude
        console.error('ALERTA DE SEGURIDAD: Firma IPN inválida!');
        return res.status(403).send('Firma IPN inválida');
    }

    // 2. Procesar el pago si la firma es válida
    try {
        const payment = JSON.parse(bodyString);
        const { payment_id, payment_status } = payment;

        if (payment_status === 'finished' || payment_status === 'confirmed') {
            const order = pendingPayments.get(payment_id);

            if (order && order.status === 'waiting') {
                // 3. Acreditar Saldo
                const user = users.get(order.userId);
                if (user) {
                    user.balance += order.amount; // Usamos amount de la orden original ($USD)
                    io.to(user.socketId).emit('payment_success', { newBalance: user.balance, added: order.amount });
                    io.to(user.socketId).emit('balance_update', user.balance);
                }
                pendingPayments.delete(payment_id);
            }
        }
    } catch (e) {
        console.error('Error al parsear el Webhook:', e);
    }

    res.status(200).send('ok');
});


// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../Frontend/dist/index.html'));
});


// --- SOCKET CONNECTION ---
io.on('connection', (socket) => {
  console.log('Conectado:', socket.id);

  socket.on('login', ({ username }) => {
      let userId = `user_${socket.id}`;
      // Evitar sobreescribir si ya existe, aunque el flujo normal no debería permitirlo
      if (!users.has(userId)) {
          users.set(userId, { id: userId, username, balance: 1000, socketId: socket.id });
          socketIdToUserId.set(socket.id, userId);
      }
      socket.emit('logged_in', { userId, username, balance: 1000 });
  });

  socket.on('reauthenticate', (authPayload) => {
    if (authPayload && authPayload.userId && users.has(authPayload.userId)) {
        const user = users.get(authPayload.userId);
        console.log(`[reauthenticate] Re-autenticando al usuario ${user.username} con nuevo socket ${socket.id}`);

        // Limpiar cualquier socketId antiguo asociado a este userId
        for (const [sid, uid] of socketIdToUserId.entries()) {
            if (uid === user.id) {
                socketIdToUserId.delete(sid);
                break;
            }
        }

        // Actualizar con el nuevo socketId
        user.socketId = socket.id;
        socketIdToUserId.set(socket.id, user.id);
        
        // Confirmar al cliente
        socket.emit('reauthenticated');
    } else {
        socket.emit('reauthentication_failed');
    }
  });

  socket.on('join_game', ({ roomId, playerName, buyInAmount = 1000 }) => { // Default buy-in for now
      const userId = socketIdToUserId.get(socket.id);
      const user = users.get(userId);

      if (!user) {
          socket.emit('error_joining', { message: 'Usuario no encontrado.' });
          return;
      }

      if (user.balance < buyInAmount) {
          socket.emit('error_joining', { message: 'Saldo insuficiente para el buy-in.' });
          return;
      }

      let table = tables.get(roomId);
      if (!table) table = createNewTable(roomId, { name: "Mesa Pública" });

      const existingPlayer = table.players.find(p => p && p.name === playerName);

      if (existingPlayer) {
          if (existingPlayer.status === 'away') {
              // Reconnection logic remains the same
              console.log(`[reconnect] Jugador ${playerName} se está reconectando a la mesa ${roomId}`);
              existingPlayer.status = 'playing';
              existingPlayer.socketId = socket.id;
              
              const oldSocketId = Object.keys(socketIdToUserId).find(key => socketIdToUserId[key] === existingPlayer.userId);
              if(oldSocketId) socketIdToUserId.delete(oldSocketId);
              socketIdToUserId.set(socket.id, existingPlayer.userId);

              const expulsionTimer = expulsionTimers.get(existingPlayer.userId);
              if (expulsionTimer) {
                  clearTimeout(expulsionTimer);
                  expulsionTimers.delete(existingPlayer.userId);
                  console.log(`[reconnect] Temporizador de expulsión cancelado para ${playerName}`);
              }
              
              broadcastState(roomId);
              return;
          } else {
              socket.emit('error_joining', { message: 'El nombre de usuario ya está en uso en esta mesa.' });
              return;
          }
      }
      
      let seat = table.players.findIndex(p => p === null);
      if (seat === -1) {
          socket.emit('error_joining', { message: 'La mesa está llena.' });
          return;
      }
      
      // Deduct buy-in from lobby balance and update chips
      user.balance -= buyInAmount;
      io.to(socket.id).emit('balance_update', user.balance);

      const newPlayer = {
          id: seat,
          userId,
          socketId: socket.id,
          name: playerName,
          chips: buyInAmount, // Use the buy-in amount
          hand: [],
          isHuman: true,
          currentBet: 0,
          hasFolded: false,
          isAllIn: false,
          hasActed: false,
          status: 'playing' // 'playing', 'away', 'sitting_out'
      };
      
      table.players[seat] = newPlayer;
      socket.join(roomId);

      broadcastState(roomId);
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

  socket.on('leave_game', () => {
    const userId = socketIdToUserId.get(socket.id);
    if (!userId) return;

    for (const [tableId, table] of tables.entries()) {
        const playerIndex = table.players.findIndex(p => p && p.userId === userId);
        if (playerIndex !== -1) {
            const player = table.players[playerIndex];
            const user = users.get(userId);
            
            if (user && player) {
                console.log(`[leave_game] Jugador ${player.name} saliendo de la mesa ${tableId} con ${player.chips} fichas.`);
                user.balance += player.chips;
                io.to(socket.id).emit('balance_update', user.balance);
            }

            table.players[playerIndex] = null;
            broadcastState(tableId);
            break;
        }
    }
  });

  socket.on('disconnect', () => {
    console.log('Desconectado:', socket.id);
    const userId = socketIdToUserId.get(socket.id);
    if (!userId) return;

    // Encontrar al jugador y marcarlo como ausente
    for (const [tableId, table] of tables.entries()) {
        const playerIndex = table.players.findIndex(p => p && p.userId === userId);
        if (playerIndex !== -1) {
            const player = table.players[playerIndex];
            player.status = 'away';
            player.disconnectTime = Date.now();
            console.log(`[disconnect] Jugador ${player.name} marcado como 'away' en la mesa ${tableId}`);
            broadcastState(tableId);

            // Iniciar temporizador de expulsión (2 minutos)
            const expulsionTimer = setTimeout(() => {
                const currentTable = tables.get(tableId);
                if (currentTable && currentTable.players[playerIndex]?.status === 'away') {
                    console.log(`[expulsion] Expulsando al jugador ${player.name} de la mesa ${tableId} por inactividad.`);
                    currentTable.players[playerIndex] = null;
                    users.delete(userId);
                    broadcastState(tableId);
                }
            }, 120000); // 2 minutos

            expulsionTimers.set(userId, expulsionTimer);
            break; 
        }
    }
  });
});

server.listen(PORT, () => console.log(`Server Pro running on port ${PORT}`));