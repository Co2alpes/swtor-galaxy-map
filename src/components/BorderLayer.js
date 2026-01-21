"use client";

import { useMemo } from 'react';
import { Delaunay } from 'd3-delaunay';

export default function BorderLayer({ planets, factions }) {
    
    const { paths, factionColors } = useMemo(() => {
        if (!planets || planets.length === 0) return { paths: [], factionColors: {} };

        const points = planets.map(p => [p.x, p.y]);
        const delaunay = Delaunay.from(points);
        // On garde Voronoi pour les limites entre factions
        const voronoi = delaunay.voronoi([-5000, -5000, 10000, 10000]);

        const factionPaths = {}; 
        
        for (let i = 0; i < points.length; i++) {
            const planet = planets[i];
            const owner = planet.owner;
            if (!owner || owner === 'neutral') continue;

            const path = voronoi.renderCell(i);
            if (!factionPaths[owner]) factionPaths[owner] = "";
            factionPaths[owner] += path + " ";
        }

        const colors = {};
        factions.forEach(f => colors[f.id] = f.color);

        return { paths: factionPaths, factionColors: colors };
    }, [planets, factions]);

    return (
        <g className="border-layer pointer-events-none">
            <defs>
                {/* 1. Le flou pour l'aspect nébuleuse */}
                <filter id="nebulaBlur" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="20" />
                </filter>

                {/* 2. Le Masque : On ne dessine que des cercles autour des planètes */}
                {/* Ce masque limitera la portée visuelle de la couleur */}
                <mask id="planetInfluenceMask">
                    <rect x="-5000" y="-5000" width="10000" height="10000" fill="black" />
                    {planets.map(p => (
                        <circle 
                            key={`mask-${p.id}`} 
                            cx={p.x} 
                            cy={p.y} 
                            r="180" // Rayon de l'influence de la ville (Ajustez ici)
                            fill="white" 
                        />
                    ))}
                </mask>
            </defs>

            {/* Affichage des zones colorées bridées par le masque */}
            <g mask="url(#planetInfluenceMask)" filter="url(#nebulaBlur)" opacity="0.4">
                {Object.entries(paths).map(([factionId, pathData]) => (
                    <path
                        key={factionId}
                        d={pathData}
                        fill={factionColors[factionId] || '#ffffff'}
                        stroke="none"
                        style={{ mixBlendMode: 'screen' }}
                    />
                ))}
            </g>
            
            {/* Fine bordure pour marquer la limite de zone (optionnel) */}
            <g mask="url(#planetInfluenceMask)" opacity="0.2">
                {Object.entries(paths).map(([factionId, pathData]) => (
                    <path
                        key={`line-${factionId}`}
                        d={pathData}
                        fill="none"
                        stroke={factionColors[factionId] || '#ffffff'}
                        strokeWidth="3"
                        strokeDasharray="10,5"
                    />
                ))}
            </g>
        </g>
    );
}