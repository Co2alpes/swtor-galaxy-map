"use client";

import { useState } from 'react';
import { auth, db } from '../app/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function SignUp({ onSucces, onSwitchMode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!pseudo.trim() || pseudo.length < 3) {
        setError("Le pseudo doit faire au moins 3 caractères.");
        setLoading(false);
        return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await updateProfile(user, { displayName: pseudo });
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        pseudo: pseudo,
        email: email,
        faction_id: "neutral",
        role: "user",
        credits: 1000,
        createdAt: new Date(),
        is_general: false,
        is_diplomat: false
      });

      if (onSucces) onSucces();

    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError("Email déjà enregistré.");
      } else if (err.code === 'auth/weak-password') {
        setError("Mot de passe trop faible.");
      } else {
        setError("Erreur d'initialisation.");
      }
    } finally {
      setLoading(false);
    }
  };

  // --- STYLES ---
  const inputContainerStyle = "relative group w-full";
  const labelStyle = "block text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-2 group-focus-within:text-yellow-500 transition-colors";
  const inputStyle = "w-full bg-black/60 border border-gray-700 text-white p-4 rounded-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/50 outline-none transition-all duration-300 placeholder:text-gray-700 font-mono text-sm backdrop-blur-md";
  
  // Style des coins décoratifs du rectangle
  const cornerStyle = "absolute w-3 h-3 border-yellow-600/60 pointer-events-none transition-all duration-500";

  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center p-4 md:p-8 font-sans select-none relative overflow-hidden">
      
      {/* --- ARRIÈRE-PLAN GLOBAL --- */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] bg-repeat opacity-20 pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a1a_0%,_#000000_100%)] pointer-events-none"></div>

      {/* --- CONTENEUR PRINCIPAL CENTRÉ --- */}
      <div className="w-full max-w-6xl bg-gray-950/80 border border-gray-800 rounded-xl shadow-2xl flex flex-col lg:flex-row overflow-hidden backdrop-blur-xl relative z-10 animate-in zoom-in-95 duration-500">
          
          {/* --- COLONNE GAUCHE : VISUEL (40%) --- */}
          <div className="hidden lg:flex w-[40%] bg-black/30 border-r border-gray-800 flex-col justify-between p-12 relative">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-600/50 to-transparent"></div>

              <div className="relative mt-4">
                  <div className="w-12 h-1 bg-yellow-600 mb-6"></div>
                  <h1 className="text-4xl lg:text-5xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-yellow-100 via-yellow-500 to-yellow-900 drop-shadow-lg font-serif leading-tight mb-6">
                      RECRUE
                  </h1>
                  <p className="text-gray-400 text-xs font-mono uppercase tracking-[0.2em] leading-relaxed max-w-xs border-l-2 border-yellow-600/30 pl-4 py-2">
                      Rejoignez le conflit galactique. <br/>
                      Choisissez votre destin. <br/>
                      Dominez les étoiles.
                  </p>
              </div>

              <div className="space-y-4 opacity-50 mt-12">
                  <div className="text-[9px] font-mono text-gray-500 flex flex-col gap-1">
                      <span>:: PROTOCOL_V4.2 INITIALIZED</span>
                      <span>:: CONNECTION_SECURE</span>
                      <span>:: NODE_CORUSCANT_PRIME</span>
                  </div>
              </div>
          </div>

          {/* --- COLONNE DROITE : FORMULAIRE (60%) --- */}
          <div className="w-full lg:w-[60%] p-8 lg:p-16 flex flex-col justify-center bg-black/20">
              
              {/* --- LE RECTANGLE (CADRE) --- */}
              <div className="w-full max-w-xl mx-auto relative group/panel">
                  
                  {/* Fond et Bordure du Rectangle */}
                  <div className="absolute inset-0 bg-gray-900/40 border border-yellow-900/30 rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-sm -z-10"></div>
                  
                  {/* Coins décoratifs */}
                  <div className={`${cornerStyle} top-0 left-0 border-t-2 border-l-2 rounded-tl-sm`}></div>
                  <div className={`${cornerStyle} top-0 right-0 border-t-2 border-r-2 rounded-tr-sm`}></div>
                  <div className={`${cornerStyle} bottom-0 left-0 border-b-2 border-l-2 rounded-bl-sm`}></div>
                  <div className={`${cornerStyle} bottom-0 right-0 border-b-2 border-r-2 rounded-br-sm`}></div>

                  {/* Contenu du formulaire avec Padding */}
                  <div className="p-8 lg:p-10">
                      
                      {/* En-tête mobile */}
                      <div className="lg:hidden mb-8 text-center">
                          <h1 className="text-4xl font-bold text-yellow-500 uppercase tracking-widest font-serif">Recrutement</h1>
                      </div>

                      <div className="hidden lg:flex text-yellow-600 text-xs font-bold uppercase tracking-[0.3em] mb-8 items-center gap-2">
                          <span className="w-4 h-4 border border-yellow-600 rounded-full block animate-pulse"></span>
                          Initialisation du dossier
                      </div>

                      {error && (
                          <div className="mb-8 p-4 bg-red-950/40 border-l-2 border-red-500 text-red-300 text-xs font-mono flex items-center gap-3 shadow-lg">
                              <span className="text-lg">⚠️</span> {error}
                          </div>
                      )}

                      <form onSubmit={handleRegister} className="space-y-6">
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className={inputContainerStyle}>
                                  <label className={labelStyle}>Identifiant</label>
                                  <input
                                      type="text"
                                      placeholder="Nom de Guerre"
                                      value={pseudo}
                                      onChange={(e) => setPseudo(e.target.value)}
                                      className={inputStyle}
                                      required
                                      minLength={3}
                                  />
                              </div>

                              <div className={inputContainerStyle}>
                                  <label className={labelStyle}>Fréquence (Email)</label>
                                  <input
                                      type="email"
                                      placeholder="contact@holonet.com"
                                      value={email}
                                      onChange={(e) => setEmail(e.target.value)}
                                      className={inputStyle}
                                      required
                                  />
                              </div>
                          </div>

                          <div className={inputContainerStyle}>
                              <label className={labelStyle}>Code d'Accès</label>
                              <input
                                  type="password"
                                  placeholder="••••••••••••"
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  className={`${inputStyle} tracking-widest`}
                                  required
                                  minLength={6}
                              />
                          </div>

                          <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-gray-800/50 mt-8">
                              <div className="text-gray-500 text-[10px] font-mono uppercase tracking-wider order-2 md:order-1">
                                  Déjà enregistré ?{' '}
                                  <button 
                                      type="button"
                                      onClick={onSwitchMode} 
                                      className="ml-2 text-yellow-600 hover:text-yellow-400 font-bold transition-colors underline decoration-yellow-800/50 hover:decoration-yellow-400 underline-offset-4"
                                  >
                                      Connexion
                                  </button>
                              </div>

                              <button
                                  type="submit"
                                  disabled={loading}
                                  className={`order-1 md:order-2 w-full md:w-auto px-10 py-4 bg-gradient-to-r from-yellow-700 to-yellow-600 hover:from-yellow-600 hover:to-yellow-500 text-white font-bold uppercase tracking-[0.25em] text-xs transition-all duration-300 shadow-[0_0_20px_rgba(202,138,4,0.1)] hover:shadow-[0_0_30px_rgba(202,138,4,0.3)] transform hover:-translate-y-1 ${loading ? 'opacity-50 cursor-wait' : ''}`}
                                  style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
                              >
                                  {loading ? "TRAITEMENT..." : "INITIALISER"}
                              </button>
                          </div>
                      </form>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
}