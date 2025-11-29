const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const Hand = require('pokersolver').Hand;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static(path.join(__dirname, '../Frontend/dist')));

const PORT = process.env.PORT || 4000;

const tables = new Map();
const users = new Map();
const socketIdToUserId = new Map();
const tournaments = new Map();
const handHistories = new Map();

const createNewTable = (tableId, options = {}) => {
  const newTable = {
    id: tableId,
    phase: 'lobby',
    pot: 0,
    communityCards: [],
    deck: [],
    players: Array(6).fill(null),
    activePlayerIndex: -1,
    dealerIndex: Math.floor(Math.random() * 6),
    currentBet: 0,
    minRaise: options.bigBlind || 20,
    message: "Esperando jugadores...",
    logs: [],
    smallBlind: options.smallBlind || 10,
    bigBlind: options.bigBlind || 20,
    isTournament: options.isTournament || false,
    tournamentId: options.tournamentId || null,
    currentHandId: null,
    gameType: options.gameType || 'NLH', // NLH or PLO
  };
  tables.set(tableId, newTable);
  return newTable;
};

const createDeck = () => {
  const suits = ['s', 'h', 'c', 'd'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  let d = [];
  for (let s of suits) {
    for (let r of ranks) {
      d.push(r + s);
    }
  }
  return d.sort(() => Math.random() - 0.5);
};

const determineWinners = (table) => {
    const activePlayers = table.players.filter(p => p && !p.hasFolded);
    if (activePlayers.length === 0) return [];

    const hands = activePlayers.map(player => {
        let hand;
        if(table.gameType === 'PLO'){
            hand = Hand.solve(player.hand.concat(table.communityCards), 'omaha');
        } else {
            hand = Hand.solve(player.hand.concat(table.communityCards));
        }
        hand.player = player;
        return hand;
    });

    const winnerHands = Hand.winners(hands);
    return winnerHands.map(wHand => wHand.player);
};

const recordAction = (handId, action) => {
    if(!handHistories.has(handId)) return;
    handHistories.get(handId).actions.push(action);
}

const broadcastState = (tableId) => {
  const table = tables.get(tableId);
  if (!table) return;

  const publicPlayers = table.players.map(p => {
    if (!p) return null;
    const showCards = table.phase === 'showdown' && !p.hasFolded;
    return {
      ...p,
      hand: (p.isHuman || showCards) && p.hand.length > 0
        ? p.hand.map(cardStr => ({ rank: cardStr.slice(0, -1).replace('T', '10'), suit: cardStr.slice(-1).toUpperCase() }))
        : [null, null],
      showCards: showCards
    };
  });

  const communityPublic = table.communityCards.map(cardStr => ({
    rank: cardStr.slice(0, -1).replace('T', '10'), suit: cardStr.slice(-1).toUpperCase()
  }));

  const state = { ...table, players: publicPlayers, communityCards: communityPublic };
  io.to(tableId).emit('game_update', state);
  if(table.currentHandId) {
    recordAction(table.currentHandId, { type: 'state', state });
  }
};

const updateUserBalance = (userId, amount) => {
    if (users.has(userId)) {
        const user = users.get(userId);
        user.balance += amount;
        io.to(user.socketId).emit('balance_update', user.balance);
    }
};

const balanceTables = (tournamentId) => {
    const tournament = tournaments.get(tournamentId);
    if(!tournament) return;

    const tournamentTables = tournament.tables.map(id => tables.get(id)).filter(t => t);
    const totalPlayers = tournamentTables.reduce((acc, t) => acc + t.players.filter(p => p).length, 0);
    const numTables = tournamentTables.length;
    const maxPlayersPerTable = 6;

    if(numTables <= 1) return;

    // Check if a table can be closed
    if(totalPlayers <= (numTables - 1) * maxPlayersPerTable){
        const tableToClose = tournamentTables.sort((a,b) => a.players.filter(p=>p).length - b.players.filter(p=>p).length)[0];
        const playersToMove = tableToClose.players.filter(p => p);
        
        playersToMove.forEach(player => {
            tableToClose.players[player.id] = null;
            const newTable = tournamentTables.find(t => t.id !== tableToClose.id && t.players.filter(p=>p).length < maxPlayersPerTable);
            if(newTable){
                const seatIndex = newTable.players.findIndex(p => p === null);
                player.id = seatIndex;
                newTable.players[seatIndex] = player;
                const playerSocket = io.sockets.sockets.get(player.socketId);
                if(playerSocket){
                    playerSocket.leave(tableToClose.id);
                    playerSocket.join(newTable.id);
                    playerSocket.emit('table_change', { tableId: newTable.id });
                }
            }
        });
        tables.delete(tableToClose.id);
        tournament.tables = tournament.tables.filter(id => id !== tableToClose.id);
        io.to(tournamentId).emit('log_message', `La mesa ${tableToClose.id} ha sido cerrada. Los jugadores han sido movidos.`);
    }
}


const handlePlayerElimination = (tableId, playerIndex) => {
    const table = tables.get(tableId);
    if (!table || !table.isTournament) return;

    const player = table.players[playerIndex];
    io.to(tableId).emit('log_message', `${player.name} ha sido eliminado.`);
    table.players[playerIndex] = null;

    const tournament = tournaments.get(table.tournamentId);
    tournament.places.push(player.userId);

    balanceTables(table.tournamentId);

    const remainingPlayers = tournament.tables.reduce((acc, id) => {
        const t = tables.get(id);
        return acc + t.players.filter(p => p).length;
    }, 0);

    if (remainingPlayers <= 1) {
        const winner = tables.get(tournament.tables[0]).players.find(p=>p);
        tournament.places.push(winner.userId);
        const prizePool = tournament.buyIn * tournament.maxPlayers;
        const results = [];

        tournament.prizeStructure.forEach((percentage, i) => {
            const userId = tournament.places[i];
            if(userId){
                const prize = prizePool * percentage;
                updateUserBalance(userId, prize);
                results.push({userId, username: users.get(userId).username, prize, place: i + 1});
            }
        });
        
        io.to(tournament.id).emit('tournament_finished', { results });
        tournament.tables.forEach(id => tables.delete(id));
        tournaments.delete(table.tournamentId);
    }
}

const startNewHand = (tableId) => {
    const table = tables.get(tableId);
    if (!table || table.players.filter(p=>p).length < 2) {
        if(table) {
            if(table.isTournament){
                balanceTables(table.tournamentId);
            }
            table.phase = 'lobby';
            table.message = "Esperando más jugadores...";
            broadcastState(tableId);
        }
        return;
    }

    const handId = `hand_${Date.now()}`;
    table.currentHandId = handId;
    handHistories.set(handId, {
        handId,
        tableId,
        players: JSON.parse(JSON.stringify(table.players)),
        actions: [],
    });

    table.deck = createDeck();
    table.pot = table.smallBlind + table.bigBlind;
    table.communityCards = [];
    table.phase = 'preflop';
    table.currentBet = table.bigBlind;
    table.message = "Nueva mano: Pre-flop";
    table.logs = [`Nueva mano. Ciegas: ${table.smallBlind}/${table.bigBlind}`];

    table.players.forEach(p => {
        if(p) {
            console.log(`Dealing cards to player ${p.name} for game type ${table.gameType}`);
            if(p.chips === 0 && table.isTournament){
                handlePlayerElimination(tableId, p.id);
                return;
            }
            p.hand = table.gameType === 'PLO' ? [table.deck.pop(), table.deck.pop(), table.deck.pop(), table.deck.pop()] : [table.deck.pop(), table.deck.pop()];
            console.log(`Player ${p.name} has ${p.hand.length} cards`);
            p.currentBet = 0;
            p.hasFolded = false;
            p.isAllIn = false;
            p.isWinner = false;
            p.showCards = false;
            if (p.isHuman) {
                const user = users.get(p.userId);
                if (user) {
                    user.stats.handsPlayed++;
                    if(!user.stats.handHistories) user.stats.handHistories = [];
                    user.stats.handHistories.push(handId);
                }
            }
        }
    });

    table.dealerIndex = (table.dealerIndex + 1) % table.players.length;
    
    let sbIndex = (table.dealerIndex + 1);
    while(!table.players[sbIndex % table.players.length]){
        sbIndex++;
    }
    sbIndex = sbIndex % table.players.length;

    let bbIndex = (sbIndex + 1);
    while(!table.players[bbIndex % table.players.length]){
        bbIndex++;
    }
    bbIndex = bbIndex % table.players.length;

    
    table.players[sbIndex].chips -= table.smallBlind;
    table.players[sbIndex].currentBet = table.smallBlind;
    table.logs.push(`${table.players[sbIndex].name} pone ciega pequeña de ${table.smallBlind}`);
    recordAction(handId, { type: 'action', player: table.players[sbIndex].name, action: 'small_blind', amount: table.smallBlind });
    
    table.players[bbIndex].chips -= table.bigBlind;
    table.players[bbIndex].currentBet = table.bigBlind;
    table.logs.push(`${table.players[bbIndex].name} pone ciega grande de ${table.bigBlind}`);
    recordAction(handId, { type: 'action', player: table.players[bbIndex].name, action: 'big_blind', amount: table.bigBlind });

    let utgIndex = (bbIndex + 1)
    while(!table.players[utgIndex % table.players.length]){
        utgIndex++;
    }
    utgIndex = utgIndex % table.players.length;
    table.activePlayerIndex = utgIndex;
    
    broadcastState(tableId);

    if (table.activePlayerIndex !== -1 && table.players[table.activePlayerIndex] && !table.players[table.activePlayerIndex].isHuman) {
      setTimeout(() => botPlay(tableId, table.activePlayerIndex), 1000);
    }
};

const nextPhase = (tableId) => {
    const table = tables.get(tableId);
    if (!table) return;

    const { phase, deck } = table;
    
    table.players.forEach(p => { if(p) { table.pot += p.currentBet; p.currentBet = 0; } });
    table.currentBet = 0;
    
    let firstPlayerIndex = (table.dealerIndex + 1);
     while(!table.players[firstPlayerIndex % table.players.length]){
        firstPlayerIndex++;
    }
    firstPlayerIndex = firstPlayerIndex % table.players.length;

    let loopSafety = 0;
    while(table.players[firstPlayerIndex] && (table.players[firstPlayerIndex].hasFolded || table.players[firstPlayerIndex].isAllIn) && loopSafety < 10) {
        firstPlayerIndex = (firstPlayerIndex + 1) % table.players.length;
        loopSafety++;
    }
    table.activePlayerIndex = firstPlayerIndex;

    const advance = () => {
        broadcastState(tableId);
        if (table.players[table.activePlayerIndex] && !table.players[table.activePlayerIndex].isHuman) {
          setTimeout(() => botPlay(tableId, table.activePlayerIndex), 1000);
        }
    };

    if (phase === 'preflop') {
        table.phase = 'flop';
        table.communityCards = [deck.pop(), deck.pop(), deck.pop()];
        table.message = "Flop";
        table.logs.push(`--- FLOP: ${table.communityCards.join(', ')} ---`);
        recordAction(table.currentHandId, {type: 'community', phase: 'flop', cards: table.communityCards});
        advance();
    } else if (phase === 'flop') {
        table.phase = 'turn';
        table.communityCards.push(deck.pop());
        table.message = "Turn";
        table.logs.push(`--- TURN: ${table.communityCards.join(', ')} ---`);
        recordAction(table.currentHandId, {type: 'community', phase: 'turn', cards: table.communityCards});
        advance();
    } else if (phase === 'turn') {
        table.phase = 'river';
        table.communityCards.push(deck.pop());
        table.message = "River";
        table.logs.push(`--- RIVER: ${table.communityCards.join(', ')} ---`);
        recordAction(table.currentHandId, {type: 'community', phase: 'river', cards: table.communityCards});
        advance();
    } else if (phase === 'river') {
        table.phase = 'showdown';
        
        const winners = determineWinners(table);
        if (winners.length > 0) {
            let totalPot = table.pot;
            table.players.forEach(p => { if (p) { totalPot += p.currentBet; }});
            
            const winAmount = Math.floor(totalPot / winners.length);
            
            winners.forEach(winner => {
                const p = table.players.find(pl => pl && pl.id === winner.id);
                if (p) {
                  p.chips += winAmount;
                  p.isWinner = true;
                  if (p.isHuman) {
                      const user = users.get(p.userId);
                      if (user) {
                          user.stats.handsWon++;
                      }
                      if(!table.isTournament){
                        updateUserBalance(p.userId, p.chips);
                      }
                  }
                }
            });
            const winnerNames = winners.map(w => w.name).join(', ');
            table.message = `Ganador(es): ${winnerNames}`;
            table.logs.push(`--- SHOWDOWN ---`);
            table.logs.push(`${winnerNames} gana el bote de ${totalPot}`);
            recordAction(table.currentHandId, {type: 'showdown', winners: winnerNames, pot: totalPot});
        } else {
            table.message = "Bote dividido.";
        }
        
        table.players.forEach(p => { if(p) p.currentBet = 0; });
        table.pot=0;

        broadcastState(tableId);
        setTimeout(() => startNewHand(tableId), 5000);
    }
};

const handlePlayerAction = (socketId, action, amount) => {
    let table, playerIndex, tableId;
    for (const [tId, t] of tables.entries()) {
        const pIndex = t.players.findIndex(p => p && p.socketId === socketId);
        if (pIndex !== -1) {
            table = t;
            playerIndex = pIndex;
            tableId = tId;
            break;
        }
    }

    if (!table || playerIndex !== table.activePlayerIndex) return;

    const player = table.players[playerIndex];
    const toCall = table.currentBet - player.currentBet;

    if(table.gameType === 'PLO' && action === 'raise'){
        const maxBet = table.pot + 2 * toCall;
        if(amount > maxBet){
            amount = maxBet;
        }
    }

    if (player.isHuman) {
        const user = users.get(player.userId);
        if (user) {
            if (table.phase === 'preflop') {
                if (action === 'call' || action === 'raise') {
                    user.stats.vpip++;
                }
                if (action === 'raise') {
                    user.stats.pfr++;
                }
            }
        }
    }

    recordAction(table.currentHandId, { type: 'action', player: player.name, action, amount });

    if (action === 'fold') {
        player.hasFolded = true;
        table.logs.push(`${player.name} se retira.`);
    } else if (action === 'call') {
        const actualBet = Math.min(toCall, player.chips);
        player.chips -= actualBet;
        player.currentBet += actualBet;
        if(player.chips === 0) player.isAllIn = true;
        table.logs.push(`${player.name} iguala ${actualBet}.`);
    } else if (action === 'raise') {
        const raiseAmount = amount;
        const totalBet = table.currentBet + raiseAmount;
        const added = totalBet - player.currentBet;
        if (player.chips >= added) {
            player.chips -= added;
            player.currentBet = totalBet;
            if(player.chips === 0) player.isAllIn = true;
            table.currentBet = totalBet;
            table.minRaise = raiseAmount;
            table.logs.push(`${player.name} sube a ${totalBet}.`);
        }
    } else if (action === 'check') {
        table.logs.push(`${player.name} pasa.`);
    }

    const remainingPlayers = table.players.filter(p => p && !p.hasFolded);
    if (remainingPlayers.length === 1) {
        const winner = remainingPlayers[0];
        let totalPot = table.pot;
        table.players.forEach(p => { if(p) totalPot += p.currentBet; });
        winner.chips += totalPot;
        table.pot = 0;
        table.players.forEach(p => { if(p) p.currentBet = 0; });
        
        table.phase = 'showdown';
        table.message = `Ganador: ${winner.name}`;
        table.logs.push(`${winner.name} gana el bote de ${totalPot} por abandono.`);
        broadcastState(tableId);
        setTimeout(() => startNewHand(tableId), 5000);
        return;
    }

    let nextIndex = (playerIndex + 1);
    while(!table.players[nextIndex % table.players.length] || table.players[nextIndex % table.players.length].hasFolded || table.players[nextIndex % table.players.length].isAllIn){
        nextIndex++;
    }
    nextIndex = nextIndex % table.players.length

    
    const allMatched = table.players.filter(p=>p && !p.hasFolded && !p.isAllIn).every(p => p.currentBet === table.currentBet);

    if (allMatched) {
        nextPhase(tableId);
    } else {
        table.activePlayerIndex = nextIndex;
        broadcastState(tableId);
        if (table.players[nextIndex] && !table.players[nextIndex].isHuman) {
            setTimeout(() => botPlay(tableId, nextIndex), 1000);
        }
    }
};

const getHandStrength = (hand, communityCards) => {
    if (!hand || hand.length < 2) return 0;
    const fullHand = Hand.solve(hand.concat(communityCards));
    return fullHand.rank;
};

const botPlay = (tableId, index) => {
    const table = tables.get(tableId);
    if (!table || table.activePlayerIndex !== index) return;
    
    const bot = table.players[index];
    const toCall = table.currentBet - bot.currentBet;
    const handStrength = getHandStrength(bot.hand, table.communityCards);

    if (table.phase === 'preflop') {
        if (handStrength > 0 && Math.random() > 0.3) {
            const raiseAmount = table.bigBlind * 3;
            handlePlayerAction(bot.socketId, 'raise', raiseAmount);
        } 
        else if (toCall > 0) {
            if (handStrength >= 0 && Math.random() > 0.4) {
                 handlePlayerAction(bot.socketId, 'call');
            } else {
                 handlePlayerAction(bot.socketId, 'fold');
            }
        }
        else {
            handlePlayerAction(bot.socketId, 'check');
        }
        return;
    }
    
    const potOdds = toCall / (table.pot + toCall);

    if (handStrength > 2) {
        if (Math.random() > 0.2) {
            const raiseAmount = Math.floor(table.pot * 0.75);
            handlePlayerAction(bot.socketId, 'raise', Math.max(raiseAmount, table.minRaise));
        } else {
            handlePlayerAction(bot.socketId, 'call');
        }
    }
    else if (handStrength > 0) {
        if (toCall > 0) {
            if (potOdds < 0.5 || Math.random() > 0.3) {
                handlePlayerAction(bot.socketId, 'call');
            } else {
                handlePlayerAction(bot.socketId, 'fold');
            }
        } else {
            if (Math.random() > 0.5) {
                const betAmount = Math.floor(table.pot * 0.5);
                handlePlayerAction(bot.socketId, 'raise', betAmount);
            } else {
                handlePlayerAction(bot.socketId, 'check');
            }
        }
    }
    else {
        if (toCall > 0) {
            if (potOdds < 0.1 && Math.random() > 0.2) {
                handlePlayerAction(bot.socketId, 'call');
            } else {
                handlePlayerAction(bot.socketId, 'fold');
            }
        } else {
            handlePlayerAction(bot.socketId, 'check');
        }
    }
};

const startTournament = (tournamentId) => {
    const tournament = tournaments.get(tournamentId);
    if (!tournament || tournament.status !== 'registering') return;

    tournament.status = 'running';
    const numTables = Math.ceil(tournament.players.length / 6);
    tournament.tables = [];

    for(let i=0; i<numTables; i++){
        const tableId = `tourney_${tournamentId}_${i}`;
        const table = createNewTable(tableId, {
            smallBlind: tournament.blindLevels[0].small,
            bigBlind: tournament.blindLevels[0].big,
            isTournament: true,
            tournamentId: tournamentId,
            gameType: tournament.gameType,
        });
        tournament.tables.push(tableId);
    }
    
    tournament.players.forEach((userId, i) => {
        const user = users.get(userId);
        const tableIndex = i % numTables;
        const tableId = tournament.tables[tableIndex];
        const table = tables.get(tableId);
        const seatIndex = table.players.findIndex(p => p === null);

        if (seatIndex !== -1) {
            const newPlayer = {
                id: seatIndex,
                userId: userId,
                socketId: user.socketId,
                name: user.username,
                chips: tournament.startingChips,
                hand: [],
                isHuman: true,
                currentBet: 0,
                hasFolded: false,
                isAllIn: false,
                isWinner: false,
            };
            table.players[seatIndex] = newPlayer;
            const playerSocket = io.sockets.sockets.get(user.socketId);
            if(playerSocket) {
                playerSocket.join(tableId);
                playerSocket.emit('table_change', { tableId });
            }
        }
    });
    
    tournament.tables.forEach(tableId => {
        startNewHand(tableId);
    });

    tournament.blindInterval = setInterval(() => {
        tournament.currentBlindLevel++;
        if (tournament.currentBlindLevel >= tournament.blindLevels.length) {
            clearInterval(tournament.blindInterval);
            return;
        }
        const { small, big } = tournament.blindLevels[tournament.currentBlindLevel];
        tournament.tables.forEach(tableId => {
            const table = tables.get(tableId);
            if(table){
                table.smallBlind = small;
                table.bigBlind = big;
                io.to(tableId).emit('log_message', `Las ciegas han subido a ${small}/${big}`);
            }
        });
    }, tournament.blindLevelDuration);
};

io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);

  socket.on('login', ({ username }) => {
    let userId = [...users.entries()].find(([id, user]) => user.username === username)?.[0];
    
    if (!userId) {
        userId = `user_${Date.now()}`;
        users.set(userId, { 
            username, 
            balance: 1000, 
            socketId: socket.id,
            stats: {
                handsPlayed: 0,
                handsWon: 0,
                vpip: 0,
                pfr: 0,
                handHistories: [],
            },
            friends: [],
            friendRequests: [],
        });
    } else {
        users.get(userId).socketId = socket.id;
    }
    socketIdToUserId.set(socket.id, userId);
    
    socket.emit('logged_in', { userId, ...users.get(userId) });
  });

  socket.on('join_game', (joinData) => {
      const { tableId, smallBlind, bigBlind, gameType } = joinData;
      const userId = socketIdToUserId.get(socket.id);

      if (!userId) return;

      const user = users.get(userId);
      
      socket.join(tableId);

      let table = tables.get(tableId);
      if (!table) {
          table = createNewTable(tableId, { smallBlind, bigBlind, gameType });
      }
      
      const seatIndex = table.players.findIndex(p => p === null);
      if (seatIndex === -1) return;

      const playerChips = Math.min(user.balance, joinData.minBuyIn);
      user.balance -= playerChips;
      io.to(user.socketId).emit('balance_update', user.balance);

      const newPlayer = {
          id: seatIndex,
          userId: userId,
          socketId: socket.id,
          name: user.username,
          chips: playerChips,
          hand: [],
          isHuman: true,
          currentBet: 0,
          hasFolded: false,
          isAllIn: false,
          isWinner: false
      };
      
      table.players[seatIndex] = newPlayer;
      
      const requiredBots = 6 - table.players.filter(p=>p).length;
      for (let i = 0; i < requiredBots; i++) {
          const botId = table.players.length;
          table.players.push({
              id: botId,
              socketId: `bot_${tableId}_${i}`,
              name: `Bot ${i+1}`,
              chips: 1000,
              hand: [],
              isHuman: false,
              currentBet: 0,
              hasFolded: false,
              isAllIn: false,
              isWinner: false,
          });
      }

      if (table.players.filter(p=>p).length >= 2 && table.phase === 'lobby') {
          startNewHand(tableId);
      } else {
          broadcastState(tableId);
      }
  });
  
  socket.on('deposit', ({ amount }) => {
      const userId = socketIdToUserId.get(socket.id);
      if (userId) {
          updateUserBalance(userId, parseFloat(amount));
      }
  });

  socket.on('disconnect', () => {
      console.log('Usuario desconectado:', socket.id);
      const userId = socketIdToUserId.get(socket.id);
      if(userId) {
        const user = users.get(userId);
        if(user && user.friends){
            user.friends.forEach(friendId => {
                const friend = users.get(friendId);
                if(friend && friend.socketId){
                    io.to(friend.socketId).emit('friend_status', { userId, status: 'offline' });
                }
            });
        }

        for (const [tableId, table] of tables.entries()) {
            const playerIndex = table.players.findIndex(p => p && p.userId === userId);
            if (playerIndex !== -1) {
                const player = table.players[playerIndex];
                if(!table.isTournament){
                    updateUserBalance(userId, player.chips);
                }
                table.players[playerIndex] = null;
                
                if (!table.players.some(p => p && p.isHuman)) {
                    tables.delete(tableId);
                } else {
                    broadcastState(tableId);
                }
                break;
            }
        }
        socketIdToUserId.delete(socket.id);
      }
  });

  socket.on('action', ({ tableId, action, amount }) => {
      handlePlayerAction(socket.id, action, amount);
  });
  
  socket.on('chat_message', (msg) => {
    if(msg.tableId) {
        io.to(msg.tableId).emit('chat_message', msg);
    }
  });

  socket.on('restart', ({ tableId }) => {
      startNewHand(tableId);
  });

  socket.on('register_tournament', ({ tournamentId }) => {
        const userId = socketIdToUserId.get(socket.id);
        if (!userId) return;
        
        let tournament = tournaments.get(tournamentId);
        if (!tournament) {
            tournament = {
                id: tournamentId,
                name: "Sit & Go Rápido",
                players: [],
                places: [],
                status: 'registering',
                maxPlayers: 12,
                buyIn: 100,
                startingChips: 1500,
                blindLevels: [
                    { small: 10, big: 20 },
                    { small: 15, big: 30 },
                    { small: 25, big: 50 },
                ],
                prizeStructure: [0.65, 0.35, 0, 0, 0, 0],
                currentBlindLevel: 0,
                blindLevelDuration: 60000,
                gameType: 'NLH'
            };
            tournaments.set(tournamentId, tournament);
        }

        if (tournament.players.includes(userId)) return;

        const user = users.get(userId);
        if (user.balance < tournament.buyIn) {
            socket.emit('error_message', 'No tienes suficiente saldo para registrarte.');
            return;
        }

        user.balance -= tournament.buyIn;
        io.to(user.socketId).emit('balance_update', user.balance);

        tournament.players.push(userId);
        io.emit('tournament_update', tournament);

        if (tournament.players.length === tournament.maxPlayers) {
            startTournament(tournamentId);
        }
    });

    socket.on('leave_tournament', ({ tournamentId }) => {
    });

    socket.on('get_stats', (userId, callback) => {
        const user = users.get(userId);
        if (user) {
            callback(user.stats);
        }
    });

    socket.on('get_hand_history', (handId, callback) => {
        const history = handHistories.get(handId);
        if (history) {
            callback(history);
        }
    });

    socket.on('add_friend', (friendUsername) => {
        const userId = socketIdToUserId.get(socket.id);
        if(!userId) return;

        const friend = [...users.values()].find(u => u.username === friendUsername);
        if(!friend || friend.username === users.get(userId).username) return;

        if(friend.friendRequests.includes(userId)) return;
        if(friend.friends.includes(userId)) return;
        
        friend.friendRequests.push(userId);
        io.to(friend.socketId).emit('friend_request', { userId, username: users.get(userId).username });
    });

    socket.on('accept_friend', (friendId) => {
        const userId = socketIdToUserId.get(socket.id);
        if(!userId) return;

        const user = users.get(userId);
        const friend = users.get(friendId);

        if(!user || !friend) return;

        user.friendRequests = user.friendRequests.filter(id => id !== friendId);
        user.friends.push(friendId);
        friend.friends.push(userId);

        io.to(user.socketId).emit('friend_list', user.friends.map(id => ({userId: id, username: users.get(id).username, status: 'online' })));
        io.to(friend.socketId).emit('friend_list', friend.friends.map(id => ({userId: id, username: users.get(id).username, status: 'online' })));
    });

    socket.on('get_friend_list', (_, callback) => {
        const userId = socketIdToUserId.get(socket.id);
        if(userId){
            const user = users.get(userId);
            if(user){
                callback(user.friends.map(id => ({userId: id, username: users.get(id).username, status: users.get(id).socketId ? 'online' : 'offline' })));
            }
        }
    });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../Frontend/dist/index.html'));
});

server.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));