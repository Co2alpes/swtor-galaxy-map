// src/components/IntroPopup.js
"use client";
import { useState } from 'react';
import { SwButton, SwCell, SwDivider, SwEmblem, SwGlass, SwIcon, SwLabel, SwPanel, SwWindow, factionKit } from './ui/Swtor';

const FACTION_DESCRIPTIONS = {
    "Empire Sith": {
        title: "L'EMPIRE SITH",
        description: "Une machine de guerre disciplinée et impitoyable, forgée dans les ténèbres pour dominer la galaxie. Guidé par la volonté de l'Empereur et la force du Côté Obscur, l'Empire cherche à écraser la République et à instaurer un ordre nouveau.",
        traits: ["Puissance Militaire", "Discipline Absolue", "Maîtrise de la Force"],
        image: "/images/empire_bg.jpg",
        theme: {
            kit: "empire",
            tone: "#e8403a"
        }
    },
    "République Galactique": {
        title: "LA RÉPUBLIQUE GALACTIQUE",
        description: "Un bastion de démocratie et de liberté qui a perduré pendant des millénaires. Protégée par l'Ordre Jedi et soutenue par une vaste armée de soldats dévoués, la République se dresse contre la tyrannie pour protéger les innocents.",
        traits: ["Diplomatie", "Diversité Culturelle", "Protection Jedi"],
        image: "/images/republic_bg.jpg",
        theme: {
            kit: "republic",
            tone: "#60aaf5"
        }
    },
    "Cartel des Hutts": {
        title: "LE CARTEL DES HUTTS",
        description: "Une organisation criminelle tentaculaire motivée par le profit et le pouvoir. Les Hutts contrôlent les routes commerciales, la pègre et les ressources vitales, jouant les deux camps l'un contre l'autre pour s'enrichir.",
        traits: ["Commerce Illicite", "Influence Souterraine", "Mercenariat"],
        image: "/images/neutral_bg.jpg",
        theme: {
            kit: "neutral",
            tone: "#f0a33a"
        }
    },
    // SUPPORT POUR NOM "Systèmes Indépendants" (Legacy ou Fallback)
    "Systèmes Indépendants": {
        title: "SYSTÈMES INDÉPENDANTS",
        description: "Une coalition lâche de mondes cherchant à éviter le conflit galactique. Commerçants, contrebandiers et mercenaires y trouvent refuge loin des lois des grandes superpuissances.",
        traits: ["Commerce Libre", "Neutralité", "Opportunisme"],
        image: "/images/neutral_bg.jpg",
        theme: {
            kit: "neutral",
            tone: "#f0a33a"
        }
    },
    "Clan Mandalorien": {
        title: "CLAN MANDALORIEN",
        description: "Une culture guerrière unie par l'honneur, le combat et la gloire. Craints et respectés à travers la galaxie, les Mandaloriens cherchent le défi ultime et n'obéissent qu'à la loi du plus fort.",
        traits: ["Tradition Guerrière", "Équipement Supérieur", "Honneur"],
        image: "/images/neutral_bg.jpg",
        theme: {
            kit: "neutral",
            tone: "#f97316"
        }
    },
    "Citoyen Galactique": {
        title: "OBSERVATEUR CIVIL",
        description: "Vous n'êtes qu'un humble citoyen de la galaxie, spectateur des grands conflits qui déchirent les étoiles. Vous observez, vous écoutez, mais vous n'intervenez pas.",
        traits: ["Spectateur", "Accès Limité", "Paix"],
        image: "/images/neutral_bg.jpg",
        theme: {
            kit: "neutral",
            tone: "#9ca3af"
        }
    }
};

