import React, { useState, useEffect } from 'react';
import { socket } from '../socket';

const AuthScreen = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [serverStatus, setServerStatus] = useState('Conectando...');

    useEffect(() => {
        const onConnect = () => setServerStatus('Conectado 🟢');
        const onDisconnect = () => setServerStatus('Desconectado 🔴');

        if (socket.connected) onConnect();
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
        };
    }, []);

    return (
        <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4 flex-col">
            <div className="bg-[#1a1a1a] w-full max-w-md p-8 rounded-2xl border border-gray-700 shadow-2xl text-center">
                <h1 className="text-3xl font-black text-white mb-2">CASH<span className="text-red-600">POKER</span></h1>
                <div className="flex items-center justify-center gap-2 mb-6 text-xs bg-black/30 p-2 rounded border border-gray-800">
                    <span>Estado Servidor:</span>
                    <span className={`font-bold ${serverStatus.includes('Conectado') ? 'text-green-500' : 'text-red-500'}`}>{serverStatus}</span>
                </div>
                <input 
                    type="text" 
                    placeholder="Elige un nombre de usuario" 
                    className="w-full bg-black border border-gray-600 rounded-lg p-3 text-white mb-4 focus:border-green-500 outline-none"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <button 
                    onClick={() => username && onLogin(username)}
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition"
                >
                    JUGAR AHORA
                </button>
            </div>
        </div>
    );
};

export default AuthScreen;