import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PokerTable from '@/components/PokerTable'; 
import { socket } from '@/socket';

const TablePage = () => {
  const { tableId } = useParams();
  const navigate = useNavigate();

  const userData = JSON.parse(localStorage.getItem('pokerUser'));

  useEffect(() => {
    const handleReauthenticated = () => {
      console.log('Re-autenticación exitosa, uniéndose a la mesa...');
      socket.emit('join_game', { 
        roomId: tableId, 
        playerName: userData.username 
      });
    };

    const handleReauthFailed = () => {
        alert("Falló la re-autenticación. Por favor, inicia sesión de nuevo.");
        window.close();
    };

    if (userData && userData.userId) {
        socket.emit('reauthenticate', { userId: userData.userId });
        socket.once('reauthenticated', handleReauthenticated);
        socket.once('reauthentication_failed', handleReauthFailed);
    }

    return () => {
        socket.off('reauthenticated', handleReauthenticated);
        socket.off('reauthentication_failed', handleReauthFailed);
    };

  }, [tableId, userData?.userId, userData?.username]);


  if (!userData || !tableId) {
    if (window.opener) { 
        alert("Información de usuario o mesa perdida. Por favor, vuelve al lobby principal.");
        window.close();
    } else { 
        navigate('/');
    }
    return null; 
  }

  const tableConfig = { id: parseInt(tableId), name: `Mesa ${tableId}` };

  const handleLeaveTable = () => {
    socket.emit('leave_game');
    window.close();
  };

  return (
    <PokerTable tableConfig={tableConfig} user={userData} onLeave={handleLeaveTable} />
  );
};

export default TablePage;