"use client";

import { useState, useEffect } from 'react';
import { db } from '../app/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { SwButton, SwGlass, SwIcon, SwInput, SwLabel, SwPanel, SwPortrait, SwTabs, SwWindow } from './ui/Swtor';

const TALENT_POOLS = {
    root: { id: 'root', label: 'Héros Initié', desc: 'Active le déploiement du Héros', x: 50, y: 10, cost: 0, req: [], color: '#fff' },
    
    // MAGIC DOMAINS
    dark: [
        // Rang 1
        { id: 'mag_d1', label: 'Corruption', desc: 'Draine 20 PV ennemis', x: 20, y: 30, cost: 1, req: ['root'], type: 'passive', color: '#a855f7' },
        // Rang 2
        { id: 'mag_d2', label: 'Haine', desc: '+10% Dégâts Force', x: 10, y: 50, cost: 1, req: ['mag_d1'], type: 'passive', color: '#a855f7' },
        { id: 'mag_d3', label: 'Éclair', desc: 'Active: Dégâts directs', x: 30, y: 50, cost: 1, req: ['mag_d1'], type: 'active', color: '#a855f7' },
        // Rang 3
        { id: 'mag_d4', label: 'Siphon', desc: 'Vol de vie 10%', x: 10, y: 70, cost: 2, req: ['mag_d2'], type: 'passive', color: '#a855f7' },
        { id: 'mag_d5', label: 'Terreur', desc: 'Aura: -15 Moral', x: 20, y: 70, cost: 2, req: ['mag_d1'], type: 'passive', color: '#a855f7' },
        { id: 'mag_d6', label: 'Tempête', desc: 'Active: Dégâts Zone', x: 30, y: 70, cost: 2, req: ['mag_d3'], type: 'active', color: '#a855f7' },
        // Rang 4 (Ultime)
        { id: 'mag_d7', label: 'Seigneur Sith', desc: 'Ultime: +20% Stats Obscur', x: 20, y: 90, cost: 3, req: ['mag_d5', 'mag_d4', 'mag_d6'], type: 'passive', color: '#7e22ce' }
    ],
    light: [
        // Rang 1
        { id: 'mag_l1', label: 'Méditation', desc: 'Régénération Mana +10%', x: 20, y: 30, cost: 1, req: ['root'], type: 'passive', color: '#38bdf8' },
        // Rang 2
        { id: 'mag_l2', label: 'Sérénité', desc: 'Coût Mana -10%', x: 10, y: 50, cost: 1, req: ['mag_l1'], type: 'passive', color: '#38bdf8' },
        { id: 'mag_l3', label: 'Guérison', desc: 'Active: Soin allié', x: 30, y: 50, cost: 1, req: ['mag_l1'], type: 'active', color: '#38bdf8' },
        // Rang 3
        { id: 'mag_l4', label: 'Aura', desc: 'Défense alliés +15%', x: 10, y: 70, cost: 2, req: ['mag_l2'], type: 'passive', color: '#38bdf8' },
        { id: 'mag_l5', label: 'Protection', desc: 'Bouclier de Force', x: 20, y: 70, cost: 2, req: ['mag_l1'], type: 'passive', color: '#38bdf8' },
        { id: 'mag_l6', label: 'Onde Paix', desc: 'Active: Repousse ennemis', x: 30, y: 70, cost: 2, req: ['mag_l3'], type: 'active', color: '#38bdf8' },
        // Rang 4 (Ultime)
        { id: 'mag_l7', label: 'Avatar Force', desc: 'Ultime: Soin de masse', x: 20, y: 90, cost: 3, req: ['mag_l5', 'mag_l4', 'mag_l6'], type: 'active', color: '#0ea5e9' }
    ],
    mandalorian: [
        // Rang 1
        { id: 'mag_m1', label: 'Beskar', desc: 'Armure +50', x: 20, y: 30, cost: 1, req: ['root'], type: 'passive', color: '#f97316' },
        // Rang 2
        { id: 'mag_m2', label: 'Viseur', desc: 'Précision +15%', x: 10, y: 50, cost: 1, req: ['mag_m1'], type: 'passive', color: '#f97316' },
        { id: 'mag_m3', label: 'Arsenal', desc: 'Active: Missiles', x: 30, y: 50, cost: 1, req: ['mag_m1'], type: 'active', color: '#f97316' },
        // Rang 3
        { id: 'mag_m4', label: 'Bouclier', desc: 'Résist. Explosifs 25%', x: 10, y: 70, cost: 2, req: ['mag_m2'], type: 'passive', color: '#f97316' },
        { id: 'mag_m5', label: 'Jetpack', desc: 'Mobilité Aérienne', x: 20, y: 70, cost: 2, req: ['mag_m1'], type: 'passive', color: '#f97316' },
        { id: 'mag_m6', label: 'Pyro', desc: 'Active: Lance-flammes', x: 30, y: 70, cost: 2, req: ['mag_m3'], type: 'active', color: '#f97316' },
        // Rang 4 (Ultime)
        { id: 'mag_m7', label: 'Mand\'alor', desc: 'Ultime: Appel Renforts', x: 20, y: 90, cost: 3, req: ['mag_m5', 'mag_m4', 'mag_m6'], type: 'active', color: '#ea580c' }
    ],

    // COMBAT STYLES
    melee: [
        { id: 'cbt_1', label: 'Vigueur', desc: '+100 PV (Force)', x: 80, y: 30, cost: 1, req: ['root'], type: 'passive', color: '#ef4444' },
        { id: 'cbt_2', label: 'Charge', desc: 'Habilité: Bond vers l\'ennemi', x: 80, y: 50, cost: 2, req: ['cbt_1'], type: 'active', color: '#ef4444' },
        { id: 'cbt_3', label: 'Dueliste', desc: '+25% Dégâts Mêlée', x: 80, y: 70, cost: 3, req: ['cbt_2'], type: 'passive', color: '#ef4444' }
    ],
    shooter: [
        { id: 'cbt_1', label: 'Dextérité', desc: '+10% Critique (Tech)', x: 80, y: 30, cost: 1, req: ['root'], type: 'passive', color: '#22c55e' },
        { id: 'cbt_2', label: 'Surcharge', desc: 'Habilité: Tir puissant', x: 80, y: 50, cost: 2, req: ['cbt_1'], type: 'active', color: '#22c55e' },
        { id: 'cbt_3', label: 'Sniper', desc: '+2 Portée & Munitions', x: 80, y: 70, cost: 3, req: ['cbt_2'], type: 'passive', color: '#22c55e' }
    ]
};

