const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Recuerda instalar: npm install pokersolver
const logger = require('./utils/logger');
const Hand = require('pokersolver').Hand; 
const jwt = require('jsonwebtoken');
const User = require('./models/User');

const app = express();
app.use(cors());
// CRÍTICO: Usamos el middleware express.raw SÓLO para la ruta del webhook,
// porque necesitamos el cuerpo del mensaje en formato RAW para verificar la firma.
app.use('/api/webhook', express.raw({ type: 'application/json' }));
app.use(express.json()); // El resto de la API usa JSON 

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));

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

// --- BOT LOGIC ---
const getBotAction = (player, table) => {
    const toCall = table.currentBet - player.currentBet;

    // Si no hay que pagar nada, pasar (check)
    if (toCall === 0) {
        return { action: 'call' }; // 'call' en este contexto es un check
    }

    // Lógica simple: 50% call, 50% fold
    if (Math.random() < 0.5) {
        return { action: 'call' };
    } else {
        return { action: 'fold' };
    }
    // TODO: Añadir lógica de raise en el futuro
};

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
        logger.error(`Error evaluando manos: ${e.message}`, "E001");
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
  logger.info(`Table ${tableId} created.`, 'I001');
  return newTable;
};

// --- MOTOR DEL JUEGO ---
const broadcastState = (tableId) => {
  const table = tables.get(tableId);
  if (!table) return;

  // Emite a toda la sala para actualizaciones generales (logs, pot, etc.)
  io.to(tableId).emit('game_update', {
    ...table,
    players: table.players.map(p => {
      if (!p) return null;
      // No enviar la mano de nadie en la emisión general
      return { ...p, hand: [null, null] }; 
    })
  });

  // Enviar a cada jugador sus cartas específicas
  table.players.forEach(p => {
    if (p && p.isHuman && p.socketId) {
      const playerSpecificState = {
        ...table,
        players: table.players.map(otherPlayer => {
          if (!otherPlayer) return null;
          
          const showCards = table.phase === 'showdown' && !otherPlayer.hasFolded;
          
          const formatCard = (c) => c ? { 
              rank: c.slice(0, -1).replace('T', '10'), 
              suit: c.slice(-1) 
          } : null;
          
          let handToShow;
          if (otherPlayer.socketId === p.socketId) {
            // Es el jugador actual, mostrarle sus cartas
            handToShow = otherPlayer.hand.map(formatCard);
          } else if (showCards) {
            // Es otro jugador durante el showdown, mostrarle sus cartas
            handToShow = otherPlayer.hand.map(formatCard);
          } else {
            // Es otro jugador, no mostrarle las cartas
            handToShow = otherPlayer.hand.map(() => null);
          }

          return {
             ...otherPlayer,
             hand: handToShow,
             showCards: showCards,
          };
        }),
        communityCards: table.communityCards.map(c => ({
            rank: c.slice(0, -1).replace('T', '10'), 
            suit: c.slice(-1)
        }))
      };
      io.to(p.socketId).emit('game_update', playerSpecificState);
    }
  });
};

