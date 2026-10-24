import React, { useState, useEffect } from 'react';
import { db } from '../app/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { SwButton, SwCell, SwDivider, SwInput, SwLabel, SwPanel, SwWindow } from './ui/Swtor';

const EFFECT_ARCHETYPES = [
    { id: 'projectile', label: 'Projectile (Tir)', params: ['damage', 'range', 'speed', 'color', 'sprite'] },
    { id: 'explosion', label: 'Explosion (Zone)', params: ['damage', 'range', 'radius', 'color'] },
    { id: 'beam', label: 'Rayon (Laser/Eclair)', params: ['damage', 'range', 'color'] },
    { id: 'heal', label: 'Soin (Zone)', params: ['amount', 'radius', 'range', 'color'] },
    { id: 'life_drain', label: 'Absorption de Vie (Zone)', params: ['damage', 'radius', 'percent_heal', 'color'] },
    { id: 'push', label: 'Repoussement (Force Push)', params: ['force', 'radius', 'range', 'color'] },
    { id: 'lightning_storm', label: 'Tempête d\'Eclairs (Zone continue)', params: ['damage', 'radius', 'duration', 'interval', 'color'] },
    { id: 'buff', label: 'Buff (Stats)', params: ['stat', 'amount', 'duration'] },
    { id: 'summon', label: 'Invocation', params: ['unitId', 'count', 'duration'] },
    { id: 'dash', label: 'Mouvement (Saut/Dash)', params: ['range', 'speed'] }
];

// Icônes de pouvoirs de Force (pack SWTOR) : présentation uniquement
const DOMAIN_ICONS = ['force', 'forcestorm', 'lightningstorm', 'darkmeditation', 'callontheforce', 'force_crush', 'forcepush', 'chain_lightning', 'forcebarriersage'];

const ARCHETYPE_ICONS = {
    projectile: 'telekineticblast',
    explosion: 'fiery_explosion_6_0',
    beam: 'lightningstrike',
    heal: 'healing',
    life_drain: 'drain_life',
    push: 'forcepush',
    lightning_storm: 'lightningstorm',
    buff: 'forcefocus1',
    summon: 'summon1',
    dash: 'forcespeed'
};

