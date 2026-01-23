import React, { useState, useEffect } from 'react';
import { db } from '../app/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, onSnapshot } from 'firebase/firestore';

const DEFAULT_SHIP = {
    id: 'new_ship',
    label: 'Nouveau Vaisseau',
    type: 'fighter', // fighter, corvette, etc (determines icon/behavior base?)
    speed: 4,
    hp: 100,
    damage: 10,
    range: 200,
    cooldown: 50,
    size: 6,
    color: '#ffffff',
    armor: 0,
    armorPen: 0,
    accuracy: 0.85,
    traits: [],
    bonuses: {},
    availableFactions: ['republic', 'empire'],
    isHero: false,
    maxMana: 0,
    manaCost: 0,
    ability: ''
};

const DEFAULT_GROUND = {
    id: 'new_unit',
    label: 'Nouvelle Unité',
    type: 'infantry',
    speed: 1,
    hp: 20,
    damage: 5,
    range: 100,
    cooldown: 30,
    size: 4,
    color: '#ffffff',
    armor: 0,
    armorPen: 0,
    accuracy: 0.85,
    traits: [],
    bonuses: {},
    availableFactions: ['republic', 'empire'],
    isHero: false,
    isMelee: false,
    maxMana: 0,
    manaCost: 0,
    ability: ''
};

const TRAIT_OPTIONS = ['biological', 'mechanized', 'robotic', 'vampirism', 'regeneration', 'stealth', 'rage', 'shielded'];
const TRAIT_DESCRIPTIONS = {
    biological: "Cible standard pour les dégâts biologiques.",
    mechanized: "Cible mécanique, vulnérable aux armes anti-véhicules.",
    robotic: "Cible robotique, immunisée au moral (si implémenté).",
    vampirism: "Soigne 20% des dégâts infligés.",
    regeneration: "Régénère 1 HP toutes les secondes.",
    stealth: "Invisible pour les ennemis jusqu'à attaque ou proximité.",
    rage: "Les dégâts augmentent quand les PV diminuent.",
    shielded: "Possède un bouclier qui se recharge hors combat."
};
const FACTION_OPTIONS = [
    { id: 'republic', label: 'La République' },
    { id: 'empire', label: "L'Empire Sith" },
    { id: 'neutral', label: 'Neutre / Minor' }
];
const ABILITY_OPTIONS_SPACE = ['fleet_repair', 'orbital_bombardment', 'emergency_shields', 'concentrated_fire'];
const ABILITY_OPTIONS_GROUND = ['force_heal', 'force_lightning', 'battle_meditation', 'force_push', 'jetpack_jump'];

