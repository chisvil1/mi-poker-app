import React, { useState, useEffect } from 'react';
import { socket } from '@/socket';

const AuthScreen = ({ onAuthSuccess }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [serverStatus, setServerStatus] = useState('Conectando...');
    const [loading, setLoading] = useState(false);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const url = `/api/auth/${isRegister ? 'register' : 'login'}`;
        const body = isRegister ? { username, email, password } : { email, password };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (response.ok) {
                onAuthSuccess(data.token, data.token ? data.data : data); // Pass token and user data
            } else {
                setError(data.error || data.msg || 'Error de autenticación.');
            }
        } catch (err) {
            setError('Error de red o del servidor.');
            console.error('Auth fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4 flex-col">
            <div className="bg-[#1a1a1a] w-full max-w-md p-8 rounded-2xl border border-gray-700 shadow-2xl text-center">
                <h1 className="text-3xl font-black text-white mb-2">CASH<span className="text-red-600">POKER</span></h1>
                <div className="flex items-center justify-center gap-2 mb-6 text-xs bg-black/30 p-2 rounded border border-gray-800">
                    <span>Estado Servidor:</span>
                    <span className={`font-bold ${serverStatus.includes('Conectado') ? 'text-green-500' : 'text-red-500'}`}>{serverStatus}</span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {isRegister && (
                        <input
                            type="text"
                            placeholder="Nombre de usuario"
                            className="w-full bg-black border border-gray-600 rounded-lg p-3 text-white focus:border-green-500 outline-none"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    )}
                    <input
                        type="email"
                        placeholder="Email"
                        className="w-full bg-black border border-gray-600 rounded-lg p-3 text-white focus:border-green-500 outline-none"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Contraseña"
                        className="w-full bg-black border border-gray-600 rounded-lg p-3 text-white focus:border-green-500 outline-none"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    <button
                        type="submit"
                        className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? 'Cargando...' : isRegister ? 'REGISTRARME' : 'INICIAR SESIÓN'}
                    </button>
                </form>

                <button
                    onClick={() => setIsRegister(!isRegister)}
                    className="mt-4 text-sm text-gray-400 hover:text-white transition"
                >
                    {isRegister ? '¿Ya tienes cuenta? Inicia sesión.' : '¿No tienes cuenta? Regístrate.'}
                </button>
            </div>
        </div>
    );
};

export default AuthScreen;