const startNewHand = (tableId) => {
    logger.info(`Attempting to start new hand for table ${tableId}`, 'I002');
    const table = tables.get(tableId);
    if (!table) {
        logger.error(`Error: No table found for id ${tableId}`, "E002");
        return;
    }

    const players_at_table = table.players.filter(p => p);
    logger.info(`Players at table ${tableId}: ${players_at_table.length}`, 'I003');

    if (players_at_table.length < 2) {
        logger.info(`Not enough players to start a new hand. Setting phase to lobby.`, 'I004');
        if(table) {
            table.phase = 'lobby';
            table.message = "Esperando más jugadores...";
            broadcastState(tableId);
        }
        return;
    }
    
    logger.info(`Starting new hand for table ${tableId}`, 'I005');

    table.deck = createDeck();
    table.pot = table.smallBlind + table.bigBlind;
    table.communityCards = [];
    table.phase = 'preflop';
    table.currentBet = table.bigBlind;
    table.message = "Nueva mano";

    table.players.forEach(p => {
        if(p) {
            p.hand = [table.deck.pop(), table.deck.pop()];
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

    // Trigger bot action if UTG is a bot
    const firstPlayer = table.players[utg];
    if (firstPlayer && !firstPlayer.isHuman) {
        triggerBotAction(firstPlayer, tableId);
    } else if (firstPlayer && firstPlayer.status === 'away') {
        logger.info(`El primer jugador ${firstPlayer.name} está ausente. Se retira automáticamente.`, 'I006');
        setTimeout(() => handleAction(tableId, utg, 'fold'), 1000);
    }
};

const nextPhase = (tableId) => {
    const table = tables.get(tableId);
    if(!table) return;

    // Acumular apuestas en el bote y resetear apuestas de jugadores
    let totalPotFromBets = 0;
    table.players.forEach(p => { 
        if(p) { 
            totalPotFromBets += p.currentBet;
            p.currentBet = 0; 
            p.hasActed = false; // Resetear el estado de acción para la nueva ronda
        }
    });
    table.pot += totalPotFromBets;
    table.currentBet = 0;
    table.minRaise = table.bigBlind; // Resetear la subida mínima

    // Determinar si todos menos uno están all-in o se han retirado
    const activePlayers = table.players.filter(p => p && !p.hasFolded);
    const playersIn = activePlayers.filter(p => !p.isAllIn);
    
    if (playersIn.length <= 1) {
        // Si solo queda un jugador que puede apostar, avanzamos todas las fases hasta el showdown
        while(table.phase !== 'river') {
             if (table.phase === 'preflop') {
                table.phase = 'flop';
                table.communityCards.push(table.deck.pop(), table.deck.pop(), table.deck.pop());
            } else if (table.phase === 'flop') {
                table.phase = 'turn';
                table.communityCards.push(table.deck.pop());
            } else if (table.phase === 'turn') {
                table.phase = 'river';
                table.communityCards.push(table.deck.pop());
            }
        }
    }

    if (table.phase === 'preflop') {
        table.phase = 'flop';
        table.communityCards.push(table.deck.pop(), table.deck.pop(), table.deck.pop());
    } else if (table.phase === 'flop') {
        table.phase = 'turn';
        table.communityCards.push(table.deck.pop());
    } else if (table.phase === 'turn') {
        table.phase = 'river';
        table.communityCards.push(table.deck.pop());
    } else if (table.phase === 'river' || playersIn.length <= 1) {
        table.phase = 'showdown';
        
        // Retraso para que el showdown sea visible
        setTimeout(() => {
            const winners = determineWinners(table);
            const winAmount = Math.floor(table.pot / winners.length);
            
            winners.forEach(w => {
                const p = table.players.find(pl => pl && pl.id === w.id);
                if(p) {
                    p.chips += winAmount;
                    p.isWinner = true;
                }
            });
            table.message = `Ganador: ${winners.map(w=>w.name).join(', ')}`;
            broadcastState(tableId); // Mostrar cartas y ganador
            
            setTimeout(() => startNewHand(tableId), 5000);
        }, 1000);
        return;
    }
    
    let next = (table.dealerIndex + 1) % 6;
    while(!table.players[next] || table.players[next].hasFolded || table.players[next].isAllIn) {
        next = (next + 1) % 6;
        if(next === (table.dealerIndex + 1) % 6) break; // Evitar bucle infinito
    }
    table.activePlayerIndex = next;
    broadcastState(tableId);

    const nextPlayer = table.players[next];
    if (nextPlayer) {
        if (!nextPlayer.isHuman) {
            triggerBotAction(nextPlayer, tableId);
        } else if (nextPlayer.status === 'away') {
            logger.info(`El jugador ${nextPlayer.name} está ausente. Se retira automáticamente.`, 'I007');
            setTimeout(() => handleAction(tableId, next, 'fold'), 1000);
        }
    }
};

const triggerBotAction = (player, tableId) => {
    if (!player || player.isHuman) return;

    logger.info(`Triggering action for bot: ${player.name}`, 'I008');
    const table = tables.get(tableId);
    if (!table) return;

    // Retraso para simular que el bot "piensa"
    setTimeout(() => {
        const botAction = getBotAction(player, table);
        handleAction(tableId, player.id, botAction.action, botAction.amount);
    }, 1500);
};

const handleAction = (tableId, playerIndex, action, amount) => {
    const table = tables.get(tableId);
    if (!table || table.activePlayerIndex !== playerIndex) {
        logger.warn(`Action rejected for player ${playerIndex}. Active player is ${table.activePlayerIndex}.`, 'W001');
        return;
    }

    const player = table.players[playerIndex];
    if (!player) return;
    
    logger.info(`Processing action: ${action} from player: ${player.name}`, 'I009');
    player.hasActed = true;

    if (action === 'fold') {
        player.hasFolded = true;
        const activePlayers = table.players.filter(p => p && !p.hasFolded);
        if (activePlayers.length === 1) {
            const winner = activePlayers[0];
            winner.chips += table.pot;
            table.players.forEach(p => { if (p) { table.pot += p.currentBet; p.currentBet = 0; }});
            table.message = `Ganador: ${winner.name}`;
            broadcastState(tableId);
            setTimeout(() => startNewHand(tableId), 5000);
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
        if (player.chips >= added && totalBet >= table.currentBet + table.minRaise) {
            player.chips -= added;
            player.currentBet = totalBet;
            table.currentBet = totalBet;
            table.minRaise = totalBet - (table.currentBet - added); // La nueva subida mínima es el tamaño de la última subida
            table.players.forEach(p => { if (p && p.id !== player.id) p.hasActed = false; });
        } else {
             // Si la acción no es válida, simplemente no hacemos nada y dejamos que el jugador actúe de nuevo.
             // En un futuro, se podría emitir un error al cliente.
             logger.warn(`Invalid raise from ${player.name}. Amount: ${amount}`, 'W002');
             player.hasActed = false;
             return;
        }
    }

    let next = (playerIndex + 1) % 6;
    while(!table.players[next] || table.players[next].hasFolded || table.players[next].isAllIn) {
        next = (next + 1) % 6;
        if(next === playerIndex) { // Si solo queda un jugador activo
             // Esto puede ocurrir si todos los demás se han retirado o están all-in
            const remainingPlayers = table.players.filter(p => p && !p.hasFolded);
            if (remainingPlayers.length <= 1) {
                 nextPhase(tableId); // Ir a la siguiente fase para repartir el bote
                 return;
            }
            break;
        }
    }
    
    const active = table.players.filter(p => p && !p.hasFolded && !p.isAllIn);
    const allHaveActed = active.every(p => p.hasActed);
    const allMatched = active.every(p => p.currentBet === table.currentBet);

    if (allMatched && allHaveActed && active.length > 0) {
        nextPhase(tableId);
    } else {
        table.activePlayerIndex = next;
        broadcastState(tableId);
        
        const nextPlayer = table.players[next];
        if (nextPlayer) {
             if (!nextPlayer.isHuman) {
                triggerBotAction(nextPlayer, tableId);
             } else if (nextPlayer.status === 'away') {
                 logger.info(`El jugador ${nextPlayer.name} está ausente. Se retira automáticamente.`, 'I007');
                 setTimeout(() => handleAction(tableId, next, 'fold'), 1000);
             }
        }
    }
};

const handlePlayerAction = (socketId, action, amount) => {
    let tableId, playerIndex;
    for (const [tid, t] of tables.entries()) {
        const idx = t.players.findIndex(p => p && p.socketId === socketId);
        if (idx !== -1) {
            tableId = tid;
            playerIndex = idx;
            break;
        }
    }

    if (tableId !== undefined && playerIndex !== undefined) {
        handleAction(tableId, playerIndex, action, amount);
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
            logger.error(`Error desde NowPayments: ${JSON.stringify(paymentData)}`, 'E003');
            return res.status(response.status).json({ error: 'Error al crear el pago en NowPayments.', details: paymentData });
        }

        pendingPayments.set(paymentData.payment_id, { userId, amount: parseFloat(amount), status: 'waiting' });
        res.json(paymentData);

    } catch (error) {
        logger.error(`Error de red o interno al llamar a NowPayments: ${error.message}`, 'E004');
        res.status(500).json({ error: 'Error interno o de red.' });
    }
});

// 2. Webhook (El Aviso de la Blockchain con Verificación de Seguridad)
app.post('/api/webhook', async (req, res) => {
    const signature = req.headers['x-nowpayments-sig'];
    const bodyString = req.body.toString('utf8');

    // 1. Verificar la firma de seguridad (Antifraude)
    const generatedSignature = crypto.createHmac('sha512', IPN_SECRET).update(bodyString).digest('hex');

    if (signature !== generatedSignature) {
        logger.error('ALERTA DE SEGURIDAD: Firma IPN inválida!', 'E005');
        return res.status(403).send('Firma IPN inválida');
    }

    // 2. Procesar el pago si la firma es válida
    try {
        const payment = JSON.parse(bodyString);
        const { payment_id, payment_status } = payment;

        if (payment_status === 'finished' || payment_status === 'confirmed') {
            const order = pendingPayments.get(payment_id);

            if (order && order.status === 'waiting') {
                 // 3. Acreditar Saldo DIRECTAMENTE en la DB
                const updatedUser = await User.findByIdAndUpdate(
                    order.userId,
                    { $inc: { balance: order.amount } },
                    { new: true }
                );

                if (updatedUser) {
                    logger.info(`User ${updatedUser.username} balance updated to ${updatedUser.balance} after payment ${payment_id}`, 'I-PAY-01');
                    
                    // Si el usuario está conectado, actualizar su estado en memoria y notificarle
                    const inMemoryUser = users.get(order.userId);
                    if (inMemoryUser) {
                        inMemoryUser.balance = updatedUser.balance;
                        io.to(inMemoryUser.socketId).emit('payment_success', { newBalance: updatedUser.balance, added: order.amount });
                        io.to(inMemoryUser.socketId).emit('balance_update', updatedUser.balance);
                    }
                }
                
                pendingPayments.set(payment_id, { ...order, status: 'processed' });
            }
        }
    } catch (e) {
        logger.error(`Error al parsear el Webhook: ${e.message}`, 'E006');
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
  logger.info(`Conectado: ${socket.id}`, 'I010');

  socket.on('authenticate', async ({ token }) => {
    if (!token) {
      return socket.emit('unauthorized', { message: 'No token provided' });
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        return socket.emit('unauthorized', { message: 'Invalid token' });
      }
      
      // Clean up old socket associations for this user
      for (const [sid, uid] of socketIdToUserId.entries()) {
        if (uid === user.id.toString()) {
            socketIdToUserId.delete(sid);
            break;
        }
      }

      // Associate socket with user
      socketIdToUserId.set(socket.id, user.id.toString());
      users.set(user.id.toString(), {
          // We are creating an in-memory representation of the user for game logic
          id: user.id.toString(),
          username: user.username,
          balance: user.balance,
          socketId: socket.id,
      });

      socket.emit('authenticated', {
        id: user.id,
        username: user.username,
        email: user.email,
        balance: user.balance,
      });
      
      logger.info(`User ${user.username} authenticated with socket ${socket.id}`, 'I-AUTH-01');

    } catch (error) {
      logger.error(`Authentication error: ${error.message}`, 'E-AUTH-01');
      socket.emit('unauthorized', { message: 'Invalid token' });
    }
  });







  socket.on('join_game', async ({ roomId, buyInAmount = 1000 }) => { // playerName is removed for security
    const userId = socketIdToUserId.get(socket.id);
    if (!userId) {
      return socket.emit('error_joining', { message: 'Usuario no autenticado.' });
    }
    
    // Use the in-memory user object for username, but perform balance transaction atomically on the DB
    const inMemoryUser = users.get(userId);
    if (!inMemoryUser) {
      return socket.emit('error_joining', { message: 'Usuario no encontrado en memoria.' });
    }
    
    logger.info(`User ${inMemoryUser.username} attempting to join table ${roomId} with buy-in: ${buyInAmount}`, 'I-JGM-01');
    
    try {
        // ATOMIC OPERATION: Find user and decrement balance only if sufficient
        const updatedUser = await User.findOneAndUpdate(
            { _id: userId, balance: { $gte: buyInAmount } }, // Query to find the user with enough balance
            { $inc: { balance: -buyInAmount } },             // Update (decrement balance)
            { new: true }                                    // Options (return the updated document)
        );

        if (!updatedUser) {
             // If updatedUser is null, it means the query failed (likely because balance was < buyInAmount)
             logger.warn(`Join failed for ${inMemoryUser.username}, insufficient balance.`, 'W-JGM-01');
             return socket.emit('error_joining', { message: 'Saldo insuficiente para el buy-in.' });
        }
        
        // If we reach here, the buy-in was successful. Update in-memory state.
        inMemoryUser.balance = updatedUser.balance;
        logger.info(`User ${inMemoryUser.username} balance updated to: ${inMemoryUser.balance} after buy-in.`, 'I-JGM-02');
        io.to(socket.id).emit('balance_update', inMemoryUser.balance);

        // --- The rest of the join table logic can now proceed safely ---
        let table = tables.get(roomId);
        if (!table) table = createNewTable(roomId, { name: "Mesa Pública" });

        const existingPlayer = table.players.find(p => p && p.userId === userId);
        if (existingPlayer) {
            // This logic handles reconnection for a player already at the table
            logger.info(`Jugador ${inMemoryUser.username} se está reconectando a la mesa ${roomId}`, 'I012');
            existingPlayer.status = 'playing';
            existingPlayer.socketId = socket.id;
            broadcastState(roomId);
            return;
        }
        
        let seat = table.players.findIndex(p => p === null);
        if (seat === -1) {
            // This is unlikely but possible in a race. We should refund the user.
            await User.findByIdAndUpdate(userId, { $inc: { balance: buyInAmount } });
            inMemoryUser.balance += buyInAmount; // Also update in-memory
            io.to(socket.id).emit('balance_update', inMemoryUser.balance);
            return socket.emit('error_joining', { message: 'La mesa está llena.' });
        }

        const newPlayer = {
            id: seat,
            userId,
            socketId: socket.id,
            name: inMemoryUser.username,
            chips: buyInAmount,
            hand: [],
            isHuman: true,
            currentBet: 0,
            hasFolded: false,
            isAllIn: false,
            hasActed: false,
            status: 'playing'
        };
        
        table.players[seat] = newPlayer;
        socket.join(roomId);
        broadcastState(roomId);

    } catch (error) {
        logger.error(`Error joining game for user ${userId}: ${error.message}`, 'E-JGM-01');
        socket.emit('error_joining', { message: 'Ocurrió un error al unirse a la mesa.' });
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

  socket.on('leave_game', async () => {
    const userId = socketIdToUserId.get(socket.id);
    if (!userId) return;

    for (const [tableId, table] of tables.entries()) {
        const playerIndex = table.players.findIndex(p => p && p.userId === userId);
        if (playerIndex !== -1) {
            const player = table.players[playerIndex];
            if (!player) continue;

            const chipsToReturn = player.chips || 0;

            try {
                // Persist balance change to DB
                const updatedUser = await User.findByIdAndUpdate(
                    userId,
                    { $inc: { balance: chipsToReturn } },
                    { new: true }
                );

                if (updatedUser) {
                    // Update in-memory user object
                    const inMemoryUser = users.get(userId);
                    if (inMemoryUser) {
                        inMemoryUser.balance = updatedUser.balance;
                    }
                    logger.info(`Jugador ${player.name} saliendo de la mesa ${tableId} con ${chipsToReturn} fichas. Balance actualizado en DB.`, 'I014');
                    io.to(socket.id).emit('balance_update', updatedUser.balance);
                }

                table.players[playerIndex] = null;
                broadcastState(tableId);
                
            } catch (error) {
                 logger.error(`Error leaving game for user ${userId}: ${error.message}`, 'E-LGM-01');
                 socket.emit('error_leaving', { message: 'Ocurrió un error al salir de la mesa.' });
            }
            break; 
        }
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Desconectado: ${socket.id}`, 'I015');
    const userId = socketIdToUserId.get(socket.id);
    if (!userId) return;

    // Encontrar al jugador y marcarlo como ausente
    for (const [tableId, table] of tables.entries()) {
        const playerIndex = table.players.findIndex(p => p && p.userId === userId);
        if (playerIndex !== -1) {
            const player = table.players[playerIndex];
            player.status = 'away';
            player.disconnectTime = Date.now();
            logger.info(`Jugador ${player.name} marcado como 'away' en la mesa ${tableId}`, 'I016');
            broadcastState(tableId);

            // Iniciar temporizador de expulsión (2 minutos)
            const expulsionTimer = setTimeout(() => {
                const currentTable = tables.get(tableId);
                if (currentTable && currentTable.players[playerIndex]?.status === 'away') {
                    logger.info(`Expulsando al jugador ${player.name} de la mesa ${tableId} por inactividad.`, 'I017');
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

// --- BOT MANAGEMENT ---
const BOT_NAMES = ["Nexus", "Cypher", "Orion", "Echo", "Jolt", "Apex"];

const addBotIfNeeded = (tableId) => {
    const table = tables.get(tableId);
    if (!table) return;

    const playerCount = table.players.filter(p => p).length;
    const botCount = table.players.filter(p => p && !p.isHuman).length;

    // Solo añadir bots si hay al menos un humano y menos de 2 bots.
    if (playerCount > 0 && playerCount < 6 && botCount < 2) {
        const seat = table.players.findIndex(p => p === null);
        if (seat !== -1) {
            const botName = `${BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]}_${Math.floor(Math.random() * 100)}`;
            const newBot = {
                id: seat,
                userId: `bot_${botName}`,
                socketId: null, // Los bots no tienen socket
                name: botName,
                chips: 1000, 
                hand: [],
                isHuman: false,
                currentBet: 0,
                hasFolded: false,
                isAllIn: false,
                hasActed: false,
                status: 'playing'
            };
            table.players[seat] = newBot;
            logger.info(`Bot ${botName} added to table ${tableId}`, 'I018');
            broadcastState(tableId);

            // Si la partida estaba en lobby y ahora hay 2+ jugadores, iniciarla
            if (table.phase === 'lobby' && table.players.filter(p => p).length >= 2) {
                logger.info(`Bot triggered game start on table ${tableId}`, 'I019');
                startNewHand(tableId);
            }
        }
    }
};

// --- GAME LOOP ---
setInterval(() => {
    for (const tableId of tables.keys()) {
        addBotIfNeeded(tableId);
        // Aquí se podría añadir más lógica de loop, como el time bank.
    }
}, 5000); // Revisa cada 5 segundos

server.listen(PORT, () => logger.info(`Server Pro running on port ${PORT}`, 'I020'));