import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';

const GameChat = ({ chatMessages, onSendMessage, gameLogs }) => {
    const [message, setMessage] = useState('');
    const [activeTab, setActiveTab] = useState('chat'); 
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages, gameLogs, activeTab]);

    const handleSend = (e) => {
        e.preventDefault();
        if (message.trim()) {
            onSendMessage(message);
            setMessage('');
        }
    };

    return (
        <div className="bg-gray-900 border-l border-gray-800 w-full h-full flex flex-col text-xs md:text-sm">
            <div className="flex border-b border-gray-800">
                <button onClick={()=>setActiveTab('chat')} className={`flex-1 py-2 font-bold ${activeTab==='chat'?'text-white border-b-2 border-red-600':'text-gray-500'}`}>Chat</button>
                <button onClick={()=>setActiveTab('log')} className={`flex-1 py-2 font-bold ${activeTab==='log'?'text-white border-b-2 border-red-600':'text-gray-500'}`}>Historial</button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {activeTab === 'chat' ? (
                    chatMessages.length > 0 ? chatMessages.map((msg, i) => (
                        <div key={i} className="break-words">
                            <span className="font-bold text-gray-400">{msg.player}: </span>
                            <span className="text-gray-200">{msg.text}</span>
                        </div>
                    )) : <div className="text-gray-600 text-center mt-4">¡Saluda a la mesa!</div>
                ) : (
                    gameLogs.map((log, i) => (
                        <div key={i} className="text-gray-400 border-b border-gray-800/50 pb-1 mb-1 last:border-0">
                            {log}
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>
            {activeTab === 'chat' && (
                <form onSubmit={handleSend} className="p-2 border-t border-gray-800 flex gap-2">
                    <input type="text" value={message} onChange={(e)=>setMessage(e.target.value)} placeholder="Escribe..." className="flex-1 bg-black border border-gray-700 rounded px-2 py-1 text-white outline-none"/>
                    <button type="submit" className="bg-red-600 text-white p-1 rounded"><Send size={16}/></button>
                </form>
            )}
        </div>
    );
};

export default GameChat;