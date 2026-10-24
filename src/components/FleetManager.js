"use client";

import { useState } from 'react';
import { db } from '../app/lib/firebase';
import { doc, updateDoc, addDoc, deleteDoc, collection, increment } from 'firebase/firestore';
import { SwButton, SwCell, SwFaction, SwIcon, SwInput, SwLabel, SwPanel, SwTabs, SwWindow } from './ui/Swtor';

// Icônes du pack SWTOR pour l'affichage (les emojis de SHIP_TYPES / TROOP_TYPES restent dans les données)
const UNIT_ICONS = {
    fighter: 'remotecontrolstarship',
    corvette: 'heatseekermissiles',
    frigate: 'missilesalvo',
    cruiser: 'orbitalbombardment',
    dreadnought: 'legacyorbitalstrike',
    infantry: 'blaster_generic',
    heavy_infantry: 'assault',
    vehicle: 'armorplating',
    air_support: 'deathfromabove',
};

// Titre de section : petites capitales + filet
const SectionTitle = ({ children }) => (
    <SwLabel as="h3" className="mb-4 border-b border-sw-border pb-1 text-sw-gold">{children}</SwLabel>
);

// Carte d'unité de la composition : case d'objet + compteur + puissance
const UnitCard = ({ unitKey, unit, count }) => (
    <SwPanel className="p-4 flex flex-col items-center justify-center relative overflow-hidden group hover:border-sw-accent transition-colors">
        <SwCell size={60} icon={UNIT_ICONS[unitKey]} className="mb-2 group-hover:scale-110 transition-transform" />
        <div className="text-2xl font-bold text-sw-text">{count}</div>
        <div className="text-[9px] uppercase text-sw-dim tracking-widest text-center">{unit.name}</div>
        <div className="absolute top-0 right-0 p-1 text-[8px] font-bold text-sw-accent-light">PWR: {unit.power * count}</div>
    </SwPanel>
);