const talentIcon = (t) => (t?.type === 'passive' ? 'callontheforce' : ARCHETYPE_ICONS[t?.archetype] || 'force');

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
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-10">
            <SwWindow
                title="Éditeur Magie"
                icon="forcestorm"
                onClose={onClose}
                className="w-full max-w-6xl h-[80vh]"
                bodyClassName="flex gap-4 overflow-hidden"
            >
                {/* LISTE DES DOMAINES */}
                <SwPanel dark className="w-1/4 p-3 flex flex-col gap-2 min-h-0">
                    <SwLabel className="text-sw-gold mb-1">Domaines</SwLabel>
                    <div className="overflow-y-auto sw-scroll flex-grow space-y-1 pr-1">
                        {domains.map((d, i) => (
                            <div
                                key={d.id}
                                onClick={() => setSelectedDomain(d)}
                                data-active={selectedDomain?.id === d.id ? 'true' : undefined}
                                className="sw-row p-1.5 pr-2 cursor-pointer flex items-center gap-2.5"
                                style={{ boxShadow: `inset 2px 0 0 ${d.color}` }}
                            >
                                <SwCell icon={DOMAIN_ICONS[i % DOMAIN_ICONS.length]} size={40} active={selectedDomain?.id === d.id} />
                                <div className="min-w-0">
                                    <div className={`font-bold text-sm flex items-center gap-2 truncate ${selectedDomain?.id === d.id ? 'text-sw-gold' : 'text-sw-text'}`}>
                                        <div className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-black/70" style={{backgroundColor: d.color}}></div>
                                        {d.label}
                                    </div>
                                    <div className="sw-label text-[9px] text-sw-faint truncate">{d.talents?.length || 0} Pouvoirs</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <SwButton variant="accent" onClick={handleCreateDomain} className="w-full">+ Nouveau Domaine</SwButton>
                    <SwButton onClick={onClose} className="mt-2 w-full">Fermer</SwButton>
                </SwPanel>

                {/* ÉDITEUR PRINCIPAL */}
                <SwPanel dark className="flex-grow p-6 flex flex-col overflow-y-auto sw-scroll min-h-0">
                    {selectedDomain ? (
                        <div className="space-y-6">
                            {/* Header Domain Config */}
                            <div className="grid grid-cols-2 gap-4 pb-6 border-b border-sw-border">
                                <div>
                                    <SwLabel as="label" className="block mb-1">Nom du Domaine</SwLabel>
                                    <SwInput value={selectedDomain.label} onChange={e => handleUpdateDomain(selectedDomain.id, { label: e.target.value })} />
                                </div>
                                <div>
                                    <SwLabel as="label" className="block mb-1">Couleur</SwLabel>
                                    <SwInput type="color" value={selectedDomain.color} onChange={e => handleUpdateDomain(selectedDomain.id, { color: e.target.value })} className="h-10 p-1 cursor-pointer" />
                                </div>
                                <div className="col-span-2">
                                    <SwLabel as="label" className="block mb-1">Description</SwLabel>
                                    <SwInput as="textarea" value={selectedDomain.desc} onChange={e => handleUpdateDomain(selectedDomain.id, { desc: e.target.value })} className="h-16 text-sm" />
                                </div>
                                <div className="col-span-2">
                                    <button onClick={() => handleDeleteDomain(selectedDomain.id)} className="text-sw-error text-xs underline hover:text-white cursor-pointer">Supprimer ce domaine définitivement</button>
                                </div>
                            </div>

                            {/* Talents List */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="sw-title text-lg">Pouvoirs &amp; Passifs</h3>
                                    <SwButton size="sm" variant="accent" onClick={() => setEditingTalent({ isNew: true, label: 'Nouveau Pouvoir', type: 'active', archetype: 'projectile', stats: { damage: 10, cost: 10 } })}>+ Ajouter</SwButton>
                                </div>
                                <SwDivider className="mb-4" />

                                <div className="grid grid-cols-2 gap-2">
                                    {selectedDomain.talents?.map(t => (
                                        <div key={t.id} className="sw-row p-2 flex justify-between items-center gap-3 group">
                                            <SwCell icon={talentIcon(t)} size={44} active={t.type === 'ultimate'} />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-sm text-sw-text truncate">{t.label} <span className={`text-[10px] uppercase ${t.type === 'ultimate' ? 'text-sw-gold' : t.type === 'passive' ? 'text-sw-faint' : 'text-sw-info'}`}>({t.type})</span></div>
                                                <div className="text-[10px] text-sw-dim truncate">{t.archetype} · {t.stats?.damage || 0} DMG · {t.stats?.cost || 0} Mana</div>
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                <button onClick={() => setEditingTalent({ ...t, isNew: false })} className="text-sw-gold hover:text-white cursor-pointer" title="Éditer">✎</button>
                                                <button onClick={() => handleDeleteTalent(t.id)} className="text-sw-error hover:text-white cursor-pointer" title="Supprimer">✕</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center gap-3 select-none">
                             <SwCell icon="force" size={88} className="opacity-60" />
                             <span className="sw-label text-sw-faint tracking-widest">Sélectionnez ou créez un domaine</span>
                        </div>
                    )}
                </SwPanel>
            </SwWindow>

            {/* MODAL ÉDITION POUVOIR */}
            {editingTalent && (
                <div className="absolute inset-0 z-[160] bg-black/70 backdrop-blur-sm flex items-center justify-center">
                    <SwWindow
                        title="Éditer Pouvoir"
                        icon={talentIcon(editingTalent)}
                        onClose={() => setEditingTalent(null)}
                        className="w-[500px] max-h-[90vh]"
                        bodyClassName="space-y-4 overflow-y-auto sw-scroll"
                    >
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <SwLabel as="label" className="text-[10px]">Nom</SwLabel>
                                <SwInput value={editingTalent.label} onChange={e => setEditingTalent(p => ({...p, label: e.target.value}))} />
                            </div>
                             <div>
                                <SwLabel as="label" className="text-[10px]">Type</SwLabel>
                                <SwInput as="select" value={editingTalent.type} onChange={e => setEditingTalent(p => ({...p, type: e.target.value}))}>
                                    <option value="active">Actif</option>
                                    <option value="passive">Passif</option>
                                    <option value="ultimate">Ultime</option>
                                </SwInput>
                            </div>
                             <div>
                                <SwLabel as="label" className="text-[10px]">Rang Requis</SwLabel>
                                <SwInput type="number" value={editingTalent.rank || 1} onChange={e => setEditingTalent(p => ({...p, rank: parseInt(e.target.value)}))} />
                            </div>
                            <div className="col-span-2">
                                <SwLabel as="label" className="text-[10px]">Description</SwLabel>
                                <SwInput value={editingTalent.desc} onChange={e => setEditingTalent(p => ({...p, desc: e.target.value}))} />
                            </div>
                        </div>

                        {editingTalent.type !== 'passive' && (
                            <div className="space-y-3 border-t border-sw-border pt-3">
                                <div>
                                    <SwLabel as="label" className="text-[10px] text-sw-gold">Archetype d&apos;Effet</SwLabel>
                                    <SwInput as="select" value={editingTalent.archetype} onChange={e => setEditingTalent(p => ({...p, archetype: e.target.value}))} className="border-sw-gold-dim text-sw-gold">
                                        {EFFECT_ARCHETYPES.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                                    </SwInput>
                                </div>
                                <SwPanel className="grid grid-cols-2 gap-2 p-2">
                                    <div><SwLabel as="label" className="text-[9px]">Coût Mana</SwLabel><SwInput type="number" value={editingTalent.stats?.cost || 0} onChange={e => setEditingTalent(p => ({...p, stats: {...p.stats, cost: parseInt(e.target.value)}}))} className="p-1 text-xs" /></div>
                                    <div><SwLabel as="label" className="text-[9px]">Cooldown (s)</SwLabel><SwInput type="number" value={editingTalent.stats?.cooldown || 0} onChange={e => setEditingTalent(p => ({...p, stats: {...p.stats, cooldown: parseInt(e.target.value)}}))} className="p-1 text-xs" /></div>

                                    {EFFECT_ARCHETYPES.find(a => a.id === editingTalent.archetype)?.params.map(param => (
                                        <div key={param}>
                                            <SwLabel as="label" className="text-[9px] text-sw-info">{param}</SwLabel>
                                            <SwInput
                                                type={param === 'color' ? 'color' : 'text'}
                                                value={editingTalent.stats?.[param] || (param === 'color' ? '#ffffff' : '')}
                                                onChange={e => setEditingTalent(p => ({...p, stats: {...p.stats, [param]: e.target.value}}))}
                                                className={`p-1 text-xs ${param === 'color' ? 'h-7 cursor-pointer' : ''}`}
                                            />
                                        </div>
                                    ))}
                                </SwPanel>
                            </div>
                        )}

                        <div className="flex gap-2 pt-2">
                             <SwButton onClick={() => setEditingTalent(null)} className="flex-1">Annuler</SwButton>
                             <SwButton variant="accent" onClick={() => handleSaveTalent(editingTalent)} className="flex-1">Sauvegarder</SwButton>
                        </div>
                    </SwWindow>
                </div>
            )}
        </div>
    );
}
