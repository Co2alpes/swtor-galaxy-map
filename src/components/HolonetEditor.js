"use client";

import { useState, useEffect } from 'react';
import { db } from '../app/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function HolonetEditor({ onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetch = async () => {
            try {
                const snap = await getDoc(doc(db, "system", "holonet"));
                if (snap.exists()) {
                    setData(snap.data());
                } else {
                    // Default structure if not exists
                    setData({
                        ticker: [],
                        updates: [],
                        main: { title: '', subtitle: '', content: [] },
                        systemInfo: { serverStatus: "EN LIGNE" }
                    });
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    const handleTickerChange = (idx, val) => {
        const newTicker = [...data.ticker];
        newTicker[idx] = val;
        setData({ ...data, ticker: newTicker });
    };

    const addTicker = () => setData({ ...data, ticker: [...data.ticker, "Nouvelle info"] });
    const removeTicker = (idx) => setData({ ...data, ticker: data.ticker.filter((_, i) => i !== idx) });

    const handleMainChange = (field, val) => {
        setData({ ...data, main: { ...data.main, [field]: val } });
    };

    const handleSystemChange = (field, val) => {
        setData({ ...data, systemInfo: { ...data.systemInfo, [field]: val } });
    };

    const handleContentChange = (idx, val) => {
        const newContent = [...data.main.content];
        newContent[idx] = val;
        setData({ ...data, main: { ...data.main, content: newContent } });
    };

    const addContent = () => setData({ ...data, main: { ...data.main, content: [...data.main.content, "Paragraphe"] } });
    const removeContent = (idx) => {
        const newContent = data.main.content.filter((_, i) => i !== idx);
        setData({ ...data, main: { ...data.main, content: newContent } });
    };

    const handleSave = async () => {
        setMessage("Sauvegarde...");
        try {
            await setDoc(doc(db, "system", "holonet"), data);
            setMessage("Sauvegardé avec succès !");
            setTimeout(() => { if(onClose) onClose(); }, 1000);
        } catch(e) {
            console.error(e);
            setMessage("Erreur lors de la sauvegarde.");
        }
    };

    if (loading) return <div className="p-4 text-white">Chargement...</div>;

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8 backdrop-blur-md">
            <div className="bg-gray-900 border border-cyan-500 w-full max-w-4xl h-[80vh] flex flex-col rounded shadow-[0_0_50px_rgba(0,100,255,0.2)]">
                
                {/* Header */}
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800">
                    <h2 className="text-xl font-bold text-cyan-400 uppercase tracking-widest">Éditeur Holonet</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
                </div>

                {/* Body scrollable */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 font-mono text-xs">
                    
                    {/* TICKER */}
                    <div className="space-y-4 border p-4 border-gray-700 rounded">
                        <h3 className="text-yellow-500 font-bold uppercase border-b border-gray-700 pb-2">Bandeau Déroulant (Ticker)</h3>
                        {data.ticker.map((item, i) => (
                            <div key={i} className="flex gap-2">
                                <input 
                                    className="flex-1 bg-black border border-gray-600 p-2 text-white" 
                                    value={item} 
                                    onChange={(e) => handleTickerChange(i, e.target.value)} 
                                />
                                <button onClick={() => removeTicker(i)} className="text-red-500 hover:text-red-400">🗑️</button>
                            </div>
                        ))}
                        <button onClick={addTicker} className="text-green-500 hover:text-green-400 border border-green-900 px-3 py-1 bg-green-900/20 rounded">+ Ajouter une info</button>
                    </div>

                    {/* MAIN PANEL */}
                    <div className="space-y-4 border p-4 border-gray-700 rounded">
                        <h3 className="text-cyan-400 font-bold uppercase border-b border-gray-700 pb-2">Panneau Principal</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-500 mb-1">Titre Principal</label>
                                <input 
                                    className="w-full bg-black border border-gray-600 p-2 text-white font-bold text-lg" 
                                    value={data.main.title} 
                                    onChange={(e) => handleMainChange('title', e.target.value)} 
                                />
                            </div>
                            <div>
                                <label className="block text-gray-500 mb-1">Sous-titre (ex: Résumé)</label>
                                <input 
                                    className="w-full bg-black border border-gray-600 p-2 text-white" 
                                    value={data.main.subtitle} 
                                    onChange={(e) => handleMainChange('subtitle', e.target.value)} 
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-gray-500 mb-1">Lien du Patchnote (URL)</label>
                                <input 
                                    className="w-full bg-black border border-gray-600 p-2 text-blue-400" 
                                    value={data.main.patchNoteUrl || ''} 
                                    placeholder="https://"
                                    onChange={(e) => handleMainChange('patchNoteUrl', e.target.value)} 
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-gray-500 mb-1">Contenu (Paragraphes)</label>
                            {data.main.content.map((p, i) => (
                                <div key={i} className="flex gap-2">
                                    <textarea 
                                        className="flex-1 bg-black border border-gray-600 p-2 text-white h-24" 
                                        value={p} 
                                        onChange={(e) => handleContentChange(i, e.target.value)} 
                                    />
                                    <button onClick={() => removeContent(i)} className="text-red-500 hover:text-red-400 h-fit">🗑️</button>
                                </div>
                            ))}
                            <button onClick={addContent} className="text-green-500 hover:text-green-400 border border-green-900 px-3 py-1 bg-green-900/20 rounded">+ Ajouter un paragraphe</button>
                        </div>
                    </div>

                    {/* SYSTEM INFO */}
                    <div className="space-y-4 border p-4 border-gray-700 rounded">
                        <h3 className="text-cyan-400 font-bold uppercase border-b border-gray-700 pb-2">Infos Système</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-500 mb-1">Statut Serveur</label>
                                <select 
                                    className="w-full bg-black border border-gray-600 p-2 text-white" 
                                    value={data.systemInfo?.serverStatus || "EN LIGNE"} 
                                    onChange={(e) => handleSystemChange('serverStatus', e.target.value)}
                                >
                                    <option value="EN LIGNE">EN LIGNE</option>
                                    <option value="MAINTENANCE">MAINTENANCE</option>
                                    <option value="OFFLINE">HORS LIGNE</option>
                                    <option value="SURCHARGÉ">SURCHARGÉ</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-gray-500 mb-1">Joueurs Connectés</label>
                                <input 
                                    className="w-full bg-black border border-gray-600 p-2 text-white" 
                                    value={data.systemInfo?.onlinePlayers || ""} 
                                    placeholder="ex: 12,458"
                                    onChange={(e) => handleSystemChange('onlinePlayers', e.target.value)} 
                                />
                            </div>
                        </div>
                    </div>

                    {/* TODO: Add Updates List Editor if needed */}

                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-gray-700 bg-gray-800 flex justify-end gap-4 items-center">
                    {message && <span className="text-yellow-400 animate-pulse">{message}</span>}
                    <button onClick={handleSave} className="bg-cyan-700 hover:bg-cyan-600 text-white px-6 py-2 uppercase font-bold tracking-widest rounded shadow-lg">
                        Sauvegarder
                    </button>
                </div>

            </div>
        </div>
    );
}
