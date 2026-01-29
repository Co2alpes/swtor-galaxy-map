"use client";

import { useState, useEffect, useRef } from 'react';

const TRACKS = {
  menu: '/audio/menu_theme.mp3', // Musique pour Login, Inscription, Choix Faction
  game: '/audio/game_theme.mp3', // Musique pour la GalaxyMap
};

export default function MusicManager({ mode = 'menu', autoPlay = false }) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [volume, setVolume] = useState(0.3);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);

  // Initialisation de l'objet Audio
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.loop = true;
    
    // Tenter de lancer la musique automatiquement (peut être bloqué par le navigateur)
    // On mettra un bouton pour autoriser si besoin
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Gestion du changement de piste et du volume
  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    
    // Si on change de mode (menu <-> game), on change la source
    const targetSrc = TRACKS[mode];
    
    // Si la source est différente de celle en cours (ou si c'est le premier chargement)
    // Note: audio.src renvoie l'URL complète (http://...), targetSrc est relative.
    // On vérifie simplement si la fin correspond.
    if (!audio.src.endsWith(targetSrc) || (autoPlay && audio.paused)) {
        const wasPlaying = !audio.paused || autoPlay;
        
        // Petit fade-out manuel (optionnel, ici on coupe direct pour simplifier)
        audio.src = targetSrc;
        audio.volume = isMuted ? 0 : volume;

        // Si c'était déjà en lecture ou si l'état local dit "isPlaying", on tente de relancer
        if (isPlaying || autoPlay) {
            audio.play().catch(e => {
                console.warn("Autoplay bloqué, attente interaction utilisateur:", e);
                setIsPlaying(false);
            });
            if (autoPlay && !isPlaying) setIsPlaying(true);
        }
    }
  }, [mode, isPlaying, autoPlay]);

  // Gestion du volume et mute
  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
    } else {
        audioRef.current.src = TRACKS[mode]; // S'assure que la source est bien set
        audioRef.current.play()
            .then(() => setIsPlaying(true))
            .catch(e => console.error("Erreur lecture:", e));
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-black/80 backdrop-blur-md border border-yellow-600/30 p-2 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-opacity duration-300 hover:opacity-100 opacity-50">
        
        {/* BOUTON PLAY/PAUSE */}
        <button 
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-yellow-900/20 border border-yellow-600/50 flex items-center justify-center text-yellow-500 hover:bg-yellow-600 hover:text-black transition-all"
        >
            {isPlaying ? (
                // Pause Icon
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
            ) : (
                // Play Icon
                <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            )}
        </button>

        {/* CONTAINER VOLUME (Affiché au survol ou toujours) */}
        <div className="flex items-center gap-2 px-2 hidden md:flex">
            <button onClick={() => setIsMuted(!isMuted)} className="text-yellow-600 hover:text-yellow-400">
                {isMuted ? (
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9l6 6m-6 0l6-6" /></svg>
                ) : (
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 0 1 0 7.072m2.828-9.9a9 9 0 0 1 0 14.142M5.586 15H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                )}
            </button>
            
            <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                value={isMuted ? 0 : volume} 
                onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                    if (isMuted && parseFloat(e.target.value) > 0) setIsMuted(false);
                }}
                className="w-20 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-yellow-600 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-yellow-400"
            />
        </div>

        {/* INFO TRACK */}
        <div className="text-[10px] font-mono text-yellow-600/80 uppercase tracking-widest px-2 border-l border-yellow-900/30 hidden lg:block">
            {mode === 'menu' ? ':: MENU FREQUENCY' : ':: BATTLE NETWORK'}
        </div>
    </div>
  );
}
