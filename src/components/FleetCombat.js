import React, { useEffect, useRef, useState, useMemo } from 'react';

const DEFAULT_STATS = {
    fighter: { speed: 4, hp: 20, damage: 5, range: 100, cooldown: 30, size: 4, color: '#aaaaff', label: 'Chasseur TIE/X', armor: 0, armorPen: 0, accuracy: 0.85, traits: ['mechanized'], bonuses: { robotic: 1.5 } },
    corvette: { speed: 3, hp: 100, damage: 20, range: 200, cooldown: 60, size: 8, color: '#8888ff', label: 'Corvette', armor: 10, armorPen: 5, accuracy: 0.80, traits: ['mechanized'], bonuses: { mechanized: 1.2 } },
    frigate: { speed: 2, hp: 300, damage: 50, range: 300, cooldown: 90, size: 12, color: '#6666ff', label: 'Frégate', armor: 25, armorPen: 15, accuracy: 0.75, traits: ['mechanized'], bonuses: { mechanized: 1.2 } },
    cruiser: { speed: 1.5, hp: 800, damage: 150, range: 400, cooldown: 120, size: 16, color: '#4444ff', label: 'Croiseur', armor: 40, armorPen: 30, accuracy: 0.70, traits: ['mechanized'], bonuses: { mechanized: 1.1 } },
    dreadnought: { speed: 1, hp: 2500, damage: 400, range: 600, cooldown: 180, size: 24, color: '#2222ff', label: 'Dreadnought', armor: 60, armorPen: 50, accuracy: 0.60, traits: ['mechanized'], bonuses: { mechanized: 1.1 } },
    turret: { speed: 0, hp: 1000, damage: 100, range: 500, cooldown: 60, size: 15, color: '#ffaaaa', label: 'Station Défensive', armor: 30, armorPen: 20, accuracy: 0.90, traits: ['robotic'], bonuses: { mechanized: 1.1 } },
    
    // HEROES
    admiral_ship: { speed: 1.8, hp: 1500, damage: 250, range: 450, cooldown: 100, size: 20, color: '#00ccff', label: 'Vaisseau Amiral', isHero: true, ability: 'fleet_repair', maxMana: 100, manaCost: 50, armor: 50, armorPen: 40, accuracy: 0.90, traits: ['mechanized'], bonuses: { mechanized: 1.2, robotic: 1.2 } },
    grand_moff_ship: { speed: 1.8, hp: 1500, damage: 300, range: 500, cooldown: 110, size: 20, color: '#ff0000', label: 'Vaisseau de Commandement', isHero: true, ability: 'orbital_bombardment', maxMana: 100, manaCost: 60, armor: 55, armorPen: 45, accuracy: 0.90, traits: ['mechanized'], bonuses: { mechanized: 1.2, biological: 1.5 } }
};

const FACTION_COLORS = {
    republic: { ships: '#3b82f6', projectiles: '#60a5fa' },
    empire: { ships: '#ef4444', projectiles: '#f87171' },
    neutral: { ships: '#ffffff', projectiles: '#e2e8f0' }
};

