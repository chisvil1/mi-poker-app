import React, { useState } from 'react';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        if (username.trim()) {
            onLogin(username);
        }
    };

    return (
        <div className="min-h-screen bg-[#111] text-white flex flex-col items-center justify-center p-4">
            <div className="text-center mb-8">
                <h1 className="text-5xl font-black tracking-tighter">CASH<span className="text-red-600">POKER</span></h1>
                <p className="text-gray-400">Ingresa un nombre de usuario para empezar</p>
            </div>
            <form onSubmit={handleLogin} className="w-full max-w-sm flex gap-2">
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white text-center font-bold outline-none focus:border-red-600"
                    placeholder="Tu Nombre de Héroe"
                />
                <button type="submit" className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg">
                    JUGAR
                </button>
            </form>
        </div>
    );
};

export default Login;
