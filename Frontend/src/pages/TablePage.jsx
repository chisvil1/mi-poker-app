import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PokerTable from '@/components/PokerTable'; 
import { socket } from '@/socket';

const TablePage = () => {
  const [debugStatus, setDebugStatus] = useState('1. Iniciando componente TablePage...');
  const [showTable, setShowTable] = useState(false);
  const [debugLog, setDebugLog] = useState([]); // Estado para los logs en pantalla
  const hasJoined = useRef(false);

  // Función para añadir logs al estado y verlos en pantalla
  const logToPage = (message) => {
    setDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  logToPage('Component RENDER');

  const { tableId } = useParams();
  const navigate = useNavigate();
  const userData = JSON.parse(localStorage.getItem('pokerUser'));

  useEffect(() => {
    logToPage('useEffect RUN');
    
    const handleReauthenticated = () => {
      logToPage(`handleReauthenticated TRIGGERED. hasJoined.current: ${hasJoined.current}`);
      if (!hasJoined.current) {
        hasJoined.current = true;
        logToPage('EMITTING join_game');
        setDebugStatus('4. ¡Re-autenticado! Uniéndose a la mesa...');
        socket.emit('join_game', { 
          roomId: tableId, 
          playerName: userData.username,
          buyInAmount: 1000
        });
        setShowTable(true);
      } else {
        logToPage('NOT EMITTING join_game because hasJoined.current is true');
      }
    };

    const handleReauthFailed = () => {
        logToPage('handleReauthFailed TRIGGERED');
        setDebugStatus('ERROR: Falló la re-autenticación.');
        alert("Falló la re-autenticación. Por favor, inicia sesión de nuevo.");
        window.close();
    };

    if (userData && userData.userId) {
        logToPage('useEffect: User data found. Emitting reauthenticate.');
        setDebugStatus('2. Datos de usuario encontrados. Emitiendo reauthenticate...');
        socket.emit('reauthenticate', { userId: userData.userId });
        socket.once('reauthenticated', handleReauthenticated);
        socket.once('reauthentication_failed', handleReauthFailed);
    } else {
        logToPage('useEffect: No user data found.');
        setDebugStatus('ERROR: No se encontraron datos de usuario en localStorage.');
    }

    return () => {
        logToPage('useEffect CLEANUP');
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
      <div style={{ position: 'absolute', top: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.8)', color: 'white', padding: '10px', zIndex: 9999, fontFamily: 'monospace', fontSize: '10px' }}>
        <p>Estado de Depuración:</p>
        <p>{debugStatus}</p>
        <hr style={{margin: '10px 0'}} />
        <p>Log en Pantalla:</p>
        <div style={{height: '200px', overflowY: 'scroll'}}>
          {debugLog.map((log, i) => <p key={i}>{log}</p>)}
        </div>
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