const getTalentsForUser = (magicDomain, combatStyle) => {
    // Defaults if missing
    const domain = magicDomain || 'dark'; // Fallback
    const style = combatStyle || 'melee'; // Fallback

    return [
        TALENT_POOLS.root,
        ...(TALENT_POOLS[domain] || TALENT_POOLS.dark),
        ...(TALENT_POOLS[style] || TALENT_POOLS.melee)
    ];
};

export default function ProfileScreen({ userID, onClose }) {
    const [profile, setProfile] = useState(null);
    const [talents, setTalents] = useState([]);
    const [factionInfo, setFactionInfo] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState('bio'); // 'bio' | 'talents'
    const [formData, setFormData] = useState({ pseudo: '', avatar: '', custom_rank: '', bio: '' });
    
    // HERO STATE
    const [heroData, setHeroData] = useState({ level: 1, points: 1, unlocked: ['root'] });

    // ZOOM & PAN STATE
    const [pan, setPan] = useState({ x: 0, y: 0, scale: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const handleWheel = (e) => {
        if (tab !== 'talents') return;
        const scaleAmount = -e.deltaY * 0.001;
        const newScale = Math.min(Math.max(0.5, pan.scale + scaleAmount), 3);
        setPan(p => ({ ...p, scale: newScale }));
    };

    const handleMouseDown = (e) => {
        if (tab !== 'talents') return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging || tab !== 'talents') return;
        setPan(p => ({
            ...p,
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        }));
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        const fetchProfile = async () => {
            if (!userID) return;
            try {
                const userRef = doc(db, "users", userID);
                const userSnap = await getDoc(userRef);
                
                if (userSnap.exists()) {
                    const data = userSnap.data();
                    setProfile(data);
                    
                    // Generate Talents based on user choices
                    const userTalents = getTalentsForUser(data.magic_domain, data.combat_style);
                    setTalents(userTalents);

                    setFormData({ 
                        pseudo: data.pseudo || '', 
                        avatar: data.avatar || '', 
                        custom_rank: data.custom_rank || '', 
                        bio: data.bio || '' 
                    });
                    
                    if (data.hero_data) {
                        setHeroData({ level: 1, points: 1, unlocked: ['root'], ...data.hero_data });
                    } else {
                        // Init default hero data
                        setHeroData({ level: 1, points: 1, unlocked: ['root'] });
                    }

                    // Récupérer les infos de la faction pour l'icône
                    if (data.faction_id && data.faction_id !== 'neutral') {
                        const facSnap = await getDoc(doc(db, "factions", data.faction_id));
                        if (facSnap.exists()) setFactionInfo(facSnap.data());
                    }
                }
            } catch (e) { console.error("Erreur chargement profil", e); }
        };
        fetchProfile();
    }, [userID]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateDoc(doc(db, "users", userID), { 
                pseudo: formData.pseudo, 
                avatar: formData.avatar, 
                custom_rank: formData.custom_rank, 
                bio: formData.bio,
                hero_data: heroData 
            });
            setProfile({ ...profile, ...formData, hero_data: heroData });
            setIsEditing(false);
        } catch (e) { console.error(e); alert("Erreur lors de la sauvegarde."); }
        setSaving(false);
    };

    const unlockTalent = (talentId) => {
        const talent = talents.find(t => t.id === talentId);
        if (!talent) return;
        if (heroData.unlocked.includes(talentId)) return;
        
        // Auto-switch to edit mode to allow saving
        if (!isEditing) setIsEditing(true);
        
        // Check reqs
        const meetsReq = talent.req.every(r => heroData.unlocked.includes(r));
        if (!meetsReq) return alert("Pré-requis non remplis");
        
        if (heroData.points < talent.cost) return alert("Points insuffisants");
        
        setHeroData({
            ...heroData,
            points: heroData.points - talent.cost,
            unlocked: [...heroData.unlocked, talentId]
        });
    };

    if (!profile) return null;

    const formatRole = (role) => { 
        const roles = { 
            'admin': 'Administrateur Galactique', 
            'gamemaster': 'Maître du Jeu', 
            'emperor': 'Empereur / Chancelier', 
            'conseil': 'Membre du Conseil', 
            'general': 'Grand Général', 
            'governor': 'Gouverneur Planétaire' 
        }; 
        return roles[role] || 'Citoyen'; 
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <SwWindow
                faction={profile.faction_id}
                title={profile.pseudo}
                subtitle={formData.custom_rank || formatRole(profile.role)}
                onClose={onClose}
                className="w-[900px] max-w-full h-[600px] max-h-[92vh]"
                bodyClassName="flex p-0! overflow-hidden"
                actions={!isEditing ? (
                    <SwButton size="sm" onClick={() => setIsEditing(true)}>Modifier</SwButton>
                ) : (
                    <>
                        <SwButton size="sm" variant="danger" onClick={() => setIsEditing(false)}>Annuler</SwButton>
                        <SwButton size="sm" variant="accent" onClick={handleSave} disabled={saving}>
                            {saving ? '...' : 'Sauvegarder'}
                        </SwButton>
                    </>
                )}
            >
                {/* DÉCORATION DE FOND */}
                <div className="absolute top-0 right-0 p-4 opacity-[0.06] pointer-events-none">
                    <div className="sw-title text-9xl">ID</div>
                </div>

                {/* COLONNE GAUCHE : IDENTITÉ */}
                <div className="w-1/4 bg-sw-panel-dark/70 border-r border-sw-border flex flex-col items-center p-6 relative shrink-0 rounded-bl-[10px]">
                    <div className="relative group mb-4">
                        <SwPortrait faction={profile.faction_id} src={formData.avatar || undefined} size={140} scanner>
                            <div className="w-full h-full flex items-center justify-center text-4xl text-sw-faint bg-sw-bg">👤</div>
                        </SwPortrait>
                        {factionInfo && (
                            <div className="absolute bottom-1 right-1 w-10 h-10 rounded-full border-2 border-sw-line bg-sw-bg flex items-center justify-center shadow-lg overflow-hidden" title={factionInfo.name}>
                                {factionInfo.image ? <img src={factionInfo.image} alt="" className="w-full h-full object-cover rounded-full"/> : <span className="text-xs" style={{color: factionInfo.color}}>★</span>}
                            </div>
                        )}
                    </div>

                    <div className="text-center w-full">
                        <h2 className="sw-title text-xl tracking-wider truncate">{profile.pseudo}</h2>
                        <SwLabel className="text-sw-accent-light mt-1">{formData.custom_rank || formatRole(profile.role)}</SwLabel>

                        <SwPanel dark className="mt-6 w-full space-y-2 text-left p-3">
                            <div className="flex justify-between text-[10px] text-sw-dim uppercase"><span>Matricule</span><span className="font-mono text-sw-text">{userID.substring(0, 8)}</span></div>
                            <div className="flex justify-between text-[10px] text-sw-dim uppercase"><span>Allégeance</span><span className="font-bold" style={{color: factionInfo?.color || 'var(--sw-text)'}}>{factionInfo?.name || 'Neutre'}</span></div>
                            <div className="flex justify-between text-[10px] text-sw-dim uppercase"><span>Niveau Héros</span><span className="text-sw-gold font-bold">{heroData.level}</span></div>

                            {/* STATS SUMMARY */}
                            <div className="border-t border-sw-border mt-2 pt-2 grid grid-cols-2 gap-1 text-center">
                                <div>
                                    <div className="text-[8px] text-purple-400 mb-1">PUISSANCE (Magie)</div>
                                    <div className="font-mono text-sw-text font-bold">{heroData.unlocked.filter(id => id.startsWith('mag')).length}</div>
                                </div>
                                <div>
                                    <div className="text-[8px] text-red-400 mb-1">MAÎTRISE (Combat)</div>
                                    <div className="font-mono text-sw-text font-bold">{heroData.unlocked.filter(id => id.startsWith('cbt')).length}</div>
                                </div>
                            </div>
                        </SwPanel>
                    </div>
                </div>

                {/* COLONNE DROITE : DÉTAILS ET MODIFICATION */}
                <div className="flex-1 p-5 flex flex-col min-w-0">
                    <div className="mb-4 border-b border-sw-border">
                        <SwTabs
                            tabs={[
                                { id: 'bio', label: 'Dossier', icon: 'datapad' },
                                { id: 'talents', label: 'Talents', icon: 'force' },
                            ]}
                            value={tab}
                            onChange={setTab}
                        />
                    </div>

                    <div className="flex-grow overflow-y-auto sw-scroll relative">
                        {tab === 'bio' ? (
                            isEditing ? (
                                <div className="space-y-4 animate-in slide-in-from-right-5 duration-300">
                                    <div>
                                        <SwLabel as="label" className="block mb-1">Nom de code (Pseudo)</SwLabel>
                                        <SwInput value={formData.pseudo} onChange={e => setFormData({...formData, pseudo: e.target.value})} />
                                    </div>
                                    <div>
                                        <SwLabel as="label" className="block mb-1">Titre / Rang RP (Ex: Grand Amiral)</SwLabel>
                                        <SwInput value={formData.custom_rank} onChange={e => setFormData({...formData, custom_rank: e.target.value})} placeholder="Laisser vide pour utiliser le rang système" />
                                    </div>
                                    <div>
                                        <SwLabel as="label" className="block mb-1">Holo-Portrait (URL Image)</SwLabel>
                                        <SwInput value={formData.avatar} onChange={e => setFormData({...formData, avatar: e.target.value})} className="font-mono" />
                                    </div>
                                    <div>
                                        <SwLabel as="label" className="block mb-1">Biographie / Notes de service</SwLabel>
                                        <SwInput as="textarea" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} className="h-32 resize-none" />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <SwGlass className="text-sw-dim text-sm leading-relaxed whitespace-pre-wrap p-4">
                                        {profile.bio || "Aucune donnée biographique disponible dans les archives."}
                                    </SwGlass>
                                    <div className="grid grid-cols-2 gap-4">
                                        <SwPanel className="p-3">
                                            <SwLabel>Statut Système</SwLabel>
                                            <div className="text-sw-success font-mono text-sm">ACTIF</div>
                                        </SwPanel>
                                        <SwPanel className="p-3">
                                            <SwLabel>Dernière Connexion</SwLabel>
                                            <div className="text-sw-text font-mono text-sm">Aujourd&apos;hui</div>
                                        </SwPanel>
                                    </div>
                                </div>
                            )
                        ) : (
                            // TALENT TREE TAB
                            <div
                                className="relative h-full w-full sw-panel-dark overflow-hidden shadow-inner group-tab cursor-grab active:cursor-grabbing"
                                onWheel={handleWheel}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                            >
                                {/* BACKGROUND GRID & EFFECTS */}
                                <div className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none" style={{ backgroundImage: 'url(/ui/swtor/backdrop.webp)' }}></div>
                                <div
                                    className="absolute inset-0 bg-[linear-gradient(rgb(var(--sw-accent-rgb)/0.25)_1px,transparent_1px),linear-gradient(90deg,rgb(var(--sw-accent-rgb)/0.25)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none transition-transform duration-75"
                                    style={{ transform: `translate(${pan.x * 0.5}px, ${pan.y * 0.5}px) scale(${pan.scale})`, transformOrigin: 'center' }}
                                ></div>
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none"></div>

                                {/* HEADER INFO */}
                                <div className="absolute top-4 right-4 z-20 flex flex-col items-end pointer-events-none">
                                    <SwGlass accent="var(--sw-gold)" className="px-4 py-2 mb-2">
                                        <SwLabel>Points de Force</SwLabel>
                                        <div className="text-2xl font-mono font-bold text-sw-gold text-right">{heroData.points}</div>
                                    </SwGlass>
                                    <SwLabel className="text-[10px] text-sw-faint">Arbre de Résonance</SwLabel>
                                    <div className="text-[9px] text-sw-faint mt-1">Zoom: {Math.round(pan.scale * 100)}%</div>
                                </div>

                                <div
                                    className="absolute inset-0 transform origin-center transition-transform duration-75 ease-out"
                                    style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${pan.scale})` }}
                                >
                                   {/* CONNECTORS (SVG LAYER) */}
                                   <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                                       <defs>
                                           <filter id="glow-line" x="-20%" y="-20%" width="140%" height="140%">
                                               <feGaussianBlur stdDeviation="2" result="blur" />
                                               <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                           </filter>
                                       </defs>
                                       {talents.map(t => t.req.map(reqId => {
                                           const parent = talents.find(p => p.id === reqId);
                                           if (!parent) return null;
                                           const isUnlocked = heroData.unlocked.includes(t.id);
                                           return (
                                               <g key={`${parent.id}-${t.id}`}>
                                                   {/* Background Line (dim) */}
                                                   <line
                                                    x1={`${parent.x}%`} y1={`${parent.y}%`}
                                                    x2={`${t.x}%`} y2={`${t.y}%`}
                                                    stroke="var(--sw-border)"
                                                    strokeWidth="4"
                                                    strokeLinecap="round"
                                                   />
                                                   {/* Foreground Line (active) */}
                                                    <line
                                                        x1={`${parent.x}%`} y1={`${parent.y}%`}
                                                        x2={`${t.x}%`} y2={`${t.y}%`}
                                                        stroke={t.color}
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeDasharray={isUnlocked ? "none" : "4,4"}
                                                        className={`transition-all duration-1000 ${isUnlocked ? 'opacity-100' : 'opacity-30'}`}
                                                        filter={isUnlocked ? "url(#glow-line)" : ""}
                                                   />
                                               </g>
                                           );
                                       }))}
                                   </svg>

                                   {/* NODES LAYER */}
                                   {talents.map(t => {
                                       const isUnlocked = heroData.unlocked.includes(t.id);
                                       const isAvailable = !isUnlocked && t.req.every(r => heroData.unlocked.includes(r));
                                       const canAfford = isAvailable && heroData.points >= t.cost;

                                       // Node Icon Logic (icônes du pack SWTOR)
                                       let Icon = 'abl_jc_sh_force_harmonics';
                                       if (t.id === 'root') Icon = 'icon_oldholocron_01';
                                       else if (t.desc.includes('Ultime')) Icon = 'callontheforce'; // Ultime
                                       else if (t.type === 'active') Icon = 'lightningstrike'; // Actif
                                       else Icon = 'energyshield'; // Passif

                                       return (
                                           <div
                                            key={t.id}
                                            className="absolute -translate-x-1/2 -translate-y-1/2 group z-10"
                                            style={{ left: `${t.x}%`, top: `${t.y}%` }}
                                           >
                                               {/* PULSING RING FOR AVAILABLE */}
                                                {isAvailable && (
                                                    <div className="absolute inset-0 rounded-full animate-ping opacity-30" style={{backgroundColor: t.color}}></div>
                                                )}

                                               {/* MAIN NODE CIRCLE */}
                                               <div
                                                    onClick={() => unlockTalent(t.id)}
                                                    className={`
                                                        relative w-14 h-14 rounded-full flex items-center justify-center border-2
                                                        transition-all duration-300 cursor-pointer overflow-hidden
                                                        ${isUnlocked
                                                            ? 'bg-sw-panel-dark'
                                                            : (isAvailable
                                                                ? (canAfford ? 'bg-sw-panel-light border-white hover:scale-110 shadow-lg' : 'bg-sw-panel-dark border-sw-line grayscale')
                                                                : 'bg-sw-bg border-sw-border opacity-40 grayscale cursor-not-allowed')
                                                        }
                                                    `}
                                                    style={{
                                                        borderColor: isUnlocked ? t.color : (isAvailable && canAfford ? '#fff' : undefined),
                                                        boxShadow: isUnlocked ? `0 0 15px ${t.color}60` : undefined
                                                    }}
                                               >
                                                   {/* Inner Content */}
                                                   <span className={`flex items-center justify-center drop-shadow-md ${isUnlocked ? '' : 'opacity-70'}`} style={{filter: isUnlocked ? `drop-shadow(0 0 6px ${t.color})` : 'none'}}>
                                                       <SwIcon name={Icon} size={44} className="rounded-full" />
                                                   </span>
                                                   <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                                               </div>

                                               {/* TOOLTIP ON HOVER */}
                                               <div className="absolute top-16 left-1/2 -translate-x-1/2 w-48 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-30">
                                                   <div className="sw-tooltip p-3 relative overflow-hidden">
                                                       {/* Decorative bar */}
                                                       <div className="absolute top-0 left-0 w-full h-[2px]" style={{backgroundColor: t.color, boxShadow: `0 0 6px ${t.color}`}}></div>

                                                       <div className="sw-title text-sm tracking-wider mb-1 mt-1">{t.label}</div>
                                                       <div className="text-[10px] text-sw-dim leading-tight mb-2 italic">{t.type === 'active' ? '[ Compétence Active ]' : '[ Bonus Passif ]'}</div>
                                                       <div className="text-xs text-sw-text border-t border-sw-border pt-2 mb-2">{t.desc}</div>

                                                       {!isUnlocked && (
                                                           <div className="flex justify-between items-center sw-panel-dark p-1">
                                                               <span className="sw-label text-[9px]">Coût requis</span>
                                                               <span className={`text-xs font-mono font-bold ${canAfford ? 'text-sw-success' : 'text-sw-error'}`}>
                                                                   {t.cost} PTS
                                                               </span>
                                                           </div>
                                                       )}
                                                       {isUnlocked && <div className="text-[10px] text-sw-success font-bold uppercase text-center bg-sw-success/10 py-1 rounded">Acquis</div>}
                                                   </div>
                                               </div>
                                           </div>
                                       );
                                   })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </SwWindow>
        </div>
    );
}
