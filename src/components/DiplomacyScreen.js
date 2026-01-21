"use client";

import { useState, useEffect } from 'react';
import { db } from '../app/lib/firebase';
import { collection, getDocs, doc, updateDoc, increment, setDoc, onSnapshot, addDoc, deleteDoc, query, where } from 'firebase/firestore';

// --- CONFIGURATION ---
const COLORS = {
    gold: '#cba660', 
    bgDark: '#0f1115', 
    bgPanel: '#1a1d23',
    positive: '#4ade80',
    negative: '#f87171',
};

// 1. FONCTION INTELLIGENTE POUR LE TEXTE D'AMBIANCE
const getFlavorText = (score, status, isMe, faction) => {
    // Si c'est nous
    if (isMe) return "Notre glorieuse faction domine la galaxie.";
    
    // Récupérer les phrases perso si elles existent
    const phrases = faction?.diplomatic_phrases || {};

    // GESTION DES STATUTS
    if (status === 'war') {
        if (phrases.war) return `"${phrases.war}"`;
        return score < -80 ? "\"Votre destruction est inévitable.\"" : "\"Nos flottes sont en route.\"";
    }
    if (status === 'alliance') {
        if (phrases.alliance) return `"${phrases.alliance}"`;
        return "\"Nos destins sont liés par le sang et l'acier.\"";
    }
    if (status === 'trade') return "\"Le commerce est florissant entre nos peuples.\"";
    
    // GESTION DES RELATIONS NEUTRES (Selon le score)
    if (score >= 50) {
        if (phrases.neutral_good) return `"${phrases.neutral_good}"`;
        return "\"Vos vaisseaux sont toujours les bienvenus dans notre secteur.\"";
    }
    if (score <= -50) {
        if (phrases.neutral_bad) return `"${phrases.neutral_bad}"`;
        return "\"La méfiance est de mise. Gardez vos distances.\"";
    }
    
    // Neutre strict
    return "\"Nous n'avons aucune querelle avec vous... pour l'instant.\"";
};

// COULEUR DU TEXTE SELON L'HUMEUR
const getFlavorColor = (score, status) => {
    if (status === 'war' || score < -20) return 'text-red-400';
    if (status === 'alliance' || score >= 50) return 'text-green-400';
    if (score >= 20) return 'text-[#cba660]'; // Or
    return 'text-gray-400';
};

