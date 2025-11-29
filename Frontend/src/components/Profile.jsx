import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import { X } from 'lucide-react';
import HandReplayer from './HandReplayer';

const Profile = ({ userId, onClose }) => {
    const [stats, setStats] = useState(null);
    const [replayingHandId, setReplayingHandId] = useState(null);

    useEffect(() => {
        socket.emit('get_stats', userId, (userStats) => {
            setStats(userStats);
        });
    }, [userId]);

    if (replayingHandId) {
        return <HandReplayer handId={replayingHandId} onClose={() => setReplayingHandId(null)} />;
    }

    if (!stats) {
        return (
            <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center">
                <div className="bg-gray-900 rounded-lg p-8">
                    Cargando perfil...
                </div>
            </div>
        );
    }

    const vpipPercent = stats.handsPlayed > 0 ? ((stats.vpip / stats.handsPlayed) * 100).toFixed(1) : 0;
    const pfrPercent = stats.handsPlayed > 0 ? ((stats.pfr / stats.handsPlayed) * 100).toFixed(1) : 0;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-xl w-full max-w-md border border-gray-700 shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-white font-bold">Perfil de Jugador</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20}/></button>
                </div>
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-full shadow-lg border-2 border-white/10">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`} alt="avatar" className="rounded-full"/>
                        </div>
                        <div>
                            <h3 className="font-bold text-xl">{userId}</h3>
                            <p className="text-sm text-gray-400">Jugador Apasionado</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="bg-black/20 p-3 rounded-lg">
                            <div className="text-xs text-gray-400 uppercase">Manos Jugadas</div>
                            <div className="text-2xl font-bold">{stats.handsPlayed}</div>
                        </div>
                        <div className="bg-black/20 p-3 rounded-lg">
                            <div className="text-xs text-gray-400 uppercase">Manos Ganadas</div>
                            <div className="text-2xl font-bold">{stats.handsWon}</div>
                        </div>
                         <div className="bg-black/20 p-3 rounded-lg">
                            <div className="text-xs text-gray-400 uppercase">VPIP%</div>
                            <div className="text-2xl font-bold">{vpipPercent}%</div>
                        </div>
                         <div className="bg-black/20 p-3 rounded-lg">
                            <div className="text-xs text-gray-400 uppercase">PFR%</div>
                            <div className="text-2xl font-bold">{pfrPercent}%</div>
                        </div>
                    </div>

                    <div className="mt-6">
                        <h4 className="text-white font-bold mb-2">Historial de Manos</h4>
                        <ul className="text-sm text-gray-400 space-y-2 max-h-40 overflow-y-auto">
                            {stats.handHistories && stats.handHistories.map(handId => (
                                <li key={handId} className="flex justify-between items-center bg-black/20 p-2 rounded">
                                    <span>{handId}</span>
                                    <button onClick={() => setReplayingHandId(handId)} className="bg-blue-600 text-white px-2 py-1 rounded text-xs">Repetir</button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;