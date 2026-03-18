// src/components/IntroPopup.js
"use client";
import { useState } from 'react';

const FACTION_DESCRIPTIONS = {
    "Empire Sith": {
        title: "L'EMPIRE SITH",
        description: "Une machine de guerre disciplinée et impitoyable, forgée dans les ténèbres pour dominer la galaxie. Guidé par la volonté de l'Empereur et la force du Côté Obscur, l'Empire cherche à écraser la République et à instaurer un ordre nouveau.",
        traits: ["Puissance Militaire", "Discipline Absolue", "Maîtrise de la Force"],
        image: "/images/empire_bg.jpg",
        theme: {
            primary: "text-red-500",
            border: "border-red-900",
            bg: "bg-red-950/20",
            accent: "bg-red-600",
            shadow: "shadow-[0_0_20px_rgba(220,38,38,0.2)]",
            gradient: "from-red-900/40"
        }
    },
    "République Galactique": {
        title: "LA RÉPUBLIQUE GALACTIQUE",
        description: "Un bastion de démocratie et de liberté qui a perduré pendant des millénaires. Protégée par l'Ordre Jedi et soutenue par une vaste armée de soldats dévoués, la République se dresse contre la tyrannie pour protéger les innocents.",
        traits: ["Diplomatie", "Diversité Culturelle", "Protection Jedi"],
        image: "/images/republic_bg.jpg",
        theme: {
            primary: "text-blue-400",
            border: "border-blue-800",
            bg: "bg-blue-950/20",
            accent: "bg-blue-500",
            shadow: "shadow-[0_0_20px_rgba(59,130,246,0.2)]",
            gradient: "from-blue-900/40"
        }
    },
    "Cartel des Hutts": {
        title: "LE CARTEL DES HUTTS",
        description: "Une organisation criminelle tentaculaire motivée par le profit et le pouvoir. Les Hutts contrôlent les routes commerciales, la pègre et les ressources vitales, jouant les deux camps l'un contre l'autre pour s'enrichir.",
        traits: ["Commerce Illicite", "Influence Souterraine", "Mercenariat"],
        image: "/images/neutral_bg.jpg",
        theme: {
            primary: "text-yellow-500",
            border: "border-yellow-700",
            bg: "bg-yellow-950/20",
            accent: "bg-yellow-600",
            shadow: "shadow-[0_0_20px_rgba(234,179,8,0.2)]",
            gradient: "from-yellow-900/40"
        }
    },
    // SUPPORT POUR NOM "Systèmes Indépendants" (Legacy ou Fallback)
    "Systèmes Indépendants": {
        title: "SYSTÈMES INDÉPENDANTS",
        description: "Une coalition lâche de mondes cherchant à éviter le conflit galactique. Commerçants, contrebandiers et mercenaires y trouvent refuge loin des lois des grandes superpuissances.",
        traits: ["Commerce Libre", "Neutralité", "Opportunisme"],
        image: "/images/neutral_bg.jpg",
        theme: {
            primary: "text-yellow-500",
            border: "border-yellow-700",
            bg: "bg-yellow-950/20",
            accent: "bg-yellow-600",
            shadow: "shadow-[0_0_20px_rgba(234,179,8,0.2)]",
            gradient: "from-yellow-900/40"
        }
    },
    "Clan Mandalorien": {
        title: "CLAN MANDALORIEN",
        description: "Une culture guerrière unie par l'honneur, le combat et la gloire. Craints et respectés à travers la galaxie, les Mandaloriens cherchent le défi ultime et n'obéissent qu'à la loi du plus fort.",
        traits: ["Tradition Guerrière", "Équipement Supérieur", "Honneur"],
        image: "/images/neutral_bg.jpg",
        theme: {
            primary: "text-orange-500",
            border: "border-orange-800",
            bg: "bg-orange-950/20",
            accent: "bg-orange-600",
            shadow: "shadow-[0_0_20px_rgba(249,115,22,0.2)]",
            gradient: "from-orange-900/40"
        }
    },
    "Citoyen Galactique": {
        title: "OBSERVATEUR CIVIL",
        description: "Vous n'êtes qu'un humble citoyen de la galaxie, spectateur des grands conflits qui déchirent les étoiles. Vous observez, vous écoutez, mais vous n'intervenez pas.",
        traits: ["Spectateur", "Accès Limité", "Paix"],
        image: "/images/neutral_bg.jpg",
        theme: {
            primary: "text-gray-400",
            border: "border-gray-700",
            bg: "bg-gray-900/20",
            accent: "bg-gray-600",
            shadow: "shadow-[0_0_20px_rgba(100,100,100,0.2)]",
            gradient: "from-gray-900/40"
        }
    }
};

const FEATURES = [
    {
        title: "CARTE GALACTIQUE",
        description: "Naviguez à travers les secteurs, inspectez les planètes et planifiez vos conquêtes. Chaque système offre des ressources uniques et des opportunités stratégiques.",
        icon: "🗺️"
    },
    {
        title: "GESTION DE FLOTTE",
        description: "Commandez vos armadas, déplacez vos vaisseaux et engagez l'ennemi dans des batailles spatiales épiques pour le contrôle des routes hyperspatiales.",
        icon: "🚀"
    },
    {
        title: "DIPLOMATIE & CONSEIL",
        description: "Interagissez avec d'autres factions, négociez des alliances ou déclarez la guerre. Participez aux décisions politiques qui façonneront l'avenir de votre faction.",
        icon: "📜"
    },
    {
        title: "RECHERCHE & DÉVELOPPEMENT",
        description: "Débloquez de nouvelles technologies, améliorez vos unités et construisez des infrastructures avancées pour surpasser vos rivaux.",
        icon: "🔬"
    }
];

