"use client";

import { useState, useEffect, useRef } from 'react';
import { auth, db } from '../app/lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, getDocs, doc, addDoc, deleteDoc, onSnapshot, query, updateDoc, setDoc, increment, where, arrayUnion, arrayRemove, writeBatch, collectionGroup } from 'firebase/firestore';
import DiplomacyScreen from './DiplomacyScreen';
import NotificationPanel from './NotificationPanel';
import CouncilManager from './CouncilManager';
import FleetManager from './FleetManager';
import BorderLayer from './BorderLayer';
// J'ai gardé les imports mais si les fichiers n'existent pas, commente-les :
// import ProfileScreen from './ProfileScreen';
// import DarkCouncilOverlay from './DarkCouncilOverlay';

// --- CONFIGURATION ---
const ARCHITECT_ROLES = ['admin', 'gamemaster'];
const HIGH_COMMAND_ROLES = ['admin', 'conseil', 'general', 'emperor'];
const PLANET_SLOTS_CONFIG = { capital: 8, industrial: 6, force_nexus: 5, standard: 4, unknown: 3 };

// VITESSE DE LA FLOTTE (Pixels par Tour)
const FLEET_SPEED = 75; 

const toRoman = (num) => {
    const lookup = {M:1000,CM:900,D:500,CD:400,C:100,XC:90,L:50,XL:40,X:10,IX:9,V:5,IV:4,I:1};
    let roman = '', i;
    for ( i in lookup ) { while ( num >= lookup[i] ) { roman += i; num -= lookup[i]; } }
    return roman;
};

// --- ALGORITHME DE PATHFINDING (Dijkstra) ---
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

// --- CALCUL DE POSITION PRÉCIS (CORRIGÉ POUR ÉVITER L'ERREUR SVG) ---
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
            // CORRECTION: Utilisation de Number() pour éviter les erreurs de type string
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

// Icons SVG
const Icons = {
    Credits: () => <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    Materials: () => <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
    Manpower: () => <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    Logout: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
    Construction: () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
    Upgrade: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>,
    ArrowUp: () => <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>,
    User: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
};

// --- SOUS-COMPOSANTS ---
const TopHud = ({ userFaction, factionData, projectedIncome, currentTurn, isAdmin, isProcessingTurn, handleNextTurn, handleLogout, onOpenProfile }) => (
    <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
        <div className="flex items-start gap-2 pointer-events-auto">
            <NotificationPanel userID={userFaction} />
            <div className="flex items-stretch gap-2 bg-gray-950/90 border border-gray-700 rounded-lg shadow-2xl backdrop-blur-md overflow-hidden p-1">
                <div className="px-4 py-2 flex flex-col justify-center border-r border-gray-700 bg-black/20 min-w-[100px] text-center">
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest leading-none mb-1">Calendrier</span>
                    <div className="flex flex-col items-center">
                        <span className="text-lg font-bold text-white font-mono leading-none">TOUR {currentTurn}</span>
                        {isAdmin && (<button onClick={handleNextTurn} disabled={isProcessingTurn} className={`text-[9px] mt-1 px-2 py-0.5 rounded font-bold uppercase tracking-wide transition-colors w-full ${isProcessingTurn ? 'bg-gray-800 text-gray-500' : 'bg-yellow-600 text-white hover:bg-yellow-500'}`}>{isProcessingTurn ? "..." : "SUIVANT >>"}</button>)}
                    </div>
                </div>
                <div className="flex items-center gap-4 px-2">
                    <ResourceDisplay icon={<Icons.Credits />} label="Crédits" value={factionData?.credits} income={projectedIncome.credits} color="text-yellow-500" />
                    <ResourceDisplay icon={<Icons.Materials />} label="Matériaux" value={factionData?.materials} income={projectedIncome.materials} color="text-blue-400" />
                    <ResourceDisplay icon={<Icons.Manpower />} label="Effectifs" value={factionData?.manpower} income={projectedIncome.manpower} color="text-green-500" />
                </div>
                <div className="w-px bg-gray-700 my-1"></div>
                <button onClick={onOpenProfile} className="px-3 hover:bg-gray-800 group flex flex-col items-center justify-center transition-colors rounded" title="Profil">
                    <div className="text-gray-500 group-hover:text-[#cba660]"><Icons.User /></div>
                </button>
                <button onClick={handleLogout} className="px-3 hover:bg-red-900/30 group flex flex-col items-center justify-center transition-colors rounded" title="Déconnexion">
                    <div className="text-gray-500 group-hover:text-red-400"><Icons.Logout /></div>
                </button>
            </div>
        </div>
    </div>
);

const ResourceDisplay = ({ icon, label, value, income, color }) => (
    <div className="flex items-center gap-2"><div className={`${color} bg-gray-900 p-1.5 rounded border border-gray-800`}>{icon}</div><div className="flex flex-col"><span className="text-[9px] text-gray-500 uppercase font-bold">{label}</span><div className="flex items-baseline gap-1"><span className="text-sm font-bold text-white font-mono">{value?.toLocaleString() ?? 0}</span><span className={`text-[10px] font-mono font-bold ${income >= 0 ? 'text-green-500' : 'text-red-500'}`}>{income >= 0 ? '+' : ''}{income}</span></div></div></div>
);

