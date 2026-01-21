"use client";

import { useState } from 'react';
import { auth } from '../app/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import SignUp from './SignUp';

export default function Auth() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      console.error(err);
      setError("Identifiants incorrects.");
    } finally {
      setLoading(false);
    }
  };

  // --- RENDU LOGIN (AVEC LE DESIGN QUI ÉTAIT DANS PAGE.JS) ---
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-black text-white relative overflow-hidden font-sans">
      
      {/* Fond d'ambiance */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black opacity-80 pointer-events-none"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none"></div>

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
    </main>
  );
}