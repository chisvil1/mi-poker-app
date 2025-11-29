import React, { useState } from 'react';
import { DollarSign, X, CreditCard, RefreshCw, ShieldCheck } from 'lucide-react';

const Cashier = ({ onClose, onDeposit }) => {
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('card'); 

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2"><DollarSign className="text-green-500"/> Cajero</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><X /></button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-3 gap-3">
                        {['card', 'bitcoin', 'bank'].map(m => (
                            <button key={m} onClick={() => setMethod(m)} 
                                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition ${method===m ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750'}`}>
                                {m==='card' ? <CreditCard/> : m==='bitcoin' ? <DollarSign/> : <RefreshCw/>}
                                <span className="text-xs font-bold capitalize">{m}</span>
                            </button>
                        ))}
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Monto a depositar</label>
                        <div className="relative">
                            <span className="absolute left-4 top-3.5 text-gray-400">$</span>
                            <input type="number" value={amount} onChange={(e)=>setAmount(e.target.value)} 
                                className="w-full bg-black border border-gray-700 rounded-xl p-3 pl-8 text-white font-mono text-lg focus:border-green-500 focus:outline-none" placeholder="100.00"/>
                        </div>
                    </div>
                    <button onClick={() => { onDeposit(amount); onClose(); }} 
                        className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-900/20 transition transform active:scale-95">
                        CONFIRMAR DEPÓSITO
                    </button>
                    <p className="text-center text-xs text-gray-500 flex items-center justify-center gap-1"><ShieldCheck className="w-3 h-3"/> Pagos encriptados y seguros</p>
                </div>
            </div>
        </div>
    );
};

export default Cashier;