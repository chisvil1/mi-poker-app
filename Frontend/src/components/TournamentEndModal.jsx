import React from 'react';
import { X, Trophy } from 'lucide-react';

const TournamentEndModal = ({ results, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-xl w-full max-w-md border border-yellow-500/50 shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-white font-bold text-lg flex items-center gap-2"><Trophy className="text-yellow-400"/>Resultados del Torneo</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20}/></button>
                </div>
                <div className="p-6">
                    <ul className="space-y-3">
                        {results.map(result => (
                            <li key={result.userId} className="flex justify-between items-center bg-black/30 p-3 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-gray-400 w-6">{result.place}.</span>
                                    <span className="font-semibold text-white">{result.username}</span>
                                </div>
                                <span className="font-bold text-green-400">${result.prize}</span>
                            </li>
                        ))}
                    </ul>
                     <button onClick={onClose} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg shadow-lg mt-6">
                        VOLVER AL LOBBY
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TournamentEndModal;
