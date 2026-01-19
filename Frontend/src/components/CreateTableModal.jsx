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
                <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-800">
                    <h2 className="text-white text-xl font-bold">Crear Nueva Mesa</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24}/>
                    </button>
                </div>
                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm text-gray-300 mb-2 font-semibold">Nombre de la Mesa</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e)=>setName(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors placeholder-gray-500"
                            placeholder="Ej: La Cueva de los Pros"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm text-gray-300 mb-2 font-semibold">Juego</label>
                            <select
                                value={gameType}
                                onChange={(e)=>setGameType(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors"
                            >
                                <option value="NLH">No-Limit Hold'em</option>
                                <option value="PLO">Pot-Limit Omaha</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-2 font-semibold">Ciegas</label>
                            <select
                                value={blinds}
                                onChange={(e)=>setBlinds(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors"
                            >
                                <option value="0.10/0.25">$0.10 / $0.25</option>
                                <option value="0.50/1.00">$0.50 / $1.00</option>
                                <option value="1/2">$1 / $2</option>
                                <option value="5/10">$5 / $10</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-300 mb-2 font-semibold">Buy-in Mínimo</label>
                        <input
                            type="number"
                            value={buyIn}
                            onChange={(e)=>setBuyIn(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors"
                            min="0"
                        />
                    </div>
                    <button
                        onClick={() => onCreate({ name, blinds, minBuyIn: buyIn, gameType })}
                        className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg shadow-lg mt-4 uppercase tracking-wide transition-all duration-200 active:translate-y-0.5 active:shadow-md"
                    >
                        CREAR MESA
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateTableModal;
