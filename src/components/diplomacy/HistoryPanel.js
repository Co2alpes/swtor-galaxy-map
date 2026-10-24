"use client";

import { useEffect, useMemo, useState } from 'react';
import { db } from '../../app/lib/firebase';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { SwCell, SwEmblem, SwIcon, SwInput, SwLabel } from '../ui/Swtor';
import { LOG_TYPES } from './diplomacyLog';

// Historique des actes diplomatiques de la faction, du plus récent au plus ancien,
// regroupés par mois et filtrables par faction et par nature.

const FILTERS = {
    all: { label: 'Tous les actes', types: null },
    agreements: { label: 'Accords', types: ['request_sent', 'request_accepted', 'request_refused', 'peace', 'gift'] },
    conflicts: { label: 'Conflits', types: ['war', 'treaty_broken'] },
    documents: { label: 'Documents', types: ['document_sent', 'document_signed', 'document_acknowledged', 'document_rejected'] },
};

const TONE = {
    war: 'var(--sw-error)',
    treaty_broken: 'var(--sw-error)',
    request_refused: 'var(--sw-error)',
    document_rejected: 'var(--sw-error)',
    peace: 'var(--sw-success)',
    request_accepted: 'var(--sw-success)',
    document_signed: 'var(--sw-success)',
    document_acknowledged: 'var(--sw-success)',
    gift: 'var(--sw-gold)',
};

const formatDate = (ts) => {
    if (!ts?.toDate) return 'à l\'instant';
    return ts.toDate().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export default function HistoryPanel({ me, factions }) {
    const [entries, setEntries] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [factionFilter, setFactionFilter] = useState('all');
    const [kind, setKind] = useState('all');

    useEffect(() => {
        if (!me.faction) return;
        const q = query(collection(db, `factions/${me.faction}/diplomacy_log`), orderBy('createdAt', 'desc'), limit(300));
        return onSnapshot(q, (snap) => {
            setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            setLoaded(true);
        }, (e) => { console.error('Historique diplomatique :', e); setLoaded(true); });
    }, [me.faction]);

    const groups = useMemo(() => {
        const types = FILTERS[kind].types;
        const filtered = entries.filter((e) =>
            (factionFilter === 'all' || e.otherFaction === factionFilter) &&
            (!types || types.includes(e.type))
        );
        const byTurn = [];
        for (const e of filtered) {
            const key = e.turn ?? '—';
            const last = byTurn[byTurn.length - 1];
            if (last && last.turn === key) last.items.push(e);
            else byTurn.push({ turn: key, items: [e] });
        }
        return byTurn;
    }, [entries, factionFilter, kind]);

    return (
        <div className="flex flex-col h-full min-h-0">
            <div className="flex flex-wrap items-end gap-3 mb-3">
                <div className="w-56">
                    <SwLabel className="mb-1">Faction</SwLabel>
                    <SwInput as="select" value={factionFilter} onChange={(e) => setFactionFilter(e.target.value)}>
                        <option value="all">Toutes les factions</option>
                        {factions.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </SwInput>
                </div>
                <div className="flex gap-1">
                    {Object.entries(FILTERS).map(([id, f]) => (
                        <button key={id} type="button" onClick={() => setKind(id)} data-active={kind === id ? 'true' : undefined} className="sw-row px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-sw-text cursor-pointer">
                            {f.label}
                        </button>
                    ))}
                </div>
                <div className="ml-auto sw-label text-[10px]">{entries.length} acte{entries.length > 1 ? 's' : ''} archivé{entries.length > 1 ? 's' : ''}</div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto sw-scroll pr-2">
                {loaded && groups.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-sw-faint">
                        <SwIcon name="lore" size={56} className="opacity-60" />
                        <div className="sw-label">Aucun acte diplomatique archivé</div>
                    </div>
                )}

                {groups.map((g) => (
                    <div key={`${g.turn}-${g.items[0].id}`} className="mb-4">
                        <div className="flex items-center gap-3 mb-2 sticky top-0 bg-sw-bg/90 backdrop-blur-sm py-1 z-10">
                            <span className="sw-title text-sm">Mois {g.turn}</span>
                            <div className="flex-1 sw-divider" />
                        </div>
                        <div className="space-y-1.5 pl-2 border-l border-sw-border ml-2">
                            {g.items.map((e) => {
                                const t = LOG_TYPES[e.type] || { label: e.type, icon: 'questionmark' };
                                const tone = TONE[e.type] || 'var(--sw-line-light)';
                                const outgoing = e.actorFaction === me.faction;
                                return (
                                    <div key={e.id} className="sw-row p-2 pl-3 flex items-center gap-3 ml-2" style={{ boxShadow: `inset 3px 0 0 ${tone}` }}>
                                        <SwCell icon={t.icon} size={40} />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: tone }}>{t.label}</span>
                                                <span className="text-[10px] text-sw-faint">{outgoing ? '→' : '←'}</span>
                                                <SwEmblem faction={e.otherFaction} size={16} glow={false} />
                                                <span className="text-xs text-sw-text font-bold truncate">{e.otherFactionName}</span>
                                            </div>
                                            {e.details && <div className="text-[11px] text-sw-dim truncate">{e.details}</div>}
                                            <div className="text-[10px] text-sw-faint">
                                                Par <span className="text-sw-text">{e.actorName}</span> ({e.actorFactionName})
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-sw-faint shrink-0 text-right">{formatDate(e.createdAt)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
