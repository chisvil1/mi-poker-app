import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import { X, UserPlus } from 'lucide-react';

const FriendsList = ({ onClose }) => {
    const [friends, setFriends] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [friendUsername, setFriendUsername] = useState('');

    useEffect(() => {
        socket.emit('get_friend_list', {}, (friendList) => {
            setFriends(friendList);
        });

        const handleFriendRequest = (request) => {
            setFriendRequests(prev => [...prev, request]);
        };
        const handleFriendStatus = (status) => {
            setFriends(prev => prev.map(f => f.userId === status.userId ? { ...f, status: status.status } : f));
        };
        const handleFriendList = (list) => {
            setFriends(list);
        };

        socket.on('friend_request', handleFriendRequest);
        socket.on('friend_status', handleFriendStatus);
        socket.on('friend_list', handleFriendList);

        return () => {
            socket.off('friend_request', handleFriendRequest);
            socket.off('friend_status', handleFriendStatus);
            socket.off('friend_list', handleFriendList);
        };
    }, []);

    const handleAddFriend = (e) => {
        e.preventDefault();
        if(friendUsername.trim()){
            socket.emit('add_friend', friendUsername);
            setFriendUsername('');
        }
    };

    const handleAcceptFriend = (friendId) => {
        socket.emit('accept_friend', friendId);
        setFriendRequests(prev => prev.filter(r => r.userId !== friendId));
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-xl w-full max-w-sm border border-gray-700 shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-white font-bold">Amigos</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <form onSubmit={handleAddFriend} className="flex gap-2">
                        <input type="text" value={friendUsername} onChange={(e) => setFriendUsername(e.target.value)} placeholder="Añadir amigo" className="flex-1 bg-black border border-gray-700 rounded p-2 text-white outline-none"/>
                        <button type="submit" className="bg-blue-600 text-white p-2 rounded"><UserPlus size={16}/></button>
                    </form>

                    <div>
                        <h3 className="text-xs text-gray-400 uppercase font-bold mb-2">Solicitudes</h3>
                        <ul className="space-y-2">
                            {friendRequests.map(req => (
                                <li key={req.userId} className="flex justify-between items-center bg-black/20 p-2 rounded">
                                    <span>{req.username}</span>
                                    <button onClick={() => handleAcceptFriend(req.userId)} className="bg-green-600 text-white px-2 py-1 rounded text-xs">Aceptar</button>
                                </li>
                            ))}
                        </ul>
                    </div>

                     <div>
                        <h3 className="text-xs text-gray-400 uppercase font-bold mb-2">Amigos</h3>
                        <ul className="space-y-2 max-h-60 overflow-y-auto">
                            {friends.map(friend => (
                                <li key={friend.userId} className="flex justify-between items-center bg-black/20 p-2 rounded">
                                    <span>{friend.username}</span>
                                    <span className={`text-xs ${friend.status === 'online' ? 'text-green-500' : 'text-gray-500'}`}>
                                        {friend.status}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FriendsList;
