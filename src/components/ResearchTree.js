"use client";

import { useState } from 'react';
import { db } from '../app/lib/firebase';
import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import ResearchMinigame from './ResearchMinigame'; // Import du mini-jeu
import { SwCell, SwIcon, SwPanel, SwTabs, SwWindow } from './ui/Swtor';

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

// Icônes du pack SWTOR pour chaque tech (présentation uniquement)
const TECH_ICONS = {
    tech_corvette: 'remotecontrolstarship',
    tech_frigate: 'missilesalvo',
    tech_cruiser: 'heatseekermissiles',
    tech_dreadnought: 'orbitalbombardment',
    tech_mining_1: 'durasteelbar',
    tech_trade_1: 'galactictradekioskunlock',
    tech_cloning: 'kolto_tank',
    tech_holocron: 'jediholocron',
    tech_meditation: 'darkmeditation'
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

            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
                <SwWindow
                    title="Laboratoire de Recherche"
                    subtitle={<>Ressources : <span className="font-mono font-bold text-sw-gold text-sm">{currentScience.toLocaleString()}</span> Données</>}
                    icon="datacron_blue"
                    onClose={onClose}
                    className="w-full max-w-5xl h-[85vh]"
                    bodyClassName="flex flex-col gap-0 overflow-hidden"
                >
                    <SwTabs
                        tabs={[
                            { id: 'military', icon: 'assault', label: 'Militaire' },
                            { id: 'economic', icon: 'galactictradekioskunlock', label: 'Économique' },
                            { id: 'force', icon: 'force', label: 'Force & Traditions' }
                        ]}
                        value={activeTab}
                        onChange={setActiveTab}
                        className="px-2"
                    />

                    <SwPanel dark className="flex-grow min-h-0 p-8 overflow-y-auto sw-scroll relative">
                        <div className="flex flex-col items-center gap-12">
                            {TECH_TREE[activeTab].map((tech) => {
                                const isUnlocked = unlockedTechs.includes(tech.id);
                                const isAvailable = canResearch(tech);
                                const isLocked = !isUnlocked && !isAvailable;

                                return (
                                    <div key={tech.id} className="relative flex flex-col items-center group">
                                        {tech.parent && <div className={`absolute -top-12 w-0.5 h-12 transition-colors ${isUnlocked ? 'bg-sw-success/60' : 'bg-sw-border group-hover:bg-sw-accent/60'}`}></div>}

                                        <button
                                            onClick={() => isAvailable && initiateResearch(tech)}
                                            disabled={isLocked || isUnlocked || isResearching}
                                            data-active={isAvailable && !isUnlocked ? 'true' : undefined}
                                            className={`
                                                sw-row w-96 p-3 flex items-center gap-4 transition-all duration-300 relative overflow-hidden text-left
                                                ${isUnlocked
                                                    ? 'border-sw-success/50 bg-sw-success/10 shadow-[0_0_16px_rgb(112_212_122/0.15)]'
                                                    : (isAvailable
                                                        ? 'hover:scale-105 hover:shadow-[0_0_24px_rgb(var(--sw-accent-rgb)/0.3)] cursor-pointer'
                                                        : 'opacity-50 grayscale cursor-not-allowed')
                                                }
                                            `}
                                        >
                                            <SwCell size={64} icon={TECH_ICONS[tech.id]} active={isUnlocked || isAvailable}>
                                                <span className="text-3xl">{tech.icon}</span>
                                            </SwCell>
                                            {isUnlocked && <SwIcon name="cnq_check_green" size={20} className="absolute left-12 bottom-2" />}

                                            <div className="flex-grow min-w-0">
                                                <h4 className={`text-sm font-bold uppercase tracking-wide ${isUnlocked ? 'text-sw-success' : (isAvailable ? 'text-sw-gold' : 'text-sw-text')}`}>{tech.label}</h4>
                                                <p className="text-[11px] text-sw-dim">{tech.desc}</p>

                                                {!isUnlocked && (
                                                    <div className="mt-2 flex items-center gap-2 text-xs font-mono">
                                                        <span className={`flex items-center gap-1 font-bold ${currentScience >= tech.cost ? 'text-sw-info' : 'text-sw-error'}`}>
                                                            {tech.cost} <SwIcon name="datacron_blue" size={14} />
                                                        </span>
                                                        {isLocked && <span className="sw-label text-sw-error text-[9px] ml-auto flex items-center gap-1"><SwIcon name="key" size={12} /> Requis : Tech Précédente</span>}
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </SwPanel>
                </SwWindow>
            </div>
        </>
    );
}