"use client";

import { useMemo, memo } from 'react';
import { Delaunay } from 'd3-delaunay';

const REGION_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#64748b'];
const getRegionColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return REGION_COLORS[Math.abs(hash) % REGION_COLORS.length];
};

const quantize = (v) => Math.round(v * 100) / 100;
const getSegKey = (p1, p2) => {
    const s1 = `${quantize(p1[0])},${quantize(p1[1])}`;
    const s2 = `${quantize(p2[0])},${quantize(p2[1])}`;
    return s1 < s2 ? s1 + "|" + s2 : s2 + "|" + s1;
};

const BorderLayer = memo(function BorderLayer({ planets, factions, onRegionClick }) {
    
    const { cellPaths, outlinePaths, factionColors, regionPaths, regionColors, regionAreaPaths } = useMemo(() => {
        if (!planets || planets.length === 0) return { cellPaths: {}, outlinePaths: {}, factionColors: {}, regionPaths: {}, regionColors: {}, regionAreaPaths: {} };

        // 1. Calculer les limites dynamiques de la carte basée sur les planètes
        const xs = planets.map(p => p.x);
        const ys = planets.map(p => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        
        // Large bounds to allow Voronoi to calculate properly, we'll limit visibility with Mask
        const PADDING = 2000; 
        const bounds = [minX - PADDING, minY - PADDING, maxX + PADDING, maxY + PADDING];

        const points = planets.map(p => [p.x, p.y]);
        const delaunay = Delaunay.from(points);
        const voronoi = delaunay.voronoi(bounds);

        const factionCellPaths = {}; // For Fill
        const factionSegments = {};  // For Outline
        const regionSegments = {}; 
        const regionColors = {};
        const regionAreaPaths = {};
        
        for (let i = 0; i < points.length; i++) {
            const planet = planets[i];
            const polygon = voronoi.cellPolygon(i);

            // 1. FACTIONS
            const owner = planet.owner;
            if (owner && owner !== 'neutral') {
                const path = voronoi.renderCell(i);
                
                // For Fill (Cells)
                if (!factionCellPaths[owner]) factionCellPaths[owner] = "";
                factionCellPaths[owner] += path + " ";
                
                // For Outline (Segments)
                if (polygon) {
                     if (!factionSegments[owner]) factionSegments[owner] = new Map();
                     const map = factionSegments[owner];
                     for (let j = 0; j < polygon.length - 1; j++) {
                            const p1 = polygon[j];
                            const p2 = polygon[j+1];
                            const key = getSegKey(p1, p2);
                            map.set(key, (map.get(key) || 0) + 1);
                     }
                }
            }

            // 2. REGIONS
            const region = planet.region;
            if (region) {
                const path = voronoi.renderCell(i);
                
                // Accumulate full area for click detection
                if (!regionAreaPaths[region]) regionAreaPaths[region] = "";
                regionAreaPaths[region] += path + " ";

                if (polygon) {
                    for (let j = 0; j < polygon.length - 1; j++) {
                        const p1 = polygon[j];
                        const p2 = polygon[j+1];
                        const key = getSegKey(p1, p2);
                        
                        if (!regionSegments[region]) regionSegments[region] = new Map();
                        const map = regionSegments[region];
                        map.set(key, (map.get(key) || 0) + 1);
                    }
                }
                if (!regionColors[region]) regionColors[region] = getRegionColor(region);
            }
        }

        const colors = {};
        factions.forEach(f => colors[f.id] = f.color);

        // Construction des chemins de région (seulement les bords extérieurs)
        const finalRegionPaths = {};
        Object.entries(regionSegments).forEach(([r, map]) => {
            let path = "";
            for (const [key, count] of map.entries()) {
                if (count === 1) { // Segment unique = Bordure extérieure
                    const [start, end] = key.split('|');
                    const [x1, y1] = start.split(',').map(Number);
                    const [x2, y2] = end.split(',').map(Number);
                    path += `M${x1},${y1}L${x2},${y2}`;
                }
            }
            finalRegionPaths[r] = path;
        });
        
        // Construction des chemins de faction (contour uniquement) pour le stroke
        const finalOutlinePaths = {};
        Object.entries(factionSegments).forEach(([owner, map]) => {
            let path = "";
            for (const [key, count] of map.entries()) {
                if (count === 1) { 
                    const [start, end] = key.split('|');
                    const [x1, y1] = start.split(',').map(Number);
                    const [x2, y2] = end.split(',').map(Number);
                    path += `M${x1},${y1}L${x2},${y2}`;
                }
            }
            finalOutlinePaths[owner] = path;
        });

        return { cellPaths: factionCellPaths, outlinePaths: finalOutlinePaths, factionColors: colors, regionPaths: finalRegionPaths, regionColors, regionAreaPaths };
    }, [planets, factions]);

    return (
        <g className="border-layer">
            <defs>
                {/* 1. Le flou pour l'aspect nébuleuse */}
                <filter id="nebulaBlur" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="15" />
                </filter>

                {/* 2. Le Masque : On ne dessine que des cercles autour des planètes */}
                {/* Ce masque limitera la portée visuelle de la couleur */}
                <mask id="planetInfluenceMask">
                    <rect x="-5000" y="-5000" width="10000" height="10000" fill="black" />
                    {planets.map(p => {
                        // Dynamique : Rayon = 75% de la distance au voisin le plus proche (Ajustement fin)
                        let minDist = 2000;
                        planets.forEach(p2 => {
                            if (p.id === p2.id) return;
                            const d = Math.sqrt((p.x-p2.x)**2 + (p.y-p2.y)**2);
                            if (d < minDist) minDist = d;
                        });
                        const r = Math.max(250, Math.min(minDist * 0.55, 1000));
                        const k = r * 0.7; // cste octogone

                        return (
                        <g key={`mask-group-${p.id}`}>
                            <polygon 
                                // Octogone dynamique
                                points={`
                                    ${p.x+r},${p.y} 
                                    ${p.x+k},${p.y+k} 
                                    ${p.x},${p.y+r} 
                                    ${p.x-k},${p.y+k} 
                                    ${p.x-r},${p.y} 
                                    ${p.x-k},${p.y-k} 
                                    ${p.x},${p.y-r} 
                                    ${p.x+k},${p.y-k}
                                `}
                                fill="white" 
                            />
                            {/* Ponts pour fusionner les territoires connectés */}
                            {p.connected_to?.map(tid => {
                                const t = planets.find(pl => pl.id === tid);
                                // On dessine le trait une seule fois par paire (id check)
                                if (!t || p.id > t.id) return null;
                                return (
                                    <line 
                                        key={`mask-link-${p.id}-${t.id}`}
                                        x1={p.x} y1={p.y}
                                        x2={t.x} y2={t.y}
                                        stroke="white"
                                        strokeWidth={r * 0.9} // Largeur dynamique aussi
                                        strokeLinecap="round"
                                    />
                                );
                            })}
                        </g>
                    )})}
                </mask>

                {/* 3. Le ClipPath pour les clics : Zone plus large que le visuel, mais pas infinie */}
                <clipPath id="regionClickClip">
                    {planets.map(p => (
                        <circle 
                            key={`clip-${p.id}`} 
                            cx={p.x} 
                            cy={p.y} 
                            r="200" // Rayon de la zone cliquable
                        />
                    ))}
                </clipPath>
            </defs>

            {/* Clickable Invisible Layer for Regions */}
            <g style={{ pointerEvents: 'all' }} clipPath="url(#regionClickClip)">
                {Object.entries(regionAreaPaths).map(([region, pathData]) => (
                    <path
                        key={`click-${region}`}
                        d={pathData}
                        fill="transparent"
                        stroke="none"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onRegionClick) onRegionClick(region);
                        }}
                        style={{ cursor: 'cell' }}
                    >
                        <title>Région : {region}</title>
                    </path>
                ))}
            </g>

            {/* Affichage des zones colorées bridées par le masque (Pointer events none) */}
            <g mask="url(#planetInfluenceMask)" opacity="0.4" style={{ pointerEvents: 'none' }}>
                {Object.entries(cellPaths).map(([factionId, pathData]) => {
                    if (!factionColors[factionId]) return null;
                    return (
                        <path
                            key={factionId}
                            d={pathData}
                            fill={factionColors[factionId]}
                            stroke="none"
                            style={{ mixBlendMode: 'screen' }}
                        />
                    );
                })}
            </g>

            {/* REGION LAYER (Secondary borders) */}
            <g mask="url(#planetInfluenceMask)" opacity="0.9" style={{ pointerEvents: 'none' }}>
                 {Object.entries(regionPaths).map(([region, pathData]) => (
                    <path
                        key={`region-${region}`}
                        d={pathData}
                        fill="none" 
                        stroke={regionColors[region] || '#ffffff'}
                        strokeWidth="8"
                        strokeDasharray="25,10"
                        strokeLinecap="butt" // Aspect rectangulaire des segments
                        strokeOpacity="0.6"
                        className="animate-pulse" // Petit effet animé optionnel
                    />
                ))}
            </g>
            
            {/* Fine bordure pour marquer la limite de zone (optionnel) */}
            <g mask="url(#planetInfluenceMask)" opacity="0.2" style={{ pointerEvents: 'none' }}>
                {Object.entries(outlinePaths).map(([factionId, pathData]) => {
                    if (!factionColors[factionId]) return null;
                    return (
                        <path
                            key={`line-${factionId}`}
                            d={pathData}
                            fill="none"
                            stroke={factionColors[factionId]}
                            strokeWidth="3"
                            strokeDasharray="10,5"
                        />
                    );
                })}
            </g>
        </g>
    );
}); export default BorderLayer;
