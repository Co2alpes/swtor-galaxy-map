import React, { memo, useMemo } from 'react';

export const MapDefs = memo(() => (
    <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/></pattern>
        <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" /></filter>
        <filter id="planetGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="glow" />
            <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
        
        {/* Planet Gradients */}
        <radialGradient id="grad-standard">
            <stop offset="30%" stopColor="#4b5563" />
            <stop offset="90%" stopColor="#1f2937" />
            <stop offset="100%" stopColor="#000000" />
        </radialGradient>
        <radialGradient id="grad-industrial">
            <stop offset="20%" stopColor="#fb923c" />
            <stop offset="80%" stopColor="#7c2d12" />
            <stop offset="100%" stopColor="#431407" />
        </radialGradient>
        <radialGradient id="grad-capital">
            <stop offset="10%" stopColor="#fcd34d" />
            <stop offset="70%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#451a03" />
        </radialGradient>
        <radialGradient id="grad-nexus">
            <stop offset="10%" stopColor="#d8b4fe" />
            <stop offset="70%" stopColor="#6b21a8" />
            <stop offset="100%" stopColor="#3b0764" />
        </radialGradient>
        <radialGradient id="grad-unknown">
            <stop offset="30%" stopColor="#374151" />
            <stop offset="100%" stopColor="#111827" />
        </radialGradient>
    </defs>
));

export const BackgroundLayer = memo(() => (
    <>
        <image href="/carte_galactique.png" x="-5000" y="-5000" width="10000" height="10000" preserveAspectRatio="none" opacity="0.4" />
        <rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#grid)" />
    </>
));

export const RouteLayer = memo(({ planets }) => {
    // Optimization: Create a map for O(1) lookups
    const planetMap = useMemo(() => new Map(planets.map(p => [p.id, p])), [planets]);

    return (
        <g>
            {planets.flatMap(p => (p.connected_to||[]).map(tid => {
                const t = planetMap.get(tid);
                if(!t || p.id > t.id) return null;
                return ( 
                    <g key={`route-${p.id}-${t.id}`}>
                        {/* Glow Layer - Optimized: No Filter */}
                        <line x1={p.x} y1={p.y} x2={t.x} y2={t.y} stroke="#3b82f6" strokeWidth="2" opacity="0.1" strokeLinecap="round" />
                        
                        {/* Core Lane */}
                        <line x1={p.x} y1={p.y} x2={t.x} y2={t.y} stroke="#60a5fa" strokeWidth="0.5" opacity="0.6" strokeDasharray="3,3" />
                        
                        {/* Connectors at planets */}
                        <circle cx={p.x} cy={p.y} r="1" fill="#3b82f6" opacity="0.5" />
                        <circle cx={t.x} cy={t.y} r="1" fill="#3b82f6" opacity="0.5" />
                    </g> 
                );
            }))}
        </g>
    );
});

const getFleetPosition = (fleet, planetMap, currentTurn) => {
    if (!fleet.path || fleet.path.length < 2) return null;
    const totalTurns = fleet.arrival_turn - fleet.start_turn;
    if (totalTurns <= 0) return null;
    const turnsPassed = currentTurn - fleet.start_turn;
    let progress = Math.max(0, Math.min(1, turnsPassed / totalTurns));
    if (currentTurn >= fleet.arrival_turn) progress = 1;

    // Recalculate segment distances to find exactly where we are
    let totalPathDistance = 0;
    const segmentDistances = [];
    
    for (let i = 0; i < fleet.path.length - 1; i++) {
        const p1 = planetMap.get(fleet.path[i]);
        const p2 = planetMap.get(fleet.path[i+1]);
        if (p1 && p2) {
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            segmentDistances.push({ d, p1, p2, dx, dy });
            totalPathDistance += d;
        }
    }
    
    const targetDist = totalPathDistance * progress;
    let currentDist = 0;
    
    for (const seg of segmentDistances) {
        if (currentDist + seg.d >= targetDist) {
            const segProgress = (targetDist - currentDist) / seg.d;
            return {
                x: seg.p1.x + seg.dx * segProgress,
                y: seg.p1.y + seg.dy * segProgress
            };
        }
        currentDist += seg.d;
    }
    
    // Fallback end
    const lastP = planetMap.get(fleet.path[fleet.path.length-1]);
    return lastP ? { x: lastP.x, y: lastP.y } : null;
};

export const FleetLayer = memo(({ fleets, planets, currentTurn, shouldShowFleets, fleetMovePreview }) => {
    const planetMap = useMemo(() => new Map(planets.map(p => [p.id, p])), [planets]);
    
    return (
        <>
            {shouldShowFleets && fleets.filter(f => f.status === 'moving' && f.path).map(f => {
                const pathPoints = f.path.map(id => { const p = planetMap.get(id); return p ? `${p.x},${p.y}` : null; }).filter(Boolean).join(' ');
                const currentPos = getFleetPosition(f, planetMap, currentTurn);
                if (!currentPos) return null;
                return (
                    <g key={f.id}>
                        <polyline points={pathPoints} fill="none" stroke="cyan" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.6" />
                        <g transform={`translate(${currentPos.x}, ${currentPos.y})`} className="animate-pulse">
                            <polygon points="0,-10 8,6 0,2 -8,6" fill="cyan" stroke="black" strokeWidth="1" />
                            <text y="-15" fill="cyan" fontSize="8" textAnchor="middle" fontWeight="bold">{f.name}</text>
                        </g>
                    </g>
                );
            })}

            {/* PREVIEW TRAJET FLOTTE */}
            {fleetMovePreview && fleetMovePreview.path && (
                <g className="animate-in fade-in duration-300">
                    <polyline 
                        points={fleetMovePreview.path.map(id => { 
                            const p = planetMap.get(id); 
                            return p ? `${p.x},${p.y}` : null; 
                        }).filter(Boolean).join(' ')} 
                        fill="none" 
                        stroke="#fbbf24" 
                        strokeWidth="2" 
                        strokeDasharray="8,4" 
                        className="animate-pulse"
                    />
                    <circle cx={fleetMovePreview.target.x} cy={fleetMovePreview.target.y} r="12" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="2,2" className="animate-spin-slow" />
                    <circle cx={fleetMovePreview.target.x} cy={fleetMovePreview.target.y} r="4" fill="#fbbf24" className="animate-ping" />
                    
                    <rect x={fleetMovePreview.target.x - 25} y={fleetMovePreview.target.y - 30} width="50" height="20" rx="4" fill="black" stroke="#fbbf24" strokeWidth="1" />
                    <text x={fleetMovePreview.target.x} y={fleetMovePreview.target.y - 17} fill="#fbbf24" fontSize="10" textAnchor="middle" fontWeight="bold" fontFamily="monospace">
                        {fleetMovePreview.turns} Tours
                    </text>
                </g>
            )}
        </>
    );
});

