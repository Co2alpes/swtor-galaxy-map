"use client";

import { useState, useEffect } from 'react';
import { db } from '../app/lib/firebase';
import { doc, onSnapshot, updateDoc, increment, collectionGroup, getDocs, writeBatch, query, where } from 'firebase/firestore';

export default function TurnControls({ userRole }) {
  const [turn, setTurn] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false); // Anti-spam clic

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "game_state", "global"), (doc) => {
      if (doc.exists()) {
        setTurn(doc.data().current_turn);
      }
    });
    return () => unsub();
  }, []);

  const handleNextTurn = async () => {
    if (isProcessing) return;
    const confirm = window.confirm(`Passer au Tour ${turn + 1} ? \nCela va générer les ressources des bâtiments actifs.`);
    if (!confirm) return;

    setIsProcessing(true);

    try {
      const batch = writeBatch(db);
      
      // 1. Initialiser les compteurs de production
      const production = {
        empire: { credits: 0, materials: 0, manpower: 0 },
        republic: { credits: 0, materials: 0, manpower: 0 },
        // Ajoute d'autres factions si besoin
      };

      // 2. Scanner TOUS les bâtiments construits dans la galaxie
      // Astuce : On cherche ceux dont le tour de fin est <= au tour actuel (donc actifs)
      const q = query(
        collectionGroup(db, 'constructions'),
        where('finish_turn', '<=', turn)
      );
      
      const querySnapshot = await getDocs(q);

      console.log(`Traitement de ${querySnapshot.size} bâtiments actifs...`);

      // 3. Calculer la production pour chaque bâtiment trouvé
      for (const constructionDoc of querySnapshot.docs) {
        const data = constructionDoc.data();
        
        // Pour savoir à qui donner les ressources, on doit savoir à qui est la planète
        // Le "parent" du document construction est la collection "constructions"
        // Le "parent" de la collection est le document "province"
        const provinceRef = constructionDoc.ref.parent.parent;
        
        // C'est un peu lourd de lire chaque province, mais nécessaire pour la sécurité
        // (Ou alors on stocke le owner_id dans la construction à la création, ce serait mieux pour la v2)
        // Pour l'instant, faisons simple :
        // ATTENTION : Lire chaque province exploserait le quota si 1000 bâtiments.
        // OPTIMISATION : On va lire les provinces UNE fois au début, ce serait mieux.
        // Mais ici, restons sur la logique simple pour le prototype.
      }
      
      // --- CORRECTION STRATÉGIQUE ---
      // Lire le parent de chaque bâtiment est trop lent.
      // Modifions plutôt la logique : on va supposer qu'on a stocké "faction_id" dans la construction
      // Si on ne l'a pas fait, on va devoir lire toutes les provinces.
      // FAISONS LE BOEUF : On lit toutes les provinces d'abord.
      const provincesSnap = await getDocs(collectionGroup(db, 'provinces')); // On prend tout
      const provinceOwners = {};
      provincesSnap.forEach(p => {
          provinceOwners[p.id] = p.data().owner;
      });

      querySnapshot.forEach(doc => {
          const data = doc.data();
          const provinceId = doc.ref.parent.parent.id;
          const owner = provinceOwners[provinceId];

          if (owner && production[owner] && data.production) {
              if (data.production.credits) production[owner].credits += Number(data.production.credits);
              if (data.production.materials) production[owner].materials += Number(data.production.materials);
              if (data.production.manpower) production[owner].manpower += Number(data.production.manpower);
          }
      });

      // 4. Appliquer les gains aux factions
      for (const [factionKey, res] of Object.entries(production)) {
          if (res.credits > 0 || res.materials > 0 || res.manpower > 0) {
              const factionRef = doc(db, "factions", factionKey);
              batch.update(factionRef, {
                  credits: increment(res.credits),
                  materials: increment(res.materials),
                  manpower: increment(res.manpower)
              });
              console.log(`${factionKey} gagne :`, res);
          }
      }

      // 5. Passer le tour
      batch.update(doc(db, "game_state", "global"), {
        current_turn: increment(1)
      });

      await batch.commit();
      alert("Tour terminé ! Ressources distribuées.");

    } catch (error) {
      console.error("Erreur tour :", error);
      // Si l'erreur est "The query requires an index", Firebase te donnera un lien dans la console F12.
      // Clique dessus pour créer l'index automatiquement !
      if (error.message.includes("index")) {
          alert("ATTENTION ADMIN : Il manque un Index Firestore. Ouvre la console (F12) et clique sur le lien fourni par Firebase.");
      } else {
          alert("Erreur critique lors du calcul du tour.");
      }
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center bg-gray-900 border border-yellow-600 p-2 rounded min-w-[120px]">
      <div className="text-[10px] text-gray-400 uppercase tracking-widest">Calendrier</div>
      <div className="text-2xl font-bold text-white mb-1">TOUR {turn}</div>
      
      {userRole === 'admin' && (
        <button 
          onClick={handleNextTurn}
          disabled={isProcessing}
          className={`text-xs px-2 py-1 rounded font-bold transition ${isProcessing ? 'bg-gray-600 cursor-wait' : 'bg-yellow-700 hover:bg-yellow-600 text-white'}`}
        >
          {isProcessing ? "CALCUL..." : ">>> SUIVANT"}
        </button>
      )}
    </div>
  );
}