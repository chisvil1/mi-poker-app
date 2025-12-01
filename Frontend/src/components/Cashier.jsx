import React, { useState } from 'react';
import { DollarSign, X } from 'lucide-react';

const Cashier = ({ onClose, onDeposit }) => {
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('card'); 

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2"><DollarSign className="text-green-500"/> Cajero Cripto</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><X /></button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-3 gap-2">
                        {['BTC', 'USDT', 'LTC'].map(c => (
                            <button key={c} onClick={() => setMethod(c)} className={`p-3 rounded border text-center font-bold ${method===c?'bg-green-900 border-green-500':'bg-black border-gray-700 text-gray-500'}`}>{c}</button>
                        ))}
                    </div>
                    <input type="number" value={amount} onChange={(e)=>setAmount(e.target.value)} className="w-full bg-black border border-gray-700 rounded p-3 text-white text-lg" placeholder="Monto USD"/>
                    <button onClick={() => { onDeposit(amount, method); onClose(); }} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl">GENERAR PAGO</button>
                </div>
            </div>
        </div>
    );
};

export default Cashier;