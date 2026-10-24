"use client";

import { SwFaction, SwIcon, factionKit } from '../ui/Swtor';
import { DOCUMENT_STATUS, documentReference, getTemplate, letterheadFor } from './documentTemplates';

// Rendu d'un document diplomatique : datapad holographique avec l'en-tête
// et le sceau de la faction émettrice, référence, corps, signature et tampon.

const Stamp = ({ status }) => {
    const s = DOCUMENT_STATUS[status];
    if (!s || status === 'sent' || status === 'read') return null;
    return (
        <div
            className="absolute right-6 bottom-24 rotate-[-12deg] border-[3px] rounded px-4 py-1 sw-title text-2xl tracking-[0.25em] opacity-85 pointer-events-none select-none"
            style={{ color: s.color, borderColor: s.color, textShadow: `0 0 10px ${s.color}`, boxShadow: `0 0 14px ${s.color} inset` }}
        >
            {s.label}
        </div>
    );
};

export default function HoloDocument({ data, docId, className = '' }) {
    const kit = factionKit(data.fromFaction);
    const lh = letterheadFor(data.fromFaction, data.fromFactionName);
    const template = getTemplate(data.template);

    return (
        <SwFaction faction={data.fromFaction} className={`relative overflow-hidden rounded-md border border-sw-accent/50 bg-[rgb(4_8_14/0.92)] shadow-[0_0_24px_rgb(var(--sw-accent-rgb)/0.18),inset_0_0_40px_rgb(var(--sw-accent-rgb)/0.06)] ${className}`}>
            {/* Lignes de balayage holographiques */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.07] bg-[repeating-linear-gradient(0deg,#fff_0px,#fff_1px,transparent_1px,transparent_3px)]" />
            {/* Sceau en filigrane */}
            <img src={kit.logo} alt="" draggable={false} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 opacity-[0.05] pointer-events-none select-none" />

            <div className="relative p-6 md:p-8">
                {/* En-tête */}
                <div className="flex items-start gap-4">
                    <img src={kit.logo} alt="" draggable={false} className="w-16 h-16 shrink-0 drop-shadow-[0_0_8px_rgb(var(--sw-accent-rgb)/0.6)]" />
                    <div className="min-w-0 flex-1">
                        <div className="sw-title text-xl leading-tight">{lh.institution}</div>
                        <div className="sw-label text-[10px] text-sw-accent-light">{lh.office}</div>
                    </div>
                    <div className="text-right shrink-0">
                        <div className="sw-label text-[9px]">Référence</div>
                        <div className="font-mono text-xs text-sw-text">{documentReference(data, docId)}</div>
                        <div className="sw-label text-[9px] mt-1">Mois {data.turn ?? '—'}</div>
                    </div>
                </div>
                <div className="sw-divider mt-4 mb-5" />

                {/* Destinataire et objet */}
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs mb-5">
                    <span className="sw-label text-[10px]">Émetteur</span>
                    <span className="text-sw-text font-bold">{data.fromFactionName}</span>
                    <span className="sw-label text-[10px]">Destinataire</span>
                    <span className="text-sw-text font-bold">{data.toFactionName}</span>
                    <span className="sw-label text-[10px]">Nature</span>
                    <span className="text-sw-text flex items-center gap-1.5"><SwIcon name={template.icon} size={16} />{template.name}</span>
                </div>

                <h3 className="sw-title text-lg text-center tracking-[0.18em] mb-5">{data.title || template.name}</h3>

                {/* Corps */}
                <div className="space-y-3 text-sm leading-relaxed text-sw-text/90">
                    {(data.blocks || []).map((b, i) => b.kind === 'article' ? (
                        <div key={i} className="pl-3 border-l-2 border-sw-accent/50">
                            <div className="sw-label text-[10px] text-sw-accent-light mb-0.5">{b.title}</div>
                            <p className="whitespace-pre-line">{b.text}</p>
                        </div>
                    ) : (
                        <p key={i} className="whitespace-pre-line">{b.text}</p>
                    ))}
                </div>

                <p className="mt-6 text-xs italic text-sw-dim text-center">{data.closing}</p>

                {/* Signature */}
                <div className="mt-6 flex justify-end">
                    <div className="text-right min-w-[12rem]">
                        <div className="font-[cursive] text-2xl text-sw-gold leading-none mb-1 opacity-90">{data.authorName}</div>
                        <div className="border-t border-sw-gold-dim pt-1 sw-label text-[10px]">{data.authorTitle}</div>
                    </div>
                </div>

                {/* Réponse du destinataire */}
                {data.response && (
                    <div className="mt-6 sw-panel-dark p-3 text-xs">
                        <div className="sw-label text-[10px] mb-1">Réponse de {data.toFactionName}{data.respondedByName ? ` — ${data.respondedByName}` : ''}</div>
                        <p className="text-sw-text whitespace-pre-line">{data.response}</p>
                    </div>
                )}
            </div>

            <Stamp status={data.status} />
        </SwFaction>
    );
}