export default function IntroPopup({ userFaction, onClose }) {
    const [step, setStep] = useState(0); // 0: Welcome/Faction, 1: Features
    const factionInfo = FACTION_DESCRIPTIONS[userFaction] || FACTION_DESCRIPTIONS["Empire Sith"]; // Fallback
    const theme = factionInfo.theme || FACTION_DESCRIPTIONS["Empire Sith"].theme;

    const handleNext = () => {
        if (step < 1) {
            setStep(step + 1);
        } else {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-500">
            {/* Main Container - Stellaris Style Event Window */}
            <div className={`relative w-full max-w-4xl bg-[#0a0a0a] border-2 ${theme.border} ${theme.shadow} flex flex-col overflow-hidden`}>
                
                {/* Header Bar */}
                <div className={`bg-black/80 border-b ${theme.border} p-4 flex justify-between items-center relative`}>
                    <div className={`absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-${theme.primary.split('-')[1]}-400 to-transparent opacity-50`}></div>
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full border ${theme.border} flex items-center justify-center ${theme.primary} ${theme.shadow}`}>
                            !
                        </div>
                        <h1 className={`text-xl font-bold font-serif tracking-widest ${theme.primary} uppercase drop-shadow-md`}>
                            {step === 0 ? "Initialisation du Système" : "Modules Opérationnels"}
                        </h1>
                    </div>
                    <div className={`${theme.primary} text-xs font-mono opacity-70`}>SYS.LOGIN.INITIAL_SEQ</div>
                </div>

                {/* Content Area */}
                <div className="flex flex-col relative min-h-[500px]">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>

                    {step === 0 ? (
                        // STEP 0: FACTION INTRO
                        <div className="flex flex-col w-full h-full relative z-10">
                            {/* Top: Image (Full Width) */}
                            <div className={`w-full h-64 relative border-b ${theme.border} bg-black overflow-hidden group`}>
                                <img 
                                    src={factionInfo.image} 
                                    alt={factionInfo.title} 
                                    className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 group-hover:opacity-100 transition-all duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90"></div>

                                <div className="absolute bottom-0 left-0 w-full p-6">
                                    <h2 className={`text-4xl font-bold text-center uppercase tracking-[0.2em] font-serif ${theme.primary} drop-shadow-lg`}>
                                        {factionInfo.title}
                                    </h2>
                                </div>
                            </div>

                            {/* Bottom: Text */}
                            <div className="flex-grow p-8 flex flex-col items-center text-center bg-gradient-to-b from-black to-[#0a0a0a]">
                                <h3 className="text-xl text-white font-serif mb-4 pb-2 border-b border-gray-800 w-1/2 mx-auto">Bienvenue, Commandant.</h3>
                                
                                <p className="text-gray-300 text-sm leading-relaxed mb-8 max-w-2xl font-sans">
                                    {factionInfo.description}
                                </p>

                                <div className="mt-auto w-full max-w-2xl">
                                    <div className="flex items-center justify-center gap-4 mb-3">
                                        <div className={`h-px flex-grow bg-gradient-to-r from-transparent to-${theme.primary.split('-')[1]}-800`}></div>
                                        <h4 className={`${theme.primary} text-xs font-bold uppercase tracking-widest bg-black/50 px-3 py-1 rounded border ${theme.border}`}>Doctrines de Faction</h4>
                                        <div className={`h-px flex-grow bg-gradient-to-l from-transparent to-${theme.primary.split('-')[1]}-800`}></div>
                                    </div>
                                    
                                    <div className="flex justify-center flex-wrap gap-4">
                                        {factionInfo.traits.map((trait, idx) => (
                                            <div key={idx} className={`flex items-center gap-2 text-sm text-gray-300 ${theme.bg} border ${theme.border} px-4 py-2 rounded-lg`}>
                                                <span className={`${theme.primary} text-xs`}>▶</span> {trait}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // STEP 1: FEATURES
                        <div className="w-full p-8 grid grid-cols-2 gap-6 overflow-y-auto z-10">
                            {FEATURES.map((feature, idx) => (
                                <div key={idx} className={`${theme.bg} border ${theme.border} p-4 hover:${theme.primary} transition-colors group relative overflow-hidden backdrop-blur-sm`}>
                                    <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-20 transition-opacity text-5xl grayscale group-hover:grayscale-0">
                                        {feature.icon}
                                    </div>
                                    <div className="flex items-center gap-4 mb-3 relative z-10">
                                        <div className="text-3xl filter drop-shadow-md">{feature.icon}</div>
                                        <h3 className={`${theme.primary} font-bold uppercase tracking-wide text-sm border-b border-gray-700/50 pb-1 w-full`}>{feature.title}</h3>
                                    </div>
                                    <p className="text-gray-400 text-xs leading-relaxed relative z-10 pl-12">
                                        {feature.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer / Actions */}
                <div className={`bg-[#050505] border-t ${theme.border} p-4 flex justify-end gap-4 relative z-20`}>
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 flex gap-2">
                        <div className={`w-3 h-1 rounded ${step === 0 ? theme.accent : 'bg-gray-800'}`}></div>
                        <div className={`w-3 h-1 rounded ${step === 1 ? theme.accent : 'bg-gray-800'}`}></div>
                    </div>

                    <button 
                        onClick={handleNext}
                        className={`bg-black hover:${theme.bg} ${theme.primary} hover:text-white border ${theme.border} hover:border-white px-8 py-2 text-sm font-bold uppercase tracking-widest transition-all ${theme.shadow}`}
                    >
                        {step === 0 ? "Initialisation..." : "Accéder aux Systèmes"}
                    </button>
                </div>
            </div>
        </div>
    );
}
