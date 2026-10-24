"use client";

import { useEffect, useMemo, useState } from 'react';
import { db } from '../../app/lib/firebase';
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { SwButton, SwCell, SwEmblem, SwIcon, SwInput, SwLabel, SwTabs } from '../ui/Swtor';
import HoloDocument from './HoloDocument';
import { DOCUMENT_STATUS, DOCUMENT_TEMPLATES, TEMPLATE_CATEGORIES, buildDocument, documentReference, getTemplate, signatoryTitle } from './documentTemplates';
import { logDiplomacy } from './diplomacyLog';

const toMillis = (ts) => (ts?.toMillis ? ts.toMillis() : (ts instanceof Date ? ts.getTime() : Date.now()));
const byNewest = (a, b) => toMillis(b.createdAt) - toMillis(a.createdAt);

/** Documents reçus et envoyés par la faction, en temps réel. */
export function useDiplomaticDocuments(faction) {
    const [received, setReceived] = useState([]);
    const [sent, setSent] = useState([]);

    useEffect(() => {
        if (!faction) return;
        const col = collection(db, 'diplomatic_documents');
        const onError = (e) => console.error('Documents diplomatiques :', e);
        const unsubIn = onSnapshot(query(col, where('toFaction', '==', faction)), (snap) => {
            setReceived(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byNewest));
        }, onError);
        const unsubOut = onSnapshot(query(col, where('fromFaction', '==', faction)), (snap) => {
            setSent(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byNewest));
        }, onError);
        return () => { unsubIn(); unsubOut(); };
    }, [faction]);

    const unread = received.filter((d) => d.status === 'sent').length;
    return { received, sent, unread };
}