export default function FleetCombat({ attackerFleet, defenderFleets, defenderPlanet, onBattleEnd, customUnits = [] }) {
    const SHIP_STATS = useMemo(() => {
        const stats = { ...DEFAULT_STATS };
        customUnits.forEach(u => {
            stats[u.id] = {
                speed: Number(u.speed || 1),
                hp: Number(u.hp || 100),
                damage: Number(u.damage || 10),
                range: Number(u.range || 200),
                cooldown: 50,
                size: 10,
                color: u.color || '#d946ef',
                label: u.name,
                armor: Number(u.armor || 0),
                armorPen: 10,
                accuracy: 0.85,
                traits: u.traits || [],
                bonuses: u.bonuses || {}
            };
        });
        return stats;
    }, [customUnits]);

    const canvasRef = useRef(null);
    const [gameState, setGameState] = useState('fighting'); 
    
    // Player controls
    const [selectedEntities, setSelectedEntities] = useState([]);
    const [selectionStart, setSelectionStart] = useState(null);
    const [isFacingMode, setIsFacingMode] = useState(false); // FACING MODE
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [hudUnits, setHudUnits] = useState([]); // FOR UI
    const [selectedUnitData, setSelectedUnitData] = useState(null); // FOR DETAIL CARD

    // Refs for Loop Access to state (fixes state closure issues)
    const selectionRef = useRef(null);
    const orderDragStartRef = useRef(null); // DRAG REF
    const mouseRef = useRef({ x: 0, y: 0 });
    const selectedIdsRef = useRef([]);
    const isAbilityHoveredRef = useRef(false); // HOVER REF

    const entitiesRef = useRef([]);
    const projectilesRef = useRef([]);
    const explosionsRef = useRef([]);
    const commandFxRef = useRef([]);
    const requestRef = useRef();
    
    // Sync state to refs
    useEffect(() => { selectionRef.current = selectionStart; }, [selectionStart]);
    useEffect(() => { mouseRef.current = mousePos; }, [mousePos]);
    useEffect(() => { selectedIdsRef.current = selectedEntities; }, [selectedEntities]);

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
                            shipCount: primary.ships ? primary.ships.length : 1,
                            cooldown: primary.cooldown
                        });
                    } else {
                        setSelectedUnitData(null);
                    }
                } else {
                    setSelectedUnitData(null);
                }
            }
        }, 100); 
        return () => clearInterval(interval);
    }, []);

    // Initialize battle
    useEffect(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        const entities = [];
        let idCounter = 0;

        // Helper to spawn ships
        const spawnFleet = (composition, faction, isAttacker) => {
            const centerX = isAttacker ? width * 0.2 : width * 0.8;
            const centerY = height / 2;
            const spread = 400;

            Object.entries(composition).forEach(([type, count]) => {
                if (!SHIP_STATS[type]) return;
                
                if (type === 'fighter') {
                    // SQUAD LOGIC (Squadrons)
                    const squadCount = Math.ceil(count / 5); 
                    for (let i = 0; i < squadCount; i++) {
                        const ships = [];
                        // V-Formation offsets
                        const offsets = [
                           {x:0, y:0}, {x:-10, y:-10}, {x:-10, y:10}, {x:-20, y:-20}, {x:-20, y:20}
                        ];
                        
                        for(let j=0; j<5; j++) {
                            ships.push({
                                id: j,
                                xOff: offsets[j].x + (Math.random()-0.5)*5,
                                yOff: offsets[j].y + (Math.random()-0.5)*5,
                                hp: SHIP_STATS[type].hp,
                                maxHp: SHIP_STATS[type].hp,
                                cooldown: Math.random() * SHIP_STATS[type].cooldown
                            });
                        }

                        entities.push({
                            id: idCounter++,
                            type,
                            faction,
                            isAttacker,
                            x: centerX + (Math.random() - 0.5) * spread,
                            y: centerY + (Math.random() - 0.5) * spread,
                            angle: isAttacker ? 0 : Math.PI,
                            
                            isSquad: true,
                            ships: ships,
                            maxHp: SHIP_STATS[type].hp * 5,

                            target: null,
                            manualMove: null,
                            state: 'idle'
                        });
                    }
                } else {
                    for (let i = 0; i < count; i++) {
                        entities.push({
                            id: idCounter++,
                            type,
                            faction,
                            isAttacker,
                            x: centerX + (Math.random() - 0.5) * spread,
                            y: centerY + (Math.random() - 0.5) * spread,
                            angle: isAttacker ? 0 : Math.PI,
                            hp: SHIP_STATS[type].hp,
                            maxHp: SHIP_STATS[type].hp,
                            mana: SHIP_STATS[type].maxMana || 0,
                            maxMana: SHIP_STATS[type].maxMana || 0,
                            cooldown: Math.random() * SHIP_STATS[type].cooldown,
                            target: null, 
                            manualMove: null, 
                            state: 'idle'
                        });
                    }
                }
            });
        };

        // Spawn Attacker
        if (attackerFleet && attackerFleet.composition) {
            spawnFleet(attackerFleet.composition, attackerFleet.owner || 'republic', true);
            if (attackerFleet.owner !== 'empire') spawnFleet({ 'admiral_ship': 1 }, 'republic', true); // FORCE HERO
        }

        // Spawn Defender Fleets
        if (defenderFleets) {
            defenderFleets.forEach(fleet => {
                spawnFleet(fleet.composition, fleet.owner || 'empire', false);
            });
            spawnFleet({ 'grand_moff_ship': 1 }, 'empire', false); // FORCE HERO
        }

        // Spawn Planetary Defenses
        if (defenderPlanet && defenderPlanet.garrison) {
           const garrisonComp = defenderPlanet.garrison;
           if (garrisonComp.turret) {
               for(let i=0; i<garrisonComp.turret; i++) {
                   entities.push({
                       id: idCounter++,
                       type: 'turret',
                       faction: defenderPlanet.owner || 'empire',
                       isAttacker: false,
                       x: width * 0.9 + (Math.random() -0.5) * 100, 
                       y: (height / (garrisonComp.turret + 1)) * (i+1),
                       angle: Math.PI,
                       hp: SHIP_STATS.turret.hp,
                       maxHp: SHIP_STATS.turret.hp,
                       cooldown: Math.random() * SHIP_STATS.turret.cooldown,
                       target: null,
                       state: 'idle'
                   });
               }
           }
        }

        entitiesRef.current = entities;
        
    }, [attackerFleet, defenderFleets, defenderPlanet, SHIP_STATS]);

    // Game Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const update = () => {
            if (gameState !== 'fighting') return;

            const entities = entitiesRef.current;
            const projectiles = projectilesRef.current;
            const explosions = explosionsRef.current;

            // Check win condition
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
                const stats = SHIP_STATS[entity.type];

                // 1. Target Selection Logic
                // If we have a manual target, keep it unless dead
                if (entity.target && !entities.find(e => e.id === entity.target.id)) {
                    entity.target = null;
                }

                // If no manual move and no target, find closest enemy automatically (auto-attack)
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
                     // Only auto-target if within 2x range to avoid map-wide aggro immediately?
                     // For now, infinite aggro range like before
                    entity.target = closest;
                }

                // 2. Movement Logic
                let moveTarget = null;
                let isMovingToAttack = false;

                if (entity.manualMove) {
                    moveTarget = entity.manualMove;
                    // Check if reached destination
                    const dx = moveTarget.x - entity.x;
                    const dy = moveTarget.y - entity.y;
                    if (Math.sqrt(dx*dx + dy*dy) < 10) {
                        entity.manualMove = null; 
                        if (entity.fixedOrientation !== undefined) entity.angle = entity.fixedOrientation;
                    }
                } else if (entity.target) {
                    if (entity.fixedOrientation === undefined) {
                        moveTarget = entity.target;
                        isMovingToAttack = true;
                    }
                }

                if (moveTarget && stats.speed > 0) {
                    const dx = moveTarget.x - entity.x;
                    const dy = moveTarget.y - entity.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    const angleToTarget = Math.atan2(dy, dx);
                    
                    // Rotate towards target
                    // Smooth rotation could be added here
                    entity.angle = angleToTarget;

                    // Move
                    if (!isMovingToAttack || dist > stats.range * 0.95) {
                         // Stop at 95% range to fire (stay at max range)
                         // If manual move, go all the way
                         entity.x += Math.cos(angleToTarget) * stats.speed;
                         entity.y += Math.sin(angleToTarget) * stats.speed;
                    }
                }

                // 3. Firing Logic
                // Only fire if we have a target and are in range/cooldown
                if (entity.target) {
                    const dx = entity.target.x - entity.x;
                    const dy = entity.target.y - entity.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    
                    // Auto-rotate to face target if not moving manually
                    if (!entity.manualMove && entity.fixedOrientation === undefined) {
                         entity.angle = Math.atan2(dy, dx);
                    }

                    if (dist <= stats.range) {
                        if (entity.isSquad && entity.ships) {
                             // SQUAD FIRING
                             entity.ships.forEach(ship => {
                                 if (ship.cooldown > 0) return;
                                 
                                 const rot = entity.angle;
                                 const sx = entity.x + ship.xOff * Math.cos(rot) - ship.yOff * Math.sin(rot);
                                 const sy = entity.y + ship.xOff * Math.sin(rot) + ship.yOff * Math.cos(rot);
                                 
                                 const spreadAngle = (Math.random() - 0.5) * 0.1;

                                 projectiles.push({
                                    x: sx,
                                    y: sy,
                                    vx: Math.cos(entity.angle+spreadAngle) * 10,
                                    vy: Math.sin(entity.angle+spreadAngle) * 10,
                                    damage: stats.damage,
                                    armorPen: stats.armorPen || 0,
                                    accuracy: stats.accuracy || 0.85,
                                    bonuses: stats.bonuses || {},
                                    faction: entity.faction,
                                    color: FACTION_COLORS[entity.faction]?.projectiles || '#fff',
                                    life: 60
                                });
                                ship.cooldown = stats.cooldown * (0.8 + Math.random()*0.4);
                             });
                        } else if (entity.cooldown <= 0) {
                            // STANDARD FIRING
                            projectiles.push({
                                x: entity.x,
                                y: entity.y,
                                vx: Math.cos(entity.angle) * 10,
                                vy: Math.sin(entity.angle) * 10,
                                damage: stats.damage,
                                armorPen: stats.armorPen || 0,
                                accuracy: stats.accuracy || 0.85,
                                bonuses: stats.bonuses || {},
                                faction: entity.faction,
                                color: FACTION_COLORS[entity.faction]?.projectiles || '#fff',
                                life: 100
                            });
                            entity.cooldown = stats.cooldown;
                        }

                        // Mana Regen for Heroes
                        if (stats.isHero) {
                            if (entity.mana < entity.maxMana) {
                                entity.mana += 0.05; 
                            }
                        }
                    }
                }

                // Cooldown Management
                 if (entity.isSquad && entity.ships) {
                     entity.ships.forEach(s => { if(s.cooldown > 0) s.cooldown--; });
                } else {
                     if (entity.cooldown > 0) entity.cooldown--;
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

                // Hit detection
                let hit = false;
                for (const entity of entities) {
                    if (FACTION_COLORS[entity.faction] === FACTION_COLORS[p.faction]) continue; 
                    if (entity.faction === p.faction) continue;

                    let entityHit = false;
                    const targetStats = SHIP_STATS[entity.type];

                     // Accuracy Check
                     if (Math.random() > (p.accuracy || 0.85)) {
                         // Missed
                         continue;
                     }
                     
                     // Damage Calc
                     const armor = targetStats.armor || 0;
                     const pen = p.armorPen || 0;
                     const effectiveArmor = Math.max(0, armor - pen);
                     const dmgReduction = Math.min(0.9, effectiveArmor / 100); // Caps at 90% reduction
                     
                     // Trait Modifiers
                     let traitMult = 1;
                     if (p.bonuses && targetStats.traits) {
                         targetStats.traits.forEach(t => {
                             if (p.bonuses[t]) traitMult *= p.bonuses[t];
                         });
                     }

                     const actualDamage = p.damage * traitMult * (1 - dmgReduction);

                    if (entity.isSquad && entity.ships) {
                         const rot = entity.angle;
                         const c = Math.cos(rot);
                         const s = Math.sin(rot);

                         for (const ship of entity.ships) {
                             const sx = entity.x + ship.xOff * c - ship.yOff * s;
                             const sy = entity.y + ship.xOff * s + ship.yOff * c;
                             
                             const sdx = sx - p.x;
                             const sdy = sy - p.y;

                             if (Math.sqrt(sdx*sdx + sdy*sdy) < targetStats.size + 4) {
                                 ship.hp -= actualDamage;
                                 explosions.push({ x: sx, y: sy, life: 10, size: 5 });
                                 entityHit = true;
                                 
                                 // Floating Text for Damage
                                 // (Simplified: just particles for now)
                                 break;
                             }
                         }

                         if (entityHit) {
                             entity.ships = entity.ships.filter(s => s.hp > 0);
                             entity.hp = entity.ships.reduce((sum, s) => sum + s.hp, 0);
                             if (entity.ships.length === 0) {
                                  // Squad destroyed
                             }
                         }

                    } else {
                        const dx = entity.x - p.x;
                        const dy = entity.y - p.y;
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        
                        if (dist < targetStats.size + 5) {
                            entity.hp -= actualDamage;
                            explosions.push({ x: p.x, y: p.y, life: 10, size: 5 });
                            entityHit = true;
                        }
                    }

                    if (entityHit) {
                        hit = true;
                        
                        // Check death
                        if (entity.hp <= 0) {
                            explosions.push({ x: entity.x, y: entity.y, life: 30, size: 20 });
                            const idx = entities.indexOf(entity);
                            if (idx > -1) {
                                // If this was selected, unselect
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

            // Redraw
            draw(ctx, entities, projectiles, explosions, commandFx);

            requestRef.current = requestAnimationFrame(update);
        };

        const draw = (ctx, entities, projectiles, explosions, commandFx = []) => {
            // Background
            ctx.fillStyle = '#050510';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

             // Command FX
            commandFx.forEach(fx => {
                ctx.save();
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

                // Marker Ripple
                ctx.rotate(-angle); 
                ctx.beginPath();
                ctx.arc(0, 0, 5 + (40-fx.life)/2, 0, Math.PI*2);
                ctx.stroke();

                ctx.restore();
            });

            // Selection Box
            const selStart = selectionRef.current;
            const mPos = mouseRef.current;

            if (selStart && mPos) {
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 1;
                ctx.strokeRect(
                    selStart.x, 
                    selStart.y, 
                    mPos.x - selStart.x, 
                    mPos.y - selStart.y
                );
                ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
                 ctx.fillRect(
                    selStart.x, 
                    selStart.y, 
                    mPos.x - selStart.x, 
                    mPos.y - selStart.y
                );
            }

            // Draw Entities
            const selectedIds = selectedIdsRef.current;
            entities.forEach(e => {
                const stats = SHIP_STATS[e.type];
                const isSelected = selectedIds.includes(e.id);
                
                ctx.save();
                ctx.translate(e.x, e.y);
                
                // Selection Circle & Range
                if (isSelected) {
                    ctx.beginPath();
                    ctx.arc(0, 0, stats.size + 10, 0, Math.PI*2);
                    ctx.strokeStyle = '#00ff00';
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    // Range Cone Visualization
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.arc(0, 0, stats.range, e.angle - Math.PI / 6, e.angle + Math.PI / 6); // 60 degree cone
                    ctx.lineTo(0, 0);
                    ctx.fillStyle = 'rgba(0, 255, 0, 0.05)';
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
                    ctx.stroke();
                    
                    // Full Range Line
                    ctx.beginPath();
                    ctx.arc(0, 0, stats.range, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                    ctx.setLineDash([2, 4]);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }

                ctx.rotate(e.angle);
                
                // Draw Ship
                ctx.fillStyle = FACTION_COLORS[e.faction]?.ships || '#fff';
                
                if (e.isSquad && e.ships) {
                    // Draw individual fighters
                    e.ships.forEach(ship => {
                         ctx.beginPath();
                         if (e.type === 'fighter') {
                             // Small Triangle
                             ctx.moveTo(ship.xOff + stats.size, ship.yOff);
                             ctx.lineTo(ship.xOff - stats.size, ship.yOff - stats.size/2);
                             ctx.lineTo(ship.xOff - stats.size, ship.yOff + stats.size/2);
                         } else {
                             ctx.arc(ship.xOff, ship.yOff, stats.size, 0, Math.PI*2);
                         }
                         ctx.fill();
                    });
                } else {
                    ctx.beginPath();
                    if (e.type === 'turret') {
                        ctx.rect(-stats.size, -stats.size, stats.size*2, stats.size*2);
                    } else {
                        ctx.moveTo(stats.size, 0);
                        ctx.lineTo(-stats.size, -stats.size/2);
                        ctx.lineTo(-stats.size, stats.size/2);
                    }
                    ctx.fill();
                }

                // HP Bar
                if (!e.isSquad) {
                    ctx.fillStyle = 'red';
                    ctx.fillRect(-10, -stats.size - 8, 20, 3);
                    ctx.fillStyle = 'green';
                    ctx.fillRect(-10, -stats.size - 8, 20 * (e.hp / e.maxHp), 3);
                } else {
                    // Squad HP bar centered content
                     ctx.fillStyle = 'red';
                    ctx.fillRect(-15, -20, 30, 3);
                    ctx.fillStyle = 'green';
                    ctx.fillRect(-15, -20, 30 * (e.hp / e.maxHp), 3);
                }

                ctx.restore();
            });

            // Draw Projectiles
            projectiles.forEach(p => {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                ctx.fill();
            });

            // Draw Explosions
            explosions.forEach(e => {
                ctx.fillStyle = `rgba(255, 100, 50, ${e.life / 30})`;
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.size * (1 - (e.life/30)) + e.size, 0, Math.PI * 2);
                ctx.fill();
            });
        };

        requestRef.current = requestAnimationFrame(update);
        return () => cancelAnimationFrame(requestRef.current);
    }, [gameState, selectedEntities, selectionStart, mousePos]); // Re-bind loop when interaction state changes

    // --- CONTROLS HANDLERS ---
    const handleMouseDown = (e) => {
        if (e.button === 0) { // Left Click - Select
             const rect = canvasRef.current.getBoundingClientRect();
             setSelectionStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        } else if (e.button === 2) { // Right Click - Order
             e.preventDefault();
             if (isFacingMode) {
                 const rect = canvasRef.current.getBoundingClientRect();
                 orderDragStartRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
             } else {
                 handleRightClick(e);
             }
        }
    };

    const handleMouseMove = (e) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleMouseUp = (e) => {
        if (e.button === 2 && orderDragStartRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const endX = e.clientX - rect.left;
            const endY = e.clientY - rect.top;
            
            const dx = endX - orderDragStartRef.current.x;
            const dy = endY - orderDragStartRef.current.y;
            const angle = Math.atan2(dy, dx);
            
             entitiesRef.current.forEach(ent => {
                 if (selectedIdsRef.current.includes(ent.id)) {
                     ent.manualMove = { x: orderDragStartRef.current.x, y: orderDragStartRef.current.y };
                     ent.fixedOrientation = angle; // Store intended orientation
                     ent.target = null;
                 }
             });
             
             commandFxRef.current.push({
                 type: 'orientation',
                 startX: orderDragStartRef.current.x, startY: orderDragStartRef.current.y,
                 endX: endX, endY: endY,
                 life: 40
             });

             orderDragStartRef.current = null;
             setIsFacingMode(false);
        } else if (e.button === 0 && selectionStart) {
             const rect = canvasRef.current.getBoundingClientRect();
             const endX = e.clientX - rect.left;
             const endY = e.clientY - rect.top;
             
             // Box logic
             const x1 = Math.min(selectionStart.x, endX);
             const y1 = Math.min(selectionStart.y, endY);
             const x2 = Math.max(selectionStart.x, endX);
             const y2 = Math.max(selectionStart.y, endY);

             const selection = [];
             entitiesRef.current.forEach(ent => {
                 if (!ent.isAttacker) return; // Can only control attacker for now (player side)
                 // Or better: ensure we only select OUR ships. 
                 // Assuming Player is ALWAYS Attacker for this demo.
                 // TODO: Pass 'playerSide' prop to know which side is player.
                 // For now, assume player controls ATTAQUANTS (left side).
                 
                 if (ent.isAttacker && ent.x >= x1 && ent.x <= x2 && ent.y >= y1 && ent.y <= y2) {
                     selection.push(ent.id);
                 }
                 // Point click tolerance
                 else if (ent.isAttacker && Math.abs(x1 - x2) < 5 && Math.abs(y1 - y2) < 5) {
                      const dist = Math.sqrt(Math.pow(ent.x - x1, 2) + Math.pow(ent.y - y1, 2));
                      if (dist < 20) selection.push(ent.id);
                 }
             });
             
             setSelectedEntities(selection);
             setSelectionStart(null);
        }
    };

    const handleRightClick = (e) => {
         // Issue order to selected entities
         if (selectedEntities.length === 0) return;

         const rect = canvasRef.current.getBoundingClientRect();
         const clickX = e.clientX - rect.left;
         const clickY = e.clientY - rect.top;

         // Check if clicked on enemy
         let targetEnemy = null;
         entitiesRef.current.forEach(ent => {
             if (ent.isAttacker) return; // Cannot target friends
             const dist = Math.sqrt(Math.pow(ent.x - clickX, 2) + Math.pow(ent.y - clickY, 2));
             if (dist < 20) targetEnemy = ent;
         });
         
         // Calculate center of selected units for FX origin
         const selectedUnits = entitiesRef.current.filter(ent => selectedEntities.includes(ent.id));
         let startX = 0, startY = 0;
         if (selectedUnits.length > 0) {
             startX = selectedUnits.reduce((sum, u) => sum + u.x, 0) / selectedUnits.length;
             startY = selectedUnits.reduce((sum, u) => sum + u.y, 0) / selectedUnits.length;
         }

         let orderType = 'move';

         entitiesRef.current.forEach(ent => {
             if (selectedEntities.includes(ent.id)) {
                 if (targetEnemy) {
                     ent.target = targetEnemy;
                     ent.manualMove = null;
                     orderType = 'attack';
                 } else {
                     ent.manualMove = { x: clickX, y: clickY };
                     ent.target = null; // Clear target when moving manually
                 }
             }
         });

         // Add Command FX
         if (selectedUnits.length > 0) {
            if (orderType === 'attack' && targetEnemy) {
                 commandFxRef.current.push({
                    type: 'attack',
                    startX, startY,
                    targetX: targetEnemy.x, targetY: targetEnemy.y,
                    targetId: targetEnemy.id,
                    life: 40
                 });
            } else {
                 commandFxRef.current.push({
                    type: 'move',
                    startX, startY,
                    targetX: clickX, targetY: clickY,
                    life: 40
                 });
            }
        }
    };

    const castAbility = (entityId, abilityName) => {
         const entity = entitiesRef.current.find(e => e.id === entityId);
         if (!entity || !SHIP_STATS[entity.type].isHero) return;

         const stats = SHIP_STATS[entity.type];
         if (entity.mana < (stats.manaCost || 0)) return;

         entity.mana -= stats.manaCost;

         if (abilityName === 'fleet_repair') {
             // HEAL NOVA
             entitiesRef.current.forEach(other => {
                 if (other.faction === entity.faction) {
                     const dist = Math.sqrt(Math.pow(other.x - entity.x, 2) + Math.pow(other.y - entity.y, 2));
                     if (dist < 500) {
                         const healAmount = 500;
                         if (other.isSquad && other.ships) {
                             other.ships.forEach(s => s.hp = Math.min(SHIP_STATS[other.type].hp, s.hp + healAmount));
                             other.hp = other.ships.reduce((sum, s) => sum + s.hp, 0);
                         } else {
                            other.hp = Math.min(other.maxHp, other.hp + healAmount);
                         }
                         explosionsRef.current.push({ x: other.x, y: other.y, life: 30, size: 20, color: '#4ade80' });
                     }
                 }
             });
             // Visual Nova
             explosionsRef.current.push({ x: entity.x, y: entity.y, life: 40, size: 500, color: 'rgba(74, 222, 128, 0.2)' });

         } else if (abilityName === 'orbital_bombardment') {
             // AOE NUKE
            const targetX = entity.target ? entity.target.x : (entity.x + Math.cos(entity.angle)*400);
            const targetY = entity.target ? entity.target.y : (entity.y + Math.sin(entity.angle)*400);

            entitiesRef.current.forEach(other => {
                const dist = Math.sqrt(Math.pow(other.x - targetX, 2) + Math.pow(other.y - targetY, 2));
                if (dist < 200 && other.faction !== entity.faction) {
                     const dmg = 800;
                     if (other.isSquad && other.ships) {
                         other.ships.forEach(s => s.hp -= dmg);
                         other.hp = other.ships.reduce((sum, s) => sum + s.hp, 0);
                     } else {
                         other.hp -= dmg;
                     }
                }
            });
            explosionsRef.current.push({ x: targetX, y: targetY, life: 50, size: 200, color: '#ef4444' });
         } else if (abilityName === 'emergency_shields') {
             entitiesRef.current.forEach(other => {
                 if (other.faction === entity.faction) {
                      const dist = Math.sqrt(Math.pow(other.x - entity.x, 2) + Math.pow(other.y - entity.y, 2));
                      if (dist < 400) {
                           const heal = 1000;
                           if (other.isSquad && other.ships) {
                               other.ships.forEach(s => s.hp = Math.min(SHIP_STATS[other.type].hp, s.hp + heal));
                               other.hp = other.ships.reduce((sum, s) => sum + s.hp, 0);
                           } else {
                               other.hp = Math.min(other.maxHp, other.hp + heal);
                           }
                      }
                 }
             });
             explosionsRef.current.push({ x: entity.x, y: entity.y, life: 50, size: 400, color: 'rgba(0, 200, 255, 0.3)' });

         } else if (abilityName === 'concentrated_fire') {
             const target = entity.target;
             if (target) {
                 const dmg = 2500;
                 if (target.isSquad && target.ships) {
                     target.ships.forEach(s => s.hp -= (dmg / target.ships.length));
                     target.hp = target.ships.reduce((sum, s) => sum + s.hp, 0);
                 } else {
                     target.hp -= dmg;
                 }
                 explosionsRef.current.push({ x: target.x, y: target.y, life: 40, size: 80, color: '#ff5500' });
                 
                 const dx = target.x - entity.x;
                 const dy = target.y - entity.y;
                 const steps = 15;
                 for(let i=0; i<steps; i++) {
                     explosionsRef.current.push({
                         x: entity.x + (dx * (i/steps)),
                         y: entity.y + (dy * (i/steps)),
                         life: 15,
                         size: 10,
                         color: '#ff0000'
                     });
                 }
             }
         }
    };

    const finalizeBattle = (result) => {
        const survivingAttackers = entitiesRef.current.filter(e => e.isAttacker);
        const survivingDefenders = entitiesRef.current.filter(e => !e.isAttacker);
        
        onBattleEnd({
            winner: result === 'victory' ? 'attacker' : 'defender', 
            survivingAttackers,
            survivingDefenders
        });
    };

    return (
        <div className="fixed inset-0 z-[200]">
            <canvas 
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onContextMenu={(e)=>e.preventDefault()}
                className="w-full h-full cursor-crosshair"
            />
            
            {/* UI Overlay */}
            <div className="absolute top-4 left-4 text-white text-xl font-bold bg-black/50 px-4 py-2 rounded pointer-events-none">
                 Combat Spatial - {defenderPlanet?.name || 'Secteur Inconnu'}
            </div>

            {/* ORIENTATION CONTROL */}
            <div className="absolute top-4 right-4 flex gap-2">
                <button
                    onClick={() => setIsFacingMode(!isFacingMode)}
                    className={`px-4 py-2 font-bold rounded border-2 shadow-lg transition-all ${
                        isFacingMode 
                        ? 'bg-yellow-600 border-yellow-400 text-white shadow-[0_0_15px_rgba(234,179,8,0.5)]' 
                        : 'bg-gray-900/80 border-gray-600 text-gray-400 hover:bg-gray-800'
                    }`}
                >
                    ↪ ORIENTATION
                </button>
            </div>

            {gameState !== 'fighting' && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'auto' }}>
                    <h2 style={{ fontSize: '4rem', color: gameState === 'victory' ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
                        {gameState === 'victory' ? 'VICTOIRE' : (gameState === 'draw' ? 'EGALITÉ' : 'DÉFAITE')}
                    </h2>
                    <button 
                        onClick={() => finalizeBattle(gameState)}
                        className="mt-4 px-6 py-3 bg-white text-black font-bold rounded hover:bg-gray-200"
                    >
                        Terminer la bataille
                    </button>
                </div>
            )}

             {/* SELECTION CARD */}
            {selectedUnitData && SHIP_STATS[selectedUnitData.type] && (
                 <div className="absolute bottom-32 right-4 w-80 bg-gray-900/95 border-2 border-[#8B5A2B] rounded-lg shadow-2xl overflow-hidden backdrop-blur-md text-white z-[210]">
                     <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-3 border-b border-gray-700 flex justify-between items-center">
                         <span className="font-bold uppercase text-[#fbbf24] tracking-wider text-sm">{SHIP_STATS[selectedUnitData.type].label}</span>
                         <span className="text-xs text-gray-500 font-mono">#{selectedUnitData.id}</span>
                     </div>
                     
                     <div className="p-4 space-y-4">
                         <div className="flex justify-center py-2 relative">
                            <div className={`w-24 h-24 rounded-full flex items-center justify-center border-2 border-gray-600 ${
                                selectedUnitData.faction === 'republic' ? 'bg-blue-900/40 text-blue-400' : 'bg-red-900/40 text-red-400'
                            }`}>
                                <svg viewBox="0 0 24 24" className="w-14 h-14" fill="currentColor">
                                    <path d="M12 2L4 22h16L12 2zm0 4l4 13H8l4-13z"/>
                                </svg>
                            </div>
                            {/* Hero Badge */}
                            {SHIP_STATS[selectedUnitData.type].isHero && (
                                <div className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full border border-yellow-300 shadow-glow">HERO</div>
                            )}
                         </div>

                         {/* Status Bars */}
                         <div className="space-y-2">
                             {/* HP */}
                             <div className="space-y-1">
                                 <div className="flex justify-between text-xs text-gray-400">
                                     <span>Boucliers</span>
                                     <span>{Math.ceil(selectedUnitData.hp)} / {selectedUnitData.maxHp}</span>
                                 </div>
                                 <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                                     <div className="h-full bg-green-500" style={{ width: `${(selectedUnitData.hp / selectedUnitData.maxHp) * 100}%` }}></div>
                                 </div>
                             </div>
                             
                             {/* Mana */}
                             {SHIP_STATS[selectedUnitData.type].isHero && (
                                 <div className="space-y-1">
                                     <div className="flex justify-between text-xs text-gray-400">
                                         <span>Énergie</span>
                                         <span>{Math.floor(selectedUnitData.mana)} / {selectedUnitData.maxMana}</span>
                                     </div>
                                     <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                                         <div className="h-full bg-blue-500" style={{ width: `${(selectedUnitData.mana / selectedUnitData.maxMana) * 100}%` }}></div>
                                     </div>
                                 </div>
                             )}
                         </div>

                         {/* Stats Grid */}
                         <div className="grid grid-cols-2 gap-2 text-xs">
                             <div className="bg-gray-800/50 p-2 rounded flex justify-between">
                                 <span className="text-gray-400">Dégâts</span>
                                 <span className="font-bold">{SHIP_STATS[selectedUnitData.type].damage}</span>
                             </div>
                             <div className="bg-gray-800/50 p-2 rounded flex justify-between">
                                 <span className="text-gray-400">Pénétration</span>
                                 <span className="font-bold text-red-300">{SHIP_STATS[selectedUnitData.type].armorPen || 0}</span>
                             </div>
                             <div className="bg-gray-800/50 p-2 rounded flex justify-between">
                                 <span className="text-gray-400">Armure</span>
                                 <span className="font-bold text-yellow-300">{SHIP_STATS[selectedUnitData.type].armor || 0}</span>
                             </div>
                             <div className="bg-gray-800/50 p-2 rounded flex justify-between">
                                 <span className="text-gray-400">Précision</span>
                                 <span className="font-bold text-blue-300">{Math.round((SHIP_STATS[selectedUnitData.type].accuracy || 0.85)*100)}%</span>
                             </div>
                          </div>

                         {/* Traits & Bonuses */}
                         <div className="space-y-1">
                             {SHIP_STATS[selectedUnitData.type].traits && (
                                 <div className="flex gap-1 flex-wrap">
                                     {SHIP_STATS[selectedUnitData.type].traits.map(t => (
                                         <span key={t} className="px-2 py-0.5 bg-gray-700 rounded text-[10px] uppercase text-gray-300 border border-gray-600 font-mono tracking-tight">
                                             {t === 'mechanized' ? '⚙️ MÉCA' : (t === 'robotic' ? '🤖 ROBOT' : (t === 'biological' ? '🧬 BIO' : t))}
                                         </span>
                                     ))}
                                 </div>
                             )}
                             {SHIP_STATS[selectedUnitData.type].bonuses && (
                                 <div className="text-[10px] text-green-400">
                                     <span className="text-gray-500 mr-1">Bonus:</span>
                                     {Object.entries(SHIP_STATS[selectedUnitData.type].bonuses).map(([k,v]) => (
                                         <span key={k} className="mr-2">
                                             vs {k.toUpperCase()} +{Math.round((v-1)*100)}%
                                         </span>
                                     ))}
                                 </div>
                             )}
                         </div>
                          
                         {/* Ability Button */}
                         {SHIP_STATS[selectedUnitData.type].isHero && (
                            <button
                                onMouseEnter={() => isAbilityHoveredRef.current = true}
                                onMouseLeave={() => isAbilityHoveredRef.current = false}
                                onClick={() => castAbility(selectedUnitData.id, SHIP_STATS[selectedUnitData.type].ability)}
                                disabled={selectedUnitData.mana < SHIP_STATS[selectedUnitData.type].manaCost}
                                className={`w-full py-2 rounded font-bold border flex items-center justify-center gap-2 transition-all ${
                                    selectedUnitData.mana >= SHIP_STATS[selectedUnitData.type].manaCost
                                    ? 'bg-blue-900/50 border-blue-500 hover:bg-blue-800 text-blue-100 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                                    : 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
                                }`}
                            >
                                <span>⚡</span>
                                {SHIP_STATS[selectedUnitData.type].ability === 'fleet_repair' ? 'Réparation Flotte' : 'Bombardement Ionique'}
                                <span className="text-xs ml-1 opacity-70">({SHIP_STATS[selectedUnitData.type].manaCost})</span>
                            </button>
                         )}
                     </div>
                 </div>
            )}

            {/* UNIT HUD */}
            <div className="absolute bottom-0 left-0 right-0 bg-gray-900/90 border-t-2 border-[#8B5A2B] p-2 flex gap-2 h-28 items-center overflow-x-auto custom-scrollbar backdrop-blur-md">
                 <div className="flex-shrink-0 mr-4 border-r border-gray-700 pr-4 flex flex-col justify-center items-center text-gray-500">
                     <span className="text-2xl">⚓</span>
                     <span className="text-[10px] uppercase font-bold">Flotte</span>
                     <span className="text-xs text-white font-mono">{hudUnits.length}</span>
                 </div>
                 {hudUnits.map(u => {
                     const isSelected = selectedEntities.includes(u.id);
                     const stats = SHIP_STATS[u.type];
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
                                ${isSelected ? 'border-blue-500 bg-blue-900/20 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'border-gray-700 bg-black/40 hover:border-gray-500'}
                            `}
                         >
                            <div className="h-2/3 flex items-center justify-center p-1">
                                {/* Ship Icon */}
                                <svg viewBox="0 0 24 24" className={`w-8 h-8 drop-shadow-md ${u.type==='fighter'?'text-gray-300': 'text-blue-300'}`} fill="currentColor">
                                    <path d={u.type === 'fighter' ? "M12 2L4 22h16L12 2zm0 4l4 13H8l4-13z" : "M2 6h20v12H2z"}/>
                                </svg>
                            </div>
                            <div className="absolute top-1 right-1 text-[8px] font-mono text-gray-400">#{u.id}</div>
                            <div className="absolute bottom-1 left-1 right-1 space-y-1">
                                <div className="text-[9px] text-center font-bold text-gray-300 truncate leading-none mb-1">{stats.label}</div>
                                <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden border border-gray-600">
                                    <div className="h-full transition-all duration-300" style={{ width: `${hpPct}%`, backgroundColor: hpPct > 50 ? '#3b82f6' : (hpPct > 20 ? '#eab308' : '#ef4444') }}></div>
                                </div>
                            </div>
                         </div>
                     );
                 })}
            </div>
        </div>
    );
}
