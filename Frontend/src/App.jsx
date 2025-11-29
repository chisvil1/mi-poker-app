import React, { useState, useEffect } from 'react';
import { socket } from './socket';
import Login from './components/Login';
import Lobby from './components/Lobby';
import PokerTable from './components/PokerTable';
import Cashier from './components/Cashier';
import TournamentEndModal from './components/TournamentEndModal';

const App = () => {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('lobby');
  const [activeTable, setActiveTable] = useState(null);
  const [showCashier, setShowCashier] = useState(false);
  const [tournamentResults, setTournamentResults] = useState(null);

  useEffect(() => {
    const handleLoggedIn = (userData) => {
      setUser(userData);
    };
    const handleBalanceUpdate = (newBalance) => {
        setUser(prevUser => ({ ...prevUser, balance: newBalance }));
    };
    const handleTournamentStarted = ({ tableId }) => {
        const newTable = { id: tableId, name: "Torneo", isTournament: true, smallBlind: 10, bigBlind: 20, minBuyIn: 0 };
        setActiveTable(newTable);
        setView('table');
    };
    const handleTournamentFinished = (results) => {
        setTournamentResults(results);
        setView('lobby');
    };

    const handleTableChange = ({ tableId }) => {
        setActiveTable(prev => ({...prev, id: tableId}));
    };

    socket.on('logged_in', handleLoggedIn);
    socket.on('balance_update', handleBalanceUpdate);
    socket.on('tournament_started', handleTournamentStarted);
    socket.on('tournament_finished', handleTournamentFinished);
    socket.on('table_change', handleTableChange);

    return () => {
      socket.off('logged_in', handleLoggedIn);
      socket.off('balance_update', handleBalanceUpdate);
      socket.off('tournament_started', handleTournamentStarted);
      socket.off('tournament_finished', handleTournamentFinished);
      socket.off('table_change', handleTableChange);
    };
  }, []);
  
  const handleLogin = (username) => {
      socket.emit('login', { username });
  };
  
  const handleDeposit = (amount) => {
      socket.emit('deposit', { amount });
  };

  const handleJoinTable = (table) => {
      if (user.balance >= table.minBuyIn) {
        setActiveTable(table);
        setView('table');
      } else {
        alert("No tienes suficiente saldo para unirte a esta mesa.");
      }
  };
  
  const closeTournamentEndModal = () => {
      setTournamentResults(null);
  }

  if (!user) {
      return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-base-100 text-gray-200 font-sans">
        {showCashier && <Cashier onClose={()=>setShowCashier(false)} onDeposit={handleDeposit} />}
        {tournamentResults && <TournamentEndModal results={tournamentResults.results} onClose={closeTournamentEndModal} />}
        
        {view === 'lobby' && (
            <header className="h-16 bg-base-200 border-b border-base-300 flex items-center justify-between px-6 z-50 relative">
                <div className="flex items-center gap-2 select-none">
                    <span className="text-2xl text-primary">♠️</span>
                    <span className="text-2xl font-black text-white tracking-tighter">CASH<span className="text-primary">POKER</span></span>
                </div>
                 <div className="text-center">
                    <div className="text-white font-bold">{user.username}</div>
                    <div className="text-xs text-gray-500">Bienvenido</div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-base-300 rounded-full pl-4 pr-1 py-1 border border-base-100 flex items-center gap-3">
                        <span className="text-green-400 font-mono font-bold tracking-wide">${user.balance.toFixed(2)}</span>
                        <button onClick={()=>setShowCashier(true)} className="bg-accent hover:bg-accent/80 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold transition">+</button>
                    </div>
                    <div className="w-10 h-10 bg-gradient-to-tr from-secondary to-primary rounded-full shadow-lg border border-white/10">
                         <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt="avatar" className="rounded-full"/>
                    </div>
                </div>
            </header>
        )}

        {view === 'lobby' 
            ? <Lobby onJoinTable={handleJoinTable} balance={user.balance} onOpenCashier={() => setShowCashier(true)} />
            : <PokerTable tableConfig={activeTable} user={user} onLeave={() => setView('lobby')} />
        }
    </div>
  );
};

export default App;
