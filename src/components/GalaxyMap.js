"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { auth, db } from '../app/lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, getDocs, doc, addDoc, deleteDoc, onSnapshot, query, updateDoc, setDoc, increment, where, arrayUnion, arrayRemove, writeBatch, collectionGroup } from 'firebase/firestore';
import DiplomacyScreen from './DiplomacyScreen';
import NotificationPanel from './NotificationPanel';
import CouncilManager from './CouncilManager';
import FleetManager from './FleetManager';
import FleetCombat from './FleetCombat';
import GroundCombat from './GroundCombat';
import BorderLayer from './BorderLayer';
import ProfileScreen from './ProfileScreen';
import ResearchTree from './ResearchTree';
import UnitManager from './UnitManager';
import GroundMapEditor from './GroundMapEditor';
import Encyclopedia from './Encyclopedia';
import AdminUserList from './AdminUserList';
import MagicManager from './MagicManager';
import HolonetEditor from './HolonetEditor';
import IntroPopup from './IntroPopup';
import { MapDefs, BackgroundLayer, RouteLayer, FleetLayer, PlanetLayer } from './MapLayers';
import { SwButton, SwCell, SwDivider, SwGlass, SwIcon, SwInput, SwLabel, SwPanel, SwTabs, SwWindow } from './ui/Swtor';

// Icônes SWTOR des ressources (public/ui/icons)
const RESOURCE_ICONS = { credits: 'claninsignia', materials: 'durasteelbar', manpower: 'unassembled_helm', science: 'datapad' };
const ResIcon = ({ res, size = 14, className }) => <SwIcon name={RESOURCE_ICONS[res]} size={size} className={className} />;

// Icônes SWTOR des catégories de bâtiments (les emojis restent dans les <option>)
const CATEGORY_ICONS = { economic: 'galactictradekioskunlock', military: 'assault', orbital: 'orbitalbombardment', force: 'force', unique: 'datacron_blue' };

// Icônes SWTOR des unités de garnison
const garrisonIcon = (type) => (type === 'turret' ? 'mtx_toy_turret' : (type === 'vehicle' ? 'armorplating' : 'unassembled_helm'));

// Bouton d'icône du HUD (case SWTOR + icône du pack)
const HudCell = ({ icon, title, onClick, size = 44, active, className }) => (
    <SwCell icon={icon} size={size} title={title} onClick={onClick} active={active} className={className} />
);

// --- 1. CONFIGURATION GLOBALE ---
const ARCHITECT_ROLES = ['admin', 'gamemaster'];
const HIGH_COMMAND_ROLES = ['admin', 'conseil', 'general', 'emperor'];
const PLANET_SLOTS_CONFIG = { capital: 8, industrial: 6, force_nexus: 5, standard: 4, unknown: 3 };
const FLEET_SPEED = 75; 

const BUILDING_CATEGORIES = [
    { id: 'economic', label: 'Infrastructures Civiles & Économie', icon: '💰', color: 'text-yellow-400', border: 'border-yellow-600/30', bg: 'bg-yellow-900/10' },
    { id: 'military', label: 'Infrastructures de Combat Terrestre', icon: '🎖️', color: 'text-red-500', border: 'border-red-600/30', bg: 'bg-red-900/10' },
    { id: 'orbital', label: 'Défense & Chantiers Orbitaux', icon: '🛰️', color: 'text-cyan-500', border: 'border-cyan-600/30', bg: 'bg-cyan-900/10' },
    { id: 'force', label: 'Ordres de la Force & Cultes', icon: '✨', color: 'text-purple-400', border: 'border-purple-600/30', bg: 'bg-purple-900/10' },
    { id: 'unique', label: 'Merveilles & Uniques', icon: '🌟', color: 'text-orange-400', border: 'border-orange-600/30', bg: 'bg-orange-900/10' }
];

const SHIP_MAINTENANCE_VALUES = {
    fighter: { cr: 2, mp: 1, power: 1 },
    corvette: { cr: 10, mp: 5, power: 5 },
    frigate: { cr: 40, mp: 15, power: 15 },
    cruiser: { cr: 150, mp: 50, power: 40 },
    dreadnought: { cr: 500, mp: 200, power: 100 }
};

const SHIP_STATS = {
    fighter: { label: "Chasseurs" },
    corvette: { label: "Corvettes" },
    frigate: { label: "Frégates" },
    cruiser: { label: "Croiseurs" },
    dreadnought: { label: "Dreadnoughts" }
};

const GROUND_UNIT_STATS = {
    infantry: { label: "Infanterie" },
    heavy_infantry: { label: "Infanterie Lourde" },
    vehicle: { label: "Véhicules Blindés" },
    air_support: { label: "Soutien Aérien" },
    turret: { label: "Tourelles Défensives" }
};

const GARRISON_MAINTENANCE_VALUES = {
    infantry: { cr: 1, mp: 1, power: 2 },
    heavy_infantry: { cr: 4, mp: 2, power: 5 },
    vehicle: { cr: 15, mp: 4, power: 12 },
    air_support: { cr: 25, mp: 3, power: 15 },
    turret: { cr: 5, mp: 0, power: 8 }
};

const GARRISON_STATS = {
    infantry: { label: "Infanterie Légère", cost: { cr: 50, mp: 10 } },
    heavy_infantry: { label: "Infanterie Lourde", cost: { cr: 150, mp: 20 } },
    vehicle: { label: "Véhicules Blindés", cost: { cr: 400, mp: 50 } },
    air_support: { label: "Escadron Aérien", cost: { cr: 600, mp: 30 } },
    turret: { label: "Défense Planétaire", cost: { cr: 250, mp: 5 } }
};

const toRoman = (num) => {
    const lookup = {M:1000,CM:900,D:500,CD:400,C:100,XC:90,L:50,XL:40,X:10,IX:9,V:5,IV:4,I:1};
    let roman = '', i;
    for ( i in lookup ) { while ( num >= lookup[i] ) { roman += i; num -= lookup[i]; } }
    return roman;
};

// --- 2. LOGIQUE DE COMBAT ---
const resolveBattle = (attackerFleet, defenderPlanet, defenderFleets) => {
    let attackPower = 0;
    const attackerComposition = { ...attackerFleet.composition }; 
    
    if (attackerFleet.composition) {
        Object.entries(attackerFleet.composition).forEach(([type, count]) => {
            const stats = SHIP_MAINTENANCE_VALUES[type] || { power: 1 };
            attackPower += stats.power * count;
        });
    }
    if (attackerFleet.commander_id) attackPower *= 1.2;

    let defensePower = 20; 
    
    // GARRISON POWER
    if (defenderPlanet.garrison) {
        Object.entries(defenderPlanet.garrison).forEach(([type, count]) => {
            const stats = GARRISON_MAINTENANCE_VALUES[type] || { power: 1 };
            defensePower += stats.power * count;
        });
    }

    defenderFleets.forEach(fleet => {
        let fleetPower = 0;
        if (fleet.composition) {
            Object.entries(fleet.composition).forEach(([type, count]) => {
                const stats = SHIP_MAINTENANCE_VALUES[type] || { power: 1 };
                fleetPower += stats.power * count;
            });
        }
        if (fleet.commander_id) fleetPower *= 1.2;
        defensePower += fleetPower;
    });

    const attackRoll = attackPower * (0.9 + Math.random() * 0.2); 
    const defenseRoll = defensePower * (0.9 + Math.random() * 0.2);
    const attackerWon = attackRoll > defenseRoll;

    const loserPower = attackerWon ? defenseRoll : attackRoll;
    const winnerPower = attackerWon ? attackRoll : defenseRoll;
    const damageRatio = Math.min(0.8, (loserPower / winnerPower) * 0.5); 

    const winnerLosses = {};
    const winnerRemaining = {};

    // Calcul des pertes pour le vainqueur
    if (attackerWon) {
        Object.entries(attackerComposition).forEach(([type, count]) => {
            const loss = Math.ceil(count * damageRatio * (0.8 + Math.random() * 0.4));
            winnerLosses[type] = loss;
            winnerRemaining[type] = Math.max(0, count - loss);
        });
    }

    // Calcul des pertes de garnison si le défenseur gagne
    let newGarrison = defenderPlanet.garrison || {};
    if (!attackerWon) {
        newGarrison = {};
        Object.entries(defenderPlanet.garrison || {}).forEach(([type, count]) => {
            const loss = Math.ceil(count * damageRatio * (0.8 + Math.random() * 0.4));
            newGarrison[type] = Math.max(0, count - loss);
        });
    } else {
        newGarrison = {}; // Garnison anéantie
    }

    let reportLog = `--- RAPPORT TACTIQUE : ${defenderPlanet.name} ---\n\n`;
    reportLog += `Forces en présence :\n> ATTAQUANT (${attackerFleet.owner}) : Puissance ${Math.round(attackPower)}\n> DÉFENSEUR (${defenderPlanet.owner}) : Puissance ${Math.round(defensePower)}\n\n`;
    reportLog += `RÉSULTAT : ${attackerWon ? "VICTOIRE DE L'ENVAHISSEUR" : "DÉFENSE HÉROÏQUE"}\n\n`;

    if (attackerWon) {
        reportLog += `Pertes de l'Attaquant :\n`;
        Object.entries(winnerLosses).forEach(([type, count]) => {
            if (count > 0) reportLog += `- ${SHIP_STATS[type]?.label || type}: -${count}\n`;
        });
        reportLog += `\nPertes du Défenseur :\n> ANÉANTISSEMENT TOTAL des flottes et de la garnison.`;
    } else {
        reportLog += `L'attaquant a été repoussé et sa flotte entièrement détruite.\nLa planète reste sous contrôle de ${defenderPlanet.owner}.`;
    }

    return {
        attackerWon,
        newAttackerComposition: winnerRemaining,
        newGarrison,
        reportLog
    };
};

// --- 3. HELPER FUNCTIONS ---
const findShortestPath = (startId, endId, allPlanets) => {
    const graph = {};
    allPlanets.forEach(p => { graph[p.id] = p.connected_to || []; });
    const distances = {};
    const previous = {};
    const queue = [];
    allPlanets.forEach(p => {
        distances[p.id] = Infinity;
        previous[p.id] = null;
        queue.push(p.id);
    });
    distances[startId] = 0;
    while (queue.length > 0) {
        let u = queue.reduce((minNode, nodeId) => (distances[nodeId] < distances[minNode] ? nodeId : minNode), queue[0]);
        if (u === endId) {
            const path = [];
            while (previous[u]) {
                path.unshift(u);
                u = previous[u];
            }
            path.unshift(startId);
            return path;
        }
        const index = queue.indexOf(u);
        if (index > -1) queue.splice(index, 1);
        if (distances[u] === Infinity) break;
        if (graph[u]) {
            graph[u].forEach(neighborId => {
                if (queue.includes(neighborId)) {
                    const alt = distances[u] + 1; 
                    if (alt < distances[neighborId]) {
                        distances[neighborId] = alt;
                        previous[neighborId] = u;
                    }
                }
            });
        }
    }
    return null;
};

const getFleetPosition = (fleet, planets, currentTurn) => {
    if (!fleet.path || fleet.path.length < 2) return null;
    const totalTurns = fleet.arrival_turn - fleet.start_turn;
    if (totalTurns <= 0) return null;
    const turnsPassed = currentTurn - fleet.start_turn;
    let progress = Math.max(0, Math.min(1, turnsPassed / totalTurns));
    if (currentTurn >= fleet.arrival_turn) progress = 1;
    let totalPathDistance = 0;
    const segmentDistances = [];
    for (let i = 0; i < fleet.path.length - 1; i++) {
        const p1 = planets.find(p => p.id === fleet.path[i]);
        const p2 = planets.find(p => p.id === fleet.path[i+1]);
        if (p1 && p2) {
            const x1 = Number(p1.x); const y1 = Number(p1.y);
            const x2 = Number(p2.x); const y2 = Number(p2.y);
            const d = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            segmentDistances.push(d);
            totalPathDistance += d;
        } else {
            segmentDistances.push(0);
        }
    }
    let currentDistance = progress * totalPathDistance;
    let segmentIndex = 0;
    while (segmentIndex < segmentDistances.length && currentDistance > segmentDistances[segmentIndex]) {
        currentDistance -= segmentDistances[segmentIndex];
        segmentIndex++;
    }
    if (segmentIndex >= segmentDistances.length) {
        const lastP = planets.find(p => p.id === fleet.path[fleet.path.length-1]);
        return lastP ? { x: Number(lastP.x), y: Number(lastP.y) } : null;
    }
    const pStart = planets.find(p => p.id === fleet.path[segmentIndex]);
    const pEnd = planets.find(p => p.id === fleet.path[segmentIndex + 1]);
    if (!pStart || !pEnd) return null;
    const segmentPercent = segmentDistances[segmentIndex] > 0 ? currentDistance / segmentDistances[segmentIndex] : 0;
    return {
        x: Number(pStart.x) + (Number(pEnd.x) - Number(pStart.x)) * segmentPercent,
        y: Number(pStart.y) + (Number(pEnd.y) - Number(pStart.y)) * segmentPercent
    };
};

const Icons = {
    Credits: () => <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    Materials: () => <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
    Manpower: () => <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    Science: () => <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>,
    Logout: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
    Construction: () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
    Upgrade: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>,
    ArrowUp: () => <svg className="w-4 h-4 text-sw-faint"fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>,
    User: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
};