const FEATURES = [
    {
        title: "CARTE GALACTIQUE",
        description: "Naviguez à travers les secteurs, inspectez les planètes et planifiez vos conquêtes. Chaque système offre des ressources uniques et des opportunités stratégiques.",
        icon: "star_map"
    },
    {
        title: "GESTION DE FLOTTE",
        description: "Commandez vos armadas, déplacez vos vaisseaux et engagez l'ennemi dans des batailles spatiales épiques pour le contrôle des routes hyperspatiales.",
        icon: "remotecontrolstarship"
    },
    {
        title: "DIPLOMATIE & CONSEIL",
        description: "Interagissez avec d'autres factions, négociez des alliances ou déclarez la guerre. Participez aux décisions politiques qui façonneront l'avenir de votre faction.",
        icon: "lore"
    },
    {
        title: "RECHERCHE & DÉVELOPPEMENT",
        description: "Débloquez de nouvelles technologies, améliorez vos unités et construisez des infrastructures avancées pour surpasser vos rivaux.",
        icon: "datacron_blue"
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-500">
            {/* Main Container - Fenêtre SWTOR */}
            <SwWindow
                faction={theme.kit}
                title={step === 0 ? "Initialisation du Système" : "Modules Opérationnels"}
                subtitle="SYS.LOGIN.INITIAL_SEQ"
                className="w-full max-w-4xl max-h-[92vh]"
                bodyClassName="flex flex-col p-0! overflow-hidden"
            >

                {/* Content Area */}
                <div className="flex flex-col relative flex-1 min-h-[min(500px,70vh)] overflow-y-auto sw-scroll">

                    {step === 0 ? (
                        // STEP 0: FACTION INTRO
                        <div className="flex flex-col w-full h-full relative z-10">
                            {/* Top: Image (Full Width) */}
                            <div className="w-full h-64 relative bg-sw-bg overflow-hidden group" style={{ boxShadow: `0 1px 0 ${theme.tone}88` }}>
                                <div className="absolute inset-0 bg-cover bg-bottom mix-blend-screen opacity-70" style={{ backgroundImage: `url(${factionKit(theme.kit).background})` }}></div>
                                <img
                                    src={factionInfo.image}
                                    alt={factionInfo.title}
                                    className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-screen group-hover:scale-105 group-hover:opacity-90 transition-all duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-sw-bg"></div>

                                <div className="absolute bottom-0 left-0 w-full p-6 flex flex-col items-center gap-3">
                                    <SwEmblem faction={theme.kit} size={64} />
                                    <h2
                                        className="sw-title text-3xl md:text-4xl text-center tracking-[0.2em] drop-shadow-lg"
                                        style={{ color: theme.tone, textShadow: `0 0 16px ${theme.tone}88` }}
                                    >
                                        {factionInfo.title}
                                    </h2>
                                </div>
                            </div>

                            {/* Bottom: Text */}
                            <div className="flex-grow p-8 flex flex-col items-center text-center">
                                <h3 className="sw-title text-xl mb-2">Bienvenue, Commandant.</h3>
                                <SwDivider className="w-1/2 mx-auto mb-5" />

                                <p className="text-sw-dim text-sm leading-relaxed mb-8 max-w-2xl">
                                    {factionInfo.description}
                                </p>

                                <div className="mt-auto w-full max-w-2xl">
                                    <div className="flex items-center justify-center gap-4 mb-3">
                                        <div className="h-px flex-grow" style={{ background: `linear-gradient(to right, transparent, ${theme.tone}aa)` }}></div>
                                        <SwLabel className="text-sw-gold">Doctrines de Faction</SwLabel>
                                        <div className="h-px flex-grow" style={{ background: `linear-gradient(to left, transparent, ${theme.tone}aa)` }}></div>
                                    </div>

                                    <div className="flex justify-center flex-wrap gap-3">
                                        {factionInfo.traits.map((trait, idx) => (
                                            <SwGlass key={idx} accent={theme.tone} className="flex items-center gap-2 text-sm text-sw-text pl-4 pr-4 py-2">
                                                <span className="text-xs" style={{ color: theme.tone }}>▶</span> {trait}
                                            </SwGlass>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // STEP 1: FEATURES
                        <div className="w-full p-6 grid grid-cols-1 md:grid-cols-2 gap-4 z-10">
                            {FEATURES.map((feature, idx) => (
                                <SwPanel key={idx} className="p-4 transition-colors group relative overflow-hidden hover:bg-sw-panel-light">
                                    <div className="absolute -top-2 -right-2 opacity-10 group-hover:opacity-25 transition-opacity grayscale group-hover:grayscale-0 pointer-events-none">
                                        <SwIcon name={feature.icon} size={72} />
                                    </div>
                                    <div className="flex items-center gap-3 mb-3 relative z-10">
                                        <SwCell icon={feature.icon} size={44} />
                                        <h3 className="sw-title text-sm tracking-wide w-full pb-1 border-b border-sw-border">{feature.title}</h3>
                                    </div>
                                    <p className="text-sw-dim text-xs leading-relaxed relative z-10 pl-14">
                                        {feature.description}
                                    </p>
                                </SwPanel>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer / Actions */}
                <div className="shrink-0 p-4 flex justify-end gap-4 relative z-20 border-t border-sw-border bg-sw-panel-dark/70 rounded-b-[10px]">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 flex gap-2">
                        <div className={`w-4 h-1 rounded ${step === 0 ? '' : 'bg-sw-border'}`} style={step === 0 ? { background: theme.tone, boxShadow: `0 0 6px ${theme.tone}` } : undefined}></div>
                        <div className={`w-4 h-1 rounded ${step === 1 ? '' : 'bg-sw-border'}`} style={step === 1 ? { background: theme.tone, boxShadow: `0 0 6px ${theme.tone}` } : undefined}></div>
                    </div>

                    <SwButton
                        onClick={handleNext}
                        variant="accent"
                        className="px-8"
                    >
                        {step === 0 ? "Initialisation..." : "Accéder aux Systèmes"}
                    </SwButton>
                </div>
            </SwWindow>
        </div>
    );
}