export default function UnitManager({ onClose }) {
    const [activeTab, setActiveTab] = useState('space'); // space, ground
    const [units, setUnits] = useState([]);
    const [magicDomains, setMagicDomains] = useState([]); // Internal state
    const [editingUnit, setEditingUnit] = useState(null);
    const [loading, setLoading] = useState(true);

    // Load units and magic domains
    useEffect(() => {
        setLoading(true);
        const unsubUnits = onSnapshot(collection(db, 'custom_units'), (snap) => {
            const loaded = snap.docs.map(d => ({ dbId: d.id, ...d.data() }));
            setUnits(loaded);
            setLoading(false);
        });
        const unsubMagic = onSnapshot(collection(db, 'magic_domains'), (snap) => {
            setMagicDomains(snap.docs.map(d => ({ ...d.data(), id: d.id })));
        });
        return () => { unsubUnits(); unsubMagic(); };
    }, []);


    const handleSave = async (unit) => {
        if (!unit.id || !unit.label) return alert("ID et Label requis");
        
        const dataToSave = { ...unit, category: activeTab };
        
        if (unit.dbId) {
             await updateDoc(doc(db, 'custom_units', unit.dbId), dataToSave);
        } else {
             await addDoc(collection(db, 'custom_units'), dataToSave);
        }
        setEditingUnit(null);
    };

    const handleDelete = async (unit) => {
        if (!window.confirm("Supprimer cette unité ?")) return;
        await deleteDoc(doc(db, 'custom_units', unit.dbId));
    };

    const filteredUnits = units.filter(u => u.category === activeTab);

    return (
        <div className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-10">
            <div className="bg-gray-900 w-full max-w-6xl h-full max-h-[90vh] border border-gray-700 rounded-lg flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900 rounded-t-lg">
                    <h2 className="text-xl font-bold text-yellow-500 uppercase tracking-widest">Éditeur d'Unités</h2>
                    <button onClick={onClose} className="text-red-400 hover:text-red-300 font-bold border border-red-900 px-3 py-1 rounded">FERMER</button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-800">
                    <button 
                        onClick={() => { setActiveTab('space'); setEditingUnit(null); }}
                        className={`flex-1 py-3 text-center font-bold uppercase tracking-wide transition-colors ${activeTab === 'space' ? 'bg-blue-900/40 text-blue-400 border-b-2 border-blue-500' : 'text-gray-500 hover:bg-gray-800'}`}
                    >
                        🚀 Unités Spatiales
                    </button>
                    <button 
                         onClick={() => { setActiveTab('ground'); setEditingUnit(null); }}
                        className={`flex-1 py-3 text-center font-bold uppercase tracking-wide transition-colors ${activeTab === 'ground' ? 'bg-green-900/40 text-green-400 border-b-2 border-green-500' : 'text-gray-500 hover:bg-gray-800'}`}
                    >
                        🪖 Unités Terrestres
                    </button>
                </div>

                {/* Content */}
                <div className="flex-grow flex overflow-hidden">
                    {/* List */}
                    <div className="w-1/4 border-r border-gray-800 p-4 bg-black/20 overflow-y-auto">
                        <button 
                            onClick={() => setEditingUnit(activeTab === 'space' ? { ...DEFAULT_SHIP } : { ...DEFAULT_GROUND })}
                            className="w-full py-2 bg-green-700 hover:bg-green-600 text-white font-bold rounded mb-4"
                        >
                            + CRÉER
                        </button>

                        <div className="space-y-2">
                            {filteredUnits.map(u => (
                                <div key={u.dbId} onClick={() => setEditingUnit(u)} className={`p-3 rounded border cursor-pointer hover:bg-gray-800 transition-colors ${editingUnit?.dbId === u.dbId ? 'bg-gray-800 border-yellow-600' : 'bg-gray-900 border-gray-700'}`}>
                                    <div className="font-bold text-gray-200">{u.label}</div>
                                    <div className="text-xs text-gray-500 font-mono">{u.id}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Editor Form */}
                    <div className="flex-1 p-6 overflow-y-auto bg-gray-900/50">
                        {editingUnit ? (
                            <UnitForm 
                                unit={editingUnit} 
                                onChange={setEditingUnit} 
                                onSave={handleSave}
                                onDelete={handleDelete}
                                isSpace={activeTab === 'space'}
                                magicDomains={magicDomains}
                            />
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-600 font-mono text-xl uppercase">
                                Sélectionnez ou créez une unité
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function UnitForm({ unit, onChange, onSave, onDelete, isSpace, magicDomains }) {
    const handleChange = (field, value) => {
        onChange({ ...unit, [field]: value });
    };

    const handleBonusChange = (trait, value) => {
        const newBonuses = { ...unit.bonuses };
        if (value === 1) delete newBonuses[trait];
        else newBonuses[trait] = parseFloat(value);
        onChange({ ...unit, bonuses: newBonuses });
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-start">
                <div>
                     <input 
                        type="text" 
                        value={unit.label} 
                        onChange={e => handleChange('label', e.target.value)} 
                        className="bg-transparent text-3xl font-bold text-yellow-500 border-b border-gray-700 outline-none w-full placeholder-gray-600 mb-2"
                        placeholder="Nom de l'unité"
                    />
                    <div className="flex items-center gap-2 text-gray-500">
                        <span className="text-xs font-mono uppercase">ID Unique:</span>
                        <input 
                            type="text" 
                            value={unit.id} 
                            onChange={e => handleChange('id', e.target.value)} 
                            className="bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-xs font-mono text-white outline-none"
                        />
                    </div>
                </div>
                <div className="flex gap-2">
                     <button onClick={() => onDelete(unit)} className="px-4 py-2 border border-red-800 text-red-500 hover:bg-red-900/30 rounded">Supprimer</button>
                     <button onClick={() => onSave(unit)} className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded shadow-lg shadow-yellow-900/20">ENREGISTRER</button>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
                 <div className="bg-gray-800/50 p-4 rounded border border-gray-700 space-y-3">
                     <h4 className="text-gray-400 font-bold text-xs uppercase border-b border-gray-700 pb-2 mb-2">Combat</h4>
                     <NumberInput label="HP (Points de Vie)" value={unit.hp} onChange={v => handleChange('hp', v)} />
                     <NumberInput label="Dégâts" value={unit.damage} onChange={v => handleChange('damage', v)} />
                     <NumberInput label="Portée" value={unit.range} onChange={v => handleChange('range', v)} />
                     <NumberInput label="Cooldown (Recharge)" value={unit.cooldown} onChange={v => handleChange('cooldown', v)} />
                     <NumberInput label="Précision (0-1)" value={unit.accuracy} onChange={v => handleChange('accuracy', v)} step={0.05} max={1} />
                 </div>
                 
                 <div className="bg-gray-800/50 p-4 rounded border border-gray-700 space-y-3">
                     <h4 className="text-gray-400 font-bold text-xs uppercase border-b border-gray-700 pb-2 mb-2">Défense & Mouvement</h4>
                     <NumberInput label="Armure" value={unit.armor} onChange={v => handleChange('armor', v)} />
                     <NumberInput label="Pénétration Armure" value={unit.armorPen} onChange={v => handleChange('armorPen', v)} />
                     <NumberInput label="Vitesse" value={unit.speed} onChange={v => handleChange('speed', v)} step={0.1} />
                     <NumberInput label="Taille (Hitbox)" value={unit.size} onChange={v => handleChange('size', v)} />
                 </div>

                 <div className="bg-gray-800/50 p-4 rounded border border-gray-700 space-y-3">
                     <h4 className="text-gray-400 font-bold text-xs uppercase border-b border-gray-700 pb-2 mb-2">Apparence & Type</h4>
                     <div className="space-y-1">
                        <label className="text-xs text-gray-500">Couleur (Hex)</label>
                        <div className="flex gap-2">
                            <input type="color" value={unit.color} onChange={e => handleChange('color', e.target.value)} className="w-8 h-8 rounded cursor-pointer"/>
                            <input type="text" value={unit.color} onChange={e => handleChange('color', e.target.value)} className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 text-sm text-white"/>
                        </div>
                     </div>
                     {!isSpace && (
                         <div className="flex items-center gap-2 mt-4">
                             <input type="checkbox" checked={unit.isMelee} onChange={e => handleChange('isMelee', e.target.checked)} className="w-4 h-4 accent-yellow-500"/>
                             <span className="text-sm text-gray-300">Unité de Mêlée</span>
                         </div>
                     )}
                     
                     {/* Factions Availability */}
                     <div className="mt-4 pt-4 border-t border-gray-700">
                         <label className="text-xs text-gray-500 block mb-2">Factions Disponibles</label>
                         <div className="flex flex-col gap-2">
                             {FACTION_OPTIONS.map(f => (
                                 <div key={f.id} className="flex items-center gap-2">
                                     <input 
                                        type="checkbox" 
                                        checked={(unit.availableFactions || []).includes(f.id)} 
                                        onChange={e => {
                                             const current = unit.availableFactions || [];
                                             const newValue = e.target.checked 
                                                ? [...current, f.id]
                                                : current.filter(x => x !== f.id);
                                             handleChange('availableFactions', newValue);
                                        }}
                                        className="w-4 h-4 accent-blue-500"
                                     />
                                     <span className="text-sm text-gray-300">{f.label}</span>
                                 </div>
                             ))}
                         </div>
                     </div>
                 </div>
            </div>

            {/* Advanced Mechanics */}
            <div className="grid grid-cols-2 gap-4">
                {/* Traits & Bonuses */}
                <div className="bg-gray-800/50 p-4 rounded border border-gray-700">
                     <h4 className="text-gray-400 font-bold text-xs uppercase border-b border-gray-700 pb-2 mb-3">Traits & Bonus</h4>
                     
                     <div className="mb-4">
                         <label className="text-xs text-gray-500 block mb-1">Traits de l'unité</label>
                         <div className="flex gap-2 flex-wrap">
                             {TRAIT_OPTIONS.map(t => (
                                 <button 
                                    key={t}
                                    title={TRAIT_DESCRIPTIONS[t] || t}
                                    onClick={() => {
                                        const newTraits = unit.traits.includes(t) 
                                            ? unit.traits.filter(x => x !== t) 
                                            : [...unit.traits, t];
                                        handleChange('traits', newTraits);
                                    }}
                                    className={`px-2 py-1 text-xs border rounded uppercase transition-colors ${
                                        unit.traits.includes(t) ? 'bg-indigo-900 border-indigo-500 text-indigo-200' : 'border-gray-700 text-gray-500 hover:border-gray-500'
                                    }`}
                                 >
                                     {t}
                                 </button>
                             ))}
                         </div>
                     </div>

                     <div>
                         <label className="text-xs text-gray-500 block mb-1">Bonus de Dégâts (Multiplicateur)</label>
                         <div className="space-y-2">
                             {TRAIT_OPTIONS.map(t => (
                                 <div key={t} className="flex items-center gap-2">
                                     <span className="text-xs text-gray-400 w-24 uppercase">vs {t}</span>
                                     <input 
                                        type="number" 
                                        value={unit.bonuses?.[t] || 1} 
                                        onChange={e => handleBonusChange(t, e.target.value)}
                                        step={0.1}
                                        className="w-20 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                                     />
                                 </div>
                             ))}
                         </div>
                     </div>
                </div>

                {/* Hero / Heroic Stats */}
                <div className="bg-gray-800/50 p-4 rounded border border-gray-700">
                     <div className="flex items-center justify-between border-b border-gray-700 pb-2 mb-3">
                        <h4 className="text-gray-400 font-bold text-xs uppercase">Héros & Capacités</h4>
                        <div className="flex items-center gap-2">
                             <input type="checkbox" checked={unit.isHero} onChange={e => handleChange('isHero', e.target.checked)} className="w-4 h-4 accent-yellow-500"/>
                             <span className={`text-sm font-bold ${unit.isHero ? 'text-yellow-500' : 'text-gray-500'}`}>HÉROS</span>
                        </div>
                     </div>

                     {unit.isHero && (
                         <div className="space-y-3 animation-fade-in relative">
                             <NumberInput label="Mana Max" value={unit.maxMana} onChange={v => handleChange('maxMana', v)} />
                             <NumberInput label="Régénération Mana" value={unit.manaRegen || 1} onChange={v => handleChange('manaRegen', v)} step={0.1} />
                             
                             {/* MAGIC DOMAINS INTEGRATION */}
                             {magicDomains && !isSpace && (
                                 <div className="space-y-2 border-t border-gray-700 pt-2 mt-2">
                                     <label className="text-xs text-purple-400 font-bold uppercase">Domaine de Magie ({magicDomains.length} dispos)</label>
                                     <select 
                                        value={unit.domainId || ''} 
                                        onChange={e => handleChange('domainId', e.target.value)}
                                        className="w-full bg-gray-900 border border-purple-900 rounded px-2 py-1.5 text-sm text-white outline-none"
                                     >
                                        <option value="">-- Aucun --</option>
                                        {magicDomains.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                                     </select>
                                 </div>
                             )}

                             <div className="space-y-1">
                                <label className="text-xs text-gray-500">Capacité Active Principale</label>
                                <select 
                                    value={unit.ability} 
                                    onChange={e => handleChange('ability', e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-sm text-white outline-none"
                                >
                                    <option value="">-- Aucune --</option>
                                    <optgroup label="Standard">
                                        {(isSpace ? ABILITY_OPTIONS_SPACE : ABILITY_OPTIONS_GROUND).map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </optgroup>
                                    {!isSpace && magicDomains && magicDomains.map(domain => (
                                        <optgroup key={domain.id} label={domain.label}>
                                            {domain.talents?.filter(t => t.type === 'active' || t.type === 'ultimate').map(t => (
                                                <option key={t.id} value={t.id}>★ {t.label}</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                                <p className="text-[9px] text-gray-500 mt-1">
                                    * Si un "Domaine" est sélectionné, l'unité reçoit automatiquement <strong>tous</strong> les pouvoirs actifs de ce domaine. Sélectionner une capacité ici permet d'ajouter un pouvoir spécifique hors-domaine.
                                </p>
                             </div>
                         </div>
                     )}
                </div>
            </div>
        </div>
    );
}

const NumberInput = ({ label, value, onChange, step=1, max }) => (
    <div className="space-y-1">
        <label className="text-xs text-gray-500 block">{label}</label>
        <input 
            type="number" 
            value={isNaN(value) ? '' : value} 
            onChange={e => onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))}
            step={step}
            max={max}
            className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:border-yellow-500 outline-none"
        />
    </div>
);
