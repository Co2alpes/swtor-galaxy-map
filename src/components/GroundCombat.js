import React, { useEffect, useRef, useState, useMemo } from 'react';

const DEFAULT_STATS = {
    infantry: { speed: 1.5, hp: 15, damage: 3, range: 80, cooldown: 20, size: 3, color: '#aaaaff', label: 'Infanterie', armor: 10, armorPen: 0, accuracy: 0.85, traits: ['biological'], bonuses: { biological: 1.1 } },
    heavy_infantry: { speed: 1, hp: 40, damage: 10, range: 120, cooldown: 45, size: 5, color: '#8888ff', label: 'Infanterie Lourde', armor: 40, armorPen: 15, accuracy: 0.80, traits: ['biological'], bonuses: { mechanized: 1.5, robotic: 1.2 } },
    vehicle: { speed: 2.5, hp: 120, damage: 35, range: 200, cooldown: 70, size: 9, color: '#4444ff', label: 'Véhicule Blindé', armor: 60, armorPen: 30, accuracy: 0.70, traits: ['mechanized'], bonuses: { biological: 1.5, mechanized: 1.0 } },
    turret: { speed: 0, hp: 250, damage: 40, range: 300, cooldown: 30, size: 12, color: '#ffaaaa', label: 'Tourelle Défensive', armor: 30, armorPen: 20, accuracy: 0.90, traits: ['robotic'], bonuses: { mechanized: 1.2 } },
    jedi_general: { speed: 2.2, hp: 450, damage: 60, range: 40, cooldown: 12, size: 8, color: '#00ff00', label: 'Général Jedi', isHero: true, isMelee: true, abilities: [], maxMana: 100, manaRegen: 1, armor: 30, armorPen: 50, accuracy: 0.95, traits: ['biological'], bonuses: { robotic: 2.0, mechanized: 1.5 } },
    sith_lord: { speed: 2.2, hp: 450, damage: 70, range: 40, cooldown: 12, size: 8, color: '#ff0000', label: 'Seigneur Sith', isHero: true, isMelee: true, abilities: [], maxMana: 100, manaRegen: 1, armor: 30, armorPen: 55, accuracy: 0.95, traits: ['biological'], bonuses: { robotic: 2.0, mechanized: 1.5 } },
    mandalorian_commander: { speed: 2.0, hp: 400, damage: 50, range: 100, cooldown: 10, size: 8, color: '#ff8800', label: 'Commandant Mandalorien', isHero: true, isMelee: false, abilities: [], maxMana: 100, manaRegen: 1, armor: 45, armorPen: 40, accuracy: 0.90, traits: ['biological', 'mechanized'], bonuses: { mechanized: 1.5 } }
};

const FACTION_COLORS = {
    republic: { units: '#3b82f6', projectiles: '#60a5fa' },
    empire: { units: '#ef4444', projectiles: '#f87171' },
    neutral: { units: '#ffffff', projectiles: '#e2e8f0' }
};

const TERRAIN_CONFIG = {
    plains: { color: '#2d5a27', speedMod: 1.0, rangeMod: 1.0, label: 'Plaines' },
    desert: { color: '#e6c288', speedMod: 0.8, rangeMod: 1.2, accuracyMod: 0.9, label: 'Désert' },
    urban: { color: '#333333', speedMod: 1.2, rangeMod: 0.8, accuracyMod: 0.9, label: 'Urbain' },
    snow: { color: '#e5e7eb', speedMod: 0.7, rangeMod: 1.0, accuracyMod: 0.8, label: 'Polaire' },
    volcanic: { color: '#2b0a0a', speedMod: 0.9, rangeMod: 1.0, damageMod: 1.1, label: 'Volcanique' },
    forest: { color: '#143316', speedMod: 0.8, rangeMod: 0.8, accuracyMod: 0.8, label: 'Forêt' },
    force_nexus: { color: '#290038', speedMod: 1.0, rangeMod: 1.0, manaRegenMod: 2.0, damageMod: 1.2, label: 'Nexus de Force' },
    industrial: { color: '#3f3f46', speedMod: 1.1, rangeMod: 1.0, label: 'Industriel' },
    unknown: { color: '#2d241b', speedMod: 1.0, rangeMod: 1.0, label: 'Standard' }
};

const MAP_WIDTH = 3000;
const MAP_HEIGHT = 2000;

