import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PokerTable from '@/components/PokerTable'; 

const TablePage = () => {
  const { tableId } = useParams();
  const navigate = useNavigate();

  const userData = JSON.parse(localStorage.getItem('pokerUser'));

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
    window.close();
  };

  return (
    <PokerTable tableConfig={tableConfig} user={userData} onLeave={handleLeaveTable} />
  );
};

export default TablePage;