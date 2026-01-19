import React, { useState } from 'react';
import { DollarSign, Trophy, Users } from 'lucide-react';

const Lobby = ({ onJoinTable, balance, onOpenCashier }) => {
    // This data would typically come from a WebSocket event or an API call
    const [tables, setTables] = useState([
        { id: 101, name: "La Cueva", blinds: "0.50/1.00", type: "NLH", players: 5, maxPlayers: 6, minBuyIn: 50 },
        { id: 102, name: "High Rollers", blinds: "5/10", type: "NLH", players: 3, maxPlayers: 6, minBuyIn: 500 },
        { id: 103, name: "Principiantes", blinds: "0.10/0.25", type: "NLH", players: 6, maxPlayers: 9, minBuyIn: 10 },
        { id: 104, name: "Mesa Rápida", blinds: "1/2", type: "NLH", players: 2, maxPlayers: 6, minBuyIn: 100 },
        { id: 105, name: "All-in Fest", blinds: "10/20", type: "NLH", players: 8, maxPlayers: 9, minBuyIn: 1000 },
    ]);

    return (
        <div className="flex h-full bg-gray-900/50">
            {/* Sidebar */}
            <aside className="w-64 bg-gray-900 border-r border-gray-800 p-4 hidden md:flex flex-col gap-2">
                <h2 className="text-lg font-bold text-white mb-4">Juegos</h2>
                <button className="bg-blue-700 text-white p-3 rounded-lg font-bold flex items-center justify-start gap-3 shadow-md border-b-4 border-blue-900 active:border-b-0 active:translate-y-0.5 transition-all">
                    <DollarSign size={20} /> Cash Games
                </button>
                <button className="text-gray-400 hover:bg-gray-800 p-3 rounded-lg font-bold flex items-center justify-start gap-3 transition-colors">
                    <Trophy size={20} /> Torneos
                </button>
            </aside>
            
            {/* Main Content - Table List */}
            <div className="flex-1 p-6 overflow-y-auto">
                <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-800 overflow-hidden">
                    <table className="w-full text-sm text-left text-gray-400">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-800/50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Nombre de la Mesa</th>
                                <th scope="col" className="px-6 py-3">Tipo</th>
                                <th scope="col" className="px-6 py-3">Ciegas</th>
                                <th scope="col" className="px-6 py-3 text-center">Jugadores</th>
                                <th scope="col" className="px-6 py-3">Buy-in Mínimo</th>
                                <th scope="col" className="px-6 py-3">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tables.map(table => (
                                <tr key={table.id} className="bg-gray-900 border-b border-gray-800 hover:bg-gray-800 transition-colors">
                                    <th scope="row" className="px-6 py-4 font-bold text-white whitespace-nowrap">
                                        {table.name}
                                    </th>
                                    <td className="px-6 py-4">{table.type}</td>
                                    <td className="px-6 py-4">${table.blinds}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <Users size={16} />
                                            <span>{table.players} / {table.maxPlayers}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-green-400">${table.minBuyIn}</td>
                                    <td className="px-6 py-4">
                                        <button 
                                            onClick={() => onJoinTable(table)} 
                                            className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-md shadow-lg active:scale-95 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed"
                                            disabled={table.players >= table.maxPlayers}
                                        >
                                            {table.players >= table.maxPlayers ? 'LLENO' : 'JUGAR'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Lobby;