import { db } from '../../app/lib/firebase';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';

// Historique diplomatique : une entrée par acte, écrite dans le journal des
// deux factions concernées (factions/{id}/diplomacy_log), comme les relations.

export const LOG_TYPES = {
    request_sent:     { label: 'Proposition envoyée',    icon: 'holodisk1' },
    request_accepted: { label: 'Proposition acceptée',   icon: 'cnq_check_green' },
    request_refused:  { label: 'Proposition refusée',    icon: 'cbt_st_marked' },
    peace:            { label: 'Paix signée',            icon: 'sage_open_palm_6_0' },
    war:              { label: 'Déclaration de guerre',  icon: 'clashing_lightsabers_6_0' },
    gift:             { label: "Cadeau d'État",          icon: 'mtx_toy_supply_pack' },
    treaty_broken:    { label: 'Accord rompu',           icon: 'shockwave' },
    document_sent:    { label: 'Document transmis',      icon: 'datapad' },
    document_signed:  { label: 'Document signé',         icon: 'jedistonetablet' },
    document_acknowledged: { label: 'Réception accusée', icon: 'cnq_check_green' },
    document_rejected: { label: 'Document rejeté',       icon: 'cbt_st_marked' },
};

export const REQUEST_LABELS = {
    trade: 'Accord commercial',
    alliance: 'Alliance militaire',
    peace: 'Traité de paix',
};

/**
 * Enregistre un acte diplomatique chez les deux parties.
 * actor : { id, name, faction, factionName } ; other : { id, name }.
 */
export async function logDiplomacy({ type, actor, other, turn, details = '', documentId = null }) {
    if (!actor?.faction || !other?.id) return;
    const base = {
        type,
        actorId: actor.id || null,
        actorName: actor.name || 'Inconnu',
        actorFaction: actor.faction,
        actorFactionName: actor.factionName || actor.faction,
        targetFaction: other.id,
        targetFactionName: other.name || other.id,
        details,
        documentId,
        turn: turn ?? null,
        createdAt: serverTimestamp(),
    };
    try {
        const batch = writeBatch(db);
        batch.set(doc(collection(db, `factions/${actor.faction}/diplomacy_log`)), { ...base, otherFaction: other.id, otherFactionName: base.targetFactionName });
        batch.set(doc(collection(db, `factions/${other.id}/diplomacy_log`)), { ...base, otherFaction: actor.faction, otherFactionName: base.actorFactionName });
        await batch.commit();
    } catch (e) {
        console.error('Journal diplomatique :', e);
    }
}
