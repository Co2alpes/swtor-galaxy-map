import React, { useState, useEffect } from 'react';
import { db } from '../app/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, onSnapshot } from 'firebase/firestore';
import MagicManager from './MagicManager';
import { SwButton, SwCell, SwIcon, SwInput, SwLabel, SwPanel, SwTabs, SwWindow } from './ui/Swtor';

// Encart de section du formulaire (panneau + titre en petites capitales)
const FormSection = ({ title, className = '', children }) => (
    <SwPanel className={`p-4 ${className}`}>
        {title && <SwLabel className="text-sw-gold border-b border-sw-border pb-2 mb-3">{title}</SwLabel>}
        {children}
    </SwPanel>
);

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
    sprite: '', // URL
    shape: 'triangle', // Default shape if no sprite
    armor: 0,
    armorPen: 0,
    accuracy: 0.85,
    traits: [],
    bonuses: {},
    availableFactions: ['republic', 'empire'],
    isHero: false,
    hasAbilities: false,
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
    sprite: '', // URL
    shape: 'circle', // Default shape if no sprite
    armor: 0,
    armorPen: 0,
    accuracy: 0.85,
    traits: [],
    bonuses: {},
    availableFactions: ['republic', 'empire'],
    isHero: false,
    hasAbilities: false,
    isMelee: false,
    maxMana: 0,
    manaCost: 0,
    ability: ''
};

const COMMON_TRAITS = ['biological', 'mechanized', 'robotic', 'vampirism', 'regeneration', 'stealth', 'rage', 'shielded'];
const SPACE_TRAITS = ['bombardier', 'dreadnought', 'destroyer', 'corvette', 'chasseur'];

const TRAIT_DESCRIPTIONS = {
    biological: "Cible standard pour les dégâts biologiques.",
    mechanized: "Cible mécanique, vulnérable aux armes anti-véhicules.",
    robotic: "Cible robotique, immunisée au moral (si implémenté).",
    vampirism: "Soigne 20% des dégâts infligés.",
    regeneration: "Régénère 1 HP toutes les secondes.",
    stealth: "Invisible pour les ennemis jusqu'à attaque ou proximité.",
    rage: "Les dégâts augmentent quand les PV diminuent.",
    shielded: "Possède un bouclier qui se recharge hors combat.",
    // Space Roles (Rock-Paper-Scissors)
    bombardier: "Rôle Bombardier. Contre Dreadnought.",
    dreadnought: "Rôle Dreadnought. Contre Destroyer.",
    destroyer: "Rôle Destroyer. Contre Corvette.",
    corvette: "Rôle Corvette. Contre Chasseur.",
    chasseur: "Rôle Chasseur. Contre Bombardier."
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
    const [showMagicManager, setShowMagicManager] = useState(false);

    const availableTraits = activeTab === 'space' ? [...COMMON_TRAITS, ...SPACE_TRAITS] : COMMON_TRAITS;

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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-center justify-center p-10">
            <SwWindow
                title="Éditeur d'Unités"
                subtitle="Registre des forces · unités personnalisées"
                icon="droidparts"
                onClose={onClose}
                className="w-full max-w-6xl h-full max-h-[90vh]"
                bodyClassName="p-0 pt-0 flex flex-col"
            >
                {/* Tabs */}
                <div className="px-4 pt-3 border-b border-sw-border">
                    <SwTabs
                        tabs={[
                            { id: 'space', label: 'Unités Spatiales', icon: 'remotecontrolstarship' },
                            { id: 'ground', label: 'Unités Terrestres', icon: 'assault' },
                        ]}
                        value={activeTab}
                        onChange={(id) => { setActiveTab(id); setEditingUnit(null); }}
                    />
                </div>

                {/* Content */}
                <div className="flex-grow flex overflow-hidden min-h-0">
                    {/* List */}
                    <div className="w-1/4 border-r border-sw-border p-4 bg-sw-panel-dark/60 overflow-y-auto sw-scroll">
                        <SwButton
                            variant="accent"
                            onClick={() => setEditingUnit(activeTab === 'space' ? { ...DEFAULT_SHIP } : { ...DEFAULT_GROUND })}
                            className="w-full mb-4"
                        >
                            + CRÉER
                        </SwButton>

                        {activeTab === 'ground' && (
                            <SwButton
                                onClick={() => setShowMagicManager(true)}
                                className="w-full mb-4 uppercase text-sm"
                            >
                                <SwIcon name="force" size={18} /> Gérer les Pouvoirs
                            </SwButton>
                        )}

                        <div className="space-y-1.5">
                            {filteredUnits.map(u => (
                                <div key={u.dbId} onClick={() => setEditingUnit(u)} data-active={editingUnit?.dbId === u.dbId ? 'true' : undefined} className="sw-row p-2 cursor-pointer flex items-center gap-3">
                                    <SwCell size={40} icon={u.category === 'space' ? 'remotecontrolstarship' : (u.isHero ? 'jediknight' : 'assault')} />
                                    <div className="min-w-0">
                                        <div className="font-bold text-sw-text text-sm uppercase tracking-wide truncate">{u.label}</div>
                                        <div className="text-[10px] text-sw-faint font-mono truncate">{u.id}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Editor Form */}
                    <div className="flex-1 p-6 overflow-y-auto sw-scroll">
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
                            <div className="h-full flex flex-col items-center justify-center gap-3 text-sw-faint text-xl uppercase tracking-widest">
                                <SwIcon name="droidparts" size={56} className="opacity-40" />
                                Sélectionnez ou créez une unité
                            </div>
                        )}
                    </div>
                </div>
            </SwWindow>
            {showMagicManager && <MagicManager onClose={() => setShowMagicManager(false)} />}
        </div>
    );
}