// Ligne de production (chantier naval / caserne)
const BuildRow = ({ unitKey, unit, locked, costs, actionLabel, onBuild }) => (
    <div className={`sw-row flex justify-between items-center p-3 relative overflow-hidden ${locked ? 'opacity-60 grayscale' : ''}`}>
        {locked && <SwIcon name="key" size={72} className="absolute right-4 opacity-10 pointer-events-none" />}
        <div className="flex items-center gap-4">
            <SwCell size={52} icon={UNIT_ICONS[unitKey]} />
            <div>
                <div className="text-sm font-bold text-sw-text uppercase tracking-wide">{unit.name}</div>
                <div className="text-[10px] text-sw-dim">{unit.desc}</div>
                <div className="flex gap-3 mt-1 text-[9px] font-mono">{costs}</div>
            </div>
        </div>
        {locked ? (
            <div className="px-4 py-2 sw-panel-dark border-sw-error/60 text-sw-error text-[10px] font-bold uppercase">Technologie Requise</div>
        ) : (
            <SwButton size="sm" onClick={onBuild}>{actionLabel}</SwButton>
        )}
    </div>
);

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
        <SwFaction faction={userFaction} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <SwWindow
                title="Console Tactique"
                subtitle="Système de gestion de flotte v5.1"
                faction={userFaction}
                onClose={onClose}
                className="w-full max-w-6xl h-[85vh] overflow-hidden"
                bodyClassName="p-0 pt-0 flex overflow-hidden"
            >
                <div className="flex flex-grow overflow-hidden relative z-10">
                    {/* LISTE */}
                    <div className="w-1/4 border-r border-sw-border bg-sw-panel-dark/60 flex flex-col">
                        <SwLabel className="p-2 border-b border-sw-border text-center">Unités Déployées</SwLabel>
                        <div className="flex-grow overflow-y-auto sw-scroll p-2 space-y-1.5">
                            {fleets.filter(f => f.owner === userFaction).map(fleet => (
                                <button key={fleet.id} onClick={() => { setSelectedFleet(fleet); setViewMode('details'); }} data-active={selectedFleet?.id === fleet.id ? 'true' : undefined} className="sw-row w-full text-left p-3 flex items-center gap-3 group">
                                    <SwCell size={40} icon="remotecontrolstarship" />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="font-bold uppercase text-sm text-sw-accent-light truncate">{fleet.name}</span>
                                            {fleet.commander_id && <SwIcon name="claninsignia" size={16} title="Amiral assigné" />}
                                        </div>
                                        <div className="text-[10px] text-sw-dim mt-1">Loc: {fleet.location_name || 'Inconnu'}</div>
                                        <div className="text-[10px] text-sw-faint">Puissance: <span className="text-sw-gold">{getFleetPower(fleet)}</span></div>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <div className="p-3 border-t border-sw-border">
                            <SwInput as="select" className="text-xs !p-2" onChange={(e) => { if(e.target.value) createNewFleet(e.target.value); }} value="">
                                <option value="">+ Créer Nouvelle Flotte</option>
                                {planets.filter(p => p.owner === userFaction).map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                            </SwInput>
                        </div>
                    </div>

                    {/* DÉTAILS */}
                    <div className="flex-grow bg-black/40 flex flex-col relative min-w-0">
                        {selectedFleet ? (
                            <>
                                <div className="p-6 border-b border-sw-border flex justify-between items-start bg-gradient-to-b from-black/50 to-transparent">
                                    <div className="flex-grow">
                                        <h3 className="sw-title text-3xl">{selectedFleet.name}</h3>
                                        <div className="text-xs text-sw-dim mt-1 flex gap-4">
                                            <span>Position : <span className="text-sw-accent-light">{selectedFleet.location_name}</span></span>
                                            <span>Statut : <span className="text-sw-accent-light">{selectedFleet.status.toUpperCase()}</span></span>
                                        </div>
                                        <div className="mt-2 text-[10px] text-sw-error font-bold sw-panel-dark border-sw-error/50 px-2 py-1 inline-block">
                                            ENTRETIEN : -{getFleetUpkeep(selectedFleet).cr} CR / -{getFleetUpkeep(selectedFleet).mp} HOM
                                        </div>
                                    </div>

                                    {/* SECTION COMMANDANT */}
                                    <SwPanel dark className="p-3 w-64 ml-4">
                                        <SwLabel className="text-[9px] mb-1">Amiral en Chef</SwLabel>
                                        {selectedFleet.commander_id ? (
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-sw-gold flex items-center gap-1.5"><SwIcon name="claninsignia" size={18} /> {selectedFleet.commander_name}</span>
                                                <button onClick={() => assignCommander(null, null)} className="text-[10px] text-sw-error hover:underline">Révoquer</button>
                                            </div>
                                        ) : (
                                            <SwInput
                                                as="select"
                                                className="text-xs !p-1"
                                                onChange={(e) => {
                                                    const idx = e.target.selectedIndex;
                                                    if (idx > 0) assignCommander(availableAdmirals[idx-1].id, availableAdmirals[idx-1].pseudo);
                                                }}
                                            >
                                                <option value="">-- Assigner un Général --</option>
                                                {availableAdmirals.map(m => (
                                                    <option key={m.id} value={m.id}>{m.pseudo}</option>
                                                ))}
                                            </SwInput>
                                        )}
                                        {selectedFleet.commander_id && <div className="text-[9px] text-sw-success mt-1">+20% Puissance de Feu</div>}
                                    </SwPanel>
                                </div>

                                <div className="flex items-end gap-2 px-4 pt-3 pb-2 border-b border-sw-border">
                                    <SwTabs
                                        tabs={[
                                            { id: 'details', label: 'Composition', icon: 'datapad' },
                                            ...(selectedFleet.status !== 'moving' ? [{ id: 'build', label: 'Chantier Naval', icon: 'structuralbracing' }] : []),
                                        ]}
                                        value={viewMode}
                                        onChange={setViewMode}
                                    />

                                    <div className="ml-auto flex gap-2 items-center">
                                        <SwButton variant="danger" size="sm" onClick={deleteFleet}>Démanteler</SwButton>
                                        {selectedFleet.status !== 'moving' && <SwButton variant="accent" onClick={() => onSelectFleet(selectedFleet, 'move')}><SwIcon name="star_map" size={18} /> Ordre de Mouvement</SwButton>}
                                    </div>
                                </div>

                                <div className="flex-grow p-6 overflow-y-auto sw-scroll">
                                    {viewMode === 'details' && (
                                        <div className="space-y-8">
                                            {/* --- SECTION VAISSEAUX --- */}
                                            <div>
                                                <SectionTitle>Forces Spatiales</SectionTitle>
                                                <div className="grid grid-cols-4 gap-4">
                                                    {selectedFleet.composition && Object.entries(selectedFleet.composition).map(([type, count]) => {
                                                        if (count <= 0) return null;
                                                        const ship = SHIP_TYPES[type];
                                                        if (!ship) return null;
                                                        return (
                                                            <UnitCard key={type} unitKey={type} unit={ship} count={count} />
                                                        );
                                                    })}
                                                    {(!selectedFleet.composition || Object.values(selectedFleet.composition).every(v => v === 0)) && (<div className="col-span-4 text-center text-sw-faint italic text-xs">Aucun vaisseau assigné.</div>)}
                                                </div>
                                            </div>

                                            {/* --- SECTION TROUPES --- */}
                                            <div>
                                                <SectionTitle>Troupes Embarquées</SectionTitle>
                                                <div className="grid grid-cols-4 gap-4">
                                                    {selectedFleet.troops && Object.entries(selectedFleet.troops).map(([type, count]) => {
                                                        if (count <= 0) return null;
                                                        const troop = TROOP_TYPES[type];
                                                        if (!troop) return null;
                                                        return (
                                                            <UnitCard key={type} unitKey={type} unit={troop} count={count} />
                                                        );
                                                    })}
                                                    {(!selectedFleet.troops || Object.values(selectedFleet.troops).every(v => v === 0)) && (<div className="col-span-4 text-center text-sw-faint italic text-xs">Aucune troupe à bord.</div>)}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* --- CHANTIER NAVAL & CASERNE --- */}
                                    {viewMode === 'build' && (
                                        <>
                                            <div className="mb-4 border-b border-sw-border pb-2">
                                                <SwTabs
                                                    tabs={[
                                                        { id: 'ships', label: 'Vaisseaux', icon: 'remotecontrolstarship' },
                                                        { id: 'troops', label: 'Troupes', icon: 'assault' },
                                                    ]}
                                                    value={buildTab}
                                                    onChange={setBuildTab}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                {/* LISTE DES VAISSEAUX */}
                                                {buildTab === 'ships' && Object.entries(SHIP_TYPES).map(([key, ship]) => {
                                                    const isLocked = ship.tech_req && !unlockedTechs.includes(ship.tech_req);
                                                    return (
                                                        <BuildRow
                                                            key={key}
                                                            unitKey={key}
                                                            unit={ship}
                                                            locked={isLocked}
                                                            actionLabel="Construire"
                                                            onBuild={() => addUnitToFleet(key, 'ship')}
                                                            costs={<>
                                                                <span className="text-sw-error">ATK: {ship.power}</span>
                                                                <span className="text-sw-gold">CR: {ship.cost}</span>
                                                                <span className="text-sw-info">MAT: {ship.mat}</span>
                                                            </>}
                                                        />
                                                    );
                                                })}

                                                {/* LISTE DES TROUPES */}
                                                {buildTab === 'troops' && Object.entries(TROOP_TYPES).map(([key, troop]) => {
                                                    return (
                                                        <BuildRow
                                                            key={key}
                                                            unitKey={key}
                                                            unit={troop}
                                                            actionLabel="Recruter"
                                                            onBuild={() => addUnitToFleet(key, 'troop')}
                                                            costs={<>
                                                                <span className="text-sw-error">ATK: {troop.power}</span>
                                                                <span className="text-sw-gold">CR: {troop.cost}</span>
                                                                <span className="text-sw-success">MP: {troop.cost_mp}</span>
                                                            </>}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-sw-faint"><SwIcon name="star_map" size={80} className="mb-4 opacity-25" /><p className="sw-label uppercase tracking-widest text-sm">Sélectionnez une flotte pour initialiser le lien.</p></div>
                        )}
                    </div>
                </div>
            </SwWindow>
        </SwFaction>
    );
}
