import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LobbyPage from './pages/LobbyPage';
import TablePage from './pages/TablePage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LobbyPage />} />
      <Route path="/table/:tableId" element={<TablePage />} />
    </Routes>
  );
}

export default App;