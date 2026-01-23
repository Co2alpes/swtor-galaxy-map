"use client";

import { useState } from 'react';

const TALENT_POOLS = {
    dark: {
        label: "Côté Obscur",
        desc: "La voie de la passion, de la domination et de la destruction.",
        color: "#a855f7",
        talents: [
            { label: 'Corruption', desc: 'Draine 20 PV ennemis (Passif)', rank: 1 },
            { label: 'Haine', desc: '+10% Dégâts Force (Passif)', rank: 2 },
            { label: 'Éclair', desc: 'Active: Dégâts directs', rank: 2 },
            { label: 'Siphon', desc: 'Vol de vie 10% (Passif)', rank: 3 },
            { label: 'Terreur', desc: 'Aura: -15 Moral (Passif)', rank: 3 },
            { label: 'Tempête', desc: 'Active: Dégâts Zone', rank: 3 },
            { label: 'Seigneur Sith', desc: 'Ultime: +20% Stats Obscur', rank: 4 }
        ]
    },
    light: {
        label: "Côté Lumineux",
        desc: "La voie de la sérénité, de la protection et de l'harmonie.",
        color: "#38bdf8",
        talents: [
            { label: 'Méditation', desc: 'Régénération Mana +10% (Passif)', rank: 1 },
            { label: 'Sérénité', desc: 'Coût Mana -10% (Passif)', rank: 2 },
            { label: 'Guérison', desc: 'Active: Soin allié', rank: 2 },
            { label: 'Aura', desc: 'Défense alliés +15% (Passif)', rank: 3 },
            { label: 'Protection', desc: 'Bouclier de Force (Passif)', rank: 3 },
            { label: 'Onde Paix', desc: 'Active: Repousse ennemis', rank: 3 },
            { label: 'Avatar Force', desc: 'Ultime: Soin de masse', rank: 4 }
        ]
    },
    mandalorian: {
        label: "Mandalorien",
        desc: "La voie de l'honneur, de la technologie et de la puissance de feu.",
        color: "#f97316",
        talents: [
            { label: 'Beskar', desc: 'Armure +50 (Passif)', rank: 1 },
            { label: 'Viseur', desc: 'Précision +15% (Passif)', rank: 2 },
            { label: 'Arsenal', desc: 'Active: Missiles', rank: 2 },
            { label: 'Bouclier', desc: 'Résist. Explosifs 25% (Passif)', rank: 3 },
            { label: 'Jetpack', desc: 'Mobilité Aérienne (Passif)', rank: 3 },
            { label: 'Pyro', desc: 'Active: Lance-flammes', rank: 3 },
            { label: 'Mand\'alor', desc: 'Ultime: Appel Renforts', rank: 4 }
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

export default function Encyclopedia({ onClose, userFaction, magicDomains }) {
    const [tab, setTab] = useState('units'); // 'units' | 'magic'
    const [selectedItem, setSelectedItem] = useState(null);

    const allMagicDomains = [
        ...Object.values(TALENT_POOLS).map((d, i) => ({ ...d, id: `base_${i}` })),
        ...(magicDomains || [])
    ];

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300 font-sans p-8">
            <div className="w-[1000px] h-[700px] bg-[#0f1115] border-2 border-[#1f2937] flex flex-col shadow-[0_0_50px_rgba(31,41,55,0.5)] relative overflow-hidden rounded-lg">
                
                {/* HEADER */}
                <div className="bg-gray-900 p-4 border-b border-gray-800 flex justify-between items-center bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
                    <div className="flex items-center gap-4">
                        <div className="text-4xl">📚</div>
                        <div>
                            <h2 className="text-2xl font-serif font-bold text-white uppercase tracking-wider">Archives Galactiques</h2>
                            <div className="text-[10px] text-gray-400 font-mono">BASE DE DONNÉES CLASSIFIÉE</div>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-xl p-2">✕</button>
                </div>

                {/* TABS */}
                <div className="flex border-b border-gray-800 bg-black/50">
                    <button 
                        onClick={() => { setTab('units'); setSelectedItem(null); }}
                        className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors ${tab === 'units' ? 'text-blue-400 border-b-2 border-blue-500 bg-gray-900' : 'text-gray-500'}`}
                    >
                        Unités Militaires
                    </button>
                    <button 
                        onClick={() => { setTab('magic'); setSelectedItem(null); }}
                        className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors ${tab === 'magic' ? 'text-purple-400 border-b-2 border-purple-500 bg-gray-900' : 'text-gray-500'}`}
                    >
                        Arts de la Force & Tech
                    </button>
                </div>

                {/* CONTENT */}
                <div className="flex-grow flex overflow-hidden">
                    {/* LIST */}
                    <div className="w-1/3 bg-[#111] border-r border-gray-800 overflow-y-auto custom-scrollbar p-2 space-y-2">
                        {tab === 'units' ? (
                            Object.entries(UNIT_INFO).map(([key, unit]) => (
                                <div 
                                    key={key} 
                                    onClick={() => setSelectedItem({ id: key, ...unit })}
                                    className={`p-3 rounded border cursor-pointer transition-all ${selectedItem?.id === key ? 'bg-blue-900/20 border-blue-500' : 'bg-[#1a1a1a] border-gray-800 hover:border-gray-600'}`}
                                >
                                    <div className="font-bold text-gray-200 text-sm">{unit.label}</div>
                                    <div className="text-[10px] text-gray-500 truncate">{unit.type}</div>
                                </div>
                            ))
                        ) : (
                            allMagicDomains.map((domain) => (
                                <div 
                                    key={domain.id} 
                                    onClick={() => setSelectedItem({ ...domain, type: 'domain' })}
                                    className={`p-3 rounded border cursor-pointer transition-all ${selectedItem?.id === domain.id ? 'bg-purple-900/20 border-purple-500' : 'bg-[#1a1a1a] border-gray-800 hover:border-gray-600'}`}
                                >
                                    <div className="font-bold text-gray-200 text-sm" style={{color: domain.color}}>{domain.label}</div>
                                    <div className="text-[10px] text-gray-500 truncate">{domain.talents?.length || 0} Talents</div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* DETAILS */}
                    <div className="w-2/3 bg-[#0a0a0a] p-8 overflow-y-auto custom-scrollbar relative bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] bg-fixed">
                        {selectedItem ? (
                            <div className="animate-in slide-in-from-right-5 duration-300">
                                {selectedItem.type === 'domain' ? (
                                    <>
                                        <h3 className="text-3xl font-bold mb-2 uppercase tracking-tight" style={{color: selectedItem.color}}>{selectedItem.label}</h3>
                                        <p className="text-gray-400 italic mb-8 border-l-4 pl-4 border-gray-700">{selectedItem.desc}</p>
                                        
                                        <div className="space-y-4">
                                            {selectedItem.talents.map((t, idx) => (
                                                <div key={idx} className="flex gap-4 p-4 bg-black/40 border border-gray-800 rounded hover:border-gray-600 transition-colors">
                                                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded border bg-gray-900 shrink-0" style={{borderColor: selectedItem.color}}>
                                                        <span className="text-lg font-bold">{t.rank}</span>
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white uppercase">{t.label}</div>
                                                        <div className="text-sm text-gray-400">{t.desc}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="text-3xl font-bold mb-2 text-blue-400 uppercase tracking-tight">{selectedItem.label}</h3>
                                        <div className="text-xs font-mono text-gray-500 mb-6 uppercase tracking-widest border px-2 py-1 inline-block border-gray-800 rounded">Type: {selectedItem.stats.type}</div>
                                        
                                        <p className="text-gray-300 mb-8 leading-relaxed bg-gray-900/50 p-4 rounded border-l-2 border-blue-500">
                                            {selectedItem.desc}
                                        </p>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-gray-900 p-4 rounded border border-gray-800">
                                                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Points de Vie</div>
                                                <div className="text-2xl text-green-400 font-mono">{selectedItem.stats.hp} HP</div>
                                            </div>
                                            <div className="bg-gray-900 p-4 rounded border border-gray-800">
                                                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Potentiel Offensif</div>
                                                <div className="text-2xl text-red-400 font-mono">{selectedItem.stats.dmg} DMG</div>
                                            </div>
                                            <div className="bg-gray-900 p-4 rounded border border-gray-800">
                                                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Portée d'Engagement</div>
                                                <div className="text-2xl text-yellow-400 font-mono">{selectedItem.stats.range} m</div>
                                            </div>
                                            <div className="bg-gray-900 p-4 rounded border border-gray-800">
                                                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Vitesse de Manœuvre</div>
                                                <div className="text-2xl text-cyan-400 font-mono">{selectedItem.stats.speed}</div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                                <span className="text-6xl mb-4">📂</span>
                                <span className="uppercase tracking-widest font-bold">Sélectionnez une entrée</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}