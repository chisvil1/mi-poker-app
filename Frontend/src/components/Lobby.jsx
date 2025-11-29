import React, { useState, useEffect } from 'react';
import { DollarSign, Trophy, LogOut, Plus, Filter, RefreshCw, Users, Users2 } from 'lucide-react';
import CreateTableModal from './CreateTableModal';
import FriendsList from './FriendsList';
import { socket } from '../socket';

const Lobby = ({ onJoinTable, balance, onOpenCashier }) => {
    const [tab, setTab] = useState('cash');
    const [showCreate, setShowCreate] = useState(false);
    const [showFriends, setShowFriends] = useState(false);
    const [tables, setTables] = useState([
        { id: 101, name: "La Cueva", blinds: "0.50/1.00", type: "NLH", players: 5, max: 6, minBuyIn: 50, smallBlind: 0.5, bigBlind: 1 },
        { id: 102, name: "High Rollers", blinds: "5/10", type: "PLO", players: 3, max: 6, minBuyIn: 500, smallBlind: 5, bigBlind: 10 },
    ]);
    const [tournaments, setTournaments] = useState([
        { id: 201, name: "Sunday Million", buyIn: 109, prize: "1M Gtd", status: "Reg Tardío", players: [], enrolled: 4500, maxPlayers: 9999, gameType: 'NLH' },
        { id: 'sitngo_1', name: "Sit & Go Rápido", buyIn: 100, prize: "500", status: "Registrando", players: [], enrolled: 0, maxPlayers: 6, gameType: 'NLH' },
    ]);

    useEffect(() => {
        const handleTournamentUpdate = (updatedTournament) => {
            setTournaments(prev => prev.map(t => t.id === updatedTournament.id ? { ...t, ...updatedTournament, enrolled: updatedTournament.players.length } : t));
        };
        socket.on('tournament_update', handleTournamentUpdate);
        return () => {
            socket.off('tournament_update', handleTournamentUpdate);
        };
    }, []);

    const handleCreateTable = (newTableData) => {
        const [sb, bb] = newTableData.blinds.split('/').map(parseFloat);
        const newTable = {
            id: Date.now(),
            name: newTableData.name || "Mesa Privada",
            blinds: newTableData.blinds,
            type: newTableData.gameType,
            players: 1,
            max: 6,
            minBuyIn: Number(newTableData.minBuyIn),
            smallBlind: sb,
            bigBlind: bb,
            gameType: newTableData.gameType,
        };
        setTables([...tables, newTable]);
        setShowCreate(false);
        onJoinTable(newTable);
    };

    const handleRegister = (e, tournamentId) => {
        e.stopPropagation(); // Prevent row click
        socket.emit('register_tournament', { tournamentId });
    };

    const list = tab === 'cash' ? tables : tournaments;

    return (
        <div className="flex h-[calc(100vh-64px)]">
            {showCreate && <CreateTableModal onClose={()=>setShowCreate(false)} onCreate={handleCreateTable} />}
            {showFriends && <FriendsList onClose={() => setShowFriends(false)} />}

            <aside className="w-20 md:w-64 bg-base-200 border-r border-base-300 flex flex-col py-6">
                <nav className="space-y-2 px-2">
                    <button onClick={() => setTab('cash')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition ${tab==='cash' ? 'bg-primary text-black shadow-lg' : 'text-gray-400 hover:bg-base-300'}`}>
                        <DollarSign className="w-6 h-6"/> <span className="hidden md:inline font-bold">Cash Games</span>
                    </button>
                    <button onClick={() => setTab('tourney')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition ${tab==='tourney' ? 'bg-primary text-black shadow-lg' : 'text-gray-400 hover:bg-base-300'}`}>
                        <Trophy className="w-6 h-6"/> <span className="hidden md:inline font-bold">Torneos</span>
                    </button>
                    <button onClick={() => setShowFriends(true)} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition text-gray-400 hover:bg-base-300'}`}>
                        <Users2 className="w-6 h-6"/> <span className="hidden md:inline font-bold">Amigos</span>
                    </button>
                </nav>
                <div className="mt-auto px-4">
                    <button className="flex items-center gap-3 text-gray-500 hover:text-white transition text-sm font-bold">
                        <LogOut className="w-5 h-5"/> <span className="hidden md:inline">Salir</span>
                    </button>
                </div>
            </aside>

            <main className="flex-1 bg-base-100 p-6 overflow-y-auto">
                <header className="flex justify-between items-end mb-8">
                    <div>
                        <h2 className="text-3xl font-black text-white mb-1">{tab === 'cash' ? 'Mesas de Cash' : 'Torneos'}</h2>
                        <p className="text-gray-500 text-sm">Selecciona una mesa para empezar a jugar</p>
                    </div>
                    <div className="flex gap-3">
                        {tab === 'cash' && (
                            <button onClick={()=>setShowCreate(true)} className="bg-accent hover:bg-accent/80 text-white flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg font-bold transition">
                                <Plus className="w-5 h-5"/> Crear Mesa
                            </button>
                        )}
                        <button className="bg-base-300 hover:bg-base-200 text-white p-2 rounded-lg border border-base-100"><Filter className="w-5 h-5"/></button>
                        <button className="bg-base-300 hover:bg-base-200 text-white p-2 rounded-lg border border-base-100"><RefreshCw className="w-5 h-5"/></button>
                    </div>
                </header>

                <div className="bg-base-200 rounded-xl border border-base-300 overflow-hidden shadow-2xl">
                    <table className="w-full text-left">
                        <thead className="bg-base-300 text-gray-400 text-xs uppercase font-bold">
                            <tr>
                                <th className="p-4 pl-6">Nombre</th>
                                <th className="p-4">{tab==='cash'?'Ciegas':'Buy-in'}</th>
                                <th className="p-4 hidden md:table-cell">Tipo</th>
                                <th className="p-4">Jugadores</th>
                                <th className="p-4 text-right pr-6"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-base-300">
                            {list.map((item) => (
                                <tr key={item.id} className="hover:bg-base-300 transition group cursor-pointer" onClick={() => tab === 'cash' && onJoinTable(item)}>
                                    <td className="p-4 pl-6 font-bold text-white">{item.name}</td>
                                    <td className="p-4 text-green-400 font-mono font-bold">
                                        {tab === 'cash' ? `$${item.blinds}` : `$${item.buyIn}`}
                                    </td>
                                    <td className="p-4 text-gray-400 text-sm hidden md:table-cell">
                                        {item.type}
                                    </td>
                                    <td className="p-4 text-gray-300 text-sm">
                                        <Users className="w-3 h-3 inline mr-1"/> 
                                        {tab === 'cash' ? `${item.players}/${item.max}` : `${item.enrolled}/${item.maxPlayers}`}
                                    </td>
                                    <td className="p-4 text-right pr-6">
                                        {tab === 'cash' ? (
                                            <button className="bg-primary hover:bg-primary/80 text-black text-xs font-bold px-6 py-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                JUGAR
                                            </button>
                                        ) : (
                                            <button onClick={(e) => handleRegister(e, item.id)} disabled={item.status !== 'Registrando'} 
                                                className="bg-secondary hover:bg-secondary/80 text-white text-xs font-bold px-6 py-2 rounded-full shadow-lg disabled:bg-gray-600 disabled:cursor-not-allowed">
                                                {item.status === 'Registrando' ? 'REGISTRAR' : item.status.toUpperCase()}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
};

export default Lobby;