import React, { useState, useEffect } from 'react';
import { DollarSign } from 'lucide-react'; 
import { socket } from '@/socket'; // Use shared socket
import Lobby from '@/components/Lobby'; 
import AuthScreen from '@/components/AuthScreen'; 
import Cashier from '@/components/Cashier'; 
import { useNavigate } from 'react-router-dom'; 

const LobbyPage = () => {
  const [user, setUser] = useState(null);
  const [showCashier, setShowCashier] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('pokerUser');
    if (storedUser) {
      const user_data = JSON.parse(storedUser);
      setUser(user_data);
      // Re-autenticar la sesión del socket al cargar la página
      socket.emit('reauthenticate', { userId: user_data.userId });
    }

    const handleLoggedIn = (userData) => {
        setUser(userData);
        localStorage.setItem('pokerUser', JSON.stringify(userData)); 
    };

    const handleBalanceUpdate = (newBalance) => {
        setUser(prev => {
            if (!prev) return null; // Prevenir error si el usuario se desloguea
            const updatedUser = { ...prev, balance: newBalance };
            localStorage.setItem('pokerUser', JSON.stringify(updatedUser));
            return updatedUser;
        });
    };

    socket.on('logged_in', handleLoggedIn);
    socket.on('balance_update', handleBalanceUpdate);
    
    return () => {
        socket.off('logged_in', handleLoggedIn);
        socket.off('balance_update', handleBalanceUpdate);
    };
  }, []); 

  const handleLogin = (username) => {
      socket.emit('login', { username }); 
  };

  const handleDeposit = (amount, currency) => {
      if(user){
        socket.emit('deposit', { amount, userId: user.userId });
        alert(`Generando dirección de depósito para ${amount} USD en ${currency} (Conectando a pasarela...)`);
      }
  };

  const handleJoinTable = (tableConfig) => {
      const windowFeatures = 'menubar=no,location=no,resizable=yes,scrollbars=yes,status=no,width=1000,height=750';
      window.open(`/table/${tableConfig.id}`, '_blank', windowFeatures);
  };

  if (!user) return <AuthScreen onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-gray-200 font-sans flex flex-col overflow-hidden">
        {showCashier && <Cashier onClose={()=>setShowCashier(false)} onDeposit={handleDeposit} />}
        
        <header className="h-16 bg-[#0f0f0f] border-b border-[#333] flex items-center justify-between px-6 z-50 relative">
            <div className="flex items-center gap-2 select-none">
                <span className="text-2xl">♠️</span>
                <span className="text-2xl font-black text-white tracking-tighter">CASH<span className="text-red-600">POKER</span></span>
            </div>
            <div className="flex items-center gap-4">
                <div className="bg-[#222] rounded-full pl-4 pr-1 py-1 border border-[#444] flex items-center gap-3">
                    <span className="text-green-400 font-mono text-sm">${user.balance ? user.balance.toFixed(2) : '0.00'}</span>
                    <button onClick={()=>setShowCashier(true)} className="bg-green-600 hover:bg-green-500 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold transition">+</button>
                </div>
                <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-full shadow-lg border border-white/10 flex items-center justify-center text-white font-bold">
                    {user.username.substring(0, 2).toUpperCase()}
                </div>
            </div>
        </header>

        <div className="flex-1 overflow-hidden">
            <Lobby onJoinTable={handleJoinTable} balance={user.balance} onOpenCashier={()=>setShowCashier(true)} />
        </div>
    </div>
  );
};

export default LobbyPage;