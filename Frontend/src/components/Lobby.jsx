import React, { useState } from 'react';
import { DollarSign, Trophy } from 'lucide-react';

const Lobby = ({ onJoinTable, balance, onOpenCashier }) => {
    const [tables, setTables] = useState([
        { id: 101, name: "La Cueva", blinds: "0.50/1.00", type: "NLH", players: 5, max: 6, minBuyIn: 50 },
        { id: 102, name: "High Rollers", blinds: "5/10", type: "NLH", players: 3, max: 6, minBuyIn: 500 },
        { id: 103, name: "Principiantes", blinds: "0.10/0.25", type: "NLH", players: 6, max: 9, minBuyIn: 10 },
    ]);

    return (
        <div className="flex h-full bg-[#1a1a1a]">
            <aside className="w-64 bg-[#0f0f0f] border-r border-[#333] p-4 hidden md:flex flex-col gap-2">
                <button className="bg-red-600 text-white p-3 rounded font-bold flex gap-2"><DollarSign/> Cash Games</button>
                <button className="text-gray-400 hover:bg-[#222] p-3 rounded font-bold flex gap-2"><Trophy/> Torneos</button>
            </aside>
            <div className="flex-1 p-6 overflow-y-auto">
                <div className="grid gap-3">
                    {tables.map(t => (
                        <div key={t.id} className="bg-[#222] p-4 rounded-xl border border-[#333] flex justify-between items-center hover:border-gray-500 transition">
                            <div>
                                <div className="font-bold text-white text-lg">{t.name}</div>
                                <div className="text-gray-400 text-sm">{t.type} - ${t.blinds}</div>
                            </div>
                            <button onClick={()=>onJoinTable(t)} className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-lg">JUGAR</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Lobby;