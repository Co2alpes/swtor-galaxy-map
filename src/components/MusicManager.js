"use client";

import { useState, useEffect, useRef } from 'react';
import { SwGlass } from './ui/Swtor';

// Configuration des pistes audio (Listes de lecture)
const PLAYLISTS = {
  menu: [
    { title: "Main Theme", src: '/audio/menu_theme.mp3' },
    // A titre d'exemple, on peut dupliquer ou ajouter d'autres ici
  ],
  game: [
    { title: "Star Wars Darth Revan Theme", src: '/audio/Star Wars Darth Revan Theme  EPIC VERSION.mp3' },
    { title: "Star Wars Valkorion Theme", src: '/audio/Star Wars Valkorion Theme (Darth VitiateTenebrae)  EPIC VERSION (Knights of the Fallen Empire).mp3' },
    { title: "Star Wars Jedi Theme", src: '/audio/Jedi Theme  EPIC VERSION.mp3' },
    { title: "Star Wars Mandalorian War Chant", src: '/audio/Star Wars Mandalorian War Chant (Gratua Cuun x Karta Tor)  EPIC VERSION.mp3' },

  ],
};

export default function MusicManager({ mode = 'menu', autoPlay = false }) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [volume, setVolume] = useState(0.3);
  const [isMuted, setIsMuted] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false); // NEW: State for playlist visibility
  const audioRef = useRef(null);

  // Récupère la playlist actuelle selon le mode
  const currentPlaylist = PLAYLISTS[mode] || PLAYLISTS.menu;
  const currentTrack = currentPlaylist[currentTrackIndex] || currentPlaylist[0];

  // Initialisation de l'objet Audio
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.loop = false; // On gère le loop manuellement via playNext
    
    // Tenter de lancer la musique automatiquement (peut être bloqué par le navigateur)
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Gestion de la fin de piste (Autoplay Next)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
        playNext();
    };

    audio.addEventListener('ended', handleEnded);
    return () => {
        audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrackIndex, mode]);

  // Gestion du changement de piste
  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    const targetSrc = currentTrack.src;
    
    // Si la piste est différente de celle en cours
    if (!audio.src.endsWith(targetSrc)) {
         audio.src = targetSrc;
         audio.volume = isMuted ? 0 : volume;
         
         // 1. Si on était déjà en lecture, on continue la nouvelle piste
         // 2. Si autoPlay est activé, on force la lecture
         const shouldPlay = autoPlay || isPlaying;
         if (shouldPlay) {
            if (!isPlaying) setIsPlaying(true);
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.warn("Autoplay bloqué:", e);
                    setIsPlaying(false);
                });
            }
         }
    }
  }, [currentTrack]); // Déclenché uniquement au changement de piste

  // Synchronisation État React <-> Élément Audio (Play/Pause)
  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    if (isPlaying) {
        if (audio.paused) {
            const p = audio.play();
            if (p !== undefined) p.catch(e => console.error("Erreur lecture:", e));
        }
    } else {
        if (!audio.paused) {
            audio.pause();
        }
    }
  }, [isPlaying]);

  // Reset index si changement de mode
  useEffect(() => {
      setCurrentTrackIndex(0);
      setIsPlaying(autoPlay); // Reset to autoplay preference on mode switch
  }, [mode]);

  // Gestion du volume et mute
  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

    
  const playNext = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % currentPlaylist.length);
    setIsPlaying(true);
  };

  const playPrev = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + currentPlaylist.length) % currentPlaylist.length);
    setIsPlaying(true);
  };

  // Petits boutons icônes du lecteur (tokens SWTOR)
  const iconBtn = "w-8 h-8 rounded-[3px] flex items-center justify-center cursor-pointer transition-all text-sw-dim hover:text-sw-gold hover:bg-sw-panel-light/70";

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col items-end gap-2 group">

        {/* PLAYLIST POPUP */}
        {showPlaylist && (
            <SwGlass className="p-2 pl-3 mb-1 w-64 shadow-[0_0_20px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-2">
                <div className="flex justify-between items-center px-1 pb-2 mb-2 border-b border-sw-border">
                    <span className="sw-label text-[10px] text-sw-gold">Liste de Lecture</span>
                    <button onClick={() => setShowPlaylist(false)} aria-label="Fermer" className="sw-close scale-75"></button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1 sw-scroll">
                    {currentPlaylist.map((track, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                setCurrentTrackIndex(idx);
                                setIsPlaying(true);
                                // setShowPlaylist(false); // Optional: close on select
                            }}
                            data-active={idx === currentTrackIndex ? 'true' : undefined}
                            className={`sw-row w-full text-left px-2 py-1.5 text-[10px] uppercase font-bold tracking-wider flex items-center gap-2 cursor-pointer
                                ${idx === currentTrackIndex
                                    ? 'text-sw-gold'
                                    : 'text-sw-dim hover:text-sw-text'
                                }`}
                        >
                            <span className="w-4 text-center opacity-50">{idx + 1}.</span>
                            <span className="truncate flex-grow">{track.title}</span>
                            {idx === currentTrackIndex && isPlaying && (
                                <span className="animate-pulse text-sw-accent">▶</span>
                            )}
                        </button>
                    ))}
                </div>
            </SwGlass>
        )}

        <SwGlass className="flex items-center gap-1.5 py-1.5 pl-3 pr-2 shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-opacity duration-300 group-hover:opacity-100 opacity-60">

        {/* PLAYLIST TOGGLE BUTTON */}
        <button
            onClick={() => setShowPlaylist(!showPlaylist)}
            className={`${iconBtn} ${showPlaylist ? 'text-sw-gold! bg-sw-accent/15' : ''}`}
            title="Liste de lecture"
        >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M4 10h12v2H4zm0-4h12v2H4zm0 8h8v2H4zM20 6v12l-6-6z"/></svg>
        </button>

        <div className="w-px h-6 bg-sw-border mx-1"></div>

        {/* PREV */}
        {currentPlaylist.length > 1 && (
             <button
                onClick={playPrev}
                className={iconBtn}
            >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
            </button>
        )}

        {/* BOUTON PLAY/PAUSE */}
        <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full border border-sw-accent/60 bg-sw-accent/10 flex items-center justify-center text-sw-accent-light cursor-pointer transition-all hover:bg-sw-accent/25 hover:text-sw-gold shadow-[0_0_8px_rgb(var(--sw-accent-rgb)/0.35)]"
        >
            {isPlaying ? (
                // Pause Icon
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
            ) : (
                // Play Icon
                <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            )}
        </button>

         {/* NEXT */}
        {currentPlaylist.length > 1 && (
             <button
                onClick={playNext}
                className={iconBtn}
            >
                 <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </button>
        )}

        {/* CONTAINER VOLUME (Affiché au survol ou toujours) */}
        <div className="flex items-center gap-2 px-2 hidden md:flex">
            <button onClick={() => setIsMuted(!isMuted)} className="text-sw-dim hover:text-sw-gold cursor-pointer transition-colors">
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
                className="w-20 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--sw-accent)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-sw-accent [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_6px_var(--sw-accent)] hover:[&::-webkit-slider-thumb]:bg-sw-gold"
            />
        </div>

        {/* INFO TRACK */}
        <div className="flex flex-col justify-center px-3 border-l border-sw-border hidden lg:flex min-w-[120px]">
            <span className="sw-label text-[8px] text-sw-faint">
                {mode === 'menu' ? ':: MENU FREQ.' : ':: BATTLE NET.'}
            </span>
            <span className="text-[10px] font-bold text-sw-gold uppercase tracking-wider truncate max-w-[150px]">
                {currentTrack.title}
            </span>
        </div>
      </SwGlass>
    </div>
  );
}
