import React, { useState } from 'react';
import { DollarSign, X } from 'lucide-react';

const CRYPTOS = {
  BTC: { name: 'Bitcoin', logo: 'https://img.icons8.com/color/48/bitcoin--v1.png' },
  USDT: { name: 'Tether', logo: 'https://img.icons8.com/color/48/tether.png' },
  LTC: { name: 'Litecoin', logo: 'https://img.icons8.com/color/48/litecoin.png' },
};

const Cashier = ({ onClose, onDeposit }) => {
    const [amount, setAmount] = useState('10.00'); // Default amount
    const [method, setMethod] = useState('USDT'); 

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-gray-900 rounded-xl w-full max-w-md border border-gray-700 shadow-2xl overflow-hidden">
                <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-800">
                    <h2 className="text-white text-xl font-bold flex items-center gap-3">
                        <DollarSign className="text-green-400" size={24}/> Cajero
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24}/>
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm text-gray-300 mb-2 font-semibold">Selecciona la Moneda</label>
                        <div className="grid grid-cols-3 gap-3">
                            {Object.entries(CRYPTOS).map(([symbol, { name, logo }]) => (
                                <button 
                                    key={symbol} 
                                    onClick={() => setMethod(symbol)} 
                                    className={`p-3 rounded-lg border-2 text-center font-bold transition-all duration-200 flex flex-col items-center justify-center gap-2 ${method === symbol ? 'bg-blue-800 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                                >
                                    <img src={logo} alt={name} className="w-8 h-8" />
                                    <span>{symbol}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                         <label className="block text-sm text-gray-300 mb-2 font-semibold">Monto a Depositar (USD)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">$</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e)=>setAmount(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 pl-8 text-white text-xl font-mono focus:border-blue-500 outline-none transition-colors"
                                placeholder="10.00"
                                min="1"
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => { onDeposit(amount, method); onClose(); }}
                        className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg shadow-lg uppercase tracking-wide transition-all duration-200 active:translate-y-0.5 active:shadow-md"
                    >
                        Depositar
                    </button>
                     <p className="text-xs text-center text-gray-500 mt-2">Pagos seguros procesados por NOWPayments</p>
                </div>
            </div>
        </div>
    );
};

export default Cashier;