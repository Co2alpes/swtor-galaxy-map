"use client";

import { useState, useEffect } from 'react';
import { db } from '../app/lib/firebase';
import { collection, query, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { SwButton, SwCell, SwEmblem, SwInput, SwSpinner, SwWindow } from './ui/Swtor';

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

  if (loading) return <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"><SwSpinner label="Chargement des données impériales..." /></div>;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <SwWindow
        icon="claninsignia"
        title="Administration des Citoyens"
        subtitle={`${users.length} Dossiers`}
        onClose={onClose}
        className="w-full max-w-5xl h-[80vh]"
        bodyClassName="flex flex-col p-0! overflow-hidden"
      >

        {/* TOOLBAR */}
        <div className="px-4 py-3 flex flex-wrap gap-3 items-center border-b border-sw-border">
            <SwInput
                type="text"
                placeholder="Rechercher (Pseudo, Email)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-sm w-64"
            />
            <SwInput
                as="select"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="text-sm w-auto cursor-pointer"
            >
                <option value="all">Tous les rôles</option>
                <option value="admin">Administrateurs</option>
                <option value="user">Utilisateurs</option>
                <option value="conseil">Conseil</option>
                <option value="general">Généraux</option>
            </SwInput>
        </div>

        {/* LIST */}
        <div className="flex-1 overflow-y-auto sw-scroll px-4 pb-4">
            <table className="w-full text-left text-sm text-sw-dim border-separate border-spacing-y-1">
                <thead className="sticky top-0 z-10 bg-sw-panel-dark/95 backdrop-blur-md">
                    <tr>
                        <th className="sw-label p-3 font-bold">Identité</th>
                        <th className="sw-label p-3 font-bold">Email (Secure)</th>
                        <th className="sw-label p-3 font-bold">Faction</th>
                        <th className="sw-label p-3 font-bold">Rang</th>
                        <th className="sw-label p-3 font-bold text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredUsers.map(user => (
                        <tr key={user.id} className="sw-row group">
                            <td className="p-3 rounded-l-[4px]">
                                <div className="flex items-center gap-3">
                                    <SwCell size={36}>
                                        {user.avatar ? <div className="w-full h-full bg-cover bg-center rounded-[3px]" style={{ backgroundImage: `url(${user.avatar})` }} /> : <div className="flex items-center justify-center h-full text-xs">👤</div>}
                                    </SwCell>
                                    <div>
                                        <div className="font-bold text-sw-text group-hover:text-sw-gold transition-colors">{user.pseudo}</div>
                                        <div className="text-[10px] font-mono text-sw-faint">{user.id}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="p-3 font-mono text-xs">{user.email}</td>
                            <td className="p-3">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] uppercase font-bold border ${getFactionBadgeStyle(user.faction_id)}`}>
                                    <SwEmblem faction={user.faction_id} size={14} glow={false} />
                                    {user.faction_id === 'neutral' ? 'Civil' : user.faction_id}
                                </span>
                            </td>
                            <td className="p-3">
                                <SwInput
                                    as="select"
                                    value={user.role}
                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                    className="text-xs py-1 px-2 w-auto cursor-pointer"
                                >
                                    <option value="user">Citoyen</option>
                                    <option value="admin">Administrateur</option>
                                    <option value="gamemaster">Maître du Jeu</option>
                                    <option value="conseil">Conseiller</option>
                                    <option value="general">Général</option>
                                    <option value="diplomat">Diplomate</option>
                                </SwInput>
                            </td>
                            <td className="p-3 text-right rounded-r-[4px]">
                                <SwButton
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleDeleteUser(user.id, user.pseudo)}
                                >
                                    Supprimer
                                </SwButton>
                            </td>
                        </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                        <tr>
                            <td colSpan="5" className="p-8 text-center text-sw-faint italic">Aucun dossier trouvé dans les archives.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </SwWindow>
    </div>
  );
}

function getFactionBadgeStyle(factionId) {
    switch (factionId) {
        case 'republic': return 'bg-blue-900/20 border-blue-800 text-blue-400';
        case 'empire': return 'bg-red-900/20 border-red-800 text-red-400';
        case 'neutral': return 'bg-sw-panel-light border-sw-border text-sw-dim';
        default: return 'bg-sw-panel-light border-sw-border text-sw-dim';
    }
}
