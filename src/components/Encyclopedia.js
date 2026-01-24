"use client";

import { useState, useMemo } from 'react';

const TALENT_POOLS = {
    dark: {
        label: "Côté Obscur",
        desc: "La voie de la passion, de la domination et de la destruction.",
        color: "#ef4444", // Red for Sith
        icon: "⚡",
        talents: [
            { label: 'Corruption', desc: 'Draine 20 PV ennemis (Passif)', rank: 1, type: 'passive' },
            { label: 'Haine', desc: '+10% Dégâts Force (Passif)', rank: 2, type: 'passive' },
            { label: 'Éclair', desc: 'Active: Dégâts directs', rank: 2, type: 'active' },
            { label: 'Siphon', desc: 'Vol de vie 10% (Passif)', rank: 3, type: 'passive' },
            { label: 'Terreur', desc: 'Aura: -15 Moral (Passif)', rank: 3, type: 'passive' },
            { label: 'Tempête', desc: 'Active: Dégâts Zone', rank: 3, type: 'active' },
            { label: 'Seigneur Sith', desc: 'Ultime: +20% Stats Obscur', rank: 4, type: 'ultimate' }
        ]
    },
    light: {
        label: "Côté Lumineux",
        desc: "La voie de la sérénité, de la protection et de l'harmonie.",
        color: "#3b82f6", // Blue for Jedi
        icon: "✨",
        talents: [
            { label: 'Méditation', desc: 'Régénération Mana +10% (Passif)', rank: 1, type: 'passive' },
            { label: 'Sérénité', desc: 'Coût Mana -10% (Passif)', rank: 2, type: 'passive' },
            { label: 'Guérison', desc: 'Active: Soin allié', rank: 2, type: 'active' },
            { label: 'Aura', desc: 'Défense alliés +15% (Passif)', rank: 3, type: 'passive' },
            { label: 'Protection', desc: 'Bouclier de Force (Passif)', rank: 3, type: 'passive' },
            { label: 'Onde Paix', desc: 'Active: Repousse ennemis', rank: 3, type: 'active' },
            { label: 'Avatar Force', desc: 'Ultime: Soin de masse', rank: 4, type: 'ultimate' }
        ]
    },
    mandalorian: {
        label: "Mandalorien",
        desc: "La voie de l'honneur, de la technologie et de la puissance de feu.",
        color: "#f59e0b", // Orange/Gold
        icon: "🎯",
        talents: [
            { label: 'Beskar', desc: 'Armure +50 (Passif)', rank: 1, type: 'passive' },
            { label: 'Viseur', desc: 'Précision +15% (Passif)', rank: 2, type: 'passive' },
            { label: 'Arsenal', desc: 'Active: Missiles', rank: 2, type: 'active' },
            { label: 'Bouclier', desc: 'Résist. Explosifs 25% (Passif)', rank: 3, type: 'passive' },
            { label: 'Jetpack', desc: 'Mobilité Aérienne (Passif)', rank: 3, type: 'passive' },
            { label: 'Pyro', desc: 'Active: Lance-flammes', rank: 3, type: 'active' },
            { label: 'Mand\'alor', desc: 'Ultime: Appel Renforts', rank: 4, type: 'ultimate' }
        ]
    }
};

const UNIT_INFO = {
    infantry: { label: 'Infanterie Standard', desc: 'Unité de base polyvalente.', stats: { hp: 15, dmg: 3, range: 80, speed: 1.5, type: 'Bio' } },
    heavy_infantry: { label: 'Infanterie Lourde', desc: 'Unité d\'élite avec armure lourde.', stats: { hp: 40, dmg: 10, range: 120, speed: 1, type: 'Bio/Méca' } },
    vehicle: { label: 'Blindé Léger', desc: 'Véhicule de soutien rapide.', stats: { hp: 120, dmg: 35, range: 200, speed: 2.5, type: 'Méca' } },
    turret: { label: 'Tourelle Défensive', desc: 'Structure statique à haute puissance de feu.', stats: { hp: 250, dmg: 40, range: 300, speed: 0, type: 'Structure' } },
    jedi_general: { label: 'Général Jedi', desc: 'Héros commandant utilisant la Force Lumineuse.', stats: { hp: 450, dmg: 60, range: 40, speed: 2.2, type: 'Héros' } },
    sith_lord: { label: 'Seigneur Sith', desc: 'Héros commandant utilisant le Côté Obscur.', stats: { hp: 450, dmg: 70, range: 40, speed: 2.2, type: 'Héros' } },
    mandalorian_commander: { label: 'Commandant Mandalorien', desc: 'Héros tacticien équipé de gadgets avancés.', stats: { hp: 400, dmg: 50, range: 100, speed: 2.0, type: 'Héros' } }
};

