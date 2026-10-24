"use client";

import { useState, useEffect } from 'react';
import { db } from '../app/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { SW_STATUS, SwCell, SwIcon } from './ui/Swtor';

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
            case 'construction': return 'structuralbracing';
            case 'diplomacy': return 'lore';
            case 'war': return 'clashing_lightsabers_6_0';
            default: return 'holodisk1';
        }
    };

    // Couleur d'état par type de transmission
    const getStatusColor = (type) => {
        switch(type) {
            case 'construction': return SW_STATUS.success;
            case 'diplomacy': return SW_STATUS.info;
            case 'war': return SW_STATUS.error;
            default: return SW_STATUS.warn;
        }
    };

    return (
        <div className="relative z-50 pointer-events-auto mr-2">
            {/* BOUTON CLOCHE */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                title="Communications"
                data-active={isOpen ? 'true' : undefined}
                className="sw-cell relative w-10 h-10 cursor-pointer transition hover:brightness-125"
            >
                <SwIcon name="datapad" size={30} />
                {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-sw-error text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full animate-bounce border border-black shadow-[0_0_6px_var(--sw-error)]">
                        {unreadCount}
                    </span>
                )}
            </button>

            {/* LISTE DÉROULANTE */}
            {isOpen && (
                <div className="sw-window absolute top-12 right-0 w-80 max-h-96 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="sw-window-header shrink-0 justify-between">
                        <span className="sw-title text-xs tracking-widest">Communications ({notifications.length})</span>
                        <button onClick={() => setIsOpen(false)} aria-label="Fermer" className="sw-close scale-90"></button>
                    </div>

                    <div className="overflow-y-auto sw-scroll flex-grow p-2 pt-3 space-y-1">
                        {notifications.length === 0 ? (
                            <div className="p-4 text-center text-sw-faint text-xs italic">Aucune nouvelle transmission.</div>
                        ) : (
                            notifications.map(notif => (
                                <div
                                    key={notif.id}
                                    onClick={() => handleMarkRead(notif.id)}
                                    data-active={notif.read ? undefined : 'true'}
                                    className={`sw-row p-2.5 pl-3 group relative cursor-pointer
                                        ${notif.read ? 'text-sw-dim opacity-75' : 'text-sw-text'}
                                    `}
                                    style={{ boxShadow: `inset 2px 0 0 ${notif.read ? 'var(--sw-border)' : getStatusColor(notif.type)}` }}
                                >
                                    <div className="flex items-start gap-3">
                                        <SwCell icon={getIcon(notif.type)} size={34} className="mt-0.5 shrink-0" />
                                        <div className="flex-grow min-w-0 pr-4">
                                            <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: notif.read ? 'var(--sw-text-dim)' : getStatusColor(notif.type) }}>{notif.title}</div>
                                            <div className="text-[10px] leading-tight">{notif.message}</div>
                                            <div className="text-[9px] text-sw-faint mt-2 text-right">
                                                {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleTimeString() : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => handleDelete(e, notif.id)}
                                        className="absolute top-2 right-2 text-sw-faint hover:text-sw-error opacity-0 group-hover:opacity-100 transition-opacity text-xs cursor-pointer"
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