"use client";

import { useState, useEffect } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import GalaxyMap from '@/components/GalaxyMap';
import Auth from '@/components/Auth';
import FactionSelector from '@/components/FactionSelector';
import MusicManager from '@/components/MusicManager';

export default function Home() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) setUserData(userSnap.data());
          else setUserData(null);
        } catch (e) { console.error(e); }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleFactionChosen = () => { window.location.reload(); };
  
  const handleLogout = () => signOut(auth);

  const startExperience = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    // Délai pour l'animation hyperspace
    setTimeout(() => {
        setHasInteracted(true);
        setIsTransitioning(false); // Reset pour le futur si besoin
    }, 2000); // 2 secondes d'anim
  };

  if (!hasInteracted) {
    return (
        <main 
            onClick={startExperience}
            className="flex h-screen w-screen items-center justify-center bg-black text-yellow-500 font-mono cursor-pointer relative overflow-hidden group"
        >
            {/* --- HYPERSPACE EFFECT --- */}
            {isTransitioning && (
                <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
                     {/* Warp Tunnel (Plus subtil, bleuté) */}
                    <div className="w-[100vmax] h-[100vmax] bg-[radial-gradient(circle,_rgba(100,200,255,0.15)_0%,_transparent_40%)] animate-[hyperspace_2s_ease-in-out_forwards] opacity-0 blur-3xl"></div>
                </div>
            )}

            <div className={`absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 ${isTransitioning ? 'animate-ping duration-1000' : 'animate-pulse'}`}></div>
            
            <div className={`z-10 flex flex-col items-center gap-6 p-12 border border-yellow-900/30 bg-black/40 backdrop-blur-sm rounded-xl transition-all duration-1000 ease-in
                ${isTransitioning ? 'scale-[3] opacity-0 blur-sm translate-z-10' : 'group-hover:border-yellow-500/50 group-hover:bg-black/60 group-hover:shadow-[0_0_50px_rgba(234,179,8,0.2)]'}
            `}>
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-800 drop-shadow-sm">
                    SWTOR
                </h1>
                <p className="text-sm tracking-[0.5em] text-yellow-600/80 uppercase border-t border-b border-yellow-900/30 py-2">
                    Galactic CONQUEST
                </p>
                <div className="mt-8 text-xs font-bold animate-bounce text-yellow-400">
                    {isTransitioning ? "INITIALISATION HYPERDRIVE..." : "[ CLIQUER POUR INITIALISER LE SYSTÈME ]"}
                </div>
            </div>
        </main>
    );
  }

  let content;
  let mode = 'menu';

  // --- 1. CHARGEMENT ---
  if (loading) {
    content = (
      <main className="flex h-screen w-screen items-center justify-center bg-black text-yellow-500 font-mono">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
          <div className="animate-pulse tracking-widest uppercase text-sm">Connexion à l'Holonet...</div>
        </div>
      </main>
    );
  }

  // --- 2. JEU (Connecté + Faction) ---
  else if (user && userData && userData.faction_id && userData.faction_id !== 'neutral') {
    mode = 'game';
    content = (
      <main className="h-screen w-screen bg-black overflow-hidden">
        <GalaxyMap 
            userFaction={userData.faction_id} 
            userRole={userData.role || 'joueur'} 
            userID={user.uid}
            userName={userData.pseudo || user.displayName || "Commandant"} 
            heroData={userData.hero_data}
        />
      </main>
    );
  }

  // --- 3. SÉLECTION DE FACTION (Connecté sans faction) ---
  else if (user && (!userData || !userData.faction_id || userData.faction_id === 'neutral')) {
      content = (
        <main className="flex min-h-screen items-center justify-center bg-black relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
            <div className="z-10 w-full max-w-4xl p-4">
                <FactionSelector 
                    userID={user.uid} 
                    onFactionSelected={handleFactionChosen}
                    onBack={handleLogout}
                />
            </div>
        </main>
      );
  }

  // --- 4. AUTHENTIFICATION (Non connecté) ---
  // On ne met AUCUN style ici, on laisse le composant Auth gérer tout l'écran
  else {
    content = <Auth />;
  }

  return (
    <>
        <MusicManager mode={mode} autoPlay={true} />
        {content}
    </>
  );
}