const GarrisonManager = ({ planet, factionData, onClose, onRecruit, onDisband, planetBuildings = [], buildingsTemplates = [] }) => {
    if (!planet) return null;
    const garrison = planet.garrison || {};
    
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <SwWindow
                title="Commandement de Garnison"
                subtitle={`Secteur ${planet.name}`}
                icon="shieldgenerator"
                onClose={onClose}
                className="w-full max-w-2xl max-h-[85vh]"
                bodyClassName="flex flex-col min-h-0"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex-grow min-h-0 overflow-y-auto sw-scroll pr-1">
                    <div className="grid grid-cols-1 gap-2 mb-6">
                        <SwLabel className="text-sw-gold mb-1">Forces Déployées</SwLabel>

                        {Object.keys(GARRISON_STATS).map(type => {
                            const count = garrison[type] || 0;
                            const stats = GARRISON_STATS[type];
                            const maint = GARRISON_MAINTENANCE_VALUES[type];
                            return (
                                <div key={type} className="sw-row flex items-center justify-between p-2 group">
                                    <div className="flex items-center gap-3">
                                        <SwCell icon={garrisonIcon(type)} size={44} />
                                        <div>
                                            <div className="font-bold text-sw-text text-sm uppercase tracking-wide group-hover:text-sw-gold transition-colors">{stats.label}</div>
                                            <div className="text-[10px] text-sw-dim flex gap-1 mt-0.5">
                                                <span>Puissance <span className="text-sw-gold font-bold">{maint.power}</span></span>
                                                <span className="text-sw-faint">·</span>
                                                <span className="text-sw-error">-{maint.cr}Cr/t</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="sw-panel-dark px-3 py-1 font-mono text-lg text-sw-text">{String(count).padStart(2, '0')}</div>
                                        {count > 0 && (
                                            <SwButton size="sm" variant="danger" onClick={() => onDisband(type)} title="Démanteler">-</SwButton>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <SwDivider className="mb-4" />

                    <div className="grid grid-cols-1 gap-2">
                        <SwLabel className="text-sw-gold mb-1">Protocoles de Recrutement</SwLabel>

                        <div className="grid grid-cols-2 gap-3">
                            {Object.entries(GARRISON_STATS).map(([type, info]) => {
                                const cost = info.cost;

                                // LOGIQUE D'UNLOCK
                                const isUnlocked = type === 'infantry' || planetBuildings.some(b => {
                                    const t = buildingsTemplates.find(temp => temp.id === b.template_id);
                                    if (!t) return false;
                                    if (t.unlocks_units?.includes(type)) return true;
                                    if (t.upgrades) return t.upgrades.some(u => u.level <= b.level && u.unlocks_units?.includes(type));
                                    return false;
                                });

                                const canAfford = factionData.credits >= cost.cr && factionData.manpower >= cost.mp;
                                const isRecruitable = canAfford && isUnlocked;

                                return (
                                    <button
                                        key={type}
                                        onClick={() => isRecruitable && onRecruit(type)}
                                        disabled={!isRecruitable}
                                        className={`p-3 border rounded-md flex flex-col gap-2 transition-all text-left relative overflow-hidden group
                                        ${isRecruitable
                                            ? 'bg-sw-panel border-sw-border hover:border-sw-gold-dim hover:bg-sw-panel-light hover:shadow-[0_0_14px_rgb(var(--sw-accent-rgb)/0.25)]'
                                            : 'bg-sw-panel-dark border-sw-border/50 opacity-40 cursor-not-allowed grayscale'}`}
                                    >

                                        <div className="flex justify-between items-start gap-2 z-10">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <SwIcon name={garrisonIcon(type)} size={24} />
                                                <span className={`font-bold text-sm uppercase tracking-wider truncate ${canAfford ? 'text-sw-text group-hover:text-sw-gold' : 'text-sw-faint'}`}>{info.label}</span>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {!isUnlocked && <SwIcon name="key" size={18} title="Verrouillé" />}
                                                <span className="text-[9px] sw-panel-dark px-1.5 py-0.5 text-sw-gold font-mono">{GARRISON_MAINTENANCE_VALUES[type].power} POW</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 text-xs z-10 mt-auto">
                                            <span className={`flex items-center gap-1.5 font-mono ${canAfford ? 'text-sw-gold' : 'text-sw-error'}`}>{cost.cr}<ResIcon res="credits" /></span>
                                            <span className={`flex items-center gap-1.5 font-mono ${canAfford ? 'text-sw-success' : 'text-sw-error'}`}>{cost.mp}<ResIcon res="manpower" /></span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-3 pt-3 border-t border-sw-border flex justify-between items-center sw-label text-[10px] text-sw-faint">
                    <span>État: Opérationnel</span>
                    <span>Capacité Max: Illimitée</span>
                </div>
            </SwWindow>
        </div>
    );
};

// --- COMPOSANTS HUD ---
const TopHud = ({ userFaction, factionData, projectedIncome, currentTurn, isAdmin, isProcessingTurn, handleNextTurn, handleLogout, onOpenProfile, onOpenMapEditor, onOpenAdminUsers }) => (
    <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
        <div className="flex items-start gap-2 pointer-events-auto">
            <NotificationPanel userID={userFaction} />
            <SwGlass className="flex items-stretch gap-2 shadow-2xl overflow-hidden p-1 pl-2">
                <div className="px-3 py-1.5 flex flex-col justify-center border-r border-sw-border min-w-[100px] text-center">
                    <SwLabel as="span" className="text-[9px] leading-none mb-1">Calendrier</SwLabel>
                    <div className="flex flex-col items-center">
                        <span className="sw-title text-lg leading-none">MOIS {currentTurn}</span>
                        {isAdmin && (<SwButton size="sm" variant="accent" onClick={handleNextTurn} disabled={isProcessingTurn} className="mt-1.5 w-full text-[9px]">{isProcessingTurn ? "..." : "SUIVANT >>"}</SwButton>)}
                    </div>
                </div>
                <div className="flex items-center gap-4 px-2">
                    <ResourceDisplay icon={<ResIcon res="credits" size={28} />} label="Crédits" value={factionData?.credits} income={projectedIncome.credits} />
                    <ResourceDisplay icon={<ResIcon res="materials" size={28} />} label="Matériaux" value={factionData?.materials} income={projectedIncome.materials} />
                    <ResourceDisplay icon={<ResIcon res="manpower" size={28} />} label="Effectifs" value={factionData?.manpower} income={projectedIncome.manpower} />
                    <ResourceDisplay icon={<ResIcon res="science" size={28} />} label="Données" value={factionData?.science || 0} income={projectedIncome.science} />
                </div>
                <div className="w-px bg-sw-border my-1"></div>
                <div className="flex items-center gap-1 pr-1">
                    {isAdmin && (
                        <>
                            <HudCell icon="key" size={36} onClick={onOpenAdminUsers} title="Admin Utilisateurs" />
                            <HudCell icon="cnq_warzones_ranked" size={36} onClick={onOpenMapEditor} title="Éditeur de Carte" />
                        </>
                    )}
                    <HudCell icon="energyshield" size={36} onClick={onOpenProfile} title="Profil" />
                    <button onClick={handleLogout} className="w-9 h-9 flex items-center justify-center rounded text-sw-dim hover:text-sw-error hover:bg-sw-error/10 transition-colors" title="Déconnexion">
                        <Icons.Logout />
                    </button>
                </div>
            </SwGlass>
        </div>
    </div>
);

const ResourceDisplay = ({ icon, label, value, income }) => (
    <div className="flex items-center gap-2">
        <SwCell size={34}>{icon}</SwCell>
        <div className="flex flex-col">
            <SwLabel as="span" className="text-[9px] leading-tight">{label}</SwLabel>
            <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-sw-text font-mono">{value?.toLocaleString() ?? 0}</span>
                <span className={`text-[10px] font-mono font-bold ${income >= 0 ? 'text-sw-success' : 'text-sw-error'}`}>{income >= 0 ? '+' : ''}{income}</span>
            </div>
        </div>
    </div>
);

const PlanetDock = ({ selectedPlanet, isTerritoryOwned, canBuild, slots, buildingsTemplates, currentTurn, setShowBuildMenu, handleUpgrade, handleDemolish, handleCancel, showAssignMenu, setShowAssignMenu, factionMembers, handleAssignGovernor, isHighCommand, setShowGarrisonMenu }) => {
    if (!selectedPlanet) return null;
    return (
        <div className="h-64 fixed bottom-0 left-0 w-full flex z-40 animate-in slide-in-from-bottom-20 duration-500">
            {/* Main Dock Container */}
            <div className="bg-sw-panel-dark backdrop-blur-xl border-t border-sw-line shadow-[0_-10px_40px_rgb(0_0_0/0.8)] flex overflow-hidden relative w-full">
                 {/* Decorative Line */}
                 <SwDivider className="absolute top-0 left-0 w-full" />

                 {/* Left Panel: Planetary Data */}
                 <div className="w-64 p-5 border-r border-sw-border bg-sw-panel/60 flex flex-col justify-between shrink-0 relative">
                     <div>
                        <SwLabel className="text-[10px] mb-1">Système</SwLabel>
                        <h2 className="sw-title text-2xl truncate drop-shadow-lg">{selectedPlanet.name}</h2>

                        <div className="flex gap-2 mt-3">
                            <div className={`text-[9px] px-2 py-1 rounded-sm bg-sw-panel-dark border ${isTerritoryOwned ? 'border-sw-success/70 text-sw-success' : 'border-sw-error/70 text-sw-error'} uppercase font-bold tracking-wider`}>
                                {isTerritoryOwned ? "CONTRÔLÉ" : "HOSTILE"}
                            </div>
                            <div className="text-[9px] px-2 py-1 rounded-sm bg-sw-panel-dark border border-sw-info/60 text-sw-info uppercase font-bold tracking-wider">
                                {selectedPlanet.planet_type || 'Standard'}
                            </div>
                        </div>
                     </div>

                     {/* Governor Card */}
                     <SwPanel className="mt-4 p-3 relative group">
                        <div className="sw-label text-[9px] text-sw-gold mb-2 flex justify-between">
                            <span>Gouverneur</span>
                            {isTerritoryOwned && isHighCommand && (
                                <button onClick={() => setShowAssignMenu(!showAssignMenu)} className="hover:brightness-150 transition cursor-pointer" title="Nommer"><SwIcon name="amp_icon_craft" size={16} /></button>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <SwCell size={40}>
                                {selectedPlanet.governor_name ? <SwIcon name="energyshield" size={30} /> : <span className="text-sw-faint font-bold">?</span>}
                            </SwCell>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-sw-text truncate">{selectedPlanet.governor_name || <span className="text-sw-faint italic">Poste Vacant</span>}</div>
                                <div className="text-[9px] text-sw-dim">Administration Civile</div>
                            </div>
                        </div>
                     </SwPanel>

                     {/* Actions */}
                     {isTerritoryOwned && (
                         <div className="grid grid-cols-2 gap-2 mt-3">
                             <SwButton size="sm" variant="accent" onClick={() => setShowGarrisonMenu(true)} className="text-[10px] px-1.5">
                                 <SwIcon name="shieldgenerator" size={16} />
                                 <span>Garnison</span>
                             </SwButton>
                             <SwButton size="sm" className="text-[10px] px-1.5">
                                 <SwIcon name="datapad" size={16} />
                                 <span>Détails</span>
                             </SwButton>
                         </div>
                     )}

                     {showAssignMenu && (
                        <div className="absolute bottom-full left-0 w-64 sw-tooltip p-2 overflow-y-auto max-h-60 sw-scroll z-50 mb-[-1px]">
                            <SwLabel className="text-[10px] p-2 border-b border-sw-border mb-1">Candidats Disponibles</SwLabel>
                            {factionMembers.map(m => (
                                <button key={m.id} onClick={() => handleAssignGovernor(m)} className="sw-row w-full text-left p-2 mb-0.5 text-xs text-sw-text flex items-center gap-2">
                                    <SwIcon name="energyshield" size={22} />
                                    <span className="font-bold truncate">{m.pseudo}</span>
                                </button>
                            ))}
                        </div>
                     )}
                 </div>

                 {/* Building Slots Scroll Area */}
                 <div className="flex-grow p-6 overflow-x-auto flex items-center gap-4 relative sw-scroll">
                    {isTerritoryOwned ? ( slots.map((building, index) => {
                        const isFinished = building && currentTurn >= building.finish_turn;
                        const template = buildingsTemplates.find(t => t.id === building?.template_id);
                        const hasUpgrade = template && template.upgrades && template.upgrades.find(u => u.level === (building.level || 1) + 1);

                        return (
                            <div key={index} className="flex flex-col gap-2 group relative shrink-0 w-32">
                                <SwLabel className="text-[9px] text-sw-faint text-center">Slot 0{index + 1}</SwLabel>
                                <div
                                    className={`h-36 border flex flex-col justify-between p-3 relative shadow-lg transition-all rounded-md overflow-hidden cursor-pointer
                                    ${building
                                        ? (isFinished ? 'bg-sw-panel border-sw-line' : 'bg-sw-panel border-sw-warn/50 border-dashed')
                                        : (canBuild ? 'bg-sw-panel-dark/70 border-sw-border hover:border-sw-gold-dim hover:bg-sw-panel hover:shadow-[0_0_15px_rgb(var(--sw-accent-rgb)/0.25)]' : 'bg-sw-panel-dark/40 border-sw-border opacity-50 cursor-not-allowed')}`}
                                    onClick={() => !building && canBuild && setShowBuildMenu(true)}
                                >
                                    {building ? (
                                        <>
                                            <div className="relative z-10 flex flex-col h-full">
                                                <div className="flex justify-between items-start mb-2">
                                                    <SwIcon name={isFinished ? 'galactictradekioskunlock' : 'structuralbracing'} size={28} />
                                                    <span className="text-[9px] font-bold bg-sw-panel-dark px-1.5 rounded-sm text-sw-gold border border-sw-border">Nv.{building.level}</span>
                                                </div>

                                                <div className="font-bold text-xs text-sw-text leading-tight uppercase mb-auto">{building.name}</div>

                                                {!isFinished && (
                                                    <div className="mt-2 text-[9px] text-sw-warn bg-sw-warn/10 border border-sw-warn/40 rounded-sm px-2 py-1 flex items-center justify-center gap-1">
                                                        <span className="animate-spin-slow">⏳</span> {building.finish_turn - currentTurn} trs
                                                    </div>
                                                )}

                                                {isFinished && building.production && (
                                                     <div className="mt-1 flex flex-wrap gap-1">
                                                         {Object.entries(building.production).map(([k,v]) => v > 0 && (
                                                             <span key={k} className="text-[9px] px-1 rounded-sm flex items-center gap-0.5 border border-sw-border bg-sw-panel-dark text-sw-text">
                                                                 +{v} {RESOURCE_ICONS[k] ? <ResIcon res={k} size={12} /> : k.substr(0,1).toUpperCase()}
                                                             </span>
                                                         ))}
                                                     </div>
                                                )}
                                            </div>

                                            {/* Actions Overlay */}
                                            {canBuild && (
                                                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 z-20">
                                                    {isFinished && hasUpgrade && (
                                                        <button onClick={(e) => { e.stopPropagation(); handleUpgrade(building); }} className="w-8 h-8 rounded-full bg-sw-success/15 text-sw-success border border-sw-success/70 flex items-center justify-center hover:scale-110 transition-transform" title="Améliorer"><Icons.Upgrade/></button>
                                                    )}
                                                    <button onClick={(e) => { e.stopPropagation(); isFinished ? handleDemolish(building) : handleCancel(building); }} className={`w-8 h-8 rounded-full border flex items-center justify-center hover:scale-110 transition-transform ${isFinished ? 'bg-sw-error/15 text-sw-error border-sw-error/70' : 'bg-sw-warn/15 text-sw-warn border-sw-warn/70'}`} title={isFinished ? "Démolir" : "Annuler"}>
                                                        {isFinished ? '🗑️' : '✕'}
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        canBuild ? (
                                            <div className="flex flex-col items-center justify-center h-full gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                <span className="text-3xl text-sw-gold font-thin">+</span>
                                                <span className="sw-label text-[9px] text-sw-gold">Construire</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center h-full"><SwIcon name="key" size={28} className="opacity-40 grayscale" /></div>
                                        )
                                    )}
                                </div>
                            </div>
                        );
                    }) ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <SwGlass accent="var(--sw-error)" className="p-5 pl-6 flex items-center gap-4">
                                <span className="text-4xl opacity-50">⛔</span>
                                <div>
                                    <h3 className="sw-title text-sm text-sw-error">Accès Refusé</h3>
                                    <p className="text-xs text-sw-dim">Territoire hostile ou contesté.</p>
                                </div>
                            </SwGlass>
                        </div>
                    )}
                 </div>
            </div>
        </div>
    );
};

const BuildMenuOverlay = ({ buildingsTemplates, factionData, selectedPlanet, handleConstruct, onClose, userFaction }) => (
    <div className="fixed inset-x-0 bottom-60 top-0 z-[90] flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 pointer-events-none">
        <SwWindow
            title="Arbre de Construction"
            subtitle={`Secteur: ${selectedPlanet.name} // Développement Infrastructurel`}
            icon="structuralbracing"
            className="w-full h-full pointer-events-auto rounded-b-none"
            bodyClassName="flex flex-col min-h-0"
            actions={<>
                <span className="sw-label text-[10px] text-sw-bg bg-sw-gold px-2 py-0.5 rounded-sm">INITIATIVE</span>
                <SwButton size="sm" onClick={onClose}>Fermer le protocole</SwButton>
            </>}
        >
            <div className="flex-grow min-h-0 overflow-y-auto sw-scroll space-y-10 px-2 pb-2">
                {BUILDING_CATEGORIES.map(category => {
                    const categoryBuildings = buildingsTemplates.filter(b => (b.category || 'economic') === category.id);
                    if (categoryBuildings.length === 0) return null;
                    return (
                        <div key={category.id} className="relative">
                            <div className="flex items-center gap-3 mb-4">
                                <SwCell icon={CATEGORY_ICONS[category.id]} size={40} />
                                <h3 className={`sw-title text-xl ${category.color}`}>{category.label}</h3>
                                <div className="flex-grow"><SwDivider /></div>
                            </div>

                            <div className="flex gap-6 overflow-x-auto pb-6 pt-2 pl-1 sw-scroll">
                                {categoryBuildings.map(template => {
                                    const levels = [template, ...(template.upgrades || [])];
                                    return (
                                        <div key={template.id} className="flex flex-col items-center gap-4 min-w-[240px]">
                                            {levels.map((levelData, idx) => {
                                                const isBase = idx === 0;
                                                const costCr = levelData.cost || 0;
                                                const costMat = levelData.cost_materials || 0;
                                                const tier = toRoman(levelData.level || idx + 1);
                                                const canAfford = isBase && factionData.credits >= costCr && factionData.materials >= costMat;
                                                const isTypeAllowed = (!template.allowed_types || template.allowed_types.includes('any') || template.allowed_types.includes(selectedPlanet.planet_type));
                                                const isFactionAllowed = (!template.allowed_factions || template.allowed_factions.length === 0 || template.allowed_factions.includes(userFaction));

                                                return (
                                                    <div key={idx} className="flex flex-col items-center relative w-full">
                                                        {idx > 0 && <div className="h-4 w-0.5 bg-sw-line/50 mb-2"></div>}

                                                        <button
                                                            onClick={() => isBase && handleConstruct(template)}
                                                            disabled={!isBase || !canAfford || !isTypeAllowed || !isFactionAllowed}
                                                            className={`relative w-full group overflow-hidden transition-all duration-300 border
                                                                ${isBase
                                                                    ? (canAfford && isTypeAllowed && isFactionAllowed
                                                                        ? 'bg-sw-panel border-sw-line hover:border-sw-gold-dim hover:shadow-[0_0_20px_rgb(var(--sw-accent-rgb)/0.25)] hover:-translate-y-1'
                                                                        : 'bg-sw-panel-dark border-sw-error/30 grayscale opacity-60 cursor-not-allowed hover:border-sw-error/60')
                                                                    : 'bg-sw-panel-dark/60 border-sw-border border-dashed cursor-default opacity-70'}
                                                                rounded-md`}
                                                        >
                                                            {/* Card Header (Image/Icon) */}
                                                            <div className={`h-24 w-full relative flex items-center justify-center border-b border-sw-border ${isBase ? 'bg-sw-panel-light/40' : 'bg-black/20'}`}>

                                                                {/* TIER Badge */}
                                                                <div className="absolute top-2 left-2 flex flex-col gap-1 z-20">
                                                                     <div className="bg-sw-panel-dark text-sw-gold text-[9px] font-bold px-1.5 py-0.5 border border-sw-gold-dim/50 rounded-sm">TIER {tier}</div>
                                                                </div>

                                                                {!isBase && <div className="absolute top-2 right-2 bg-sw-info/10 text-sw-info text-[8px] px-1.5 py-0.5 rounded-sm border border-sw-info/40 uppercase tracking-widest z-20">Upgrade</div>}

                                                                <span className={`transition-transform duration-500 group-hover:scale-110 ${isBase ? '' : 'grayscale opacity-60'}`}>
                                                                    <SwCell icon={CATEGORY_ICONS[category.id] || 'structuralbracing'} size={60} />
                                                                </span>
                                                            </div>

                                                            {/* Card Content */}
                                                            <div className="p-4 text-left">
                                                                <div className="text-sm font-bold text-sw-text uppercase leading-none mb-3 group-hover:text-sw-gold transition-colors truncate">
                                                                    {template.series_name || levelData.name}
                                                                    {template.series_name && <span className="text-[9px] text-sw-dim block normal-case mt-0.5">{levelData.name}</span>}
                                                                </div>

                                                                {/* Production Stats */}
                                                                {(levelData.production?.credits > 0 || levelData.production?.materials > 0 || levelData.production?.manpower > 0 || levelData.production?.science > 0) ? (
                                                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                                                        {levelData.production.credits > 0 && <span className="text-[10px] bg-sw-panel-dark px-1 py-0.5 rounded-sm text-sw-success flex items-center gap-1 border border-sw-border">+{levelData.production.credits} <ResIcon res="credits" size={14} /></span>}
                                                                        {levelData.production.materials > 0 && <span className="text-[10px] bg-sw-panel-dark px-1 py-0.5 rounded-sm text-sw-success flex items-center gap-1 border border-sw-border">+{levelData.production.materials} <ResIcon res="materials" size={14} /></span>}
                                                                        {levelData.production.manpower > 0 && <span className="text-[10px] bg-sw-panel-dark px-1 py-0.5 rounded-sm text-sw-success flex items-center gap-1 border border-sw-border">+{levelData.production.manpower} <ResIcon res="manpower" size={14} /></span>}
                                                                        {levelData.production.science > 0 && <span className="text-[10px] bg-sw-panel-dark px-1 py-0.5 rounded-sm text-sw-success flex items-center gap-1 border border-sw-border">+{levelData.production.science} <ResIcon res="science" size={14} /></span>}
                                                                    </div>
                                                                ) : (
                                                                    <div className="h-6 mb-3"></div>
                                                                )}

                                                                {/* Unlocks Stats */}
                                                                {levelData.unlocks_units && levelData.unlocks_units.length > 0 && (
                                                                    <div className="mb-3 flex flex-wrap gap-1">
                                                                        {levelData.unlocks_units.map(uid => (
                                                                             <span key={uid} className="text-[9px] bg-sw-warn/10 text-sw-warn border border-sw-warn/40 px-1.5 py-0.5 rounded-sm uppercase tracking-wider flex items-center gap-1">
                                                                                <SwIcon name={garrisonIcon(uid)} size={12} /> {GARRISON_STATS[uid]?.label || uid}
                                                                             </span>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {/* Footer: Cost & Time */}
                                                                <div className="flex justify-between items-center pt-3 border-t border-sw-border/60">
                                                                    {isBase ? (
                                                                         <div className="flex flex-col gap-0.5">
                                                                             {costCr > 0 && <span className={`text-[10px] font-mono flex items-center gap-1 ${canAfford ? 'text-sw-gold' : 'text-sw-error'}`}>{costCr} <ResIcon res="credits" size={14} /></span>}
                                                                             {costMat > 0 && <span className={`text-[10px] font-mono flex items-center gap-1 ${factionData.materials >= costMat ? 'text-sw-gold' : 'text-sw-error'}`}>{costMat} <ResIcon res="materials" size={14} /></span>}
                                                                         </div>
                                                                    ) : (
                                                                        <span className="text-[10px] text-sw-faint font-mono">Requis: T{idx}</span>
                                                                    )}

                                                                    <div className="text-[10px] text-sw-info font-mono flex items-center gap-1">
                                                                        ⏱️ {levelData.turns_required || 2}t
                                                                    </div>
                                                                </div>

                                                                {/* Status Overlay for Invalid */}
                                                                {isBase && (!isTypeAllowed || !isFactionAllowed) && (
                                                                    <div className="absolute inset-0 bg-black/80 backdrop-blur-[1px] flex items-center justify-center z-30">
                                                                        <span className="text-sw-error text-xs font-bold uppercase border border-sw-error/50 px-2 py-1 rounded-sm bg-sw-error/10">
                                                                            {!isTypeAllowed ? "Climat Incompatible" : "Faction Non Autorisée"}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </SwWindow>
    </div>
);

const BattleSimulator = ({ onClose, onStart, customUnits = [] }) => {
    const [mode, setMode] = useState('space');
    const customSpaceUnits = customUnits.filter(u => u.category === 'space');
    const customGroundUnits = customUnits.filter(u => u.category === 'ground'); // 'space' | 'ground'
    
    // Space Stats
    const [attackerComp, setAttackerComp] = useState({ fighter: 5, corvette: 2, frigate: 1, cruiser: 0, dreadnought: 0 });
    const [defenderComp, setDefenderComp] = useState({ fighter: 3, corvette: 1, frigate: 0, cruiser: 0, dreadnought: 0 });
    const [defenderSpaceGarrison, setDefenderSpaceGarrison] = useState({ turret: 2 });
    
    // Ground Stats
    const [attackerArmy, setAttackerArmy] = useState({ infantry: 20, heavy_infantry: 5, vehicle: 2 });
    const [defenderArmy, setDefenderArmy] = useState({ infantry: 15, heavy_infantry: 5, vehicle: 1, turret: 4 });
    const [selectedTerrain, setSelectedTerrain] = useState('plains');

    const handleSimStart = () => {
        if (mode === 'space') {
            onStart({
                mode: 'space',
                attacker: attackerComp,
                defender: defenderComp,
                garrison: defenderSpaceGarrison
            });
        } else {
            onStart({
                mode: 'ground',
                attacker: attackerArmy,
                defender: defenderArmy, // In ground combat, defender is the garrison
                planetType: selectedTerrain // Passing terrain as planetType for GroundCombat
            });
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <SwWindow
                title="Simulateur de Combat"
                icon="clashing_lightsabers_6_0"
                onClose={onClose}
                className="w-[600px] max-h-[90vh]"
                bodyClassName="overflow-y-auto sw-scroll"
                actions={<>
                    <SwButton size="sm" active={mode === 'space'} onClick={() => setMode('space')}>Espace</SwButton>
                    <SwButton size="sm" active={mode === 'ground'} onClick={() => setMode('ground')}>Sol</SwButton>
                </>}
            >
                
                {mode === 'space' ? (
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-blue-400 font-bold uppercase tracking-wider text-sm mb-2">Attaquant (République)</h3>
                            {Object.keys(SHIP_STATS).filter(k=>k!=='turret').map(type => (
                                <div key={type} className="flex justify-between items-center mb-1 bg-blue-900/20 p-1 rounded">
                                    <span className="text-xs uppercase">{type}</span>
                                    <SwInput type="number" min="0" value={attackerComp[type]||0} onChange={e=>setAttackerComp({...attackerComp, [type]: parseInt(e.target.value)})} className="w-16 text-xs p-1 border-blue-800/70" />
                                </div>
                            ))}
                            {customSpaceUnits.map(u => (
                                <div key={u.id} className="flex justify-between items-center mb-1 bg-purple-900/20 p-1 rounded border border-purple-500/30">
                                    <span className="text-xs uppercase text-purple-300">{u.label}</span>
                                    <SwInput type="number" min="0" value={attackerComp[u.id]||0} onChange={e=>setAttackerComp({...attackerComp, [u.id]: parseInt(e.target.value)})} className="w-16 text-xs p-1 border-purple-800/70" />
                                </div>
                            ))}
                        </div>
                         <div>
                            <h3 className="text-red-400 font-bold uppercase tracking-wider text-sm mb-2">Défenseur (Empire)</h3>
                             {Object.keys(SHIP_STATS).filter(k=>k!=='turret').map(type => (
                                <div key={type} className="flex justify-between items-center mb-1 bg-red-900/20 p-1 rounded">
                                    <span className="text-xs uppercase">{type}</span>
                                    <SwInput type="number" min="0" value={defenderComp[type]||0} onChange={e=>setDefenderComp({...defenderComp, [type]: parseInt(e.target.value)})} className="w-16 text-xs p-1 border-red-800/70" />
                                </div>
                            ))}
                            {customSpaceUnits.map(u => (
                                <div key={u.id} className="flex justify-between items-center mb-1 bg-purple-900/20 p-1 rounded border border-purple-500/30">
                                    <span className="text-xs uppercase text-purple-300">{u.label}</span>
                                    <SwInput type="number" min="0" value={defenderComp[u.id]||0} onChange={e=>setDefenderComp({...defenderComp, [u.id]: parseInt(e.target.value)})} className="w-16 text-xs p-1 border-purple-800/70" />
                                </div>
                            ))}
                            <SwLabel as="h4" className="text-sw-gold mt-2 mb-1">Garnison Spatiale</SwLabel>
                            <div className="flex justify-between items-center mb-1 bg-sw-gold/10 p-1 rounded">
                                <span className="text-xs uppercase">Turret</span>
                                <SwInput type="number" min="0" value={defenderSpaceGarrison['turret']||0} onChange={e=>setDefenderSpaceGarrison({...defenderSpaceGarrison, turret: parseInt(e.target.value)})} className="w-16 text-xs p-1 border-sw-gold-dim" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-orange-400 font-bold uppercase tracking-wider text-sm mb-2">Armée d&apos;Invasion (Rép.)</h3>
                            {Object.keys(GROUND_UNIT_STATS).filter(k=>k!=='turret').map(type => (
                                <div key={type} className="flex justify-between items-center mb-1 bg-orange-900/20 p-1 rounded">
                                    <span className="text-xs uppercase">{GROUND_UNIT_STATS[type].label}</span>
                                    <SwInput type="number" min="0" value={attackerArmy[type]||0} onChange={e=>setAttackerArmy({...attackerArmy, [type]: parseInt(e.target.value)})} className="w-16 text-xs p-1 border-orange-800/70" />
                                </div>
                            ))}
                            {customGroundUnits.map(u => (
                                <div key={u.id} className="flex justify-between items-center mb-1 bg-purple-900/20 p-1 rounded border border-purple-500/30">
                                    <span className="text-xs uppercase text-purple-300">{u.label}</span>
                                    <SwInput type="number" min="0" value={attackerArmy[u.id]||0} onChange={e=>setAttackerArmy({...attackerArmy, [u.id]: parseInt(e.target.value)})} className="w-16 text-xs p-1 border-purple-800/70" />
                                </div>
                            ))}
                        </div>
                        <div>
                            <h3 className="text-green-400 font-bold uppercase tracking-wider text-sm mb-2">Garnison Planétaire (Emp.)</h3>
                            {Object.keys(GROUND_UNIT_STATS).map(type => (
                                <div key={type} className="flex justify-between items-center mb-1 bg-green-900/20 p-1 rounded">
                                    <span className="text-xs uppercase">{GROUND_UNIT_STATS[type].label}</span>
                                    <SwInput type="number" min="0" value={defenderArmy[type]||0} onChange={e=>setDefenderArmy({...defenderArmy, [type]: parseInt(e.target.value)})} className="w-16 text-xs p-1 border-green-800/70" />
                                </div>
                            ))}
                            {customGroundUnits.map(u => (
                                <div key={u.id} className="flex justify-between items-center mb-1 bg-purple-900/20 p-1 rounded border border-purple-500/30">
                                    <span className="text-xs uppercase text-purple-300">{u.label}</span>
                                    <SwInput type="number" min="0" value={defenderArmy[u.id]||0} onChange={e=>setDefenderArmy({...defenderArmy, [u.id]: parseInt(e.target.value)})} className="w-16 text-xs p-1 border-purple-800/70" />
                                </div>
                            ))}
                            <div className="mt-4 pt-2 border-t border-sw-border">
                                <SwLabel as="label" className="block mb-1">Type de Terrain</SwLabel>
                                <SwInput
                                    as="select"
                                    value={selectedTerrain} 
                                    onChange={(e) => setSelectedTerrain(e.target.value)} 
                                    className="p-1 text-xs"
                                >
                                    <option value="plains">Plaines (Standard)</option>
                                    <option value="desert">Désert (Lent, Portée+)</option>
                                    <option value="urban">Urbain (Rapide, Portée-)</option>
                                    <option value="snow">Polaire (Lent, Précision-)</option>
                                    <option value="volcanic">Volcanique (Dégâts+ sur temps?)</option>
                                    <option value="forest">Forêt (Couvert, Précision+)</option>
                                    <option value="force_nexus">Nexus de Force</option>
                                    <option value="industrial">Industriel</option>
                                </SwInput>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex gap-3 mt-6">
                     <SwButton onClick={onClose}>Annuler</SwButton>
                     <SwButton variant="danger" onClick={handleSimStart} className="flex-grow">Lancer Simulation</SwButton>
                </div>
            </SwWindow>
        </div>
    );
};

// ==========================================
// COMPOSANT PRINCIPAL GALAXYMAP
// ==========================================
export default function GalaxyMap({ userFaction, userRole, userID, userName, heroData }) {
  const [showBattleSimulator, setShowBattleSimulator] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  
  // --- NOUVEAU: COMBAT RTS ---
  const [pendingBattle, setPendingBattle] = useState(null);
  const [manualBattleMode, setManualBattleMode] = useState(true);
  const [planets, setPlanets] = useState([]);
  const [factions, setFactions] = useState([]);
  const [buildingsTemplates, setBuildingsTemplates] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(1);
  const [factionData, setFactionData] = useState(null);
  const [userData, setUserData] = useState(null); 
  const [projectedIncome, setProjectedIncome] = useState({ credits: 0, materials: 0, manpower: 0, science: 0 });
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);
  const [isFleetSystemEnabled, setIsFleetSystemEnabled] = useState(true); 
  const [isRegionClickEnabled, setIsRegionClickEnabled] = useState(true);
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [planetBuildings, setPlanetBuildings] = useState([]); 
  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const [showGarrisonMenu, setShowGarrisonMenu] = useState(false);
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const [showDiplomacy, setShowDiplomacy] = useState(false);
  const [showCouncil, setShowCouncil] = useState(false);
  const [showFleetManager, setShowFleetManager] = useState(false); 
  const [showProfile, setShowProfile] = useState(false); 
  const [showAdminUsers, setShowAdminUsers] = useState(false);
  const [factionMembers, setFactionMembers] = useState([]); 
  const [fleets, setFleets] = useState([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingFaction, setEditingFaction] = useState(null); 
  const [isEditorMode, setIsEditorMode] = useState(false);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 800, h: 500 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const clickStartRef = useRef({ x: 0, y: 0 });
  const svgRef = useRef(null); 
  const [movingFleet, setMovingFleet] = useState(null); 
  const [fleetMovePreview, setFleetMovePreview] = useState(null); 
  
  const [showResearch, setShowResearch] = useState(false);
  const [showEncyclopedia, setShowEncyclopedia] = useState(false);
  const [showMagicManager, setShowMagicManager] = useState(false);
  const [magicDomains, setMagicDomains] = useState([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFactionManager, setShowFactionManager] = useState(false);
  const [showBuildingManager, setShowBuildingManager] = useState(false);
  const [showUnitManager, setShowUnitManager] = useState(false);
  const [showHolonetEditor, setShowHolonetEditor] = useState(false);
  const [showRegionManager, setShowRegionManager] = useState(false); // NEW
  const [customUnits, setCustomUnits] = useState([]);
  const [regions, setRegions] = useState([]); // NEW
  const [maxLevels, setMaxLevels] = useState(1);
  const [currentLevelTab, setCurrentLevelTab] = useState(1);
  const [editingPlanet, setEditingPlanet] = useState(null);
  const [newPlanetCoords, setNewPlanetCoords] = useState({ x: 0, y: 0 });
  const [editorLinkSource, setEditorLinkSource] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFaction, setFilterFaction] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterRegion, setFilterRegion] = useState("all");
  const [visibleFactions, setVisibleFactions] = useState([]); // Array of faction Ids to SHOW. Empty = show all? Or init with all.
  const [showFactionFilter, setShowFactionFilter] = useState(false);
  const [isRouteMode, setIsRouteMode] = useState(false); // NEW: Route Creation Mode

  // Initialize visibleFactions when factions load
  useEffect(() => {
      if (factions.length > 0 && visibleFactions.length === 0) {
          setVisibleFactions(factions.map(f => f.id));
      }
  }, [factions]);

  // MAP EDITOR STATE
  const [showMapEditor, setShowMapEditor] = useState(false);
  const [currentMapToEdit, setCurrentMapToEdit] = useState(null);
  const [savedMaps, setSavedMaps] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null); // INFO REGION

  // EDIT STATE FOR BUILDINGS
  const [editingBuilding, setEditingBuilding] = useState(null);

  const activePlanet = selectedPlanet ? planets.find(p => p.id === selectedPlanet.id) : null;
  const isTerritoryOwned = activePlanet?.owner === userFaction;
  const isArchitect = ARCHITECT_ROLES.includes(userRole);
  const isAdmin = userRole === 'admin';
  const isHighCommand = HIGH_COMMAND_ROLES.includes(userRole);
  const isDiplomat = isHighCommand || (userData?.is_diplomat === true) || userRole === 'diplomat';
  const isGeneral = isHighCommand || (userData?.is_general === true) || userRole === 'general'; 
  const isGovernor = activePlanet?.governor_id && String(activePlanet.governor_id) === String(userID);
  const canBuild = isTerritoryOwned && (isHighCommand || isGovernor);
  const canAccessFleets = (isGeneral && isTerritoryOwned && activePlanet) || (isHighCommand && isFleetSystemEnabled) || isArchitect;
  const shouldShowFleets = isFleetSystemEnabled || isArchitect;
  const isDarkCouncil = ['admin', 'emperor', 'conseil'].includes(userRole);
  
  // Define if any UI modal is currently open to hide the toolbar
  const isAnyModalOpen = showDiplomacy || showCouncil || showFleetManager || showResearch || showEncyclopedia || showProfile || showBattleSimulator || showMagicManager || showSettingsModal || showFactionFilter;

  const getFactionColor = (factionId) => { const f = factions.find(fact => fact.id === factionId); return f ? f.color : '#9ca3af'; };

  // Load Custom Units & Magic
  useEffect(() => {
        const unsub = onSnapshot(collection(db, 'custom_units'), (snap) => {
            setCustomUnits(snap.docs.map(d => ({ ...d.data(), dbId: d.id })));
        });
        const unsubMagic = onSnapshot(collection(db, 'magic_domains'), (snap) => {
            setMagicDomains(snap.docs.map(d => ({ ...d.data(), id: d.id })));
        });
        return () => { unsub(); unsubMagic(); };
  }, []);

  // Dedicated Regions Listener with Debug
  useEffect(() => {
    console.log("Subscribing to regions...");
    const unsubRegions = onSnapshot(collection(db, 'regions'), (snap) => {
        const regionList = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        console.log("Filtered regions:", regionList);
        setRegions(regionList.sort((a,b) => (a.name || "").localeCompare(b.name || "")));
    }, (error) => {
        console.error("Error fetching regions:", error);
    });
    return () => unsubRegions();
  }, []);

  useEffect(() => {
    const unsubPlanets = onSnapshot(collection(db, "provinces"), (snap) => setPlanets(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name))));
    const unsubFactions = onSnapshot(collection(db, "factions"), (snap) => {
        const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (!loaded.find(f => f.id === 'neutral')) loaded.push({ id: 'neutral', name: 'Neutre', color: '#9ca3af', type: 'minor' });
        setFactions(loaded);
    });
    const unsubBuildings = onSnapshot(collection(db, "buildings"), (snap) => setBuildingsTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubGameState = onSnapshot(doc(db, "game_state", "global"), (d) => { if(d.exists()) { const data = d.data(); setCurrentTurn(data.current_turn); setIsFleetSystemEnabled(data.fleets_enabled ?? true); } });
    
    let unsubUser = () => {}; let unsubFaction = () => {}; let unsubFleets = () => {};
    if (userFaction) {
        unsubFaction = onSnapshot(doc(db, "factions", userFaction), (d) => { 
            if(d.exists()) {
                setFactionData(d.data()); 
            } else {
                console.warn("Faction data missing for ID:", userFaction);
                setFactionData({ 
                    name: "Faction Détruite", 
                    color: "#888888", 
                    credits: 0, 
                    materials: 0, 
                    manpower: 0, 
                    science: 0,
                    diplomatic_phrases: {}
                });
            }
        });
        if (userID) { unsubUser = onSnapshot(doc(db, "users", userID), (d) => { if(d.exists()) setUserData(d.data()); }); }
        unsubFleets = onSnapshot(query(collection(db, "fleets")), (snap) => { setFleets(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    }
    return () => { unsubPlanets(); unsubFactions(); unsubBuildings(); unsubGameState(); unsubUser(); unsubFaction(); unsubFleets(); };
  }, [userFaction, userID]);

  useEffect(() => {
      if (isHighCommand && userFaction) {
          const q = query(collection(db, "users"), where("faction_id", "==", userFaction));
          const unsub = onSnapshot(q, (snap) => setFactionMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
          return () => unsub();
      }
  }, [userFaction, isHighCommand]);

  // --- INTRO POPUP ---
  useEffect(() => {
    if (userData && userData.hasSeenIntro !== true) {
        setShowIntro(true);
    }
  }, [userData]);

  const handleCloseIntro = async () => {
    setShowIntro(false);
    if (userID) {
        await updateDoc(doc(db, "users", userID), { hasSeenIntro: true });
    }
  };

  useEffect(() => {
      const svgElement = svgRef.current;
      const handleWheelZoom = (e) => {
          e.preventDefault();
          const r = svgElement.getBoundingClientRect();
          const mx = e.clientX - r.left; const my = e.clientY - r.top;
          const worldX = viewBox.x + (mx / r.width) * viewBox.w; 
          const worldY = viewBox.y + (my / r.height) * viewBox.h;
          const s = e.deltaY > 0 ? 1.1 : 0.9;
          const newW = Math.max(200, Math.min(25000, viewBox.w * s)); 
          const newH = Math.max(125, Math.min(25000, viewBox.h * s));
          const newX = worldX - (mx / r.width) * newW; 
          const newY = worldY - (my / r.height) * newH;
          setViewBox({ x: newX, y: newY, w: newW, h: newH });
      };

      if (svgElement) {
          svgElement.addEventListener('wheel', handleWheelZoom, { passive: false });
      }
      return () => {
          if (svgElement) svgElement.removeEventListener('wheel', handleWheelZoom);
      };
  }, [viewBox]);

  useEffect(() => {
    if (!userFaction || planets.length === 0) return;
    const myPlanetIds = planets.filter(p => p.owner === userFaction).map(p => p.id);
    const qBuildings = query(collectionGroup(db, 'constructions'), where('finish_turn', '<=', currentTurn));
    
    // CORRECTION DEPENDENCY
    const myFleets = fleets.filter(f => f.owner === userFaction);

    const unsubBuildings = onSnapshot(qBuildings, (snap) => {
        let income = { credits: 0, materials: 0, manpower: 0, science: 0 };
        snap.forEach(doc => {
            const data = doc.data();
            if (doc.ref.parent?.parent && myPlanetIds.includes(doc.ref.parent.parent.id)) {
                if (data.production) { 
                    income.credits += (Number(data.production.credits)||0); 
                    income.materials += (Number(data.production.materials)||0); 
                    income.manpower += (Number(data.production.manpower)||0); 
                    income.science += (Number(data.production.science)||0);
                }
                if (data.maintenance) { 
                    income.credits -= (Number(data.maintenance.credits)||0); 
                    income.materials -= (Number(data.maintenance.materials)||0); 
                    income.manpower -= (Number(data.maintenance.manpower)||0); 
                }
            }
        });
        myFleets.forEach(fleet => {
            if (fleet.composition) {
                Object.entries(fleet.composition).forEach(([type, count]) => {
                    const stats = SHIP_MAINTENANCE_VALUES[type];
                    if (stats) { income.credits -= (stats.cr * count); income.manpower -= (stats.mp * count); }
                });
            }
        });

        planets.filter(p => p.owner === userFaction).forEach(p => {
            if (p.garrison) {
                Object.entries(p.garrison).forEach(([type, count]) => {
                    const stats = GARRISON_MAINTENANCE_VALUES[type];
                    if (stats) { income.credits -= (stats.cr * count); income.manpower -= (stats.mp * count); }
                });
            }
        });

        setProjectedIncome(income);
    });
    return () => unsubBuildings();
  }, [userFaction, planets, currentTurn, fleets]);

  const handleBattleEnd = async (result) => {
      if (!pendingBattle) return;
      
      // Mode Simulation
      if (pendingBattle.isSimulation) {
          setPendingBattle(null);
          alert(`Simulation Terminée !\nVainqueur : ${result.winner.toUpperCase()}\n\nSurvivants Atttaquant : ${result.survivingAttackers.length}\nSurvivants Défenseur : ${result.survivingDefenders.length}`);
          return;
      }

      const { winner, survivingAttackers } = result;
      const { attackerFleet, defenderPlanet, defenderFleets } = pendingBattle;
      const batch = writeBatch(db);

      const newAttackerComp = {};
      survivingAttackers.forEach(e => {
        if (e.type && e.type !== 'turret') newAttackerComp[e.type] = (newAttackerComp[e.type] || 0) + 1;
      });

      if (winner === 'attacker') {
           const oldOwner = defenderPlanet.owner;
           batch.update(doc(db, "provinces", defenderPlanet.id), { owner: attackerFleet.owner, color: getFactionColor(attackerFleet.owner), governor_id: null, governor_name: null, garrison: {} });
           batch.update(doc(db, "fleets", attackerFleet.id), { location_id: attackerFleet.destination_id, location_name: defenderPlanet.name, destination_id: null, arrival_turn: null, status: "stationed", path: null, start_turn: null, composition: newAttackerComp });
           batch.set(doc(collection(db, "notifications")), { targetId: attackerFleet.owner, type: 'battle', title: 'Victoire !', message: `Nous avons conquis ${defenderPlanet.name}.`, read: false, createdAt: new Date() });
           if(oldOwner && oldOwner !== 'neutral') batch.set(doc(collection(db, "notifications")), { targetId: oldOwner, type: 'battle', title: 'Invasion', message: `Nous avons perdu ${defenderPlanet.name}.`, read: false, createdAt: new Date() });
           defenderFleets.forEach(df => batch.delete(doc(db, "fleets", df.id)));
      } else {
           batch.delete(doc(db, "fleets", attackerFleet.id));
           batch.set(doc(collection(db, "notifications")), { targetId: attackerFleet.owner, type: 'battle', title: 'Défaite', message: `Notre flotte a été détruite sur ${defenderPlanet.name}.`, read: false, createdAt: new Date() });
           if(defenderPlanet.owner && defenderPlanet.owner !== 'neutral') batch.set(doc(collection(db, "notifications")), { targetId: defenderPlanet.owner, type: 'battle', title: 'Victoire Défensive', message: `Invasion repoussée sur ${defenderPlanet.name}.`, read: false, createdAt: new Date() });
      }
      await batch.commit();
      setPendingBattle(null);
  };

  const handleNextTurn = async () => {
    if (isProcessingTurn || !confirm(`Passer au mois ${currentTurn + 1} ?`)) return;
    setIsProcessingTurn(true);
    try {
      const batch = writeBatch(db);
      const production = {}; factions.forEach(f => production[f.id] = { credits: 0, materials: 0, manpower: 0, science: 0 });
      const provincesSnap = await getDocs(collection(db, "provinces"));
      const allFleetsSnap = await getDocs(collection(db, "fleets"));
      
      const provinceMap = {}; 
      provincesSnap.forEach(p => provinceMap[p.id] = { id: p.id, ...p.data() });

      // RTS Battle Detection
      const fleetsForBattleCheck = [];
      allFleetsSnap.forEach(f => fleetsForBattleCheck.push({ id: f.id, ...f.data() }));
      
      if (manualBattleMode) {
          for (const fleet of fleetsForBattleCheck) {
              if (fleet.status === "moving" && fleet.arrival_turn <= currentTurn + 1) {
                  const targetPlanet = provinceMap[fleet.destination_id];
                  if (targetPlanet && targetPlanet.owner !== 'neutral' && targetPlanet.owner !== fleet.owner) {
                      const defendingFleets = fleetsForBattleCheck.filter(f => f.location_id === targetPlanet.id && f.status === 'stationed' && f.owner === targetPlanet.owner);
                      setPendingBattle({ attackerFleet: fleet, defenderPlanet: targetPlanet, defenderFleets: defendingFleets });
                      setIsProcessingTurn(false);
                      return; 
                  }
              }
          }
      }
      
      provincesSnap.forEach(snap => {
            const p = snap.data();
            if (p.owner && production[p.owner] && p.garrison) {
                Object.entries(p.garrison).forEach(([type, count]) => {
                    const stats = GARRISON_MAINTENANCE_VALUES[type];
                    if (stats) {
                        production[p.owner].credits -= (stats.cr * count);
                        production[p.owner].manpower -= (stats.mp * count);
                    }
                });
            }
      });

      const fleetsList = [];
      allFleetsSnap.forEach(f => fleetsList.push({ id: f.id, ...f.data() }));

      const qConstructions = query(collectionGroup(db, 'constructions'), where('finish_turn', '<=', currentTurn));
      const constructionsSnapList = await getDocs(qConstructions);
      
      constructionsSnapList.forEach(snap => {
          const data = snap.data();
          const provinceId = snap.ref.parent.parent.id;
          const owner = provinceMap[provinceId]?.owner;
          if (owner && production[owner]) {
              if(data.production) { 
                  production[owner].credits += (Number(data.production.credits)||0); 
                  production[owner].materials += (Number(data.production.materials)||0); 
                  production[owner].manpower += (Number(data.production.manpower)||0); 
                  production[owner].science += (Number(data.production.science)||0);
              }
              if(data.maintenance) { 
                  production[owner].credits -= (Number(data.maintenance.credits)||0); 
                  production[owner].materials -= (Number(data.maintenance.materials)||0); 
                  production[owner].manpower -= (Number(data.maintenance.manpower)||0); 
              }
          }
      });

      for (const fleet of fleetsList) {
          if (fleet.owner && production[fleet.owner] && fleet.composition) {
              Object.entries(fleet.composition).forEach(([type, count]) => {
                  const stats = SHIP_MAINTENANCE_VALUES[type];
                  if (stats) {
                      production[fleet.owner].credits -= (stats.cr * count);
                      production[fleet.owner].manpower -= (stats.mp * count);
                  }
              });
          }

          if (fleet.status === "moving" && fleet.arrival_turn <= currentTurn + 1) {
              const targetPlanet = provinceMap[fleet.destination_id];
              if (targetPlanet) {
                  if (targetPlanet.owner !== 'neutral' && targetPlanet.owner !== fleet.owner) {
                      const defendingFleets = fleetsList.filter(f => f.location_id === targetPlanet.id && f.status === 'stationed' && f.owner === targetPlanet.owner);
                      const battleResult = resolveBattle(fleet, targetPlanet, defendingFleets);

                      if (battleResult.attackerWon) {
                          const oldOwner = targetPlanet.owner;
                          batch.update(doc(db, "provinces", targetPlanet.id), { owner: fleet.owner, color: getFactionColor(fleet.owner), governor_id: null, governor_name: null });
                          batch.update(doc(db, "fleets", fleet.id), { location_id: fleet.destination_id, location_name: targetPlanet.name, destination_id: null, arrival_turn: null, status: "stationed", path: null, start_turn: null, composition: battleResult.newAttackerComposition });
                          batch.set(doc(collection(db, "notifications")), { targetId: fleet.owner, type: 'battle', title: 'Victoire Majeure !', message: battleResult.reportLog, read: false, createdAt: new Date() });
                          batch.set(doc(collection(db, "notifications")), { targetId: oldOwner, type: 'battle', title: 'Alerte Invasion', message: `Nous avons perdu ${targetPlanet.name} et nos flottes ont été anéanties.`, read: false, createdAt: new Date() });
                          defendingFleets.forEach(df => batch.delete(doc(db, "fleets", df.id)));
                      } else {
                          batch.delete(doc(db, "fleets", fleet.id));
                          batch.set(doc(collection(db, "notifications")), { targetId: fleet.owner, type: 'battle', title: 'Défaite Totale', message: battleResult.reportLog, read: false, createdAt: new Date() });
                          batch.set(doc(collection(db, "notifications")), { targetId: targetPlanet.owner, type: 'battle', title: 'Victoire Défensive', message: `L'invasion de ${targetPlanet.name} a été repoussée avec succès.`, read: false, createdAt: new Date() });
                      }
                  } else {
                      if (targetPlanet.owner === 'neutral') {
                           batch.update(doc(db, "provinces", targetPlanet.id), { owner: fleet.owner, color: getFactionColor(fleet.owner) });
                           batch.set(doc(collection(db, "notifications")), { targetId: fleet.owner, type: 'info', title: 'Colonisation', message: `${targetPlanet.name} est maintenant sous notre contrôle.`, read: false, createdAt: new Date() });
                      }
                      batch.update(doc(db, "fleets", fleet.id), { location_id: fleet.destination_id, location_name: targetPlanet.name, destination_id: null, arrival_turn: null, status: "stationed", path: null, start_turn: null });
                  }
              }
          }
      }

      for (const [key, res] of Object.entries(production)) {
          if (key !== 'neutral' && factions.find(f => f.id === key)) batch.update(doc(db, "factions", key), { 
              credits: increment(res.credits), 
              materials: increment(res.materials), 
              manpower: increment(res.manpower),
              science: increment(res.science) 
          });
      }
      batch.update(doc(db, "game_state", "global"), { current_turn: increment(1) });
      await batch.commit();
    } catch (e) { console.error(e); } finally { setIsProcessingTurn(false); }
  };

  const toggleFleetSystem = async () => { try { await setDoc(doc(db, "game_state", "global"), { fleets_enabled: !isFleetSystemEnabled }, { merge: true }); } catch (e) { console.error(e); } };
  const jumpToPlanet = (p) => { setViewBox(prev => ({ ...prev, x: p.x - prev.w / 2, y: p.y - prev.h / 2 })); };
  const handleFleetActionFromMenu = (fleet, action) => { const locationPlanet = planets.find(p => p.id === fleet.location_id); if (locationPlanet) { jumpToPlanet(locationPlanet); setSelectedPlanet(locationPlanet); } if (action === 'move') { setMovingFleet(fleet); setShowFleetManager(false); } };
  
  const handleFleetMoveConfirm = useCallback(async (targetPlanet) => { 
      if (!movingFleet) return; 
      
      const sourcePlanet = planets.find(p => p.id === movingFleet.location_id); 
      if(!sourcePlanet) {
          console.error("Planète source introuvable");
          setMovingFleet(null);
          return;
      }
      
      const path = findShortestPath(sourcePlanet.id, targetPlanet.id, planets); 
      if (!path) { 
          alert("Aucune route disponible."); 
          setMovingFleet(null); 
          return; 
      } 
      
      let totalDistance = 0; 
      for (let i = 0; i < path.length - 1; i++) { 
          const p1 = planets.find(p => p.id === path[i]); 
          const p2 = planets.find(p => p.id === path[i+1]); 
          if (p1 && p2) totalDistance += Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)); 
      } 
      
      const turns = Math.max(1, Math.ceil(totalDistance / FLEET_SPEED)); 
      
      // Set preview instead of confirming
      setFleetMovePreview({ fleet: movingFleet, target: targetPlanet, path, turns, source: sourcePlanet });
  }, [movingFleet, planets]);

  const handleConfirmFleetMove = async () => {
      if (!fleetMovePreview) return;
      const { fleet, target, path, turns } = fleetMovePreview;
      
      try {
          await updateDoc(doc(db, "fleets", fleet.id), { 
              destination_id: target.id, 
              arrival_turn: currentTurn + turns, 
              status: 'moving', 
              path: path, 
              start_turn: currentTurn 
          }); 
          
          setMovingFleet(null);
          setFleetMovePreview(null);
      } catch (e) {
          console.error("Erreur mouvement flotte:", e);
      }
  };

  const handleCancelFleetMove = () => {
      setFleetMovePreview(null);
      // We keep movingFleet to allow picking another target
  };

  // --- NOUVELLE GESTION CLIC / DRAG (FIABLE) ---
  const handleMapMouseUp = useCallback((e) => {
      setIsDragging(false);
      const dist = Math.sqrt(Math.pow(e.clientX - clickStartRef.current.x, 2) + Math.pow(e.clientY - clickStartRef.current.y, 2));
      
      // Si distance < 15px = Clic
      if (dist < 15) {
          if (isEditorMode) {
              const r = svgRef.current.getBoundingClientRect();
              const x = viewBox.x + (e.clientX - r.left) * (viewBox.w / r.width);
              const y = viewBox.y + (e.clientY - r.top) * (viewBox.h / r.height);
              setNewPlanetCoords({x: Math.round(x), y: Math.round(y)}); 
              setShowCreateModal(true); 
          } else {
              setSelectedPlanet(null); 
              setShowBuildMenu(false); 
              setShowAssignMenu(false);
          }
      }
  }, [isEditorMode, viewBox]);

  const handlePlanetClick = useCallback((e, p) => { 
      e.stopPropagation(); 
      const dist = Math.sqrt(Math.pow(e.clientX - clickStartRef.current.x, 2) + Math.pow(e.clientY - clickStartRef.current.y, 2)); 
      if (dist > 15) return; 

      // --- ROUTE CREATION MODE (Accessible hors isEditorMode) ---
      if (isRouteMode) {
          if (!editorLinkSource) {
                setEditorLinkSource(p); // Select Source
          } else {
                if (p.id === editorLinkSource.id) {
                    setEditorLinkSource(null); // Deselect on self-click
                } else {
                    const isConnected = p.connected_to?.includes(editorLinkSource.id);
                    if (isConnected) {
                         // Unlink
                         updateDoc(doc(db, "provinces", editorLinkSource.id), { connected_to: arrayRemove(p.id) }); 
                         updateDoc(doc(db, "provinces", p.id), { connected_to: arrayRemove(editorLinkSource.id) }); 
                    } else {
                         // Link
                         updateDoc(doc(db, "provinces", editorLinkSource.id), { connected_to: arrayUnion(p.id) }); 
                         updateDoc(doc(db, "provinces", p.id), { connected_to: arrayUnion(editorLinkSource.id) }); 
                    }
                    // Hub mode stays active
                }
          }
          return;
      }

      if(isEditorMode) { 
        if(editorLinkSource) { if(p.id===editorLinkSource.id) { setEditorLinkSource(null); return; } updateDoc(doc(db, "provinces", editorLinkSource.id), { connected_to: arrayUnion(p.id) }); updateDoc(doc(db, "provinces", p.id), { connected_to: arrayUnion(editorLinkSource.id) }); setEditorLinkSource(null); return; } setEditingPlanet(p); setShowEditModal(true); return; } 
      if (movingFleet) { handleFleetMoveConfirm(p); return; } 
      setSelectedPlanet(p); 
      onSnapshot(query(collection(db, `provinces/${p.id}/constructions`)), (s) => setPlanetBuildings(s.docs.map(d => ({id: d.id, ...d.data()})))); 
  }, [isEditorMode, editorLinkSource, movingFleet, handleFleetMoveConfirm, isRouteMode]);

  const handleCreateFaction = async (e) => { e.preventDefault(); const d = new FormData(e.target); try { await addDoc(collection(db, "factions"), { name: d.get('name'), color: d.get('color'), image: d.get('image'), diplomatic_phrases: { war: d.get('phrase_war'), alliance: d.get('phrase_alliance'), neutral_good: d.get('phrase_good'), neutral_bad: d.get('phrase_bad') }, type: 'minor', credits: 1000, materials: 500, manpower: 100 }); e.target.reset(); } catch (err) { console.error(err); } };
  const handleUpdateFaction = async (e) => { e.preventDefault(); if (!editingFaction) return; const d = new FormData(e.target); try { await updateDoc(doc(db, "factions", editingFaction.id), { name: d.get('name'), color: d.get('color'), image: d.get('image'), diplomatic_phrases: { war: d.get('phrase_war'), alliance: d.get('phrase_alliance'), neutral_good: d.get('phrase_good'), neutral_bad: d.get('phrase_bad') } }); setEditingFaction(null); e.target.reset(); } catch (err) { console.error(err); } };
  
  // --- MODIFICATION DU BUILDER POUR LA SCIENCE + RESTRICTIONS ---
  const handleCreateBuilding = async (e) => { 
      e.preventDefault(); 
      const d = new FormData(e.target); 
      const bData = { 
          name: d.get('level_1_name'), 
          series_name: d.get('series_name'), // NEW: SERIES NAME
          description: d.get('description'), 
          category: d.get('category') || 'economic', 
          group: d.get('group') || null, // NEW: GROUP
          allowed_types: d.getAll('allowed_types'), 
          allowed_factions: d.getAll('allowed_factions'), 
          max_levels: maxLevels, 
          turns_required: Number(d.get('level_1_turns')), 
          cost: Number(d.get('level_1_cost_credits')), 
          cost_materials: Number(d.get('level_1_cost_materials')), 
          production: { 
              credits: Number(d.get('level_1_prod_credits')) || 0, 
              materials: Number(d.get('level_1_prod_materials')) || 0, 
              manpower: Number(d.get('level_1_prod_manpower')) || 0,
              science: Number(d.get('level_1_prod_science')) || 0 // Ajout
          }, 
          unlocks_units: d.getAll('level_1_unlocks'), // NEW: UNLOCK UNITS
          maintenance: { 
              credits: Number(d.get('level_1_maint_credits')) || 0, 
              materials: Number(d.get('level_1_maint_materials')) || 0, 
              manpower: Number(d.get('level_1_maint_manpower')) || 0 
          }, 
          upgrades: [] 
      }; 
      
      for (let i = 2; i <= maxLevels; i++) { 
          bData.upgrades.push({ 
              level: i, 
              name: d.get(`level_${i}_name`), 
              turns_required: Number(d.get(`level_${i}_turns`)), 
              cost: Number(d.get(`level_${i}_cost_credits`)), 
              cost_materials: Number(d.get(`level_${i}_cost_materials`)), 
              production: { 
                  credits: Number(d.get(`level_${i}_prod_credits`)) || 0, 
                  materials: Number(d.get(`level_${i}_prod_materials`)) || 0, 
                  manpower: Number(d.get(`level_${i}_prod_manpower`)) || 0,
                  science: Number(d.get(`level_${i}_prod_science`)) || 0 // Ajout
              }, 
              unlocks_units: d.getAll(`level_${i}_unlocks`), // NEW: UNLOCK UNITS
              maintenance: { 
                  credits: Number(d.get(`level_${i}_maint_credits`)) || 0, 
                  materials: Number(d.get(`level_${i}_maint_materials`)) || 0, 
                  manpower: Number(d.get(`level_${i}_maint_manpower`)) || 0 
              } 
          }); 
      } 
      
      try { 
          if (editingBuilding) {
              await updateDoc(doc(db, "buildings", editingBuilding.id), bData);
              setEditingBuilding(null);
          } else {
              await addDoc(collection(db, "buildings"), bData); 
          }
          e.target.reset(); 
          setMaxLevels(1); 
          alert("Plan sauvegardé !"); 
      } catch (err) { console.error(err); } 
      // Reset form manually if it was controlled or had default values
  };
  
  const handleCreatePlanet = async (e) => { e.preventDefault(); const d = new FormData(e.target); try { await addDoc(collection(db, "provinces"), { name: d.get('name'), region: d.get('region'), owner: d.get('owner'), planet_type: d.get('type'), color: getFactionColor(d.get('owner')), x: newPlanetCoords.x, y: newPlanetCoords.y, connected_to: [], population: Number(d.get('population')) || 0, base_production: { credits: Number(d.get('prod_credits')) || 0, materials: Number(d.get('prod_materials')) || 0 } }); setShowCreateModal(false); } catch (err) { console.error(err); } };
  const handleUpdatePlanet = async (e) => { e.preventDefault(); if (!editingPlanet) return; const d = new FormData(e.target); try { await updateDoc(doc(db, "provinces", editingPlanet.id), { name: d.get('name'), region: d.get('region'), planet_type: d.get('planet_type'), owner: d.get('owner'), color: d.get('color'), ground_map_id: d.get('ground_map_id'), population: Number(d.get('population')) || 0, base_production: { credits: Number(d.get('prod_credits')) || 0, materials: Number(d.get('prod_materials')) || 0 } }); setShowEditModal(false); } catch (err) { console.error(err); } };
  const handleDeletePlanet = async () => { if(!editingPlanet || !confirm("Supprimer ?")) return; const batch = writeBatch(db); batch.delete(doc(db, "provinces", editingPlanet.id)); const neighbors = planets.filter(p => p.connected_to?.includes(editingPlanet.id)); neighbors.forEach(n => { batch.update(doc(db, "provinces", n.id), { connected_to: arrayRemove(editingPlanet.id) }); }); await batch.commit(); setShowEditModal(false); };
  const startLinking = () => { setEditorLinkSource(editingPlanet); setShowEditModal(false); };
  const removeRoute = async (tid) => { await updateDoc(doc(db, "provinces", editingPlanet.id), { connected_to: arrayRemove(tid) }); await updateDoc(doc(db, "provinces", tid), { connected_to: arrayRemove(editingPlanet.id) }); };
  const handleConstruct = async (template) => { 
      if (!canBuild) return alert("Accès refusé"); 
      if (!factionData) return alert("Données de faction introuvables");

      const costCr = template.cost || 0; 
      const costMat = template.cost_materials || 0; 
      
      if ((factionData.credits || 0) < costCr || (factionData.materials || 0) < costMat) return alert("Ressources insuffisantes"); 
      
      try { 
          await addDoc(collection(db, `provinces/${selectedPlanet.id}/constructions`), { name: template.name, template_id: template.id, level: 1, started_at_turn: currentTurn, finish_turn: currentTurn + template.turns_required, cost: costCr, cost_materials: costMat, production: template.production || {}, maintenance: template.maintenance || {} }); 
          await updateDoc(doc(db, "factions", userFaction), { credits: increment(-costCr), materials: increment(-costMat) }); 
          setShowBuildMenu(false); 
      } catch (e) { console.error(e); } 
  };
  const handleUpgrade = async (building) => { 
      if (!canBuild) return; 
      if (!factionData) return alert("Données de faction introuvables");

      const template = buildingsTemplates.find(t => t.id === building.template_id); 
      const nextLevel = template?.upgrades?.find(u => u.level === (building.level || 1) + 1); 
      if (!nextLevel) return; 
      
      const costCr = nextLevel.cost || 0; 
      const costMat = nextLevel.cost_materials || 0; 
      
      if ((factionData.credits || 0) < costCr || (factionData.materials || 0) < costMat) return alert(`Ressources insuffisantes`); 
      if (!confirm(`Améliorer ?`)) return; 
      
      try { 
          await updateDoc(doc(db, `provinces/${selectedPlanet.id}/constructions`, building.id), { name: nextLevel.name, level: nextLevel.level, started_at_turn: currentTurn, finish_turn: currentTurn + nextLevel.turns_required, cost: costCr, cost_materials: costMat, production: nextLevel.production || {}, maintenance: nextLevel.maintenance || {} }); 
          await updateDoc(doc(db, "factions", userFaction), { credits: increment(-costCr), materials: increment(-costMat) }); 
      } catch (e) { console.error(e); } 
  };
  const handleDemolish = async (building) => { if (!canBuild) return; if (!confirm(`Démolir ?`)) return; try { await deleteDoc(doc(db, `provinces/${selectedPlanet.id}/constructions`, building.id)); await updateDoc(doc(db, "factions", userFaction), { credits: increment((building.cost||0)*0.5), materials: increment((building.cost_materials||0)*0.5) }); } catch (e) { console.error(e); } };
  const handleCancel = async (building) => { if (!canBuild) return; if (!confirm("Annuler ?")) return; try { await deleteDoc(doc(db, `provinces/${selectedPlanet.id}/constructions`, building.id)); await updateDoc(doc(db, "factions", userFaction), { credits: increment(building.cost||0), materials: increment(building.cost_materials||0) }); } catch (e) { console.error(e); } };
  const fetchFactionMembers = async () => { if (isAdmin) { const snap = await getDocs(collection(db, "users")); setFactionMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))); return; } if (!userFaction) return; const snap = await getDocs(query(collection(db, "users"), where("faction_id", "==", userFaction))); setFactionMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))); };
  const handleAssignGovernor = async (member) => { if (confirm(`Nommer ${member.pseudo} ?`)) { await updateDoc(doc(db, "provinces", selectedPlanet.id), { governor_id: member.id, governor_name: member.pseudo }); setSelectedPlanet(p => ({ ...p, governor_id: member.id, governor_name: member.pseudo })); setShowAssignMenu(false); } };
  
  const handleRecruitGarrison = async (type) => {
       if (!canBuild || !selectedPlanet) return;
       if (!factionData) return alert("Données de faction introuvables");

       const stats = GARRISON_STATS[type];
       if (!stats) return;
       const cost = stats.cost;
       
       if ((factionData.credits || 0) < cost.cr || (factionData.manpower || 0) < cost.mp) return alert("Ressources insuffisantes");

       const currentGarrison = selectedPlanet.garrison || {};
       const newCount = (currentGarrison[type] || 0) + 1;
       const newGarrison = { ...currentGarrison, [type]: newCount };
       
       try {
           await updateDoc(doc(db, "provinces", selectedPlanet.id), { garrison: newGarrison });
           await updateDoc(doc(db, "factions", userFaction), { 
               credits: increment(-cost.cr), 
               manpower: increment(-cost.mp) 
           });
           setSelectedPlanet(prev => ({ ...prev, garrison: newGarrison }));
       } catch (e) { console.error(e); }
  };

  const handleDisbandGarrison = async (type) => {
       if (!canBuild || !selectedPlanet) return;
       const currentGarrison = selectedPlanet.garrison || {};
       const currentCount = currentGarrison[type] || 0;
       if (currentCount <= 0) return;
       
       const newGarrison = { ...currentGarrison, [type]: currentCount - 1 };
       if (newGarrison[type] === 0) delete newGarrison[type];

       try {
           await updateDoc(doc(db, "provinces", selectedPlanet.id), { garrison: newGarrison });
           setSelectedPlanet(prev => ({ ...prev, garrison: newGarrison }));
       } catch (e) { console.error(e); }
  };
  const handleStartSimulation = (data) => {
       if (data.mode === 'ground') {
           setPendingBattle({
               id: `sim-ground-${Date.now()}`,
               type: 'ground',
               attackerArmy: { id: 'sim-army', name: 'Armée (Sim)', owner: 'republic', composition: data.attacker },
               defenderGarrison: { id: 'sim-garrison', name: 'Garnison (Sim)', owner: 'empire', composition: data.defender },
               defenderPlanet: { name: 'Simulation Surface', planet_type: 'standard' },
               isSimulation: true
           });
       } else {
           setPendingBattle({
                id: `sim-${Date.now()}`,
                type: 'space',
                attackerFleet: { id: 'sim-attacker', name: 'Attaquant (Sim)', owner: 'republic', composition: data.attacker, totalPower: 1000 },
                defenderFleets: [{ id: 'sim-defender', name: 'Défenseur (Sim)', owner: 'empire', composition: data.defender, totalPower: 1000 }],
                defenderPlanet: { name: 'Simulation', garrison: data.garrison, owner: 'empire' },
                isSimulation: true
           });
       }
       setShowBattleSimulator(false);
  };

  const maxSlotsDefined = activePlanet ? (PLANET_SLOTS_CONFIG[activePlanet.planet_type] || 4) : 0;
  const planetSlots = Array(maxSlotsDefined).fill(null).map((_, i) => planetBuildings[i] || null);

  const handleRegionClick = useCallback((rName) => {
    if (!isRegionClickEnabled) return;
    const rData = regions.find(r => r.name === rName);
    const rPlanets = planets.filter(p => p.region === rName);
    setSelectedRegion({ name: rName, description: rData?.description || "", planets: rPlanets });
  }, [regions, planets, isRegionClickEnabled]);

  const visiblePlanets = useMemo(() => {
    // Si toutes les factions sont visibles, on rend tous les planètes (opti)
    if (factions.length > 0 && visibleFactions.length === factions.length) return planets;
    
    return planets.filter(p => {
        const owner = p.owner || 'neutral'; // Fallback neutral si owner manquant
        return visibleFactions.includes(owner);
    });
  }, [planets, visibleFactions, factions]);

  // OPTIMIZATION: Only render planets within the current viewport (with a margin)
  const renderedPlanets = useMemo(() => {
      // PlanetLayer hides planets when zoomLevel (viewBox.w) >= 2500, so we can return empty list
      if (viewBox.w >= 2500) return [];

      const margin = 200; // Generous margin to cover aspect ratio differences and planet sizes
      return visiblePlanets.filter(p => 
          p.x >= viewBox.x - margin && 
          p.x <= viewBox.x + viewBox.w + margin &&
          p.y >= viewBox.y - margin && 
          p.y <= viewBox.y + viewBox.h + margin
      );
  }, [visiblePlanets, viewBox]);

  // OPTIMIZATION: Memoize filtered/derived props for map layers to prevent unnecessary re-renders
  const mapFactions = useMemo(() => factions.filter(f => visibleFactions.includes(f.id)), [factions, visibleFactions]);
  const mapFleets = useMemo(() => fleets.filter(f => visibleFactions.includes(f.owner)), [fleets, visibleFactions]);
  const stationedFleets = useMemo(() => fleets.filter(f => visibleFactions.includes(f.owner) && f.status === 'stationed'), [fleets, visibleFactions]);

  return (
    <div className={`flex flex-col h-screen w-screen fixed inset-0 overflow-hidden bg-sw-bg select-none font-swtor ${movingFleet ? 'cursor-crosshair' : ''}`}>
      <div className="flex-grow flex relative overflow-hidden z-0 bg-sw-bg">
         {isEditorMode && (
          <div className="absolute top-0 left-0 bottom-0 w-64 flex flex-col z-[60] p-1">
            <SwWindow
              title="Architecture"
              icon="structuralbracing"
              onClose={() => { setIsEditorMode(false); setIsRouteMode(false); }}
              className="h-full"
              bodyClassName="flex flex-col min-h-0 px-1 pb-1"
            >
              <div className="px-2 pb-3 border-b border-sw-border space-y-1.5">
                  <SwButton size="sm" active={isRouteMode} onClick={() => { setIsRouteMode(!isRouteMode); setEditorLinkSource(null); }} className="w-full text-[10px]"><SwIcon name="electronics" size={14} /> Mode Routes {isRouteMode ? '(ON)' : ''}</SwButton>

                  <SwButton size="sm" onClick={() => setShowFactionManager(true)} className="w-full text-[10px]"><SwIcon name="claninsignia" size={14} /> Gérer Factions</SwButton>
                  <SwButton size="sm" onClick={() => setShowRegionManager(true)} className="w-full text-[10px]"><SwIcon name="star_map" size={14} /> Gérer Régions</SwButton>
                  <SwButton size="sm" onClick={() => setShowBuildingManager(true)} className="w-full text-[10px]"><SwIcon name="structuralbracing" size={14} /> Gérer Bâtiments</SwButton>
                  <SwButton size="sm" onClick={() => setShowUnitManager(true)} className="w-full text-[10px]"><SwIcon name="unassembled_helm" size={14} /> Gérer Unités</SwButton>
                  <SwButton size="sm" onClick={() => setShowHolonetEditor(true)} className="w-full text-[10px]"><SwIcon name="datapad" size={14} /> Gérer Holonet</SwButton>

                  <div className="space-y-2 pt-3 mt-1 border-t border-sw-border">
                      <SwInput type="text" placeholder="Rechercher une planète..." className="text-[10px] p-2" onChange={(e) => setSearchTerm(e.target.value)}/>

                      <SwInput
                            as="select"
                            value={filterFaction}
                            onChange={(e) => setFilterFaction(e.target.value)}
                            className="text-[10px] p-1"
                        >
                            <option value="all">Toutes Factions</option>
                            {factions.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                      </SwInput>

                      <div className="flex gap-2">
                        <SwInput
                            as="select"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="w-1/2 text-[10px] p-1"
                        >
                            <option value="all">Tous Types</option>
                            {Object.keys(PLANET_SLOTS_CONFIG).map(type => (
                                <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}</option>
                            ))}
                        </SwInput>

                        <SwInput
                            as="select"
                            value={filterRegion}
                            onChange={(e) => setFilterRegion(e.target.value)}
                            className="w-1/2 text-[10px] p-1"
                        >
                            <option value="all">Toutes Régions</option>
                            {[...new Set(planets.map(p => p.region).filter(Boolean))].sort().map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </SwInput>
                      </div>
                  </div>
              </div>
              <div className="flex-grow min-h-0 overflow-y-auto sw-scroll p-1.5 space-y-0.5">
                  {planets.filter(p => {
                      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
                      const matchesFaction = filterFaction === "all" || p.owner === filterFaction;
                      const matchesType = filterType === "all" || p.planet_type === filterType;
                      const matchesRegion = filterRegion === "all" || p.region === filterRegion;
                      return matchesSearch && matchesFaction && matchesType && matchesRegion;
                  }).map(p => (
                      <div key={p.id} className="sw-row p-2 flex justify-between items-center group cursor-pointer" onClick={() => jumpToPlanet(p)}>
                          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || '#fff' }}></div><div className="text-xs text-sw-text">{p.name}</div></div>
                          <button onClick={(e) => { e.stopPropagation(); setEditingPlanet(p); setShowEditModal(true); }} className="text-sw-dim hover:text-sw-gold opacity-0 group-hover:opacity-100 transition-opacity">✎</button>
                      </div>
                  ))}
              </div>
            </SwWindow>
          </div>
         )}

         <div className="absolute bottom-4 left-4 z-50 pointer-events-auto">
             <div className="flex items-end gap-2">
                 {/* Main Management Dock */}
                 {!isEditorMode && !activePlanet && !isAnyModalOpen && (
                     <SwGlass className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 shadow-2xl">
                        {(isHighCommand || userFaction === 'mandalorians') && (<HudCell icon={userFaction === 'mandalorians' ? 'mtx_flair_mandalorian' : (userFaction === 'republic' ? 'republic' : 'empire')} size={52} onClick={() => setShowCouncil(true)} title={userFaction === 'republic' ? "Sénat Galactique" : (userFaction === 'mandalorians' ? "Gestion de Clan" : "Conseil Noir")} />)}
                        {isDiplomat && (<HudCell icon="beacon" size={52} onClick={() => setShowDiplomacy(true)} title="Diplomatie" />)}
                        {canAccessFleets && (<HudCell icon="remotecontrolstarship" size={52} onClick={() => setShowFleetManager(true)} title="Gestion de Flotte" />)}
                        {isHighCommand && (<HudCell icon="jediholocron" size={52} onClick={() => setShowResearch(true)} title="Recherche & Technologie" />)}
                        <div className="w-px h-8 bg-sw-border mx-1"></div>
                        <HudCell icon="book" size={42} onClick={() => setShowEncyclopedia(true)} title="Encyclopédie" />
                        <HudCell icon="star_map" size={42} onClick={() => setShowFactionFilter(true)} title="Filtres de Carte" />
                        <HudCell icon="amp_icon_craft" size={42} onClick={() => setShowSettingsModal(true)} title="Paramètres" />
                     </SwGlass>
                 )}

                 {/* Admin / Architect Tools */}
                 {!isEditorMode && (isArchitect || userRole === 'admin') && !isAnyModalOpen && (
                     <SwGlass accent="var(--sw-gold-dim)" className="flex items-center gap-1 pl-2.5 pr-1.5 py-1.5 shadow-2xl">
                         {isArchitect && (<HudCell icon="structuralbracing" size={34} onClick={() => setIsEditorMode(true)} title="Mode Éditeur" />)}
                         <HudCell icon="electronics" size={34} active={isRouteMode} onClick={() => { setIsRouteMode(!isRouteMode); setEditorLinkSource(null); }} title="Mode Routes" className={isRouteMode ? 'ring-1 ring-sw-accent shadow-[0_0_10px_rgb(var(--sw-accent-rgb)/0.6)] rounded' : ''} />
                         {isArchitect && (<HudCell icon="lightningstorm" size={34} onClick={() => setShowMagicManager(true)} title="Éditeur Magie" />)}
                         {userRole === 'admin' && (<HudCell icon="clashing_lightsabers_6_0" size={34} onClick={() => setShowBattleSimulator(true)} title="Simulateur Combat" />)}
                     </SwGlass>
                 )}
             </div>
         </div>

         {movingFleet && (
            <SwGlass accent="var(--sw-warn)" className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pl-4 pr-6 py-2 shadow-[0_0_20px_rgb(0_0_0/0.6)] animate-pulse flex items-center gap-3 pointer-events-none">
                <SwIcon name="remotecontrolstarship" size={28} />
                <div><SwLabel className="text-[10px] text-sw-warn">Ordre en cours pour</SwLabel><div className="font-bold text-sm text-sw-text">{movingFleet.name}</div></div>
                <div className="text-[10px] text-sw-dim ml-2">➜ Sélectionnez une destination</div>
            </SwGlass>
         )}

         {!isEditorMode && !showDiplomacy && (
             <div className={isDarkCouncil ? "mt-24 transition-all duration-500" : ""}>
                <TopHud userFaction={userFaction} factionData={factionData} projectedIncome={projectedIncome} currentTurn={currentTurn} isAdmin={isAdmin} isProcessingTurn={isProcessingTurn} handleNextTurn={handleNextTurn} handleLogout={() => signOut(auth)} onOpenProfile={() => setShowProfile(true)} onOpenMapEditor={() => setShowMapEditor(true)} onOpenAdminUsers={() => setShowAdminUsers(true)} />
             </div>
         )}

         <svg ref={svgRef} viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`} 
            className={`w-full h-full cursor-move ${isEditorMode ? 'cursor-crosshair' : ''}`}
            preserveAspectRatio="xMidYMid slice" 
            onMouseDown={(e) => { if(e.button===0||e.button===1){ setIsDragging(true); setDragStart({x:e.clientX, y:e.clientY}); clickStartRef.current = { x: e.clientX, y: e.clientY }; } }} 
            onMouseMove={(e) => { if(isDragging){ const r=svgRef.current.getBoundingClientRect(); setViewBox(p=>({ ...p, x:p.x-(e.clientX-dragStart.x)*(p.w/r.width), y:p.y-(e.clientY-dragStart.y)*(p.h/r.height) })); setDragStart({x:e.clientX, y:e.clientY}); } }} 
            onMouseUp={handleMapMouseUp} 
            onMouseLeave={() => setIsDragging(false)}>
            <MapDefs />
            <BackgroundLayer />
            {!isRouteMode && <BorderLayer 
                  planets={planets} 
                  factions={mapFactions} 
                  onRegionClick={handleRegionClick}
              />}
            <RouteLayer planets={visiblePlanets} />
            <FleetLayer fleets={mapFleets} planets={planets} currentTurn={currentTurn} shouldShowFleets={shouldShowFleets} fleetMovePreview={fleetMovePreview} />
            <PlanetLayer planets={renderedPlanets} factions={mapFactions} fleets={mapFleets} activePlanet={activePlanet} shouldShowFleets={shouldShowFleets} onPlanetClick={handlePlanetClick} zoomLevel={viewBox.w} />
         </svg>
      </div>

      {showFactionFilter && (
          <div className="absolute bottom-20 left-4 w-64 z-50">
            <SwWindow title="Calques Factions" icon="star_map" onClose={() => setShowFactionFilter(false)} className="w-full">
              <div className="flex flex-col gap-1 max-h-60 overflow-y-auto sw-scroll">
                  <div className="flex gap-2 mb-2">
                      <SwButton size="sm" onClick={() => setVisibleFactions(factions.map(f => f.id))} className="flex-1 text-[9px] px-1">Tout Afficher</SwButton>
                      <SwButton size="sm" onClick={() => setVisibleFactions([])} className="flex-1 text-[9px] px-1">Tout Masquer</SwButton>
                  </div>
                  {factions.map(f => (
                      <label key={f.id} data-active={visibleFactions.includes(f.id) ? 'true' : undefined} className="sw-row flex items-center gap-2 cursor-pointer p-1.5 group">
                          <input
                              type="checkbox"
                              checked={visibleFactions.includes(f.id)}
                              onChange={(e) => {
                                  if (e.target.checked) setVisibleFactions(prev => [...prev, f.id]);
                                  else setVisibleFactions(prev => prev.filter(id => id !== f.id));
                              }}
                              className="accent-[var(--sw-accent)] bg-transparent rounded-sm"
                          />
                          <span className="w-2 h-2 rounded-full shadow-[0_0_5px]" style={{backgroundColor: f.color, boxShadow: `0 0 5px ${f.color}`}}></span>
                          <span className={`${visibleFactions.includes(f.id) ? 'text-sw-text' : 'text-sw-faint'} text-xs font-bold transition-colors`}>{f.name}</span>
                      </label>
                  ))}
              </div>
            </SwWindow>
          </div>
      )}

      {!isEditorMode && activePlanet && ( <PlanetDock selectedPlanet={activePlanet} isTerritoryOwned={isTerritoryOwned} canBuild={canBuild} slots={planetSlots} buildingsTemplates={buildingsTemplates} currentTurn={currentTurn} setShowBuildMenu={setShowBuildMenu} handleUpgrade={handleUpgrade} handleDemolish={handleDemolish} handleCancel={handleCancel} showAssignMenu={showAssignMenu} setShowAssignMenu={(v)=>{setShowAssignMenu(v); if(v)fetchFactionMembers();}} factionMembers={factionMembers} handleAssignGovernor={handleAssignGovernor} isHighCommand={isHighCommand} setShowGarrisonMenu={setShowGarrisonMenu} /> )}
      {showGarrisonMenu && activePlanet && (
          <GarrisonManager planet={activePlanet} factionData={factionData} planetBuildings={planetBuildings} buildingsTemplates={buildingsTemplates} onClose={() => setShowGarrisonMenu(false)} onRecruit={handleRecruitGarrison} onDisband={handleDisbandGarrison} />
      )}
      {showCouncil && (<CouncilManager userFaction={userFaction} userRole={userRole} onClose={()=>setShowCouncil(false)} />)}
      {showFleetManager && ( <FleetManager userFaction={userFaction} fleets={fleets} planets={planets} currentTurn={currentTurn} factionData={factionData} factionMembers={factionMembers} onSelectFleet={handleFleetActionFromMenu} onClose={() => setShowFleetManager(false)} /> )}
      {pendingBattle && (
          pendingBattle.type === 'ground' 
            ? <GroundCombat attackerArmy={pendingBattle.attackerArmy} defenderGarrison={pendingBattle.defenderGarrison} planetType={pendingBattle.defenderPlanet?.planet_type || 'unknown'} onBattleEnd={handleBattleEnd} customUnits={customUnits.filter(u=>u.category==='ground')} customMap={savedMaps.find(m => m.id === pendingBattle.defenderPlanet?.ground_map_id)} heroData={heroData} magicDomains={magicDomains} />
            : <FleetCombat attackerFleet={pendingBattle.attackerFleet} defenderFleets={pendingBattle.defenderFleets} defenderPlanet={pendingBattle.defenderPlanet} onBattleEnd={handleBattleEnd} customUnits={customUnits.filter(u=>u.category==='space')} />
      )}
      {showDiplomacy && (<DiplomacyScreen userFaction={userFaction} userID={userID} userName={userData?.pseudo || userName} userRole={userRole} currentTurn={currentTurn} diplomaticAssignment={userData?.diplomatic_assignment} onClose={()=>setShowDiplomacy(false)} />)}
      {showBuildMenu && canBuild && (<BuildMenuOverlay buildingsTemplates={buildingsTemplates} factionData={factionData} selectedPlanet={activePlanet} handleConstruct={handleConstruct} onClose={()=>setShowBuildMenu(false)} userFaction={userFaction} />)}
      {showProfile && ProfileScreen && (<ProfileScreen userID={userID} onClose={()=>setShowProfile(false)} />)}
      {showAdminUsers && <AdminUserList onClose={() => setShowAdminUsers(false)} />}
      
      {/* MODALE CONFIRMATION FLOTTE */}
      {fleetMovePreview && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <SwWindow title="Ordre de Navigation" icon="remotecontrolstarship" className="max-w-md w-full">
                  <div className="space-y-5 px-1">
                      <SwPanel dark className="flex justify-between items-center p-3">
                          <SwLabel as="span" className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-sw-accent animate-pulse"></span>
                              Flotte
                          </SwLabel>
                          <span className="text-sw-text font-bold">{fleetMovePreview.fleet.name}</span>
                      </SwPanel>

                      <div className="flex items-center justify-between text-sm px-2">
                          <div className="flex flex-col items-center gap-1 group">
                              <SwLabel as="span" className="text-[10px]">Origine</SwLabel>
                              <SwCell icon="star_map" size={52} />
                              <span className="text-sw-text font-bold text-center mt-1 text-xs">{fleetMovePreview.source.name}</span>
                          </div>

                          <div className="flex-grow flex flex-col items-center px-4">
                              <div className="w-full h-px bg-sw-gold-dim/60 relative">
                                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-sw-bg px-2 text-sw-gold text-xs">➜</div>
                              </div>
                              <span className="text-[10px] text-sw-dim mt-2 font-mono">{fleetMovePreview.turns} Mois</span>
                          </div>

                          <div className="flex flex-col items-center gap-1 group">
                              <SwLabel as="span" className="text-[10px]">Destination</SwLabel>
                              <SwCell icon="spvp_targettracker" size={52} active className="animate-pulse" />
                              <span className="text-sw-gold font-bold text-center mt-1 text-xs">{fleetMovePreview.target.name}</span>
                          </div>
                      </div>

                      <SwPanel className="p-3 flex justify-between items-center">
                          <SwLabel as="span">Durée estimée</SwLabel>
                          <div className="flex items-baseline gap-1">
                             <span className="text-2xl font-mono font-bold text-sw-gold">{fleetMovePreview.turns}</span>
                             <span className="sw-label text-sw-gold-dim">Mois</span>
                          </div>
                      </SwPanel>
                  </div>

                  <SwDivider className="mt-6 mb-4" />
                  <div className="grid grid-cols-2 gap-3">
                      <SwButton onClick={handleCancelFleetMove}>
                          Changer Cible
                      </SwButton>
                      <SwButton variant="accent" onClick={handleConfirmFleetMove}>
                          <span>Lancer FTL</span>
                          <SwIcon name="remotecontrolstarship" size={18} />
                      </SwButton>
                  </div>
              </SwWindow>
          </div>
      )}
      {showResearch && (<ResearchTree userFaction={userFaction} factionData={factionData} onClose={()=>setShowResearch(false)} />)}
      {showEncyclopedia && (<Encyclopedia onClose={() => setShowEncyclopedia(false)} userFaction={userFaction} magicDomains={magicDomains} buildingsTemplates={buildingsTemplates} />)}
      {showMagicManager && (<MagicManager onClose={() => setShowMagicManager(false)} />)}
      {showBattleSimulator && (<BattleSimulator onClose={()=>setShowBattleSimulator(false)} onStart={handleStartSimulation} customUnits={customUnits} />)}
      
      {/* REGION INFO MODAL */}
      {selectedRegion && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-[500px] flex flex-col">
            <SwWindow title={selectedRegion.name} subtitle="SECTEUR GALACTIQUE" icon="star_map" onClose={() => setSelectedRegion(null)} className="w-full max-h-[80vh]" bodyClassName="flex flex-col min-h-0">
              <div className="flex-grow min-h-0 overflow-y-auto sw-scroll space-y-4 pr-1">
                  {selectedRegion.description && (
                      <SwPanel dark className="p-4">
                          <p className="text-sm text-sw-dim italic leading-relaxed">&ldquo;{selectedRegion.description}&rdquo;</p>
                      </SwPanel>
                  )}

                  <div>
                      <SwLabel as="h4" className="text-sw-gold mb-2 flex items-center gap-2">
                          <span className="w-1 h-1 bg-sw-accent rounded-full"></span>
                          Systèmes Planétaires ({selectedRegion.planets.length})
                      </SwLabel>
                      <div className="grid grid-cols-2 gap-1.5">
                          {selectedRegion.planets.map(p => {
                              const ownerFaction = factions.find(f => f.id === p.owner);
                              return (
                                  <div key={p.id} className="sw-row p-2 flex items-center justify-between group cursor-pointer" onClick={() => { jumpToPlanet(p); setSelectedRegion(null); }}>
                                      <div className="flex items-center gap-2">
                                          <div className="w-2 h-2 rounded-full shadow-[0_0_5px]" style={{ backgroundColor: p.color, boxShadow: `0 0 5px ${p.color}` }}></div>
                                          <span className="text-xs font-bold text-sw-text group-hover:text-sw-gold transition-colors">{p.name}</span>
                                      </div>
                                      {ownerFaction && (
                                          <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-sw-panel-dark border border-sw-border text-sw-dim max-w-[80px] truncate">
                                              {ownerFaction.name}
                                          </span>
                                      )}
                                  </div>
                              );
                          })}
                      </div>
                  </div>

                  {/* Stats de la région */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-sw-border">
                       <div className="text-center">
                           <SwLabel className="text-[10px]">Population</SwLabel>
                           <div className="text-lg font-mono text-sw-info">{selectedRegion.planets.reduce((sum, p) => sum + (p.population||0), 0).toLocaleString()}</div>
                       </div>
                       <div className="text-center">
                           <SwLabel className="text-[10px]">Économie</SwLabel>
                           <div className="text-lg font-mono text-sw-gold flex items-center justify-center gap-1">{selectedRegion.planets.reduce((sum, p) => sum + (p.base_production?.credits||0), 0)} <span className="text-xs">Cr</span></div>
                       </div>
                       <div className="text-center">
                           <SwLabel className="text-[10px]">Contrôle</SwLabel>
                           <div className="text-xs text-sw-text mt-1">
                               {(() => {
                                   const counts = {};
                                   selectedRegion.planets.forEach(p => counts[p.owner] = (counts[p.owner]||0)+1);
                                   const dominant = Object.entries(counts).sort((a,b) => b[1]-a[1])[0];
                                   if(!dominant) return "Inconnu";
                                   const f = factions.find(fact => fact.id === dominant[0]);
                                   return f ? `${f.name} (${Math.round(dominant[1]/selectedRegion.planets.length*100)}%)` : "Neutre";
                               })()}
                           </div>
                       </div>
                  </div>
              </div>
            </SwWindow>
          </div>
      )}

      {showSettingsModal && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-80">
            <SwWindow title="Paramètres" icon="amp_icon_craft" onClose={()=>setShowSettingsModal(false)} className="w-full">
            <div className="flex flex-col gap-4">
                {userRole === 'admin' && (
                    <div className="flex justify-between items-center">
                        <SwLabel as="span" className="text-xs text-sw-text">Système de Flotte</SwLabel>
                        <SwButton size="sm" onClick={toggleFleetSystem} className={isFleetSystemEnabled ? 'text-sw-success' : 'text-sw-error'}>{isFleetSystemEnabled ? 'ACTIF' : 'INACTIF'}</SwButton>
                    </div>
                )}
                <div className="flex justify-between items-center">
                    <SwLabel as="span" className="text-xs text-sw-text">Infos Régions</SwLabel>
                    <SwButton size="sm" onClick={() => setIsRegionClickEnabled(!isRegionClickEnabled)} className={isRegionClickEnabled ? 'text-sw-success' : 'text-sw-error'}>{isRegionClickEnabled ? 'ACTIF' : 'INACTIF'}</SwButton>
                </div>
            </div>
            </SwWindow>
        </div>
      )}
      {showFactionManager && isEditorMode && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-[500px] flex flex-col">
            <SwWindow title={editingFaction ? 'Modifier Faction' : 'Gérer Factions'} icon="claninsignia" onClose={() => { setShowFactionManager(false); setEditingFaction(null); }} className="w-full max-h-[85vh]" bodyClassName="flex flex-col min-h-0">
              <form key={editingFaction ? editingFaction.id : 'new'} onSubmit={editingFaction ? handleUpdateFaction : handleCreateFaction} className="sw-panel-dark flex flex-col gap-3 mb-4 p-4 overflow-y-auto sw-scroll flex-grow">
                  <span className="sw-label text-[10px] text-sw-gold">{editingFaction ? `Modifier ${editingFaction.name}` : 'Nouvelle Faction'}</span>
                  <input name="name" defaultValue={editingFaction?.name || ''} placeholder="Nom" className="sw-input p-1 text-xs" required />
                  <input name="image" defaultValue={editingFaction?.image || ''} placeholder="URL Image" className="sw-input p-1 text-xs" />
                  <div className="space-y-2 border-t border-sw-border pt-2"><span className="sw-label text-[10px] text-sw-gold">Phrases Diplomatiques</span><div className="grid grid-cols-1 gap-3"><div><label className="sw-label text-[9px] text-sw-error">Guerre</label><textarea name="phrase_war" defaultValue={editingFaction?.diplomatic_phrases?.war || ''} className="sw-input h-10 p-1 text-[10px]" /></div><div><label className="sw-label text-[9px] text-sw-success">Alliance</label><textarea name="phrase_alliance" defaultValue={editingFaction?.diplomatic_phrases?.alliance || ''} className="sw-input h-10 p-1 text-[10px]" /></div></div></div>
                  <div className="flex gap-2 mt-2"><input name="color" type="color" className="h-8 w-10 cursor-pointer bg-transparent" defaultValue={editingFaction?.color || "#00ff00"} /><SwButton type="submit" variant="accent" size="sm" className="flex-grow">{editingFaction ? "Sauvegarder" : "Créer"}</SwButton></div>
              </form>
              <div className="overflow-y-auto sw-scroll space-y-1">
                  {factions.map(f => (
                      <div key={f.id} className="sw-row flex justify-between items-center p-2">
                          <div className="flex items-center gap-2"><span className="text-xs font-bold" style={{color: f.color}}>{f.name}</span></div>
                          <div className="flex gap-2">
                              <button onClick={() => setEditingFaction(f)} className="text-sw-gold hover:text-sw-text text-[10px]">✎</button>
                              <button onClick={async () => { if(confirm("Supprimer " + f.name + " ? Cela ne changera pas le propriétaire des planètes actuelles.")) await deleteDoc(doc(db, "factions", f.id)); }} className="text-sw-error text-[10px] hover:brightness-125">🗑️</button>
                          </div>
                      </div>
                  ))}
              </div>
            </SwWindow>
          </div>
      )}

      {showRegionManager && isEditorMode && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-[400px] flex flex-col">
            <SwWindow title="Gérer Régions" icon="star_map" onClose={() => setShowRegionManager(false)} className="w-full max-h-[85vh]" bodyClassName="flex flex-col min-h-0">
              <form onSubmit={async (e) => {
                  e.preventDefault();
                  const d = new FormData(e.target);
                  const name = d.get('name');
                  const desc = d.get('description');
                  if(!name) return;
                  try {
                    await addDoc(collection(db, "regions"), { name, description: desc, created_at: new Date() });
                    e.target.reset();
                  } catch (err) {
                    console.error("Error adding region:", err);
                    alert("Erreur lors de la création : " + err.message);
                  }
              }} className="sw-panel-dark flex flex-col gap-2 mb-4 p-3">
                  <span className="sw-label text-[10px] text-sw-gold">Nouvelle Région</span>
                  <input name="name" placeholder="Nom de la région" className="sw-input p-2 text-xs" required />
                  <textarea name="description" placeholder="Description courte (optionnelle)" className="sw-input h-16 p-2 text-xs resize-none" />
                  <SwButton type="submit" variant="accent" size="sm" className="w-full">Ajouter la Région</SwButton>
              </form>
              <div className="overflow-y-auto space-y-1 sw-scroll flex-grow p-1 min-h-[100px]">
                  {regions.map(r => (
                      <div key={r.id} className="sw-row p-2 group">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-sw-gold font-bold">{r.name || "Sans Nom"}</span>
                            <button type="button" onClick={async () => { if(confirm("Supprimer " + r.name + " ?")) await deleteDoc(doc(db, "regions", r.id)); }} className="text-sw-error text-[10px] hover:brightness-125 opacity-0 group-hover:opacity-100 transition-opacity">🗑️</button>
                          </div>
                          {r.description && <p className="text-[9px] text-sw-dim italic border-l-2 border-sw-accent/40 pl-2">{r.description}</p>}
                      </div>
                  ))}
                  {regions.length === 0 && <div className="text-sw-faint text-xs italic text-center p-4 border border-dashed border-sw-border rounded">Aucune région définie</div>}
              </div>
            </SwWindow>
          </div>
      )}
      
      {showUnitManager && isEditorMode && (
          <UnitManager onClose={() => setShowUnitManager(false)} magicDomains={magicDomains} />
      )}
      {showHolonetEditor && (
          <HolonetEditor onClose={() => setShowHolonetEditor(false)} />
      )}
      {showBuildingManager && isEditorMode && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-[600px] flex flex-col">
            <SwWindow title="Architecte de Plans" icon="structuralbracing" onClose={() => { setShowBuildingManager(false); setEditingBuilding(null); }} className="w-full max-h-[90vh]" bodyClassName="flex flex-col min-h-0">
              <form key={editingBuilding ? editingBuilding.id : 'new'} onSubmit={handleCreateBuilding} className="sw-panel-dark flex flex-col gap-3 overflow-y-auto sw-scroll pr-2 mb-4 p-4">
                  {editingBuilding && <div className="sw-label text-[10px] text-sw-warn text-center border border-sw-warn/50 bg-sw-warn/10 rounded-sm p-1 mb-2">Mode Édition : {editingBuilding.name}</div>}
                  <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2"><label className="sw-label text-[10px] block">Description</label><input name="description" defaultValue={editingBuilding?.description} className="sw-input p-1 text-xs" /></div>
                      
                      <div className="col-span-2"><label className="sw-label text-[10px] block">Nom du Plan / Série (Optionnel)</label><input name="series_name" defaultValue={editingBuilding?.series_name} placeholder="Ex: Mine de Doonium (utilisé pour l'affichage général)" className="sw-input p-1 text-xs text-sw-gold font-bold" /></div>

                      <div>
                          <label className="sw-label text-[10px] block mb-1">Catégorie</label>
                          <select name="category" defaultValue={editingBuilding?.category || 'economic'} className="sw-input text-xs p-2">{BUILDING_CATEGORIES.map(cat => (<option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>))}</select>
                      </div>
                      <div>
                          <label className="sw-label text-[10px] block mb-1">Groupe / Limite</label>
                          <input name="group" placeholder="Ex: Mine (Empêche 2 mines)" defaultValue={editingBuilding?.group || ''} className="sw-input p-2 text-xs uppercase" />
                      </div>

                      {/* --- NOUVEAU : RESTRICTIONS DE PLANETES --- */}
                      <div className="col-span-2">
                        <label className="sw-label text-[10px] block mb-1">Restrictions Planétaires</label>
                        <div className="sw-panel flex gap-2 flex-wrap p-2">
                          {['standard', 'industrial', 'capital', 'force_nexus'].map(type => (
                            <label key={type} className="flex items-center gap-1 text-[10px] text-sw-text cursor-pointer">
                              <input type="checkbox" name="allowed_types" value={type} defaultChecked={editingBuilding ? editingBuilding.allowed_types?.includes(type) : true} className="accent-[var(--sw-accent)]" /> {type}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* --- RESTRICTIONS DE FACTION --- */}
                      <div className="col-span-2">
                            <label className="sw-label text-[10px] block mb-1">Limite de Faction (Optionnel)</label>
                            <div className="sw-panel p-2 h-24 overflow-y-auto sw-scroll">
                                <label className="flex items-center gap-2 mb-1 p-1 hover:bg-white/5 rounded cursor-pointer">
                                    <span className="text-[10px] text-sw-dim italic">Si aucune case cochée = Disponible pour tous</span>
                                </label>
                                {factions.map(f => (
                                    <label key={f.id} className="flex items-center gap-2 mb-1 p-1 hover:bg-white/5 rounded cursor-pointer">
                                        <input type="checkbox" name="allowed_factions" value={f.id} defaultChecked={editingBuilding?.allowed_factions?.includes(f.id)} className="accent-[var(--sw-accent)]" />
                                        <span className="text-xs font-bold" style={{color: f.color}}>{f.name}</span>
                                    </label>
                                ))}
                            </div>
                      </div>

                      <div className="col-span-2 flex items-center gap-2"><label className="sw-label text-[10px]">Niveaux :</label><select value={maxLevels} onChange={(e) => setMaxLevels(parseInt(e.target.value))} className="sw-input w-auto text-sw-gold text-xs p-1">{[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}</select></div>
                  </div>
                  <SwTabs className="border-b border-sw-border mb-2" tabClassName="min-w-0 h-8 px-4 text-[10px]" tabs={Array.from({length: maxLevels}, (_, i) => i + 1).map(level => ({ id: level, label: `Nv ${level}` }))} value={currentLevelTab} onChange={setCurrentLevelTab} />
                  {Array.from({length: maxLevels}, (_, i) => i + 1).map(level => {
                      // Find existing level data if editing
                      const lvlData = editingBuilding?.upgrades?.find(u => u.level === level) || (level === 1 ? editingBuilding : null);
                      // Fallback logic: level 1 is base object, other levels are in 'upgrades'
                      // Wait, in db structure:
                      // Level 1 data is in root (cost, production, etc) but also implicit? 
                      // Actually handleCreateBuilding puts level 1 data in root fields (cost, production...) AND pushes levels 2+ to upgrades array.
                      // So for Level 1, we look at root. For Level 2+, we look at upgrades array.
                      
                      const data = level === 1 ? editingBuilding : editingBuilding?.upgrades?.find(u => u.level === level);

                      return ( 
                      <div key={level} className={currentLevelTab === level ? 'block space-y-3 p-2 sw-panel' : 'hidden'}><div className="grid grid-cols-2 gap-2"><div className="col-span-2"><label className="sw-label text-[10px]">Nom</label><input name={`level_${level}_name`} defaultValue={data?.name} className="sw-input p-1 text-xs" required /></div><div><label className="sw-label text-[10px]">Temps</label><input type="number" name={`level_${level}_turns`} defaultValue={data?.turns_required || 1} className="sw-input p-1 text-xs" required /></div><div><label className="sw-label text-[10px]">Coût (Cr)</label><input type="number" name={`level_${level}_cost_credits`} defaultValue={data?.cost || data?.cost_credits || 100} className="sw-input p-1 text-xs" required /></div><div><label className="sw-label text-[10px]">Coût (Mat)</label><input type="number" name={`level_${level}_cost_materials`} defaultValue={data?.cost_materials || 0} className="sw-input p-1 text-xs" /></div></div><div className="grid grid-cols-3 gap-2 border-t border-sw-border pt-2"><div className="col-span-3 sw-label text-[10px] text-sw-success">Production</div><input type="number" name={`level_${level}_prod_credits`} defaultValue={data?.production?.credits} placeholder="CR" className="sw-input p-1 text-[10px] border-sw-success/40" /><input type="number" name={`level_${level}_prod_materials`} defaultValue={data?.production?.materials} placeholder="MAT" className="sw-input p-1 text-[10px] border-sw-success/40" /><input type="number" name={`level_${level}_prod_manpower`} defaultValue={data?.production?.manpower} placeholder="HOM" className="sw-input p-1 text-[10px] border-sw-success/40" /><input type="number" name={`level_${level}_prod_science`} defaultValue={data?.production?.science} placeholder="SCI (💠)" className="sw-input p-1 text-[10px] border-purple-900" /></div><div className="grid grid-cols-3 gap-2 border-t border-sw-border pt-2"><div className="col-span-3 sw-label text-[10px] text-sw-error">Maintenance</div><input type="number" name={`level_${level}_maint_credits`} defaultValue={data?.maintenance?.credits} placeholder="CR" className="sw-input p-1 text-[10px] border-sw-error/40" /><input type="number" name={`level_${level}_maint_materials`} defaultValue={data?.maintenance?.materials} placeholder="MAT" className="sw-input p-1 text-[10px] border-sw-error/40" /><input type="number" name={`level_${level}_maint_manpower`} defaultValue={data?.maintenance?.manpower} placeholder="HOM" className="sw-input p-1 text-[10px] border-sw-error/40" /></div>
                      
                      <div className="border-t border-sw-border pt-2 mt-2">
                          <div className="sw-label text-[10px] text-sw-warn mb-1">Unités Débloquées</div>
                          <div className="grid grid-cols-2 gap-1">
                              {Object.entries(GARRISON_STATS).map(([uid, ustat]) => (
                                  <label key={uid} className="flex items-center gap-1 text-[9px] text-sw-text cursor-pointer hover:bg-white/5 rounded px-1">
                                      <input type="checkbox" name={`level_${level}_unlocks`} value={uid} defaultChecked={data?.unlocks_units?.includes(uid)} className="accent-[var(--sw-accent)]" />
                                      {ustat.label}
                                  </label>
                              ))}
                          </div>
                      </div>
                      
                      </div> 
                   )})}
                  <div className="flex gap-2">
                       <SwButton type="submit" variant="accent" className="flex-grow">{editingBuilding ? "Modifier le Plan" : "Créer le Plan"}</SwButton>
                       {editingBuilding && <SwButton type="button" onClick={()=>setEditingBuilding(null)}>Annuler</SwButton>}
                  </div>
              </form>
              <div className="overflow-y-auto sw-scroll space-y-1 h-32 border-t border-sw-border pt-2">
                  {buildingsTemplates.map(b => (
                      <div key={b.id} data-active={editingBuilding?.id === b.id ? 'true' : undefined} className="sw-row flex justify-between items-center p-2 text-[10px] group">
                          <div className="flex flex-col">
                              <span className="text-sw-text font-bold">{b.series_name || b.name}</span>
                              {b.series_name && <span className="text-sw-dim text-[9px]">{b.name} (Niv 1)</span>}
                          </div>
                          <div className="flex gap-2">
                              <button onClick={() => { setEditingBuilding(b); setMaxLevels(b.max_levels || 1); }} className="text-sw-gold hover:text-sw-text">✎</button>
                              <button onClick={async()=>await deleteDoc(doc(db,"buildings",b.id))} className="text-sw-error opacity-0 group-hover:opacity-100 hover:brightness-125">🗑️</button>
                          </div>
                      </div>
                  ))}
              </div>
            </SwWindow>
          </div>
      )}
      {showMapEditor && (
        <GroundMapEditor 
            onClose={() => setShowMapEditor(false)}
            onSave={(mapData) => {
                setSavedMaps(prev => {
                    const idx = prev.findIndex(m => m.id === mapData.id);
                    if (idx >= 0) {
                        const newMaps = [...prev];
                        newMaps[idx] = mapData;
                        return newMaps;
                    }
                    return [...prev, mapData];
                });
                setShowMapEditor(false);
            }}
            existingMap={currentMapToEdit}
        />
      )}
      {showCreateModal && isEditorMode && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-80">
            <SwWindow title="Nouvelle Province" icon="star_map" className="w-full">
              <form onSubmit={handleCreatePlanet} className="space-y-3">
                  <input name="name" placeholder="Nom" className="sw-input p-2 text-xs" required />
                  
                  {/* REGION SELECTOR */}
                  <select name="region" className="sw-input p-2 text-xs" required>
                      <option value="">-- Choisir Région --</option>
                      {regions.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                  </select>

                  <select name="owner" className="sw-input p-2 text-xs"><option value="neutral">Neutre</option>{factions.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select>
                  <select name="type" className="sw-input p-2 text-xs"><option value="standard">Standard</option><option value="industrial">Industriel</option><option value="capital">Capitale</option><option value="force_nexus">Nexus</option></select>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-sw-border">
                      <div className="col-span-2 sw-label text-[10px]">Données Démographiques</div>
                      <input name="population" type="number" placeholder="Population" className="sw-input p-1 text-xs" />
                      <div className="col-span-2 sw-label text-[10px] mt-1">Ressources Naturelles</div>
                      <input name="prod_credits" type="number" placeholder="Crédits/Mois" className="sw-input p-1 text-xs" />
                      <input name="prod_materials" type="number" placeholder="Matériaux/Mois" className="sw-input p-1 text-xs" />
                  </div>
                  <SwButton type="submit" variant="accent" className="w-full mt-2">Créer</SwButton>
                  <button type="button" onClick={()=>setShowCreateModal(false)} className="w-full sw-label text-[10px] text-sw-faint hover:text-sw-text">Annuler</button>
              </form>
            </SwWindow>
          </div>
      )}
      {showEditModal && isEditorMode && editingPlanet && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-96">
            <SwWindow title={editingPlanet.name} icon="star_map" onClose={()=>setShowEditModal(false)} className="w-full">
              <form onSubmit={handleUpdatePlanet} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                      <div><label className="sw-label text-[10px]">Nom</label><input name="name" defaultValue={editingPlanet.name} className="sw-input p-1 text-xs" /></div>
                      <div>
                          <label className="sw-label text-[10px]">Région</label>
                          <select name="region" defaultValue={editingPlanet.region} className="sw-input p-1 text-xs">
                              <option value="">-- Inconnue --</option>
                              {regions.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                          </select>
                      </div>
                      <div><label className="sw-label text-[10px]">Type</label><select name="planet_type" defaultValue={editingPlanet.planet_type} className="sw-input p-1 text-xs"><option value="standard">Standard</option><option value="industrial">Industriel</option><option value="capital">Capitale</option><option value="force_nexus">Nexus</option></select></div>
                      <div><label className="sw-label text-[10px]">Carte Tactique</label><select name="ground_map_id" defaultValue={editingPlanet.ground_map_id || ''} className="sw-input p-1 text-xs"><option value="">Aléatoire (Défaut)</option>{savedMaps.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
                      <div><label className="sw-label text-[10px]">Propriétaire</label><select name="owner" defaultValue={editingPlanet.owner} className="sw-input p-1 text-xs"><option value="neutral">Neutre</option>{factions.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
                      <div className="col-span-2"><label className="sw-label text-[10px]">Couleur</label><input name="color" type="color" defaultValue={editingPlanet.color} className="w-full h-6 cursor-pointer" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-sw-border">
                      <div><label className="sw-label text-[10px]">Pop.</label><input name="population" type="number" defaultValue={editingPlanet.population || 0} className="sw-input p-1 text-xs" /></div>
                      <div><label className="sw-label text-[10px] text-sw-gold">Prod. CR</label><input name="prod_credits" type="number" defaultValue={editingPlanet.base_production?.credits || 0} className="sw-input p-1 text-xs" /></div>
                      <div><label className="sw-label text-[10px] text-sw-info">Prod. MAT</label><input name="prod_materials" type="number" defaultValue={editingPlanet.base_production?.materials || 0} className="sw-input p-1 text-xs" /></div>
                  </div>
                  <div className="flex flex-col gap-2 pt-2 border-t border-sw-border">
                      <label className="sw-label text-[10px]">Routes Actuelles</label>
                      <div className="flex flex-wrap gap-1">{editingPlanet.connected_to?.map(tid => { const tName = planets.find(p=>p.id===tid)?.name || '?'; return (<span key={tid} className="text-[9px] sw-panel text-sw-text px-2 py-1 flex items-center gap-1">{tName} <button type="button" onClick={()=>removeRoute(tid)} className="text-sw-error font-bold hover:text-white">x</button></span>); })}</div>
                      <SwButton type="button" size="sm" onClick={startLinking} className="w-full text-[10px]">+ Ajouter Route</SwButton>
                  </div>
                  <div className="flex gap-2 pt-2"><SwButton type="button" variant="danger" onClick={handleDeletePlanet}>Suppr.</SwButton><SwButton type="submit" variant="accent" className="flex-1">Sauvegarder</SwButton></div>
              </form>
            </SwWindow>
          </div>
      )}
      
      {showHolonetEditor && (
        <HolonetEditor onClose={() => setShowHolonetEditor(false)} />
      )}
      
      {showAdminUsers && (
          <AdminUserList onClose={() => setShowAdminUsers(false)} />
      )}

      {showIntro && factionData && (
        <IntroPopup userFaction={factionData.name} onClose={handleCloseIntro} />
      )}
    </div>
  );
}
