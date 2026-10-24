"use client";

import { useState, useEffect } from 'react';
import { db } from '../app/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { SwButton, SwDivider, SwIcon, SwLabel, SwPanel, SwPortrait, SwSpinner, SwWindow } from './ui/Swtor';

export default function CouncilManager({ userFaction, userRole, onClose }) {
    const [members, setMembers] = useState([]);
    const [factions, setFactions] = useState([]); // Liste des factions pour l'assignation
    const [loading, setLoading] = useState(true);
    
    // États pour l'interface
    const [selectedMemberId, setSelectedMemberId] = useState(null);
    const [appointingDiplomatMember, setAppointingDiplomatMember] = useState(null); // Membre en cours de nomination diplomatique

    const isRepublic = userFaction === 'republic';
    const isMandalorian = userFaction === 'mandalorians';
    const isAdmin = ['admin', 'gamemaster'].includes(userRole);

    // --- CONFIGURATION ---
    // L'accent sw-accent suit déjà la faction (bleu République, rouge Empire, ambre sinon)
    const theme = {
        faction: userFaction,
        border: "border-sw-accent/60",
        textMain: "text-sw-accent-light",
        connector: "bg-sw-accent/40",
        bgImageUrl: isRepublic ? '/images/republic_bg.jpg' : '/images/empire_council.jpg' // Garde l'image Empire par défaut pour Mando ou ajouter une spécifique
    };

    useEffect(() => {
        if (!userFaction) return;

        // 1. Charger les membres
        const qMembers = query(collection(db, "users"), where("faction_id", "==", userFaction));
        const unsubMembers = onSnapshot(qMembers, (snapshot) => {
            const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMembers(users);
            setLoading(false);
        });

        // 2. Charger les factions (pour la liste de choix diplomatique)
        const fetchFactions = async () => {
            const snap = await getDocs(collection(db, "factions"));
            // On exclut sa propre faction et les neutres si besoin
            const facs = snap.docs.map(d => ({id: d.id, ...d.data()})).filter(f => f.id !== userFaction && f.id !== 'neutral');
            setFactions(facs);
        };
        fetchFactions();

        return () => unsubMembers();
    }, [userFaction]);

    // Fonction générique de mise à jour (pour Généraux, Gouverneurs, etc.)
    const handleUpdateRole = async (memberId, newRole, pseudo, extraData = {}) => {
        const confirmMsg = newRole === 'citizen' 
            ? `Rétrograder ${pseudo} au rang de Citoyen ?` 
            : `Nommer ${pseudo} au poste de ${newRole.toUpperCase()} ?`;

        if(!confirm(confirmMsg)) return;

        try { 
            // On reset l'assignation diplomatique si on change de rôle
            await updateDoc(doc(db, "users", memberId), { 
                role: newRole,
                diplomatic_assignment: extraData.targetFactionId || null, // Sauvegarde l'ID de la faction cible
                diplomatic_assignment_name: extraData.targetFactionName || null // Sauvegarde le nom pour affichage facile
            }); 
            setSelectedMemberId(null); 
            setAppointingDiplomatMember(null);
        } catch (e) { console.error(e); }
    };

    // Gestion du clic pour ouvrir/fermer le menu
    const toggleSelection = (id) => {
        if (selectedMemberId === id) setSelectedMemberId(null);
        else setSelectedMemberId(id);
    };

    // --- FILTRES ---
    const getEmperor = () => members.find(m => m.role === 'emperor');
    const getCouncil = () => members.filter(m => m.role === 'conseil'); 
    const getGenerals = () => members.filter(m => m.role === 'general');
    const getDiplomats = () => members.filter(m => m.role === 'diplomat');
    const getGovernors = () => members.filter(m => m.role === 'governor');
    const getCitizens = () => members.filter(m => !['emperor', 'conseil', 'general', 'diplomat', 'governor'].includes(m.role));

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center perspective-1000" onClick={() => setSelectedMemberId(null)}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-500"></div>

            <SwWindow
                faction={userFaction}
                icon={isMandalorian ? 'mtx_flair_mandalorian' : undefined}
                title={isRepublic ? "Haute Chambre du Sénat" : (isMandalorian ? "Grand Conseil des Clans" : "Citadelle du Conseil Noir")}
                subtitle={<>Organigramme Officiel {isAdmin && <span className="text-sw-warn ml-2">[MODE ADMIN]</span>}</>}
                onClose={onClose}
                className="w-[98vw] max-w-[1600px] h-[95vh] overflow-hidden"
                bodyClassName="flex flex-col p-0 pt-1 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >

                {/* --- MODAL DE SÉLECTION DE FACTION (POPUP DIPLOMATE) --- */}
                {appointingDiplomatMember && (
                    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
                        <SwWindow title="Affectation Diplomatique" icon="datapad" className="w-96" bodyClassName="flex flex-col gap-4 p-5">
                            <p className="text-sw-dim text-xs text-center">Choisissez la faction auprès de laquelle <strong className="text-sw-gold">{appointingDiplomatMember.pseudo}</strong> sera Ambassadeur.</p>

                            <SwPanel dark className="flex flex-col gap-1 max-h-60 overflow-y-auto sw-scroll p-1.5">
                                {factions.map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => handleUpdateRole(appointingDiplomatMember.id, 'diplomat', appointingDiplomatMember.pseudo, { targetFactionId: f.id, targetFactionName: f.name })}
                                        className="sw-row flex items-center gap-3 p-2 cursor-pointer text-left"
                                    >
                                        <div className="w-5 h-5 rounded-full ring-1 ring-black/70 shadow-[0_0_6px_currentColor]" style={{backgroundColor: f.color, color: f.color}}></div>
                                        <span className="text-sm font-bold text-sw-text">{f.name}</span>
                                    </button>
                                ))}
                            </SwPanel>

                            <SwButton size="sm" variant="danger" onClick={() => setAppointingDiplomatMember(null)} className="self-center mt-1">Annuler</SwButton>
                        </SwWindow>
                    </div>
                )}

                {/* --- ZONE DE CONTENU --- */}
                <div className="flex-grow overflow-y-auto sw-scroll relative z-10">

                    {/* ARRIÈRE-PLAN */}
                    <div className="absolute top-0 left-0 right-0 h-[700px] bg-cover bg-top bg-no-repeat pointer-events-none z-0" style={{ backgroundImage: `url('${theme.bgImageUrl}')`, opacity: 0.85 }}>
                        <div className={`absolute inset-0`} style={{background: 'linear-gradient(to bottom, rgb(9 12 18 / 0.25) 0%, transparent 40%, rgb(9 12 18 / 0.7) 75%, rgb(9 12 18) 100%)'}}></div>
                    </div>

                    <div className="p-8 flex flex-col items-center relative z-20">
                        {loading ? (
                            <SwSpinner faction={userFaction} label="Chargement..." className="mt-20" />
                        ) : (
                            <div className="flex flex-col items-center w-full space-y-12 pb-20">

                                {/* 1. SOMMET : EMPEREUR */}
                                <div className="flex flex-col items-center mt-8">
                                    <RoleSlot member={getEmperor()} roleName={isRepublic ? "Chancelier Suprême" : (isMandalorian ? "Mandalore" : "Empereur")} theme={theme} isUnique={true} onUpdateRole={handleUpdateRole} isAdmin={isAdmin} userRole={userRole} />
                                    <div className={`w-0.5 h-12 ${theme.connector} shadow-[0_0_8px_rgb(var(--sw-accent-rgb)/0.6)]`}></div>
                                </div>

                                {/* 2. CONSEIL */}
                                <div className="flex flex-col items-center w-full">
                                    <div className={`w-[70%] h-0.5 ${theme.connector} mb-4 shadow-[0_0_8px_rgb(var(--sw-accent-rgb)/0.6)]`}></div>
                                    <div className="grid grid-cols-5 gap-8 w-full justify-items-center px-10">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <div key={i} className="flex flex-col items-center w-full relative">
                                                <div className={`absolute -top-4 w-0.5 h-4 ${theme.connector}`}></div>
                                                <RoleSlot member={getCouncil()[i]} roleName={isMandalorian ? "Chef de Clan" : "Conseiller"} theme={theme} onUpdateRole={handleUpdateRole} isAdmin={isAdmin} userRole={userRole} />
                                            </div>
                                        ))}
                                    </div>
                                    <div className={`w-0.5 h-20 ${theme.connector} mt-4`}></div>
                                </div>

                                {/* 3. BRANCHES SPÉCIALISÉES */}
                                <SwPanel dark className="grid grid-cols-3 gap-8 w-full p-6 shadow-2xl">

                                    {/* MILITAIRE */}
                                    <div className="flex flex-col items-center border-r border-sw-border">
                                        <SwLabel as="h3" className="text-sw-success text-sm mb-6 flex items-center gap-2"><SwIcon name="assault" size={22} /> État-Major</SwLabel>
                                        <div className="flex flex-wrap justify-center gap-4">
                                            {getGenerals().map(m => (
                                                <RoleSlot key={m.id} member={m} roleName="Général" theme={theme} onUpdateRole={handleUpdateRole} isSmall={true} isAdmin={isAdmin} userRole={userRole} colorOverride="border-sw-success/60 text-sw-success" />
                                            ))}
                                            <AddSlot label="Nommer Général" color="text-sw-success border-sw-success/50" />
                                        </div>
                                    </div>

                                    {/* DIPLOMATIE (AVEC AFFICHAGE DE LA CIBLE) */}
                                    <div className="flex flex-col items-center border-r border-sw-border">
                                        <SwLabel as="h3" className="text-sw-info text-sm mb-6 flex items-center gap-2"><SwIcon name="datapad" size={22} /> Diplomatie</SwLabel>
                                        <div className="flex flex-wrap justify-center gap-4">
                                            {getDiplomats().map(m => (
                                                <RoleSlot
                                                    key={m.id}
                                                    member={m}
                                                    roleName="Diplomate"
                                                    // Affiche "Ambassadeur : [Nom]"
                                                    subTitle={m.diplomatic_assignment_name ? `Ambassadeur : ${m.diplomatic_assignment_name}` : "Non Assigné"}
                                                    theme={theme}
                                                    onUpdateRole={handleUpdateRole}
                                                    isSmall={true}
                                                    isAdmin={isAdmin}
                                                    userRole={userRole}
                                                    colorOverride="border-sw-info/70 text-sw-info"
                                                />
                                            ))}
                                            <AddSlot label="Nommer Diplomate" color="text-sw-info border-sw-info/50" />
                                        </div>
                                    </div>

                                    {/* GOUVERNANCE */}
                                    <div className="flex flex-col items-center">
                                        <SwLabel as="h3" className="text-sw-gold text-sm mb-6 flex items-center gap-2"><SwIcon name="star_map" size={22} /> Administration</SwLabel>
                                        <div className="flex flex-wrap justify-center gap-4">
                                            {getGovernors().map(m => (
                                                <RoleSlot key={m.id} member={m} roleName="Gouverneur" theme={theme} onUpdateRole={handleUpdateRole} isSmall={true} isAdmin={isAdmin} userRole={userRole} colorOverride="border-sw-gold-dim text-sw-gold" />
                                            ))}
                                            <AddSlot label="Nommer Gouverneur" color="text-sw-gold border-sw-gold-dim" />
                                        </div>
                                    </div>

                                </SwPanel>

                                {/* 4. LISTE DU BAS : CITOYENS */}
                                <SwPanel dark className="w-full mt-8 p-6 pb-32 shadow-xl">
                                    <SwLabel as="h4" className="mb-2">Citoyens &amp; Officiers en attente d&apos;affectation</SwLabel>
                                    <SwDivider className="mb-4" />
                                    <div className="grid grid-cols-6 gap-2">
                                        {getCitizens().map(m => {
                                            const isSelected = selectedMemberId === m.id;
                                            return (
                                                <div
                                                    key={m.id}
                                                    onClick={(e) => { e.stopPropagation(); toggleSelection(m.id); }}
                                                    data-active={isSelected ? 'true' : undefined}
                                                    className="sw-row flex items-center gap-2 p-2 cursor-pointer relative"
                                                >
                                                    <div className="w-6 h-6 bg-black rounded-full overflow-hidden flex items-center justify-center border border-sw-line shrink-0">
                                                        {m.avatar ? <img src={m.avatar} alt="" className="w-full h-full object-cover"/> : <SwIcon name="companion" size={20} className="rounded-full" />}
                                                    </div>
                                                    <span className="text-xs text-sw-text truncate select-none">{m.pseudo}</span>

                                                    {/* MENU D'AFFECTATION */}
                                                    {isSelected && (
                                                        <div className="sw-tooltip absolute bottom-full left-0 w-52 mb-1 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                            <div className="bg-sw-accent-dark text-sw-gold sw-label text-[9px] p-1.5 text-center">Affecter {m.pseudo} à :</div>
                                                            <button onClick={()=>handleUpdateRole(m.id, 'general', m.pseudo)} className="w-full text-[10px] font-bold uppercase tracking-wider text-sw-success p-2 hover:bg-sw-success/10 text-left border-b border-sw-border flex items-center gap-2 cursor-pointer"><SwIcon name="assault" size={18} /> Général</button>
                                                            {/* ACTION SPÉCIALE DIPLOMATE : OUVRE LE MODAL */}
                                                            <button onClick={()=>{ setAppointingDiplomatMember(m); setSelectedMemberId(null); }} className="w-full text-[10px] font-bold uppercase tracking-wider text-sw-info p-2 hover:bg-sw-info/10 text-left border-b border-sw-border flex items-center gap-2 cursor-pointer"><SwIcon name="datapad" size={18} /> Diplomate</button>
                                                            <button onClick={()=>handleUpdateRole(m.id, 'governor', m.pseudo)} className="w-full text-[10px] font-bold uppercase tracking-wider text-sw-gold p-2 hover:bg-sw-gold/10 text-left border-b border-sw-border flex items-center gap-2 cursor-pointer"><SwIcon name="star_map" size={18} /> Gouverneur</button>
                                                            <button onClick={()=>handleUpdateRole(m.id, 'conseil', m.pseudo)} className="w-full text-[10px] font-bold uppercase tracking-wider text-purple-400 p-2 hover:bg-purple-900/30 text-left border-b border-sw-border flex items-center gap-2 cursor-pointer"><SwIcon name="force" size={18} /> {isMandalorian ? "Chef de Clan" : "Conseil"}</button>
                                                            {isAdmin && <button onClick={()=>handleUpdateRole(m.id, 'emperor', m.pseudo)} className="w-full text-[10px] uppercase tracking-wider text-sw-error p-2 hover:bg-sw-error/10 text-left font-bold border-t border-sw-error/50 flex items-center gap-2 cursor-pointer"><SwIcon name="claninsignia" size={18} /> {isRepublic ? "CHANCELIER" : (isMandalorian ? "MANDALORE" : "EMPEREUR")} (Admin)</button>}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </SwPanel>

                            </div>
                        )}
                    </div>
                </div>
            </SwWindow>
        </div>
    );
}

// --- COMPOSANT CARTE DE RÔLE ---
function RoleSlot({ member, roleName, subTitle, theme, isUnique, isSmall, onUpdateRole, isAdmin, userRole, colorOverride }) {

    const frameStyle = colorOverride || `${theme.border} ${theme.textMain}`;
    const sizeClasses = isSmall ? 'w-32 h-40' : 'w-48 h-64';
    const avatarSize = isSmall ? 64 : 96;

    const isLeader = ['emperor', 'conseil'].includes(userRole);
    const targetIsTopLeader = ['Empereur', 'Chancelier Suprême', 'Mandalore'].includes(roleName);
    const canManage = isAdmin || (isLeader && !targetIsTopLeader);

    return (
        <div className={`relative group flex flex-col items-center transition-transform hover:-translate-y-1 ${isSmall ? 'w-32' : 'w-48'}`}>
            <div className={`
                relative flex flex-col items-center justify-center ${sizeClasses}
                border bg-sw-panel-dark/80 backdrop-blur-md overflow-hidden rounded-md
                ${member ? frameStyle : 'border-sw-border text-sw-faint border-dashed'}
                ${isUnique ? 'shadow-[0_0_40px_rgb(240_200_120/0.3)] border-sw-gold text-sw-gold' : 'shadow-[0_0_14px_rgb(70_150_220/0.15)]'}
            `}>
                {member ? (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/90 z-10"></div>
                        {member.avatar && <div className="absolute inset-0 bg-cover bg-center opacity-60 z-0" style={{backgroundImage: `url(${member.avatar})`}}></div>}

                        <SwPortrait faction={theme.faction} src={member.avatar} size={avatarSize} className="relative z-20 mb-2">
                            <SwIcon name="companion" size={Math.round(avatarSize * 0.55)} className="rounded-full" />
                        </SwPortrait>

                        <div className="relative z-20 text-center w-full px-2">
                            <div className="font-bold uppercase tracking-wide truncate text-xs text-sw-text drop-shadow-md">{member.pseudo}</div>
                            {/* Affiche l'assignation diplomatique si elle existe, sinon le rang */}
                            <div className={`text-[9px] truncate ${subTitle ? 'text-sw-info font-bold' : 'opacity-80'}`}>
                                {subTitle || member.custom_rank || roleName}
                            </div>
                        </div>

                        {canManage && (
                            <button
                                onClick={() => onUpdateRole(member.id, 'citizen', member.pseudo)}
                                className="absolute top-2 right-2 z-30 text-[8px] bg-sw-error/80 text-white px-1.5 py-0.5 rounded-[3px] opacity-0 group-hover:opacity-100 transition hover:bg-sw-error cursor-pointer"
                                title="Rétrograder Citoyen"
                            >
                                ✕
                            </button>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center opacity-50">
                        <span className="text-xl mb-1">+</span>
                        <span className="text-[8px] uppercase tracking-widest">Vacant</span>
                    </div>
                )}
            </div>

            <div className={`mt-[-10px] relative z-30 px-3 py-0.5 bg-sw-panel-dark border ${isUnique ? 'border-sw-gold-dim text-sw-gold' : 'border-sw-border text-sw-dim'} text-[8px] font-bold uppercase tracking-widest shadow-md rounded-full`}>
                {roleName}
            </div>
        </div>
    );
}

function AddSlot({ label, color }) {
    return (
        <div className={`w-32 h-40 border border-dashed ${color} bg-sw-panel-dark/40 flex flex-col items-center justify-center rounded-md opacity-40 select-none`}>
            <span className="text-[9px] uppercase tracking-wider text-center px-2">{label}<br/>(Voir liste en bas)</span>
        </div>
    );
}