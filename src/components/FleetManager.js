"use client";

import { useState } from 'react';
import { db } from '../app/lib/firebase';
import { doc, updateDoc, addDoc, deleteDoc, collection, increment } from 'firebase/firestore';

// --- CONFIGURATION DES VAISSEAUX (AVEC TECH REQUISE) ---
export const SHIP_TYPES = {
    fighter: { 
        name: "Escadron de Chasseurs", type: "fighter", icon: "🚀", desc: "Rapide et agile.",
        power: 1, cost: 50, mat: 10, upkeep_cr: 2, upkeep_mp: 1,
        tech_req: null // Toujours disponible
    },
    corvette: { 
        name: "Corvette Tactique", type: "corvette", icon: "🛸", desc: "Patrouilleur léger.",
        power: 5, cost: 200, mat: 50, upkeep_cr: 10, upkeep_mp: 5,
        tech_req: 'tech_corvette' // Nécessite la recherche
    },
    frigate: { 
        name: "Frégate de Ligne", type: "frigate", icon: "🛳️", desc: "Épine dorsale.",
        power: 15, cost: 800, mat: 200, upkeep_cr: 40, upkeep_mp: 15,
        tech_req: 'tech_frigate'
    },
    cruiser: { 
        name: "Croiseur Lourd", type: "cruiser", icon: "⚔️", desc: "Artillerie lourde.",
        power: 40, cost: 2000, mat: 600, upkeep_cr: 150, upkeep_mp: 50,
        tech_req: 'tech_cruiser'
    },
    dreadnought: { 
        name: "Dreadnought", type: "dreadnought", icon: "💀", desc: "Unité Capitale.",
        power: 100, cost: 5000, mat: 1500, upkeep_cr: 500, upkeep_mp: 200,
        tech_req: 'tech_dreadnought'
    }
};

export const TROOP_TYPES = {
    infantry: { 
        name: "Infanterie Légère", type: "infantry", icon: "👮", desc: "Unité de base.", // Conforme GARRISON_STATS
        power: 2, cost: 50, mat: 0, cost_mp: 10, upkeep_cr: 1, upkeep_mp: 1 
    },
    heavy_infantry: { 
        name: "Infanterie Lourde", type: "heavy_infantry", icon: "💂", desc: "Unité d'élite.",
        power: 5, cost: 150, mat: 0, cost_mp: 20, upkeep_cr: 4, upkeep_mp: 2 
    },
    vehicle: { 
        name: "Véhicules Blindés", type: "vehicle", icon: "🚜", desc: "Soutien mécanisé.",
        power: 12, cost: 400, mat: 0, cost_mp: 50, upkeep_cr: 15, upkeep_mp: 4 
    },
    air_support: { 
        name: "Escadron Aérien", type: "air_support", icon: "🚁", desc: "Frappe aérienne.",
        power: 15, cost: 600, mat: 0, cost_mp: 30, upkeep_cr: 25, upkeep_mp: 3 
    }
};

