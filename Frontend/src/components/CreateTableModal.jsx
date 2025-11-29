import React, { useState } from 'react';
import { X } from 'lucide-react';

const CreateTableModal = ({ onClose, onCreate }) => {
    const [name, setName] = useState('');
    const [blinds, setBlinds] = useState('0.50/1.00');
    const [buyIn, setBuyIn] = useState(50);
    const [gameType, setGameType] = useState('NLH');

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-gray-900 rounded-xl w-full max-w-md border border-gray-700 shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-white font-bold">Crear Nueva Mesa</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">Nombre de la Mesa</label>
                        <input type="text" value={name} onChange={(e)=>setName(e.target.value)} className="w-full bg-black border border-gray-700 rounded p-2 text-white focus:border-green-500 outline-none" placeholder="Ej: La Cueva de los Pros"/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">Juego</label>
                            <select value={gameType} onChange={(e)=>setGameType(e.target.value)} className="w-full bg-black border border-gray-700 rounded p-2 text-white outline-none">
                                <option value="NLH">No-Limit Hold'em</option>
                                <option value="PLO">Pot-Limit Omaha</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">Ciegas</label>
                            <select value={blinds} onChange={(e)=>setBlinds(e.target.value)} className="w-full bg-black border border-gray-700 rounded p-2 text-white outline-none">
                                <option value="0.10/0.25">$0.10 / $0.25</option>
                                <option value="0.50/1.00">$0.50 / $1.00</option>
                                <option value="1/2">$1 / $2</option>
                                <option value="5/10">$5 / $10</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">Buy-in Mínimo</label>
                        <input type="number" value={buyIn} onChange={(e)=>setBuyIn(e.target.value)} className="w-full bg-black border border-gray-700 rounded p-2 text-white focus:border-green-500 outline-none"/>
                    </div>
                    <button onClick={() => onCreate({ name, blinds, minBuyIn: buyIn, gameType })} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded shadow-lg mt-2">
                        CREAR MESA
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateTableModal;
