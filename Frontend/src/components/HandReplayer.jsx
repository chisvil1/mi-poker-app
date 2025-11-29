import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import PokerTable from './PokerTable'; // We can reuse the PokerTable component for the display
import { Play, Pause, SkipForward } from 'lucide-react';

const HandReplayer = ({ handId, onClose }) => {
    const [history, setHistory] = useState(null);
    const [step, setStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        socket.emit('get_hand_history', handId, (handHistory) => {
            setHistory(handHistory);
        });
    }, [handId]);

    useEffect(() => {
        if (isPlaying) {
            const timer = setTimeout(() => {
                if (step < history.actions.length - 1) {
                    setStep(s => s + 1);
                } else {
                    setIsPlaying(false);
                }
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isPlaying, step, history]);

    if (!history) {
        return <div>Cargando historial...</div>;
    }

    const currentState = history.actions[step].state;

    return (
        <div className="fixed inset-0 bg-black/90 z-[110] flex flex-col">
            <div className="w-full h-full">
                <PokerTable tableConfig={currentState} user={null} onLeave={onClose} isReplayer={true} />
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-black/50 flex items-center justify-center gap-4">
                <button onClick={() => setIsPlaying(!isPlaying)} className="text-white">
                    {isPlaying ? <Pause /> : <Play />}
                </button>
                <button onClick={() => setStep(s => Math.min(s + 1, history.actions.length - 1))} className="text-white">
                    <SkipForward />
                </button>
                <span className="text-white">{step + 1} / {history.actions.length}</span>
                 <button onClick={onClose} className="absolute top-4 right-4 text-white">
                    <X />
                </button>
            </div>
        </div>
    );
};

export default HandReplayer;