export default function FleetManager({ userFaction, fleets, planets, currentTurn, factionMembers, factionData, onSelectFleet, onClose }) {
    const [selectedFleet, setSelectedFleet] = useState(null);
    const [viewMode, setViewMode] = useState('list'); 
    const [buildTab, setBuildTab] = useState('ships'); // 'ships' | 'troops' 
    
    const isRepublic = userFaction === 'republic';
    const theme = {
        main: isRepublic ? 'text-blue-400' : 'text-green-500', 
        border: isRepublic ? 'border-blue-500' : 'border-green-600',
        bg: isRepublic ? 'bg-blue-950/90' : 'bg-gray-900/95',
        glow: isRepublic ? 'shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'shadow-[0_0_20px_rgba(34,197,94,0.3)]',
        button: isRepublic ? 'bg-blue-900 hover:bg-blue-800' : 'bg-green-900 hover:bg-green-800',
    };

    // Liste des techs débloquées par la faction
    const unlockedTechs = factionData?.unlocked_techs || [];

    // Filtrer uniquement les Généraux disponibles
    const availableAdmirals = factionMembers ? factionMembers.filter(m => m.role === 'general' || m.role === 'emperor') : [];

    const getFleetPower = (fleet) => {
        let total = 0;
        if(fleet.composition) {
            Object.entries(fleet.composition).forEach(([type, count]) => { 
                if (SHIP_TYPES[type]) total += SHIP_TYPES[type].power * count; 
            });
        }
        if(fleet.troops) {
             Object.entries(fleet.troops).forEach(([type, count]) => { 
                if (TROOP_TYPES[type]) total += TROOP_TYPES[type].power * count; 
            });
        }
        if (fleet.commander_id) total = Math.round(total * 1.2);
        return total;
    };

    const getFleetUpkeep = (fleet) => {
        let cr = 0; let mp = 0;
        if(fleet.composition) {
            Object.entries(fleet.composition).forEach(([type, count]) => {
                if (SHIP_TYPES[type]) {
                    cr += SHIP_TYPES[type].upkeep_cr * count;
                    mp += SHIP_TYPES[type].upkeep_mp * count;
                }
            });
        }
        if(fleet.troops) {
            Object.entries(fleet.troops).forEach(([type, count]) => {
                if (TROOP_TYPES[type]) {
                    cr += TROOP_TYPES[type].upkeep_cr * count;
                    mp += TROOP_TYPES[type].upkeep_mp * count;
                }
            });
        }
        return { cr, mp };
    };

    const createNewFleet = async (planetId) => {
        const planet = planets.find(p => p.id === planetId);
        const name = prompt("Nom de la nouvelle flotte :");
        if (!name) return;
        try {
            await addDoc(collection(db, "fleets"), {
                name: name, owner: userFaction, location_id: planetId, location_name: planet.name, status: 'stationed',
                composition: { fighter: 0, corvette: 0, frigate: 0, cruiser: 0, dreadnought: 0 },
                troops: { infantry: 0, heavy_infantry: 0, vehicle: 0, air_support: 0 },
                commander_id: null, commander_name: null,
                start_turn: null, arrival_turn: null, destination_id: null
            });
        } catch (e) { console.error(e); }
    };

    const assignCommander = async (memberId, memberName) => {
        if (!selectedFleet) return;
        await updateDoc(doc(db, "fleets", selectedFleet.id), {
            commander_id: memberId,
            commander_name: memberName
        });
        setSelectedFleet({ ...selectedFleet, commander_id: memberId, commander_name: memberName });
    };

    const addUnitToFleet = async (type, category) => { // category: 'ship' | 'troop'
        if (!selectedFleet) return;
        const unit = category === 'ship' ? SHIP_TYPES[type] : TROOP_TYPES[type];
        
        // LIMIT CHECK
        if (category === 'ship') {
             const currentShips = Object.values(selectedFleet.composition || {}).reduce((a, b) => a + b, 0);
             if (currentShips >= 20) return alert("Limite de flotte atteinte (20 vaisseaux max)");
        } else {
             const currentTroops = Object.values(selectedFleet.troops || {}).reduce((a, b) => a + b, 0);
             if (currentTroops >= 20) return alert("Limite de transport atteinte (20 troupes max)");
        }
        
        const costCr = unit.cost;
        const costMat = unit.mat || 0;
        const costMp = unit.cost_mp || 0;

        // Vérification Ressources
        if (factionData.credits < costCr || factionData.materials < costMat || (factionData.manpower || 0) < costMp) {
            return alert("Ressources insuffisantes !");
        }

        if (!confirm(`Construire ${unit.name} ?\nCoût : ${costCr} CR${costMat > 0 ? `, ${costMat} MAT` : ''}${costMp > 0 ? `, ${costMp} MP` : ''}`)) return;

        if (category === 'ship') {
            const newComposition = { ...(selectedFleet.composition || {}) };
            newComposition[type] = (newComposition[type] || 0) + 1;
            await updateDoc(doc(db, "fleets", selectedFleet.id), { composition: newComposition });
            setSelectedFleet({ ...selectedFleet, composition: newComposition });
        } else {
             const newTroops = { ...(selectedFleet.troops || {}) };
            newTroops[type] = (newTroops[type] || 0) + 1;
            await updateDoc(doc(db, "fleets", selectedFleet.id), { troops: newTroops });
            setSelectedFleet({ ...selectedFleet, troops: newTroops });
        }

        await updateDoc(doc(db, "factions", userFaction), {
            credits: increment(-costCr),
            materials: increment(-costMat),
            manpower: increment(-costMp)
        });
    };

    const deleteFleet = async () => {
        if (!selectedFleet) return;
        if (!confirm(`Voulez-vous vraiment démanteler la flotte "${selectedFleet.name}" ? Cette action est irréversible.`)) return;

        try {
            await deleteDoc(doc(db, "fleets", selectedFleet.id));
            setSelectedFleet(null);
        } catch (e) {
            console.error("Erreur suppression flotte:", e);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center shadow-lg bg-black/80 backdrop-blur-sm p-4 font-mono">
            <div className={`w-full max-w-6xl h-[85vh] flex flex-col border-2 ${theme.border} ${theme.bg} ${theme.glow} rounded-lg overflow-hidden relative`}>
                <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20"></div>

                <div className={`flex justify-between items-center p-4 border-b ${theme.border} bg-black/40 relative z-10`}>
                    <div className="flex items-center gap-4">
                        <span className={`text-4xl ${theme.main}`}>⌖</span>
                        <div>
                            <h2 className={`text-2xl font-bold uppercase tracking-[0.2em] ${theme.main}`}>Console Tactique</h2>
                            <p className="text-[10px] text-gray-400 uppercase">Système de gestion de flotte v5.1</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`px-4 py-2 border ${theme.border} ${theme.main} hover:bg-white/5 uppercase text-xs font-bold`}>Fermer</button>
                </div>

                <div className="flex flex-grow overflow-hidden relative z-10">
                    {/* LISTE */}
                    <div className={`w-1/4 border-r ${theme.border} bg-black/20 flex flex-col`}>
                        <div className="p-2 bg-black/40 text-[10px] text-gray-500 uppercase font-bold tracking-widest text-center">Unités Déployées</div>
                        <div className="flex-grow overflow-y-auto custom-scrollbar">
                            {fleets.filter(f => f.owner === userFaction).map(fleet => (
                                <button key={fleet.id} onClick={() => { setSelectedFleet(fleet); setViewMode('details'); }} className={`w-full text-left p-4 border-b border-gray-800 transition-all hover:bg-white/5 group relative ${selectedFleet?.id === fleet.id ? 'bg-white/10' : ''}`}>
                                    {selectedFleet?.id === fleet.id && <div className={`absolute left-0 top-0 bottom-0 w-1 ${isRepublic ? 'bg-blue-500' : 'bg-green-500'}`}></div>}
                                    <div className="flex justify-between items-start">
                                        <span className={`font-bold uppercase text-sm ${theme.main}`}>{fleet.name}</span>
                                        {fleet.commander_id && <span className="text-xs">⭐</span>}
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-1">Loc: {fleet.location_name || 'Inconnu'}</div>
                                    <div className="text-[10px] text-gray-500">Puissance: {getFleetPower(fleet)}</div>
                                </button>
                            ))}
                        </div>
                        <div className="p-4 border-t border-gray-800">
                            <select className="w-full bg-black border border-gray-700 text-gray-300 text-xs p-2 mb-2 outline-none" onChange={(e) => { if(e.target.value) createNewFleet(e.target.value); }} value="">
                                <option value="">+ Créer Nouvelle Flotte</option>
                                {planets.filter(p => p.owner === userFaction).map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                            </select>
                        </div>
                    </div>

                    {/* DÉTAILS */}
                    <div className="flex-grow bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-black/80 flex flex-col relative">
                        {selectedFleet ? (
                            <>
                                <div className="p-6 border-b border-gray-800 flex justify-between items-start bg-gradient-to-b from-black/50 to-transparent">
                                    <div className="flex-grow">
                                        <h3 className="text-3xl font-bold text-white uppercase">{selectedFleet.name}</h3>
                                        <div className={`text-xs ${theme.main} mt-1 flex gap-4`}>
                                            <span>Position : {selectedFleet.location_name}</span>
                                            <span>Statut : {selectedFleet.status.toUpperCase()}</span>
                                        </div>
                                        <div className="mt-2 text-[10px] text-red-400 font-bold bg-red-900/20 px-2 py-1 rounded inline-block border border-red-900/50">
                                            ENTRETIEN : -{getFleetUpkeep(selectedFleet).cr} CR / -{getFleetUpkeep(selectedFleet).mp} HOM
                                        </div>
                                    </div>

                                    {/* SECTION COMMANDANT */}
                                    <div className="bg-black/50 border border-gray-700 p-3 rounded w-64 ml-4">
                                        <div className="text-[9px] text-gray-500 uppercase font-bold mb-1">Amiral en Chef</div>
                                        {selectedFleet.commander_id ? (
                                            <div className="flex justify-between items-center">
                                                <span className={`font-bold ${theme.main}`}>⭐ {selectedFleet.commander_name}</span>
                                                <button onClick={() => assignCommander(null, null)} className="text-[10px] text-red-500 hover:underline">Révoquer</button>
                                            </div>
                                        ) : (
                                            <select 
                                                className="w-full bg-gray-900 border border-gray-600 text-xs text-white p-1"
                                                onChange={(e) => {
                                                    const idx = e.target.selectedIndex;
                                                    if (idx > 0) assignCommander(availableAdmirals[idx-1].id, availableAdmirals[idx-1].pseudo);
                                                }}
                                            >
                                                <option value="">-- Assigner un Général --</option>
                                                {availableAdmirals.map(m => (
                                                    <option key={m.id} value={m.id}>{m.pseudo}</option>
                                                ))}
                                            </select>
                                        )}
                                        {selectedFleet.commander_id && <div className="text-[9px] text-green-400 mt-1">+20% Puissance de Feu</div>}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 p-4 bg-black/20 border-b border-gray-800">
                                    <button onClick={() => setViewMode('details')} className={`px-4 py-1 text-xs font-bold uppercase border-b-2 transition-colors ${viewMode === 'details' ? `${theme.main} border-current` : 'text-gray-500 border-transparent hover:text-white'}`}>Composition</button>
                                    {selectedFleet.status !== 'moving' && <button onClick={() => setViewMode('build')} className={`px-4 py-1 text-xs font-bold uppercase border-b-2 transition-colors ${viewMode === 'build' ? `${theme.main} border-current` : 'text-gray-500 border-transparent hover:text-white'}`}>Chantier Naval</button>}
                                    
                                    <div className="ml-auto flex gap-2">
                                        <button onClick={deleteFleet} className="px-3 py-1 text-[10px] font-bold uppercase text-red-600 hover:text-red-400 border border-transparent hover:border-red-900 hover:bg-red-900/20 transition-all">Démanteler</button>
                                        {selectedFleet.status !== 'moving' && <button onClick={() => onSelectFleet(selectedFleet, 'move')} className={`px-4 py-2 text-xs font-bold uppercase ${theme.button} text-white shadow-lg`}>Ordre de Mouvement</button>}
                                    </div>
                                </div>

                                <div className="flex-grow p-6 overflow-y-auto">
                                    {viewMode === 'details' && (
                                        <div className="space-y-8">
                                            {/* --- SECTION VAISSEAUX --- */}
                                            <div>
                                                <h3 className="text-[10px] uppercase font-bold text-gray-500 mb-4 border-b border-gray-800 pb-1 tracking-widest">Forces Spatiales</h3>
                                                <div className="grid grid-cols-4 gap-4">
                                                    {selectedFleet.composition && Object.entries(selectedFleet.composition).map(([type, count]) => {
                                                        if (count <= 0) return null;
                                                        const ship = SHIP_TYPES[type];
                                                        if (!ship) return null; 
                                                        return (
                                                            <div key={type} className={`border border-gray-700 bg-black/60 p-4 rounded flex flex-col items-center justify-center relative overflow-hidden group hover:border-${isRepublic ? 'blue' : 'green'}-500 transition-colors`}>
                                                                <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">{ship.icon}</div>
                                                                <div className="text-2xl font-bold text-white">{count}</div>
                                                                <div className="text-[9px] uppercase text-gray-400 tracking-widest">{ship.name}</div>
                                                                <div className={`absolute top-0 right-0 p-1 text-[8px] font-bold ${theme.main}`}>PWR: {ship.power * count}</div>
                                                            </div>
                                                        );
                                                    })}
                                                    {(!selectedFleet.composition || Object.values(selectedFleet.composition).every(v => v === 0)) && (<div className="col-span-4 text-center text-gray-500 italic text-xs">Aucun vaisseau assigné.</div>)}
                                                </div>
                                            </div>

                                            {/* --- SECTION TROUPES --- */}
                                            <div>
                                                <h3 className="text-[10px] uppercase font-bold text-gray-500 mb-4 border-b border-gray-800 pb-1 tracking-widest">Troupes Embarquées</h3>
                                                <div className="grid grid-cols-4 gap-4">
                                                    {selectedFleet.troops && Object.entries(selectedFleet.troops).map(([type, count]) => {
                                                        if (count <= 0) return null;
                                                        const troop = TROOP_TYPES[type];
                                                        if (!troop) return null; 
                                                        return (
                                                            <div key={type} className={`border border-gray-700 bg-black/60 p-4 rounded flex flex-col items-center justify-center relative overflow-hidden group hover:border-${isRepublic ? 'blue' : 'green'}-500 transition-colors`}>
                                                                <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">{troop.icon}</div>
                                                                <div className="text-2xl font-bold text-white">{count}</div>
                                                                <div className="text-[9px] uppercase text-gray-400 tracking-widest">{troop.name}</div>
                                                                <div className={`absolute top-0 right-0 p-1 text-[8px] font-bold ${theme.main}`}>PWR: {troop.power * count}</div>
                                                            </div>
                                                        );
                                                    })}
                                                    {(!selectedFleet.troops || Object.values(selectedFleet.troops).every(v => v === 0)) && (<div className="col-span-4 text-center text-gray-500 italic text-xs">Aucune troupe à bord.</div>)}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* --- CHANTIER NAVAL & CASERNE --- */}
                                    {viewMode === 'build' && (
                                        <>
                                            <div className="flex gap-2 mb-4 border-b border-gray-800 pb-2">
                                                <button 
                                                    onClick={() => setBuildTab('ships')} 
                                                    className={`px-4 py-1 text-[10px] font-bold uppercase transition-all ${buildTab === 'ships' ? `bg-${isRepublic ? 'blue' : 'green'}-900/50 text-white border border-${isRepublic ? 'blue' : 'green'}-500` : 'text-gray-500 border border-transparent hover:border-gray-700'}`}
                                                >
                                                    Vaisseaux
                                                </button>
                                                <button 
                                                    onClick={() => setBuildTab('troops')} 
                                                    className={`px-4 py-1 text-[10px] font-bold uppercase transition-all ${buildTab === 'troops' ? `bg-${isRepublic ? 'blue' : 'green'}-900/50 text-white border border-${isRepublic ? 'blue' : 'green'}-500` : 'text-gray-500 border border-transparent hover:border-gray-700'}`}
                                                >
                                                    Troupes
                                                </button>
                                            </div>

                                            <div className="space-y-2">
                                                {/* LISTE DES VAISSEAUX */}
                                                {buildTab === 'ships' && Object.entries(SHIP_TYPES).map(([key, ship]) => {
                                                    const isLocked = ship.tech_req && !unlockedTechs.includes(ship.tech_req);
                                                    return (
                                                        <div key={key} className={`flex justify-between items-center border p-3 transition-colors relative overflow-hidden ${isLocked ? 'bg-gray-900/50 border-gray-800 opacity-60 grayscale' : 'bg-black/40 border-gray-800 hover:border-gray-600'}`}>
                                                            {isLocked && <div className="absolute right-4 text-6xl opacity-10 pointer-events-none">🔒</div>}
                                                            <div className="flex items-center gap-4">
                                                                <div className="text-3xl bg-gray-900 w-12 h-12 flex items-center justify-center rounded border border-gray-700">{ship.icon}</div>
                                                                <div>
                                                                    <div className="text-sm font-bold text-gray-200 uppercase">{ship.name}</div>
                                                                    <div className="text-[10px] text-gray-500">{ship.desc}</div>
                                                                    <div className="flex gap-3 mt-1 text-[9px] font-mono">
                                                                        <span className="text-red-400">ATK: {ship.power}</span>
                                                                        <span className="text-yellow-500">CR: {ship.cost}</span>
                                                                        <span className="text-blue-400">MAT: {ship.mat}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {isLocked ? (
                                                                <div className="px-4 py-2 border border-red-900 bg-red-950/20 text-red-500 text-[10px] font-bold uppercase rounded">Technologie Requise</div>
                                                            ) : (
                                                                <button onClick={() => addUnitToFleet(key, 'ship')} className={`px-4 py-2 border ${theme.border} ${theme.main} hover:bg-white/10 text-xs font-bold uppercase`}>Construire</button>
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                                {/* LISTE DES TROUPES */}
                                                {buildTab === 'troops' && Object.entries(TROOP_TYPES).map(([key, troop]) => {
                                                    return (
                                                        <div key={key} className="flex justify-between items-center border border-gray-800 bg-black/40 p-3 hover:border-gray-600 transition-colors">
                                                            <div className="flex items-center gap-4">
                                                                <div className="text-3xl bg-gray-900 w-12 h-12 flex items-center justify-center rounded border border-gray-700">{troop.icon}</div>
                                                                <div>
                                                                    <div className="text-sm font-bold text-gray-200 uppercase">{troop.name}</div>
                                                                    <div className="text-[10px] text-gray-500">{troop.desc}</div>
                                                                    <div className="flex gap-3 mt-1 text-[9px] font-mono">
                                                                        <span className="text-red-400">ATK: {troop.power}</span>
                                                                        <span className="text-yellow-500">CR: {troop.cost}</span>
                                                                        <span className="text-green-400">MP: {troop.cost_mp}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <button onClick={() => addUnitToFleet(key, 'troop')} className={`px-4 py-2 border ${theme.border} ${theme.main} hover:bg-white/10 text-xs font-bold uppercase`}>Recruter</button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-600"><span className="text-6xl mb-4 opacity-20">⌖</span><p className="uppercase tracking-widest text-sm">Sélectionnez une flotte pour initialiser le lien.</p></div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}