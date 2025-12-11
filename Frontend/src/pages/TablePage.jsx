import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PokerTable from '@/components/PokerTable'; 
import { socket } from '@/socket';
import { playSound } from '@/utils/playSound';

const TablePage = () => {
  const { tableId } = useParams();
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [status, setStatus] = useState('Autenticando...');

  useEffect(() => {
    const token = localStorage.getItem('pokerToken');
    if (!token) {
      setStatus('Error: No estás autenticado.');
      alert('No estás autenticado. Por favor, inicia sesión desde el lobby.');
      window.close();
      return;
    }

    const handleAuthenticated = (authenticatedUser) => {
      setStatus('Autenticado. Uniéndote a la mesa...');
      setUser(authenticatedUser);
      socket.emit('join_game', { 
        roomId: tableId, 
        buyInAmount: 1000 
      });
    };

    const handleUnauthorized = () => {
      setStatus('Error: Autenticación fallida.');
      alert('Tu sesión ha expirado o no es válida.');
      window.close();
    };

    const handleErrorJoining = (error) => {
      setStatus(`Error: ${error.message}`);
      alert(`No se pudo unir a la mesa: ${error.message}`);
      window.close();
    };
    
    const handleGameUpdate = (newGameState) => {
        if (!gameState) setStatus('Conectado a la mesa.'); // First game state received
        setGameState(newGameState);
        if (newGameState.pot > (gameState?.pot || 0)) playSound('bet'); 
    };

    const handleChatMessage = (msg) => {
        setChatMessages(prev => [...prev, msg]);
        playSound('message');
    };

    socket.on('authenticated', handleAuthenticated);
    socket.on('unauthorized', handleUnauthorized);
    socket.on('error_joining', handleErrorJoining);
    socket.on('game_update', handleGameUpdate);
    socket.on('chat_message', handleChatMessage);

    if (socket.disconnected) socket.connect();
    socket.emit('authenticate', { token });

    return () => {
      socket.off('authenticated', handleAuthenticated);
      socket.off('unauthorized', handleUnauthorized);
      socket.off('error_joining', handleErrorJoining);
      socket.off('game_update', handleGameUpdate);
      socket.off('chat_message', handleChatMessage);
    };
  }, [tableId]);

  // Action Handlers to be passed to PokerTable
  const handleLeaveTable = () => {
    socket.emit('leave_game');
    window.close();
  };

  const handleAction = (action, amount = 0) => {
    socket.emit('action', { action, amount });
  };

  const handleSendMessage = (text, roomId) => {
    if(user) socket.emit('chat_message', { player: user.username, text, roomId });
  };

  const handleRestart = (roomId) => {
    socket.emit('restart', { roomId });
  };
  
  if (!gameState || !user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <p>{status}</p>
      </div>
    );
  }
  
  return (
    <PokerTable 
      gameState={gameState} 
      user={user} 
      chatMessages={chatMessages}
      onLeave={handleLeaveTable} 
      onAction={handleAction}
      onSendMessage={handleSendMessage}
      onRestart={handleRestart}
    />
  );
};

export default TablePage;