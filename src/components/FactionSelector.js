"use client";

import { useState } from 'react';
import { db } from '../app/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

// --- DONNÉES DES FACTIONS ---
const FACTIONS = [
  {
    id: 'republic',
    name: 'République Galactique',
    color: 'blue',
    bgImage: '/images/republic_bg.jpg', 
    icon: (
      <svg className="w-12 h-12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L1 22h22L12 2zm0 3.5l8.5 15.5h-17L12 5.5zM12 8a1 1 0 100 2 1 1 0 000-2z" />
      </svg>
    ),
    desc: "Défenseurs de la paix et de la démocratie. Ordre, Justice et Lumière.",
    // Styles
    bg: "bg-blue-950/40",
    border: "border-blue-500",
    glow: "shadow-blue-500/50",
    text: "text-blue-400",
    hoverStyle: "hover:border-blue-500/60 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:bg-blue-900/10",
    overlayColor: "from-blue-400/30 to-blue-950/60"
  },
  {
    id: 'empire',
    name: 'Empire Sith',
    color: 'red',
    bgImage: '/images/empire_bg.jpg',
    icon: (
      <svg className="w-12 h-12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l-5 9h10l-5-9zm0 2.5l2.5 4.5h-5L12 4.5zM7 13l-5 9h10l-5-9zm5 0l-5 9h10l-5-9zm5 0l-5 9h10l-5-9z" />
      </svg>
    ),
    desc: "La paix est un mensonge. Il n'y a que la passion. Force, Pouvoir et Conquête.",
    // Styles
    bg: "bg-red-950/40",
    border: "border-red-600",
    glow: "shadow-red-600/50",
    text: "text-red-500",
    hoverStyle: "hover:border-red-600/60 hover:shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:bg-red-900/10",
    overlayColor: "from-red-400/30 to-red-950/60"
  },
  {
    id: 'neutral',
    name: 'Systèmes Indépendants',
    color: 'yellow',
    bgImage: '/images/neutral_bg.jpg',
    icon: (
      <svg className="w-12 h-12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM11 7h2v6h-2zm0 8h2v2h-2z" />
      </svg>
    ),
    desc: "Syndicats, Guildes et Mercenaires. Le profit et la liberté avant tout.",
    // Styles
    bg: "bg-yellow-950/40",
    border: "border-yellow-600",
    glow: "shadow-yellow-600/50",
    text: "text-yellow-500",
    hoverStyle: "hover:border-yellow-500/60 hover:shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:bg-yellow-900/10",
    overlayColor: "from-yellow-400/30 to-yellow-950/60"
  }
];

export default function FactionSelector({ userID, onFactionSelected }) {
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", userID), {
        faction_id: selectedId
      });
      if (onFactionSelected) onFactionSelected();
    } catch (e) {
      console.error("Erreur choix faction:", e);
      setLoading(false);
    }
  };

  const activeBgFaction = hoveredId ? FACTIONS.find(f => f.id === hoveredId) : (selectedId ? FACTIONS.find(f => f.id === selectedId) : null);

  return (
    <div className="w-full flex flex-col items-center relative">
      
      {/* --- ARRIÈRE-PLAN DYNAMIQUE --- */}
      <div className="fixed inset-0 z-0 bg-black transition-colors duration-700 pointer-events-none">
        
        {/* Fond par défaut (Galaxie) */}
        <div className={`absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] transition-opacity duration-700 ${activeBgFaction ? 'opacity-10' : 'opacity-50'}`}></div>
        
        {/* Images de faction */}
        {FACTIONS.map((f) => (
            <div 
                key={`bg-${f.id}`}
                // MODIFICATION ICI : Changement de opacity-90 à opacity-40 pour un fondu léger
                className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ease-in-out
                    ${activeBgFaction?.id === f.id ? 'opacity-40' : 'opacity-0'}
                `}
                style={{ backgroundImage: `url(${f.bgImage})` }}
            >
                {/* Calque de couleur */}
                <div className={`absolute inset-0 bg-gradient-to-t ${f.overlayColor} mix-blend-overlay`}></div>
            </div>
        ))}
      </div>


      {/* --- CONTENU PRINCIPAL (GRILLE + BOUTON) --- */}
      <div className="relative z-10 w-full flex flex-col items-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-8">
            {FACTIONS.map((f) => {
              const isSelected = selectedId === f.id;
              
              return (
                <button
                  key={f.id}
                  onClick={() => setSelectedId(f.id)}
                  onMouseEnter={() => setHoveredId(f.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`relative group flex flex-col items-center text-center p-6 rounded-xl border-2 transition-all duration-300 transform backdrop-blur-sm
                    ${isSelected 
                        ? `${f.bg} ${f.border} scale-105 shadow-[0_0_30px_rgba(0,0,0,0.5)] ${f.glow}` 
                        : `bg-gray-950/50 border-gray-800 ${f.hoverStyle}`
                    }
                  `}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"></div>

                  <div className={`mb-4 transition-colors duration-300 ${isSelected ? f.text : `text-gray-500 group-hover:${f.text}`}`}>
                    {f.icon}
                  </div>

                  <h3 className={`text-lg font-bold uppercase tracking-widest mb-2 font-serif transition-colors duration-300 ${isSelected ? 'text-white' : `text-gray-400 group-hover:text-white`}`}>
                    {f.name}
                  </h3>

                  <p className="text-xs text-gray-500 font-mono leading-relaxed min-h-[60px] group-hover:text-gray-300 transition-colors">
                    {f.desc}
                  </p>

                  <div className={`mt-4 w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-300 
                    ${isSelected 
                        ? `border-${f.color}-500 bg-${f.color}-500 text-black scale-110` 
                        : `border-gray-700 group-hover:border-${f.color}-500/50`
                    }`}>
                    {isSelected && <span>✓</span>}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="h-16 flex items-center justify-center w-full">
            {selectedId ? (
                <button
                    onClick={handleJoin}
                    disabled={loading}
                    className={`px-12 py-4 font-bold uppercase tracking-[0.2em] text-sm text-white transition-all duration-300 shadow-xl clip-path-polygon animate-in fade-in slide-in-from-bottom-4
                        ${loading ? 'bg-gray-700 cursor-wait' : 'bg-gradient-to-r from-yellow-700 to-yellow-600 hover:from-yellow-600 hover:to-yellow-500 hover:scale-105 hover:shadow-yellow-500/20'}
                    `}
                    style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
                >
                    {loading ? "INITIALISATION..." : "CONFIRMER L'ALLÉGEANCE"}
                </button>
            ) : (
                <span className="text-gray-400 text-xs font-mono uppercase tracking-widest animate-pulse bg-black/60 px-4 py-2 rounded backdrop-blur-md">
                    Survolez pour analyser les factions
                </span>
            )}
          </div>
      </div>

    </div>
  );
}