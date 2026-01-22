"use client";

import { useState, useEffect } from 'react';
import { db } from '../app/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function ProfileScreen({ userID, onClose }) {
    const [profile, setProfile] = useState(null);
    const [factionInfo, setFactionInfo] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({ pseudo: '', avatar: '', custom_rank: '', bio: '' });

    useEffect(() => {
        const fetchProfile = async () => {
            if (!userID) return;
            try {
                const userRef = doc(db, "users", userID);
                const userSnap = await getDoc(userRef);
                
                if (userSnap.exists()) {
                    const data = userSnap.data();
                    setProfile(data);
                    setFormData({ 
                        pseudo: data.pseudo || '', 
                        avatar: data.avatar || '', 
                        custom_rank: data.custom_rank || '', 
                        bio: data.bio || '' 
                    });

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
                bio: formData.bio 
            });
            setProfile({ ...profile, ...formData });
            setIsEditing(false);
        } catch (e) { console.error(e); alert("Erreur lors de la sauvegarde."); }
        setSaving(false);
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300 font-sans">
            <div className="w-[800px] h-[500px] bg-[#0f1115] border-2 border-[#cba660] flex shadow-[0_0_50px_rgba(203,166,96,0.2)] relative overflow-hidden">
                {/* DÉCORATION DE FOND */}
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <div className="text-9xl text-[#cba660] font-black">ID</div>
                </div>

                {/* COLONNE GAUCHE : IDENTITÉ */}
                <div className="w-1/3 bg-[#15171c] border-r border-[#cba660]/30 flex flex-col items-center p-6 relative">
                    <div className="relative group mb-4">
                        <div className="w-40 h-40 rounded-full border-4 border-[#cba660] bg-black overflow-hidden shadow-lg relative">
                            {formData.avatar ? (
                                <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl text-gray-700">👤</div>
                            )}
                        </div>
                        {factionInfo && (
                            <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full border-2 border-[#0f1115] bg-black flex items-center justify-center shadow-lg" title={factionInfo.name}>
                                {factionInfo.image ? <img src={factionInfo.image} className="w-full h-full object-cover rounded-full"/> : <span className="text-xs" style={{color: factionInfo.color}}>★</span>}
                            </div>
                        )}
                    </div>
                    
                    <div className="text-center w-full">
                        <h2 className="text-2xl font-serif font-bold text-white uppercase tracking-wider truncate">{profile.pseudo}</h2>
                        <div className="text-[#cba660] text-xs uppercase font-bold mt-1 tracking-widest">{formData.custom_rank || formatRole(profile.role)}</div>
                        
                        <div className="mt-6 w-full space-y-2 text-left bg-black/40 p-3 rounded border border-gray-800">
                            <div className="flex justify-between text-[10px] text-gray-400 uppercase"><span>Matricule</span><span className="font-mono text-gray-200">{userID.substring(0, 8)}</span></div>
                            <div className="flex justify-between text-[10px] text-gray-400 uppercase"><span>Allégeance</span><span className="font-bold" style={{color: factionInfo?.color || '#fff'}}>{factionInfo?.name || 'Neutre'}</span></div>
                            <div className="flex justify-between text-[10px] text-gray-400 uppercase"><span>Accréditation</span><span className="text-blue-400">{profile.role === 'admin' ? 'Niveau OMEGA' : 'Standard'}</span></div>
                        </div>
                    </div>
                </div>

                {/* COLONNE DROITE : DÉTAILS ET MODIFICATION */}
                <div className="w-2/3 p-8 flex flex-col">
                    <div className="flex justify-between items-center mb-6 border-b border-[#cba660]/30 pb-2">
                        <h3 className="text-[#cba660] font-serif uppercase tracking-[0.2em] text-lg">Dossier Personnel</h3>
                        <div className="flex gap-2">
                            {!isEditing ? (
                                <button onClick={() => setIsEditing(true)} className="text-xs uppercase font-bold text-gray-400 hover:text-white border border-gray-600 px-3 py-1 hover:bg-gray-800 transition">Modifier</button>
                            ) : (
                                <>
                                    <button onClick={() => setIsEditing(false)} className="text-xs uppercase text-red-400 hover:text-red-300 px-2">Annuler</button>
                                    <button onClick={handleSave} disabled={saving} className="text-xs uppercase font-bold text-black bg-[#cba660] px-4 py-1 hover:bg-[#e5c07b] transition shadow-lg">
                                        {saving ? '...' : 'Sauvegarder'}
                                    </button>
                                </>
                            )}
                            <button onClick={onClose} className="text-gray-500 hover:text-white ml-4 text-xl">✕</button>
                        </div>
                    </div>

                    <div className="flex-grow overflow-y-auto custom-scrollbar space-y-4">
                        {isEditing ? (
                            <div className="space-y-4 animate-in slide-in-from-right-5 duration-300">
                                <div>
                                    <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Nom de code (Pseudo)</label>
                                    <input value={formData.pseudo} onChange={e => setFormData({...formData, pseudo: e.target.value})} className="w-full bg-black border border-gray-700 p-2 text-white text-sm focus:border-[#cba660] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Titre / Rang RP (Ex: Grand Amiral)</label>
                                    <input value={formData.custom_rank} onChange={e => setFormData({...formData, custom_rank: e.target.value})} className="w-full bg-black border border-gray-700 p-2 text-white text-sm focus:border-[#cba660] outline-none" placeholder="Laisser vide pour utiliser le rang système" />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Holo-Portrait (URL Image)</label>
                                    <input value={formData.avatar} onChange={e => setFormData({...formData, avatar: e.target.value})} className="w-full bg-black border border-gray-700 p-2 text-white text-sm focus:border-[#cba660] outline-none font-mono" />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Biographie / Notes de service</label>
                                    <textarea value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} className="w-full h-32 bg-black border border-gray-700 p-2 text-white text-sm focus:border-[#cba660] outline-none resize-none" />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-2">Biographie</h4>
                                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap bg-[#1a1d23] p-4 border-l-2 border-[#cba660]">
                                        {profile.bio || "Aucune donnée biographique disponible dans les archives."}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-[#1a1d23] p-3 border border-gray-700">
                                        <div className="text-[10px] uppercase text-gray-500">Statut Système</div>
                                        <div className="text-green-400 font-mono text-sm">ACTIF</div>
                                    </div>
                                    <div className="bg-[#1a1d23] p-3 border border-gray-700">
                                        <div className="text-[10px] uppercase text-gray-500">Dernière Connexion</div>
                                        <div className="text-white font-mono text-sm">Aujourd'hui</div>
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