const PlanetDock = ({ selectedPlanet, isTerritoryOwned, canBuild, slots, buildingsTemplates, currentTurn, setShowBuildMenu, handleUpgrade, handleDemolish, handleCancel, showAssignMenu, setShowAssignMenu, factionMembers, handleAssignGovernor, isHighCommand }) => {
    if (!selectedPlanet) return null;
    return (
        <div className="h-48 bg-gradient-to-t from-gray-950 via-gray-900 to-gray-800 border-t-4 border-[#8B5A2B] shadow-[0_-5px_20px_rgba(0,0,0,0.8)] flex shrink-0 relative z-20 animate-in slide-in-from-bottom-full duration-300">
            <div className="w-72 p-4 border-r-2 border-[#8B5A2B]/50 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] flex flex-col justify-between shrink-0 relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#e5c07b]/50 to-transparent"></div>
                 <div>
                    <h2 className="text-2xl font-bold text-[#e5c07b] uppercase tracking-wider font-serif drop-shadow-md truncate">{selectedPlanet.name}</h2>
                    <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-sm font-bold uppercase border ${isTerritoryOwned ? 'bg-green-900/50 text-green-400 border-green-700' : 'bg-red-900/50 text-red-400 border-red-700'}`}>{isTerritoryOwned ? "Contrôlé" : "Hostile"}</span>
                        <span className="text-xs text-gray-400 uppercase font-bold tracking-wide">{selectedPlanet.planet_type || 'Standard'}</span>
                    </div>
                 </div>
                 
                 <div className="bg-black/40 p-3 rounded-lg border border-gray-700/50 shadow-inner relative">
                    <div className="text-[9px] text-[#e5c07b] uppercase tracking-widest mb-1 font-bold">Gouverneur</div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-200 truncate flex items-center gap-2">
                            {selectedPlanet.governor_name ? (<><span className="text-lg">👤</span> {selectedPlanet.governor_name}</>) : (<><span className="text-lg opacity-50">👤</span> <span className="italic text-gray-500">Aucun</span></>)}
                        </span>
                        {isTerritoryOwned && isHighCommand && (
                            <button onClick={() => setShowAssignMenu(!showAssignMenu)} className="text-[10px] bg-[#8B5A2B] hover:bg-[#a67c52] text-white px-2 py-1 rounded-sm shadow uppercase font-bold transition-colors border border-[#e5c07b]">
                                {showAssignMenu ? "Fermer" : "Changer"}
                            </button>
                        )}
                    </div>
                 </div>

                 {showAssignMenu && ( 
                    <div className="absolute bottom-full left-0 w-full max-h-64 bg-gray-900 border-2 border-[#8B5A2B] p-2 overflow-y-auto z-50 rounded-t-lg shadow-2xl custom-scrollbar">
                        {factionMembers.length > 0 ? (
                            factionMembers.map(m => (
                                <button key={m.id} onClick={() => handleAssignGovernor(m)} className="w-full text-left p-2 hover:bg-gray-800 text-sm text-gray-300 border-b border-gray-800 flex items-center justify-between gap-2 transition-colors group">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">👤</span> 
                                        <span className="font-bold group-hover:text-[#e5c07b] transition-colors">{m.pseudo}</span>
                                    </div>
                                    <span className="text-[9px] uppercase bg-black px-1 rounded text-gray-500">{m.faction_id || 'Neutre'}</span>
                                </button>
                            ))
                        ) : (
                            <div className="text-gray-500 text-xs text-center italic p-2">Aucun officier disponible.</div>
                        )}
                    </div> 
                 )}
            </div>

            <div className="flex-grow p-4 overflow-x-auto flex items-center gap-4 bg-black/60 relative backdrop-blur-sm custom-scrollbar">
                {isTerritoryOwned ? ( slots.map((building, index) => { 
                    const isFinished = building && currentTurn >= building.finish_turn; 
                    const template = buildingsTemplates.find(t => t.id === building?.template_id); 
                    const hasUpgrade = template && template.upgrades && template.upgrades.find(u => u.level === (building.level || 1) + 1); 
                    
                    return ( 
                        <div key={index} className="flex flex-col items-center gap-2 group relative shrink-0">
                            <div className={`w-28 h-28 border-2 flex flex-col justify-between p-2 relative shadow-lg transition-all rounded-lg overflow-hidden ${building ? (isFinished ? 'bg-gray-800 border-[#8B5A2B]' : 'bg-gray-900 border-yellow-600/50 border-dashed') : (canBuild ? 'bg-black/30 border-gray-700 hover:border-[#e5c07b] hover:bg-gray-800/50 cursor-pointer items-center justify-center' : 'bg-black/50 border-gray-800 opacity-50 items-center justify-center')}`} onClick={() => !building && canBuild && setShowBuildMenu(true)}>
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                                {building ? (
                                    <>
                                        <div className="text-center w-full relative z-10">
                                            <div className="text-[10px] font-bold text-gray-200 leading-tight truncate uppercase tracking-wide">{building.name}</div>
                                            <div className="flex justify-center items-center gap-1">
                                                <span className="text-[9px] text-[#e5c07b] font-serif bg-black/50 px-1 rounded border border-[#e5c07b]/30">Nv.{building.level || 1}</span>
                                                {!isFinished && <div className="text-[9px] font-mono text-yellow-500 bg-black/60 px-2 py-0.5 rounded-full border border-yellow-500/30">⏳ {building.finish_turn - currentTurn}</div>}
                                            </div>
                                            {isFinished && building.production && (
                                                <div className="flex justify-center gap-1 mt-1 border-t border-gray-700/50 pt-1">
                                                    {building.production.credits > 0 && <span className="text-[9px] text-green-400 flex items-center gap-0.5">+{building.production.credits}<Icons.Credits/></span>}
                                                    {building.production.materials > 0 && <span className="text-[9px] text-blue-400 flex items-center gap-0.5">+{building.production.materials}<Icons.Materials/></span>}
                                                    {building.production.manpower > 0 && <span className="text-[9px] text-green-600 flex items-center gap-0.5">+{building.production.manpower}<Icons.Manpower/></span>}
                                                </div>
                                            )}
                                        </div>
                                        {canBuild && (<div className="absolute -top-2 -right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">{isFinished && hasUpgrade && (<button onClick={(e) => { e.stopPropagation(); handleUpgrade(building); }} className="text-white w-6 h-6 rounded-full flex items-center justify-center text-xs border border-green-500 bg-green-900 hover:bg-green-700 shadow-md transition-all hover:scale-110" title="Améliorer"><Icons.Upgrade /></button>)}<button onClick={(e) => { e.stopPropagation(); isFinished ? handleDemolish(building) : handleCancel(building); }} className={`text-white w-6 h-6 rounded-full flex items-center justify-center text-xs border shadow-md transition-all hover:scale-110 ${isFinished ? 'bg-gray-700 border-gray-500 hover:bg-red-600 hover:border-red-400' : 'bg-red-900 border-red-500 hover:bg-red-700'}`} title={isFinished ? "Démolir" : "Annuler"}>{isFinished ? '🗑️' : '✕'}</button></div>)}
                                    </>
                                ) : (
                                    canBuild ? <span className="text-5xl text-gray-600 group-hover:text-[#e5c07b] transition-colors pb-2">+</span> : <span className="text-3xl text-gray-700">🔒</span>
                                )}
                            </div>
                            <div className="text-[10px] text-[#e5c07b] font-serif font-bold bg-black/50 px-3 py-0.5 rounded-full border border-[#8B5A2B]/50 uppercase tracking-widest shadow-sm">{toRoman(index + 1)}</div>
                        </div> 
                    ); 
                }) ) : (<div className="w-full flex items-center justify-center text-gray-400 italic gap-4 h-full border-2 border-red-900/30 bg-red-950/20 rounded-lg p-6"><span className="text-5xl opacity-50">⛔</span><span className="text-lg font-bold">Accès aux infrastructures restreint.</span></div>)}
            </div>
            <div className="w-16 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] border-l-2 border-[#8B5A2B]/50 shrink-0 relative"><div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-transparent via-[#e5c07b]/50 to-transparent"></div></div>
        </div>
    );
};

const BuildMenuOverlay = ({ buildingsTemplates, factionData, selectedPlanet, handleConstruct, onClose, userFaction }) => (
    <div className="fixed inset-x-0 bottom-48 top-0 z-[90] flex flex-col justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-gray-900 border-t-4 border-[#8B5A2B] w-full h-full flex flex-col shadow-[0_-10px_50px_rgba(0,0,0,0.8)] relative animate-in slide-in-from-bottom-10 duration-500">
            <div className="flex justify-between items-center px-8 py-4 border-b border-[#8B5A2B]/50 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 shrink-0">
                <div className="flex items-center gap-4">
                    <span className="text-4xl">🏗️</span>
                    <div>
                        <h4 className="text-[#e5c07b] font-serif font-bold uppercase tracking-[0.15em] text-3xl drop-shadow-md">Arbre de Construction</h4>
                        <p className="text-gray-400 text-xs uppercase tracking-widest">Planifiez le développement de votre province</p>
                    </div>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-white border border-gray-600 px-6 py-2 hover:bg-red-900/50 transition text-sm uppercase font-bold tracking-widest">Fermer [X]</button>
            </div>
            <div className="flex-grow overflow-auto p-8 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] custom-scrollbar">
                <div className="flex gap-8 items-end min-w-max min-h-full pb-8">
                    {buildingsTemplates.map(template => {
                        const levels = [template, ...(template.upgrades || [])];
                        return (
                            <div key={template.id} className="flex flex-col-reverse justify-start items-center gap-2 min-w-[200px] pt-4">
                                {levels.map((levelData, idx) => {
                                    const isBase = idx === 0;
                                    const costCr = levelData.cost || 0;
                                    const costMat = levelData.cost_materials || 0;
                                    const tier = toRoman(levelData.level || idx + 1);
                                    const canAfford = isBase && factionData.credits >= costCr && factionData.materials >= costMat;
                                    const isTypeAllowed = (!template.allowed_types || template.allowed_types.includes('any') || template.allowed_types.includes(selectedPlanet.planet_type));
                                    const isFactionAllowed = (!template.allowed_factions || template.allowed_factions.length === 0 || template.allowed_factions.includes(userFaction));
                                    return (
                                        <div key={idx} className="flex flex-col items-center relative group/card">
                                            {idx > 0 && <div className="mb-2 text-gray-600"><Icons.ArrowUp /></div>}
                                            <button onClick={() => isBase && handleConstruct(template)} disabled={!isBase || !canAfford || !isTypeAllowed || !isFactionAllowed} className={`relative w-52 h-64 flex flex-col border-2 transition-all duration-200 overflow-hidden bg-gray-900 shadow-xl ${isBase ? (canAfford && isTypeAllowed && isFactionAllowed ? 'border-gray-500 hover:border-[#e5c07b] hover:scale-105' : 'border-red-900/40 opacity-60 grayscale cursor-not-allowed') : 'border-gray-700/50 opacity-80 cursor-default'}`}>
                                                <div className="h-28 w-full bg-gray-800 relative border-b border-gray-700/50 flex items-center justify-center shrink-0">
                                                    <span className={`text-4xl ${isBase ? 'text-gray-400 group-hover/card:text-[#e5c07b]' : 'text-blue-900'}`}><Icons.Construction /></span>
                                                    <div className="absolute top-0 left-0 bg-[#8B5A2B] text-white font-serif font-bold text-[10px] px-1.5 py-0.5 border-br shadow z-20">{tier}</div>
                                                    {!isBase && <div className="absolute top-0 right-0 bg-blue-900/50 text-blue-200 text-[9px] px-1 uppercase z-20">Amélioration</div>}
                                                </div>
                                                <div className="flex-1 w-full p-3 bg-black/90 flex flex-col justify-between text-left relative overflow-hidden">
                                                    <div className="text-xs font-bold text-[#e5c07b] uppercase leading-tight mb-2 relative z-10">{levelData.name}</div>
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex justify-between items-end text-[9px] text-gray-400 pb-1 border-b border-gray-800">
                                                            <span className="flex gap-1 items-center text-yellow-600 font-bold">{costCr} <Icons.Credits/></span>
                                                            <span className="flex gap-1 items-center text-blue-500">{costMat} <Icons.Materials/></span>
                                                            {isBase ? (<span className={`uppercase ml-1 ${!isFactionAllowed ? 'text-red-500' : 'text-gray-500'}`}>{!isFactionAllowed ? "Faction Invalide" : "Construire"}</span>) : (<span className="text-white ml-1">{levelData.turns_required} trs</span>)}
                                                        </div>
                                                        {(levelData.production?.credits > 0 || levelData.production?.materials > 0 || levelData.production?.manpower > 0) && (
                                                            <div className="flex flex-wrap gap-2 pt-1">
                                                                <span className="text-[9px] text-gray-500 uppercase w-full">Production:</span>
                                                                {levelData.production.credits > 0 && <span className="text-green-400 text-[9px] flex items-center gap-0.5">+{levelData.production.credits}<Icons.Credits/></span>}
                                                                {levelData.production.materials > 0 && <span className="text-blue-400 text-[9px] flex items-center gap-0.5">+{levelData.production.materials}<Icons.Materials/></span>}
                                                                {levelData.production.manpower > 0 && <span className="text-green-600 text-[9px] flex items-center gap-0.5">+{levelData.production.manpower}<Icons.Manpower/></span>}
                                                            </div>
                                                        )}
                                                    </div>
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
        </div>
    </div>
);

// ==========================================
// COMPOSANT PRINCIPAL
// ==========================================
export default function GalaxyMap({ userFaction, userRole, userID, userName }) {
  // --- ÉTATS ---
  const [planets, setPlanets] = useState([]);
  const [factions, setFactions] = useState([]);
  const [buildingsTemplates, setBuildingsTemplates] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(1);
  const [factionData, setFactionData] = useState(null);
  const [userData, setUserData] = useState(null); 
  const [projectedIncome, setProjectedIncome] = useState({ credits: 0, materials: 0, manpower: 0 });
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);
  const [isFleetSystemEnabled, setIsFleetSystemEnabled] = useState(true); 
  
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [planetBuildings, setPlanetBuildings] = useState([]); 
  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const [showDiplomacy, setShowDiplomacy] = useState(false);
  const [showCouncil, setShowCouncil] = useState(false);
  const [showFleetManager, setShowFleetManager] = useState(false); 
  const [showProfile, setShowProfile] = useState(false); 
  const [factionMembers, setFactionMembers] = useState([]); 
  const [fleets, setFleets] = useState([]);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingFaction, setEditingFaction] = useState(null); 

  const [isEditorMode, setIsEditorMode] = useState(false);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 800, h: 500 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null); 
  
  const [movingFleet, setMovingFleet] = useState(null); 

  // --- CALCUL DES PERMISSIONS ET DONNÉES ACTIVES ---
  const activePlanet = selectedPlanet ? planets.find(p => p.id === selectedPlanet.id) : null;
  const isTerritoryOwned = activePlanet?.owner === userFaction;
  const isArchitect = ARCHITECT_ROLES.includes(userRole);
  const isAdmin = userRole === 'admin';
  const isHighCommand = HIGH_COMMAND_ROLES.includes(userRole);
  const isDiplomat = isHighCommand || (userData?.is_diplomat === true);
  const isGeneral = isHighCommand || (userData?.is_general === true); 
  
  const isGovernor = activePlanet?.governor_id && String(activePlanet.governor_id) === String(userID);
  const canBuild = isTerritoryOwned && (isHighCommand || isGovernor);

  const canAccessFleets = (isGeneral && isTerritoryOwned && activePlanet) || (isHighCommand && isFleetSystemEnabled) || isArchitect;
  const shouldShowFleets = isFleetSystemEnabled || isArchitect;

  // CORRECTION : DÉFINITION DE LA VARIABLE MANQUANTE

  const getFactionColor = (factionId) => { const f = factions.find(fact => fact.id === factionId); return f ? f.color : '#9ca3af'; };

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
        unsubFaction = onSnapshot(doc(db, "factions", userFaction), (d) => { if(d.exists()) setFactionData(d.data()); });
        if (userID) { unsubUser = onSnapshot(doc(db, "users", userID), (d) => { if(d.exists()) setUserData(d.data()); }); }
        unsubFleets = onSnapshot(query(collection(db, "fleets")), (snap) => { setFleets(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    }
    return () => { unsubPlanets(); unsubFactions(); unsubBuildings(); unsubGameState(); unsubUser(); unsubFaction(); unsubFleets(); };
  }, [userFaction, userID]);

  useEffect(() => {
      if (isHighCommand && userFaction) {
          const q = query(collection(db, "users"), where("faction_id", "==", userFaction));
          const unsub = onSnapshot(q, (snap) => {
              setFactionMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          });
          return () => unsub();
      }
  }, [userFaction, isHighCommand]);

  useEffect(() => {
    if (!userFaction || planets.length === 0) return;
    const myPlanetIds = planets.filter(p => p.owner === userFaction).map(p => p.id);
    if (myPlanetIds.length === 0) { setProjectedIncome({ credits: 0, materials: 0, manpower: 0 }); return; }
    const q = query(collectionGroup(db, 'constructions'), where('finish_turn', '<=', currentTurn));
    return onSnapshot(q, (snap) => {
        let income = { credits: 0, materials: 0, manpower: 0 };
        snap.forEach(doc => {
            const data = doc.data();
            if (doc.ref.parent?.parent && myPlanetIds.includes(doc.ref.parent.parent.id)) {
                if (data.production) { income.credits += (Number(data.production.credits)||0); income.materials += (Number(data.production.materials)||0); income.manpower += (Number(data.production.manpower)||0); }
                if (data.maintenance) { income.credits -= (Number(data.maintenance.credits)||0); income.materials -= (Number(data.maintenance.materials)||0); income.manpower -= (Number(data.maintenance.manpower)||0); }
            }
        });
        setProjectedIncome(income);
    });
  }, [userFaction, planets, currentTurn]);

  // --- LOGIQUE TOUR ---
  const handleNextTurn = async () => {
    if (isProcessingTurn || !confirm(`Passer au Tour ${currentTurn + 1} ?`)) return;
    setIsProcessingTurn(true);
    try {
      const batch = writeBatch(db);
      const production = {}; factions.forEach(f => production[f.id] = { credits: 0, materials: 0, manpower: 0 });
      const provincesSnap = await getDocs(collection(db, "provinces"));
      const provinceMap = {}; provincesSnap.forEach(p => provinceMap[p.id] = p.data());
      
      const qConstructions = query(collectionGroup(db, 'constructions'), where('finish_turn', '<=', currentTurn));
      const constructionsSnapList = await getDocs(qConstructions);
      const movingFleetsSnap = await getDocs(query(collection(db, "fleets"), where("status", "==", "moving"), where("arrival_turn", "<=", currentTurn)));

      constructionsSnapList.forEach(snap => {
          const data = snap.data();
          const provinceId = snap.ref.parent.parent.id;
          const owner = provinceMap[provinceId]?.owner;
          if (owner && production[owner]) {
              if(data.production) { production[owner].credits += (Number(data.production.credits)||0); production[owner].materials += (Number(data.production.materials)||0); production[owner].manpower += (Number(data.production.manpower)||0); }
              if(data.maintenance) { production[owner].credits -= (Number(data.maintenance.credits)||0); production[owner].materials -= (Number(data.maintenance.materials)||0); production[owner].manpower -= (Number(data.maintenance.manpower)||0); }
              if (data.finish_turn === currentTurn) {
                  batch.set(doc(collection(db, "notifications")), { targetId: owner, type: 'construction', title: 'Achevé', message: `${data.name} sur ${provinceMap[provinceId].name}.`, read: false, createdAt: new Date() });
              }
          }
      });

      movingFleetsSnap.forEach(fDoc => {
          const fData = fDoc.data();
          batch.update(doc(db, "fleets", fDoc.id), { location_id: fData.destination_id, location_name: provinceMap[fData.destination_id]?.name || "Inconnu", destination_id: null, arrival_turn: null, status: "stationed", path: null, start_turn: null });
          batch.set(doc(collection(db, "notifications")), { targetId: fData.owner, type: 'fleet', title: 'Arrivée', message: `La flotte ${fData.name} est arrivée.`, read: false, createdAt: new Date() });
      });

      for (const [key, res] of Object.entries(production)) {
          if (key !== 'neutral' && factions.find(f => f.id === key)) batch.update(doc(db, "factions", key), { credits: increment(res.credits), materials: increment(res.materials), manpower: increment(res.manpower) });
      }
      batch.update(doc(db, "game_state", "global"), { current_turn: increment(1) });
      await batch.commit();
    } catch (e) { console.error(e); } finally { setIsProcessingTurn(false); }
  };

  const toggleFleetSystem = async () => { try { await setDoc(doc(db, "game_state", "global"), { fleets_enabled: !isFleetSystemEnabled }, { merge: true }); } catch (e) { console.error("Erreur toggle fleet:", e); } };
  const jumpToPlanet = (p) => { setViewBox(prev => ({ ...prev, x: p.x - prev.w / 2, y: p.y - prev.h / 2 })); };
  
  const handleFleetActionFromMenu = (fleet, action) => {
    const locationPlanet = planets.find(p => p.id === fleet.location_id);
    if (locationPlanet) { jumpToPlanet(locationPlanet); setSelectedPlanet(locationPlanet); }
    if (action === 'move') { setMovingFleet(fleet); setShowFleetManager(false); }
  };

  const handleFleetMoveConfirm = async (targetPlanet) => {
      if (!movingFleet) return;
      const sourcePlanet = planets.find(p => p.id === movingFleet.location_id);
      if(!sourcePlanet) return;

      const path = findShortestPath(sourcePlanet.id, targetPlanet.id, planets);
      if (!path) { alert("Aucune route hyperspatiale connue vers cette destination."); setMovingFleet(null); return; }

      let totalDistance = 0;
      for (let i = 0; i < path.length - 1; i++) {
          const p1 = planets.find(p => p.id === path[i]);
          const p2 = planets.find(p => p.id === path[i+1]);
          if (p1 && p2) totalDistance += Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      }

      const turns = Math.max(1, Math.ceil(totalDistance / FLEET_SPEED));

      if (confirm(`Trajet vers ${targetPlanet.name} :\n- Distance : ${Math.round(totalDistance)} parsecs\n- Durée : ${turns} tours\n\nConfirmer l'ordre ?`)) {
          await updateDoc(doc(db, "fleets", movingFleet.id), { destination_id: targetPlanet.id, arrival_turn: currentTurn + turns, status: 'moving', path: path, start_turn: currentTurn });
          setMovingFleet(null);
      } else setMovingFleet(null);
  };

  const handleMapClick = (e) => {
      if(isDragging) return;
      if (isEditorMode) {
          const r = svgRef.current.getBoundingClientRect();
          const x = viewBox.x + (e.clientX - r.left) * (viewBox.w / r.width);
          const y = viewBox.y + (e.clientY - r.top) * (viewBox.h / r.height);
          setNewPlanetCoords({x: Math.round(x), y: Math.round(y)}); setShowCreateModal(true); return;
      }
      setSelectedPlanet(null); setShowBuildMenu(false); setShowAssignMenu(false);
  };

  const handleWheel = (e) => {
      e.preventDefault();
      const r = svgRef.current.getBoundingClientRect();
      const mx = e.clientX - r.left; const my = e.clientY - r.top;
      const worldX = viewBox.x + (mx / r.width) * viewBox.w; const worldY = viewBox.y + (my / r.height) * viewBox.h;
      const s = e.deltaY > 0 ? 1.1 : 0.9;
      const newW = Math.max(200, Math.min(25000, viewBox.w * s)); const newH = Math.max(125, Math.min(25000, viewBox.h * s));
      const newX = worldX - (mx / r.width) * newW; const newY = worldY - (my / r.height) * newH;
      setViewBox({ x: newX, y: newY, w: newW, h: newH });
  };

  const handlePlanetClick = (e, p) => { 
      e.stopPropagation(); if(isDragging) return; 
      if(isEditorMode) { if(editorLinkSource) { if(p.id===editorLinkSource.id) { setEditorLinkSource(null); return; } updateDoc(doc(db, "provinces", editorLinkSource.id), { connected_to: arrayUnion(p.id) }); updateDoc(doc(db, "provinces", p.id), { connected_to: arrayUnion(editorLinkSource.id) }); setEditorLinkSource(null); return; } setEditingPlanet(p); setShowEditModal(true); return; } 
      if (movingFleet) { handleFleetMoveConfirm(p); return; }
      
      setSelectedPlanet(p); 
      onSnapshot(query(collection(db, `provinces/${p.id}/constructions`)), (s) => setPlanetBuildings(s.docs.map(d => ({id: d.id, ...d.data()})))); 
  };

  // --- ACTIONS ÉDITEUR ---
  const handleCreateFaction = async (e) => { 
      e.preventDefault(); 
      const d = new FormData(e.target); 
      try { 
          await addDoc(collection(db, "factions"), { 
              name: d.get('name'), 
              color: d.get('color'), 
              image: d.get('image'),
              diplomatic_phrases: {
                  war: d.get('phrase_war'),
                  alliance: d.get('phrase_alliance'),
                  neutral_good: d.get('phrase_good'),
                  neutral_bad: d.get('phrase_bad')
              },
              type: 'minor', 
              credits: 1000, 
              materials: 500, 
              manpower: 100 
          }); 
          e.target.reset(); 
      } catch (err) { console.error(err); } 
  };

  const handleUpdateFaction = async (e) => {
      e.preventDefault();
      if (!editingFaction) return;
      const d = new FormData(e.target);
      try {
          await updateDoc(doc(db, "factions", editingFaction.id), {
              name: d.get('name'),
              color: d.get('color'),
              image: d.get('image'),
              diplomatic_phrases: {
                  war: d.get('phrase_war'),
                  alliance: d.get('phrase_alliance'),
                  neutral_good: d.get('phrase_good'),
                  neutral_bad: d.get('phrase_bad')
              }
          });
          setEditingFaction(null); 
          e.target.reset();
      } catch (err) { console.error(err); }
  };

  const handleCreateBuilding = async (e) => { e.preventDefault(); const d = new FormData(e.target); const bData = { name: d.get('level_1_name'), description: d.get('description'), allowed_types: d.getAll('allowed_types'), allowed_factions: d.getAll('allowed_factions'), max_levels: maxLevels, turns_required: Number(d.get('level_1_turns')), cost: Number(d.get('level_1_cost_credits')), cost_materials: Number(d.get('level_1_cost_materials')), production: { credits: Number(d.get('level_1_prod_credits')) || 0, materials: Number(d.get('level_1_prod_materials')) || 0, manpower: Number(d.get('level_1_prod_manpower')) || 0 }, maintenance: { credits: Number(d.get('level_1_maint_credits')) || 0, materials: Number(d.get('level_1_maint_materials')) || 0, manpower: Number(d.get('level_1_maint_manpower')) || 0 }, upgrades: [] }; for (let i = 2; i <= maxLevels; i++) { bData.upgrades.push({ level: i, name: d.get(`level_${i}_name`), turns_required: Number(d.get(`level_${i}_turns`)), cost: Number(d.get(`level_${i}_cost_credits`)), cost_materials: Number(d.get(`level_${i}_cost_materials`)), production: { credits: Number(d.get(`level_${i}_prod_credits`)) || 0, materials: Number(d.get(`level_${i}_prod_materials`)) || 0, manpower: Number(d.get(`level_${i}_prod_manpower`)) || 0 }, maintenance: { credits: Number(d.get(`level_${i}_maint_credits`)) || 0, materials: Number(d.get(`level_${i}_maint_materials`)) || 0, manpower: Number(d.get(`level_${i}_maint_manpower`)) || 0 } }); } try { await addDoc(collection(db, "buildings"), bData); e.target.reset(); setMaxLevels(1); alert("Plan sauvegardé !"); } catch (err) { console.error(err); } };
  const handleCreatePlanet = async (e) => { e.preventDefault(); const d = new FormData(e.target); try { await addDoc(collection(db, "provinces"), { name: d.get('name'), region: d.get('region'), owner: d.get('owner'), planet_type: d.get('type'), color: getFactionColor(d.get('owner')), x: newPlanetCoords.x, y: newPlanetCoords.y, connected_to: [], population: Number(d.get('population')) || 0, base_production: { credits: Number(d.get('prod_credits')) || 0, materials: Number(d.get('prod_materials')) || 0 } }); setShowCreateModal(false); } catch (err) { console.error(err); } };
  const handleUpdatePlanet = async (e) => { e.preventDefault(); if (!editingPlanet) return; const d = new FormData(e.target); try { await updateDoc(doc(db, "provinces", editingPlanet.id), { name: d.get('name'), region: d.get('region'), planet_type: d.get('planet_type'), owner: d.get('owner'), color: d.get('color'), population: Number(d.get('population')) || 0, base_production: { credits: Number(d.get('prod_credits')) || 0, materials: Number(d.get('prod_materials')) || 0 } }); setShowEditModal(false); } catch (err) { console.error(err); } };
  const handleDeletePlanet = async () => { if(!editingPlanet || !confirm("Supprimer la planète et ses routes ?")) return; const batch = writeBatch(db); batch.delete(doc(db, "provinces", editingPlanet.id)); const neighbors = planets.filter(p => p.connected_to?.includes(editingPlanet.id)); neighbors.forEach(n => { batch.update(doc(db, "provinces", n.id), { connected_to: arrayRemove(editingPlanet.id) }); }); await batch.commit(); setShowEditModal(false); };
  const startLinking = () => { setEditorLinkSource(editingPlanet); setShowEditModal(false); };
  const removeRoute = async (tid) => { await updateDoc(doc(db, "provinces", editingPlanet.id), { connected_to: arrayRemove(tid) }); await updateDoc(doc(db, "provinces", tid), { connected_to: arrayRemove(editingPlanet.id) }); };
  
  const handleConstruct = async (template) => { 
      if (!canBuild) { alert("Accès refusé : Vous n'êtes pas Gouverneur de ce secteur."); return; }
      const costCr = template.cost || 0; 
      const costMat = template.cost_materials || 0; 
      if (factionData.credits < costCr || factionData.materials < costMat) return alert("Ressources insuffisantes"); 
      try { await addDoc(collection(db, `provinces/${selectedPlanet.id}/constructions`), { name: template.name, template_id: template.id, level: 1, started_at_turn: currentTurn, finish_turn: currentTurn + template.turns_required, cost: costCr, cost_materials: costMat, production: template.production || {}, maintenance: template.maintenance || {} }); await updateDoc(doc(db, "factions", userFaction), { credits: increment(-costCr), materials: increment(-costMat) }); setShowBuildMenu(false); } catch (e) { console.error(e); } 
  };
  
  const handleUpgrade = async (building) => { 
      if (!canBuild) return; 
      const template = buildingsTemplates.find(t => t.id === building.template_id); 
      const nextLevel = template?.upgrades?.find(u => u.level === (building.level || 1) + 1); 
      if (!nextLevel) return; 
      const costCr = nextLevel.cost || 0; 
      const costMat = nextLevel.cost_materials || 0; 
      if (factionData.credits < costCr || factionData.materials < costMat) return alert(`Ressources insuffisantes`); 
      if (!confirm(`Améliorer ?`)) return; 
      try { await updateDoc(doc(db, `provinces/${selectedPlanet.id}/constructions`, building.id), { name: nextLevel.name, level: nextLevel.level, started_at_turn: currentTurn, finish_turn: currentTurn + nextLevel.turns_required, cost: costCr, cost_materials: costMat, production: nextLevel.production || {}, maintenance: nextLevel.maintenance || {} }); await updateDoc(doc(db, "factions", userFaction), { credits: increment(-costCr), materials: increment(-costMat) }); } catch (e) { console.error(e); } 
  };
  
  const handleDemolish = async (building) => { 
      if (!canBuild) return;
      if (!confirm(`Démolir ?`)) return; 
      try { await deleteDoc(doc(db, `provinces/${selectedPlanet.id}/constructions`, building.id)); await updateDoc(doc(db, "factions", userFaction), { credits: increment((building.cost||0)*0.5), materials: increment((building.cost_materials||0)*0.5) }); } catch (e) { console.error(e); } 
  };
  
  const handleCancel = async (building) => { 
      if (!canBuild) return;
      if (!confirm("Annuler ?")) return; 
      try { await deleteDoc(doc(db, `provinces/${selectedPlanet.id}/constructions`, building.id)); await updateDoc(doc(db, "factions", userFaction), { credits: increment(building.cost||0), materials: increment(building.cost_materials||0) }); } catch (e) { console.error(e); } 
  };
  
  const fetchFactionMembers = async () => { 
      if (isAdmin) {
          const snap = await getDocs(collection(db, "users"));
          setFactionMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          return;
      }
      if (!userFaction) return; 
      const snap = await getDocs(query(collection(db, "users"), where("faction_id", "==", userFaction))); 
      setFactionMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
  };

  const handleAssignGovernor = async (member) => { if (confirm(`Nommer ${member.pseudo} ?`)) { await updateDoc(doc(db, "provinces", selectedPlanet.id), { governor_id: member.id, governor_name: member.pseudo }); setSelectedPlanet(p => ({ ...p, governor_id: member.id, governor_name: member.pseudo })); setShowAssignMenu(false); } };

  const maxSlotsDefined = activePlanet ? (PLANET_SLOTS_CONFIG[activePlanet.planet_type] || 4) : 0;
  const planetSlots = Array(maxSlotsDefined).fill(null).map((_, i) => planetBuildings[i] || null);

  return (
    <div className={`flex flex-col h-screen w-screen fixed inset-0 overflow-hidden bg-black select-none font-sans ${movingFleet ? 'cursor-crosshair' : ''}`}>
      


      <div className="flex-grow flex relative overflow-hidden z-0 bg-black">
         {/* SIDEBAR EDITEUR (Modifiée pour les phrases) */}
         {isEditorMode && (
          <div className="absolute top-0 left-0 bottom-0 w-64 bg-gray-900 border-r border-gray-700 flex flex-col z-[60] shadow-2xl opacity-95">
              <div className="p-3 border-b border-gray-800 bg-gray-900 space-y-2">
                  <div className="flex justify-between items-center"><h3 className="text-yellow-500 font-bold uppercase text-xs tracking-widest">Architecture</h3><button onClick={() => setIsEditorMode(false)} className="text-[10px] text-red-400 border border-red-900 px-1 rounded hover:bg-red-900">Fermer</button></div>
                  <button onClick={() => setShowFactionManager(true)} className="w-full bg-purple-900/30 border border-purple-800 text-purple-300 text-[10px] py-1 rounded font-bold uppercase">⚡ Gérer Factions</button>
                  <button onClick={() => setShowBuildingManager(true)} className="w-full bg-blue-900/30 border border-blue-800 text-blue-300 text-[10px] py-1 rounded font-bold uppercase">🏗️ Gérer Bâtiments</button>
                  <input type="text" placeholder="Filtrer..." className="w-full bg-black border border-gray-700 text-white text-[10px] p-2 rounded outline-none" onChange={(e) => setSearchTerm(e.target.value)}/>
              </div>
              <div className="flex-grow overflow-y-auto custom-scrollbar">
                  {planets.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                      <div key={p.id} className="p-2 border-b border-gray-800 hover:bg-gray-800 flex justify-between items-center group cursor-pointer" onClick={() => jumpToPlanet(p)}>
                          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || '#fff' }}></div><div className="text-xs text-gray-300">{p.name}</div></div>
                          <button onClick={(e) => { e.stopPropagation(); setEditingPlanet(p); setShowEditModal(true); }} className="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">✎</button>
                      </div>
                  ))}
              </div>
          </div>
         )}

         {/* BOUTONS FLOTTANTS */}
         <div className="absolute bottom-4 left-4 z-50 flex flex-col gap-2 pointer-events-auto">
             {!isEditorMode && isArchitect && (<button onClick={() => setIsEditorMode(true)} className="px-3 py-1 rounded font-bold uppercase text-xs tracking-widest border bg-gray-900 text-purple-400 border-purple-900 hover:bg-purple-900 hover:text-white transition shadow-xl">○ Éditeur</button>)}
             {!isEditorMode && isHighCommand && (<button onClick={() => setShowCouncil(true)} className="bg-gray-900 text-[#cba660] w-10 h-10 rounded-lg border border-[#cba660] hover:bg-[#cba660] hover:text-black transition shadow-lg flex items-center justify-center text-xl shadow-[0_0_20px_black]">👑</button>)}
             {!isEditorMode && isDiplomat && (<button onClick={() => setShowDiplomacy(true)} className="bg-[#8B5A2B] text-white w-10 h-10 rounded-lg border border-[#e5c07b] hover:bg-[#a67c52] transition shadow-lg flex items-center justify-center text-xl">⚖️</button>)}
             {!isEditorMode && canAccessFleets && (<button onClick={() => setShowFleetManager(true)} className="bg-green-900 text-white w-10 h-10 rounded-lg border border-green-500 hover:bg-green-700 transition shadow-lg flex items-center justify-center text-xl shadow-[0_0_20px_black]">⚓</button>)}
             
             {!isEditorMode && isArchitect && (
                 <button onClick={() => setShowSettingsModal(true)} className="w-10 h-10 rounded-lg border bg-gray-800 text-gray-400 border-gray-600 transition shadow-lg flex items-center justify-center text-xl hover:bg-gray-700 hover:text-white" title="Paramètres de Jeu">⚙️</button>
             )}
         </div>

         {/* BANNIÈRE D'ORDRE DE MOUVEMENT */}
         {movingFleet && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-yellow-900/90 text-white px-6 py-2 rounded-full border border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.5)] animate-pulse flex items-center gap-3 pointer-events-none">
                <span className="text-xl">⚓</span>
                <div><div className="text-[10px] font-bold uppercase text-yellow-200">Ordre en cours pour</div><div className="font-bold font-mono text-sm">{movingFleet.name}</div></div>
                <div className="text-[10px] text-gray-300 ml-2">➜ Sélectionnez une destination</div>
            </div>
         )}

 

         <svg ref={svgRef} viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`} className="w-full h-full cursor-move" preserveAspectRatio="xMidYMid slice" onWheel={handleWheel} onMouseDown={(e) => { if(e.button===0||e.button===1){ setIsDragging(true); setDragStart({x:e.clientX, y:e.clientY}); } }} onMouseMove={(e) => { if(isDragging){ const r=svgRef.current.getBoundingClientRect(); setViewBox(p=>({ ...p, x:p.x-(e.clientX-dragStart.x)*(p.w/r.width), y:p.y-(e.clientY-dragStart.y)*(p.h/r.height) })); setDragStart({x:e.clientX, y:e.clientY}); } }} onMouseUp={() => setIsDragging(false)} onMouseLeave={() => setIsDragging(false)} onClick={handleMapClick}>
            <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/></pattern>
                <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" /></filter>
            </defs>
            <image href="/background.jpg" x="-5000" y="-5000" width="10000" height="10000" preserveAspectRatio="none" opacity="0.4" />
            <rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#grid)" />

            <BorderLayer planets={planets} factions={factions} />

            <g className="opacity-80">
                {planets.flatMap(p => (p.connected_to||[]).map(tid => {
                    const t = planets.find(pl=>pl.id===tid);
                    if(!t || p.id > t.id) return null;
                    return (
                        <g key={`route-${p.id}-${t.id}`}>
                            <line x1={p.x} y1={p.y} x2={t.x} y2={t.y} stroke="#444444" strokeWidth="4" opacity="0.5" strokeLinecap="round" />
                            <line x1={p.x} y1={p.y} x2={t.x} y2={t.y} stroke="#000000" strokeWidth="2" strokeLinecap="round" />
                        </g>
                    );
                }))}
            </g>

            {shouldShowFleets && fleets.filter(f => f.status === 'moving' && f.path).map(f => {
                const currentPos = getFleetPosition(f, planets, currentTurn);
                if (!currentPos) return null;
                const pathPoints = f.path.map(id => { const p = planets.find(pl => pl.id === id); return p ? `${p.x},${p.y}` : null; }).filter(Boolean).join(' ');

                return (
                    <g key={f.id}>
                        <polyline points={pathPoints} fill="none" stroke="cyan" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.6" />
                        <g transform={`translate(${currentPos.x}, ${currentPos.y})`} className="animate-pulse">
                            <polygon points="0,-10 8,6 0,2 -8,6" fill="cyan" stroke="black" strokeWidth="1" />
                            <text y="-15" fill="cyan" fontSize="8" textAnchor="middle" fontWeight="bold">{f.name}</text>
                        </g>
                    </g>
                );
            })}

            {planets.map((p) => {
                const f = factions.find(fact => fact.id === p.owner);
                const orbitFleets = fleets.filter(fl => fl.location_id === p.id && fl.status === 'stationed');
                return (
                    <g key={p.id} className="cursor-pointer" onClick={(e) => handlePlanetClick(e, p)} opacity={activePlanet?.id === p.id ? 1 : 0.8}>
                        {shouldShowFleets && orbitFleets.length > 0 && (
                            <g>
                                <circle cx={p.x} cy={p.y} r="25" stroke="cyan" strokeWidth="1" fill="none" strokeDasharray="4,2" className="animate-spin-slow" />
                                <circle cx={p.x + 18} cy={p.y - 18} r="7" fill="#0f172a" stroke="cyan" />
                                <text x={p.x + 18} y={p.y - 15} textAnchor="middle" fontSize="7" fill="cyan" fontWeight="bold">⚓{orbitFleets.length}</text>
                            </g>
                        )}
                        <circle cx={p.x} cy={p.y} r="30" fill="transparent" />
                        {activePlanet?.id === p.id && <circle cx={p.x} cy={p.y} r="28" stroke="white" strokeWidth="1" fill="none" className="animate-spin-slow" strokeDasharray="6,4" />}
                        <circle cx={p.x} cy={p.y} r="15" fill={f?.color || '#9ca3af'} fillOpacity="0.15" />
                        <circle cx={p.x} cy={p.y} r="6" fill={f?.color || '#9ca3af'} stroke="rgba(0,0,0,0.5)" strokeWidth="2" />
                        {p.governor_id && <text x={p.x + 10} y={p.y - 10} fontSize="10">👑</text>}
                        <text x={p.x} y={p.y + 25} fill="#9ca3af" fontSize="10" textAnchor="middle" className="font-mono uppercase font-bold drop-shadow-md">{p.name}</text>
                    </g>
                );
            })}
         </svg>
      </div>

      {!isEditorMode && activePlanet && (
          <PlanetDock 
            selectedPlanet={activePlanet} isTerritoryOwned={isTerritoryOwned} canBuild={canBuild} slots={planetSlots} buildingsTemplates={buildingsTemplates} currentTurn={currentTurn} setShowBuildMenu={setShowBuildMenu} handleUpgrade={handleUpgrade} handleDemolish={handleDemolish} handleCancel={handleCancel} showAssignMenu={showAssignMenu} setShowAssignMenu={(v)=>{setShowAssignMenu(v); if(v)fetchFactionMembers();}} factionMembers={factionMembers} handleAssignGovernor={handleAssignGovernor} isHighCommand={isHighCommand} 
          />
      )}

      {showCouncil && (<CouncilManager userFaction={userFaction} onClose={()=>setShowCouncil(false)} />)}
      {showFleetManager && ( <FleetManager userFaction={userFaction} fleets={fleets} planets={planets} currentTurn={currentTurn} onSelectFleet={handleFleetActionFromMenu} onClose={() => setShowFleetManager(false)} /> )}
      {showDiplomacy && (<DiplomacyScreen userFaction={userFaction} onClose={()=>setShowDiplomacy(false)} />)}
      {showBuildMenu && canBuild && (<BuildMenuOverlay buildingsTemplates={buildingsTemplates} factionData={factionData} selectedPlanet={activePlanet} handleConstruct={handleConstruct} onClose={()=>setShowBuildMenu(false)} userFaction={userFaction} />)}

      {/* EDITEUR : GESTION DES FACTIONS (MODIFIÉ POUR PHRASES ET UPDATE) */}
      {showFactionManager && isEditorMode && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 border-2 border-purple-600 p-6 z-[100] w-[500px] max-h-[85vh] flex flex-col shadow-2xl">
              <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                  <h3 className="text-purple-400 font-bold uppercase">{editingFaction ? 'Modifier Faction' : 'Gérer Factions'}</h3>
                  <button onClick={() => { setShowFactionManager(false); setEditingFaction(null); }} className="text-white hover:text-red-500">X</button>
              </div>
              
              {/* FORMULAIRE UNIQUE (CRÉATION / MODIFICATION) */}
              <form 
                  key={editingFaction ? editingFaction.id : 'new'} 
                  onSubmit={editingFaction ? handleUpdateFaction : handleCreateFaction} 
                  className="flex flex-col gap-3 mb-4 p-4 bg-black/40 rounded border border-gray-800 overflow-y-auto custom-scrollbar flex-grow"
              >
                  <span className="text-[10px] text-gray-400 uppercase font-bold">{editingFaction ? `Modifier ${editingFaction.name}` : 'Nouvelle Faction'}</span>
                  <input name="name" defaultValue={editingFaction?.name || ''} placeholder="Nom (ex: Clan Hutt)" className="bg-black border border-gray-700 p-1 text-xs text-white" required />
                  <input name="image" defaultValue={editingFaction?.image || ''} placeholder="URL Image (Logo)" className="bg-black border border-gray-700 p-1 text-xs text-white" />
                  
                  {/* PHRASES DIPLOMATIQUES AVEC TEXTAREA */}
                  <div className="space-y-2 border-t border-gray-800 pt-2">
                      <span className="text-[10px] text-[#e5c07b] uppercase font-bold tracking-wider flex items-center gap-2"><span>💬</span> Protocoles de Communication</span>
                      <div className="grid grid-cols-1 gap-3">
                          <div><label className="text-[9px] text-red-400 uppercase font-bold">Déclaration de Guerre</label><textarea name="phrase_war" defaultValue={editingFaction?.diplomatic_phrases?.war || ''} placeholder="Ex: Vos mondes brûleront pour cet affront." className="w-full h-16 bg-red-950/20 border border-red-900/50 p-2 text-[10px] text-red-100 focus:border-red-500 outline-none resize-none font-serif italic" /></div>
                          <div><label className="text-[9px] text-green-400 uppercase font-bold">Proposition d'Alliance</label><textarea name="phrase_alliance" defaultValue={editingFaction?.diplomatic_phrases?.alliance || ''} placeholder="Ex: Unissons nos forces pour dominer la galaxie." className="w-full h-16 bg-green-950/20 border border-green-900/50 p-2 text-[10px] text-green-100 focus:border-green-500 outline-none resize-none font-serif italic" /></div>
                          <div className="grid grid-cols-2 gap-2">
                              <div><label className="text-[9px] text-blue-400 uppercase font-bold">Salutation Amicale</label><textarea name="phrase_good" defaultValue={editingFaction?.diplomatic_phrases?.neutral_good || ''} placeholder="Ex: Soyez les bienvenus." className="w-full h-12 bg-blue-950/20 border border-blue-900/50 p-2 text-[10px] text-blue-100 focus:border-blue-500 outline-none resize-none font-serif italic" /></div>
                              <div><label className="text-[9px] text-yellow-500 uppercase font-bold">Avertissement</label><textarea name="phrase_bad" defaultValue={editingFaction?.diplomatic_phrases?.neutral_bad || ''} placeholder="Ex: Circulez, étranger." className="w-full h-12 bg-yellow-950/20 border border-yellow-900/50 p-2 text-[10px] text-yellow-100 focus:border-yellow-500 outline-none resize-none font-serif italic" /></div>
                          </div>
                      </div>
                  </div>

                  <div className="flex gap-2 mt-2">
                      <input name="color" type="color" className="h-8 w-10 cursor-pointer bg-transparent" defaultValue={editingFaction?.color || "#00ff00"} />
                      <button type="submit" className={`flex-grow text-white text-[10px] font-bold uppercase rounded ${editingFaction ? 'bg-yellow-700 hover:bg-yellow-600' : 'bg-green-900 hover:bg-green-700'}`}>
                          {editingFaction ? "Sauvegarder" : "Créer"}
                      </button>
                      {editingFaction && (
                          <button type="button" onClick={() => setEditingFaction(null)} className="bg-gray-700 hover:bg-gray-600 text-white px-2 rounded text-[10px]">
                              Annuler
                          </button>
                      )}
                  </div>
              </form>

              <div className="overflow-y-auto space-y-1">
                  {factions.map(f => (
                      <div key={f.id} className={`flex justify-between items-center p-2 border border-gray-800 ${editingFaction?.id === f.id ? 'bg-yellow-900/20 border-yellow-600' : 'bg-black'}`}>
                          <div className="flex items-center gap-2">
                              {f.image && <img src={f.image} alt={f.name} className="w-6 h-6 object-cover rounded-full border border-gray-600" />}
                              <span className="text-xs font-bold" style={{color: f.color}}>{f.name}</span>
                          </div>
                          <div className="flex gap-2">
                              <button onClick={() => setEditingFaction(f)} className="text-yellow-500 text-[10px] hover:text-white" title="Modifier">✎</button>
                              {f.id !== 'neutral' && f.id !== 'empire' && f.id !== 'republic' && (
                                  <button onClick={async()=> { if(confirm("Supprimer définitivement ?")) await deleteDoc(doc(db,"factions",f.id)); }} className="text-red-500 text-[10px] hover:text-red-300" title="Supprimer">🗑️</button>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {showBuildingManager && isEditorMode && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 border-2 border-blue-600 p-6 z-[100] w-[600px] max-h-[90vh] flex flex-col shadow-2xl">
              <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2"><h3 className="text-blue-400 font-bold uppercase">Architecte de Plans</h3><button onClick={()=>setShowBuildingManager(false)} className="text-white hover:text-red-500">X</button></div>
              <form onSubmit={handleCreateBuilding} className="flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-2 mb-4 bg-black/40 p-4 rounded">
                  <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2"><label className="text-[10px] text-gray-500 uppercase block">Description</label><input name="description" className="w-full bg-black border border-gray-700 p-1 text-xs text-white" /></div>
                      <div className="col-span-2"><label className="text-[10px] text-gray-500 uppercase block mb-1">Autorisations Planétaires</label><div className="flex gap-3 flex-wrap text-[10px] text-gray-300">{['standard', 'industrial', 'capital', 'force_nexus'].map(t => (<label key={t} className="flex items-center gap-1 cursor-pointer"><input type="checkbox" name="allowed_types" value={t} /> {t}</label>))}</div></div>
                      <div className="col-span-2 flex items-center gap-2"><label className="text-[10px] text-gray-500 uppercase">Nombre de Niveaux :</label><select value={maxLevels} onChange={(e) => setMaxLevels(parseInt(e.target.value))} className="bg-black border border-blue-800 text-blue-400 text-xs p-1 rounded">{[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}</select></div>
                  </div>
                  <div className="flex gap-1 border-b border-gray-700 mb-2">{Array.from({length: maxLevels}, (_, i) => i + 1).map(level => (<button key={level} type="button" onClick={() => setCurrentLevelTab(level)} className={`px-3 py-1 text-[10px] font-bold uppercase rounded-t ${currentLevelTab === level ? 'bg-blue-900 text-white' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'}`}>Nv {level}</button>))}</div>
                  {Array.from({length: maxLevels}, (_, i) => i + 1).map(level => (
                    <div key={level} className={currentLevelTab === level ? 'block space-y-3 p-2 border border-gray-800 rounded bg-black/20' : 'hidden'}>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="col-span-2"><label className="text-[10px] text-gray-400 uppercase">Nom du Bâtiment (Niveau {level})</label><input name={`level_${level}_name`} className="w-full bg-black border border-gray-700 p-1 text-xs text-white" required /></div>
                            <div><label className="text-[10px] text-gray-400 uppercase">Temps (Tours)</label><input type="number" name={`level_${level}_turns`} defaultValue={1} className="w-full bg-black border border-gray-700 p-1 text-xs text-white" required /></div>
                            <div><label className="text-[10px] text-gray-400 uppercase">Coût (Crédits)</label><input type="number" name={`level_${level}_cost_credits`} defaultValue={100} className="w-full bg-black border border-gray-700 p-1 text-xs text-white" required /></div>
                            <div><label className="text-[10px] text-gray-400 uppercase">Coût (Matériaux)</label><input type="number" name={`level_${level}_cost_materials`} defaultValue={0} className="w-full bg-black border border-gray-700 p-1 text-xs text-white" /></div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 border-t border-gray-800 pt-2"><div className="col-span-3 text-[10px] text-green-500 font-bold uppercase">Production (Gain / Tour)</div><input type="number" name={`level_${level}_prod_credits`} placeholder="CR" className="bg-black border border-green-900 p-1 text-[10px] text-white" /><input type="number" name={`level_${level}_prod_materials`} placeholder="MAT" className="bg-black border border-green-900 p-1 text-[10px] text-white" /><input type="number" name={`level_${level}_prod_manpower`} placeholder="HOM" className="bg-black border border-green-900 p-1 text-[10px] text-white" /></div>
                        <div className="grid grid-cols-3 gap-2 border-t border-gray-800 pt-2"><div className="col-span-3 text-[10px] text-red-500 font-bold uppercase">Maintenance (Coût / Tour)</div><input type="number" name={`level_${level}_maint_credits`} placeholder="CR" className="bg-black border border-red-900 p-1 text-[10px] text-white" /><input type="number" name={`level_${level}_maint_materials`} placeholder="MAT" className="bg-black border border-red-900 p-1 text-[10px] text-white" /><input type="number" name={`level_${level}_maint_manpower`} placeholder="HOM" className="bg-black border border-red-900 p-1 text-[10px] text-white" /></div>
                    </div>
                  ))}
                  <button type="submit" className="bg-blue-900 hover:bg-blue-700 text-white text-xs font-bold py-2 uppercase tracking-widest border border-blue-700">Sauvegarder le Plan Complet</button>
              </form>
              <div className="overflow-y-auto space-y-1 h-32 border-t border-gray-700 pt-2">{buildingsTemplates.map(b => (<div key={b.id} className="flex justify-between items-center p-2 bg-black border border-gray-800 text-[10px] text-white group"><span>{b.name} ({b.max_levels} Nv)</span><button onClick={async()=>await deleteDoc(doc(db,"buildings",b.id))} className="text-red-500 opacity-0 group-hover:opacity-100">🗑️</button></div>))}</div>
          </div>
      )}
    </div>
  );
}