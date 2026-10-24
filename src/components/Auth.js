"use client";

import { useState, useEffect } from 'react';
import { auth, db } from '../app/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import SignUp from './SignUp';
import { SwBackdrop, SwButton, SwCell, SwDivider, SwEmblem, SwIcon, SwInput, SwLabel, SwPanel, SwWindow } from './ui/Swtor';

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

  // --- RENDU LOGIN ---
  return (
    <main
        onMouseMove={handleMouseMove}
        className="flex min-h-screen flex-col items-center justify-center p-8 bg-sw-bg text-sw-text relative overflow-hidden"
    >
      <SwBackdrop dim={0.35}>
        {/* Halo qui suit la souris */}
        <div
          className="absolute inset-0 mix-blend-screen opacity-60"
          style={{ background: `radial-gradient(520px circle at ${mousePos.x}px ${mousePos.y}px, rgb(var(--sw-accent-rgb) / 0.22), transparent 65%)` }}
        />
      </SwBackdrop>

      {/* Logo */}
      <header className="mb-10 text-center z-10 flex flex-col items-center gap-3">
        <SwEmblem size={88} />
        <h1 className="sw-title text-6xl tracking-[0.12em] drop-shadow-[0_0_18px_rgb(var(--sw-accent-rgb)/0.45)]">SWTOR</h1>
        <SwLabel className="tracking-[0.8em]">Galactic Conquest</SwLabel>
      </header>

      {/* Carte de Connexion */}
      <SwWindow title="Connexion" subtitle="Terminal d'accès Holonet" className="z-10 w-full max-w-md" bodyClassName="p-6 pt-6">
        {error && (
          <div className="mb-4 p-2 sw-panel-dark border-sw-error/70 text-sw-error text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <SwLabel as="label" className="block mb-1">Email</SwLabel>
            <SwInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div>
            <SwLabel as="label" className="block mb-1">Mot de passe</SwLabel>
            <SwInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <SwButton type="submit" variant="accent" disabled={loading} className="w-full mt-4">
            {loading ? "Authentification..." : "Accéder au terminal"}
          </SwButton>
        </form>

        <SwDivider className="mt-6 mb-4" />
        <p className="text-center text-sw-dim text-xs">
          Nouvelle recrue ?{' '}
          <button onClick={() => setIsLoginMode(false)} className="text-sw-gold hover:text-white font-bold cursor-pointer ml-1 uppercase tracking-wider transition-colors">
            S&apos;enrôler
          </button>
        </p>
      </SwWindow>

       {/* --- NEWS TICKER (HOLONET) / BOUTON D'ACCÈS --- */}
       <div
            className={`absolute top-0 left-0 w-full bg-sw-panel-dark border-b border-sw-line/60 backdrop-blur-md flex flex-col items-center z-20 transition-all duration-500 ease-in-out ${showHolonet ? 'h-[60vh] md:h-[50vh]' : 'h-9'}`}
       >
            {/* Header du Ticker (Toujours visible) */}
            <div
                className="w-full h-9 shrink-0 flex items-center cursor-pointer hover:bg-sw-panel-light/50 transition-colors group/ticker"
                onClick={() => setShowHolonet(!showHolonet)}
            >
                <div className="h-full px-4 flex items-center gap-2 border-r border-sw-line/60 z-30 shadow-[inset_0_-2px_0_var(--sw-accent)]">
                    <SwIcon name="datapad" size={20} />
                    <span className="sw-label text-sw-gold group-hover/ticker:text-white transition-colors hidden md:inline">Holonet News</span>
                    <span className="sw-label text-sw-gold md:hidden">News</span>
                </div>

                {/* Contenu Déroulant (visible seulement si fermé) */}
                <div className={`flex-1 overflow-hidden relative h-full flex items-center transition-opacity duration-300 ${showHolonet ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div className="animate-marquee whitespace-nowrap flex absolute">
                        {newsData.ticker && [...newsData.ticker, ...newsData.ticker].map((item, index) => (
                            <span key={index} className="mx-8 text-[11px] text-sw-dim uppercase tracking-wide flex items-center">
                                <span className="text-sw-accent mr-2 text-sm">»</span> {item}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Bouton Toggle (Flèche) */}
                <div className="px-4 text-sw-accent">
                    <svg className={`w-4 h-4 transition-transform duration-500 ${showHolonet ? 'rotate-0 text-white' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                </div>
            </div>

            {/* PANNEAU HOLONET ÉTENDU */}
            <div className={`w-full flex-1 min-h-0 p-4 md:p-6 relative flex flex-col items-center justify-center transition-opacity duration-500 delay-100 ${showHolonet ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <SwWindow
                    title={newsData.main?.title || 'Titre manquant'}
                    subtitle={newsData.main?.subtitle || 'Résumé'}
                    className="w-full max-w-6xl h-full"
                    bodyClassName="flex flex-col md:flex-row gap-4 p-4"
                    actions={
                        <a
                            href={newsData.main?.patchNoteUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`sw-btn sw-btn-sm ${!newsData.main?.patchNoteUrl ? 'opacity-40 pointer-events-none' : ''}`}
                        >
                            Lire le patchnote
                        </a>
                    }
                >
                    {/* COLONNE GAUCHE : LISTE DES MISES À JOUR */}
                    <div className="w-full md:w-1/3 flex flex-col gap-2 overflow-y-auto sw-scroll pr-1">
                        <SwLabel className="mb-2 text-sw-gold">Mises à jour</SwLabel>
                        {newsData.updates && newsData.updates.length > 0 ? (
                            newsData.updates.map((item, i) => (
                                <div key={i} data-active={i === 0 ? 'true' : undefined} className="sw-row p-2 cursor-pointer flex items-center gap-3">
                                    <SwCell size={48}>
                                        {item.image ? (
                                            <div className="w-full h-full bg-cover bg-center rounded-[3px]" style={{backgroundImage: `url(${item.image})`}}></div>
                                        ) : (
                                            <SwIcon name="holodisk1" size={36} />
                                        )}
                                    </SwCell>
                                    <div className="min-w-0">
                                        <div className="text-xs font-bold uppercase tracking-wider text-sw-text truncate">{item.title}</div>
                                        <div className="text-[10px] text-sw-dim truncate">{item.subtitle}</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-sw-faint text-xs italic p-4 text-center">Aucune mise à jour disponible.</div>
                        )}
                    </div>

                    {/* COLONNE DROITE : DÉTAILS */}
                    <div className="flex-1 min-h-0 flex flex-col sw-panel-dark p-4">
                         <div className="flex-1 overflow-y-auto sw-scroll text-sw-dim text-sm leading-relaxed space-y-4 pr-2">
                            {newsData.main && newsData.main.content && Array.isArray(newsData.main.content) ? (
                                newsData.main.content.map((paragraph, i) => (
                                    <p key={i}>{paragraph}</p>
                                ))
                            ) : (
                                <p>{newsData.main?.content || "Aucun contenu."}</p>
                            )}

                            <div className="grid grid-cols-2 gap-3 mt-6">
                                <SwPanel className="p-3">
                                    <SwLabel className="mb-1">Statut serveur</SwLabel>
                                    <div className={`font-bold flex items-center gap-2 ${newsData.systemInfo?.serverStatus === 'OFFLINE' ? 'text-sw-error' : 'text-sw-success'}`}>
                                        <span className={`w-2 h-2 rounded-full ${newsData.systemInfo?.serverStatus === 'OFFLINE' ? 'bg-sw-error' : 'bg-sw-success animate-pulse'}`}></span>
                                        {newsData.systemInfo?.serverStatus || "EN LIGNE"}
                                    </div>
                                </SwPanel>
                                <SwPanel className="p-3">
                                    <SwLabel className="mb-1">Joueurs connectés</SwLabel>
                                    <div className="text-sw-gold font-bold">{newsData.systemInfo?.onlinePlayers || "0"}</div>
                                </SwPanel>
                            </div>
                         </div>

                         <div className="mt-3 pt-3 border-t border-sw-border flex justify-between items-center sw-label text-[10px] text-sw-faint">
                            <span>Requires Level 60</span>
                            <div className="flex gap-3">
                                <span>Era locked</span>
                                <span>Conquest locked</span>
                            </div>
                         </div>
                    </div>
                </SwWindow>
            </div>
       </div>

    </main>
  );
}