const BUILDING_CATEGORY_LABELS = {
    economic: "Économie",
    military: "Militaire",
    orbital: "Orbital",
    force: "Ordre & Culte",
    unique: "Merveille",
    unknown: "Autre"
};

export default function Encyclopedia({ onClose, userFaction, magicDomains, buildingsTemplates = [] }) {
    const [tab, setTab] = useState('units'); // 'units' | 'magic' | 'buildings'
    const [selectedItem, setSelectedItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortKey, setSortKey] = useState("name"); // 'name', 'cost', 'power'
    const [sortOrder, setSortOrder] = useState("asc"); // 'asc', 'desc'

    // --- THEME COLORS BASED ON FACTION ---
    const theme = useMemo(() => {
        if (userFaction === 'empire') return { 
            primary: 'text-red-500', border: 'border-red-500', shadow: 'shadow-red-500/20', bg_gradient: 'from-red-900/40', accent: '#ef4444' 
        };
        if (userFaction === 'republic') return { 
            primary: 'text-blue-500', border: 'border-blue-500', shadow: 'shadow-blue-500/20', bg_gradient: 'from-blue-900/40', accent: '#3b82f6' 
        };
        return { 
            primary: 'text-cyan-400', border: 'border-cyan-500', shadow: 'shadow-cyan-500/20', bg_gradient: 'from-cyan-900/40', accent: '#22d3ee' 
        };
    }, [userFaction]);

    const allMagicDomains = [
        ...Object.values(TALENT_POOLS).map((d, i) => ({ ...d, id: `base_${i}` })),
        ...(magicDomains || [])
    ];

    const sortItems = (items, type) => {
        return [...items].sort((a, b) => {
            let valA, valB;
            if (sortKey === 'name') {
                valA = (type === 'unit' ? a[1].label : type === 'magic' ? a.label : a.name) || "";
                valB = (type === 'unit' ? b[1].label : type === 'magic' ? b.label : b.name) || "";
                return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            if (sortKey === 'cost') {
                valA = type === 'building' ? (a.cost || 0) : 0;
                valB = type === 'building' ? (b.cost || 0) : 0;
            }
            if (sortKey === 'power') {
                valA = type === 'unit' ? (a[1].stats?.dmg || 0) : 0;
                valB = type === 'unit' ? (b[1].stats?.dmg || 0) : 0;
            }
            return sortOrder === 'asc' ? valA - valB : valB - valA;
        });
    };

    const filteredUnits = sortItems(Object.entries(UNIT_INFO).filter(([key, u]) => u.label.toLowerCase().includes(searchTerm.toLowerCase())), 'unit');
    const filteredMagic = sortItems(allMagicDomains.filter(d => d.label.toLowerCase().includes(searchTerm.toLowerCase())), 'magic');
    
    // Group Buildings
    const groupedBuildings = useMemo(() => {
        let filtered = buildingsTemplates.filter(b => (b.name || "").toLowerCase().includes(searchTerm.toLowerCase()));
        
        // Sort first
        filtered.sort((a, b) => {
             if (sortKey === 'name') {
                return sortOrder === 'asc' ? (a.name || "").localeCompare(b.name || "") : (b.name || "").localeCompare(a.name || "");
             }
             if (sortKey === 'cost') {
                 return sortOrder === 'asc' ? (a.cost || 0) - (b.cost || 0) : (b.cost || 0) - (a.cost || 0);
             }
             return 0; // Default or other Sorts
        });

        const grouped = {};
        filtered.forEach(b => {
            const cat = b.category || 'unknown';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(b);
        });
        return grouped;
    }, [buildingsTemplates, searchTerm, sortKey, sortOrder]);

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 font-sans p-8 perspective-1000">
            {/* HOLOGRAM CONTAINER */}
            <div className={`w-[1200px] h-[800px] bg-[#050508] border border-opacity-50 flex flex-col relative overflow-hidden rounded-xl shadow-2xl ${theme.border} ${theme.shadow}`}>
                
                {/* SCANLINES & GRID OVERLAY */}
                <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none opacity-20"></div>
                <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none mix-blend-screen"></div>
                
                {/* HEADER */}
                <div className="relative z-10 bg-black/60 border-b border-gray-800 p-6 flex justify-between items-center backdrop-blur-md">
                    <div className="flex items-center gap-6">
                        <div className={`w-16 h-16 rounded-lg ${theme.border} border-2 flex items-center justify-center bg-black/50 shadow-[0_0_15px_rgba(0,0,0,0.5)]`}>
                            <span className="text-4xl filter drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">💾</span>
                        </div>
                        <div>
                            <h2 className={`text-4xl font-bold uppercase tracking-widest ${theme.primary} drop-shadow-md`}>Archives</h2>
                            <div className="flex items-center gap-2 text-xs font-mono text-gray-400 mt-1">
                                <span className="animate-pulse">●</span>
                                <span>CONNEXION SÉCURISÉE ÉTABLIE</span>
                                <span className="text-gray-600">|</span>
                                <span>ACCÈS NIVEAU 5</span>
                            </div>
                        </div>
                    </div>
                    
                        {/* SEARCH & SORT */}
                        <div className="flex items-center gap-2">
                            <div className="relative group">
                                <input 
                                    type="text" 
                                    placeholder="Rechercher..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={`bg-black/40 border border-gray-700 text-gray-300 text-[10px] rounded px-3 py-1 w-40 focus:outline-none focus:border-${theme.accent} transition-all uppercase font-mono tracking-wider`}
                                />
                            </div>

                            <select 
                                value={sortKey} 
                                onChange={(e) => setSortKey(e.target.value)} 
                                className="bg-black/40 border border-gray-700 text-gray-300 text-[10px] rounded px-2 py-1 focus:outline-none uppercase font-mono"
                            >
                                <option value="name">Nom</option>
                                <option value="cost">Coût</option>
                                {tab === 'units' && <option value="power">Puissance</option>}
                            </select>

                            <button 
                                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                className="bg-black/40 border border-gray-700 text-gray-300 w-6 h-6 flex items-center justify-center rounded hover:bg-white/10"
                            >
                                {sortOrder === 'asc' ? '⬆️' : '⬇️'}
                            </button>

                            <button 
                                onClick={onClose} 
                                className={`w-8 h-8 rounded-full border border-gray-700 hover:bg-red-900/30 hover:border-red-500 text-gray-400 hover:text-red-400 flex items-center justify-center transition-all duration-300 ml-2`}
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                {/* CONTENT AREA */}
                <div className="flex-grow flex relative z-10 overflow-hidden">
                    
                    {/* SIDEBAR NAVIGATION */}
                    <div className="w-80 bg-black/40 border-r border-gray-800/50 flex flex-col backdrop-blur-sm">
                        
                        {/* TABS */}
                        <div className="flex p-2 gap-2 bg-black/40">
                            {[
                                { id: 'units', icon: '🛡️', label: 'Unités' },
                                { id: 'buildings', icon: '🏗️', label: 'Bâtiments' },
                                { id: 'magic', icon: '✨', label: 'Force & Tech' }
                            ].map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => { setTab(t.id); setSelectedItem(null); setSearchTerm(""); }}
                                    className={`flex-1 flex flex-col items-center justify-center p-3 rounded transition-all duration-300 border border-transparent
                                        ${tab === t.id 
                                            ? `bg-gray-800 ${theme.border} text-white shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]` 
                                            : 'bg-transparent hover:bg-gray-800/50 text-gray-500'}`}
                                >
                                    <span className="text-xl mb-1 dark:drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">{t.icon}</span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest">{t.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* NAV LIST */}
                        <div className="flex-grow overflow-y-auto custom-scrollbar p-3 space-y-2">
                             {tab === 'units' ? (
                                filteredUnits.map(([key, unit]) => (
                                    <div 
                                        key={key} 
                                        onClick={() => setSelectedItem({ id: key, ...unit })}
                                        className={`p-3 rounded border border-l-4 cursor-pointer transition-all group relative overflow-hidden
                                            ${selectedItem?.id === key 
                                                ? `bg-gradient-to-r ${theme.bg_gradient} to-transparent ${theme.border} text-white border-l-current` 
                                                : 'bg-[#121212] border-gray-800 border-l-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                                            }`}
                                    >
                                        <div className="flex justify-between items-center relative z-10">
                                            <span className="font-bold text-sm tracking-wide">{unit.label}</span>
                                            <span className="text-[10px] bg-black/50 px-2 py-0.5 rounded border border-gray-700 font-mono">{unit.stats.type}</span>
                                        </div>
                                    </div>
                                ))
                             ) : tab === 'buildings' ? (
                                Object.entries(groupedBuildings).map(([category, buildings]) => (
                                    <div key={category} className="mb-4">
                                        <div className="text-[10px] uppercase font-bold text-gray-500 mb-2 pl-2 border-b border-gray-800 pb-1 sticky top-0 bg-[#050508] z-20">
                                            {BUILDING_CATEGORY_LABELS[category] || category}
                                        </div>
                                        {buildings.map((building) => (
                                            <div 
                                                key={building.id} 
                                                onClick={() => setSelectedItem({ ...building, type: 'building' })}
                                                className={`p-3 mb-1 rounded border border-l-4 cursor-pointer transition-all group relative overflow-hidden
                                                    ${selectedItem?.id === building.id 
                                                        ? `bg-gradient-to-r ${theme.bg_gradient} to-transparent ${theme.border} text-white border-l-current` 
                                                        : 'bg-[#121212] border-gray-800 border-l-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-center relative z-10">
                                                    <span className="font-bold text-sm tracking-wide">{building.name}</span>
                                                    <span className="text-[10px] bg-black/50 px-2 py-0.5 rounded border border-gray-700 font-mono">NIV {building.level || 1}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))
                             ) : (
                                filteredMagic.map((domain) => (
                                    <div 
                                        key={domain.id} 
                                        onClick={() => setSelectedItem({ ...domain, type: 'domain' })}
                                        className={`p-3 rounded border border-l-4 cursor-pointer transition-all group relative overflow-hidden
                                            ${selectedItem?.id === domain.id 
                                                ? `bg-gradient-to-r from-[${domain.color}]/10 to-transparent border-[${domain.color}] text-white` 
                                                : 'bg-[#121212] border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                                            }`}
                                        style={selectedItem?.id === domain.id ? { borderColor: domain.color, backgroundColor: `${domain.color}11` } : { borderLeftColor: domain.color }}
                                    >
                                        <div className="flex justify-between items-center relative z-10">
                                            <span className="font-bold text-sm tracking-wide" style={{color: domain.color}}>{domain.label}</span>
                                            <span className="text-xs">{domain.icon}</span>
                                        </div>
                                        <div className="relative z-10 text-[10px] text-gray-600 uppercase mt-1 truncate">{domain.talents?.length || 0} Pouvoirs disponibles</div>
                                    </div>
                                ))
                             )}
                        </div>
                    </div>

                    {/* MAIN DISPLAY */}
                    <div className="flex-grow p-8 bg-black/60 relative overflow-hidden flex flex-col">
                        {/* Background Grid for main area */}
                        <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none"></div>

                        {selectedItem ? (
                            <div className="relative z-10 animate-in slide-in-from-bottom-4 duration-500 flex flex-col h-full">
                                {selectedItem.type === 'domain' ? (
                                    <>
                                        {/* DOMAIN HEADER */}
                                        <div className="flex items-end gap-4 mb-4 border-b border-gray-800 pb-4">
                                            <div className="w-20 h-20 rounded-lg flex items-center justify-center border-2 bg-black/50 shadow-lg text-5xl" style={{borderColor: selectedItem.color, color: selectedItem.color}}>
                                                {selectedItem.icon || "🔮"}
                                            </div>
                                            <div>
                                                <h3 className="text-4xl font-bold uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400" style={{textShadow: `0 0 20px ${selectedItem.color}`}}>
                                                    {selectedItem.label}
                                                </h3>
                                                <p className="text-gray-400 font-mono text-sm max-w-2xl mt-1">{selectedItem.desc}</p>
                                            </div>
                                        </div>

                                        {/* TALENTS GRID */}
                                        <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 mt-4">
                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                <span className="bg-gray-700 w-8 h-[1px]"></span>
                                                Arbre de Talents
                                                <span className="bg-gray-700 flex-grow h-[1px]"></span>
                                            </h4>
                                            
                                            <div className="grid grid-cols-2 gap-4">
                                                {selectedItem.talents.map((t, idx) => (
                                                    <div key={idx} className="relative group bg-gray-900/50 border border-gray-800 p-4 rounded hover:border-gray-500 hover:bg-gray-800/80 transition-all flex gap-4 overflow-hidden">
                                                        <div className="absolute top-0 right-0 p-1">
                                                            <div className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded border ${
                                                                t.type === 'passive' ? 'border-gray-600 text-gray-500' : 
                                                                (t.type === 'ultimate' ? 'border-yellow-600 text-yellow-500' : 'border-blue-600 text-blue-500')
                                                            }`}>
                                                                {t.type || 'Inconnu'}
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col items-center justify-center w-12 h-12 rounded border bg-black shrink-0 relative z-10" style={{borderColor: selectedItem.color}}>
                                                            <span className="text-lg font-bold text-white">{t.rank}</span>
                                                            <span className="text-[8px] text-gray-500 uppercase">Rang</span>
                                                        </div>
                                                        
                                                        <div className="relative z-10">
                                                            <div className="font-bold text-gray-200 uppercase tracking-wide group-hover:text-white transition-colors">{t.label}</div>
                                                            <div className="text-sm text-gray-400 mt-1">{t.desc}</div>
                                                        </div>

                                                        <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-white/5 to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                ) : selectedItem.type === 'building' ? (
                                    <div className="flex flex-col h-full animate-in fade-in duration-300">
                                        <div className="flex justify-between items-start border-b border-gray-800 pb-6 mb-6">
                                            <div>
                                                <div className="text-[10px] font-mono text-[#cba660] mb-1 flex items-center gap-2">
                                                    <span className="animate-pulse">🏗️</span>
                                                    INFRASTRUCTURE C.E.O.
                                                </div>
                                                <h3 className={`text-4xl font-bold uppercase tracking-tight text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]`}>
                                                    {selectedItem.name} 
                                                    {selectedItem.parentName && <span className="text-gray-500 text-2xl ml-4">({selectedItem.parentName})</span>}
                                                </h3>
                                                <div className="flex gap-2 mt-3">
                                                    {selectedItem.parentName && (
                                                       <button 
                                                            onClick={(e) => { e.stopPropagation(); const parent = buildingsTemplates.find(b => b.id === selectedItem.parentId); if(parent) setSelectedItem({...parent, type: 'building'}); }} 
                                                            className="px-2 py-1 bg-red-900/40 text-red-300 rounded text-[10px] font-bold border border-red-700 uppercase hover:bg-red-900/60"
                                                       >
                                                            &lt; Retour Niveau 1
                                                       </button>
                                                    )}
                                                    <span className="px-2 py-1 bg-gray-800 rounded text-[10px] font-bold text-gray-400 border border-gray-700 uppercase">{selectedItem.category || 'Général'}</span>
                                                    <span className="px-2 py-1 bg-gray-800 rounded text-[10px] font-bold text-yellow-500 border border-gray-700 uppercase">Coût: {selectedItem.cost || 0} CR</span>
                                                    {selectedItem.level && <span className="px-2 py-1 bg-gray-800 rounded text-[10px] font-bold text-green-400 border border-gray-700 uppercase">Niveau {selectedItem.level}</span>}
                                                </div>
                                            </div>
                                            
                                            <div className="w-32 h-32 border border-gray-700 rounded bg-black/50 flex items-center justify-center relative overflow-hidden">
                                                <span className="text-6xl opacity-50">🏭</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="bg-black/40 p-6 rounded border border-gray-800 relative overflow-hidden">
                                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 relative z-10">Production / Tour</h4>
                                                <div className="space-y-2 relative z-10">
                                                    {selectedItem.production && Object.entries(selectedItem.production).map(([k, v]) => (
                                                        v !== 0 && (
                                                        <div key={k} className="flex justify-between items-center border-b border-gray-800 pb-1">
                                                            <span className="text-gray-400 uppercase text-[10px] font-bold">{k}</span>
                                                            <span className={`font-mono font-bold ${v > 0 ? "text-green-400" : "text-red-400"}`}>{v > 0 ? '+' : ''}{v}</span>
                                                        </div>
                                                        )
                                                    ))}
                                                    {(!selectedItem.production || Object.values(selectedItem.production).every(x => x === 0)) && (
                                                        <span className="text-gray-600 italic text-xs">Aucun rendement économique direct.</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                {selectedItem.unlocks_units && selectedItem.unlocks_units.length > 0 && (
                                                    <div className="bg-blue-950/20 p-4 rounded border border-blue-900/50">
                                                        <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Débloque Unités</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {selectedItem.unlocks_units.map(u => (
                                                                <span key={u} className="px-3 py-1 bg-blue-900/40 text-blue-200 border border-blue-700/50 rounded text-[10px] uppercase font-bold">
                                                                    {u}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {selectedItem.upgrades && selectedItem.upgrades.length > 0 && (
                                                    <div className="bg-purple-950/20 p-4 rounded border border-purple-900/50">
                                                        <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-3">Arbre Tech</h4>
                                                        <div className="space-y-3">
                                                            {selectedItem.upgrades.map((upg, idx) => (
                                                                <button 
                                                                    key={idx} 
                                                                    onClick={() => setSelectedItem({ ...upg, type: 'building', category: selectedItem.category, level: idx+2, parentName: selectedItem.name, parentId: selectedItem.id })}
                                                                    className="flex flex-col gap-1 bg-black/40 p-2 rounded border border-gray-700 w-full text-left hover:bg-white/5 hover:border-gray-500 transition-colors"
                                                                >
                                                                    <div className="flex justify-between items-center w-full">
                                                                         <span className="text-gray-200 text-xs font-bold uppercase">{upg.name || `Niveau ${idx + 2}`}</span>
                                                                         <span className="text-[9px] text-gray-500 font-mono">T{idx + 2}</span>
                                                                    </div>
                                                                    <div className="flex gap-2 mt-1 w-full flex-wrap">
                                                                        {upg.production && Object.entries(upg.production).map(([k,v]) => v>0 && (
                                                                            <span key={k} className="text-[8px] text-green-400 bg-green-900/20 px-1 rounded border border-green-900/30">+{v} {k.substr(0,3)}</span>
                                                                        ))}
                                                                        <span className="text-[8px] text-yellow-500 ml-auto">{upg.cost} CR</span>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* UNIT DISPLAY */
                                    <div className="flex flex-col h-full"> 
                                        <div className="flex justify-between items-start border-b border-gray-800 pb-6 mb-6">
                                            <div>
                                                <div className="text-[10px] font-mono text-cyan-500 mb-1 flex items-center gap-2">
                                                    <span className="animate-spin duration-[3000ms]">❂</span>
                                                    UNITÉ IDENTIFIÉE
                                                </div>
                                                <h3 className={`text-5xl font-bold uppercase tracking-tight text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]`}>
                                                    {selectedItem.label}
                                                </h3>
                                                <div className="flex gap-2 mt-3">
                                                    <span className="px-2 py-1 bg-gray-800 rounded text-[10px] font-bold text-gray-400 border border-gray-700 uppercase">{selectedItem.stats.type}</span>
                                                    <span className="px-2 py-1 bg-gray-800 rounded text-[10px] font-bold text-gray-400 border border-gray-700 uppercase">Taille: {selectedItem.stats.size || 'Moyenne'}</span>
                                                </div>
                                            </div>
                                            
                                            {/* 3D MODEL PLACEHOLDER */}
                                            <div className={`w-32 h-32 border border-gray-700 rounded bg-black/50 flex items-center justify-center relative overflow-hidden group`}>
                                                <div className="absolute inset-0 bg-[linear-gradient(0deg,transparent_0%,rgba(0,255,0,0.2)_50%,transparent_100%)] bg-[length:100%_200%] animate-scanline opacity-20"></div>
                                                <span className="text-6xl opacity-50 text-gray-600 group-hover:scale-110 transition-transform duration-500">🛡️</span>
                                            </div>
                                        </div>

                                        <p className="text-lg text-gray-300 mb-8 font-light italic border-l-2 border-gray-700 pl-4 py-2 bg-gradient-to-r from-gray-900/50 to-transparent">
                                            "{selectedItem.desc}"
                                        </p>

                                        {/* STATS BARS */}
                                        <div className="grid grid-cols-2 gap-x-8 gap-y-6 bg-black/20 p-6 rounded-lg border border-gray-800/50">
                                            {[
                                                { label: "Durabilité (HP)", val: selectedItem.stats.hp, max: 500, color: "bg-green-500" },
                                                { label: "Puissance de Feu", val: selectedItem.stats.dmg, max: 100, color: "bg-red-500" },
                                                { label: "Portée Effective", val: selectedItem.stats.range, max: 300, color: "bg-yellow-500" },
                                                { label: "Vitesse Tactique", val: selectedItem.stats.speed, max: 3, color: "bg-cyan-500" },
                                            ].map((stat, i) => (
                                                <div key={i}>
                                                    <div className="flex justify-between text-xs uppercase font-bold text-gray-500 mb-1">
                                                        <span>{stat.label}</span>
                                                        <span className="text-white font-mono">{stat.val}</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden border border-gray-700/50">
                                                        <div 
                                                            className={`h-full ${stat.color} shadow-[0_0_10px_currentColor] relative`} 
                                                            style={{ width: `${Math.min(100, (stat.val / stat.max) * 100)}%` }}
                                                        >
                                                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* EMPTY STATE */
                            <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-40 select-none">
                                <div className="w-32 h-32 border-4 border-dashed border-gray-700 rounded-full flex items-center justify-center mb-4 animate-[spin_10s_linear_infinite]">
                                    <span className="text-6xl animate-pulse">📡</span>
                                </div>
                                <span className="uppercase tracking-[0.3em] font-bold text-xl">En attente de données</span>
                                <span className="text-xs font-mono mt-2 text-gray-500">SÉLECTIONNEZ UN SUJET DANS L'INDEX</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* FOOTER DECORATION */}
                <div className="h-2 bg-gradient-to-r from-transparent via-gray-700 to-transparent opacity-50"></div>
            </div>
        </div>
    );
}

// Ensure scanline keyframe is available globally or we use standard pulse. 
// Adding style tag for custom single-component animations as fallback
const style = typeof document !== 'undefined' ? document.createElement('style') : null;
if (style) {
  style.innerHTML = `
  @keyframes scanline {
    0% { background-position: 0% 0%; }
    100% { background-position: 0% 100%; }
  }
  .animate-scanline {
    animation: scanline 2s linear infinite;
  }
`;
  if (typeof document !== 'undefined') document.head.appendChild(style);
}
