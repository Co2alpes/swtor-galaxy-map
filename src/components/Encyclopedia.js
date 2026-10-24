"use client";

import { useState, useMemo } from 'react';
import { SwButton, SwCell, SwDivider, SwIcon, SwInput, SwLabel, SwPanel, SwStat, SwTabs, SwWindow } from './ui/Swtor';

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

// Icônes du codex (pack SWTOR) : présentation uniquement
const UNIT_ICONS = {
    infantry: 'blaster_generic',
    heavy_infantry: 'assault',
    vehicle: 'armorplating',
    turret: 'mtx_toy_turret',
    jedi_general: 'jediknight',
    sith_lord: 'dark_lightning',
    mandalorian_commander: 'bountyhunter'
};

const BUILDING_CATEGORY_ICONS = {
    economic: 'galactictradekioskunlock',
    military: 'blaster_generic',
    orbital: 'orbitalbombardment',
    force: 'jediholocron',
    unique: 'icon_oldholocron_01',
    unknown: 'structuralbracing'
};

// Domaines de base (ordre de TALENT_POOLS : dark, light, mandalorian)
const DOMAIN_ICONS = {
    base_0: 'lightningstorm',
    base_1: 'forcebarriersage',
    base_2: 'mtx_flair_mandalorian'
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
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300 p-8">
            <SwWindow
                title="Archives"
                subtitle={<span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-sw-success animate-pulse"></span>Connexion sécurisée établie · Accès niveau 5</span>}
                icon="lore"
                onClose={onClose}
                className="w-[1200px] max-w-full h-[800px] max-h-full"
                bodyClassName="flex gap-4 overflow-hidden"
                actions={
                    /* SEARCH & SORT */
                    <div className="flex items-center gap-2">
                        <SwInput
                            type="text"
                            placeholder="Rechercher..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-44 py-1 text-[11px] uppercase tracking-wider"
                        />

                        <SwInput
                            as="select"
                            value={sortKey}
                            onChange={(e) => setSortKey(e.target.value)}
                            className="w-auto py-1 px-2 text-[11px] uppercase"
                        >
                            <option value="name">Nom</option>
                            <option value="cost">Coût</option>
                            {tab === 'units' && <option value="power">Puissance</option>}
                        </SwInput>

                        <SwButton
                            size="sm"
                            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                            title={sortOrder === 'asc' ? 'Ordre croissant' : 'Ordre décroissant'}
                        >
                            {sortOrder === 'asc' ? '▲' : '▼'}
                        </SwButton>
                    </div>
                }
            >
                {/* SIDEBAR NAVIGATION (index du codex) */}
                <div className="w-80 shrink-0 flex flex-col min-h-0">

                    {/* TABS */}
                    <SwTabs
                        tabs={[
                            { id: 'units', icon: 'assault', label: 'Unités' },
                            { id: 'buildings', icon: 'structuralbracing', label: 'Bâtiments' },
                            { id: 'magic', icon: 'force', label: 'Force & Tech' }
                        ]}
                        value={tab}
                        onChange={(id) => { setTab(id); setSelectedItem(null); setSearchTerm(""); }}
                        tabClassName="min-w-0 flex-1 px-1.5 text-[10px]"
                    />

                    {/* NAV LIST */}
                    <SwPanel dark className="flex-grow min-h-0 overflow-y-auto sw-scroll p-2 space-y-1 mt-1">
                         {tab === 'units' ? (
                            filteredUnits.map(([key, unit]) => (
                                <div
                                    key={key}
                                    onClick={() => setSelectedItem({ id: key, ...unit })}
                                    data-active={selectedItem?.id === key ? 'true' : undefined}
                                    className="sw-row p-1.5 pr-3 cursor-pointer flex items-center gap-3"
                                >
                                    <SwCell icon={UNIT_ICONS[key] || 'questionmark'} size={40} active={selectedItem?.id === key} />
                                    <span className={`flex-1 min-w-0 truncate font-bold text-sm tracking-wide ${selectedItem?.id === key ? 'text-sw-gold' : 'text-sw-text'}`}>{unit.label}</span>
                                    <span className="sw-label text-[9px] text-sw-faint">{unit.stats.type}</span>
                                </div>
                            ))
                         ) : tab === 'buildings' ? (
                            Object.entries(groupedBuildings).map(([category, buildings]) => (
                                <div key={category} className="mb-3">
                                    <div className="sticky top-0 z-20 bg-sw-panel-dark pt-1 pb-1.5 mb-1 flex items-center gap-2">
                                        <SwIcon name={BUILDING_CATEGORY_ICONS[category] || 'structuralbracing'} size={18} />
                                        <SwLabel className="text-sw-gold">{BUILDING_CATEGORY_LABELS[category] || category}</SwLabel>
                                        <span className="flex-1 h-px bg-sw-border"></span>
                                    </div>
                                    {buildings.map((building) => (
                                        <div
                                            key={building.id}
                                            onClick={() => setSelectedItem({ ...building, type: 'building' })}
                                            data-active={selectedItem?.id === building.id ? 'true' : undefined}
                                            className="sw-row p-1.5 pr-3 mb-1 cursor-pointer flex items-center gap-3"
                                        >
                                            <SwCell icon={BUILDING_CATEGORY_ICONS[category] || 'structuralbracing'} size={40} active={selectedItem?.id === building.id} />
                                            <span className={`flex-1 min-w-0 truncate font-bold text-sm tracking-wide ${selectedItem?.id === building.id ? 'text-sw-gold' : 'text-sw-text'}`}>{building.name}</span>
                                            <span className="sw-label text-[9px] text-sw-faint">NIV {building.level || 1}</span>
                                        </div>
                                    ))}
                                </div>
                            ))
                         ) : (
                            filteredMagic.map((domain) => (
                                <div
                                    key={domain.id}
                                    onClick={() => setSelectedItem({ ...domain, type: 'domain' })}
                                    data-active={selectedItem?.id === domain.id ? 'true' : undefined}
                                    className="sw-row p-1.5 pr-3 cursor-pointer flex items-center gap-3"
                                    style={{ boxShadow: `inset 2px 0 0 ${domain.color}` }}
                                >
                                    <SwCell size={40} icon={DOMAIN_ICONS[domain.id]} active={selectedItem?.id === domain.id}>
                                        <span className="text-lg">{domain.icon || '🔮'}</span>
                                    </SwCell>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-sm tracking-wide truncate" style={{color: domain.color}}>{domain.label}</div>
                                        <div className="sw-label text-[9px] text-sw-faint truncate">{domain.talents?.length || 0} Pouvoirs disponibles</div>
                                    </div>
                                </div>
                            ))
                         )}
                    </SwPanel>
                </div>

                {/* MAIN DISPLAY (panneau de lecture) */}
                <SwPanel dark className="flex-grow min-w-0 p-6 relative overflow-hidden flex flex-col">

                    {selectedItem ? (
                        <div className="relative z-10 animate-in slide-in-from-bottom-4 duration-500 flex flex-col h-full min-h-0">
                            {selectedItem.type === 'domain' ? (
                                <>
                                    {/* DOMAIN HEADER */}
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="shrink-0" style={{ filter: `drop-shadow(0 0 8px ${selectedItem.color})` }}>
                                            <SwCell size={80} icon={DOMAIN_ICONS[selectedItem.id]} active>
                                                <span className="text-4xl">{selectedItem.icon || "🔮"}</span>
                                            </SwCell>
                                        </div>
                                        <div className="min-w-0">
                                            <SwLabel className="text-sw-faint mb-1">Doctrine</SwLabel>
                                            <h3 className="sw-title text-3xl leading-tight" style={{color: selectedItem.color, textShadow: `0 0 16px ${selectedItem.color}66`}}>
                                                {selectedItem.label}
                                            </h3>
                                            <p className="text-sw-dim text-sm max-w-2xl mt-1">{selectedItem.desc}</p>
                                        </div>
                                    </div>
                                    <SwDivider className="mb-4" />

                                    {/* TALENTS GRID */}
                                    <div className="flex-grow min-h-0 overflow-y-auto sw-scroll pr-2">
                                        <SwLabel as="h4" className="text-sw-gold mb-3 flex items-center gap-2">
                                            Arbre de Talents
                                            <span className="bg-sw-border flex-grow h-px"></span>
                                        </SwLabel>

                                        <div className="grid grid-cols-2 gap-3">
                                            {selectedItem.talents.map((t, idx) => (
                                                <div key={idx} className="sw-row relative group p-3 flex gap-3 items-center">
                                                    <div className="absolute top-1.5 right-2">
                                                        <span className={`sw-label text-[8px] ${
                                                            t.type === 'passive' ? 'text-sw-faint' :
                                                            (t.type === 'ultimate' ? 'text-sw-gold' : 'text-sw-info')
                                                        }`}>
                                                            {t.type || 'Inconnu'}
                                                        </span>
                                                    </div>

                                                    <SwCell size={48} active={t.type === 'ultimate'}>
                                                        <div className="flex flex-col items-center leading-none">
                                                            <span className="text-lg font-bold text-sw-text">{t.rank}</span>
                                                            <span className="text-[7px] text-sw-faint uppercase tracking-wider">Rang</span>
                                                        </div>
                                                    </SwCell>

                                                    <div className="min-w-0">
                                                        <div className="font-bold text-sw-text uppercase tracking-wide text-sm group-hover:text-sw-gold transition-colors">{t.label}</div>
                                                        <div className="text-xs text-sw-dim mt-0.5">{t.desc}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : selectedItem.type === 'building' ? (
                                <div className="flex flex-col h-full min-h-0 overflow-y-auto sw-scroll pr-1 animate-in fade-in duration-300">
                                    <div className="flex justify-between items-start gap-4 mb-3">
                                        <div className="min-w-0">
                                            <SwLabel className="text-sw-gold-dim mb-1 flex items-center gap-2">
                                                <SwIcon name="structuralbracing" size={16} />
                                                Infrastructure C.E.O.
                                            </SwLabel>
                                            <h3 className="sw-title text-3xl leading-tight">
                                                {selectedItem.name}
                                                {selectedItem.parentName && <span className="text-sw-faint text-xl ml-4">({selectedItem.parentName})</span>}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-2 mt-3">
                                                {selectedItem.parentName && (
                                                   <SwButton
                                                        size="sm"
                                                        variant="danger"
                                                        onClick={(e) => { e.stopPropagation(); const parent = buildingsTemplates.find(b => b.id === selectedItem.parentId); if(parent) setSelectedItem({...parent, type: 'building'}); }}
                                                   >
                                                        &lt; Retour Niveau 1
                                                   </SwButton>
                                                )}
                                                <span className="sw-panel px-2 py-1 sw-label text-[10px]">{selectedItem.category || 'Général'}</span>
                                                <span className="sw-panel px-2 py-1 sw-label text-[10px] text-sw-gold">Coût: {selectedItem.cost || 0} CR</span>
                                                {selectedItem.level && <span className="sw-panel px-2 py-1 sw-label text-[10px] text-sw-success">Niveau {selectedItem.level}</span>}
                                            </div>
                                        </div>

                                        <SwCell size={112} icon={BUILDING_CATEGORY_ICONS[selectedItem.category] || 'structuralbracing'} active />
                                    </div>
                                    <SwDivider className="mb-5" />

                                    <div className="grid grid-cols-2 gap-5">
                                        <SwPanel className="p-5">
                                            <SwLabel as="h4" className="text-sw-gold mb-3">Production / Mois</SwLabel>
                                            <div className="space-y-2">
                                                {selectedItem.production && Object.entries(selectedItem.production).map(([k, v]) => (
                                                    v !== 0 && (
                                                    <div key={k} className="flex justify-between items-center border-b border-sw-border pb-1">
                                                        <span className="sw-label text-[10px]">{k}</span>
                                                        <span className={`font-mono font-bold ${v > 0 ? "text-sw-success" : "text-sw-error"}`}>{v > 0 ? '+' : ''}{v}</span>
                                                    </div>
                                                    )
                                                ))}
                                                {(!selectedItem.production || Object.values(selectedItem.production).every(x => x === 0)) && (
                                                    <span className="text-sw-faint italic text-xs">Aucun rendement économique direct.</span>
                                                )}
                                            </div>
                                        </SwPanel>

                                        <div className="space-y-4">
                                            {selectedItem.unlocks_units && selectedItem.unlocks_units.length > 0 && (
                                                <SwPanel className="p-4">
                                                    <SwLabel as="h4" className="text-sw-info mb-2">Débloque Unités</SwLabel>
                                                    <div className="flex flex-wrap gap-2">
                                                        {selectedItem.unlocks_units.map(u => (
                                                            <span key={u} className="px-2 py-1 rounded-[3px] bg-sw-info/10 text-sw-info border border-sw-info/40 text-[10px] uppercase font-bold tracking-wider">
                                                                {u}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </SwPanel>
                                            )}

                                            {selectedItem.upgrades && selectedItem.upgrades.length > 0 && (
                                                <SwPanel className="p-4">
                                                    <SwLabel as="h4" className="text-sw-accent-light mb-3">Arbre Tech</SwLabel>
                                                    <div className="space-y-1.5">
                                                        {selectedItem.upgrades.map((upg, idx) => (
                                                            <button
                                                                key={idx}
                                                                onClick={() => setSelectedItem({ ...upg, type: 'building', category: selectedItem.category, level: idx+2, parentName: selectedItem.name, parentId: selectedItem.id })}
                                                                className="sw-row flex flex-col gap-1 p-2 w-full text-left cursor-pointer"
                                                            >
                                                                <div className="flex justify-between items-center w-full">
                                                                     <span className="text-sw-text text-xs font-bold uppercase">{upg.name || `Niveau ${idx + 2}`}</span>
                                                                     <span className="text-[9px] text-sw-faint font-mono">T{idx + 2}</span>
                                                                </div>
                                                                <div className="flex gap-2 mt-1 w-full flex-wrap">
                                                                    {upg.production && Object.entries(upg.production).map(([k,v]) => v>0 && (
                                                                        <span key={k} className="text-[8px] text-sw-success bg-sw-success/10 px-1 rounded-[2px] border border-sw-success/30">+{v} {k.substr(0,3)}</span>
                                                                    ))}
                                                                    <span className="text-[8px] text-sw-gold ml-auto">{upg.cost} CR</span>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </SwPanel>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* UNIT DISPLAY */
                                <div className="flex flex-col h-full min-h-0 overflow-y-auto sw-scroll pr-1">
                                    <div className="flex justify-between items-start gap-4 mb-3">
                                        <div className="min-w-0">
                                            <SwLabel className="text-sw-accent-light mb-1 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-sw-accent animate-pulse"></span>
                                                Unité identifiée
                                            </SwLabel>
                                            <h3 className="sw-title text-4xl leading-tight">
                                                {selectedItem.label}
                                            </h3>
                                            <div className="flex gap-2 mt-3">
                                                <span className="sw-panel px-2 py-1 sw-label text-[10px]">{selectedItem.stats.type}</span>
                                                <span className="sw-panel px-2 py-1 sw-label text-[10px]">Taille: {selectedItem.stats.size || 'Moyenne'}</span>
                                            </div>
                                        </div>

                                        {/* PORTRAIT DE L'UNITÉ */}
                                        <SwCell size={112} icon={UNIT_ICONS[selectedItem.id] || 'questionmark'} active />
                                    </div>
                                    <SwDivider className="mb-5" />

                                    <p className="text-base text-sw-dim mb-6 italic pl-4 py-2" style={{ boxShadow: 'inset 2px 0 0 var(--sw-gold-dim)' }}>
                                        « {selectedItem.desc} »
                                    </p>

                                    {/* STATS BARS */}
                                    <SwPanel className="grid grid-cols-2 gap-x-8 gap-y-5 p-5">
                                        {[
                                            { label: "Durabilité (HP)", val: selectedItem.stats.hp, max: 500, color: "var(--sw-success)" },
                                            { label: "Puissance de Feu", val: selectedItem.stats.dmg, max: 100, color: "var(--sw-error)" },
                                            { label: "Portée Effective", val: selectedItem.stats.range, max: 300, color: "var(--sw-warn)" },
                                            { label: "Vitesse Tactique", val: selectedItem.stats.speed, max: 3, color: "var(--sw-info)" },
                                        ].map((stat, i) => (
                                            <SwStat key={i} label={stat.label} value={stat.val} bar={stat.val} max={stat.max} color={stat.color} />
                                        ))}
                                    </SwPanel>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* EMPTY STATE */
                        <div className="h-full flex flex-col items-center justify-center select-none gap-4">
                            <div className="relative w-32 h-32 flex items-center justify-center opacity-60">
                                <SwIcon name="/ui/swtor/scanner.png" size={128} className="absolute inset-0" />
                                <SwIcon name="datapad" size={48} className="animate-pulse" />
                            </div>
                            <span className="sw-title text-xl tracking-[0.3em] text-sw-faint">En attente de données</span>
                            <SwLabel className="text-sw-faint">Sélectionnez un sujet dans l&apos;index</SwLabel>
                        </div>
                    )}
                </SwPanel>
            </SwWindow>
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
