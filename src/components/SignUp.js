"use client";

import { useState } from 'react';
import { auth, db } from '../app/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { SwBackdrop, SwButton, SwDivider, SwEmblem, SwInput, SwLabel, SwPanel, SwWindow, factionKit } from './ui/Swtor';

export default function SignUp({ onSucces, onSwitchMode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [magicDomain, setMagicDomain] = useState('dark'); // 'dark', 'light', 'mandalorian'
  const [combatStyle, setCombatStyle] = useState('melee'); // 'melee', 'shooter'
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

      // Vérification code admin
      let assignedRole = "user";
      if (activationCode === "IMPERATOR") {
          assignedRole = "admin";
      }

      await updateProfile(user, { displayName: pseudo });
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        pseudo: pseudo,
        email: email,
        faction_id: "neutral",
        role: assignedRole,
        credits: 1000,
        magic_domain: magicDomain,
        combat_style: combatStyle,
        createdAt: new Date(),
        is_general: false,
        is_diplomat: false,
        hero_data: { level: 1, points: 1, unlocked: ['root'] }
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
  const labelStyle = "block mb-1 group-focus-within:text-sw-accent-light transition-colors";

  return (
    <main className="min-h-screen w-full bg-sw-bg text-sw-text flex flex-col items-center justify-center p-4 md:p-8 select-none relative overflow-hidden">

      {/* --- ARRIÈRE-PLAN GLOBAL --- */}
      <SwBackdrop dim={0.35} />

      {/* Logo */}
      <header className="mb-8 text-center z-10 flex flex-col items-center gap-3">
          <SwEmblem size={72} />
          <h1 className="sw-title text-5xl tracking-[0.12em] drop-shadow-[0_0_18px_rgb(var(--sw-accent-rgb)/0.45)]">SWTOR</h1>
          <SwLabel className="tracking-[0.8em]">Galactic Conquest</SwLabel>
      </header>

      {/* --- CONTENEUR PRINCIPAL CENTRÉ --- */}
      <SwWindow
          title="Recrutement"
          subtitle="Initialisation du dossier"
          className="z-10 w-full max-w-5xl"
          bodyClassName="flex flex-col lg:flex-row gap-6 p-6"
      >

          {/* --- COLONNE GAUCHE : VISUEL (40%) --- */}
          <SwPanel dark className="hidden lg:flex w-[40%] flex-col justify-between p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-cover bg-bottom opacity-40 mix-blend-screen pointer-events-none" style={{ backgroundImage: `url(${factionKit().background})` }}></div>

              <div className="relative mt-2">
                  <SwDivider className="w-16 mb-6" />
                  <h2 className="sw-title text-4xl lg:text-5xl tracking-[0.1em] leading-tight mb-6 drop-shadow-[0_0_14px_rgb(var(--sw-accent-rgb)/0.4)]">
                      RECRUE
                  </h2>
                  <p className="text-sw-dim text-xs uppercase tracking-[0.2em] leading-relaxed max-w-xs border-l-2 border-sw-accent/40 pl-4 py-2">
                      Rejoignez le conflit galactique. <br/>
                      Choisissez votre destin. <br/>
                      Dominez les étoiles.
                  </p>
              </div>

              <div className="relative space-y-4 mt-12">
                  <div className="sw-label text-[9px] text-sw-faint flex flex-col gap-1">
                      <span>:: PROTOCOL_V4.2 INITIALIZED</span>
                      <span>:: CONNECTION_SECURE</span>
                      <span>:: NODE_CORUSCANT_PRIME</span>
                  </div>
              </div>
          </SwPanel>

          {/* --- COLONNE DROITE : FORMULAIRE (60%) --- */}
          <div className="w-full lg:w-[60%] flex flex-col justify-center">

              {/* En-tête mobile */}
              <div className="lg:hidden mb-6 text-center">
                  <h2 className="sw-title text-3xl tracking-widest">Recrutement</h2>
              </div>

              <div className="hidden lg:flex sw-label text-sw-gold mb-6 items-center gap-2">
                  <span className="w-3 h-3 border border-sw-accent rounded-full block animate-pulse shadow-[0_0_6px_rgb(var(--sw-accent-rgb)/0.6)]"></span>
                  Initialisation du dossier
              </div>

              {error && (
                  <div className="mb-6 p-3 sw-panel-dark border-sw-error/70 text-sw-error text-xs flex items-center gap-3">
                      <span className="text-lg">⚠️</span> {error}
                  </div>
              )}

              <form onSubmit={handleRegister} className="space-y-5">

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className={inputContainerStyle}>
                          <SwLabel as="label" className={labelStyle}>Identifiant</SwLabel>
                          <SwInput
                              type="text"
                              placeholder="Nom de Guerre"
                              value={pseudo}
                              onChange={(e) => setPseudo(e.target.value)}
                              required
                              minLength={3}
                          />
                      </div>

                      <div className={inputContainerStyle}>
                          <SwLabel as="label" className={labelStyle}>Fréquence (Email)</SwLabel>
                          <SwInput
                              type="email"
                              placeholder="contact@holonet.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              required
                          />
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className={inputContainerStyle}>
                        <SwLabel as="label" className={labelStyle}>Style de Combat</SwLabel>
                        <SwInput
                            as="select"
                            value={combatStyle}
                            onChange={(e) => setCombatStyle(e.target.value)}
                            className="cursor-pointer"
                        >
                            <option value="melee">⚔️ Mêlée (Force/Sabre)</option>
                            <option value="shooter">🔫 Tireur (Blaster/Tech)</option>
                        </SwInput>
                    </div>

                    <div className={inputContainerStyle}>
                        <SwLabel as="label" className={labelStyle}>Domaine de Pouvoir</SwLabel>
                        <SwInput
                            as="select"
                            value={magicDomain}
                            onChange={(e) => setMagicDomain(e.target.value)}
                            className="cursor-pointer"
                        >
                            <option value="dark">🟣 Obscurité (Corruption/Peur)</option>
                            <option value="light">🔵 Lumière (Soin/Protection)</option>
                            <option value="mandalorian">🟠 Mandalorien (Gadgets/Tech)</option>
                        </SwInput>
                    </div>
                  </div>

                  <div className={inputContainerStyle}>
                      <SwLabel as="label" className={labelStyle}>Mot de Passe</SwLabel>
                      <SwInput
                          type="password"
                          placeholder="••••••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="tracking-widest"
                          required
                          minLength={6}
                      />
                  </div>

                  <div className={inputContainerStyle}>
                      <SwLabel as="label" className={labelStyle}>Code d&apos;Activation (Optionnel)</SwLabel>
                      <SwInput
                          type="text"
                          placeholder="Code admin..."
                          value={activationCode}
                          onChange={(e) => setActivationCode(e.target.value)}
                      />
                  </div>

                  <SwDivider className="mt-6" />

                  <div className="pt-2 flex flex-col md:flex-row items-center justify-between gap-5">
                      <div className="text-sw-dim text-xs order-2 md:order-1">
                          Déjà enregistré ?{' '}
                          <button
                              type="button"
                              onClick={onSwitchMode}
                              className="ml-1 text-sw-gold hover:text-white font-bold cursor-pointer uppercase tracking-wider transition-colors"
                          >
                              Connexion
                          </button>
                      </div>

                      <SwButton
                          type="submit"
                          variant="accent"
                          disabled={loading}
                          className={`order-1 md:order-2 w-full md:w-auto px-10 ${loading ? 'cursor-wait' : ''}`}
                      >
                          {loading ? "TRAITEMENT..." : "INITIALISER"}
                      </SwButton>
                  </div>
              </form>
          </div>
      </SwWindow>
    </main>
  );
}
