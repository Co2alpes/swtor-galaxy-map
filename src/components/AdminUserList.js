"use client";

import { useState, useEffect } from 'react';
import { db } from '../app/lib/firebase';
import { collection, query, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';

export default function AdminUserList({ onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const q = query(collection(db, "users"));
      const snapshot = await getDocs(q);
      const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(userList);
    } catch (error) {
      console.error("Erreur fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, userPseudo) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le profil de ${userPseudo} ?\n\nATTENTION : Cela ne supprime que les données du jeu (Firestore). Le compte de connexion (Email/Mot de passe) doit être supprimé depuis la console Firebase Authentication s'il doit être réutilisé.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "users", userId));
      setUsers(users.filter(u => u.id !== userId));
      alert(`Profil de ${userPseudo} supprimé.`);
    } catch (error) {
      console.error("Erreur suppression:", error);
      alert("Erreur lors de la suppression.");
    }
  };

  const handleRoleChange = async (userId, newRole) => {
      try {
          await updateDoc(doc(db, "users", userId), { role: newRole });
          setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      } catch (error) {
          console.error("Erreur modif role:", error);
      }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.pseudo?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  if (loading) return <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 text-yellow-500">Chargement des données impériales...</div>;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 font-sans">
      <div className="bg-[#111] border border-gray-700 w-full max-w-5xl h-[80vh] flex flex-col rounded shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="bg-gray-900 p-4 border-b border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-bold text-yellow-500 uppercase tracking-widest flex items-center gap-2">
                👥 Administration des Citoyens
                <span className="text-xs bg-yellow-900/30 text-yellow-500 px-2 py-0.5 rounded border border-yellow-700/50">{users.length} Dossiers</span>
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white px-3 py-1 hover:bg-red-900/30 rounded transition">Fermer [X]</button>
        </div>

        {/* TOOLBAR */}
        <div className="p-4 bg-gray-950 flex gap-4 border-b border-gray-800">
            <input 
                type="text" 
                placeholder="Rechercher (Pseudo, Email)..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-black border border-gray-700 text-white px-3 py-2 rounded text-sm w-64 focus:border-yellow-500 outline-none"
            />
            <select 
                value={filterRole} 
                onChange={(e) => setFilterRole(e.target.value)}
                className="bg-black border border-gray-700 text-white px-3 py-2 rounded text-sm outline-none cursor-pointer hover:border-gray-500"
            >
                <option value="all">Tous les rôles</option>
                <option value="admin">Administrateurs</option>
                <option value="user">Utilisateurs</option>
                <option value="conseil">Conseil</option>
                <option value="general">Généraux</option>
            </select>
        </div>

        {/* LIST */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
            <table className="w-full text-left text-sm text-gray-400">
                <thead className="bg-gray-900/50 text-xs uppercase font-mono text-gray-500 sticky top-0 backdrop-blur-md">
                    <tr>
                        <th className="p-4 font-normal">Identité</th>
                        <th className="p-4 font-normal">Email (Secure)</th>
                        <th className="p-4 font-normal">Faction</th>
                        <th className="p-4 font-normal">Rang</th>
                        <th className="p-4 font-normal text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                    {filteredUsers.map(user => (
                        <tr key={user.id} className="hover:bg-white/5 transition group">
                            <td className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-gray-800 overflow-hidden border border-gray-700">
                                        {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-xs">👤</div>}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-200 group-hover:text-yellow-500 transition-colors">{user.pseudo}</div>
                                        <div className="text-[10px] font-mono opacity-50">{user.id}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="p-4 font-mono text-xs">{user.email}</td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold border ${getFactionBadgeStyle(user.faction_id)}`}>
                                    {user.faction_id === 'neutral' ? 'Civil' : user.faction_id}
                                </span>
                            </td>
                            <td className="p-4">
                                <select 
                                    value={user.role} 
                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                    className="bg-black/50 border border-gray-700 text-xs rounded px-2 py-1 outline-none focus:border-yellow-600 cursor-pointer"
                                >
                                    <option value="user">Citoyen</option>
                                    <option value="admin">Administrateur</option>
                                    <option value="gamemaster">Maître du Jeu</option>
                                    <option value="conseil">Conseiller</option>
                                    <option value="general">Général</option>
                                    <option value="diplomat">Diplomate</option>
                                </select>
                            </td>
                            <td className="p-4 text-right">
                                <button 
                                    onClick={() => handleDeleteUser(user.id, user.pseudo)}
                                    className="bg-red-900/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-900 hover:border-red-500 px-3 py-1.5 rounded text-xs uppercase font-bold transition-all shadow-lg"
                                >
                                    Supprimer
                                </button>
                            </td>
                        </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                        <tr>
                            <td colSpan="5" className="p-8 text-center text-gray-600 italic">Aucun dossier trouvé dans les archives.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}

function getFactionBadgeStyle(factionId) {
    switch (factionId) {
        case 'republic': return 'bg-blue-900/20 border-blue-800 text-blue-400';
        case 'empire': return 'bg-red-900/20 border-red-800 text-red-400';
        case 'neutral': return 'bg-gray-800 border-gray-700 text-gray-400';
        default: return 'bg-gray-800 border-gray-700 text-gray-400';
    }
}
