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

  // Function to handle successful authentication from AuthScreen
  const handleAuthSuccess = (token, userData) => {
    localStorage.setItem('pokerToken', token);
    localStorage.setItem('pokerUser', JSON.stringify(userData)); // Store basic user data
    setUser(userData);
    socket.emit('authenticate', { token }); // Authenticate socket connection
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('pokerToken');
    if (storedToken) {
      socket.emit('authenticate', { token: storedToken }); // Attempt to authenticate socket with stored token
    } else {
      // If no token, ensure user state is cleared
      setUser(null);
      localStorage.removeItem('pokerUser');
    }

    const handleAuthenticated = (userData) => {
      setUser(userData);
      // Update localStorage with full user data if not already present or if new data
      localStorage.setItem('pokerUser', JSON.stringify(userData));
    };

    const handleUnauthorized = () => {
      localStorage.removeItem('pokerToken');
      localStorage.removeItem('pokerUser');
      setUser(null);
    };

    const handleBalanceUpdate = (newBalance) => {
        setUser(prev => {
            if (!prev) return null; // Prevenir error si el usuario se desloguea
            const updatedUser = { ...prev, balance: newBalance };
            localStorage.setItem('pokerUser', JSON.stringify(updatedUser));
            return updatedUser;
        });
    };

    socket.on('authenticated', handleAuthenticated);
    socket.on('unauthorized', handleUnauthorized);
    socket.on('balance_update', handleBalanceUpdate);
    
    return () => {
        socket.off('authenticated', handleAuthenticated);
        socket.off('unauthorized', handleUnauthorized);
        socket.off('balance_update', handleBalanceUpdate);
    };
  }, []); 

  // handleLogin is removed, as AuthScreen now handles its own login/register via API calls

  const handleDeposit = async (amount, currency) => {
      if(!user || !user.id) { // Ensure user is logged in and has an ID
        alert('Debes iniciar sesión para realizar depósitos.');
        return;
      }
      
      try {
        const response = await fetch('/api/create_payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('pokerToken')}` // Send auth token
          },
          body: JSON.stringify({ amount: parseFloat(amount), currency, userId: user.id })
        });

        const data = await response.json();

        if (response.ok) {
          if (data.pay_url) {
            window.open(data.pay_url, '_blank'); // Open payment URL
          } else {
            alert('Pago creado, pero no se recibió URL de pago. Consulta la consola.');
            console.warn('NowPayments response:', data);
          }
        } else {
          alert(`Error al crear el pago: ${data.error || 'Error desconocido'}`);
        }
      } catch (error) {
        alert('Error de red al intentar crear el pago.');
        console.error('Deposit fetch error:', error);
      }
  };

  const handleLogout = () => {
    localStorage.removeItem('pokerToken');
    localStorage.removeItem('pokerUser');
    setUser(null);
    // Disconnect socket to clean up server-side resources and then reconnect for the next user
    if (socket.connected) {
      socket.disconnect();
    }
    socket.connect();
  };

  const handleJoinTable = (tableConfig) => {
      const windowFeatures = 'menubar=no,location=no,resizable=yes,scrollbars=yes,status=no,width=1000,height=750';
      window.open(`/table/${tableConfig.id}`, '_blank', windowFeatures);
  };

  if (!user) return <AuthScreen onAuthSuccess={handleAuthSuccess} />;

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
                <button onClick={handleLogout} className="text-gray-400 hover:text-white text-sm font-bold uppercase">
                    CERRAR SESIÓN
                </button>
            </div>
        </header>

        <div className="flex-1 overflow-hidden">
            <Lobby onJoinTable={handleJoinTable} balance={user.balance} onOpenCashier={()=>setShowCashier(true)} />
        </div>
    </div>
  );
};

export default LobbyPage;