export const PlanetLayer = memo(({ planets, factions, fleets, activePlanet, shouldShowFleets, onPlanetClick, zoomLevel }) => {
    // Optimization: Maps for O(1) lookups
    const factionMap = useMemo(() => new Map(factions.map(f => [f.id, f])), [factions]);
    const fleetsMap = useMemo(() => {
        const map = new Map();
        fleets.forEach(f => {
            if (f.status === 'stationed') {
                if (!map.has(f.location_id)) map.set(f.location_id, []);
                map.get(f.location_id).push(f);
            }
        });
        return map;
    }, [fleets]);

    const z = zoomLevel || 800;
    const showPlanets = z < 2500; // Planètes visibles sous 2500
    const showLabels = z < 1000;  // Noms visibles sous 1000

    return (
        <>
            {planets.map((p) => {
                if (!showPlanets) return null;

                const f = factionMap.get(p.owner);
                const orbitFleets = shouldShowFleets ? (fleetsMap.get(p.id) || []) : [];
                
                // Determine Visuals
                const pType = p.planet_type || 'standard';
                const gradId = pType === 'industrial' ? 'grad-industrial' :
                               pType === 'capital' ? 'grad-capital' :
                               pType === 'force_nexus' ? 'grad-nexus' : 'grad-standard';
                               
                const baseSize = 4;
                const size = pType === 'capital' ? 8 : (pType === 'force_nexus' ? 6 : 4);

                return (
                    <g key={p.id} className="cursor-pointer" onClick={(e) => onPlanetClick(e, p)} opacity={activePlanet?.id === p.id ? 1 : 0.9}>
                         {/* Selection Ring */}
                        {shouldShowFleets && orbitFleets.length > 0 && ( <g><circle cx={p.x} cy={p.y} r="25" stroke="cyan" strokeWidth="1" fill="none" strokeDasharray="4,2" className="animate-spin-slow" /><circle cx={p.x + 18} cy={p.y - 18} r="7" fill="#0f172a" stroke="cyan" /><text x={p.x + 18} y={p.y - 15} textAnchor="middle" fontSize="7" fill="cyan" fontWeight="bold">⚓{orbitFleets.length}</text></g> )}
                        
                        {/* Hitbox */}
                        <circle cx={p.x} cy={p.y} r="30" fill="transparent" />
                        
                        {/* Active Indicator */}
                        {activePlanet?.id === p.id && (
                             <g className="animate-pulse">
                                 <circle cx={p.x} cy={p.y} r="20" stroke="white" strokeWidth="0.5" fill="none" opacity="0.5" />
                                 <circle cx={p.x} cy={p.y} r="24" stroke="white" strokeWidth="1" fill="none" strokeDasharray="2,4" />
                             </g>
                        )}

                        {/* Faction Territory Halo - Optimized: No Filter */}
                        {f && f.id !== 'neutral' && (
                             <circle cx={p.x} cy={p.y} r="18" fill={f.color} fillOpacity="0.1" />
                        )}
                        
                        {/* Planet Body */}
                        <circle cx={p.x} cy={p.y} r={size} fill={`url(#${gradId})`} stroke={f?.color || '#555'} strokeWidth={f?.id !== 'neutral' ? 1.5 : 0.5} />
                        
                        {/* Atmosphere / Shine - Optimized: No Filter */}
                        <circle cx={p.x - size*0.3} cy={p.y - size*0.3} r={size*0.4} fill="white" fillOpacity="0.1" />

                        {/* Special Markers */}
                        {p.planet_type === 'capital' && <circle cx={p.x} cy={p.y} r={size + 3} stroke={f?.color || 'goldenrod'} strokeWidth="1" fill="none" opacity="0.7" />}
                        {p.planet_type === 'force_nexus' && <circle cx={p.x} cy={p.y} r={size + 2} stroke="#a855f7" strokeWidth="0.5" fill="none" className="animate-pulse" />}

                        {p.governor_id && <text x={p.x + 8} y={p.y - 8} fontSize="8">👑</text>}
                        
                        {/* Label */}
                        {showLabels && (
                            <text x={p.x} y={p.y + 18} fill="#e5e7eb" fontSize="8" textAnchor="middle" className="font-mono uppercase font-bold drop-shadow-md tracking-wider" style={{ textShadow: '0px 2px 4px black' }}>{p.name}</text>
                        )}
                    </g>
                );
            })}
        </>
    );
});

