"use client";

import { useState, useEffect, useRef } from 'react';

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

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col items-end gap-2 group">
        
        {/* PLAYLIST POPUP */}
        {showPlaylist && (
            <div className="bg-black/90 backdrop-blur-md border border-yellow-600/30 rounded-lg p-2 mb-2 w-64 shadow-[0_0_20px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-2">
                <div className="flex justify-between items-center px-2 pb-2 mb-2 border-b border-yellow-900/30">
                    <span className="text-[10px] font-bold uppercase text-yellow-600 tracking-widest">Liste de Lecture</span>
                    <button onClick={() => setShowPlaylist(false)} className="text-gray-500 hover:text-white text-xs">✕</button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                    {currentPlaylist.map((track, idx) => (
                        <button 
                            key={idx}
                            onClick={() => { 
                                setCurrentTrackIndex(idx); 
                                setIsPlaying(true); 
                                // setShowPlaylist(false); // Optional: close on select
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded text-[10px] uppercase font-bold tracking-wider transition-all flex items-center gap-2
                                ${idx === currentTrackIndex 
                                    ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-600/20' 
                                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                                }`}
                        >
                            <span className="w-4 text-center opacity-50">{idx + 1}.</span>
                            <span className="truncate flex-grow">{track.title}</span>
                            {idx === currentTrackIndex && isPlaying && (
                                <span className="animate-pulse text-yellow-500">▶</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        )}

        <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md border border-yellow-600/30 p-2 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-opacity duration-300 group-hover:opacity-100 opacity-50 hover:bg-black/90">
        
        {/* PLAYLIST TOGGLE BUTTON */}
        <button 
            onClick={() => setShowPlaylist(!showPlaylist)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${showPlaylist ? 'bg-yellow-900/40 text-yellow-400' : 'bg-transparent text-yellow-700 hover:text-yellow-500 hover:bg-yellow-900/20'}`}
            title="Liste de lecture"
        >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M4 10h12v2H4zm0-4h12v2H4zm0 8h8v2H4zM20 6v12l-6-6z"/></svg>
        </button>

        <div className="w-px h-6 bg-yellow-900/30 mx-1"></div>

        {/* PREV */}
        {currentPlaylist.length > 1 && (
             <button 
                onClick={playPrev}
                className="w-8 h-8 rounded-full bg-transparent hover:bg-yellow-900/20 text-yellow-600 hover:text-yellow-400 flex items-center justify-center transition-all"
            >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
            </button>
        )}

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

         {/* NEXT */}
        {currentPlaylist.length > 1 && (
             <button 
                onClick={playNext}
                className="w-8 h-8 rounded-full bg-transparent hover:bg-yellow-900/20 text-yellow-600 hover:text-yellow-400 flex items-center justify-center transition-all"
            >
                 <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </button>
        )}

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
        <div className="flex flex-col justify-center px-3 border-l border-yellow-900/30 hidden lg:flex min-w-[120px]">
            <span className="text-[8px] font-mono text-yellow-700 uppercase tracking-widest">
                {mode === 'menu' ? ':: MENU FREQ.' : ':: BATTLE NET.'}
            </span>
            <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider truncate max-w-[150px]">
                {currentTrack.title}
            </span>
        </div>
      </div>
    </div>
  );
}
