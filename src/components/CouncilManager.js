"use client";

import { useState, useEffect } from 'react';
import { db } from '../app/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';

export default function CouncilManager({ userFaction, userRole, onClose }) {
    const [members, setMembers] = useState([]);
    const [factions, setFactions] = useState([]); // Liste des factions pour l'assignation
    const [loading, setLoading] = useState(true);
    
    // États pour l'interface
    const [selectedMemberId, setSelectedMemberId] = useState(null);
    const [appointingDiplomatMember, setAppointingDiplomatMember] = useState(null); // Membre en cours de nomination diplomatique

    const isRepublic = userFaction === 'republic';
    const isAdmin = ['admin', 'gamemaster'].includes(userRole);

    // --- CONFIGURATION ---
    const theme = {
        bgGradient: isRepublic ? "bg-[#050a15]" : "bg-[#150505]",
        border: isRepublic ? "border-blue-600" : "border-red-800",
        textMain: isRepublic ? "text-blue-300" : "text-red-400",
        connector: isRepublic ? "bg-blue-500/30" : "bg-red-500/30",
        button: isRepublic ? "bg-blue-900 hover:bg-blue-800 border-blue-500" : "bg-red-900 hover:bg-red-800 border-red-500",
        bgImageUrl: isRepublic ? '/images/republic_bg.jpg' : '/images/empire_council.jpg'
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
        <div className="fixed inset-0 z-[150] flex items-center justify-center font-sans perspective-1000" onClick={() => setSelectedMemberId(null)}>
            <div className="absolute inset-0 bg-black/95 backdrop-blur-sm animate-in fade-in duration-500"></div>

            <div className={`w-[98vw] max-w-[1600px] h-[95vh] relative overflow-hidden flex flex-col rounded-xl border-2 ${theme.border} ${theme.bgGradient} shadow-[0_0_100px_rgba(0,0,0,1)]`} onClick={(e) => e.stopPropagation()}>
                
                {/* --- MODAL DE SÉLECTION DE FACTION (POPUP DIPLOMATE) --- */}
                {appointingDiplomatMember && (
                    <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center animate-in fade-in duration-200">
                        <div className={`bg-gray-900 border-2 ${theme.border} p-6 rounded-lg w-96 shadow-2xl flex flex-col gap-4`}>
                            <h3 className={`text-xl font-bold uppercase text-center ${theme.textMain}`}>Affectation Diplomatique</h3>
                            <p className="text-gray-400 text-xs text-center">Choisissez la faction auprès de laquelle <strong>{appointingDiplomatMember.pseudo}</strong> sera Ambassadeur.</p>
                            
                            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto custom-scrollbar border-t border-b border-gray-800 py-2">
                                {factions.map(f => (
                                    <button 
                                        key={f.id}
                                        onClick={() => handleUpdateRole(appointingDiplomatMember.id, 'diplomat', appointingDiplomatMember.pseudo, { targetFactionId: f.id, targetFactionName: f.name })}
                                        className="flex items-center gap-3 p-2 hover:bg-white/10 transition rounded border border-transparent hover:border-gray-600"
                                    >
                                        <div className="w-6 h-6 rounded-full" style={{backgroundColor: f.color}}></div>
                                        <span className="text-sm font-bold text-gray-200">{f.name}</span>
                                    </button>
                                ))}
                            </div>
                            
                            <button onClick={() => setAppointingDiplomatMember(null)} className="text-xs text-red-500 uppercase font-bold hover:text-white mt-2">Annuler</button>
                        </div>
                    </div>
                )}

                {/* --- EN-TÊTE --- */}
                <div className={`relative z-40 flex justify-between items-center p-6 border-b ${theme.border} bg-black/90 backdrop-blur-md shadow-lg`}>
                    <div className="flex items-center gap-4">
                        <span className={`text-5xl ${theme.textMain}`}>{isRepublic ? '⚜️' : '☠️'}</span>
                        <div>
                            <h1 className={`text-3xl font-serif font-black uppercase tracking-[0.2em] ${theme.textMain} drop-shadow-md`}>
                                {isRepublic ? "Haute Chambre du Sénat" : "Citadelle du Conseil Noir"}
                            </h1>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                                Organigramme Officiel {isAdmin && <span className="text-yellow-500 font-bold ml-2">[MODE ADMIN]</span>}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`px-6 py-2 border ${theme.border} text-white uppercase font-bold hover:bg-white/10 transition`}>Fermer</button>
                </div>

                {/* --- ZONE DE CONTENU --- */}
                <div className="flex-grow overflow-y-auto custom-scrollbar relative z-10">
                    
                    {/* ARRIÈRE-PLAN */}
                    <div className="absolute top-0 left-0 right-0 h-[700px] bg-cover bg-top bg-no-repeat pointer-events-none z-0" style={{ backgroundImage: `url('${theme.bgImageUrl}')`, opacity: 1 }}>
                        <div className={`absolute inset-0`} style={{background: `linear-gradient(to bottom, transparent 0%, transparent 70%, ${isRepublic ? '#050a15' : '#150505'} 100%)`}}></div>
                    </div>

                    <div className="p-8 flex flex-col items-center relative z-20">
                        {loading ? (
                            <div className={`mt-20 text-2xl font-mono animate-pulse ${theme.textMain}`}>CHARGEMENT...</div>
                        ) : (
                            <div className="flex flex-col items-center w-full space-y-12 pb-20">
                                
                                {/* 1. SOMMET : EMPEREUR */}
                                <div className="flex flex-col items-center mt-8">
                                    <RoleSlot member={getEmperor()} roleName={isRepublic ? "Chancelier Suprême" : "Empereur"} theme={theme} isUnique={true} onUpdateRole={handleUpdateRole} isAdmin={isAdmin} />
                                    <div className={`w-1 h-12 ${theme.connector} shadow-[0_0_10px_currentColor]`}></div>
                                </div>

                                {/* 2. CONSEIL */}
                                <div className="flex flex-col items-center w-full">
                                    <div className={`w-[70%] h-1 ${theme.connector} mb-4 shadow-[0_0_10px_currentColor]`}></div>
                                    <div className="grid grid-cols-5 gap-8 w-full justify-items-center px-10">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <div key={i} className="flex flex-col items-center w-full relative">
                                                <div className={`absolute -top-4 w-1 h-4 ${theme.connector}`}></div>
                                                <RoleSlot member={getCouncil()[i]} roleName="Conseiller" theme={theme} onUpdateRole={handleUpdateRole} isAdmin={isAdmin} />
                                            </div>
                                        ))}
                                    </div>
                                    <div className={`w-1 h-20 ${theme.connector} mt-4`}></div>
                                </div>

                                {/* 3. BRANCHES SPÉCIALISÉES */}
                                <div className="grid grid-cols-3 gap-8 w-full border-t border-dashed border-gray-800 pt-8 bg-black/80 rounded-xl p-6 shadow-2xl border border-white/5">
                                    
                                    {/* MILITAIRE */}
                                    <div className="flex flex-col items-center border-r border-gray-800/50">
                                        <h3 className="text-green-500 font-bold uppercase tracking-widest text-sm mb-6 flex items-center gap-2">⚔️ État-Major</h3>
                                        <div className="flex flex-wrap justify-center gap-4">
                                            {getGenerals().map(m => (
                                                <RoleSlot key={m.id} member={m} roleName="Général" theme={theme} onUpdateRole={handleUpdateRole} isSmall={true} isAdmin={isAdmin} colorOverride="border-green-800 text-green-400" />
                                            ))}
                                            <AddSlot label="Nommer Général" color="text-green-600 border-green-900" />
                                        </div>
                                    </div>

                                    {/* DIPLOMATIE (AVEC AFFICHAGE DE LA CIBLE) */}
                                    <div className="flex flex-col items-center border-r border-gray-800/50">
                                        <h3 className="text-blue-400 font-bold uppercase tracking-widest text-sm mb-6 flex items-center gap-2">📜 Diplomatie</h3>
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
                                                    colorOverride="border-blue-500 text-blue-300" 
                                                />
                                            ))}
                                            <AddSlot label="Nommer Diplomate" color="text-blue-600 border-blue-900" />
                                        </div>
                                    </div>

                                    {/* GOUVERNANCE */}
                                    <div className="flex flex-col items-center">
                                        <h3 className="text-yellow-500 font-bold uppercase tracking-widest text-sm mb-6 flex items-center gap-2">🏛️ Administration</h3>
                                        <div className="flex flex-wrap justify-center gap-4">
                                            {getGovernors().map(m => (
                                                <RoleSlot key={m.id} member={m} roleName="Gouverneur" theme={theme} onUpdateRole={handleUpdateRole} isSmall={true} isAdmin={isAdmin} colorOverride="border-yellow-700 text-yellow-400" />
                                            ))}
                                            <AddSlot label="Nommer Gouverneur" color="text-yellow-600 border-yellow-900" />
                                        </div>
                                    </div>

                                </div>

                                {/* 4. LISTE DU BAS : CITOYENS */}
                                <div className="w-full mt-8 bg-black border border-gray-800 p-6 rounded-lg pb-32 shadow-xl">
                                    <h4 className="text-gray-500 text-xs uppercase tracking-widest mb-4 border-b border-gray-800 pb-2">Citoyens & Officiers en attente d'affectation</h4>
                                    <div className="grid grid-cols-6 gap-2">
                                        {getCitizens().map(m => {
                                            const isSelected = selectedMemberId === m.id;
                                            return (
                                                <div 
                                                    key={m.id} 
                                                    onClick={(e) => { e.stopPropagation(); toggleSelection(m.id); }}
                                                    className={`flex items-center gap-2 p-2 border rounded cursor-pointer transition-all relative
                                                        ${isSelected ? 'bg-gray-800 border-white' : 'bg-gray-900/50 border-gray-800 hover:border-gray-500'}
                                                    `}
                                                >
                                                    <div className="w-6 h-6 bg-black rounded-full overflow-hidden flex items-center justify-center text-gray-500 border border-gray-700 text-[10px]">
                                                        {m.avatar ? <img src={m.avatar} className="w-full h-full object-cover"/> : '👤'}
                                                    </div>
                                                    <span className="text-xs text-gray-300 truncate select-none">{m.pseudo}</span>
                                                    
                                                    {/* MENU D'AFFECTATION */}
                                                    {isSelected && (
                                                        <div className="absolute bottom-full left-0 w-48 bg-gray-950 border border-white z-50 shadow-[0_0_20px_black] rounded-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                            <div className="bg-white text-black text-[9px] p-1 text-center font-bold uppercase tracking-widest">Affecter {m.pseudo} à :</div>
                                                            <button onClick={()=>handleUpdateRole(m.id, 'general', m.pseudo)} className="w-full text-[10px] text-green-400 p-2 hover:bg-green-900/30 text-left border-b border-gray-800 flex items-center gap-2">⚔️ Général</button>
                                                            {/* ACTION SPÉCIALE DIPLOMATE : OUVRE LE MODAL */}
                                                            <button onClick={()=>{ setAppointingDiplomatMember(m); setSelectedMemberId(null); }} className="w-full text-[10px] text-blue-400 p-2 hover:bg-blue-900/30 text-left border-b border-gray-800 flex items-center gap-2">📜 Diplomate</button>
                                                            <button onClick={()=>handleUpdateRole(m.id, 'governor', m.pseudo)} className="w-full text-[10px] text-yellow-400 p-2 hover:bg-yellow-900/30 text-left border-b border-gray-800 flex items-center gap-2">🏛️ Gouverneur</button>
                                                            <button onClick={()=>handleUpdateRole(m.id, 'conseil', m.pseudo)} className="w-full text-[10px] text-purple-400 p-2 hover:bg-purple-900/30 text-left border-b border-gray-800 flex items-center gap-2">⚡ Conseil</button>
                                                            {isAdmin && <button onClick={()=>handleUpdateRole(m.id, 'emperor', m.pseudo)} className="w-full text-[10px] text-red-500 p-2 hover:bg-red-900/30 text-left font-bold border-t border-red-900">👑 EMPEREUR (Admin)</button>}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- COMPOSANT CARTE DE RÔLE ---
function RoleSlot({ member, roleName, subTitle, theme, isUnique, isSmall, onUpdateRole, isAdmin, colorOverride }) {
    
    const frameStyle = colorOverride || `${theme.border} ${theme.textMain}`;
    const sizeClasses = isSmall ? 'w-32 h-40' : 'w-48 h-64';
    const avatarSize = isSmall ? 'w-16 h-16' : 'w-24 h-24';
    const canManage = isAdmin || (roleName !== 'Empereur' && roleName !== 'Chancelier Suprême');

    return (
        <div className={`relative group flex flex-col items-center transition-transform hover:-translate-y-1 ${isSmall ? 'w-32' : 'w-48'}`}>
            <div className={`
                relative flex flex-col items-center justify-center ${sizeClasses}
                border-2 bg-black/60 backdrop-blur-md overflow-hidden rounded-lg
                ${member ? frameStyle : 'border-gray-800 text-gray-600 border-dashed'}
                ${isUnique ? 'shadow-[0_0_50px_rgba(255,215,0,0.3)] border-yellow-600 text-yellow-500' : 'shadow-lg'}
            `}>
                {member ? (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/90 z-10"></div>
                        {member.avatar && <div className="absolute inset-0 bg-cover bg-center opacity-60 z-0" style={{backgroundImage: `url(${member.avatar})`}}></div>}
                        
                        <div className={`relative z-20 ${avatarSize} rounded-full border-2 ${isUnique ? 'border-yellow-500' : 'border-current'} overflow-hidden bg-black shadow-lg mb-2`}>
                            {member.avatar ? <img src={member.avatar} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>}
                        </div>

                        <div className="relative z-20 text-center w-full px-2">
                            <div className="font-bold uppercase truncate text-xs text-white drop-shadow-md">{member.pseudo}</div>
                            {/* Affiche l'assignation diplomatique si elle existe, sinon le rang */}
                            <div className={`text-[9px] truncate ${subTitle ? 'text-blue-300 font-bold' : 'opacity-80'}`}>
                                {subTitle || member.custom_rank || roleName}
                            </div>
                        </div>

                        {canManage && (
                            <button 
                                onClick={() => onUpdateRole(member.id, 'citizen', member.pseudo)}
                                className="absolute top-2 right-2 z-30 text-[8px] bg-red-600 text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition hover:bg-red-500"
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
            
            <div className={`mt-[-10px] relative z-30 px-3 py-0.5 bg-black border ${isUnique ? 'border-yellow-600 text-yellow-500' : 'border-gray-700 text-gray-400'} text-[8px] font-bold uppercase tracking-widest shadow-md rounded-full`}>
                {roleName}
            </div>
        </div>
    );
}

function AddSlot({ label, color }) {
    return (
        <div className={`w-32 h-40 border-2 border-dashed ${color} flex flex-col items-center justify-center rounded-lg opacity-30 select-none`}>
            <span className="text-[9px] uppercase text-center px-2">{label}<br/>(Voir liste en bas)</span>
        </div>
    );
}