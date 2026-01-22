"use client";

import { useState } from 'react';
import { db } from '../app/lib/firebase';
import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import ResearchMinigame from './ResearchMinigame'; // Import du mini-jeu

// --- CONFIGURATION DE L'ARBRE TECH ---
export const TECH_TREE = {
    military: [
        { id: 'tech_corvette', label: "Châssis Corvette", cost: 200, desc: "Débloque la construction des Corvettes.", icon: "🛸", parent: null },
        { id: 'tech_frigate', label: "Frégates de Ligne", cost: 800, desc: "Débloque les Frégates.", icon: "🛳️", parent: 'tech_corvette' },
        { id: 'tech_cruiser', label: "Croiseurs Lourds", cost: 2500, desc: "Débloque les Croiseurs.", icon: "⚔️", parent: 'tech_frigate' },
        { id: 'tech_dreadnought', label: "Projet Titan", cost: 10000, desc: "Débloque les Dreadnoughts.", icon: "💀", parent: 'tech_cruiser' }
    ],
    economic: [
        { id: 'tech_mining_1', label: "Extraction Profonde", cost: 300, desc: "+10% Revenus Matériaux.", icon: "⛏️", parent: null },
        { id: 'tech_trade_1', label: "Routes Commerciales", cost: 300, desc: "+10% Revenus Crédits.", icon: "💰", parent: null },
        { id: 'tech_cloning', label: "Cuves de Clonage", cost: 1000, desc: "+20% Recrutement (Manpower).", icon: "🧬", parent: 'tech_mining_1' }
    ],
    force: [
        { id: 'tech_holocron', label: "Étude des Holocrons", cost: 500, desc: "Débloque les Temples de niveau 2.", icon: "✨", parent: null },
        { id: 'tech_meditation', label: "Méditation de Combat", cost: 2000, desc: "Bonus +10% Attaque pour toutes les flottes.", icon: "🧘", parent: 'tech_holocron' }
    ]
};

