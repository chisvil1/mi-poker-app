import React, { useState, useEffect } from 'react';
import { socket } from '@/socket';
import { LogIn, UserPlus } from 'lucide-react';

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
                const serverError = JSON.stringify(data);
                console.error('Server Auth Error:', serverError);
                setError(`Error del servidor: ${data.error || serverError}`);
            }
        } catch (err) {
            console.error('Network/fetch error:', err);
            setError(`Error de Conexión: ${err.message}. Asegúrate de que el servidor backend está funcionando.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div 
            className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1549488344-f187a54911d3?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')" }}
        >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div> {/* Dark overlay with blur */}

            <div className="relative bg-gray-900/80 backdrop-blur-lg w-full max-w-md p-8 rounded-2xl border border-gray-700 shadow-2xl text-center z-10">
                <h1 className="text-4xl font-black text-white mb-6 flex items-center justify-center gap-2">
                    <span className="text-red-600">CASH</span>POKER <span className="text-2xl text-yellow-400">♦️</span>
                </h1>
                
                <div className="flex items-center justify-center gap-2 mb-6 text-xs bg-gray-800/50 p-2 rounded-lg border border-gray-700">
                    <span>Estado del Servidor:</span>
                    <span className={`font-bold ${serverStatus.includes('Conectado') ? 'text-green-500' : 'text-red-500'}`}>{serverStatus}</span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {isRegister && (
                        <input
                            type="text"
                            placeholder="Nombre de usuario"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors placeholder-gray-500"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    )}
                    <input
                        type="email"
                        placeholder="Email"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors placeholder-gray-500"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Contraseña"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors placeholder-gray-500"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    {error && <p className="text-red-400 text-sm mt-3 bg-red-900/20 p-2 rounded border border-red-700">{error}</p>}
                    <button
                        type="submit"
                        className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide shadow-lg active:translate-y-0.5 active:shadow-md flex items-center justify-center gap-2 mt-6"
                        disabled={loading}
                    >
                        {loading ? 'Cargando...' : isRegister ? <><UserPlus size={20}/> REGISTRARME</> : <><LogIn size={20}/> INICIAR SESIÓN</>}
                    </button>
                </form>

                <button
                    onClick={() => setIsRegister(!isRegister)}
                    className="mt-6 text-sm text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                    {isRegister ? '¿Ya tienes cuenta? Inicia sesión.' : '¿No tienes cuenta? Regístrate.'}
                </button>
            </div>
        </div>
    );
};

export default AuthScreen;
