"use client";

import { useState, useEffect } from 'react';
import { auth, db } from '../app/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import SignUp from './SignUp';

const DEFAULT_NEWS = {
    ticker: [],
    updates: [],
    main: {
        title: 'Système Holonet',
        subtitle: 'En attente de transmission',
        content: [
            "Aucune donnée reçue. Le système est en attente de mise à jour par un administrateur."
        ]
    },
    systemInfo: {
        serverStatus: "EN LIGNE",
        onlinePlayers: "12,458"
    }
};

export default function Auth() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showHolonet, setShowHolonet] = useState(false);
  const [newsData, setNewsData] = useState(DEFAULT_NEWS);

  useEffect(() => {
    // 1. Holonet Data
    const unsub = onSnapshot(doc(db, "system", "holonet"), (doc) => {
        if (doc.exists()) {
            setNewsData(doc.data());
        }
    });

    return () => unsub();
  }, []);

  const handleMouseMove = (e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  // Si on veut s'inscrire, on affiche le SignUp plein écran
  if (!isLoginMode) {
      return <SignUp onSwitchMode={() => setIsLoginMode(true)} />;
  }

  // --- LOGIQUE LOGIN ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      // On masque l'erreur console pour ne pas effrayer l'utilisateur, c'est juste un mauvais mot de passe
      setError("Email ou mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  };

  // --- RENDU LOGIN (AVEC LE DESIGN QUI ÉTAIT DANS PAGE.JS) ---
  return (
    <main 
        onMouseMove={handleMouseMove}
        className="flex min-h-screen flex-col items-center justify-center p-8 bg-black text-white relative overflow-hidden font-sans group"
    >
      
      {/* Fond d'ambiance (BASE SOMBRE) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black opacity-90 pointer-events-none"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-40 pointer-events-none"></div>

      {/* --- FLASHLIGHT EFFECT (RÉVÉLATION DES ÉTOILES) --- */}
      {/* On utilise mix-blend-screen pour rendre les étoiles bien blanches et lumineuses */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-100 mix-blend-screen"
        style={{
            maskImage: `radial-gradient(500px circle at ${mousePos.x}px ${mousePos.y}px, black 0%, transparent 70%)`,
            WebkitMaskImage: `radial-gradient(500px circle at ${mousePos.x}px ${mousePos.y}px, black 0%, transparent 70%)`
        }}
      ></div>
      
      {/* Glow plus prononcé pour l'effet "organique" */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 mix-blend-color-dodge opacity-50 transition-opacity duration-75"
        style={{
             background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(130, 210, 255, 0.45), transparent 60%)`
        }}
      ></div>

      {/* Header */}
      <header className="mb-12 text-center z-10">
        <h1 className="text-6xl font-bold text-yellow-500 tracking-wider uppercase drop-shadow-[0_0_15px_rgba(234,179,8,0.5)] mb-2 font-serif">
            SWTOR
        </h1>
        <div className="text-sm text-gray-400 uppercase tracking-[0.8em] border-t border-gray-800 pt-2 mt-2">Galactic Conquest</div>
      </header>

      {/* Carte de Connexion */}
      <div className="z-10 w-full max-w-md bg-gray-900/60 p-8 rounded-lg border border-gray-700 shadow-2xl backdrop-blur-md">
        
        <h2 className="text-2xl font-bold text-center mb-6 text-white uppercase tracking-widest border-b border-gray-700 pb-4">
          Connexion
        </h2>

        {error && (
          <div className="mb-4 p-2 bg-red-900/50 border border-red-500 text-red-200 text-xs text-center rounded font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 font-mono">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/50 border border-gray-600 p-3 text-white focus:border-yellow-500 outline-none rounded-sm text-sm transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 font-mono">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/50 border border-gray-600 p-3 text-white focus:border-yellow-500 outline-none rounded-sm text-sm transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 mt-4 font-bold uppercase tracking-widest text-xs transition-all border border-yellow-600/50 hover:border-yellow-500 ${loading ? 'bg-gray-800 text-gray-500' : 'bg-yellow-900/40 hover:bg-yellow-800/60 text-yellow-100 shadow-[0_0_10px_rgba(234,179,8,0.2)]'}`}
          >
            {loading ? "AUTHENTIFICATION..." : "ACCÉDER AU TERMINAL"}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-gray-800 pt-4">
          <p className="text-gray-500 text-xs font-mono">
            Nouvelle recrue ?{' '}
            <button 
              onClick={() => setIsLoginMode(false)} 
              className="text-yellow-500 hover:text-white font-bold underline cursor-pointer ml-1 transition-colors"
            >
              S'ENRÔLER
            </button>
          </p>
        </div>
      </div>

       {/* --- NEWS TICKER (HOLONET) / BOUTON D'ACCÈS --- */}
       <div 
            className={`absolute top-0 left-0 w-full bg-black/80 border-b border-cyan-500/30 backdrop-blur-md flex flex-col items-center z-20 transition-all duration-500 ease-in-out ${showHolonet ? 'h-[60vh] md:h-[50vh]' : 'h-8'}`}
       >
            {/* Header du Ticker (Toujours visible) */}
            <div 
                className="w-full h-8 flex items-center cursor-pointer hover:bg-cyan-900/10 transition-colors group/ticker"
                onClick={() => setShowHolonet(!showHolonet)}
            >
                <div className="bg-cyan-900/20 h-full px-4 flex items-center border-r border-cyan-500/50 z-30">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse mr-2 box-shadow-[0_0_10px_#00d2ff]"></div>
                    <span className="text-cyan-400 font-bold text-[10px] uppercase tracking-widest hidden md:inline group-hover/ticker:text-white transition-colors">Holonet News</span>
                    <span className="text-cyan-400 font-bold text-[10px] uppercase tracking-widest md:hidden">NEWS</span>
                </div>
                
                {/* Contenu Déroulant (visible seulement si fermé) */}
                <div className={`flex-1 overflow-hidden relative h-full flex items-center transition-opacity duration-300 ${showHolonet ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div className="animate-marquee whitespace-nowrap flex absolute">
                        {newsData.ticker && [...newsData.ticker, ...newsData.ticker].map((item, index) => (
                            <span key={index} className="mx-8 text-[10px] font-mono text-cyan-200/70 uppercase tracking-wide flex items-center">
                                <span className="text-cyan-500 mr-2 text-sm">»</span> {item}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Bouton Toggle (Flèche) */}
                <div className="px-4 text-cyan-500">
                    <svg className={`w-4 h-4 transition-transform duration-500 ${showHolonet ? 'rotate-0 text-white' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                </div>
            </div>

            {/* PANNEAU HOLONET ÉTENDU (SWTOR UI STYLE) */}
            <div className={`w-full flex-1 p-4 md:p-8 relative overflow-hidden flex flex-col items-center justify-center transition-opacity duration-500 delay-100 ${showHolonet ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {/* Fond Grid Tech */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,210,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,210,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

                {/* Conteneur principal style "Fenêtre SWTOR" */}
                <div className="w-full max-w-6xl h-full border-2 border-cyan-600/40 rounded-lg p-1 relative flex flex-col md:flex-row bg-[#000a12]/90 backdrop-blur-xl shadow-[0_0_50px_rgba(0,210,255,0.1)]">
                    
                     {/* Décorations de coins et bordures */}
                     <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400"></div>
                     <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400"></div>
                     <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400"></div>
                     <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400"></div>
                     <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[2px] bg-cyan-400 shadow-[0_0_10px_#00d2ff]"></div>
                     <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-[2px] bg-cyan-400 shadow-[0_0_10px_#00d2ff]"></div>

                    {/* COLONNE GAUCHE : LISTE DES CHAPITRES (MENU) */}
                    <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-cyan-800/50 p-4 flex flex-col gap-2 overflow-y-auto">
                        <div className="text-cyan-400 text-xs font-bold uppercase tracking-[0.2em] mb-4 pl-2 border-l-2 border-cyan-500">Mises à Jour</div>
                        
                        {/* Fake Items List */}
                        {newsData.updates && newsData.updates.length > 0 ? (
                            newsData.updates.map((item, i) => (
                                <div key={i} className={`p-4 border border-cyan-900/50 bg-cyan-950/20 rounded cursor-pointer hover:bg-cyan-900/40 hover:border-cyan-500/50 transition-all group flex items-center gap-4 ${i===0 ? 'border-cyan-500 bg-cyan-900/30' : ''}`}>
                                    <div className={`w-12 h-12 bg-black border border-cyan-800 rounded flex items-center justify-center overflow-hidden`}>
                                         {/* Placeholder image */}
                                         {item.image ? (
                                            <div className="w-full h-full bg-cover bg-center" style={{backgroundImage: `url(${item.image})`}}></div>
                                         ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-cyan-900 to-black opacity-50"></div>
                                         )}
                                    </div>
                                    <div>
                                        <div className={`text-[10px] font-bold uppercase tracking-wider ${i===0 ? 'text-white' : 'text-cyan-200 group-hover:text-white'}`}>{item.title}</div>
                                        <div className="text-[8px] text-cyan-600 group-hover:text-cyan-400">{item.subtitle}</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-cyan-700 text-xs italic p-4 text-center">Aucune mise à jour disponible.</div>
                        )}
                    </div>

                    {/* COLONNE DROITE : DÉTAILS (CONTENU) */}
                    <div className="flex-1 p-6 flex flex-col relative">
                         {/* Header Panneau */}
                         <div className="flex justify-between items-start border-b border-cyan-900/50 pb-4 mb-4">
                            <div>
                                <h3 className="text-cyan-500 text-[10px] uppercase tracking-[0.3em] font-mono mb-1">{newsData.main?.subtitle || 'Résumé'}</h3>
                                <h2 className="text-2xl text-white font-bold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-400">
                                    {newsData.main?.title || 'Titre manquant'}
                                </h2>
                            </div>
                            <a 
                                href={newsData.main?.patchNoteUrl || '#'} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`px-6 py-2 border border-cyan-500/50 text-cyan-400 text-[10px] uppercase tracking-widest hover:bg-cyan-500 hover:text-black transition-all shadow-[0_0_15px_rgba(0,210,255,0.2)] ${!newsData.main?.patchNoteUrl ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                            >
                                Lire le Patchnote
                            </a>
                         </div>

                         {/* Contenu Texte */}
                         <div className="flex-1 overflow-y-auto text-cyan-100/80 text-xs leading-relaxed font-mono space-y-4 pr-2 scrollbar-thin scrollbar-thumb-cyan-700 scrollbar-track-transparent">
                            {newsData.main && newsData.main.content && Array.isArray(newsData.main.content) ? (
                                newsData.main.content.map((paragraph, i) => (
                                    <p key={i}>{paragraph}</p>
                                ))
                            ) : (
                                <p>{newsData.main?.content || "Aucun contenu."}</p>
                            )}
                            
                            <div className="grid grid-cols-2 gap-4 mt-8">
                                <div className="bg-cyan-950/30 p-3 border border-cyan-900/50 rounded">
                                    <div className="text-[8px] uppercase text-cyan-600 mb-1">Statut Serveur</div>
                                    <div className={`font-bold flex items-center gap-2 ${newsData.systemInfo?.serverStatus === 'OFFLINE' ? 'text-red-500' : 'text-green-400'}`}>
                                        <span className={`w-2 h-2 rounded-full ${newsData.systemInfo?.serverStatus === 'OFFLINE' ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`}></span>
                                        {newsData.systemInfo?.serverStatus || "EN LIGNE"}
                                    </div>
                                </div>
                                <div className="bg-cyan-950/30 p-3 border border-cyan-900/50 rounded">
                                    <div className="text-[8px] uppercase text-cyan-600 mb-1">Joueurs connectés</div>
                                    <div className="text-cyan-300 font-bold">{newsData.systemInfo?.onlinePlayers || "0"}</div>
                                </div>
                            </div>
                         </div>
                         
                         {/* Footer Panneau */}
                         <div className="mt-4 pt-4 border-t border-cyan-900/50 flex justify-between items-center text-[10px] text-cyan-700 font-mono uppercase">
                            <span>Requires Level 60</span>
                            <div className="flex gap-2">
                                <span>🔒 ERA LOCKED</span>
                                <span>🔒 CONQUEST LOCKED</span>
                            </div>
                         </div>
                    </div>

                </div>
            </div>
       </div>

    </main>
  );
}