"use client";

import { useState, useEffect, useRef } from 'react';

// --- SYSTÈME SONORE ---
const playSound = (type) => {
    // const audio = new Audio(`/sounds/${type}.mp3`);
    // audio.volume = 0.2;
    // audio.play().catch(e => {});
};

export default function ResearchMinigame({ techType, onWin, onClose }) {
    const [selectedGame, setSelectedGame] = useState(null);
    
    // --- 1. DÉFINITION DES CATÉGORIES (Listes élargies) ---
    
    // BIOLOGIE / FORCE (Affiche le Menu)
    const bioKeywords = ['force', 'force_nexus', 'cloning', 'biology', 'medical', 'jedi', 'sith', 'genetics', 'life', 'organic'];
    
    // MILITAIRE / ÉLECTRICITÉ (Jeu : Résonance Harmonique)
    const elecKeywords = ['military', 'defense', 'weapons', 'energy', 'tactics', 'war', 'physics', 'electricity', 'lasers', 'plasma', 'shield', 'power'];
    
    // ÉCONOMIE / DONNÉES (Jeu : Minage Quantique)
    const ecoKeywords = ['economy', 'trade', 'management', 'money', 'finance', 'data', 'production', 'mining', 'network', 'cybernetics', 'computing', 'ai', 'algorithm', 'credits'];

    // --- 2. LOGIQUE DE DÉCISION ROBUSTE ---
    useEffect(() => {
        const type = techType.toLowerCase(); // Pour éviter les soucis de majuscules

        // Vérification de quel tableau contient le type
        const isBio = bioKeywords.some(k => type.includes(k));
        const isElec = elecKeywords.some(k => type.includes(k));
        const isEco = ecoKeywords.some(k => type.includes(k));

        if (isBio) {
            // Pour le Bio, on ne set PAS de jeu tout de suite (reste null), 
            // ce qui déclenchera l'affichage du menu de sélection ci-dessous.
            setSelectedGame(null); 
        } 
        else if (isEco) {
            setSelectedGame('economy'); // Priorité absolue sur le circuit
        } 
        else if (isElec) {
            setSelectedGame('electricity');
        } 
        else {
            // Si AUCUN mot clé ne matche, alors seulement on met le Circuit
            setSelectedGame('circuit');
        }
    }, [techType]);

    // --- 3. ÉCRAN DE SÉLECTION (UNIQUEMENT POUR BIO/FORCE) ---
    // On affiche ceci seulement si selectedGame est null (donc isBio était vrai)
    if (selectedGame === null) {
        // Petit hack visuel : si on est en train de charger ou si c'est pas bio mais que le state n'est pas encore jour
        // On vérifie une dernière fois si c'est bien bio pour afficher le menu, sinon on affiche rien en attendant le useEffect
        const type = techType.toLowerCase();
        if (!bioKeywords.some(k => type.includes(k))) return null;

        return (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
                <div className="w-full max-w-4xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-8 relative overflow-hidden">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition">✕ FERMER</button>
                    
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 uppercase tracking-widest mb-2">
                            Protocole Biologique
                        </h2>
                        <p className="text-gray-400 text-sm font-mono">Niveau de sécurité : <span className="text-red-500 font-bold">EXTRÊME</span>. Choisissez votre approche.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        {/* Choix 1 */}
                        <button 
                            onClick={() => setSelectedGame('dna_linear')}
                            className="group relative h-72 bg-black/50 border border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center hover:bg-gray-800 transition-all hover:border-purple-500 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]"
                        >
                            <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">🧬</div>
                            <h3 className="text-xl font-bold text-white uppercase tracking-widest mb-2">Séquenceur Amnésique</h3>
                            <p className="text-xs text-gray-500 text-center font-mono leading-relaxed">
                                Analyse verticale.<br/>
                                <span className="text-purple-400 font-bold">Effet : Perte de données historique.</span>
                            </p>
                        </button>

                        {/* Choix 2 */}
                        <button 
                            onClick={() => setSelectedGame('dna_circular')}
                            className="group relative h-72 bg-black/50 border border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center hover:bg-gray-800 transition-all hover:border-green-500 hover:shadow-[0_0_30px_rgba(34,197,94,0.3)]"
                        >
                            <div className="text-6xl mb-4 group-hover:rotate-90 transition-transform duration-700">☣️</div>
                            <h3 className="text-xl font-bold text-white uppercase tracking-widest mb-2">Réacteur Aveugle</h3>
                            <p className="text-xs text-gray-500 text-center font-mono leading-relaxed">
                                Puzzle Gyroscopique.<br/>
                                <span className="text-green-400 font-bold">Effet : Brouillage latéral visuel.</span>
                            </p>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- 4. CONFIGURATION DU JEU ACTIF ---
    let GameComponent = null;
    let title = "";
    let colorClass = "";
    let description = "";

    switch (selectedGame) {
        case 'dna_linear':
            GameComponent = InfiniteDNA;
            title = "Helix : Amnesia Protocol";
            colorClass = "bg-purple-500 shadow-[0_0_10px_purple]";
            description = "L'historique se corrompt. Mémorisez les séquences passées.";
            break;
        case 'dna_circular':
            GameComponent = PlasmidPuzzleBlind;
            title = "Plasmid : Blind Sector";
            colorClass = "bg-green-500 shadow-[0_0_10px_lime]";
            description = "Interférences visuelles sur les flancs. Rotation couplée.";
            break;
        case 'electricity':
            GameComponent = HarmonicResonance;
            title = "Harmonic Resonance";
            colorClass = "bg-yellow-400 shadow-[0_0_10px_yellow]";
            description = "Calibrez la fréquence et la phase pour stabiliser le signal.";
            break;
        case 'economy':
            GameComponent = CryptoMining;
            title = "Quantum Mining";
            colorClass = "bg-emerald-400 shadow-[0_0_10px_emerald]";
            description = "Identifiez et validez les blocs de hachage instables.";
            break;
        case 'circuit':
        default:
            GameComponent = PCBPathfinder;
            title = "PCB : Blackout";
            colorClass = "bg-cyan-500 shadow-[0_0_10px_cyan]";
            description = "Panne secteur. Rétablissez le courant à l'aveugle.";
    }

    // --- RENDER PRINCIPAL ---
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-500 perspective-2000">
            <div className="w-full max-w-[1400px] h-[90vh] bg-gray-950/80 border border-gray-800 rounded-xl shadow-2xl relative flex overflow-hidden">
                
                {/* SIDEBAR */}
                <div className="w-72 bg-gray-900/90 backdrop-blur-md border-r border-gray-700 p-6 flex flex-col justify-between shrink-0 z-30 shadow-2xl">
                    <div>
                        <h2 className="text-white font-bold uppercase tracking-widest text-xl mb-1 text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-400">{title}</h2>
                        <div className={`h-1 w-10 mb-6 ${colorClass}`}></div>
                        <p className="text-gray-300 text-xs leading-relaxed font-mono border-l-2 border-white pl-2 mb-4">{description}</p>
                        
                        {/* Légendes Spécifiques */}
                        {selectedGame === 'dna_circular' && (
                            <div className="text-[10px] text-center border-t border-gray-700 pt-2 text-gray-400">
                                <p>Cibles : <span className="text-red-400">A-T</span> | <span className="text-blue-400">C-G</span></p>
                                <p>Clic Droit = Rotation Inverse</p>
                            </div>
                        )}
                        {selectedGame === 'electricity' && (
                            <div className="text-[10px] text-yellow-500 text-center border-t border-gray-700 pt-2">
                                Superposez la ligne VERTE sur la ligne JAUNE.
                            </div>
                        )}
                        {selectedGame === 'economy' && (
                            <div className="text-[10px] text-emerald-500 text-center border-t border-gray-700 pt-2">
                                Cliquez sur le code correspondant à la CIBLE.
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-3">
                        {/* Bouton retour seulement si c'était un choix Bio */}
                        {bioKeywords.some(k => techType.toLowerCase().includes(k)) && (
                            <button onClick={() => setSelectedGame(null)} className="px-4 py-3 border border-gray-600 text-gray-400 text-xs font-bold uppercase hover:bg-gray-800 hover:text-white transition-colors flex items-center justify-center gap-2">
                                <span>↺</span> Changer
                            </button>
                        )}
                        <button onClick={onClose} className="group relative px-4 py-3 border border-red-800 text-red-500 text-xs font-bold uppercase tracking-widest overflow-hidden hover:text-white transition-colors">
                            <span className="absolute inset-0 w-full h-full bg-red-900/50 -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></span>
                            <span className="relative">Abandonner</span>
                        </button>
                    </div>
                </div>

                {/* ZONE DE JEU */}
                <div className="flex-grow relative bg-black flex items-center justify-center overflow-hidden" style={{ transformStyle: 'preserve-3d' }}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a2e_0%,_#000000_80%)] -z-20"></div>
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] -z-10"></div>
                    {GameComponent && <GameComponent onWin={onWin} onClose={onClose} />}
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// JEU 1 : INFINITE DNA (HARDCORE : AMNÉSIE)
// ============================================================================
function InfiniteDNA({ onWin }) {
    const SEQUENCE_LENGTH = 8; 
    const MAX_ATTEMPTS = 12;
    
    const BASES = {
        'A': { code: 'A', color: 'bg-red-600', shadow: 'shadow-red-500' },
        'C': { code: 'C', color: 'bg-blue-600', shadow: 'shadow-blue-500' },
        'G': { code: 'G', color: 'bg-green-600', shadow: 'shadow-green-500' },
        'T': { code: 'T', color: 'bg-yellow-500', shadow: 'shadow-yellow-500' }
    };
    const BASE_KEYS = ['A', 'C', 'G', 'T'];

    const [secretCode, setSecretCode] = useState([]);
    const [history, setHistory] = useState([]); 
    const [currentInput, setCurrentInput] = useState(Array(SEQUENCE_LENGTH).fill(null));
    const [status, setStatus] = useState('playing'); 
    const scrollRef = useRef(null);

    useEffect(() => {
        setSecretCode(Array.from({ length: SEQUENCE_LENGTH }, () => BASE_KEYS[Math.floor(Math.random() * 4)]));
    }, []);

    useEffect(() => { if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [history]);

    const handleInput = (base) => {
        if (status !== 'playing') return;
        const newInput = [...currentInput];
        const firstEmpty = newInput.findIndex(x => x === null);
        if (firstEmpty !== -1) { newInput[firstEmpty] = base; setCurrentInput(newInput); playSound('click'); }
    };

    const handleBackspace = () => {
        if (status !== 'playing') return;
        const newInput = [...currentInput];
        let lastFilled = -1;
        for(let i = SEQUENCE_LENGTH-1; i >= 0; i--) { if(newInput[i] !== null) { lastFilled = i; break; } }
        if (lastFilled !== -1) { newInput[lastFilled] = null; setCurrentInput(newInput); }
    };

    const handleSubmit = () => {
        if (currentInput.includes(null)) return;
        
        const results = Array(SEQUENCE_LENGTH).fill('wrong');
        const tempSecret = [...secretCode];
        const tempInput = [...currentInput];
        let correctCount = 0;

        for (let i = 0; i < SEQUENCE_LENGTH; i++) {
            if (tempInput[i] === tempSecret[i]) { results[i] = 'correct'; tempSecret[i] = null; tempInput[i] = null; correctCount++; }
        }
        for (let i = 0; i < SEQUENCE_LENGTH; i++) {
            if (tempInput[i] !== null) {
                const foundIdx = tempSecret.indexOf(tempInput[i]);
                if (foundIdx !== -1) { results[i] = 'misplaced'; tempSecret[foundIdx] = null; }
            }
        }

        const newHistory = [...history, { input: currentInput, results }];
        setHistory(newHistory);
        setCurrentInput(Array(SEQUENCE_LENGTH).fill(null));

        if (correctCount === SEQUENCE_LENGTH) {
            setStatus('won'); setTimeout(onWin, 2000);
        } else if (newHistory.length >= MAX_ATTEMPTS) {
            setStatus('lost');
        }
    };

    return (
        <div className="w-full h-full flex flex-col items-center p-4 relative">
            <div ref={scrollRef} className="flex-grow w-full max-w-3xl overflow-y-auto custom-scrollbar mb-4 bg-black/40 border border-gray-800 rounded-lg p-4 relative">
                
                <div className="text-center text-gray-500 text-xs mb-4 font-mono uppercase animate-pulse">
                    ⚠️ Données corrompues. Rétention : 2 cycles. ⚠️
                </div>

                {history.map((step, idx) => {
                    const isVisible = idx >= history.length - 2; 
                    return (
                        <div key={idx} className={`flex items-center gap-2 mb-2 p-2 rounded border transition-opacity duration-500 ${isVisible ? 'bg-gray-900/50 border-gray-700 opacity-100' : 'bg-black border-transparent opacity-20 blur-[2px]'}`}>
                            <span className="text-gray-500 font-mono w-6">#{idx+1}</span>
                            {step.input.map((base, i) => (
                                <div key={i} className="flex flex-col items-center gap-1">
                                    <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-white ${isVisible ? BASES[base].color : 'bg-gray-800 text-transparent'}`}>{base}</div>
                                    {isVisible && <div className={`w-2 h-2 rounded-full ${step.results[i] === 'correct' ? 'bg-green-500' : step.results[i] === 'misplaced' ? 'bg-yellow-500' : 'bg-gray-800'}`}></div>}
                                </div>
                            ))}
                        </div>
                    );
                })}
                {status === 'playing' && (
                    <div className="flex items-center gap-2 p-2 bg-blue-900/20 rounded border border-blue-500/50 animate-pulse">
                        <span className="text-blue-400 font-mono w-6">#{history.length+1}</span>
                        {currentInput.map((base, i) => (
                            <div key={i} className={`w-8 h-8 rounded flex items-center justify-center font-bold border-2 ${base ? `${BASES[base].color} border-transparent text-white` : 'border-gray-600 text-gray-500'}`}>{base || '?'}</div>
                        ))}
                    </div>
                )}
                {status === 'won' && <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20"><div className="text-green-400 text-4xl font-bold uppercase tracking-widest animate-bounce">Séquençage Terminé</div></div>}
                {status === 'lost' && <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20 flex-col"><div className="text-red-500 text-3xl font-bold uppercase tracking-widest">Échec</div><div className="text-gray-400 mt-2">Solution : {secretCode.join('')}</div></div>}
            </div>
            <div className="flex gap-4">
                {BASE_KEYS.map(key => (
                    <button key={key} onClick={() => handleInput(key)} disabled={status !== 'playing'} className={`w-16 h-16 rounded-lg text-2xl font-bold text-white ${BASES[key].color} transition-transform active:scale-95 shadow-lg`}>{key}</button>
                ))}
                <div className="w-px bg-gray-700 mx-2"></div>
                <div className="flex flex-col gap-2">
                    <button onClick={handleBackspace} className="px-4 py-1 bg-gray-700 text-white rounded uppercase text-xs font-bold">Effacer</button>
                    <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded uppercase text-xs font-bold shadow-lg hover:bg-blue-500">Analyser</button>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// JEU 2 : PLASMID PUZZLE (HARDCORE : BROUILLAGE)
// ============================================================================
function PlasmidPuzzleBlind({ onWin }) {
    const SEGMENTS = 12; 
    const RINGS_COUNT = 4;
    
    const BASES = ['A', 'C', 'G', 'T'];
    const PAIRS = { 'A': 'T', 'T': 'A', 'C': 'G', 'G': 'C' };
    const STYLES = { 
        'A': 'bg-red-900 border-red-500 text-red-100', 
        'C': 'bg-blue-900 border-blue-500 text-blue-100', 
        'G': 'bg-green-900 border-green-500 text-green-100', 
        'T': 'bg-yellow-900 border-yellow-500 text-yellow-100',
        '?': 'bg-gray-800 border-gray-600 text-gray-500 animate-pulse'
    };

    const [rings, setRings] = useState([]);
    const [rotations, setRotations] = useState([0, 0, 0, 0]);
    const [status, setStatus] = useState('loading');
    const [glitchChar, setGlitchChar] = useState('?');

    const TARGET_ANGLES = [0, 3, 6, 9]; 

    useEffect(() => {
        const interval = setInterval(() => {
            const chars = ['?', '#', '%', 'Ø', 'ERR'];
            setGlitchChar(chars[Math.floor(Math.random() * chars.length)]);
        }, 200);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const r1 = Array.from({ length: SEGMENTS }, () => BASES[Math.floor(Math.random() * 4)]);
        const r2 = r1.map(b => PAIRS[b]); 
        const r3 = r2.map(b => PAIRS[b]); 
        const r4 = r3.map(b => PAIRS[b]); 
        const newRings = [r1, r2, r3, r4];
        
        const startRots = newRings.map(() => Math.floor(Math.random() * 12) * 30);
        setRings(newRings);
        setRotations(startRots);
        setStatus('playing');
    }, []);

    useEffect(() => { if(status === 'playing') checkWin(); }, [rotations]);

    const rotateRing = (e, index, dir) => {
        e.preventDefault(); e.stopPropagation();
        if(status !== 'playing' || index === 0) return;
        playSound('click');
        setRotations(prev => {
            const next = [...prev];
            next[index] += dir * 30;
            // Couplage mécanique
            if(index + 1 < RINGS_COUNT) next[index+1] -= dir * 30;
            return next;
        });
    };

    const getBaseAt = (rIdx, posIdx) => {
        const steps = Math.round(rotations[rIdx] / 30);
        const idx = (posIdx - steps) % SEGMENTS;
        const normalized = idx < 0 ? idx + SEGMENTS : idx;
        return rings[rIdx][normalized];
    };

    const checkWin = () => {
        if(rings.length === 0) return;
        let win = true;

        for(let pos of TARGET_ANGLES) {
            const b1 = getBaseAt(0, pos);
            const b2 = getBaseAt(1, pos);
            const b3 = getBaseAt(2, pos);
            const b4 = getBaseAt(3, pos);

            if (PAIRS[b1] !== b2) win = false;
            if (PAIRS[b2] !== b3) win = false;
            if (PAIRS[b3] !== b4) win = false;
        }
        
        if(win) { setStatus('won'); playSound('success'); setTimeout(onWin, 1500); }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full relative select-none">
            
            {/* ZONES DE BROUILLAGE (Est/Ouest) */}
            <div className="absolute top-0 bottom-0 left-0 w-[30%] bg-gradient-to-r from-black via-black/80 to-transparent z-20 pointer-events-none flex items-center justify-center">
                <div className="text-gray-800 text-9xl font-black opacity-20 rotate-90 tracking-widest">ERROR</div>
            </div>
            <div className="absolute top-0 bottom-0 right-0 w-[30%] bg-gradient-to-l from-black via-black/80 to-transparent z-20 pointer-events-none flex items-center justify-center">
                <div className="text-gray-800 text-9xl font-black opacity-20 -rotate-90 tracking-widest">ERROR</div>
            </div>

            <div className="absolute w-[2px] h-[600px] bg-green-500/30 z-0 shadow-[0_0_10px_lime]"></div>
            <div className="absolute top-4 text-green-500 font-mono text-xs animate-pulse font-bold bg-black px-2">SCANNER NORD</div>
            <div className="absolute bottom-4 text-green-500 font-mono text-xs animate-pulse font-bold bg-black px-2">SCANNER SUD</div>

            <div className="relative w-[560px] h-[560px] flex items-center justify-center rounded-full bg-black border-4 border-gray-800 shadow-2xl">
                {rings.map((ringData, rIdx) => {
                    const size = (rIdx + 1) * 130 + 40; 
                    const zIndex = 10 - rIdx;
                    return (
                        <div 
                            key={rIdx}
                            className={`absolute rounded-full border-2 border-dashed flex items-center justify-center transition-transform duration-300 ease-out ${rIdx === 0 ? 'border-gray-700 bg-gray-900' : 'border-gray-600 hover:border-green-400 cursor-pointer'} ${status === 'won' ? 'border-green-400 shadow-[0_0_20px_lime]' : ''}`}
                            style={{ width: `${size}px`, height: `${size}px`, zIndex: zIndex, transform: `rotate(${rotations[rIdx]}deg)` }}
                            onClick={(e) => rotateRing(e, rIdx, 1)}
                            onContextMenu={(e) => rotateRing(e, rIdx, -1)}
                        >
                            {ringData.map((val, sIdx) => {
                                const angle = sIdx * 30;
                                let currentAbsAngle = (angle + rotations[rIdx]) % 360;
                                if (currentAbsAngle < 0) currentAbsAngle += 360;
                                const isNorth = currentAbsAngle > 330 || currentAbsAngle < 30;
                                const isSouth = currentAbsAngle > 150 && currentAbsAngle < 210;
                                const isVisible = isNorth || isSouth || status === 'won';

                                return (
                                    <div key={sIdx} className="absolute top-0 left-1/2 -ml-4 origin-bottom" style={{ height: '50%', transform: `rotate(${angle}deg)` }}>
                                        <div 
                                            className={`w-8 h-8 -mt-4 rounded-full border flex items-center justify-center font-bold text-sm shadow-md ${isVisible ? STYLES[val] : STYLES['?']}`} 
                                            style={{ transform: `rotate(${-rotations[rIdx] - angle}deg)` }}
                                        >
                                            {isVisible ? val : glitchChar}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
                <div className="absolute w-24 h-24 bg-gray-900 rounded-full border-4 border-green-500 flex items-center justify-center z-20 shadow-[0_0_30px_green]"><span className="text-4xl">☢️</span></div>
            </div>
            {status === 'won' && <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-50 backdrop-blur-sm animate-in zoom-in"><div className="bg-green-900/90 border-2 border-green-400 p-8 rounded-xl text-center shadow-2xl"><h3 className="text-3xl font-bold text-green-100 uppercase tracking-widest mb-2">Plasmide Stabilisé</h3></div></div>}
        </div>
    );
}

// ============================================================================
// JEU 3 : HARMONIC RESONANCE (Militaire/Élec)
// ============================================================================
function HarmonicResonance({ onWin }) {
    const [targetFreq, setTargetFreq] = useState(2);
    const [targetAmp, setTargetAmp] = useState(50);
    const [targetPhase, setTargetPhase] = useState(0);
    const [userFreq, setUserFreq] = useState(1);
    const [userAmp, setUserAmp] = useState(20);
    const [userPhase, setUserPhase] = useState(0);
    const [stability, setStability] = useState(0); 
    const [status, setStatus] = useState('playing');
    const canvasRef = useRef(null);
    const timeRef = useRef(0);

    useEffect(() => {
        setTargetFreq(1 + Math.random() * 3);
        setTargetAmp(30 + Math.random() * 40);
        setTargetPhase(Math.random() * Math.PI * 2);
    }, []);

    useEffect(() => {
        if (status !== 'playing') return;
        let animationFrameId;
        const render = () => {
            timeRef.current += 0.05;
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;
            const centerY = height / 2;

            ctx.clearRect(0, 0, width, height);

            // Cible (Jaune fantôme)
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)'; 
            ctx.lineWidth = 4;
            ctx.setLineDash([5, 5]); 
            for (let x = 0; x < width; x++) {
                const y = centerY + Math.sin((x * 0.02 * targetFreq) + targetPhase + timeRef.current) * targetAmp;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.setLineDash([]); 

            // Joueur (Vert/Rouge)
            ctx.beginPath();
            const diff = Math.abs(userFreq - targetFreq) + Math.abs(userAmp - targetAmp)/20 + Math.abs(userPhase - targetPhase);
            const isClose = diff < 1.0;
            
            ctx.strokeStyle = isClose ? '#4ade80' : '#f87171'; 
            ctx.lineWidth = 3;
            ctx.shadowBlur = 10;
            ctx.shadowColor = ctx.strokeStyle;
            
            for (let x = 0; x < width; x++) {
                const y = centerY + Math.sin((x * 0.02 * userFreq) + userPhase + timeRef.current) * userAmp;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;

            if (isClose) {
                setStability(prev => Math.min(100, prev + 0.4)); 
            } else {
                setStability(prev => Math.max(0, prev - 0.3)); 
            }

            if (Math.random() > 0.96) setTargetPhase(p => p + (Math.random() - 0.5) * 0.2);

            animationFrameId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, [userFreq, userAmp, userPhase, targetFreq, targetAmp, targetPhase, status]);

    useEffect(() => {
        if (stability >= 100 && status !== 'won') {
            setStatus('won');
            playSound('success');
            setTimeout(onWin, 1500);
        }
    }, [stability]);

    return (
        <div className="flex flex-col items-center w-full max-w-4xl gap-6">
            <div className="relative w-full h-64 bg-black border-4 border-gray-700 rounded-lg shadow-inner overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.1)_1px,transparent_1px)] bg-[length:40px_40px]"></div>
                <canvas ref={canvasRef} width={800} height={256} className="absolute inset-0 w-full h-full" />
                <div className="absolute top-4 right-4 w-48">
                    <div className="flex justify-between text-xs text-green-500 font-mono mb-1"><span>SYNCHRONISATION</span><span>{Math.round(stability)}%</span></div>
                    <div className="h-2 bg-gray-900 border border-gray-600 rounded-full overflow-hidden"><div className="h-full bg-green-500 shadow-[0_0_10px_lime] transition-all duration-100" style={{ width: `${stability}%` }}></div></div>
                </div>
                {status === 'won' && <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20"><div className="text-yellow-400 text-4xl font-mono font-bold tracking-widest animate-bounce border-4 border-yellow-400 p-4 rounded">HARMONIE ATTEINTE</div></div>}
            </div>
            <div className="grid grid-cols-3 gap-8 w-full px-8">
                <div className="flex flex-col gap-2"><label className="text-yellow-500 font-mono text-xs uppercase">Fréquence (Hz)</label><input type="range" min="0.5" max="5" step="0.1" value={userFreq} onChange={(e) => setUserFreq(parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500" /></div>
                <div className="flex flex-col gap-2"><label className="text-yellow-500 font-mono text-xs uppercase">Amplitude (V)</label><input type="range" min="10" max="100" step="1" value={userAmp} onChange={(e) => setUserAmp(parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500" /></div>
                <div className="flex flex-col gap-2"><label className="text-yellow-500 font-mono text-xs uppercase">Déphasage (Φ)</label><input type="range" min="0" max="6.28" step="0.1" value={userPhase} onChange={(e) => setUserPhase(parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500" /></div>
            </div>
        </div>
    );
}

// ============================================================================
// JEU 4 : CRYPTO MINING (Économie)
// ============================================================================
function CryptoMining({ onWin }) {
    const GRID_SIZE = 16; 
    const REFRESH_RATE = 1500; 
    const TARGET_WINS = 5;
    const CHARS = ['A', 'B', 'C', 'D', 'E', 'F', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const genCode = () => CHARS[Math.floor(Math.random() * CHARS.length)] + CHARS[Math.floor(Math.random() * CHARS.length)];

    const [grid, setGrid] = useState([]);
    const [target, setTarget] = useState("");
    const [score, setScore] = useState(0);
    const [status, setStatus] = useState('playing');
    const [timeLeft, setTimeLeft] = useState(100);

    useEffect(() => {
        generateRound();
        const interval = setInterval(() => {
            if (status === 'playing') {
                generateRound(); 
                setScore(s => Math.max(0, s - 1)); 
            }
        }, REFRESH_RATE);
        
        const timer = setInterval(() => { if (status === 'playing') setTimeLeft(t => t > 0 ? t - 2 : 0); }, REFRESH_RATE / 50);
        return () => { clearInterval(interval); clearInterval(timer); };
    }, [status]);

    const generateRound = () => {
        setTimeLeft(100);
        const newGrid = Array.from({ length: GRID_SIZE }, () => genCode());
        const newTarget = newGrid[Math.floor(Math.random() * newGrid.length)];
        setGrid(newGrid);
        setTarget(newTarget);
    };

    const handleTileClick = (code) => {
        if (status !== 'playing') return;
        if (code === target) {
            playSound('click');
            const newScore = score + 1;
            setScore(newScore);
            if (newScore >= TARGET_WINS) { setStatus('won'); playSound('success'); setTimeout(onWin, 1500); } 
            else { generateRound(); }
        } else { playSound('error'); setScore(s => Math.max(0, s - 2)); }
    };

    return (
        <div className="flex flex-col items-center gap-8 w-full max-w-2xl">
            <div className="flex justify-between w-full items-end border-b border-emerald-900 pb-4">
                <div><div className="text-emerald-600 text-xs font-mono uppercase">Hash Cible</div><div className="text-5xl font-mono font-bold text-white tracking-widest animate-pulse drop-shadow-[0_0_10px_white]">{target}</div></div>
                <div className="text-right"><div className="text-emerald-600 text-xs font-mono uppercase">Blocs Validés</div><div className="text-4xl font-mono font-bold text-emerald-400">{score} <span className="text-lg text-emerald-800">/ {TARGET_WINS}</span></div></div>
            </div>
            <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden"><div className={`h-full transition-all duration-100 linear ${timeLeft < 30 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${timeLeft}%` }}></div></div>
            <div className="grid grid-cols-4 gap-4 p-4 bg-gray-900/50 rounded-xl border border-gray-700 shadow-2xl">
                {grid.map((code, i) => (
                    <button key={i} onClick={() => handleTileClick(code)} disabled={status !== 'playing'} className={`w-24 h-24 flex items-center justify-center text-2xl font-mono font-bold text-emerald-100 bg-gray-800 border-2 border-emerald-900/30 rounded-lg hover:bg-emerald-900 hover:border-emerald-400 hover:scale-105 hover:shadow-[0_0_15px_emerald] transition-all duration-75 active:scale-95`}>{code}</button>
                ))}
            </div>
            {status === 'won' && <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20"><div className="text-center"><div className="text-6xl mb-4">💰</div><div className="text-emerald-400 text-4xl font-bold uppercase tracking-widest animate-bounce">Transaction Validée</div></div></div>}
        </div>
    );
}

// ============================================================================
// JEU 5 : PCB PATHFINDER (Fallback)
// ============================================================================
function PCBPathfinder({ onWin, onClose }) {
    const GRID_SIZE = 8; 
    const [grid, setGrid] = useState([]);
    const [poweredTiles, setPoweredTiles] = useState(new Set(['0-0']));
    const [status, setStatus] = useState('loading');
    const [moves, setMoves] = useState(0);

    const TILE_TYPES = {
        'STRAIGHT': { id: 'straight', cx: [1, 0, 1, 0] },
        'CORNER':   { id: 'corner',   cx: [1, 1, 0, 0] },
        'T':        { id: 't',        cx: [1, 1, 1, 0] },
        'CROSS':    { id: 'cross',    cx: [1, 1, 1, 1] },
        'BROKEN':   { id: 'broken',   cx: [0, 0, 0, 0] }, 
    };

    useEffect(() => { generateSolvableLevel(); }, []);
    useEffect(() => { if (status === 'playing') checkPowerFlow(); }, [grid, status]);

    const generateSolvableLevel = () => {
        let newGrid = Array(GRID_SIZE).fill(null).map((_, y) => Array(GRID_SIZE).fill(null).map((_, x) => ({ x, y, type: TILE_TYPES.STRAIGHT, rotation: 0 })));
        let cx = 0, cy = 0;
        let path = [{x:0, y:0}];
        
        while (cx < GRID_SIZE - 1 || cy < GRID_SIZE - 1) {
            let moved = false;
            if (Math.random() > 0.5 && cx < GRID_SIZE - 1) { cx++; moved = true; } else if (cy < GRID_SIZE - 1) { cy++; moved = true; } else if (cx < GRID_SIZE - 1) { cx++; moved = true; }
            if (moved) path.push({x:cx, y:cy});
        }

        for(let i=0; i<path.length; i++) {
            const curr = path[i];
            const prev = path[i-1];
            const next = path[i+1];
            let reqH=0, reqD=0, reqB=0, reqG=0;
            if (prev) { if(prev.y<curr.y)reqH=1; if(prev.x>curr.x)reqD=1; if(prev.y>curr.y)reqB=1; if(prev.x<curr.x)reqG=1; } else reqG=1;
            if (next) { if(next.y<curr.y)reqH=1; if(next.x>curr.x)reqD=1; if(next.y>curr.y)reqB=1; if(next.x<curr.x)reqG=1; } else reqD=1;
            let type='STRAIGHT', rot=0;
            if(reqH&&reqB){type='STRAIGHT';rot=0;} else if(reqG&&reqD){type='STRAIGHT';rot=1;}
            else if(reqH&&reqD){type='CORNER';rot=0;} else if(reqD&&reqB){type='CORNER';rot=1;}
            else if(reqB&&reqG){type='CORNER';rot=2;} else if(reqG&&reqH){type='CORNER';rot=3;}
            else {type='T';rot=0;}
            newGrid[curr.y][curr.x] = { x: curr.x, y: curr.y, type: TILE_TYPES[type], rotation: rot, onPath: true };
        }

        for(let y=0; y<GRID_SIZE; y++) {
            for(let x=0; x<GRID_SIZE; x++) {
                if (!newGrid[y][x].onPath) {
                    const isBroken = Math.random() > 0.85; 
                    if (isBroken) {
                        newGrid[y][x] = { x, y, type: TILE_TYPES.BROKEN, rotation: 0, onPath: false };
                    } else {
                        const keys = ['STRAIGHT', 'CORNER', 'T', 'CROSS'];
                        const rnd = keys[Math.floor(Math.random()*keys.length)];
                        newGrid[y][x] = { x, y, type: TILE_TYPES[rnd], rotation: Math.floor(Math.random()*4), onPath: false };
                    }
                }
            }
        }

        let scramble = 0;
        const scrambled = newGrid.map(row => row.map(t => {
            if(t.type.id === 'broken') return t;
            const r = Math.floor(Math.random()*4);
            if(t.onPath) scramble += (4-r)%4;
            return {...t, rotation: (t.rotation + r)%4};
        }));

        setGrid(scrambled);
        setMoves(Math.max(20, Math.min(60, scramble + 15)));
        setStatus('playing');
    };

    const rotateTile = (x, y) => {
        const tile = grid[y][x];
        if (status !== 'playing' || moves <= 0 || tile.type.id === 'broken') return;
        playSound('click');
        setMoves(m => m - 1);
        const ng = [...grid];
        ng[y] = [...ng[y]];
        ng[y][x] = { ...ng[y][x], rotation: (ng[y][x].rotation + 1) % 4 };
        setGrid(ng);
    };

    const checkPowerFlow = () => {
        const queue = [{x: 0, y: 0}]; const visited = new Set(['0-0']); const powered = new Set(['0-0']);
        let reachedEnd = false;
        while (queue.length > 0) {
            const {x, y} = queue.shift();
            if (x === GRID_SIZE - 1 && y === GRID_SIZE - 1) reachedEnd = true;
            const tile = grid[y][x];
            if(tile.type.id === 'broken') continue;
            
            const cx = [...tile.type.cx];
            for(let i=0; i<tile.rotation; i++) cx.unshift(cx.pop());
            const neighbors = [{x,y:y-1},{x:x+1,y},{x,y:y+1},{x:x-1,y}];
            neighbors.forEach((n, idx) => {
                if (cx[idx] === 1 && n.x>=0 && n.x<GRID_SIZE && n.y>=0 && n.y<GRID_SIZE) {
                    const nt = grid[n.y][n.x];
                    if(nt.type.id === 'broken') return;
                    const ncx = [...nt.type.cx];
                    for(let j=0; j<nt.rotation; j++) ncx.unshift(ncx.pop());
                    if (ncx[(idx+2)%4] === 1) {
                        const key = `${n.x}-${n.y}`;
                        if(!visited.has(key)) { visited.add(key); powered.add(key); queue.push(n); }
                    }
                }
            });
        }
        setPoweredTiles(powered);
        if (reachedEnd && status !== 'won') { setStatus('won'); playSound('success'); setTimeout(onWin, 1500); }
        else if (moves === 0 && !reachedEnd) setStatus('lost');
    };

    return (
        <div className="flex flex-col items-center gap-4 h-full justify-center relative z-20">
            <div className={`text-3xl font-mono font-bold mb-2 transition-colors ${moves < 10 ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}>{moves} <span className="text-sm text-gray-500">MOVES</span></div>
            <div className="relative p-2 bg-[#0a1510]/80 backdrop-blur-md rounded-lg border-4 border-gray-700 shadow-2xl">
                <div className="absolute -left-8 top-4 text-cyan-400 font-mono text-xs font-bold animate-pulse">PWR &rarr;</div>
                <div className="absolute -right-8 bottom-4 text-cyan-400 font-mono text-xs font-bold animate-pulse">&rarr; CPU</div>
                <div className="grid gap-px bg-[#050a08]/50" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
                    {grid.length > 0 && grid.map((row, y) => row.map((tile, x) => {
                        const isPowered = poweredTiles.has(`${x}-${y}`);
                        const opacityClass = isPowered ? 'opacity-100' : 'opacity-10 grayscale blur-[1px]';
                        return (
                            <button key={`${x}-${y}`} onClick={() => rotateTile(x, y)} disabled={status !== 'playing' || tile.type.id === 'broken'} 
                                className={`w-10 h-10 relative flex items-center justify-center transition-all duration-300 ${tile.type.id === 'broken' ? 'bg-red-900/10' : isPowered ? 'bg-cyan-900/40' : 'bg-transparent'} hover:bg-white/10 active:scale-95 disabled:cursor-not-allowed`}>
                                <div className={`w-full h-full transition-all duration-300 ease-out ${opacityClass}`} style={{ transform: `rotate(${tile.rotation * 90}deg)` }}><TileSVG type={tile.type.id} powered={isPowered} /></div>
                            </button>
                        );
                    }))}
                </div>
            </div>
            <div className="h-8">{status === 'won' && <div className="text-green-400 font-bold animate-bounce uppercase tracking-widest bg-black/50 px-4 py-1 rounded">CONNEXION ÉTABLIE</div>}{status === 'lost' && <div className="text-red-500 font-bold uppercase tracking-widest bg-black/50 px-4 py-1 rounded">ÉCHEC DU ROUTAGE</div>}</div>
        </div>
    );
}

const TileSVG = ({ type, powered }) => {
    const color = powered ? "#22d3ee" : "#333"; const glow = powered ? "drop-shadow(0 0 4px #06b6d4)" : ""; const width = "16"; const c = "50"; 
    if (type === 'broken') { return (<svg viewBox="0 0 100 100" className="w-full h-full p-2"><path d="M 20 20 L 80 80 M 80 20 L 20 80" stroke="#500" strokeWidth="10" /></svg>); }
    return (<svg viewBox="0 0 100 100" className="w-full h-full p-0.5" style={{ filter: glow }}>{type === 'straight' && <line x1={c} y1="0" x2={c} y2="100" stroke={color} strokeWidth={width} strokeLinecap="square" />}{type === 'corner' && <path d={`M ${c} 0 L ${c} ${c} L 100 ${c}`} stroke={color} strokeWidth={width} fill="none" strokeLinecap="square" strokeLinejoin="round" />}{type === 't' && <path d={`M ${c} 0 L ${c} 100 M ${c} ${c} L 100 ${c}`} stroke={color} strokeWidth={width} fill="none" strokeLinecap="square" strokeLinejoin="round" />}{type === 'cross' && <path d={`M ${c} 0 L ${c} 100 M 0 ${c} L 100 ${c}`} stroke={color} strokeWidth={width} fill="none" strokeLinecap="square" />}<circle cx={c} cy={c} r="5" fill="#111" stroke={color} strokeWidth="2" /></svg>);
};  