function UnitForm({ unit, onChange, onSave, onDelete, isSpace, magicDomains }) {
    const availableTraits = isSpace ? [...COMMON_TRAITS, ...SPACE_TRAITS] : COMMON_TRAITS;

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
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                     <input
                        type="text"
                        value={unit.label}
                        onChange={e => handleChange('label', e.target.value)}
                        className="sw-title bg-transparent text-3xl border-b border-sw-border focus:border-sw-accent outline-none w-full placeholder:text-sw-faint mb-2 transition-colors"
                        placeholder="Nom de l'unité"
                    />
                    <div className="flex items-center gap-2">
                        <SwLabel as="span">ID Unique:</SwLabel>
                        <SwInput
                            type="text"
                            value={unit.id}
                            onChange={e => handleChange('id', e.target.value)}
                            className="!w-auto !px-2 !py-0.5 text-xs font-mono"
                        />
                    </div>
                </div>
                <div className="flex gap-2 shrink-0">
                     <SwButton variant="danger" onClick={() => onDelete(unit)}>Supprimer</SwButton>
                     <SwButton variant="accent" onClick={() => onSave(unit)}>ENREGISTRER</SwButton>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
                 <FormSection title="Combat" className="space-y-3">
                     <NumberInput label="HP (Points de Vie)" value={unit.hp} onChange={v => handleChange('hp', v)} />
                     <NumberInput label="Dégâts" value={unit.damage} onChange={v => handleChange('damage', v)} />
                     <NumberInput label="Portée" value={unit.range} onChange={v => handleChange('range', v)} />
                     <NumberInput label="Cooldown (Recharge)" value={unit.cooldown} onChange={v => handleChange('cooldown', v)} />
                     <NumberInput label="Précision (0-1)" value={unit.accuracy} onChange={v => handleChange('accuracy', v)} step={0.05} max={1} />
                 </FormSection>

                 <FormSection title="Défense & Mouvement" className="space-y-3">
                     <NumberInput label="Armure" value={unit.armor} onChange={v => handleChange('armor', v)} />
                     <NumberInput label="Pénétration Armure" value={unit.armorPen} onChange={v => handleChange('armorPen', v)} />
                     <NumberInput label="Vitesse" value={unit.speed} onChange={v => handleChange('speed', v)} step={0.1} />
                     <NumberInput label="Taille (Hitbox)" value={unit.size} onChange={v => handleChange('size', v)} />
                 </FormSection>

                 <FormSection title="Apparence & Type" className="space-y-3">

                     <div className="space-y-1">
                        <SwLabel as="label" className="block">Sprite / Image (URL)</SwLabel>
                        <SwInput type="text" value={unit.sprite || ''} onChange={e => handleChange('sprite', e.target.value)} className="!px-2 !py-1 text-sm" placeholder="https://..." />
                        {unit.sprite && <div className="mt-2 text-center sw-panel-dark p-2"><img src={unit.sprite} alt="Preview" className="h-12 w-auto mx-auto object-contain" /></div>}
                     </div>

                     <div className="space-y-1 mt-2">
                        <SwLabel as="label" className="block">Forme de base (Si pas d'image)</SwLabel>
                        <SwInput
                            as="select"
                            value={unit.shape || (isSpace ? 'triangle' : 'circle')}
                            onChange={e => handleChange('shape', e.target.value)}
                            className="!px-2 !py-1 text-sm"
                        >
                            <option value="triangle">Triangle (Chasseur)</option>
                            <option value="circle">Cercle (Standard)</option>
                            <option value="square">Carré (Lourd)</option>
                            <option value="diamond">Losange (Spécial)</option>
                            <option value="pentagon">Pentagone (Elite)</option>
                        </SwInput>
                     </div>

                     <div className="space-y-1 mt-2">
                        <SwLabel as="label" className="block">Couleur (Hex)</SwLabel>
                        <div className="flex gap-2">
                            <input type="color" value={unit.color} onChange={e => handleChange('color', e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-sw-border bg-transparent"/>
                            <SwInput type="text" value={unit.color} onChange={e => handleChange('color', e.target.value)} className="flex-1 !px-2 !py-1 text-sm font-mono"/>
                        </div>
                     </div>
                     {!isSpace && (
                         <div className="flex items-center gap-2 mt-4">
                             <input type="checkbox" checked={unit.isMelee} onChange={e => handleChange('isMelee', e.target.checked)} className="w-4 h-4 accent-sw-gold"/>
                             <span className="text-sm text-sw-text">Unité de Mêlée</span>
                         </div>
                     )}

                     {/* Factions Availability */}
                     <div className="mt-4 pt-4 border-t border-sw-border">
                         <SwLabel as="label" className="block mb-2">Factions Disponibles</SwLabel>
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
                                        className="w-4 h-4 accent-sw-accent"
                                     />
                                     <SwIcon name={f.id === 'republic' ? 'republic' : f.id === 'empire' ? 'empire' : 'claninsignia'} size={18} />
                                     <span className="text-sm text-sw-text">{f.label}</span>
                                 </div>
                             ))}
                         </div>
                     </div>
                 </FormSection>
            </div>

            {/* Advanced Mechanics */}
            <div className="grid grid-cols-2 gap-4">
                {/* Traits & Bonuses */}
                <FormSection title="Traits & Bonus">

                     <div className="mb-4">
                         <SwLabel as="label" className="block mb-1">Traits de l'unité</SwLabel>
                         <div className="flex gap-2 flex-wrap">
                             {availableTraits.map(t => (
                                 <button
                                    key={t}
                                    title={TRAIT_DESCRIPTIONS[t] || t}
                                    onClick={() => {
                                        const isAdding = !unit.traits.includes(t);
                                        const newTraits = isAdding
                                            ? [...unit.traits, t]
                                            : unit.traits.filter(x => x !== t);

                                        let updates = { traits: newTraits };

                                        // Auto-apply counters for ships
                                        if (isAdding) {
                                            const map = {
                                                bombardier: 'dreadnought',
                                                dreadnought: 'destroyer',
                                                destroyer: 'corvette',
                                                corvette: 'chasseur',
                                                chasseur: 'bombardier'
                                            };
                                            if (map[t]) {
                                                 updates.bonuses = { ...unit.bonuses, [map[t]]: 2.0 };
                                            }
                                        }

                                        onChange({ ...unit, ...updates });
                                    }}
                                    data-active={unit.traits.includes(t) ? 'true' : undefined}
                                    className={`sw-row px-2 py-1 text-xs uppercase tracking-wider transition-colors ${
                                        unit.traits.includes(t) ? 'text-sw-accent-light' : 'text-sw-dim hover:text-sw-text'
                                    }`}
                                 >
                                     {t}
                                 </button>
                             ))}
                         </div>
                     </div>

                     <div>
                         <SwLabel as="label" className="block mb-1">Bonus de Dégâts (Multiplicateur)</SwLabel>
                         <div className="space-y-2">
                             {availableTraits.map(t => (
                                 <div key={t} className="flex items-center gap-2">
                                     <span className="text-xs text-sw-dim w-24 uppercase">vs {t}</span>
                                     <SwInput
                                        type="number"
                                        value={unit.bonuses?.[t] || 1}
                                        onChange={e => handleBonusChange(t, e.target.value)}
                                        step={0.1}
                                        className="!w-20 !px-2 !py-1 text-sm font-mono"
                                     />
                                 </div>
                             ))}
                         </div>
                     </div>
                </FormSection>

                {/* Hero / Heroic Stats */}
                <FormSection title="Rôles & Capacités">

                     <div className="flex items-center gap-4 mb-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                             <input type="checkbox" checked={unit.isHero} onChange={e => handleChange('isHero', e.target.checked)} className="w-4 h-4 accent-sw-gold"/>
                             <span className={`text-sm font-bold ${unit.isHero ? 'text-sw-gold' : 'text-sw-faint'}`}>EST UN HÉROS</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                             <input type="checkbox" checked={unit.hasAbilities} onChange={e => handleChange('hasAbilities', e.target.checked)} className="w-4 h-4 accent-sw-accent"/>
                             <span className={`text-sm font-bold ${unit.hasAbilities ? 'text-sw-accent-light' : 'text-sw-faint'}`}>A DES CAPACITÉS</span>
                        </label>
                     </div>

                     {(unit.hasAbilities || unit.isHero) && (
                         <div className="space-y-3 animation-fade-in relative">
                             <NumberInput label="Mana Max" value={unit.maxMana} onChange={v => handleChange('maxMana', v)} />
                             <NumberInput label="Régénération Mana" value={unit.manaRegen || 1} onChange={v => handleChange('manaRegen', v)} step={0.1} />

                             {/* MAGIC DOMAINS INTEGRATION */}
                             {magicDomains && !isSpace && (
                                 <div className="space-y-2 border-t border-sw-border pt-2 mt-2">
                                     <SwLabel as="label" className="flex items-center gap-2 text-purple-300"><SwIcon name="force" size={16} /> Domaine de Magie ({magicDomains.length} dispos)</SwLabel>
                                     <SwInput
                                        as="select"
                                        value={unit.domainId || ''}
                                        onChange={e => handleChange('domainId', e.target.value)}
                                        className="!px-2 !py-1.5 text-sm"
                                     >
                                        <option value="">-- Aucun --</option>
                                        {magicDomains.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                                     </SwInput>
                                 </div>
                             )}

                             <div className="space-y-1">
                                <SwLabel as="label" className="block">Capacité Active Principale</SwLabel>
                                <SwInput
                                    as="select"
                                    value={unit.ability}
                                    onChange={e => handleChange('ability', e.target.value)}
                                    className="!px-2 !py-1.5 text-sm"
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
                                </SwInput>
                                <p className="text-[9px] text-sw-faint mt-1">
                                    * Si un "Domaine" est sélectionné, l'unité reçoit automatiquement <strong className="text-sw-dim">tous</strong> les pouvoirs actifs de ce domaine. Sélectionner une capacité ici permet d'ajouter un pouvoir spécifique hors-domaine.
                                </p>
                             </div>
                         </div>
                     )}
                </FormSection>
            </div>
        </div>
    );
}

const NumberInput = ({ label, value, onChange, step=1, max }) => (
    <div className="space-y-1">
        <SwLabel as="label" className="block">{label}</SwLabel>
        <SwInput
            type="number"
            value={isNaN(value) ? '' : value}
            onChange={e => onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))}
            step={step}
            max={max}
            className="!px-2 !py-1 text-sm font-mono"
        />
    </div>
);
