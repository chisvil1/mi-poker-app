import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LobbyPage from './pages/LobbyPage.jsx';
import TablePage from './pages/TablePage.jsx';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LobbyPage />} />
      <Route path="/table/:tableId" element={<TablePage />} />
    </Routes>
  );
}

export default App;