export default function DiplomacyScreen({ userFaction, onClose }) {
    const [view, setView] = useState('list'); // 'list' ou 'requests'
    const [factions, setFactions] = useState([]);
    const [selectedFaction, setSelectedFaction] = useState(null);
    const [relations, setRelations] = useState({});
    const [myFactionData, setMyFactionData] = useState(null);
    const [requests, setRequests] = useState([]); 
    const [sentRequests, setSentRequests] = useState([]); 
    const [loading, setLoading] = useState(false);

    // --- CHARGEMENT ---
    useEffect(() => {
        if (!userFaction) return;

        const loadData = async () => {
            try {
                // Charger Factions & Rangs
                const myDoc = await getDocs(collection(db, "factions"));
                const allFactions = myDoc.docs.map(d => ({ id: d.id, ...d.data() }));
                
                allFactions.sort((a, b) => ((b.credits || 0) + (b.manpower || 0)) - ((a.credits || 0) + (a.manpower || 0)));
                const rankedFactions = allFactions.map((f, index) => ({ ...f, rank: index + 1 }));

                setMyFactionData(rankedFactions.find(f => f.id === userFaction) || {});
                setFactions(rankedFactions.filter(f => f.id !== userFaction && f.id !== 'neutral'));

                // Charger Relations
                const unsubRel = onSnapshot(collection(db, `factions/${userFaction}/diplomacy`), (snap) => {
                    const relMap = {};
                    snap.forEach(d => relMap[d.id] = d.data());
                    setRelations(relMap);
                });

                // Charger Requêtes
                const qReceived = query(collection(db, "diplomacy_requests"), where("targetId", "==", userFaction));
                const unsubReq = onSnapshot(qReceived, (snap) => setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

                const qSent = query(collection(db, "diplomacy_requests"), where("senderId", "==", userFaction));
                const unsubSent = onSnapshot(qSent, (snap) => setSentRequests(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

                return () => { unsubRel(); unsubReq(); unsubSent(); };

            } catch (e) { console.error(e); }
        };
        loadData();
    }, [userFaction]);

    // --- LOGIQUE METIER ---
    const getRelationScore = (fid) => relations[fid]?.score || 0;
    const getRelationStatus = (fid) => relations[fid]?.status || 'neutral';

    const updateRelationInDb = async (targetId, scoreChange, newStatus = null) => {
        if (!targetId) return;
        const currentScore = getRelationScore(targetId);
        const currentStatus = getRelationStatus(targetId);
        
        let finalScore = Math.max(-100, Math.min(100, currentScore + scoreChange));
        let finalStatus = newStatus || currentStatus;

        if (!newStatus && finalScore <= -100) finalStatus = 'war';

        const data = { score: finalScore, status: finalStatus };
        
        try {
            await setDoc(doc(db, `factions/${userFaction}/diplomacy`, targetId), data);
            await setDoc(doc(db, `factions/${targetId}/diplomacy`, userFaction), data);
        } catch (e) { console.error(e); }
    };

    // --- HANDLERS ---
    const handleSendRequest = async (type) => {
        if (!selectedFaction?.id) return;
        const existing = sentRequests.find(r => r.targetId === selectedFaction.id && r.type === type);
        if (existing) return alert("Une demande similaire est déjà en attente.");

        let confirmMsg = type === 'peace' ? `Proposer un TRAITÉ DE PAIX ?` : `Envoyer une proposition de ${type === 'trade' ? 'Commerce' : 'Alliance'} ?`;
        if (!confirm(confirmMsg)) return;

        setLoading(true);
        try {
            await addDoc(collection(db, "diplomacy_requests"), {
                senderId: userFaction,
                senderName: myFactionData.name,
                targetId: selectedFaction.id,
                type: type,
                createdAt: new Date()
            });
            alert("Proposition envoyée.");
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleRequestResponse = async (req, accepted) => {
        if (!confirm(accepted ? "Accepter la proposition ?" : "Refuser la proposition ?")) return;
        try {
            if (accepted) {
                if (req.type === 'peace') {
                    await setDoc(doc(db, `factions/${userFaction}/diplomacy`, req.senderId), { score: -40, status: 'neutral' });
                    await setDoc(doc(db, `factions/${req.senderId}/diplomacy`, userFaction), { score: -40, status: 'neutral' });
                    alert("La paix est signée !");
                } else {
                    await updateRelationInDb(req.senderId, 15, req.type);
                    alert(`Accord accepté !`);
                }
            }
            await deleteDoc(doc(db, "diplomacy_requests", req.id));
        } catch (e) { console.error(e); }
    };

    const handleUnilateralAction = async (action) => {
        if (!selectedFaction?.id) return;
        setLoading(true);
        try {
            if (action === 'gift') {
                if ((myFactionData?.credits || 0) < 500) alert("Pas assez de crédits.");
                else {
                    await updateDoc(doc(db, "factions", userFaction), { credits: increment(-500) });
                    await updateDoc(doc(db, "factions", selectedFaction.id), { credits: increment(500) });
                    await updateRelationInDb(selectedFaction.id, 15);
                }
            } 
            else if (action === 'war') {
                if (confirm("DÉCLARATION DE GUERRE : Êtes-vous sûr ?")) {
                    await updateRelationInDb(selectedFaction.id, -100, 'war');
                }
            }
            else if (action === 'break_treaty') {
                if (confirm("Rompre cet accord entachera notre réputation. Continuer ?")) {
                    await updateRelationInDb(selectedFaction.id, -50, 'neutral');
                }
            }
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    // --- UI HELPERS ---
    const getAttitudeColor = (score) => score >= 50 ? 'text-green-400' : (score >= 0 ? 'text-yellow-400' : 'text-red-500');
    const getStatusIcon = (status) => {
        switch(status) { case 'war': return '⚔️'; case 'alliance': return '🛡️'; case 'trade': return '📜'; default: return '😐'; }
    };

    // --- 2. PORTRAIT PANEL MIS À JOUR ---
    const PortraitPanel = ({ faction, isMe }) => {
        if (!faction) return <div className="w-80 opacity-0"></div>;
        
        const score = !isMe ? getRelationScore(faction.id) : 0;
        const status = !isMe ? getRelationStatus(faction.id) : 'neutral';
        const borderColor = faction.color || '#cba660';
        
        // Calcul des phrases
        const flavorText = getFlavorText(score, status, isMe, faction);
        const flavorColor = getFlavorColor(score, status);

        return (
            <div className={`w-80 flex flex-col ${isMe ? 'items-start' : 'items-end'} pointer-events-auto transition-all`}>
                <div className="relative z-10 mb-[-20px] mx-4">
                    {/* CERCLE DU PORTRAIT */}
                    <div 
                        className="w-40 h-40 rounded-full border-4 bg-gray-900 shadow-[0_0_20px_black] flex items-center justify-center relative overflow-hidden group"
                        style={{ borderColor: borderColor }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-20"></div>
                        
                        {/* AFFICHE L'IMAGE SI ELLE EXISTE */}
                        {faction.image ? (
                            <img src={faction.image} alt={faction.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        ) : (
                            <div className="text-6xl" style={{ color: faction.color }}>♛</div>
                        )}
                    </div>

                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-black/90 border border-[#cba660] px-4 py-1 whitespace-nowrap min-w-[120px] text-center shadow-lg z-30">
                        <div className="text-[#cba660] font-serif font-bold uppercase text-sm tracking-widest">{faction.name}</div>
                    </div>
                </div>

                {/* PANNEAU DE STATS */}
                <div className="w-full bg-[#0f1115] border-2 border-[#cba660] pt-10 pb-4 px-4 shadow-2xl relative mt-4">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#cba660]"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#cba660]"></div>
                    
                    <div className="space-y-3 font-serif text-gray-300">
                        <div className="flex justify-between border-b border-gray-700 pb-1">
                            <span className="text-xs uppercase text-[#8a6d3b]">Rang de force</span>
                            <span className="font-bold text-white">{faction.rank}</span>
                        </div>
                        {isMe && <div className="flex justify-between border-b border-gray-700 pb-1"><span className="text-xs uppercase text-[#8a6d3b]">Trésorerie</span><span className="font-bold text-yellow-500">{faction.credits?.toLocaleString()} CR</span></div>}
                        
                        {/* ICI : AFFICHAGE DE LA PHRASE D'AMBIANCE */}
                        <div className="pt-2 text-center border-t border-gray-800 mt-2 min-h-[30px] flex items-center justify-center">
                            <p className={`text-[11px] italic font-serif leading-tight ${isMe ? 'text-gray-500' : flavorColor}`}>
                                {flavorText}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col justify-between p-6 pointer-events-none font-sans">
            
            {/* TOP BAR */}
            <div className="pointer-events-auto self-center bg-[#0f1115] border-x-2 border-b-2 border-[#cba660] px-12 py-2 shadow-lg relative flex gap-4">
                <button onClick={() => setView('list')} className={`text-[#cba660] font-serif text-xl font-bold uppercase tracking-[0.1em] hover:text-white ${view === 'list' ? 'underline decoration-2 underline-offset-4' : 'opacity-70'}`}>Diplomatie</button>
                <div className="w-px bg-[#cba660]/50 h-6 self-center"></div>
                <button onClick={() => setView('requests')} className={`text-[#cba660] font-serif text-xl font-bold uppercase tracking-[0.1em] hover:text-white relative ${view === 'requests' ? 'underline decoration-2 underline-offset-4' : 'opacity-70'}`}>
                    Requêtes
                    {requests.length > 0 && <span className="absolute -top-2 -right-3 bg-red-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full animate-pulse">{requests.length}</span>}
                </button>
                <button onClick={onClose} className="absolute right-[-40px] top-0 bg-red-900 text-white w-8 h-8 flex items-center justify-center border border-red-500 hover:bg-red-700 font-sans">X</button>
            </div>

            {/* MAIN AREA */}
            <div className="flex-grow flex justify-between items-center px-10 mt-10">
                {view === 'list' ? (
                    <>
                        <PortraitPanel faction={myFactionData} isMe={true} />
                        <div className="flex-grow"></div>
                        <PortraitPanel faction={selectedFaction} isMe={false} />
                    </>
                ) : (
                    <div className="w-full max-w-2xl mx-auto h-[60vh] bg-[#0f1115] border-2 border-[#cba660] p-6 pointer-events-auto overflow-y-auto relative shadow-2xl">
                        <h2 className="text-[#cba660] font-serif text-2xl font-bold uppercase text-center mb-6 border-b border-[#cba660]/30 pb-4">Missives Diplomatiques</h2>
                        {requests.length === 0 ? (
                            <div className="text-center text-gray-500 italic">Aucune requête en attente.</div>
                        ) : (
                            <div className="space-y-4">
                                {requests.map(req => (
                                    <div key={req.id} className="bg-[#1a1d23] border border-gray-600 p-4 flex justify-between items-center hover:border-[#cba660] transition">
                                        <div className="flex items-center gap-4">
                                            <div className="text-3xl">{req.type === 'war' ? '⚔️' : (req.type === 'peace' ? '🕊️' : '📜')}</div>
                                            <div>
                                                <div className="text-[#cba660] font-bold uppercase text-sm">
                                                    {req.type === 'trade' ? 'Accord Commercial' : (req.type === 'alliance' ? 'Alliance Militaire' : (req.type === 'peace' ? 'Traité de Paix' : 'Proposition'))}
                                                </div>
                                                <div className="text-gray-400 text-xs">Émissaire : <span className="text-white font-bold">{req.senderName}</span></div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleRequestResponse(req, true)} className="bg-green-900/50 border border-green-600 hover:bg-green-800 text-green-100 px-4 py-1 text-xs uppercase font-bold rounded">Accepter</button>
                                            <button onClick={() => handleRequestResponse(req, false)} className="bg-red-900/50 border border-red-600 hover:bg-red-800 text-red-100 px-4 py-1 text-xs uppercase font-bold rounded">Refuser</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* BOTTOM BAR */}
            {view === 'list' && (
                <div className="pointer-events-auto self-center w-3/4 h-1/3 bg-[#0f1115] border-2 border-[#cba660] flex shadow-[0_-10px_40px_black] relative mt-4">
                    {/* GAUCHE : LISTE */}
                    <div className={`${selectedFaction ? 'w-1/2' : 'w-full'} flex flex-col border-r border-[#cba660]/30 transition-all duration-300`}>
                        <div className="flex items-center bg-[#1a1d23] border-b border-[#cba660] px-4 py-2 text-[#cba660] text-[10px] font-bold uppercase tracking-widest">
                            <div className="w-12 text-center">Rang</div>
                            <div className="flex-grow pl-4">Faction</div>
                            <div className="w-24 text-center">Attitude</div>
                            <div className="w-16 text-center">Statut</div>
                        </div>
                        <div className="overflow-y-auto custom-scrollbar flex-grow p-1">
                            {factions.map(f => {
                                const score = getRelationScore(f.id);
                                const status = getRelationStatus(f.id);
                                const isSelected = selectedFaction?.id === f.id;
                                return (
                                    <div key={f.id} onClick={() => setSelectedFaction(f)} className={`flex items-center p-2 border-b border-gray-800 cursor-pointer transition-colors hover:bg-white/5 ${isSelected ? 'bg-[#cba660]/20 border-[#cba660]' : ''}`}>
                                        <div className="w-12 text-center font-mono text-gray-500 text-xs">{f.rank}</div>
                                        <div className="flex-grow pl-4 flex items-center gap-3">
                                            {/* IMAGE LISTE */}
                                            {f.image ? (
                                                <img src={f.image} alt={f.name} className="w-6 h-6 rounded-full border border-gray-500 object-cover bg-black" />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full border border-gray-500" style={{backgroundColor: f.color}}></div>
                                            )}
                                            <span className={`text-sm font-serif font-bold ${isSelected ? 'text-[#cba660]' : 'text-gray-300'}`}>{f.name}</span>
                                        </div>
                                        <div className={`w-24 text-center text-xs font-bold ${getAttitudeColor(score)}`}>{score}</div>
                                        <div className="w-16 text-center text-lg">{getStatusIcon(status)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* DROITE : ACTIONS */}
                    {selectedFaction && (
                        <div className="w-1/2 flex flex-col bg-[#15171c] animate-in fade-in slide-in-from-right-10 duration-300">
                            <div className="bg-[#1f2229] p-2 border-b border-[#cba660] flex items-center justify-between px-4">
                                <span className="text-[#cba660] text-xs uppercase font-bold tracking-widest">Négociations avec {selectedFaction.name}</span>
                                <div className="text-xs text-gray-400">Relation: <span className={getAttitudeColor(getRelationScore(selectedFaction.id))}>{getRelationScore(selectedFaction.id)}</span></div>
                            </div>
                            <div className="flex-grow p-4 grid grid-cols-2 gap-3 overflow-y-auto content-start">
                                
                                {/* 1. COMMERCE */}
                                {getRelationStatus(selectedFaction.id) === 'trade' ? (
                                    <ActionButton 
                                        label="Rompre Commerce" sub="Pénalité relation" icon="📜"
                                        onClick={() => handleUnilateralAction('break_treaty')}
                                        isDestructive={true} disabled={loading}
                                    />
                                ) : (
                                    <ActionButton 
                                        label="Accord Commercial" sub="Proposition" icon="📜"
                                        onClick={() => handleSendRequest('trade')}
                                        disabled={loading || getRelationStatus(selectedFaction.id) === 'war' || getRelationScore(selectedFaction.id) < 20 || sentRequests.some(r => r.targetId === selectedFaction.id && r.type === 'trade')}
                                        pending={sentRequests.some(r => r.targetId === selectedFaction.id && r.type === 'trade')}
                                    />
                                )}

                                {/* 2. ALLIANCE */}
                                {getRelationStatus(selectedFaction.id) === 'alliance' ? (
                                    <ActionButton 
                                        label="Rompre Alliance" sub="Grosse pénalité" icon="🛡️"
                                        onClick={() => handleUnilateralAction('break_treaty')}
                                        isDestructive={true} disabled={loading}
                                    />
                                ) : (
                                    <ActionButton 
                                        label="Alliance Militaire" sub="Proposition" icon="🛡️"
                                        onClick={() => handleSendRequest('alliance')}
                                        disabled={loading || getRelationStatus(selectedFaction.id) === 'war' || getRelationScore(selectedFaction.id) < 80 || sentRequests.some(r => r.targetId === selectedFaction.id && r.type === 'alliance')}
                                        pending={sentRequests.some(r => r.targetId === selectedFaction.id && r.type === 'alliance')}
                                    />
                                )}

                                {/* 3. CADEAU */}
                                <ActionButton label="Cadeau d'État" sub="500 Crédits (+15)" icon="💰" onClick={() => handleUnilateralAction('gift')} disabled={loading || getRelationStatus(selectedFaction.id) === 'war'} />
                                
                                {/* 4. GUERRE / PAIX */}
                                {getRelationStatus(selectedFaction.id) === 'war' ? (
                                    <ActionButton 
                                        label="Négocier Paix" sub="Proposition d'arrêt" icon="🕊️"
                                        onClick={() => handleSendRequest('peace')}
                                        disabled={loading || sentRequests.some(r => r.targetId === selectedFaction.id && r.type === 'peace')}
                                        pending={sentRequests.some(r => r.targetId === selectedFaction.id && r.type === 'peace')}
                                    />
                                ) : (
                                    <ActionButton 
                                        label="Déclarer Guerre" sub="Romp tout accord" icon="⚔️" isDestructive={true}
                                        onClick={() => handleUnilateralAction('war')}
                                        disabled={loading}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Bouton réutilisable
function ActionButton({ label, sub, icon, onClick, active, disabled, isDestructive, pending }) {
    return (
        <button 
            onClick={onClick}
            disabled={disabled}
            className={`flex flex-col justify-center p-3 border border-l-4 transition-all h-20 text-left relative overflow-hidden group
                ${isDestructive 
                    ? 'border-red-900 bg-red-950/20 border-l-red-600 hover:bg-red-900/40' 
                    : pending 
                        ? 'border-yellow-600 bg-yellow-900/10 border-l-yellow-600 opacity-80 cursor-wait'
                        : 'border-gray-700 bg-[#1f2229] border-l-gray-500 hover:border-[#cba660] hover:border-l-[#cba660] hover:bg-[#2a2d35]'
                }
                ${disabled && !pending ? 'opacity-40 cursor-not-allowed grayscale' : ''}
            `}
        >
            <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{icon}</span>
                <span className={`font-bold uppercase text-xs ${isDestructive ? 'text-red-400' : 'text-gray-200 group-hover:text-white'}`}>{label}</span>
            </div>
            <div className="text-[9px] text-gray-500 pl-7">{sub}</div>
            {pending && <div className="absolute top-1 right-2 text-[8px] text-yellow-500 font-bold uppercase tracking-wider animate-pulse">EN ATTENTE...</div>}
        </button>
    );
}