export default function DocumentsPanel({ me, factions, turn, documents, initialTarget }) {
    const [box, setBox] = useState('received');
    const [selectedId, setSelectedId] = useState(null);
    const [composing, setComposing] = useState(null); // { target, replyTo, title }

    const list = box === 'received' ? documents.received : documents.sent;
    const selected = list.find((d) => d.id === selectedId) || null;

    // Ouvrir un document reçu le marque comme lu.
    useEffect(() => {
        if (!selected || box !== 'received' || selected.status !== 'sent') return;
        updateDoc(doc(db, 'diplomatic_documents', selected.id), {
            status: 'read',
            readAt: serverTimestamp(),
            readByName: me.name,
        }).catch((e) => console.error(e));
    }, [selected, box, me.name]);

    const startCompose = (opts = {}) => {
        setComposing({ target: opts.target || initialTarget || factions[0]?.id || '', replyTo: opts.replyTo || null, title: opts.title || '' });
        setSelectedId(null);
    };

    if (composing) {
        return (
            <Composer
                me={me}
                factions={factions}
                turn={turn}
                draft={composing}
                onCancel={() => setComposing(null)}
                onSent={(id) => { setComposing(null); setBox('sent'); setSelectedId(id); }}
            />
        );
    }

    return (
        <div className="flex gap-4 h-full min-h-0">
            {/* Liste */}
            <div className="w-80 shrink-0 flex flex-col min-h-0">
                <SwTabs
                    value={box}
                    onChange={(v) => { setBox(v); setSelectedId(null); }}
                    tabs={[
                        { id: 'received', label: 'Reçus', badge: documents.unread || undefined },
                        { id: 'sent', label: 'Envoyés' },
                    ]}
                    tabClassName="min-w-0 flex-1"
                />
                <div className="sw-panel-dark flex-1 min-h-0 overflow-y-auto sw-scroll p-1.5 space-y-1 mt-1">
                    {list.length === 0 && (
                        <div className="text-center text-sw-faint italic text-xs mt-6 px-4">
                            {box === 'received' ? 'Aucun document reçu.' : 'Aucun document envoyé.'}
                        </div>
                    )}
                    {list.map((d) => {
                        const t = getTemplate(d.template);
                        const st = DOCUMENT_STATUS[d.status] || DOCUMENT_STATUS.sent;
                        const unread = box === 'received' && d.status === 'sent';
                        return (
                            <button
                                key={d.id}
                                type="button"
                                onClick={() => setSelectedId(d.id)}
                                data-active={selectedId === d.id ? 'true' : undefined}
                                className="sw-row w-full p-2 flex items-center gap-3 text-left cursor-pointer"
                            >
                                <SwCell icon={t.icon} size={40} />
                                <div className="min-w-0 flex-1">
                                    <div className={`text-xs font-bold truncate ${unread ? 'text-sw-gold' : 'text-sw-text'}`}>{d.title || t.name}</div>
                                    <div className="text-[10px] text-sw-dim truncate">
                                        {box === 'received' ? `De : ${d.fromFactionName}` : `À : ${d.toFactionName}`} · Mois {d.turn ?? '—'}
                                    </div>
                                </div>
                                <span className="text-[9px] font-bold uppercase tracking-wider shrink-0" style={{ color: st.color }}>{unread ? 'Nouveau' : st.label}</span>
                            </button>
                        );
                    })}
                </div>
                <SwButton variant="accent" className="mt-3 w-full" onClick={() => startCompose()} disabled={factions.length === 0}>
                    <SwIcon name="datapad" size={18} /> Rédiger un document
                </SwButton>
            </div>

            {/* Lecture */}
            <div className="flex-1 min-w-0 overflow-y-auto sw-scroll pr-1">
                {selected ? (
                    <Reader
                        data={selected}
                        isRecipient={box === 'received'}
                        me={me}
                        turn={turn}
                        onReply={() => startCompose({ target: selected.fromFaction, replyTo: selected.id, title: `Réponse : ${selected.title || getTemplate(selected.template).name}` })}
                    />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-sw-faint">
                        <SwIcon name="holodisk1" size={56} className="opacity-60" />
                        <div className="sw-label">Sélectionnez un document</div>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- Lecture et réponse ---------------------------------------------------------------

function Reader({ data, isRecipient, me, turn, onReply }) {
    const [response, setResponse] = useState('');
    const [busy, setBusy] = useState(false);
    const template = getTemplate(data.template);
    const open = isRecipient && (data.status === 'sent' || data.status === 'read');

    const respond = async (status) => {
        const verb = status === 'rejected' ? 'Rejeter' : (status === 'signed' ? 'Signer' : 'Accuser réception de');
        if (!confirm(`${verb} « ${data.title || template.name} » ?`)) return;
        setBusy(true);
        try {
            await updateDoc(doc(db, 'diplomatic_documents', data.id), {
                status,
                response: response.trim() || null,
                respondedBy: me.id,
                respondedByName: me.name,
                respondedAt: serverTimestamp(),
            });
            await logDiplomacy({
                type: status === 'rejected' ? 'document_rejected' : (status === 'signed' ? 'document_signed' : 'document_acknowledged'),
                actor: me,
                other: { id: data.fromFaction, name: data.fromFactionName },
                turn,
                details: `${template.name} — ${data.title || template.name} (${documentReference(data, data.id)})`,
                documentId: data.id,
            });
            setResponse('');
        } catch (e) {
            console.error(e);
            alert("Impossible d'enregistrer la réponse.");
        }
        setBusy(false);
    };

    return (
        <div className="space-y-3">
            <HoloDocument data={data} docId={data.id} />

            {open && (
                <div className="sw-panel p-3 space-y-3">
                    <SwLabel>Réponse officielle (facultative)</SwLabel>
                    <SwInput as="textarea" rows={2} value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Votre gouvernement prend acte…" />
                    <div className="flex flex-wrap gap-2 justify-end">
                        <SwButton size="sm" onClick={onReply} disabled={busy}>Répondre par document</SwButton>
                        <SwButton size="sm" variant="danger" onClick={() => respond('rejected')} disabled={busy}>Rejeter</SwButton>
                        {template.nature === 'sign' ? (
                            <SwButton size="sm" variant="accent" onClick={() => respond('signed')} disabled={busy}>Signer</SwButton>
                        ) : (
                            <SwButton size="sm" variant="accent" onClick={() => respond('acknowledged')} disabled={busy}>Accuser réception</SwButton>
                        )}
                    </div>
                </div>
            )}
            {isRecipient && !open && (
                <div className="flex justify-end">
                    <SwButton size="sm" onClick={onReply}>Répondre par document</SwButton>
                </div>
            )}
        </div>
    );
}

// --- Rédaction -----------------------------------------------------------------------------

function Composer({ me, factions, turn, draft, onCancel, onSent }) {
    const [target, setTarget] = useState(draft.target);
    const [templateId, setTemplateId] = useState(DOCUMENT_TEMPLATES[0].id);
    const [title, setTitle] = useState(draft.title);
    const [fields, setFields] = useState({});
    const [busy, setBusy] = useState(false);

    const template = getTemplate(templateId);
    const targetFaction = factions.find((f) => f.id === target);

    const preview = useMemo(() => {
        const ctx = { fromFaction: me.faction, fromName: me.factionName, toName: targetFaction?.name || '…', authorName: me.name, turn };
        const built = buildDocument(template, fields, ctx);
        return {
            template: template.id,
            title: title.trim() || template.name,
            ...built,
            fromFaction: me.faction,
            fromFactionName: me.factionName,
            toFaction: target,
            toFactionName: targetFaction?.name || '…',
            authorName: me.name,
            authorTitle: signatoryTitle(me.faction, me.role),
            turn,
            status: 'sent',
        };
    }, [template, fields, title, target, targetFaction, me, turn]);

    const pickTemplate = (id) => { setTemplateId(id); setFields({}); };

    const send = async () => {
        if (!targetFaction) return alert('Choisissez un destinataire.');
        if (!confirm(`Transmettre « ${preview.title} » à ${targetFaction.name} ?`)) return;
        setBusy(true);
        try {
            const ref = await addDoc(collection(db, 'diplomatic_documents'), {
                ...preview,
                fields,
                authorId: me.id,
                authorRole: me.role,
                replyTo: draft.replyTo,
                createdAt: serverTimestamp(),
            });
            await logDiplomacy({
                type: 'document_sent',
                actor: me,
                other: { id: targetFaction.id, name: targetFaction.name },
                turn,
                details: `${template.name} — ${preview.title} (${documentReference(preview, ref.id)})`,
                documentId: ref.id,
            });
            onSent(ref.id);
        } catch (e) {
            console.error(e);
            alert("La transmission a échoué.");
            setBusy(false);
        }
    };

    return (
        <div className="flex gap-4 h-full min-h-0">
            {/* Formulaire */}
            <div className="w-[26rem] shrink-0 flex flex-col min-h-0">
                <div className="flex-1 min-h-0 overflow-y-auto sw-scroll pr-2 space-y-4">
                    <div>
                        <SwLabel className="mb-1">Destinataire</SwLabel>
                        <div className="flex items-center gap-2">
                            {targetFaction && <SwEmblem faction={targetFaction.id} size={30} />}
                            <SwInput as="select" value={target} onChange={(e) => setTarget(e.target.value)}>
                                {factions.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </SwInput>
                        </div>
                    </div>

                    <div>
                        <SwLabel className="mb-2">Modèle</SwLabel>
                        {TEMPLATE_CATEGORIES.map((cat) => (
                            <div key={cat} className="mb-2">
                                <div className="text-[10px] text-sw-faint uppercase tracking-widest mb-1">{cat}</div>
                                <div className="grid grid-cols-2 gap-1">
                                    {DOCUMENT_TEMPLATES.filter((t) => t.category === cat).map((t) => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => pickTemplate(t.id)}
                                            data-active={templateId === t.id ? 'true' : undefined}
                                            className="sw-row p-1.5 flex items-center gap-2 text-left cursor-pointer"
                                            title={t.description}
                                        >
                                            <SwIcon name={t.icon} size={24} />
                                            <span className="text-[11px] font-bold text-sw-text leading-tight">{t.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <p className="text-[11px] text-sw-dim italic">{template.description}</p>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <SwLabel className="mb-1">Intitulé</SwLabel>
                            <SwInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder={template.name} />
                        </div>
                        {template.fields.map((f) => (
                            <div key={f.key}>
                                <SwLabel className="mb-1">{f.label}</SwLabel>
                                <SwInput
                                    as={f.type === 'textarea' ? 'textarea' : 'input'}
                                    type={f.type === 'number' ? 'number' : undefined}
                                    rows={f.type === 'textarea' ? 3 : undefined}
                                    min={f.type === 'number' ? 0 : undefined}
                                    value={fields[f.key] ?? ''}
                                    placeholder={f.placeholder}
                                    onChange={(e) => setFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex gap-2 pt-3 mt-2 border-t border-sw-border">
                    <SwButton className="flex-1" onClick={onCancel} disabled={busy}>Annuler</SwButton>
                    <SwButton variant="accent" className="flex-1" onClick={send} disabled={busy || !targetFaction}>
                        {busy ? 'Transmission…' : 'Transmettre'}
                    </SwButton>
                </div>
            </div>

            {/* Aperçu */}
            <div className="flex-1 min-w-0 overflow-y-auto sw-scroll pr-1">
                <SwLabel className="mb-2">Aperçu</SwLabel>
                <HoloDocument data={preview} docId="APERCU" />
            </div>
        </div>
    );
}
