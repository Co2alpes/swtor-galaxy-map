"use client";

import { useState, useEffect } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import GalaxyMap from '@/components/GalaxyMap';
import Auth from '@/components/Auth';
import FactionSelector from '@/components/FactionSelector';
import MusicManager from '@/components/MusicManager';
import { SwBackdrop, SwDivider, SwEmblem, SwFaction, SwLabel, SwPortrait, SwSpinner } from '@/components/ui/Swtor';

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
            className="flex h-screen w-screen items-center justify-center bg-sw-bg cursor-pointer relative overflow-hidden group"
        >
            {/* --- HYPERSPACE EFFECT --- */}
            {isTransitioning && (
                <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
                     {/* Warp Tunnel (Plus subtil, bleuté) */}
                    <div className="w-[100vmax] h-[100vmax] bg-[radial-gradient(circle,_rgba(100,200,255,0.15)_0%,_transparent_40%)] animate-[hyperspace_2s_ease-in-out_forwards] opacity-0 blur-3xl"></div>
                </div>
            )}

            <SwBackdrop dim={0.3} className={isTransitioning ? 'animate-ping duration-1000' : ''} />

            <div className={`z-10 flex flex-col items-center gap-5 transition-all duration-1000 ease-in
                ${isTransitioning ? 'scale-[3] opacity-0 blur-sm' : ''}
            `}>
                <SwPortrait size={150} scanner>
                    <SwEmblem size={86} />
                </SwPortrait>
                <h1 className="sw-title text-5xl md:text-7xl tracking-[0.14em] mt-4 drop-shadow-[0_0_20px_rgb(var(--sw-accent-rgb)/0.5)]">
                    SWTOR
                </h1>
                <SwDivider className="w-72" />
                <SwLabel className="tracking-[0.6em] text-sw-gold-dim">Galactic Conquest</SwLabel>
                <div className="sw-btn sw-btn-accent mt-8 group-hover:[border-image-source:url(/ui/swtor/btn_hover.png)] animate-pulse">
                    {isTransitioning ? "Initialisation hyperdrive..." : "Cliquer pour initialiser le système"}
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
      <main className="relative flex h-screen w-screen items-center justify-center bg-sw-bg">
        <SwBackdrop dim={0.5} />
        <SwSpinner size={110} label="Connexion à l'Holonet..." className="z-10" />
      </main>
    );
  }

  // --- 2. JEU (Connecté + Faction) ---
  else if (user && userData && userData.faction_id && userData.faction_id !== 'neutral') {
    mode = 'game';
    content = (
      <SwFaction as="main" faction={userData.faction_id} className="h-screen w-screen bg-sw-bg overflow-hidden">
        <GalaxyMap
            userFaction={userData.faction_id} 
            userRole={userData.role || 'joueur'} 
            userID={user.uid}
            userName={userData.pseudo || user.displayName || "Commandant"} 
            heroData={userData.hero_data}
        />
      </SwFaction>
    );
  }

  // --- 3. SÉLECTION DE FACTION (Connecté sans faction) ---
  else if (user && (!userData || !userData.faction_id || userData.faction_id === 'neutral')) {
      content = (
        <main className="flex min-h-screen items-center justify-center bg-sw-bg relative">
            <SwBackdrop dim={0.45} />
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