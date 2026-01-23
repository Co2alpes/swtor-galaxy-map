import React, { useState, useRef, useEffect } from 'react';

const MAP_WIDTH = 3000;
const MAP_HEIGHT = 2000;

const TERRAIN_TYPES = [
    { id: 'plains', label: 'Plaines', color: '#2d5a27' },
    { id: 'desert', label: 'Désert', color: '#e6c288' },
    { id: 'urban', label: 'Urbain', color: '#333333' },
    { id: 'snow', label: 'Polaire', color: '#e5e7eb' },
    { id: 'volcanic', label: 'Volcanique', color: '#2b0a0a' },
    { id: 'forest', label: 'Forêt', color: '#143316' },
    { id: 'force_nexus', label: 'Nexus de Force', color: '#290038' },
    { id: 'industrial', label: 'Industriel', color: '#3f3f46' }
];

const OBSTACLE_TYPES = [
    { id: 'rock', label: 'Rocher', defaultColor: '#555555' },
    { id: 'wall', label: 'Mur', defaultColor: '#333333' },
    { id: 'tree', label: 'Arbre', defaultColor: '#1e4d2b' },
    { id: 'ruin', label: 'Ruine', defaultColor: '#4a4a4a' },
    { id: 'water', label: 'Eau', defaultColor: '#3b82f6' },
    { id: 'lava', label: 'Lave', defaultColor: '#ef4444' },
    { id: 'crystal', label: 'Cristal', defaultColor: '#a855f7' }
];

