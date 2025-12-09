import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PokerTable from '@/components/PokerTable'; 
import { socket } from '@/socket';

const TablePage = () => {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const [debugStatus, setDebugStatus] = useState('1. Iniciando componente TablePage...');
  const [showTable, setShowTable] = useState(false);

  const userData = JSON.parse(localStorage.getItem('pokerUser'));

  useEffect(() => {
    const handleReauthenticated = () => {
      setDebugStatus('4. ¡Re-autenticado! Uniéndose a la mesa...');
      socket.emit('join_game', { 
        roomId: tableId, 
        playerName: userData.username,
        buyInAmount: 1000 // Hardcoded for debugging
      });
      // Allow PokerTable to render after attempting to join
      setShowTable(true);
    };

    const handleReauthFailed = () => {
        setDebugStatus('ERROR: Falló la re-autenticación.');
        alert("Falló la re-autenticación. Por favor, inicia sesión de nuevo.");
        window.close();
    };

    if (userData && userData.userId) {
        setDebugStatus('2. Datos de usuario encontrados. Emitiendo reauthenticate...');
        socket.emit('reauthenticate', { userId: userData.userId });
        socket.once('reauthenticated', handleReauthenticated);
        socket.once('reauthentication_failed', handleReauthFailed);
    } else {
        setDebugStatus('ERROR: No se encontraron datos de usuario en localStorage.');
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

  const tableConfig = { id: tableId, name: `Mesa ${tableId}` };

  const handleLeaveTable = () => {
    socket.emit('leave_game');
    window.close();
  };

  return (
    <>
      <div style={{ position: 'absolute', top: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', padding: '10px', zIndex: 9999, fontFamily: 'monospace' }}>
        <p>Estado de Depuración:</p>
        <p>{debugStatus}</p>
      </div>
      {showTable ? (
        <PokerTable tableConfig={tableConfig} user={userData} onLeave={handleLeaveTable} />
      ) : (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
            <p>{debugStatus}</p>
        </div>
      )}
    </>
  );
};

export default TablePage;