export default function ResearchTree({ userFaction, factionData, onClose }) {
    const [activeTab, setActiveTab] = useState('military');
    
    // État pour savoir si on joue au mini-jeu
    const [selectedTechForGame, setSelectedTechForGame] = useState(null);
    const [isResearching, setIsResearching] = useState(false);

    const unlockedTechs = factionData?.unlocked_techs || []; 
    const currentScience = factionData?.science || 0;

    // 1. Clic sur une tech -> Ouvre le mini-jeu
    const initiateResearch = (tech) => {
        if (currentScience < tech.cost) return alert("Données insuffisantes !");
        setSelectedTechForGame(tech);
    };

    // 2. Victoire au mini-jeu -> Débloque la tech en BDD
    const handleGameWin = async () => {
        const tech = selectedTechForGame;
        setSelectedTechForGame(null); // Ferme le jeu
        setIsResearching(true); // Affiche chargement sur la carte

        try {
            await updateDoc(doc(db, "factions", userFaction), {
                science: increment(-tech.cost),
                unlocked_techs: arrayUnion(tech.id)
            });
        } catch (e) {
            console.error(e);
        } finally {
            setIsResearching(false);
        }
    };

    const canResearch = (tech) => {
        if (unlockedTechs.includes(tech.id)) return false; 
        if (tech.parent && !unlockedTechs.includes(tech.parent)) return false; 
        return true;
    };

    return (
        <>
            {/* MINI-JEU EN SURIMPRESSION */}
            {selectedTechForGame && (
                <ResearchMinigame 
                    techType={activeTab} // Passe le type (military, economic, force) pour choisir le jeu
                    onWin={handleGameWin}
                    onClose={() => setSelectedTechForGame(null)}
                />
            )}

            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 font-sans animate-in fade-in zoom-in-95 duration-200">
                <div className="w-full max-w-5xl h-[85vh] bg-gray-900 border-2 border-blue-500/50 rounded-xl flex flex-col shadow-[0_0_50px_rgba(37,99,235,0.2)] overflow-hidden">
                    
                    <div className="p-6 border-b border-blue-900/50 bg-black/40 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="text-4xl animate-pulse">💠</div>
                            <div>
                                <h2 className="text-2xl font-bold text-blue-100 uppercase tracking-widest">Laboratoire de Recherche</h2>
                                <p className="text-blue-400 text-xs uppercase">Ressources : <span className="font-mono font-bold text-white text-lg">{currentScience.toLocaleString()}</span> Données</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="px-4 py-2 border border-blue-800 hover:bg-blue-900/50 text-blue-200 uppercase text-xs font-bold rounded transition">Fermer</button>
                    </div>

                    <div className="flex border-b border-blue-900/30 bg-black/20">
                        <button onClick={() => setActiveTab('military')} className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition ${activeTab === 'military' ? 'bg-red-900/20 text-red-400 border-b-2 border-red-500' : 'text-gray-500 hover:text-white'}`}>⚔️ Militaire</button>
                        <button onClick={() => setActiveTab('economic')} className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition ${activeTab === 'economic' ? 'bg-yellow-900/20 text-yellow-400 border-b-2 border-yellow-500' : 'text-gray-500 hover:text-white'}`}>💰 Économique</button>
                        <button onClick={() => setActiveTab('force')} className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition ${activeTab === 'force' ? 'bg-purple-900/20 text-purple-400 border-b-2 border-purple-500' : 'text-gray-500 hover:text-white'}`}>✨ Force & Traditions</button>
                    </div>

                    <div className="flex-grow p-8 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed relative">
                        <div className="flex flex-col items-center gap-12">
                            {TECH_TREE[activeTab].map((tech) => {
                                const isUnlocked = unlockedTechs.includes(tech.id);
                                const isAvailable = canResearch(tech);
                                const isLocked = !isUnlocked && !isAvailable;

                                return (
                                    <div key={tech.id} className="relative flex flex-col items-center group">
                                        {tech.parent && <div className="absolute -top-12 w-0.5 h-12 bg-gray-700 group-hover:bg-blue-500/50 transition-colors"></div>}
                                        
                                        <button 
                                            onClick={() => isAvailable && initiateResearch(tech)}
                                            disabled={isLocked || isUnlocked || isResearching}
                                            className={`
                                                w-96 p-4 border-2 rounded-lg flex items-center gap-4 transition-all duration-300 relative overflow-hidden text-left
                                                ${isUnlocked 
                                                    ? 'bg-green-950/40 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.2)]' 
                                                    : (isAvailable 
                                                        ? 'bg-gray-900/80 border-blue-500 hover:bg-blue-900/30 hover:scale-105 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] cursor-pointer' 
                                                        : 'bg-black/60 border-gray-800 opacity-50 grayscale cursor-not-allowed')
                                                }
                                            `}
                                        >
                                            <div className={`text-3xl w-16 h-16 flex items-center justify-center rounded-full bg-black/50 border ${isUnlocked ? 'border-green-500' : 'border-gray-600'}`}>
                                                {isUnlocked ? '✔️' : tech.icon}
                                            </div>
                                            
                                            <div className="flex-grow">
                                                <h4 className={`text-sm font-bold uppercase ${isUnlocked ? 'text-green-400' : 'text-gray-200'}`}>{tech.label}</h4>
                                                <p className="text-[10px] text-gray-400">{tech.desc}</p>
                                                
                                                {!isUnlocked && (
                                                    <div className="mt-2 flex items-center gap-2 text-xs font-mono">
                                                        <span className={`${currentScience >= tech.cost ? 'text-blue-300' : 'text-red-500'}`}>
                                                            {tech.cost} 💠
                                                        </span>
                                                        {isLocked && <span className="text-red-500 uppercase text-[9px] ml-auto">🔒 Requis : Tech Précédente</span>}
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}