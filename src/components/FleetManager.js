"use client";

import { useState } from 'react';

// Icônes simples pour l'interface
const Icons = {
    Ship: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v18H3V3zm16 16V5H5v14h14zM7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z"/></svg>,
    Move: () => <svg className="w-3 h-3 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>,
    Anchor: () => <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>,
    Focus: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
};

export default function FleetManager({ userFaction, fleets, planets, onSelectFleet, onClose, currentTurn }) {
    // Filtrer uniquement les flottes de ma faction
    const myFleets = fleets.filter(f => f.owner === userFaction);

    return (
        <div className="fixed right-0 top-0 bottom-0 w-80 bg-gray-900/95 border-l border-yellow-600/50 shadow-2xl z-[80] flex flex-col backdrop-blur-md animate-in slide-in-from-right duration-300">
            
            {/* --- HEADER --- */}
            <div className="p-4 border-b border-gray-700 bg-black/40 flex justify-between items-center">
                <div className="flex items-center gap-2 text-yellow-500">
                    <span className="text-xl">⚓</span>
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest font-serif">Commandement</h3>
                        <p className="text-[9px] text-gray-500 uppercase tracking-wide">Gestion Navale</p>
                    </div>
                </div>
                <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">✕</button>
            </div>

            {/* --- LISTE DES FLOTTES --- */}
            <div className="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {myFleets.length === 0 ? (
                    <div className="text-center text-gray-500 text-xs italic mt-10 p-4 border border-dashed border-gray-800 rounded">
                        Aucune flotte détectée sous votre commandement.
                    </div>
                ) : (
                    myFleets.map(fleet => {
                        const isMoving = fleet.status === 'moving';
                        const locationName = planets.find(p => p.id === fleet.location_id)?.name || "Espace Profond";
                        const destinationName = isMoving ? (planets.find(p => p.id === fleet.destination_id)?.name || "Inconnu") : null;
                        
                        return (
                            <div key={fleet.id} className="bg-black/40 border border-gray-700 p-3 rounded hover:border-yellow-600/50 transition-colors group relative">
                                {/* Fond actif si sélectionné (optionnel) */}
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${isMoving ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
                                        <span className="text-sm font-bold text-white uppercase font-mono">{fleet.name}</span>
                                    </div>
                                    <span className="text-[9px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded border border-gray-600">
                                        {isMoving ? 'EN TRANSIT' : 'EN ORBITE'}
                                    </span>
                                </div>

                                <div className="text-xs text-gray-400 space-y-1 font-mono mb-3 pl-4 border-l border-gray-800">
                                    <div className="flex justify-between">
                                        <span>Position:</span>
                                        <span className="text-white">{locationName}</span>
                                    </div>
                                    {isMoving && (
                                        <>
                                            <div className="flex justify-between text-blue-300">
                                                <span className="flex items-center gap-1"><Icons.Move/> Vers:</span>
                                                <span>{destinationName}</span>
                                            </div>
                                            <div className="flex justify-between text-yellow-500">
                                                <span>Arrivée:</span>
                                                <span>Tour {fleet.arrival_turn} ({fleet.arrival_turn - currentTurn} trs)</span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 mt-2 pt-2 border-t border-gray-800/50">
                                    <button 
                                        onClick={() => onSelectFleet(fleet, 'focus')}
                                        className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-[10px] py-1.5 px-2 rounded uppercase font-bold flex items-center justify-center gap-1 transition-colors"
                                        title="Centrer la caméra"
                                    >
                                        <Icons.Focus /> Voir
                                    </button>
                                    
                                    {!isMoving && (
                                        <button 
                                            onClick={() => onSelectFleet(fleet, 'move')}
                                            className="flex-1 bg-yellow-700 hover:bg-yellow-600 text-white text-[10px] py-1.5 px-2 rounded uppercase font-bold flex items-center justify-center gap-1 transition-colors shadow-lg"
                                            title="Donner un ordre de mouvement"
                                        >
                                            <Icons.Move /> Ordre
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* --- FOOTER INFO --- */}
            <div className="p-3 bg-black/60 border-t border-gray-800 text-[9px] text-gray-500 font-mono text-center">
                FLOTTE TOTALE: {myFleets.length} UNITÉS
            </div>
        </div>
    );
}