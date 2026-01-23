import React, { useState, useEffect } from 'react';
import { db } from '../app/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const EFFECT_ARCHETYPES = [
    { id: 'projectile', label: 'Projectile (Tir)', params: ['damage', 'range', 'speed', 'color', 'sprite'] },
    { id: 'explosion', label: 'Explosion (Zone)', params: ['damage', 'range', 'radius', 'color'] },
    { id: 'beam', label: 'Rayon (Laser/Eclair)', params: ['damage', 'range', 'color'] },
    { id: 'heal', label: 'Soin (Zone)', params: ['amount', 'radius', 'range'] },
    { id: 'buff', label: 'Buff (Stats)', params: ['stat', 'amount', 'duration'] },
    { id: 'summon', label: 'Invocation', params: ['unitId', 'count', 'duration'] },
    { id: 'dash', label: 'Mouvement (Saut/Dash)', params: ['range', 'speed'] }
];

export default function MagicManager({ onClose }) {
    const [domains, setDomains] = useState([]);
    const [selectedDomain, setSelectedDomain] = useState(null);
    const [editingTalent, setEditingTalent] = useState(null);

    // Live Subscription
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'magic_domains'), (snap) => {
            const loaded = snap.docs.map(d => ({ ...d.data(), id: d.id }));
            setDomains(loaded);
            
            // Update selected if modified
            if (selectedDomain) {
                const updatedSel = loaded.find(d => d.id === selectedDomain.id);
                if (updatedSel) setSelectedDomain(updatedSel);
            }
        });
        return () => unsub();
    }, [selectedDomain?.id]); // Re-bind if selected ID changes to ensure closures are fresh (though map search handles it)

    const handleCreateDomain = async () => {
        const newDomain = {
            label: "Nouveau Domaine",
            desc: "Description du domaine...",
            color: "#ffffff",
            talents: []
        };
        await addDoc(collection(db, 'magic_domains'), newDomain);
        // State update handled by onSnapshot
    };

    const handleUpdateDomain = async (id, data) => {
        await updateDoc(doc(db, 'magic_domains', id), data);
    };

    const handleDeleteDomain = async (id) => {
        if(!confirm("Supprimer ce domaine ?")) return;
        await deleteDoc(doc(db, 'magic_domains', id));
        setSelectedDomain(null);
    };

    const handleSaveTalent = async (talent) => {
        if (!selectedDomain) return;
        let newTalents = [...(selectedDomain.talents || [])];
        
        if (talent.isNew) {
             const { isNew, ...talentData } = talent;
             newTalents.push({ ...talentData, id: `t_${Date.now()}` });
        } else {
             const idx = newTalents.findIndex(t => t.id === talent.id);
             if (idx >= 0) newTalents[idx] = talent;
        }
        
        await handleUpdateDomain(selectedDomain.id, { talents: newTalents });
        setEditingTalent(null);
    };

    const handleDeleteTalent = async (talentId) => {
        if (!selectedDomain) return;
        const newTalents = selectedDomain.talents.filter(t => t.id !== talentId);
        await handleUpdateDomain(selectedDomain.id, { talents: newTalents });
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-10">
            <div className="bg-gray-900 border border-purple-500 w-full max-w-6xl h-[80vh] flex shadow-2xl rounded text-white overflow-hidden">
                {/* LISTE DES DOMAINES */}
                <div className="w-1/4 bg-black/50 border-r border-gray-800 p-4 flex flex-col gap-2">
                    <h2 className="text-xl font-bold text-purple-400 uppercase tracking-widest mb-4">Domaines</h2>
                    <div className="overflow-y-auto flex-grow space-y-2">
                        {domains.map(d => (
                            <div key={d.id} onClick={() => setSelectedDomain(d)} className={`p-3 border rounded cursor-pointer transition ${selectedDomain?.id === d.id ? 'bg-purple-900/30 border-purple-500' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}>
                                <div className="font-bold flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: d.color}}></div>
                                    {d.label}
                                </div>
                                <div className="text-[10px] text-gray-400 truncate">{d.talents?.length || 0} Pouvoirs</div>
                            </div>
                        ))}
                    </div>
                    <button onClick={handleCreateDomain} className="w-full py-2 bg-purple-700 hover:bg-purple-600 font-bold uppercase text-xs rounded">+ Nouveau Domaine</button>
                    <button onClick={onClose} className="mt-2 w-full py-2 border border-gray-600 hover:bg-gray-800 text-gray-400 font-bold uppercase text-xs rounded">Fermer</button>
                </div>

                {/* ÉDITEUR PRINCIPAL */}
                <div className="flex-grow p-6 flex flex-col bg-[#111] overflow-y-auto">
                    {selectedDomain ? (
                        <div className="space-y-6">
                            {/* Header Domain Config */}
                            <div className="grid grid-cols-2 gap-4 border-b border-gray-800 pb-6">
                                <div>
                                    <label className="text-xs uppercase text-gray-500 block mb-1">Nom du Domaine</label>
                                    <input value={selectedDomain.label} onChange={e => handleUpdateDomain(selectedDomain.id, { label: e.target.value })} className="w-full bg-black border border-gray-700 p-2 text-white" />
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-gray-500 block mb-1">Couleur</label>
                                    <input type="color" value={selectedDomain.color} onChange={e => handleUpdateDomain(selectedDomain.id, { color: e.target.value })} className="w-full h-10 bg-black border border-gray-700 cursor-pointer" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs uppercase text-gray-500 block mb-1">Description</label>
                                    <textarea value={selectedDomain.desc} onChange={e => handleUpdateDomain(selectedDomain.id, { desc: e.target.value })} className="w-full h-16 bg-black border border-gray-700 p-2 text-white text-sm" />
                                </div>
                                <div className="col-span-2">
                                    <button onClick={() => handleDeleteDomain(selectedDomain.id)} className="text-red-500 text-xs underline hover:text-red-400">Supprimer ce domaine définitivement</button>
                                </div>
                            </div>

                            {/* Talents List */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-blue-400 uppercase">Pouvoirs & Passifs</h3>
                                    <button onClick={() => setEditingTalent({ isNew: true, label: 'Nouveau Pouvoir', type: 'active', archetype: 'projectile', stats: { damage: 10, cost: 10 } })} className="px-3 py-1 bg-blue-900 hover:bg-blue-700 text-xs font-bold uppercase rounded border border-blue-500">+ Ajouter</button>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    {selectedDomain.talents?.map(t => (
                                        <div key={t.id} className="bg-[#1a1a1a] p-3 rounded border border-gray-800 flex justify-between items-center group">
                                            <div>
                                                <div className="font-bold text-sm text-gray-200">{t.label} <span className="text-[10px] text-gray-500 uppercase">({t.type})</span></div>
                                                <div className="text-[10px] text-gray-400">{t.archetype} • {t.stats?.damage || 0} DMG • {t.stats?.cost || 0} Mana</div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setEditingTalent({ ...t, isNew: false })} className="text-yellow-500 hover:text-white">✎</button>
                                                <button onClick={() => handleDeleteTalent(t.id)} className="text-red-500 hover:text-white">✕</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600">
                             <span className="text-4xl text-gray-700 mb-2">⚡</span>
                             <span className="uppercase tracking-widest font-bold">Sélectionnez ou créez un domaine</span>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL ÉDITION POUVOIR */}
            {editingTalent && (
                <div className="absolute inset-0 z-[160] bg-black/80 flex items-center justify-center">
                    <div className="bg-gray-900 border border-blue-500 p-6 rounded shadow-2xl w-[500px] space-y-4">
                        <h3 className="text-blue-400 font-bold uppercase text-center border-b border-gray-800 pb-2">Éditer Pouvoir</h3>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className="text-[10px] text-gray-500 uppercase">Nom</label>
                                <input value={editingTalent.label} onChange={e => setEditingTalent(p => ({...p, label: e.target.value}))} className="w-full bg-black border border-gray-700 p-2 text-white" />
                            </div>
                             <div>
                                <label className="text-[10px] text-gray-500 uppercase">Type</label>
                                <select value={editingTalent.type} onChange={e => setEditingTalent(p => ({...p, type: e.target.value}))} className="w-full bg-black border border-gray-700 p-2 text-white">
                                    <option value="active">Actif</option>
                                    <option value="passive">Passif</option>
                                    <option value="ultimate">Ultime</option>
                                </select>
                            </div>
                             <div>
                                <label className="text-[10px] text-gray-500 uppercase">Rang Requis</label>
                                <input type="number" value={editingTalent.rank || 1} onChange={e => setEditingTalent(p => ({...p, rank: parseInt(e.target.value)}))} className="w-full bg-black border border-gray-700 p-2 text-white" />
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] text-gray-500 uppercase">Description</label>
                                <input value={editingTalent.desc} onChange={e => setEditingTalent(p => ({...p, desc: e.target.value}))} className="w-full bg-black border border-gray-700 p-2 text-white" />
                            </div>
                        </div>

                        {editingTalent.type !== 'passive' && (
                            <div className="space-y-3 border-t border-gray-800 pt-3">
                                <div>
                                    <label className="text-[10px] text-yellow-500 uppercase font-bold">Archetype d'Effet</label>
                                    <select value={editingTalent.archetype} onChange={e => setEditingTalent(p => ({...p, archetype: e.target.value}))} className="w-full bg-black border border-yellow-800 text-yellow-500 p-2">
                                        {EFFECT_ARCHETYPES.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-2 bg-black/30 p-2 rounded">
                                    <div><label className="text-[9px] text-gray-500 uppercase">Coût Mana</label><input type="number" value={editingTalent.stats?.cost || 0} onChange={e => setEditingTalent(p => ({...p, stats: {...p.stats, cost: parseInt(e.target.value)}}))} className="w-full bg-black border border-gray-700 p-1 text-white text-xs" /></div>
                                    <div><label className="text-[9px] text-gray-500 uppercase">Cooldown (s)</label><input type="number" value={editingTalent.stats?.cooldown || 0} onChange={e => setEditingTalent(p => ({...p, stats: {...p.stats, cooldown: parseInt(e.target.value)}}))} className="w-full bg-black border border-gray-700 p-1 text-white text-xs" /></div>
                                    
                                    {EFFECT_ARCHETYPES.find(a => a.id === editingTalent.archetype)?.params.map(param => (
                                        <div key={param}>
                                            <label className="text-[9px] text-blue-400 uppercase">{param}</label>
                                            <input 
                                                type={param === 'color' ? 'color' : 'text'} 
                                                value={editingTalent.stats?.[param] || (param === 'color' ? '#ffffff' : '')} 
                                                onChange={e => setEditingTalent(p => ({...p, stats: {...p.stats, [param]: e.target.value}}))} 
                                                className={`w-full bg-black border border-gray-700 p-1 text-white text-xs ${param === 'color' ? 'h-6' : ''}`} 
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2 pt-2">
                             <button onClick={() => setEditingTalent(null)} className="flex-1 py-2 text-gray-400 text-xs font-bold uppercase border border-gray-700 hover:bg-gray-800">Annuler</button>
                             <button onClick={() => handleSaveTalent(editingTalent)} className="flex-1 py-2 bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold uppercase">Sauvegarder</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
