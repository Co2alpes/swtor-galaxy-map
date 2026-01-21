"use client";

import { useState, useEffect } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import GalaxyMap from '@/components/GalaxyMap';
import Auth from '@/components/Auth';
import FactionSelector from '@/components/FactionSelector';

export default function Home() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // --- 1. CHARGEMENT ---
  if (loading) {
    return (
      <main className="flex h-screen w-screen items-center justify-center bg-black text-yellow-500 font-mono">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
          <div className="animate-pulse tracking-widest uppercase text-sm">Connexion à l'Holonet...</div>
        </div>
      </main>
    );
  }

  // --- 2. JEU (Connecté + Faction) ---
  if (user && userData && userData.faction_id && userData.faction_id !== 'neutral') {
    return (
      <main className="h-screen w-screen bg-black overflow-hidden">
        <GalaxyMap 
            userFaction={userData.faction_id} 
            userRole={userData.role || 'joueur'} 
            userID={user.uid}
            userName={userData.pseudo || user.displayName || "Commandant"} 
        />
      </main>
    );
  }

  // --- 3. SÉLECTION DE FACTION (Connecté sans faction) ---
  if (user && (!userData || !userData.faction_id || userData.faction_id === 'neutral')) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-black relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
            <div className="z-10 w-full max-w-4xl p-4">
                <FactionSelector 
                    userID={user.uid} 
                    onFactionSelected={handleFactionChosen} 
                />
            </div>
        </main>
      );
  }

  // --- 4. AUTHENTIFICATION (Non connecté) ---
  // On ne met AUCUN style ici, on laisse le composant Auth gérer tout l'écran
  return <Auth />;
}