"use client";

import { useState, useEffect } from 'react';
import { db } from '../app/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';

export default function NotificationPanel({ userID }) {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Écouter les notifications en temps réel
    useEffect(() => {
        if (!userID) return;

        // Requête avec le tri par date (nécessite l'index que tu as créé)
        const q = query(
            collection(db, "notifications"), 
            where("targetId", "==", userID),
            orderBy("createdAt", "desc") // Les plus récentes en haut
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setNotifications(notifs);
            setUnreadCount(notifs.filter(n => !n.read).length);
        });

        return () => unsubscribe();
    }, [userID]);

    const handleMarkRead = async (id) => {
        await updateDoc(doc(db, "notifications", id), { read: true });
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        await deleteDoc(doc(db, "notifications", id));
    };

    const getIcon = (type) => {
        switch(type) {
            case 'construction': return '🏗️';
            case 'diplomacy': return '📜';
            case 'war': return '⚔️';
            default: return '📩';
        }
    };

    return (
        <div className="relative z-50 pointer-events-auto mr-2">
            {/* BOUTON CLOCHE */}
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="relative bg-gray-900 border border-[#cba660] text-[#cba660] w-10 h-10 flex items-center justify-center rounded hover:bg-[#cba660] hover:text-black transition shadow-lg"
            >
                <span className="text-xl">🔔</span>
                {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full animate-bounce border border-black">
                        {unreadCount}
                    </span>
                )}
            </button>

            {/* LISTE DÉROULANTE */}
            {isOpen && (
                <div className="absolute top-12 right-0 w-80 max-h-96 bg-[#0f1115] border-2 border-[#cba660] shadow-[0_0_30px_black] flex flex-col rounded-sm overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="bg-[#1a1d23] p-2 border-b border-[#cba660] text-[#cba660] text-xs font-bold uppercase tracking-widest flex justify-between items-center">
                        <span>Communications ({notifications.length})</span>
                        <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white">X</button>
                    </div>
                    
                    <div className="overflow-y-auto custom-scrollbar flex-grow p-1">
                        {notifications.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-xs italic">Aucune nouvelle transmission.</div>
                        ) : (
                            notifications.map(notif => (
                                <div 
                                    key={notif.id} 
                                    onClick={() => handleMarkRead(notif.id)}
                                    className={`p-3 mb-1 border-l-4 transition-colors group relative cursor-pointer
                                        ${notif.read ? 'bg-[#15171c] border-gray-700 text-gray-400' : 'bg-[#1f2229] border-[#cba660] text-gray-200'}
                                    `}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="text-lg mt-0.5">{getIcon(notif.type)}</div>
                                        <div className="flex-grow">
                                            <div className={`text-xs font-bold uppercase mb-1 ${notif.read ? 'text-gray-500' : 'text-[#cba660]'}`}>{notif.title}</div>
                                            <div className="text-[10px] leading-tight">{notif.message}</div>
                                            <div className="text-[9px] text-gray-600 mt-2 text-right">
                                                {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleTimeString() : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => handleDelete(e, notif.id)}
                                        className="absolute top-2 right-2 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                                        title="Supprimer"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}