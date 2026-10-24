"use client";

import { useState, useEffect } from 'react';
import { db } from '../app/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { SwButton, SwInput, SwLabel, SwPanel, SwSpinner, SwWindow } from './ui/Swtor';

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

    if (loading) return <div className="p-4"><SwSpinner size={64} label="Chargement..." /></div>;

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-8 backdrop-blur-md">
            <SwWindow
                icon="datapad"
                title="Éditeur Holonet"
                onClose={onClose}
                className="w-full max-w-4xl h-[80vh]"
                bodyClassName="flex flex-col p-0! overflow-hidden"
            >

                {/* Body scrollable */}
                <div className="flex-1 overflow-y-auto sw-scroll p-6 space-y-6 text-xs">

                    {/* TICKER */}
                    <SwPanel className="space-y-3 p-4">
                        <h3 className="sw-title text-sm pb-2 border-b border-sw-border">Bandeau Déroulant (Ticker)</h3>
                        {data.ticker.map((item, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <SwInput
                                    className="flex-1"
                                    value={item}
                                    onChange={(e) => handleTickerChange(i, e.target.value)}
                                />
                                <button onClick={() => removeTicker(i)} title="Supprimer" className="shrink-0 w-8 h-8 flex items-center justify-center rounded text-sw-error/80 hover:text-sw-error hover:bg-sw-error/10 cursor-pointer transition-colors">🗑️</button>
                            </div>
                        ))}
                        <SwButton size="sm" onClick={addTicker} className="text-sw-success">+ Ajouter une info</SwButton>
                    </SwPanel>

                    {/* MAIN PANEL */}
                    <SwPanel className="space-y-4 p-4">
                        <h3 className="sw-title text-sm pb-2 border-b border-sw-border">Panneau Principal</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <SwLabel as="label" className="block mb-1">Titre Principal</SwLabel>
                                <SwInput
                                    className="font-bold text-lg"
                                    value={data.main.title}
                                    onChange={(e) => handleMainChange('title', e.target.value)}
                                />
                            </div>
                            <div>
                                <SwLabel as="label" className="block mb-1">Sous-titre (ex: Résumé)</SwLabel>
                                <SwInput
                                    value={data.main.subtitle}
                                    onChange={(e) => handleMainChange('subtitle', e.target.value)}
                                />
                            </div>
                            <div className="col-span-2">
                                <SwLabel as="label" className="block mb-1">Lien du Patchnote (URL)</SwLabel>
                                <SwInput
                                    className="text-sw-info font-mono"
                                    value={data.main.patchNoteUrl || ''}
                                    placeholder="https://"
                                    onChange={(e) => handleMainChange('patchNoteUrl', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <SwLabel as="label" className="block mb-1">Contenu (Paragraphes)</SwLabel>
                            {data.main.content.map((p, i) => (
                                <div key={i} className="flex gap-2">
                                    <SwInput
                                        as="textarea"
                                        className="flex-1 h-24"
                                        value={p}
                                        onChange={(e) => handleContentChange(i, e.target.value)}
                                    />
                                    <button onClick={() => removeContent(i)} title="Supprimer" className="shrink-0 w-8 h-8 flex items-center justify-center rounded text-sw-error/80 hover:text-sw-error hover:bg-sw-error/10 cursor-pointer transition-colors h-fit">🗑️</button>
                                </div>
                            ))}
                            <SwButton size="sm" onClick={addContent} className="text-sw-success">+ Ajouter un paragraphe</SwButton>
                        </div>
                    </SwPanel>

                    {/* SYSTEM INFO */}
                    <SwPanel className="space-y-4 p-4">
                        <h3 className="sw-title text-sm pb-2 border-b border-sw-border">Infos Système</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <SwLabel as="label" className="block mb-1">Statut Serveur</SwLabel>
                                <SwInput
                                    as="select"
                                    className="cursor-pointer"
                                    value={data.systemInfo?.serverStatus || "EN LIGNE"}
                                    onChange={(e) => handleSystemChange('serverStatus', e.target.value)}
                                >
                                    <option value="EN LIGNE">EN LIGNE</option>
                                    <option value="MAINTENANCE">MAINTENANCE</option>
                                    <option value="OFFLINE">HORS LIGNE</option>
                                    <option value="SURCHARGÉ">SURCHARGÉ</option>
                                </SwInput>
                            </div>
                            <div>
                                <SwLabel as="label" className="block mb-1">Joueurs Connectés</SwLabel>
                                <SwInput
                                    value={data.systemInfo?.onlinePlayers || ""}
                                    placeholder="ex: 12,458"
                                    onChange={(e) => handleSystemChange('onlinePlayers', e.target.value)}
                                />
                            </div>
                        </div>
                    </SwPanel>

                    {/* TODO: Add Updates List Editor if needed */}

                </div>

                {/* Footer Actions */}
                <div className="shrink-0 p-4 border-t border-sw-border bg-sw-panel-dark/70 rounded-b-[10px] flex justify-end gap-4 items-center">
                    {message && <span className="sw-label text-sw-warn animate-pulse">{message}</span>}
                    <SwButton variant="accent" onClick={handleSave} className="px-6">
                        Sauvegarder
                    </SwButton>
                </div>

            </SwWindow>
        </div>
    );
}
