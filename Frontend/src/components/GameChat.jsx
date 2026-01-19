import React, { useState, useEffect, useRef } from 'react';
import { Send, History } from 'lucide-react';

const GameChat = ({ chatMessages, onSendMessage, gameLogs, userId }) => {
    const [message, setMessage] = useState('');
    const [activeTab, setActiveTab] = useState('chat');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages, gameLogs, activeTab]);

    const handleSend = (e) => {
        e.preventDefault();
        if (message.trim()) {
            onSendMessage(message); // Corrected: Pass only the message
            setMessage('');
        }
    };

    const renderChatMessage = (msg, i) => {
        const isMe = msg.userId === userId;
        return (
            <div key={i} className={`flex flex-col items-start rounded-lg px-3 py-2 max-w-[80%] ${isMe ? 'bg-blue-800 self-end' : 'bg-gray-700 self-start'}`}>
                {!isMe && <div className="font-bold text-xs text-cyan-400">{msg.player}</div>}
                <p className="text-white break-words">{msg.text}</p>
                <div className="text-gray-400 text-[10px] self-end mt-1">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
        );
    };

    return (
        <div className="bg-gray-900 border-l border-gray-800 w-full h-full flex flex-col text-sm">
            <div className="flex border-b border-gray-800 bg-gray-900/50">
                <button onClick={() => setActiveTab('chat')} className={`flex-1 py-3 font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'chat' ? 'text-white border-b-2 border-blue-500 bg-gray-800' : 'text-gray-500 hover:text-white'}`}>
                    <Send size={16} /> Chat
                </button>
                <button onClick={() => setActiveTab('log')} className={`flex-1 py-3 font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'log' ? 'text-white border-b-2 border-blue-500 bg-gray-800' : 'text-gray-500 hover:text-white'}`}>
                    <History size={16} /> Historial
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                {activeTab === 'chat' ? (
                    chatMessages.length > 0 ? chatMessages.map(renderChatMessage) : <div className="text-gray-600 text-center mt-4">Di hola para empezar a chatear.</div>
                ) : (
                    gameLogs.map((log, i) => (
                        <div key={i} className="text-gray-400 text-xs italic border-l-2 border-gray-700 pl-3">{log}</div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>
            {activeTab === 'chat' && (
                <form onSubmit={handleSend} className="p-3 border-t border-gray-800 flex gap-3 bg-gray-900/50">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-full px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                    <button type="submit" className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-blue-500 active:scale-90 transition-all shadow-lg">
                        <Send size={20} />
                    </button>
                </form>
            )}
        </div>
    );
};

export default GameChat;