export default function GroundCombat({ attackerArmy, defenderGarrison, planetType, onBattleEnd, customUnits = [], customMap = null, heroData = null, magicDomains = [] }) {
    const canvasRef = useRef(null);
    const [gameState, setGameState] = useState('fighting'); 
    
    // Resolve Terrain from planetType (or terrainType passed as planetType)
    const terrain = TERRAIN_CONFIG[planetType] || TERRAIN_CONFIG['unknown'];
    
    const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 0.8 }); // Camera State
    const cameraRef = useRef({ x: 0, y: 0, zoom: 0.8 });
    useEffect(() => { cameraRef.current = camera; }, [camera]);

    const UNIT_STATS = useMemo(() => {
        const stats = JSON.parse(JSON.stringify(DEFAULT_STATS)); // Deep copy 
        customUnits.forEach(u => {
            const unitStats = { ...u, speed: u.speed||2, hp: u.hp||50, damage: u.damage||5, range: u.range||100, cooldown: u.cooldown||30, size: u.size||5, color: u.color||'#fff', label: u.name, armor: u.armor||0, armorPen: u.armorPen||0, accuracy: u.accuracy||0.8, traits: u.traits || ['biological'], bonuses: u.bonuses || {}, abilities: u.abilities || [] };
            
            // --- MAGIC DOMAIN INTEGRATION ---
            if (magicDomains) {
                // If unit has domainId
                if (u.domainId) {
                    const domain = magicDomains.find(d => d.id === u.domainId);
                    if (domain && domain.talents) {
                        domain.talents.forEach(t => {
                            if ((t.type === 'active' || t.type === 'ultimate') && !unitStats.abilities.find(a => a.id === t.id)) {
                                let targetType = 'point';
                                if (t.archetype === 'projectile' || t.archetype === 'beam') targetType = 'target_enemy';
                                if (t.archetype === 'explosion' || t.archetype === 'heal') targetType = 'area';
                                if (t.archetype === 'buff' || t.archetype === 'summon' && !t.stats?.range) targetType = 'instant';
                                
                                unitStats.abilities.push({
                                    id: t.id,
                                    type: targetType,
                                    label: t.label,
                                    cost: t.stats?.cost || 0,
                                    cooldown: t.stats?.cooldown || 100
                                });
                            }
                        });
                    }
                }
                
                // If unit has explicit ability set (legacy or single selection)
                if (u.ability && !unitStats.abilities.find(a => a.id === u.ability)) {
                     for (const d of magicDomains) {
                         const t = d.talents?.find(tal => tal.id === u.ability);
                         if (t) {
                                let targetType = 'point';
                                if (t.archetype === 'projectile' || t.archetype === 'beam') targetType = 'target_enemy';
                                if (t.archetype === 'explosion' || t.archetype === 'heal') targetType = 'area';
                                if (t.archetype === 'buff' || t.archetype === 'summon' && !t.stats?.range) targetType = 'instant';
                             unitStats.abilities.push({ id: t.id, type: targetType, label: t.label, cost: t.stats?.cost||0, cooldown: t.stats?.cooldown||100 });
                             break;
                         }
                     }
                }
            }

            stats[u.id] = unitStats;
        });

        // APPLY HERO TALENTS
        if (heroData && heroData.unlocked) {
            ['jedi_general', 'sith_lord', 'mandalorian_commander'].forEach(heroType => {
                if (stats[heroType]) {
                    const s = stats[heroType];
                    // Ensure abilities array exists
                    s.abilities = s.abilities || [];

                    // --- DARK SIDE ---
                    if (heroData.unlocked.includes('mag_d1')) { s.lifeSteal = 20; } // Corruption
                    if (heroData.unlocked.includes('mag_d2')) { s.damage = Math.round(s.damage * 1.1); } // Haine
                    if (heroData.unlocked.includes('mag_d3') && !s.abilities.find(a=>a.id==='force_lightning')) { s.abilities.push({ id: 'force_lightning', type: 'target_enemy', label: 'Éclair', cost: 35, cooldown: 150 }); }
                    if (heroData.unlocked.includes('mag_d4')) { s.lifeSteal = (s.lifeSteal||0) + 10; } // Siphon
                    if (heroData.unlocked.includes('mag_d6') && !s.abilities.find(a=>a.id==='force_storm')) { s.abilities.push({ id: 'force_storm', type: 'area', label: 'Tempête', cost: 60, cooldown: 300 }); }
                    if (heroData.unlocked.includes('mag_d7')) { s.hp = Math.round(s.hp * 1.2); s.damage = Math.round(s.damage * 1.2); } // Seigneur Sith

                    // --- LIGHT SIDE ---
                    if (heroData.unlocked.includes('mag_l1')) { s.manaRegen = (s.manaRegen || 1) + 2; } // Méditation
                    if (heroData.unlocked.includes('mag_l2')) { s.manaCostMod = 0.9; } // Sérénité
                    if (heroData.unlocked.includes('mag_l3') && !s.abilities.find(a=>a.id==='force_heal')) { s.abilities.push({ id: 'force_heal', type: 'target_ally', label: 'Guérison', cost: 40, cooldown: 120 }); }
                    if (heroData.unlocked.includes('mag_l4')) { s.armor += 15; } // Aura
                    if (heroData.unlocked.includes('mag_l5')) { s.shield = 50; } // Protection
                    if (heroData.unlocked.includes('mag_l6') && !s.abilities.find(a=>a.id==='force_push')) { s.abilities.push({ id: 'force_push', type: 'area', label: 'Onde de Paix', cost: 30, cooldown: 100 }); }
                    if (heroData.unlocked.includes('mag_l7') && !s.abilities.find(a=>a.id==='force_avatar')) { s.abilities.push({ id: 'force_avatar', type: 'instant', label: 'Avatar', cost: 80, cooldown: 600 }); }

                    // --- MANDALORIAN ---
                    if (heroData.unlocked.includes('mag_m1')) { s.armor += 50; } // Beskar
                    if (heroData.unlocked.includes('mag_m2')) { s.accuracy = Math.min(1.0, s.accuracy + 0.15); } // Viseur
                    if (heroData.unlocked.includes('mag_m3') && !s.abilities.find(a=>a.id==='mando_missile')) { s.abilities.push({ id: 'mando_missile', type: 'target_enemy', label: 'Arsenal', cost: 30, cooldown: 150 }); }
                    if (heroData.unlocked.includes('mag_m4')) { s.explosiveResist = 0.5; } // Bouclier
                    if (heroData.unlocked.includes('mag_m5')) { s.speed = s.speed * 1.5; s.isFlying = true; } // Jetpack
                    if (heroData.unlocked.includes('mag_m6') && !s.abilities.find(a=>a.id==='mando_flame')) { s.abilities.push({ id: 'mando_flame', type: 'cone', label: 'Pyro', cost: 40, cooldown: 100 }); }
                    if (heroData.unlocked.includes('mag_m7') && !s.abilities.find(a=>a.id==='mando_reinforce')) { s.abilities.push({ id: 'mando_reinforce', type: 'instant', label: 'Mand\'alor', cost: 90, cooldown: 900 }); }
                }
            });
        }
        return stats;
    }, [customUnits, heroData, magicDomains]); 
    
    // Player controls (RTS style)
    const [selectedEntities, setSelectedEntities] = useState([]);
    const [selectionStart, setSelectionStart] = useState(null);
    const [isFacingMode, setIsFacingMode] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [hudUnits, setHudUnits] = useState([]); // FOR UI
    const [selectedUnitData, setSelectedUnitData] = useState(null); // FOR DETAIL CARD
    const [abilityTargeting, setAbilityTargeting] = useState(null);

    // Refs for Loop Access to state
    const selectionRef = useRef(null);
    const orderDragStartRef = useRef(null); // For Right-Click Drag Formation
    const isPanningRef = useRef(false); // Middle click panning
    const lastPanPosRef = useRef({ x: 0, y: 0 });
    const mouseRef = useRef({ x: 0, y: 0 });
    const selectedIdsRef = useRef([]);
    const isAbilityHoveredRef = useRef(false); // New Ref for Ability Hover State
    const abilityTargetingRef = useRef(null);

    const entitiesRef = useRef([]);
    const projectilesRef = useRef([]);
    const obstaclesRef = useRef([]); // Obstacles
    const explosionsRef = useRef([]);
    const commandFxRef = useRef([]);
    const requestRef = useRef();

    // Sync state to refs
    useEffect(() => { selectionRef.current = selectionStart; }, [selectionStart]);
    useEffect(() => { mouseRef.current = mousePos; }, [mousePos]);
    useEffect(() => { selectedIdsRef.current = selectedEntities; }, [selectedEntities]);
    useEffect(() => { abilityTargetingRef.current = abilityTargeting; }, [abilityTargeting]);

    // HUD Update Interval
    useEffect(() => {
        const interval = setInterval(() => {
            if (entitiesRef.current) {
                // Sync only attacker units (Player defaults to attacker/republic in sim)
                const myUnits = entitiesRef.current.filter(e => e.isAttacker).map(e => ({
                     id: e.id,
                     type: e.type,
                     hp: e.hp,
                     maxHp: e.maxHp,
                     mana: e.mana,
                     maxMana: e.maxMana,
                     state: e.state
                }));
                setHudUnits(myUnits);

                // Update Detail Card
                const selIds = selectedIdsRef.current;
                if (selIds.length > 0) {
                    const primary = entitiesRef.current.find(e => e.id === selIds[0]);
                    if (primary) {
                        setSelectedUnitData({
                            id: primary.id,
                            type: primary.type,
                            faction: primary.faction,
                            hp: primary.hp,
                            maxHp: primary.maxHp,
                            mana: primary.mana,
                            maxMana: primary.maxMana,
                            isSquad: primary.isSquad,
                            soldierCount: primary.soldiers ? primary.soldiers.length : 1,
                            cooldown: primary.cooldown
                        });
                    } else {
                        setSelectedUnitData(null);
                    }
                } else {
                    setSelectedUnitData(null);
                }
            }
        }, 100); // Faster update for smooth HP bars
        return () => clearInterval(interval);
    }, []);

    // Initialize battle
    useEffect(() => {
        // Use Fixed Map Size instead of Window
        const width = MAP_WIDTH;
        const height = MAP_HEIGHT;
        
        // Center camera initially
        setCamera({ 
            x: width/2 - window.innerWidth/2, 
            y: height/2 - window.innerHeight/2, 
            zoom: 0.6 
        });

        const entities = [];
        const obstacles = [];
        let idCounter = 0;

        // Helper to spawn units
        const isValidSpawn = (x, y, radius) => {
            for (const obs of obstacles) {
                if (obs.shape === 'rect') {
                    const margin = radius + 20; // Safe buffer
                    if (x > obs.x - obs.width/2 - margin && x < obs.x + obs.width/2 + margin &&
                        y > obs.y - obs.height/2 - margin && y < obs.y + obs.height/2 + margin) {
                        return false;
                    }
                } else {
                    const dx = x - obs.x;
                    const dy = y - obs.y;
                    const r = (obs.size/2) + radius + 20;
                    if (dx*dx + dy*dy < r*r) return false;
                }
            }
            return true;
        };

        const spawnArmy = (composition, faction, isAttacker) => {
            let centerX = isAttacker ? width * 0.15 : width * 0.85;
            let centerY = height / 2;
            let spread = 600; // Increased spread

            if (customMap && customMap.spawnZones) {
                const zone = isAttacker ? customMap.spawnZones.attacker : customMap.spawnZones.defender;
                if (zone) {
                    centerX = zone.x;
                    centerY = zone.y;
                    spread = zone.radius || 600;
                }
            }

            Object.entries(composition).forEach(([type, count]) => {
                const stats = UNIT_STATS[type];
                if (!stats) return;
                
                if (type === 'infantry') {
                    // SQUAD LOGIC: Blocks of 5 independant units controlled as one
                    const squadCount = Math.ceil(count / 5);
                    for (let i = 0; i < squadCount; i++) {
                         const soldiers = [];
                         // Formation 5-dice pattern
                         const offsets = [
                            {x:0, y:0}, {x:8, y:6}, {x:-8, y:-6}, {x:8, y:-6}, {x:-8, y:6}
                         ];
                         
                         for(let j=0; j<5; j++) {
                             soldiers.push({
                                 id: j,
                                 xOff: offsets[j].x + (Math.random()-0.5)*2,
                                 yOff: offsets[j].y + (Math.random()-0.5)*2,
                                 hp: stats.hp,
                                 maxHp: stats.hp,
                                 cooldown: Math.random() * stats.cooldown
                             });
                         }
                         
                         let spawnX, spawnY;
                         let attempts = 0;
                         do {
                             spawnX = centerX + (Math.random() - 0.5) * spread;
                             spawnY = centerY + (Math.random() - 0.5) * spread;
                             attempts++;
                         } while (!isValidSpawn(spawnX, spawnY, stats.size) && attempts < 20);

                         entities.push({
                            id: idCounter++,
                            type,
                            faction,
                            isAttacker,
                            x: spawnX,
                            y: spawnY,
                            angle: isAttacker ? 0 : Math.PI,
                            
                            isSquad: true,
                            soldiers: soldiers,
                            maxHp: stats.hp * 5, // Total max HP for UI
                            buffs: [],

                            target: null,
                            manualMove: null,
                            state: 'idle'
                        });
                    }
                } else {
                    for (let i = 0; i < count; i++) {
                        let spawnX, spawnY;
                        let attempts = 0;
                        do {
                            spawnX = centerX + (Math.random() - 0.5) * spread;
                            spawnY = centerY + (Math.random() - 0.5) * spread;
                            attempts++;
                        } while (!isValidSpawn(spawnX, spawnY, stats.size) && attempts < 20);

                        entities.push({
                            id: idCounter++,
                            type,
                            faction,
                            isAttacker,
                            x: spawnX,
                            y: spawnY,
                            angle: isAttacker ? 0 : Math.PI,
                            hp: stats.hp,
                            maxHp: stats.hp,
                            mana: stats.maxMana || 0,
                            maxMana: stats.maxMana || 0,
                            buffs: [],
                            // Shield Init
                            shield: (stats.traits||[]).includes('shielded') ? stats.hp * 0.5 : 0,
                            maxShield: (stats.traits||[]).includes('shielded') ? stats.hp * 0.5 : 0,
                            cooldown: Math.random() * stats.cooldown,
                            target: null,
                            manualMove: null,
                            state: 'idle'
                        });
                    }
                }
            });
        };

        // Spawn Obstacles
        const spawnObstacles = () => {
            if (customMap && customMap.obstacles) {
                customMap.obstacles.forEach(o => obstacles.push(o));
                return;
            }

            let count = 40; // More obstacles for big map
            let type = 'rock';
            let color = '#555';
            
            if (planetType === 'urban' || planetType === 'industrial') { count = 60; type = 'ruin'; color = '#444'; }
            else if (planetType === 'forest') { count = 80; type = 'tree'; color = '#2d5a27'; }
            else if (planetType === 'desert') { count = 30; type = 'rock'; color = '#8b5a2b'; }
            else if (planetType === 'snow') { count = 40; type = 'rock'; color = '#aaddff'; }
            else if (planetType === 'volcanic') { count = 50; type = 'rock'; color = '#331111'; }
            else if (planetType === 'force_nexus') { count = 20; type = 'crystal'; color = '#aa00ff'; }

            for (let i = 0; i < count; i++) {
                const shape = (type === 'ruin' || type === 'crystal') ? 'rect' : 'circle';
                const size = 60 + Math.random() * 80; // Bigger obstacles
                
                // Avoid spawn zones (edges)
                const x = width * 0.2 + Math.random() * (width * 0.6);
                const y = Math.random() * height;

                obstacles.push({
                    x, y,
                    shape,
                    size, 
                    width: size, 
                    height: (shape==='rect' && type==='crystal') ? size*2 : size,
                    color: color,
                    type: type
                });
            }
        };

        spawnObstacles();

        // Spawn Attacker
        if (attackerArmy) {
            spawnArmy(attackerArmy.composition, attackerArmy.owner || 'republic', true);
            if (attackerArmy.owner !== 'empire') spawnArmy({ 'jedi_general': 1 }, 'republic', true); // FORCE HERO FOR DEMO
        }

        // Spawn Defender
        if (defenderGarrison) {
           spawnArmy(defenderGarrison.composition, defenderGarrison.owner || 'empire', false);
           if (defenderGarrison.owner !== 'republic') spawnArmy({ 'sith_lord': 1 }, 'empire', false); // FORCE HERO FOR DEMO
        }

        entitiesRef.current = entities;
        obstaclesRef.current = obstacles;
        projectilesRef.current = [];
        explosionsRef.current = [];
        setSelectedEntities([]);
        
    }, [attackerArmy, defenderGarrison, UNIT_STATS, planetType]);

    // Cleanup
    useEffect(() => {
        return () => cancelAnimationFrame(requestRef.current);
    }, []);

    // Game Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const finalizeBattle = (result) => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            setTimeout(() => {
                const survivingAttackers = entitiesRef.current.filter(e => e.isAttacker);
                const survivingDefenders = entitiesRef.current.filter(e => !e.isAttacker);
                const winner = result === 'victory' ? (attackerArmy?.owner || 'republic') : (defenderGarrison?.owner || 'empire');
                
                onBattleEnd({
                    winner,
                    survivingAttackers: survivingAttackers.map(e => ({ type: e.type, hp: e.hp })),
                    survivingDefenders: survivingDefenders.map(e => ({ type: e.type, hp: e.hp }))
                });
            }, 2000);
        };

        const update = () => {
            if (gameState !== 'fighting') return;

            const entities = entitiesRef.current;
            const projectiles = projectilesRef.current;
            const explosions = explosionsRef.current;

            const attackersAlive = entities.some(e => e.isAttacker);
            const defendersAlive = entities.some(e => !e.isAttacker);

            if (!attackersAlive && !defendersAlive) {
                setGameState('draw');
                finalizeBattle('draw');
                return;
            } else if (!attackersAlive) {
                setGameState('defeat');
                finalizeBattle('defeat');
                return;
            } else if (!defendersAlive) {
                setGameState('victory');
                finalizeBattle('victory');
                return;
            }

            // Update Entities
            entities.forEach(entity => {
                // --- JUMP LOGIC ---
                if (entity.jumpData) {
                    const jd = entity.jumpData;
                    jd.progress++;
                    
                    const t = jd.progress / jd.duration;
                    // Linear Move
                    entity.x = jd.startX + (jd.targetX - jd.startX) * t;
                    entity.y = jd.startY + (jd.targetY - jd.startY) * t;

                    if (jd.progress >= jd.duration) {
                        entity.x = jd.targetX;
                        entity.y = jd.targetY;
                        
                        // LANDED
                        explosionsRef.current.push({ x: entity.x, y: entity.y, life: 25, size: 30, color: '#ffffff' });
                        
                        // Impact Damage 
                        entities.forEach(other => {
                             if (other.id !== entity.id && other.faction !== entity.faction) {
                                 const d = Math.sqrt(Math.pow(entity.x - other.x, 2) + Math.pow(entity.y - other.y, 2));
                                 if (d < jd.aoeRadius) {
                                      other.hp -= 40; 
                                      explosionsRef.current.push({ x: other.x, y: other.y, life: 10, size: 10, color: '#ff3333' });
                                 }
                             }
                        });
                        
                        delete entity.jumpData;
                    }
                    return; // SKIP OTHER LOGIC FOR JUMPING UNIT
                }

                let stats = UNIT_STATS[entity.type];

                // --- BUFF MAINTENANCE ---
                if (entity.buffs && entity.buffs.length > 0) {
                     entity.buffs.forEach(b => b.duration--);
                     entity.buffs = entity.buffs.filter(b => b.duration > 0);
                     
                     if (entity.buffs.length > 0) {
                         stats = { ...stats };
                         entity.buffs.forEach(b => {
                             if (b.stat === 'damage') stats.damage = (stats.damage || 0) + b.amount;
                             if (b.stat === 'armor') stats.armor = (stats.armor || 0) + b.amount;
                             if (b.stat === 'speed') stats.speed = (stats.speed || 0) + b.amount;
                             if (b.stat === 'cooldown') stats.cooldown = Math.max(5, (stats.cooldown || 30) - b.amount);
                         });
                         // Visual ID for Buffed Unit
                         if (Math.floor(Date.now() / 200) % 2 === 0) {
                            if (!commandFxRef.current) commandFxRef.current = []; // Safety
                            // Optional: Add sparkle? Too heavy for per-frame.
                         }
                     }
                }

                // --- PASSIVE TRAITS ---
                if (stats.traits) {
                    if (stats.traits.includes('regeneration')) {
                        if (entity.hp < entity.maxHp) entity.hp = Math.min(entity.hp + 0.05, entity.maxHp);
                    }
                    if (stats.traits.includes('shielded') && entity.maxShield > 0) {
                        if (entity.shield < entity.maxShield) entity.shield = Math.min(entity.shield + 0.05, entity.maxShield);
                    }
                }

                // 1. Target Selection
                if (entity.target && !entities.find(e => e.id === entity.target.id)) {
                    entity.target = null;
                }

                if (!entity.manualMove && !entity.target) {
                    let closest = null;
                    let minDist = Infinity;
                    entities.forEach(other => {
                        if (entity.isAttacker !== other.isAttacker) {
                            const dx = other.x - entity.x;
                            const dy = other.y - entity.y;
                            const dist = Math.sqrt(dx*dx + dy*dy);
                            if (dist < minDist) {
                                minDist = dist;
                                closest = other;
                            }
                        }
                    });
                    if (minDist < 600) { // Aggro range on ground
                         entity.target = closest;
                    }
                }

                // 2. Movement
                let moveTarget = null;
                let isMovingToAttack = false;

                if (entity.manualMove) {
                    moveTarget = entity.manualMove;
                    const dx = moveTarget.x - entity.x;
                    const dy = moveTarget.y - entity.y;
                    if (Math.sqrt(dx*dx + dy*dy) < 5) {
                        entity.manualMove = null;
                        // Snap to formation angle if speficied
                        if (entity.formationAngle !== undefined) {
                            entity.angle = entity.formationAngle;
                        }
                    }
                } else if (entity.target && !entity.holdPosition) {
                    moveTarget = entity.target;
                    isMovingToAttack = true;
                }

                if (moveTarget && stats.speed > 0) {
                    const dx = moveTarget.x - entity.x;
                    const dy = moveTarget.y - entity.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    const angleToTarget = Math.atan2(dy, dx);
                    
                    entity.angle = angleToTarget;

                    if (!isMovingToAttack || dist > stats.range * 0.95 * terrain.rangeMod) {
                         const speedMod = terrain.speedMod;
                         const nextX = entity.x + Math.cos(angleToTarget) * stats.speed * speedMod;
                         const nextY = entity.y + Math.sin(angleToTarget) * stats.speed * speedMod;
                         
                         // Check Collision with Obstacles
                         let blocked = false;
                         for (const obs of obstaclesRef.current) {
                             if (obs.shape === 'rect') {
                                 const margin = stats.size;
                                 if (nextX > obs.x - obs.width/2 - margin && nextX < obs.x + obs.width/2 + margin &&
                                     nextY > obs.y - obs.height/2 - margin && nextY < obs.y + obs.height/2 + margin) {
                                     blocked = true; break;
                                 }
                             } else {
                                 // Circle
                                 const dx = nextX - obs.x;
                                 const dy = nextY - obs.y;
                                 const minDist = (obs.size/2) + stats.size;
                                 if (dx*dx + dy*dy < minDist*minDist) {
                                     blocked = true; break;
                                 }
                             }
                         }

                         if (!blocked) {
                             entity.x = nextX;
                             entity.y = nextY;
                         } else {
                             // Slide along obstacle (simple approximation)
                             // Trying just X
                             let blockedX = false;
                             for (const obs of obstaclesRef.current) {
                                 /* simplified check for X */
                                 if (obs.shape === 'rect') {
                                    const margin = stats.size;
                                    if (nextX > obs.x - obs.width/2 - margin && nextX < obs.x + obs.width/2 + margin &&
                                        entity.y > obs.y - obs.height/2 - margin && entity.y < obs.y + obs.height/2 + margin) {
                                        blockedX = true; break;
                                    }
                                 } else {
                                     const dx = nextX - obs.x; 
                                     const dy = entity.y - obs.y;
                                     const minDist = (obs.size/2) + stats.size;
                                     if (dx*dx + dy*dy < minDist*minDist) { blockedX = true; break; }
                                 }
                             }
                             if(!blockedX) entity.x = nextX;
                             
                             // Trying just Y
                             let blockedY = false;
                             for (const obs of obstaclesRef.current) {
                                 /* simplified check for Y */
                                 if (obs.shape === 'rect') {
                                    const margin = stats.size;
                                    if (entity.x > obs.x - obs.width/2 - margin && entity.x < obs.x + obs.width/2 + margin &&
                                        nextY > obs.y - obs.height/2 - margin && nextY < obs.y + obs.height/2 + margin) {
                                        blockedY = true; break;
                                    }
                                 } else {
                                     const dx = entity.x - obs.x; 
                                     const dy = nextY - obs.y;
                                     const minDist = (obs.size/2) + stats.size;
                                     if (dx*dx + dy*dy < minDist*minDist) { blockedY = true; break; }
                                 }
                             }
                             if(!blockedY) entity.y = nextY;
                         }
                    }
                }

                // 3. Firing
                if (entity.target) {
                    const dx = entity.target.x - entity.x;
                    const dy = entity.target.y - entity.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    
                    if (!entity.manualMove) entity.angle = Math.atan2(dy, dx);

                    if (dist <= stats.range * terrain.rangeMod) {
                        if (stats.isMelee && entity.cooldown <= 0) {
                             // MELEE COMBAT - CHECK ACCURACY
                             let accuracy = stats.accuracy;
                             if (terrain.accuracyMod) accuracy *= terrain.accuracyMod;

                             if (Math.random() <= accuracy) {
                                  const targetStats = UNIT_STATS[entity.target.type];
                                  const targetArmor = targetStats.armor || 0;
                                  const effectiveArmor = Math.max(0, targetArmor - stats.armorPen);
                                  const damageMult = 1 - (effectiveArmor / 100);
                                  
                                  // Trait Bonus
                                  let traitMult = 1;
                                  if (stats.bonuses && targetStats.traits) {
                                      targetStats.traits.forEach(t => { if(stats.bonuses[t]) traitMult *= stats.bonuses[t]; });
                                  }

                                  // RAGE Trait
                                  let baseDmg = stats.damage;
                                  if (terrain.damageMod) baseDmg *= terrain.damageMod;

                                  if (stats.traits && stats.traits.includes('rage') && (entity.hp / entity.maxHp) < 0.5) {
                                      baseDmg *= 1.5;
                                  }

                                  let finalDamage = baseDmg * traitMult * damageMult;

                                  // SHIELD Logic (Target)
                                  if (entity.target.shield > 0) {
                                      const absorbed = Math.min(entity.target.shield, finalDamage);
                                      entity.target.shield -= absorbed;
                                      finalDamage -= absorbed;
                                      explosionsRef.current.push({ x: entity.target.x, y: entity.target.y, life: 8, size: 6, color: '#00ffff' });
                                  }

                                  entity.target.hp -= finalDamage;

                                  // VAMPIRISM Logic (Attacker)
                                  if (stats.traits && stats.traits.includes('vampirism')) {
                                      const heal = finalDamage * 0.2;
                                      entity.hp = Math.min(entity.hp + heal, entity.maxHp);
                                      commandFxRef.current.push({ type: 'heal', startX: entity.x, startY: entity.y, life: 20 });
                                  }
                                  
                                  // Blood/Spark FX
                                  explosionsRef.current.push({ 
                                      x: entity.target.x, 
                                      y: entity.target.y, 
                                      life: 5, 
                                      size: 3, 
                                      color: entity.faction === 'republic' ? '#00ff00' : '#ff0000' 
                                  });
                             } else {
                                  // MISS FX
                                  commandFxRef.current.push({
                                      type: 'miss',
                                      startX: entity.target.x, startY: entity.target.y,
                                      life: 20
                                  });
                             }

                             entity.cooldown = stats.cooldown;
                             
                             // Add Melee FX
                             commandFxRef.current.push({
                                 type: 'melee_slash',
                                 startX: entity.x, startY: entity.y,
                                 angle: entity.angle,
                                 faction: entity.faction,
                                 life: 10
                             });

                        } else if (entity.isSquad && entity.soldiers) {
                            // SQUAD FIRING: Each soldier fires independently
                             entity.soldiers.forEach(soldier => {
                                 if (soldier.cooldown > 0) return;
                                 
                                 const rot = entity.angle;
                                 const sx = entity.x + soldier.xOff * Math.cos(rot) - soldier.yOff * Math.sin(rot);
                                 const sy = entity.y + soldier.xOff * Math.sin(rot) + soldier.yOff * Math.cos(rot);
                                 
                                 const spreadAngle = (Math.random() - 0.5) * 0.2;
                                 
                                 let damage = stats.damage;
                                 if (terrain.damageMod) damage *= terrain.damageMod;

                                 // Accuracy Mod
                                 let accuracy = stats.accuracy;
                                 if (terrain.accuracyMod) accuracy *= terrain.accuracyMod;

                                 // RAGE for Squad
                                 if (stats.traits && stats.traits.includes('rage') && (entity.hp / entity.maxHp) < 0.5) {
                                    damage *= 1.5;
                                 }

                                 projectilesRef.current.push({
                                    x: sx,
                                    y: sy,
                                    vx: Math.cos(entity.angle + spreadAngle) * 12,
                                    vy: Math.sin(entity.angle + spreadAngle) * 12,
                                    damage: damage,
                                    armorPen: stats.armorPen,
                                    accuracy: accuracy,
                                    bonuses: stats.bonuses || {},
                                    faction: entity.faction,
                                    color: FACTION_COLORS[entity.faction]?.projectiles || '#fff',
                                    life: 40,
                                    sourceId: entity.id,
                                    traits: stats.traits || []
                                });
                                // Randomize reload slightly to Desync shots naturally
                                soldier.cooldown = stats.cooldown * (0.8 + Math.random()*0.4); 
                             });
                        } else if (entity.cooldown <= 0) {
                            // STANDARD FIRING
                            const spreadAngle = (Math.random() - 0.5) * 0.2;
                            let damage = stats.damage;
                            
                            if (terrain.damageMod) damage *= terrain.damageMod;

                            // RAGE TRAIT
                            if (stats.traits && stats.traits.includes('rage')) {
                                const hpPct = entity.hp / entity.maxHp;
                                if (hpPct < 0.5) damage *= 1.5;
                            }

                            // Accuracy Mod
                            let accuracy = stats.accuracy;
                            if (terrain.accuracyMod) accuracy *= terrain.accuracyMod;

                            projectiles.push({
                                x: entity.x + (Math.random()-0.5)*10,
                                y: entity.y + (Math.random()-0.5)*10,
                                vx: Math.cos(entity.angle + spreadAngle) * 12,
                                vy: Math.sin(entity.angle + spreadAngle) * 12,
                                damage: damage,
                                armorPen: stats.armorPen,
                                accuracy: accuracy,
                                bonuses: stats.bonuses || {},
                                faction: entity.faction,
                                color: FACTION_COLORS[entity.faction]?.projectiles || '#fff',
                                life: 40,
                                sourceId: entity.id,
                                traits: stats.traits || []
                            });
                            entity.cooldown = stats.cooldown;
                        }
                    }
                }

                // Cooldown Management
                if (entity.isSquad && entity.soldiers) {
                     entity.soldiers.forEach(s => { if(s.cooldown > 0) s.cooldown--; });
                } else {
                     if (entity.cooldown > 0) entity.cooldown--;
                }
                
                // Mana Regen
                if (UNIT_STATS[entity.type].isHero) {
                    let regen = 0.05;
                    if (terrain.manaRegenMod) regen *= terrain.manaRegenMod;
                    if (entity.mana < entity.maxMana) entity.mana += regen;
                }
            });

            // Update Projectiles
            for (let i = projectiles.length - 1; i >= 0; i--) {
                const p = projectiles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life--;

                if (p.life <= 0) {
                    projectiles.splice(i, 1);
                    continue;
                }

                // Obstacle Collision
                let obstacleHit = false;
                for (const obs of obstaclesRef.current) {
                    if (obs.shape === 'rect') {
                         if (p.x > obs.x - obs.width/2 && p.x < obs.x + obs.width/2 &&
                             p.y > obs.y - obs.height/2 && p.y < obs.y + obs.height/2) {
                             obstacleHit = true; break;
                         }
                    } else {
                         const dx = p.x - obs.x;
                         const dy = p.y - obs.y;
                         if (dx*dx + dy*dy < (obs.size/2)*(obs.size/2)) {
                             obstacleHit = true; break;
                         }
                    }
                }
                
                if (obstacleHit) {
                    projectiles.splice(i, 1);
                    explosionsRef.current.push({ x: p.x, y: p.y, life: 5, size: 3, color: '#cccccc' });
                    continue;
                }

                let hit = false;
                for (const entity of entities) {
                    if (FACTION_COLORS[entity.faction]?.units === FACTION_COLORS[p.faction]?.units) continue;
                    if (entity.faction === p.faction) continue;

                    let entityHit = false;

                    if (entity.isSquad && entity.soldiers) {
                         // SQUAD HIT DETECTION: Check individual soldiers
                         const rot = entity.angle;
                         const c = Math.cos(rot);
                         const s = Math.sin(rot);
                         
                         for (let si = 0; si < entity.soldiers.length; si++) {
                             const soldier = entity.soldiers[si];
                             // Transform local offset to world space
                             const sx = entity.x + soldier.xOff * c - soldier.yOff * s;
                             const sy = entity.y + soldier.xOff * s + soldier.yOff * c;
                             
                             const sdx = sx - p.x;
                             const sdy = sy - p.y;
                             // Hitbox for individual soldier
                             if (Math.sqrt(sdx*sdx + sdy*sdy) < UNIT_STATS[entity.type].size + 4) {
                                 // CHECK ACCURACY ON IMPACT
                                 if (Math.random() <= p.accuracy) {
                                     const targetArmor = UNIT_STATS[entity.type].armor || 0;
                                     const effectiveArmor = Math.max(0, targetArmor - p.armorPen);
                                     const damageMult = 1 - (effectiveArmor / 100);
                                     
                                     // Trait Bonus
                                     let traitMult = 1;
                                     const targetTraits = UNIT_STATS[entity.type].traits;
                                     if (p.bonuses && targetTraits) {
                                         targetTraits.forEach(t => { if(p.bonuses[t]) traitMult *= p.bonuses[t]; });
                                     }
                                     
                                     const finalDamage = p.damage * traitMult * damageMult;

                                     soldier.hp -= finalDamage;
                                     explosions.push({ x: sx, y: sy, life: 5, size: 2, color: '#ffaaaa' });
                                 } else {
                                     // MISS
                                     commandFxRef.current.push({
                                         type: 'miss',
                                         startX: sx, startY: sy,
                                         life: 10
                                     });
                                 }
                                 
                                 entityHit = true;
                                 break; // Projectile consumed
                             }
                         }
                         
                         if (entityHit) {
                             // Remove dead soldiers and update squad HP
                             const prevCount = entity.soldiers.length;
                             entity.soldiers = entity.soldiers.filter(s => s.hp > 0);
                             entity.hp = entity.soldiers.reduce((sum, s) => sum + s.hp, 0);
                             
                             // If soldiers died, add gore/explosion
                             if (entity.soldiers.length < prevCount) {
                                  explosions.push({ x: p.x, y: p.y, life: 10, size: 5, color: '#aa3333' });
                             }
                         }

                    } else {
                        // STANDARD HIT DETECTION
                        const dx = entity.x - p.x;
                        const dy = entity.y - p.y;
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        
                        const hitRadius = UNIT_STATS[entity.type].size + 4;
                        if (dist < hitRadius) {
                            // CHECK ACCURACY
                            if (Math.random() <= p.accuracy) {
                                const targetArmor = UNIT_STATS[entity.type].armor || 0;
                                const effectiveArmor = Math.max(0, targetArmor - p.armorPen);
                                const damageMult = 1 - (effectiveArmor / 100);
                                
                                // Trait Bonus
                                let traitMult = 1;
                                const targetTraits = UNIT_STATS[entity.type].traits || [];
                                if (p.bonuses && targetTraits) {
                                    targetTraits.forEach(t => { if(p.bonuses[t]) traitMult *= p.bonuses[t]; });
                                }
                                
                                let finalDamage = p.damage * traitMult * damageMult;

                                // --- SHIELD LOGIC ---
                                if (entity.shield > 0) {
                                    const absorbed = Math.min(entity.shield, finalDamage);
                                    entity.shield -= absorbed;
                                    finalDamage -= absorbed;
                                    explosions.push({ x: p.x, y: p.y, life: 8, size: 6, color: '#00ffff' }); // Shield Hit FX
                                }

                                entity.hp -= finalDamage;
                                
                                // --- VAMPIRISM LOGIC ---
                                if (p.traits && p.traits.includes('vampirism') && p.sourceId) {
                                     const attacker = entities.find(e => e.id === p.sourceId);
                                     if (attacker && attacker.hp > 0) {
                                         const healAmount = finalDamage * 0.2; // 20% Lifesteal
                                         attacker.hp = Math.min(attacker.hp + healAmount, attacker.maxHp);
                                         commandFxRef.current.push({ type: 'heal', startX: attacker.x, startY: attacker.y, life: 20 });
                                     }
                                }

                                explosions.push({ x: p.x, y: p.y, life: 5, size: 3, color: '#ffaaaa' });
                            } else {
                                // MISS
                                commandFxRef.current.push({
                                    type: 'miss',
                                    startX: p.x, startY: p.y,
                                    life: 10
                                });
                            }
                            entityHit = true;
                        }
                    }

                    if (entityHit) {
                        hit = true;
                        
                        // Check death
                        if (entity.hp <= 0) {
                            explosions.push({ x: entity.x, y: entity.y, life: 20, size: 10, color: '#ff6600' });
                            const idx = entities.indexOf(entity);
                            if (idx > -1) {
                                setSelectedEntities(prev => prev.filter(id => id !== entity.id));
                                entities.splice(idx, 1);
                            }
                        }
                        break;
                    }
                }
                if (hit) projectiles.splice(i, 1);
            }

            // Update Explosions
            for (let i = explosions.length - 1; i >= 0; i--) {
                explosions[i].life--;
                if (explosions[i].life <= 0) explosions.splice(i, 1);
            }

            // Update Command FX
            const commandFx = commandFxRef.current;
            for (let i = commandFx.length - 1; i >= 0; i--) {
                commandFx[i].life--;
                if (commandFx[i].type === 'attack' && commandFx[i].targetId) {
                    const target = entities.find(e => e.id === commandFx[i].targetId);
                    if (target) {
                        commandFx[i].targetX = target.x;
                        commandFx[i].targetY = target.y;
                    }
                }
                if (commandFx[i].life <= 0) commandFx.splice(i, 1);
            }

            draw(ctx, entities, projectiles, explosions, commandFx);
            requestRef.current = requestAnimationFrame(update);
        };

        const draw = (ctx, entities, projectiles, explosions, commandFx = []) => {
            // Ground Background (Clear Screen)
            ctx.fillStyle = '#2d241b'; 
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.save();
            const cam = cameraRef.current;
            ctx.scale(cam.zoom, cam.zoom);
            ctx.translate(-cam.x, -cam.y);

            // Draw Map Borders/Background
            ctx.fillStyle = '#251e16'; // Slightly lighter map area
            ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
            ctx.strokeStyle = '#554433';
            ctx.lineWidth = 10;
            ctx.strokeRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

            // Grid for scale
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.lineWidth = 1 / cam.zoom;
            for(let i=0; i<=MAP_WIDTH; i+=100) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,MAP_HEIGHT); ctx.stroke(); }
            for(let i=0; i<=MAP_HEIGHT; i+=100) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(MAP_WIDTH,i); ctx.stroke(); }

            // Obstacles
            obstaclesRef.current.forEach(obs => {
                ctx.fillStyle = obs.color;
                ctx.save();
                ctx.translate(obs.x, obs.y);
                
                // Shadow
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 5;
                ctx.shadowOffsetY = 5;

                if (obs.shape === 'rect') {
                    ctx.fillRect(-obs.width/2, -obs.height/2, obs.width, obs.height);
                    // Detail
                    ctx.shadowBlur = 0;
                    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(-obs.width/2, -obs.height/2, obs.width, obs.height);
                    
                    // Texture detail for buildings
                    if (obs.type === 'ruin' || obs.type === 'building') {
                        ctx.fillStyle = 'rgba(0,0,0,0.2)';
                        ctx.fillRect(-obs.width/2 + 5, -obs.height/2 + 5, 10, 10);
                        ctx.fillRect(obs.width/2 - 15, obs.height/2 - 15, 10, 10);
                    }
                } else {
                    ctx.beginPath();
                    ctx.arc(0, 0, obs.size/2, 0, Math.PI*2);
                    ctx.fill();
                    // Detail
                    ctx.shadowBlur = 0;
                    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    
                    // Tree detail
                    if (obs.type === 'tree') {
                        ctx.fillStyle = 'rgba(0,0,0,0.2)';
                        ctx.beginPath(); ctx.arc(-5, -5, obs.size/4, 0, Math.PI*2); ctx.fill();
                    }
                }
                ctx.restore();
            });

            // Command FX
            commandFx.forEach(fx => {
                ctx.save();
                
                if (fx.type === 'heal' || fx.type === 'area_heal') {
                     ctx.globalAlpha = Math.min(1, fx.life / 20); 
                     ctx.fillStyle = '#00ff00';
                     if (fx.type === 'heal') {
                         ctx.beginPath(); ctx.arc(fx.startX, fx.startY, 10, 0, Math.PI*2); ctx.fill();
                         ctx.font = "12px Arial"; ctx.fillStyle="white"; ctx.fillText("+", fx.startX, fx.startY-10 - (30-fx.life));
                     } else {
                         ctx.globalAlpha = Math.min(0.3, fx.life / 40);
                         ctx.beginPath(); ctx.arc(fx.startX, fx.startY, fx.size, 0, Math.PI*2); ctx.fill();
                         ctx.strokeStyle = '#00ff00'; ctx.lineWidth=2; ctx.stroke();
                     }
                }
                else if (fx.type === 'lightning' || fx.type === 'area_lightning') {
                     ctx.globalAlpha = Math.min(1, fx.life / 10);
                     ctx.strokeStyle = '#aa00ff';
                     ctx.shadowBlur = 10;
                     ctx.shadowColor = '#fff';
                     ctx.lineWidth = 3;
                     
                     if (fx.type === 'lightning') {
                         ctx.beginPath();
                         ctx.moveTo(fx.startX, fx.startY);
                         // Zig zag
                         let cx = fx.startX, cy = fx.startY;
                         const steps = 5;
                         for(let s=1; s<=steps; s++) {
                             const t = s/steps;
                             const tx = fx.startX + (fx.targetX - fx.startX)*t;
                             const ty = fx.startY + (fx.targetY - fx.startY)*t;
                             const ox = (Math.random()-0.5)*20;
                             const oy = (Math.random()-0.5)*20;
                             ctx.lineTo(tx+ox, ty+oy);
                         }
                         ctx.stroke();
                     } else {
                         // Area Shockwave
                         ctx.beginPath(); 
                         ctx.arc(fx.startX, fx.startY, fx.size * (1 - fx.life/20), 0, Math.PI*2); 
                         ctx.stroke();
                     }
                }
                else if (fx.type === 'melee_slash') {
                     // MELEE SWING ANIMATION
                     ctx.globalAlpha = Math.min(1, fx.life / 5);
                     ctx.strokeStyle = fx.faction === 'republic' ? '#00ff00' : '#ff0000';
                     ctx.lineWidth = 3;
                     ctx.shadowBlur = 10;
                     ctx.shadowColor = ctx.strokeStyle;
                     
                     ctx.translate(fx.startX, fx.startY);
                     ctx.rotate(fx.angle);
                     
                     ctx.beginPath();
                     // Draw an arc relative to unit facing
                     // Animate the arc sweep based on life
                     const sweep = (10 - fx.life) / 10; // 0 to 1
                     const startAng = -Math.PI/3 + (sweep * Math.PI/2);
                     const endAng = startAng + Math.PI/3;
                     
                     ctx.arc(0, 0, 20, startAng, endAng);
                     ctx.stroke();
                     
                     ctx.shadowBlur = 0;
                }
                else if (fx.type === 'miss') {
                     ctx.fillStyle = 'white';
                     ctx.font = '10px monospace';
                     ctx.globalAlpha = Math.min(1, fx.life / 10);
                     ctx.fillText("Manqué", fx.startX, fx.startY - (20-fx.life));
                }
                else {
                    // Standard Move/Attack Arrows
                    ctx.globalAlpha = Math.min(1, fx.life / 20); 
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = fx.type === 'move' ? '#00ff00' : '#ff0000';
                    ctx.fillStyle = fx.type === 'move' ? '#00ff00' : '#ff0000';
                    
                    // Arrow Line
                    ctx.beginPath();
                    ctx.moveTo(fx.startX, fx.startY);
                    ctx.lineTo(fx.targetX, fx.targetY);
                    ctx.stroke();
                    
                    // Arrow Head
                    const angle = Math.atan2(fx.targetY - fx.startY, fx.targetX - fx.startX);
                    ctx.translate(fx.targetX, fx.targetY);
                    ctx.rotate(angle);
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(-10, -5);
                    ctx.lineTo(-10, 5);
                    ctx.closePath();
                    ctx.fill();

                    // Ground Marker Ripple
                    ctx.rotate(-angle); 
                    ctx.beginPath();
                    ctx.arc(0, 0, 5 + (40-fx.life)/2, 0, Math.PI*2);
                    ctx.stroke();
                }

                ctx.restore();
            });

            // Camera transform continues for entities

            
            // Actually, looking at the code below 'draw':
            // The selection box logic is inside 'draw' loop? 
            // Wait, no. 'draw' is defined outside 'update', and called by 'update'.
            // The selection box drawing code I saw earlier was inside 'update' loop, BEFORE calling 'draw'?
            // Let's check where the selection box code is.

            const selStart = selectionRef.current;
            const dragStart = orderDragStartRef.current; // Formation Drag
            const mPos = mouseRef.current;

            if (selStart && mPos) {
                 const cam = cameraRef.current;
                 // Convert screen to world for selection box calculation
                 const wx = mPos.x/cam.zoom + cam.x;
                 const wy = mPos.y/cam.zoom + cam.y;
                 const sx = selStart.x; // stored as world coord
                 const sy = selStart.y; // stored as world coord
                 
                 ctx.strokeStyle = '#00ff00';
                 ctx.lineWidth = 2 / cam.zoom; // Constant thickness
                 ctx.strokeRect(sx, sy, wx - sx, wy - sy);
                 ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
                 ctx.fillRect(sx, sy, wx - sx, wy - sy);
            }
            
            // Formation Ghost Preview
            if (dragStart && mPos && selectedIdsRef.current.length > 0) {
                 const cam = cameraRef.current;
                 const wx = mPos.x/cam.zoom + cam.x;
                 const wy = mPos.y/cam.zoom + cam.y;
                 const dx = wx - dragStart.x;
                 const dy = wy - dragStart.y;
                 const dist = Math.sqrt(dx*dx + dy*dy);
                 
                 if (dist > 20) {
                     // Draw Line
                     ctx.beginPath();
                     ctx.moveTo(dragStart.x, dragStart.y);
                     ctx.lineTo(wx, wy);
                     ctx.strokeStyle = 'yellow';
                     ctx.setLineDash([5, 5]);
                     ctx.lineWidth = 2;
                     ctx.stroke();
                     ctx.setLineDash([]);
                     
                     // Draw Ghost Positions
                     const angle = Math.atan2(dy, dx);
                     const unitSpacing = 30;
                     const unitsPerRow = Math.max(1, Math.floor(dist / unitSpacing));
                     const count = selectedIdsRef.current.length;
                     
                     for(let i=0; i<count; i++) {
                         const row = Math.floor(i / unitsPerRow);
                         const col = i % unitsPerRow;
                         
                         const lineX = dragStart.x + Math.cos(angle) * (col * unitSpacing + unitSpacing/2);
                         const lineY = dragStart.y + Math.sin(angle) * (col * unitSpacing + unitSpacing/2);
                         
                         const facingAngle = angle - Math.PI/2;
                         const backX = -Math.cos(facingAngle) * (row * unitSpacing);
                         const backY = -Math.sin(facingAngle) * (row * unitSpacing);
                         
                         const ghostX = lineX + backX;
                         const ghostY = lineY + backY;
                         
                         // Ghost Dot
                         ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
                         ctx.beginPath();
                         ctx.arc(ghostX, ghostY, 5, 0, Math.PI*2);
                         ctx.fill();
                         
                         // Direction Arrow
                         ctx.beginPath();
                         ctx.moveTo(ghostX, ghostY);
                         ctx.lineTo(ghostX + Math.cos(facingAngle)*15, ghostY + Math.sin(facingAngle)*15);
                         ctx.strokeStyle = 'yellow';
                         ctx.lineWidth = 1;
                         ctx.stroke();
                     }
                 }
            }

            // AOE PREVIEW
            if (isAbilityHoveredRef.current) {
                const selectedIds = selectedIdsRef.current;
                selectedIds.forEach(id => {
                    const ent = entities.find(e => e.id === id);
                    if (ent && UNIT_STATS[ent.type].isHero) {
                        ctx.save(); ctx.translate(ent.x, ent.y); // Use local coords
                        ctx.fillStyle = ent.faction === 'republic' ? 'rgba(0, 255, 0, 0.15)' : 'rgba(128, 0, 128, 0.15)';
                        ctx.strokeStyle = ent.faction === 'republic' ? 'rgba(0, 255, 0, 0.5)' : 'rgba(128, 0, 128, 0.5)';
                        ctx.lineWidth = 2;
                        
                        ctx.beginPath();
                        ctx.arc(0, 0, 150, 0, Math.PI * 2); 
                        ctx.fill();
                        ctx.stroke();

                        // Pulse Effect
                        const pulse = (Date.now() % 1000) / 1000;
                        ctx.beginPath();
                        ctx.arc(0, 0, 150 * pulse, 0, Math.PI * 2); 
                        ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 - pulse/2})`;
                        ctx.stroke();
                        ctx.restore();
                    }
                });
            }
            
            // TARGETING INDICATOR (Dynamic) - Needs World Coords for Mouse
            if (abilityTargetingRef.current && abilityTargetingRef.current.type === 'jetpack_jump') {
                const t = abilityTargetingRef.current;
                const ent = entities.find(e => e.id === t.sourceId);
                const mPos = mouseRef.current; // This is SCREEN coords, need WORLD coords

                if (ent && mPos) {
                    const cam = cameraRef.current;
                    const wx = mPos.x/cam.zoom + cam.x;
                    const wy = mPos.y/cam.zoom + cam.y;

                    // Max Range Circle
                    ctx.beginPath();
                    ctx.arc(ent.x, ent.y, t.maxRange, 0, Math.PI * 2);
                    ctx.strokeStyle = 'cyan';
                    ctx.setLineDash([5, 5]);
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.setLineDash([]);

                    // Calculate Clamp
                    const dx = wx - ent.x;
                    const dy = wy - ent.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    let tx = wx;
                    let ty = wy;
                    
                    if (dist > t.maxRange) {
                        const ratio = t.maxRange / dist;
                        tx = ent.x + dx * ratio;
                        ty = ent.y + dy * ratio;
                    }

                    // Line to Target
                    ctx.beginPath();
                    ctx.moveTo(ent.x, ent.y);
                    ctx.lineTo(tx, ty);
                    ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    // Impact Circle
                    ctx.beginPath();
                    ctx.arc(tx, ty, t.aoeRadius, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
                    ctx.fill();
                    ctx.strokeStyle = 'cyan';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    
                    // Crosshair at center
                    ctx.beginPath(); ctx.moveTo(tx-10, ty); ctx.lineTo(tx+10, ty); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(tx, ty-10); ctx.lineTo(tx, ty+10); ctx.stroke();
                }
            }

            // Entities
            const selectedIds = selectedIdsRef.current;
            entities.forEach(e => {
                // Optimization: Don't draw off-screen entities
                const cam = cameraRef.current;
                if (e.x < cam.x - 100 || e.x > cam.x + canvas.width/cam.zoom + 100 ||
                    e.y < cam.y - 100 || e.y > cam.y + canvas.height/cam.zoom + 100) return;

                const stats = UNIT_STATS[e.type];
                const isSelected = selectedIds.includes(e.id);
                
                ctx.save();
                ctx.translate(e.x, e.y);
                
                // Jump Scale Effect
                if (e.jumpData) {
                    const p = e.jumpData.progress / e.jumpData.duration;
                    const height = Math.sin(p * Math.PI); // Parabolic 0->1->0
                    const scale = 1 + height * 0.5;
                    ctx.scale(scale, scale);
                    ctx.shadowBlur = 30 * height;
                    ctx.shadowColor = 'rgba(0,0,0,0.5)';
                }

                ctx.rotate(e.angle);

                // Highlight if selected
                // Highlight if selected
                if (isSelected) {
                    // Selection Ring
                    ctx.beginPath();
                    ctx.arc(0, 0, stats.size + 4, 0, Math.PI * 2);
                    ctx.strokeStyle = '#00ff00';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    // Hold Position Indicator
                    if (e.holdPosition) {
                        ctx.fillStyle = '#ffcc00';
                        ctx.beginPath();
                        ctx.arc(0, 0, 3, 0, Math.PI*2); // Center dot
                        ctx.fill();
                        ctx.strokeStyle = '#ffcc00';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.rect(-stats.size - 4, -stats.size - 4, (stats.size+4)*2, (stats.size+4)*2); // Box
                        ctx.stroke();
                    }

                    // Range Cone Visualization
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.arc(0, 0, stats.range, -Math.PI / 6, Math.PI / 6); // 60 degree cone
                    ctx.lineTo(0, 0);
                    ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
                    ctx.stroke();
                    
                    // Full Range Line (faint circle)
                    ctx.beginPath();
                    ctx.arc(0, 0, stats.range, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                    ctx.setLineDash([2, 4]);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }

                // Stealth Transparency
                if (stats.traits && stats.traits.includes('stealth')) {
                     ctx.globalAlpha = 0.6;
                }

                // Body
                ctx.fillStyle = FACTION_COLORS[e.faction]?.units || '#fff';
                
                if (e.isSquad && e.soldiers) {
                    // Render individual soldiers at their relative offsets
                    e.soldiers.forEach(soldier => {
                         ctx.beginPath(); 
                         ctx.arc(soldier.xOff, soldier.yOff, stats.size, 0, Math.PI * 2); 
                         ctx.fill();
                    });
                } 
                else if (e.type === 'infantry') {
                    ctx.beginPath(); ctx.arc(0, 0, stats.size, 0, Math.PI * 2); ctx.fill();
                } else if (e.type === 'heavy_infantry') {
                    ctx.fillRect(-stats.size, -stats.size, stats.size*2, stats.size*2);
                } else if (e.type === 'vehicle') {
                    ctx.fillRect(-stats.size*1.5, -stats.size, stats.size*3, stats.size*2);
                    // Turret on top
                    ctx.fillStyle = '#111';
                    ctx.beginPath(); ctx.arc(0, 0, stats.size*0.6, 0, Math.PI * 2); ctx.fill();
                } else if (e.type === 'turret') {
                    ctx.beginPath(); ctx.moveTo(stats.size,0); ctx.lineTo(-stats.size, stats.size); ctx.lineTo(-stats.size, -stats.size); ctx.fill();
                } else if (UNIT_STATS[e.type].isHero) {
                     // HERO DRAWING
                     ctx.shadowBlur = 15;
                     ctx.shadowColor = e.faction === 'republic' ? '#00ff00' : '#ff0000';
                     
                     ctx.beginPath(); 
                     ctx.arc(0, 0, stats.size, 0, Math.PI * 2); 
                     ctx.fill();
                     
                     // Reset Shadow
                     ctx.shadowBlur = 0;
                     
                     // Star/Icon
                     ctx.fillStyle = '#fff';
                     ctx.font = '10px Arial';
                     ctx.textAlign = 'center';
                     ctx.textBaseline = 'middle';
                     ctx.fillText('★', 0, 0);

                     // Mana Bar (Top Most)
                     if (e.maxMana > 0) {
                         const yOff = (e.maxShield > 0) ? -stats.size - 12 : -stats.size - 9;
                         ctx.fillStyle = '#000044';
                         ctx.fillRect(-6, yOff, 12, 2);
                         ctx.fillStyle = '#aa00ff';
                         ctx.fillRect(-6, yOff, 12 * (e.mana / e.maxMana), 2);
                     }
                }

                // Shield Bar (Middle)
                if (e.maxShield > 0) {
                     ctx.fillStyle = '#004444';
                     ctx.fillRect(-6, -stats.size - 9, 12, 2);
                     ctx.fillStyle = '#00ffff';
                     ctx.fillRect(-6, -stats.size - 9, 12 * (e.shield / e.maxShield), 2);
                }

                // HP Bar (Bottom)
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(-6, -stats.size - 6, 12, 2);
                ctx.fillStyle = '#00ff00';
                ctx.fillRect(-6, -stats.size - 6, 12 * (e.hp / e.maxHp), 2);

                ctx.restore();
            });

            // Projectiles
            projectiles.forEach(p => {
                const cam = cameraRef.current;
                if (p.x < cam.x || p.x > cam.x + canvas.width/cam.zoom || p.y < cam.y || p.y > cam.y + canvas.height/cam.zoom) return;
                
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.beginPath();
                ctx.arc(0, 0, 2, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();
                ctx.restore();
            });

            // Explosions
            explosions.forEach(e => {
                const cam = cameraRef.current;
                if (e.x < cam.x - 50 || e.x > cam.x + canvas.width/cam.zoom + 50 || e.y < cam.y - 50 || e.y > cam.y + canvas.height/cam.zoom + 50) return;

                ctx.save();
                ctx.translate(e.x, e.y);
                ctx.beginPath();
                ctx.arc(0, 0, e.size * (e.life/10), 0, Math.PI * 2);
                ctx.fillStyle = e.color || `rgba(255, 100, 0, ${e.life / 20})`;
                ctx.fill();
                ctx.restore();
            });
            
            // UI Overlay (Fixed on screen)
            ctx.restore(); // END CAMERA TRANSFORM
            
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(10, 10, 300, 30);
            ctx.fillStyle = 'white';
            ctx.font = '16px monospace';
            ctx.fillText(`Caméra: ${Math.round(cameraRef.current.x)},${Math.round(cameraRef.current.y)} (Zoom: ${cameraRef.current.zoom.toFixed(1)}x)`, 20, 30);
            ctx.fillText(`Molette pour Zoomer - Clic Molette pour Déplacer`, 20, 50);

            if (gameState === 'victory') {
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.fillRect(0, canvas.height/2 - 50, canvas.width, 100);
                ctx.fillStyle = '#00ff00';
                ctx.font = 'bold 48px serif';
                ctx.textAlign = 'center';
                ctx.fillText('VICTOIRE', canvas.width/2, canvas.height/2 + 15);
            }
            if (gameState === 'defeat') {
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.fillRect(0, canvas.height/2 - 50, canvas.width, 100);
                ctx.fillStyle = '#ff0000';
                ctx.font = 'bold 48px serif';
                ctx.textAlign = 'center';
                ctx.fillText('DÉFAITE', canvas.width/2, canvas.height/2 + 15);
            }
        };

        requestRef.current = requestAnimationFrame(update);
    }, [gameState]);

    // INPUT HANDLERS
    const handleMouseDown = (e) => {
        if (isFacingMode) return;
        
        // ABILITY TARGETING CLICK
        if (abilityTargetingRef.current) {
            if (e.button === 0) {
                 executeAbilityAction(abilityTargetingRef.current, e.clientX, e.clientY);
                 setAbilityTargeting(null);
            } else if (e.button === 2) {
                 setAbilityTargeting(null); // Cancel
            }
            return;
        }

        const cam = cameraRef.current;
        const wx = e.clientX / cam.zoom + cam.x;
        const wy = e.clientY / cam.zoom + cam.y;

        if (e.button === 0) { // Left Click (Selection)
            setSelectionStart({ x: wx, y: wy });
            setMousePos({ x: e.clientX, y: e.clientY }); // Keep Screen Coords for drag check
        } else if (e.button === 1) { // Middle Click Pan Start
            e.preventDefault();
            isPanningRef.current = true;
            lastPanPosRef.current = { x: e.clientX, y: e.clientY };
        } else if (e.button === 2) { // Right Click (Order Start)
            e.preventDefault();
            orderDragStartRef.current = { x: wx, y: wy };
        }
    };

    const handleMouseMove = (e) => {
        setMousePos({ x: e.clientX, y: e.clientY });

        // Pan with Middle Mouse Button
        if (isPanningRef.current || e.buttons === 4) { 
             // Safety: If dragging stopped outside canvas (buttons is 0 or not including middle)
             if ((e.buttons & 4) === 0) {
                 isPanningRef.current = false;
                 return;
             }

             const currentX = e.clientX;
             const currentY = e.clientY;
             
             // If we just started via buttons check but ref wasn't set (rare mid-drag enter), sync
             if (!isPanningRef.current) {
                 isPanningRef.current = true;
                 lastPanPosRef.current = { x: currentX, y: currentY };
                 return;
             }

             const dx = currentX - lastPanPosRef.current.x;
             const dy = currentY - lastPanPosRef.current.y;

             if (dx !== 0 || dy !== 0) {
                 setCamera(prev => ({
                     ...prev,
                     x: prev.x - dx / prev.zoom,
                     y: prev.y - dy / prev.zoom
                 }));
                 lastPanPosRef.current = { x: currentX, y: currentY };
             }
        }
    };
    
    // Zoom Handler
    useEffect(() => {
        const handleWheel = (e) => {
            e.preventDefault();
            setCamera(prev => {
                const newZoom = Math.max(0.2, Math.min(2.0, prev.zoom - e.deltaY * 0.001));
                
                // Zoom towards mouse pointer logic would be better but simple zoom for now
                // Adjust x/y to keep center?
                // Let's just zoom center for simplicity
                const width = window.innerWidth;
                const height = window.innerHeight;
                
                // Keep center
                const cx = prev.x + width/2/prev.zoom;
                const cy = prev.y + height/2/prev.zoom;
                
                const newX = cx - width/2/newZoom;
                const newY = cy - height/2/newZoom;
                
                return {
                    x: newX,
                    y: newY,
                    zoom: newZoom
                };
            });
        };
        
        window.addEventListener('wheel', handleWheel, { passive: false });
        return () => window.removeEventListener('wheel', handleWheel);
    }, []);

    const handleMouseUp = (e) => {
        if (e.button === 1) {
            isPanningRef.current = false;
        }

        const cam = cameraRef.current;
        const wx = e.clientX / cam.zoom + cam.x;
        const wy = e.clientY / cam.zoom + cam.y;

        if (isFacingMode && e.button === 0) {
            const entities = entitiesRef.current;
            // Use World Coords for Facing Logic
            
            selectedEntities.forEach(id => {
                const ent = entities.find(e => e.id === id);
                if (ent) {
                    const dx = wx - ent.x;
                    const dy = wy - ent.y;
                    ent.angle = Math.atan2(dy, dx);
                    ent.manualMove = null; 
                }
            });
            setIsFacingMode(false);
            return;
        }

        if (e.button === 0 && selectionStart) {
            // Both selectionStart and (wx, wy) are now World Coords
            const x1 = Math.min(selectionStart.x, wx);
            const y1 = Math.min(selectionStart.y, wy);
            const x2 = Math.max(selectionStart.x, wx);
            const y2 = Math.max(selectionStart.y, wy);

            const selected = entitiesRef.current.filter(ent => 
                ent.isAttacker && 
                ent.x >= x1 && ent.x <= x2 &&
                ent.y >= y1 && ent.y <= y2
            ).map(e => e.id);

            setSelectedEntities(selected);
            setSelectionStart(null);
        }
        else if (e.button === 2 && orderDragStartRef.current) {
            // EXECUTE ORDER
            const start = orderDragStartRef.current; // World coords
            const end = { x: wx, y: wy }; // World coords
            const dist = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
            const entities = entitiesRef.current;
            const selectedUnits = entities.filter(ent => selectedEntities.includes(ent.id));
            
            if (selectedUnits.length === 0) {
                orderDragStartRef.current = null;
                return;
            }

            if (dist < 20) {
                 // === CLICK: ATTACK OR MOVE (Standard) ===
                const clickedEntity = entities.find(ent => {
                    const dx = ent.x - end.x;
                    const dy = ent.y - end.y;
                    return Math.sqrt(dx*dx + dy*dy) < UNIT_STATS[ent.type].size + 10;
                });
                
                // Center for FX
                const startX = selectedUnits.reduce((sum, u) => sum + u.x, 0) / selectedUnits.length;
                const startY = selectedUnits.reduce((sum, u) => sum + u.y, 0) / selectedUnits.length;
                
                let orderType = 'move';
                
                selectedUnits.forEach(ent => {
                    ent.holdPosition = false; // Reset Hold Position on manual order
                    if (clickedEntity && clickedEntity.faction !== ent.faction) {
                        ent.target = clickedEntity;
                        ent.manualMove = null;
                        orderType = 'attack';
                    } else {
                        // Spread out slightly
                        ent.manualMove = { 
                            x: end.x + (Math.random()-0.5)*30, 
                            y: end.y + (Math.random()-0.5)*30 
                        };
                        ent.target = null;
                    }
                });

                if (orderType === 'attack' && clickedEntity) {
                     commandFxRef.current.push({
                        type: 'attack',
                        startX, startY,
                        targetX: clickedEntity.x, targetY: clickedEntity.y,
                        targetId: clickedEntity.id,
                        life: 40
                     });
                } else {
                     commandFxRef.current.push({
                        type: 'move',
                        startX, startY,
                        targetX: end.x, targetY: end.y,
                        life: 40
                     });
                }

            } else {
                 // === DRAG: FORMATION MOVE ===
                 // ... calculations omitted ...
                 const dx = end.x - start.x;
                 const dy = end.y - start.y;
                 const angle = Math.atan2(dy, dx);
                 const length = Math.sqrt(dx*dx + dy*dy);
                 const unitSpacing = 30;
                 
                 // How many fit in one row?
                 const unitsPerRow = Math.max(1, Math.floor(length / unitSpacing));
                 
                 // Helper to distribute
                 selectedUnits.forEach((ent, i) => {
                     ent.holdPosition = false; // Reset Hold Position
                     const row = Math.floor(i / unitsPerRow);
                     const col = i % unitsPerRow;
                     
                     const lineX = start.x + Math.cos(angle) * (col * unitSpacing + unitSpacing/2);
                     const lineY = start.y + Math.sin(angle) * (col * unitSpacing + unitSpacing/2);
                     
                     const facingAngle = angle - Math.PI/2;
                     const backX = -Math.cos(facingAngle) * (row * unitSpacing);
                     const backY = -Math.sin(facingAngle) * (row * unitSpacing);
                     
                     ent.manualMove = {
                         x: lineX + backX,
                         y: lineY + backY
                     };
                     ent.formationAngle = facingAngle; 
                     ent.target = null;
                 });
                 
                 // FX
                 const startX = selectedUnits.reduce((sum, u) => sum + u.x, 0) / selectedUnits.length;
                 const startY = selectedUnits.reduce((sum, u) => sum + u.y, 0) / selectedUnits.length;
                 commandFxRef.current.push({
                    type: 'move',
                    startX, startY,
                    targetX: (start.x + end.x)/2, targetY: (start.y + end.y)/2,
                    life: 40
                 });
            }
            
            orderDragStartRef.current = null;
        }
    };

    const castAbility = (abilityType) => {
        const entities = entitiesRef.current;
        const selected = selectedIdsRef.current;
        
        selected.forEach(id => {
            const ent = entities.find(e => e.id === id);
            if (ent && UNIT_STATS[ent.type].isHero && ent.mana >= UNIT_STATS[ent.type].manaCost) {
                // Execute Ability
                const stats = UNIT_STATS[ent.type];
                ent.mana -= stats.manaCost;
                
                if (stats.ability === 'force_heal') {
                     // Heal Self and Nearby
                     entities.forEach(other => {
                         if (other.faction === ent.faction) {
                             const dist = Math.sqrt(Math.pow(ent.x - other.x, 2) + Math.pow(ent.y - other.y, 2));
                             if (dist < 150) {
                                 other.hp = Math.min(other.hp + 150, other.maxHp);
                                 // FX
                                 commandFxRef.current.push({
                                     type: 'heal',
                                     startX: other.x, startY: other.y,
                                     life: 30
                                 });
                             }
                         }
                     });
                     // Big FX
                     commandFxRef.current.push({
                         type: 'area_heal',
                         startX: ent.x, startY: ent.y,
                         size: 150,
                         life: 40
                     });
                } else if (stats.ability === 'force_lightning') {
                     // DMG Nearby Enemies
                     let hitCount = 0;
                     entities.forEach(other => {
                         if (other.faction !== ent.faction) {
                             const dist = Math.sqrt(Math.pow(ent.x - other.x, 2) + Math.pow(ent.y - other.y, 2));
                             if (dist < 150) {
                                 other.hp -= 80;
                                 hitCount++;
                                 // FX
                                 commandFxRef.current.push({
                                     type: 'lightning',
                                     startX: ent.x, startY: ent.y,
                                     targetX: other.x, targetY: other.y,
                                     life: 15
                                 });
                                 explosionsRef.current.push({ x: other.x, y: other.y, life: 10, size: 5, color: '#aa00ff' });
                             }
                         }
                     });
                     if (hitCount === 0) {
                         // Whiff FX
                         commandFxRef.current.push({
                             type: 'area_lightning',
                             startX: ent.x, startY: ent.y,
                             size: 150,
                             life: 20
                         });
                     }
                } else if (stats.ability === 'force_push') {
                    // Knockback + Damage
                    let hitCount = 0;
                    entities.forEach(other => {
                        if (other.faction !== ent.faction) {
                            const dx = other.x - ent.x;
                            const dy = other.y - ent.y;
                            const dist = Math.sqrt(dx*dx + dy*dy);
                            if (dist < 150) {
                                const angle = Math.atan2(dy, dx);
                                other.x += Math.cos(angle) * 80;
                                other.y += Math.sin(angle) * 80;
                                other.hp -= 50; 
                                hitCount++;
                                explosionsRef.current.push({ x: other.x, y: other.y, life: 10, size: 8, color: '#ffffff' });
                            }
                        }
                    });
                     // Shockwave FX (Simulated with Area Heal but different usage if possible, else Area Lightning)
                     commandFxRef.current.push({
                        type: 'area_lightning', // Reusing area effect
                         startX: ent.x, startY: ent.y,
                         size: 150,
                         life: 30
                     });
                } else if (stats.ability === 'battle_meditation') {
                     // Restore CD + Heal small amount
                     entities.forEach(other => {
                         if (other.faction === ent.faction) {
                             const dist = Math.sqrt(Math.pow(ent.x - other.x, 2) + Math.pow(ent.y - other.y, 2));
                             if (dist < 250) {
                                 other.hp = Math.min(other.hp + 50, other.maxHp);
                                 other.cooldown = 0; // Instant reset
                                 commandFxRef.current.push({ type: 'heal', startX: other.x, startY: other.y, life: 30 });
                             }
                         }
                     });
                     commandFxRef.current.push({
                         type: 'area_heal', // Reusing heal visual
                         startX: ent.x, startY: ent.y,
                         size: 250,
                         life: 40
                     });
                } else if (stats.ability === 'jetpack_jump') {
                     // Trigger Targeting Mode
                     setAbilityTargeting({
                         type: 'jetpack_jump',
                         sourceId: ent.id,
                         maxRange: 500,
                         aoeRadius: 60
                     });
                     // Mana consumed on execution, revert here
                     ent.mana += stats.manaCost; 
                }
            }
        });
    };

    const executeAbilityAction = (targetingData, screenX, screenY) => {
        const cam = cameraRef.current;
        const wx = screenX/cam.zoom + cam.x;
        const wy = screenY/cam.zoom + cam.y;

        const ent = entitiesRef.current.find(e => e.id === targetingData.sourceId);
        if (!ent) return;
        
        const stats = UNIT_STATS[ent.type];
        const ability = stats.abilities ? stats.abilities.find(a => a.id === targetingData.id) : null;
        const cost = ability ? ability.cost : (stats.manaCost || 0);

        if (ent.mana < cost) return;
        ent.mana -= cost;

        // ABILITY LOGIC
        switch(targetingData.id) {
            case 'jetpack_jump': {
                executeJetpackJump(targetingData, wx, wy); // Reuse legacy function but check mana there? No, mana deducted here.
                // Wait, logic above deducted mana. Legacy fx deducted mana too. Double deduction.
                // I should move logic inside here.
                const dx = wx - ent.x;
                const dy = wy - ent.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                let jumpX = wx; let jumpY = wy;
                if (dist > 300) { jumpX = ent.x + dx * (300/dist); jumpY = ent.y + dy * (300/dist); }
                commandFxRef.current.push({ type: 'move', startX: ent.x, startY: ent.y, targetX: jumpX, targetY: jumpY, life: 15 });
                ent.jumpData = { startX: ent.x, startY: ent.y, targetX: jumpX, targetY: jumpY, progress: 0, duration: 30 };
                ent.state = 'jumping';
                break;
            }
            case 'force_lightning': {
                projectilesRef.current.push({ id: Math.random(), x: ent.x, y: ent.y, targetX: wx, targetY: wy, speed: 20, damage: 40, type: 'beam', color: '#a855f7', faction: ent.faction });
                break;
            }
            case 'force_storm': {
                explosionsRef.current.push({ x: wx, y: wy, radius: 150, life: 60, maxLife: 60, color: '#a855f7', damage: 1, isDoT: true, faction: ent.faction });
                break;
            }
            case 'force_heal': {
                commandFxRef.current.push({ type: 'heal', startX: wx, startY: wy, life: 30 });
                entitiesRef.current.forEach(t => {
                   if (t.faction === ent.faction && Math.hypot(t.x-wx, t.y-wy) < 50) {
                       t.hp = Math.min(t.maxHp, t.hp + 60);
                   } 
                });
                break;
            }
            case 'force_push': {
                explosionsRef.current.push({ x: wx, y: wy, radius: 200, life: 20, maxLife: 20, color: '#38bdf8', damage: 0, force: 10, faction: ent.faction }); 
                break;
            }
            case 'force_avatar': {
                entitiesRef.current.forEach(t => { if (t.faction === ent.faction) t.hp = Math.min(t.maxHp, t.hp + 200); });
                commandFxRef.current.push({ type: 'nova', startX: ent.x, startY: ent.y, life: 60, color: '#0ea5e9' });
                break;
            }
            case 'mando_missile': {
                projectilesRef.current.push({ id: Math.random(), x: ent.x, y: ent.y, targetX: wx, targetY: wy, speed: 10, damage: 80, type: 'missile', color: '#f97316', faction: ent.faction, radius: 50 });
                break;
            }
            case 'mando_flame': {
                 for(let i=0; i<10; i++) {
                     const angle = Math.atan2(wy - ent.y, wx - ent.x) + (Math.random()-0.5)*0.5;
                     projectilesRef.current.push({ id: Math.random(), x: ent.x, y: ent.y, targetX: ent.x + Math.cos(angle)*150, targetY: ent.y + Math.sin(angle)*150, speed: 8+Math.random()*4, damage: 5, type: 'fire', color: '#ea580c', faction: ent.faction });
                 }
                break;
            }
            case 'mando_reinforce': {
                for(let i=0; i<3; i++) {
                    const id = Date.now() + i;
                    const offsetX = (Math.random()-0.5)*100;
                    const offsetY = (Math.random()-0.5)*100;
                    entitiesRef.current.push({
                         id: id, type: 'heavy_infantry', x: wx + offsetX, y: wy + offsetY, hp: 40, maxHp: 40,
                         faction: ent.faction, isAttacker: ent.isAttacker, angle: 0, state: 'idle', cooldown: 0, mana: 0, maxMana: 0,
                         soldiers: [] 
                    });
                    commandFxRef.current.push({ type: 'spawn', startX: wx+offsetX, startY: wy+offsetY, life: 30 });
                }
                break;
            }
            default: {
                if (magicDomains) {
                     let traitData = null;
                     for (const d of magicDomains) {
                         const found = d.talents?.find(t => t.id === targetingData.id);
                         if (found) { traitData = found; break; }
                     }

                     if (traitData) {
                         const dmg = parseFloat(traitData.stats?.damage || 0);
                         const radius = parseFloat(traitData.stats?.radius || 0);
                         const duration = parseFloat(traitData.stats?.duration || 0);
                         const speed = parseFloat(traitData.stats?.speed || 20);
                         const color = traitData.stats?.color || '#ffffff';

                         if (traitData.archetype === 'projectile') {
                              projectilesRef.current.push({ id: Math.random(), x: ent.x, y: ent.y, targetX: wx, targetY: wy, speed: speed, damage: dmg, type: 'missile', color: color, faction: ent.faction, radius: 10 });
                         } else if (traitData.archetype === 'explosion') {
                              explosionsRef.current.push({ x: wx, y: wy, radius: radius || 100, life: duration || 30, maxLife: duration || 30, color: color, damage: dmg, faction: ent.faction });
                         } else if (traitData.archetype === 'beam') {
                              projectilesRef.current.push({ id: Math.random(), x: ent.x, y: ent.y, targetX: wx, targetY: wy, speed: 20, damage: dmg, type: 'beam', color: color, faction: ent.faction });
                         } else if (traitData.archetype === 'heal') {
                             commandFxRef.current.push({ type: 'heal', startX: wx, startY: wy, life: 30 });
                             entitiesRef.current.forEach(t => {
                                if (t.faction === ent.faction && Math.hypot(t.x-wx, t.y-wy) < (radius || 150)) {
                                    t.hp = Math.min(t.maxHp, t.hp + (traitData.stats?.amount || 50));
                                } 
                             });
                         } else if (traitData.archetype === 'buff') {
                             commandFxRef.current.push({ type: 'heal', startX: wx, startY: wy, life: 30, color: '#ffff00' });
                             entitiesRef.current.forEach(t => {
                                if (t.faction === ent.faction && Math.hypot(t.x-wx, t.y-wy) < (radius || 150)) {
                                    if(!t.buffs) t.buffs = []; // Safety init
                                    t.buffs.push({
                                        stat: traitData.stats?.stat || 'damage',
                                        amount: parseFloat(traitData.stats?.amount || 0),
                                        duration: parseFloat(traitData.stats?.duration || 300), // frames
                                        label: traitData.label
                                    });
                                } 
                             });
                         } else if (traitData.archetype === 'summon') {
                              const count = parseInt(traitData.stats?.count || 1);
                              const typeToSummon = traitData.stats?.unitId || 'infantry';
                              for(let i=0; i<count; i++) {
                                   entitiesRef.current.push({
                                         id: Date.now()+i, type: typeToSummon, 
                                         x: wx + (Math.random()-0.5)*50, y: wy + (Math.random()-0.5)*50,
                                         hp: UNIT_STATS[typeToSummon]?.hp || 20, 
                                         maxHp: UNIT_STATS[typeToSummon]?.hp || 20, 
                                         faction: ent.faction, isAttacker: ent.isAttacker,
                                         angle: 0, state: 'idle', cooldown: 0, mana: 0, maxMana: 0, 
                                         buffs: [], soldiers: []
                                    });
                                    commandFxRef.current.push({ type: 'spawn', startX: wx, startY: wy, life: 30 });
                              }
                         } else if (traitData.archetype === 'dash') {
                              const dx = wx - ent.x;
                              const dy = wy - ent.y;
                              const dist = Math.sqrt(dx*dx + dy*dy);
                              const maxDist = parseFloat(traitData.stats?.range || 300);
                              let jumpX = wx; let jumpY = wy;
                              if (dist > maxDist) { jumpX = ent.x + dx * (maxDist/dist); jumpY = ent.y + dy * (maxDist/dist); }
                              commandFxRef.current.push({ type: 'move', startX: ent.x, startY: ent.y, targetX: jumpX, targetY: jumpY, life: 15 });
                              ent.x = jumpX; ent.y = jumpY;
                         }
                     }
                }
                break;
            }
        }
    };

    const executeJetpackJump = (targetingData, targetX, targetY) => {
        const ent = entitiesRef.current.find(e => e.id === targetingData.sourceId);
        if (!ent) return;
        
        const stats = UNIT_STATS[ent.type];
        if (ent.mana < stats.manaCost) return;

        ent.mana -= stats.manaCost;
        
        const dx = targetX - ent.x;
        const dy = targetY - ent.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        let jumpX = targetX;
        let jumpY = targetY;
        
        if (dist > targetingData.maxRange) {
             const ratio = targetingData.maxRange / dist;
             jumpX = ent.x + dx * ratio;
             jumpY = ent.y + dy * ratio;
        }
        
        // Add spread
        jumpX += (Math.random()-0.5)*10;
        jumpY += (Math.random()-0.5)*10;
        
        // Trail
        commandFxRef.current.push({
             type: 'move', 
             startX: ent.x, startY: ent.y,
             targetX: jumpX, targetY: jumpY,
             life: 15
        });
        
        // Start Jump Animation
        ent.jumpData = {
             startX: ent.x,
             startY: ent.y,
             targetX: jumpX,
             targetY: jumpY,
             progress: 0,
             duration: 45, // frames
             aoeRadius: targetingData.aoeRadius
        };
        ent.manualMove = null;
    };

    const toggleHoldPosition = () => {
        const entities = entitiesRef.current;
        let anyHeld = false;
        
        // First check if any are held to toggle all off or all on
        selectedEntities.forEach(id => {
            const ent = entities.find(e => e.id === id);
            if (ent && ent.holdPosition) anyHeld = true;
        });

        const newState = !anyHeld; // If some are held, release all. If none, hold all.

        selectedEntities.forEach(id => {
            const ent = entities.find(e => e.id === id);
            if (ent) {
                ent.holdPosition = newState;
                if (newState) ent.manualMove = null; // Stop current move
            }
        });
    };

    return (
        <div className="fixed inset-0 z-[200]">
            <canvas 
                ref={canvasRef}
                className="w-full h-full cursor-crosshair block"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onContextMenu={e => e.preventDefault()}
            />
            
            {/* SELECTION CARD */}
            {selectedUnitData && UNIT_STATS[selectedUnitData.type] && (
                 <div className="absolute bottom-32 left-4 w-72 bg-gray-900/70 border-2 border-[#8B5A2B] rounded-lg shadow-2xl overflow-hidden backdrop-blur-md text-white z-[210]">
                     <div className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 p-3 border-b border-gray-700 flex justify-between items-center">
                         <span className="font-bold uppercase text-[#fbbf24] tracking-wider text-sm">{UNIT_STATS[selectedUnitData.type].label}</span>
                         <span className="text-xs text-gray-500 font-mono">#{selectedUnitData.id}</span>
                     </div>
                     
                     <div className="p-4 space-y-4">
                         {/* Visual Icon/Box */}
                         <div className="flex justify-center py-2">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center border-2 border-gray-600 ${
                                selectedUnitData.faction === 'republic' ? 'bg-blue-900/40 text-blue-400' : 'bg-red-900/40 text-red-400'
                            }`}>
                                     {selectedUnitData.type === 'infantry' && (
                                    <svg viewBox="0 0 24 24" className="w-12 h-12" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                                )}
                                {selectedUnitData.type === 'heavy_infantry' && (
                                    <svg viewBox="0 0 24 24" className="w-12 h-12" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg> 
                                )}
                                {selectedUnitData.type === 'vehicle' && (
                                    <svg viewBox="0 0 24 24" className="w-12 h-12" fill="currentColor"><path d="M20 13v-2c0-1.65-1.35-3-3-3H6c-1.1 0-2 .9-2 2v3H2v2h2v4h2v-4h12v4h2v-4h2v-2h-2zM6 10h11c.55 0 1 .45 1 1v2H6v-3z"/></svg>
                                )}
                                {selectedUnitData.type === 'turret' && (
                                    <svg viewBox="0 0 24 24" className="w-12 h-12" fill="currentColor"><path d="M12 1L3 5v2h18V5l-9-4zm0 3c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm7 5v12h-2v-4h-2v4H9v-4H7v4H5V9h14z"/></svg>
                                )}
                            </div>
                         </div>

                         {/* Status Bar */}
                         <div className="space-y-1">
                             <div className="flex justify-between text-xs text-gray-400">
                                 <span>Intégrité</span>
                                 <span>{Math.ceil(selectedUnitData.hp)} / {selectedUnitData.maxHp}</span>
                             </div>
                             <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-600">
                                 <div 
                                    className="h-full transition-all duration-300 bg-gradient-to-r from-green-500 to-emerald-400"
                                    style={{ width: `${(selectedUnitData.hp / selectedUnitData.maxHp) * 100}%` }}
                                 ></div>
                             </div>
                         </div>

                         {/* Stats Grid */}
                         <div className="grid grid-cols-2 gap-2 text-sm">
                             {/* DAMAGE */}
                             <div className="bg-gray-800/50 p-1.5 rounded flex flex-col items-center hover:bg-gray-700 transition cursor-help" title="Dégâts: Points de vie retirés à la cible avant réduction par l'armure.">
                                 <div className="flex items-center gap-2">
                                     <span>⚔️</span>
                                     <span className="font-bold text-gray-200">{UNIT_STATS[selectedUnitData.type].damage}</span>
                                     {selectedUnitData.isSquad && <span className="text-[10px] text-gray-500">x{selectedUnitData.soldierCount}</span>}
                                 </div>
                                 <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Dégâts</span>
                             </div>

                             {/* ARMOR PEN */}
                             <div className="bg-gray-800/50 p-1.5 rounded flex flex-col items-center hover:bg-gray-700 transition cursor-help" title="Pénétration: Ignore ce montant d'armure chez la cible.">
                                 <div className="flex items-center gap-2">
                                     <span>⚡</span>
                                     <span className="font-bold text-gray-200">{UNIT_STATS[selectedUnitData.type].armorPen}</span>
                                 </div>
                                 <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Pénétration</span>
                             </div>

                             {/* ARMOR */}
                             <div className="bg-gray-800/50 p-1.5 rounded flex flex-col items-center hover:bg-gray-700 transition cursor-help" title="Armure: Réduit les dégâts subis de ce pourcentage.">
                                 <div className="flex items-center gap-2">
                                     <span>🛡️</span>
                                     <span className="font-bold text-gray-200">{UNIT_STATS[selectedUnitData.type].armor}%</span>
                                 </div>
                                 <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Armure</span>
                             </div>

                             {/* ACCURACY */}
                             <div className="bg-gray-800/50 p-1.5 rounded flex flex-col items-center hover:bg-gray-700 transition cursor-help" title="Précision: Probabilité de toucher la cible à chaque attaque (0-100%).">
                                 <div className="flex items-center gap-2">
                                     <span>🎯</span>
                                     <span className="font-bold text-gray-200">{Math.round(UNIT_STATS[selectedUnitData.type].accuracy * 100)}%</span>
                                 </div>
                                 <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Précision</span>
                             </div>

                             {/* RANGE */}
                             <div className="bg-gray-800/50 p-1.5 rounded flex flex-col items-center hover:bg-gray-700 transition cursor-help" title="Portée: Distance maximale pour engager le combat.">
                                 <div className="flex items-center gap-2">
                                     <span>🏹</span>
                                     <span className="font-bold text-gray-200">{UNIT_STATS[selectedUnitData.type].range}m</span>
                                 </div>
                                 <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Portée</span>
                             </div>

                             {/* SPEED */}
                             <div className="bg-gray-800/50 p-1.5 rounded flex flex-col items-center hover:bg-gray-700 transition cursor-help" title="Vitesse: Rapidité de déplacement de l'unité.">
                                 <div className="flex items-center gap-2">
                                     <span>👟</span>
                                     <span className="font-bold text-gray-200">{UNIT_STATS[selectedUnitData.type].speed}</span>
                                 </div>
                                 <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Vitesse</span>
                             </div>

                             {/* COOLDOWN */}
                             <div className="bg-gray-800/50 p-1.5 rounded flex flex-col items-center hover:bg-gray-700 transition cursor-help" title="Recharge: Temps d'attente (en frames) entre deux attaques.">
                                 <div className="flex items-center gap-2">
                                     <span>⏱️</span>
                                     <span className="font-bold text-gray-200">{UNIT_STATS[selectedUnitData.type].cooldown}</span>
                                 </div>
                                 <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Cooldown</span>
                             </div>

                             {/* MANA */}
                             {UNIT_STATS[selectedUnitData.type].maxMana > 0 && (
                                <div className="bg-gray-800/50 p-1.5 rounded flex flex-col items-center hover:bg-gray-700 transition cursor-help" title="Force: Énergie requise pour activer les capacités spéciales.">
                                    <div className="flex items-center gap-2">
                                        <span>💧</span>
                                        <span className="font-bold text-cyan-400">{Math.floor(selectedUnitData.mana)}/{selectedUnitData.maxMana}</span>
                                    </div>
                                    <span className="text-[10px] text-cyan-500 uppercase tracking-wide font-semibold">Force</span>
                                </div>
                             )}
                         </div>

                         {/* Traits & Bonuses */}
                         <div className="space-y-1">
                             {UNIT_STATS[selectedUnitData.type].traits && (
                                 <div className="flex gap-1 flex-wrap justify-center">
                                     {UNIT_STATS[selectedUnitData.type].traits.map(t => (
                                         <span key={t} className="px-2 py-0.5 bg-gray-700 rounded text-[10px] uppercase text-gray-300 border border-gray-600 font-mono tracking-tight">
                                             {t === 'mechanized' ? '⚙️ MÉCA' : (t === 'robotic' ? '🤖 ROBOT' : (t === 'biological' ? '🧬 BIO' : t))}
                                         </span>
                                     ))}
                                 </div>
                             )}
                             {UNIT_STATS[selectedUnitData.type].bonuses && (
                                 <div className="text-[10px] text-green-400 text-center">
                                     <span className="text-gray-500 mr-1">Bonus:</span>
                                     {Object.entries(UNIT_STATS[selectedUnitData.type].bonuses).map(([k,v]) => (
                                         <span key={k} className="mr-2">
                                             vs {k.toUpperCase()} +{Math.round((v-1)*100)}%
                                         </span>
                                     ))}
                                 </div>
                             )}
                         </div>

                         {/* Unit Description (Fictional) */}
                         <div className="text-xs text-gray-500 italic border-t border-gray-700 pt-3">
                             {selectedUnitData.type === 'infantry' ? "Infanterie standard de la république, équipée de fusils blasters." :
                              selectedUnitData.type === 'heavy_infantry' ? "Troupes de choc avec armure lourde et canons rotatifs." :
                              selectedUnitData.type === 'vehicle' ? "Unité mécanisée offrant un soutien lourd et une couverture mobile." :
                              "Tourelle défensive automatisée."}
                         </div>
                     </div>
                 </div>
            )}

            {/* ACTION BAR */}
            {selectedEntities.length > 0 && (
                 <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 flex gap-2 z-[200]">
                      <button 
                        onClick={toggleHoldPosition}
                        className="bg-gray-800/80 hover:bg-gray-700 border-2 border-gray-500 text-white px-4 py-2 rounded-t-lg font-bold flex items-center gap-2 transition-all"
                        title="Maintenir la Position (H) - Les unités ne poursuivront pas les ennemis"
                      >
                          <span>🛑</span>
                          <span className="text-sm uppercase tracking-wider">Ne pas bouger</span>
                      </button>

                      <button 
                        onClick={() => setIsFacingMode(!isFacingMode)}
                        className={`bg-gray-800/80 hover:bg-gray-700 border-2 ${isFacingMode ? 'border-yellow-400 text-yellow-400' : 'border-gray-500 text-white'} px-4 py-2 rounded-t-lg font-bold flex items-center gap-2 transition-all`}
                        title="Orienter - Cliquer sur la carte pour définir la direction du regard"
                      >
                          <span>👁️</span>
                          <span className="text-sm uppercase tracking-wider">Orienter</span>
                      </button>
                      
                      {selectedUnitData && UNIT_STATS[selectedUnitData.type] && UNIT_STATS[selectedUnitData.type].abilities && UNIT_STATS[selectedUnitData.type].abilities.map((ab) => (
                          <button 
                            key={ab.id}
                            onClick={() => {
                                  if (selectedUnitData.mana >= ab.cost) {
                                       setAbilityTargeting({ id: ab.id, type: ab.type, sourceId: selectedUnitData.id });
                                       isAbilityHoveredRef.current = false;
                                  }
                            }}
                            onMouseEnter={() => isAbilityHoveredRef.current = true}
                            onMouseLeave={() => isAbilityHoveredRef.current = false}
                            className={`border-2 px-4 py-2 rounded-t-lg font-bold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(168,85,247,0.5)] ${selectedUnitData.mana >= ab.cost ? 'bg-purple-900/80 hover:bg-purple-700 border-purple-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-500 cursor-not-allowed'}`}
                            title={`${ab.label} (Coût: ${ab.cost})`}
                          >
                              <span className="text-xl">⚡</span>
                              <div className="flex flex-col items-start leading-none">
                                  <span className="text-sm uppercase tracking-wider font-bold">{ab.label}</span>
                                  <span className="text-[10px] text-purple-200">Coût: {ab.cost} FP</span>
                              </div>
                          </button>
                      ))}
                 </div>
            )}
            
            {/* UNIT HUD */}
            <div className="absolute bottom-0 left-0 right-0 bg-gray-900/90 border-t-2 border-[#8B5A2B] p-2 flex gap-2 h-28 items-center overflow-x-auto custom-scrollbar backdrop-blur-md">
                 <div className="flex-shrink-0 mr-4 border-r border-gray-700 pr-4 flex flex-col justify-center items-center text-gray-500">
                     <span className="text-2xl">🛡️</span>
                     <span className="text-[10px] uppercase font-bold">Effectifs</span>
                     <span className="text-xs text-white font-mono">{hudUnits.length}</span>
                 </div>
                 {hudUnits.map(u => {
                     const isSelected = selectedEntities.includes(u.id);
                     const stats = UNIT_STATS[u.type];
                     const hpPct = (u.hp / u.maxHp) * 100;

                     return (
                         <div 
                            key={u.id}
                            onClick={(e) => { 
                                if(e.ctrlKey) {
                                    setSelectedEntities(prev => prev.includes(u.id) ? prev.filter(id=>id!==u.id) : [...prev, u.id]);
                                } else {
                                    setSelectedEntities([u.id]); 
                                }
                            }}
                            className={`relative w-20 h-24 flex-shrink-0 border-2 rounded p-1 cursor-pointer transition-all hover:bg-gray-800 group
                                ${isSelected ? 'border-green-500 bg-green-900/20 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'border-gray-700 bg-black/40 hover:border-gray-500'}
                            `}
                         >
                            <div className="h-2/3 flex items-center justify-center p-1">
                                {/* UNIT ICONS */}
                                {u.type === 'infantry' && (
                                    <svg viewBox="0 0 24 24" className="w-8 h-8 text-sky-300 drop-shadow-md" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                                )}
                                {u.type === 'heavy_infantry' && (
                                    <svg viewBox="0 0 24 24" className="w-8 h-8 text-indigo-400 drop-shadow-md" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg> 
                                )}
                                {u.type === 'vehicle' && (
                                    <svg viewBox="0 0 24 24" className="w-10 h-10 text-emerald-400 drop-shadow-md" fill="currentColor"><path d="M20 13v-2c0-1.65-1.35-3-3-3H6c-1.1 0-2 .9-2 2v3H2v2h2v4h2v-4h12v4h2v-4h2v-2h-2zM6 10h11c.55 0 1 .45 1 1v2H6v-3z"/></svg>
                                )}
                                {u.type === 'turret' && (
                                    <svg viewBox="0 0 24 24" className="w-8 h-8 text-red-500 drop-shadow-md" fill="currentColor"><path d="M12 1L3 5v2h18V5l-9-4zm0 3c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm7 5v12h-2v-4h-2v4H9v-4H7v4H5V9h14z"/></svg>
                                )}
                            </div>
                            <div className="absolute top-1 right-1 text-[8px] font-mono text-gray-400">#{u.id}</div>
                            <div className="absolute bottom-1 left-1 right-1 space-y-1">
                                <div className="text-[9px] text-center font-bold text-gray-300 truncate leading-none mb-1">{stats.label}</div>
                                <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden border border-gray-600">
                                    <div className="h-full transition-all duration-300" style={{ width: `${hpPct}%`, backgroundColor: hpPct > 50 ? '#22c55e' : (hpPct > 20 ? '#eab308' : '#ef4444') }}></div>
                                </div>
                            </div>
                         </div>
                     );
                 })}
            </div>
        </div>
    );
}