export default function GroundMapEditor({ onClose, onSave, existingMap }) {
    const canvasRef = useRef(null);
    const [mapName, setMapName] = useState(existingMap?.name || 'Nouvelle Carte');
    const [terrainType, setTerrainType] = useState(existingMap?.terrainType || 'plains');
    const [obstacles, setObstacles] = useState(existingMap?.obstacles || []);
    const [spawnZones, setSpawnZones] = useState(existingMap?.spawnZones || {
        attacker: { x: MAP_WIDTH * 0.15, y: MAP_HEIGHT / 2, radius: 600 },
        defender: { x: MAP_WIDTH * 0.85, y: MAP_HEIGHT / 2, radius: 600 }
    });
    
    // Camera State
    const [camera, setCamera] = useState({ x: MAP_WIDTH/2 - window.innerWidth/2, y: MAP_HEIGHT/2 - window.innerHeight/2, zoom: 0.6 });
    const [isDraggingCam, setIsDraggingCam] = useState(false);
    const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

    // Editor Tools
    const [tool, setTool] = useState('select'); // select, rect, circle, atk_spawn, def_spawn, erase
    const [selectedObject, setSelectedObject] = useState(null);
    const [previewObj, setPreviewObj] = useState(null);

    // Render Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        const render = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            ctx.save();
            // Background for whole canvas (outside map)
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Apply Camera
            ctx.translate(-camera.x * camera.zoom, -camera.y * camera.zoom);
            ctx.scale(camera.zoom, camera.zoom);

            // DRAW MAP BACKGROUND
            const bg = TERRAIN_TYPES.find(t => t.id === terrainType)?.color || '#111';
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

            // DRAW BOUNDARIES
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 10;
            ctx.strokeRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
            
            // GRID
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for(let x=0; x<=MAP_WIDTH; x+=200) { ctx.moveTo(x,0); ctx.lineTo(x, MAP_HEIGHT); }
            for(let y=0; y<=MAP_HEIGHT; y+=200) { ctx.moveTo(0,y); ctx.lineTo(MAP_WIDTH, y); }
            ctx.stroke();

            // DRAW OBSTACLES
            obstacles.forEach((obs, idx) => {
                ctx.fillStyle = obs.color || '#666';
                if (selectedObject === idx) {
                    ctx.shadowColor = '#00ffff';
                    ctx.shadowBlur = 15;
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2;
                } else {
                    ctx.shadowBlur = 0;
                }

                if (obs.shape === 'rect') {
                    ctx.fillRect(obs.x - obs.width/2, obs.y - obs.height/2, obs.width, obs.height);
                    if (selectedObject === idx) ctx.strokeRect(obs.x - obs.width/2, obs.y - obs.height/2, obs.width, obs.height);
                } else {
                    ctx.beginPath();
                    ctx.arc(obs.x, obs.y, obs.size/2, 0, Math.PI * 2);
                    ctx.fill();
                    if (selectedObject === idx) ctx.stroke();
                }
                ctx.shadowBlur = 0; // Reset
            });

            // DRAW SPAWN ZONES
            // Attacker
            ctx.strokeStyle = '#0088ff';
            ctx.lineWidth = 5;
            ctx.setLineDash([20, 10]);
            ctx.beginPath();
            ctx.arc(spawnZones.attacker.x, spawnZones.attacker.y, spawnZones.attacker.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(0,100,255,0.1)';
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = '40px Arial';
            ctx.fillText("A", spawnZones.attacker.x - 10, spawnZones.attacker.y + 10);

            // Defender
            ctx.strokeStyle = '#ff4444';
            ctx.beginPath();
            ctx.arc(spawnZones.defender.x, spawnZones.defender.y, spawnZones.defender.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,50,50,0.1)';
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillText("D", spawnZones.defender.x - 10, spawnZones.defender.y + 10);

            ctx.restore();
            requestAnimationFrame(render);
        };
        render();
    }, [camera, obstacles, spawnZones, selectedObject]);

    // Input Handlers
    const getWorldCoords = (e) => {
        const r = canvasRef.current.getBoundingClientRect();
        return {
            x: (e.clientX + camera.x * camera.zoom) / camera.zoom,
            y: (e.clientY + camera.y * camera.zoom) / camera.zoom
        };
    };

    const handleMouseDown = (e) => {
        if (e.button === 1 || (e.button === 0 && e.shiftKey)) { // Middle click or Shift+Click for Pan
            setIsDraggingCam(true);
            setLastMouse({ x: e.clientX, y: e.clientY });
            return;
        }

        const { x, y } = getWorldCoords(e);

        if (tool === 'select') {
            // Find clicked object (reverse order for top-most)
            let found = null;
            for (let i = obstacles.length - 1; i >= 0; i--) {
                const obs = obstacles[i];
                if (obs.shape === 'rect') {
                    if (x > obs.x - obs.width/2 && x < obs.x + obs.width/2 &&
                        y > obs.y - obs.height/2 && y < obs.y + obs.height/2) {
                        found = i; break;
                    }
                } else {
                    const dx = x - obs.x;
                    const dy = y - obs.y;
                    if (dx*dx + dy*dy < (obs.size/2)*(obs.size/2)) {
                        found = i; break;
                    }
                }
            }
            setSelectedObject(found);
        } else if (tool === 'rect') {
            setObstacles([...obstacles, { 
                x, y, shape: 'rect', width: 200, height: 100, color: '#555', type: 'custom_wall' 
            }]);
            setTool('select');
        } else if (tool === 'circle') {
            setObstacles([...obstacles, { 
                x, y, shape: 'circle', size: 150, width: 150, height: 150, color: '#555', type: 'custom_rock' 
            }]);
            setTool('select');
        } else if (tool === 'atk_spawn') {
            setSpawnZones({ ...spawnZones, attacker: { ...spawnZones.attacker, x, y } });
            setTool('select');
        } else if (tool === 'def_spawn') {
            setSpawnZones({ ...spawnZones, defender: { ...spawnZones.defender, x, y } });
            setTool('select');
        } else if (tool === 'erase') {
             // Find clicked object
             let found = -1;
             for (let i = obstacles.length - 1; i >= 0; i--) {
                 const obs = obstacles[i];
                 if (obs.shape === 'rect') {
                     if (x > obs.x - obs.width/2 && x < obs.x + obs.width/2 &&
                         y > obs.y - obs.height/2 && y < obs.y + obs.height/2) {
                         found = i; break;
                     }
                 } else {
                     const dx = x - obs.x;
                     const dy = y - obs.y;
                     if (dx*dx + dy*dy < (obs.size/2)*(obs.size/2)) {
                         found = i; break;
                     }
                 }
             }
             if (found !== -1) {
                 const newObs = [...obstacles];
                 newObs.splice(found, 1);
                 setObstacles(newObs);
             }
        }
    };

    const handleMouseMove = (e) => {
        if (isDraggingCam) {
            const dx = (e.clientX - lastMouse.x) / camera.zoom;
            const dy = (e.clientY - lastMouse.y) / camera.zoom;
            setCamera({ ...camera, x: camera.x - dx, y: camera.y - dy });
            setLastMouse({ x: e.clientX, y: e.clientY });
            return;
        }
        
        if (tool === 'select' && selectedObject !== null && e.buttons === 1) {
            const { x, y } = getWorldCoords(e);
            // Move object
            const newObs = [...obstacles];
            newObs[selectedObject] = { ...newObs[selectedObject], x, y };
            setObstacles(newObs);
        }
    };

    const handleMouseUp = () => {
        setIsDraggingCam(false);
    };
    
    const handleWheel = (e) => {
        e.preventDefault();
        const sc = e.deltaY > 0 ? 0.9 : 1.1;
        setCamera({ ...camera, zoom: Math.max(0.2, Math.min(3, camera.zoom * sc)) });
    };

    const handleSave = () => {
        onSave({
            id: existingMap?.id || `map_${Date.now()}`,
            name: mapName,
            width: MAP_WIDTH,
            height: MAP_HEIGHT,
            obstacles,
            spawnZones,
            terrainType
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black text-white">
            <div className="absolute top-0 left-0 w-full h-16 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4 z-50">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-yellow-500">ÉDITEUR DE CARTE</h2>
                    <input 
                        type="text" 
                        value={mapName}
                        onChange={(e) => setMapName(e.target.value)}
                        className="bg-gray-800 border border-gray-600 px-2 py-1 rounded w-32"
                        placeholder="Nom"
                    />
                    <select value={terrainType} onChange={e => setTerrainType(e.target.value)} className="bg-gray-800 border border-gray-600 px-2 py-1 rounded text-xs ml-2">
                        {TERRAIN_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                </div>
                <div className="flex gap-2 bg-gray-800 p-1 rounded-lg">
                    <button onClick={() => setTool('select')} className={`px-3 py-1 rounded ${tool==='select'?'bg-blue-600':'hover:bg-gray-700'}`}>👆</button>
                    <button onClick={() => setTool('rect')} className={`px-3 py-1 rounded ${tool==='rect'?'bg-blue-600':'hover:bg-gray-700'}`}>⬜ Mur</button>
                    <button onClick={() => setTool('circle')} className={`px-3 py-1 rounded ${tool==='circle'?'bg-blue-600':'hover:bg-gray-700'}`}>⚪ Rocher</button>
                    <button onClick={() => setTool('atk_spawn')} className={`px-3 py-1 rounded ${tool==='atk_spawn'?'bg-blue-600':'hover:bg-gray-700'}`}>🟦 Spawn</button>
                    <button onClick={() => setTool('def_spawn')} className={`px-3 py-1 rounded ${tool==='def_spawn'?'bg-blue-600':'hover:bg-gray-700'}`}>🟥 Spawn</button>
                    <button onClick={() => setTool('erase')} className={`px-3 py-1 rounded ${tool==='erase'?'bg-red-600':'hover:bg-gray-700'}`}>❌</button>
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded">Fermer</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded font-bold">Sauver</button>
                </div>
            </div>
            
            <canvas 
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
                className="block cursor-crosshair"
            />
            
            {selectedObject !== null && obstacles[selectedObject] && (
                <div className="absolute top-20 right-4 w-64 bg-gray-900 border border-gray-700 p-4 rounded shadow-xl z-50">
                    <h3 className="text-yellow-500 font-bold mb-2 uppercase text-xs border-b border-gray-700 pb-1">Propriétés</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="text-gray-400 text-[10px] uppercase block mb-1">Type</label>
                            <select 
                                value={obstacles[selectedObject].type || 'rock'} 
                                onChange={(e) => {
                                    const type = e.target.value;
                                    const defaultColor = OBSTACLE_TYPES.find(t=>t.id===type)?.defaultColor;
                                    const newObs = [...obstacles];
                                    newObs[selectedObject] = { ...newObs[selectedObject], type, color: defaultColor };
                                    setObstacles(newObs);
                                }}
                                className="w-full bg-black border border-gray-600 text-xs px-2 py-1 rounded text-white"
                            >
                                {OBSTACLE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-gray-400 text-[10px] uppercase block mb-1">Couleur</label>
                            <input 
                                type="color" 
                                value={obstacles[selectedObject].color || '#555555'}
                                onChange={(e) => {
                                    const newObs = [...obstacles];
                                    newObs[selectedObject] = { ...newObs[selectedObject], color: e.target.value };
                                    setObstacles(newObs);
                                }}
                                className="w-full h-8 cursor-pointer border border-gray-600 rounded bg-black"
                            />
                        </div>
                        {obstacles[selectedObject].shape === 'rect' ? (
                             <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-gray-400 text-[10px] uppercase block mb-1">Largeur</label>
                                    <input 
                                        type="number" 
                                        value={Math.round(obstacles[selectedObject].width)}
                                        onChange={(e) => {
                                            const newObs = [...obstacles];
                                            newObs[selectedObject] = { ...newObs[selectedObject], width: Number(e.target.value) };
                                            setObstacles(newObs);
                                        }}
                                        className="w-full bg-black border border-gray-600 text-xs px-2 py-1 rounded text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-gray-400 text-[10px] uppercase block mb-1">Hauteur</label>
                                    <input 
                                        type="number" 
                                        value={Math.round(obstacles[selectedObject].height)}
                                        onChange={(e) => {
                                            const newObs = [...obstacles];
                                            newObs[selectedObject] = { ...newObs[selectedObject], height: Number(e.target.value) };
                                            setObstacles(newObs);
                                        }}
                                        className="w-full bg-black border border-gray-600 text-xs px-2 py-1 rounded text-white"
                                    />
                                </div>
                             </div>
                        ) : (
                            <div>
                                <label className="text-gray-400 text-[10px] uppercase block mb-1">Taille</label>
                                <input 
                                    type="number" 
                                    value={Math.round(obstacles[selectedObject].size)}
                                    onChange={(e) => {
                                        const newObs = [...obstacles];
                                        newObs[selectedObject] = { ...newObs[selectedObject], size: Number(e.target.value) };
                                        setObstacles(newObs);
                                    }}
                                    className="w-full bg-black border border-gray-600 text-xs px-2 py-1 rounded text-white"
                                />
                            </div>
                        )}
                        <button 
                            onClick={() => {
                                const newObs = [...obstacles];
                                newObs.splice(selectedObject, 1);
                                setObstacles(newObs);
                                setSelectedObject(null);
                            }}
                            className="w-full bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-800 text-xs py-1 uppercase font-bold rounded mt-2"
                        >
                            Supprimer
                        </button>
                    </div>
                </div>
            )}
            
            <div className="absolute bottom-4 left-4 bg-black/50 p-2 text-xs text-gray-400 pointer-events-none">
                Molette: Zoom | Clic Milieu / Shift+Clic: Panoramique
            </div>
        </div>
    );
}