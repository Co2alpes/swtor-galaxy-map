// Modèles de documents diplomatiques (style SWTOR) et en-têtes par faction.
// Un modèle décrit ses champs et construit le corps du document à partir
// des valeurs saisies ; l'en-tête, la référence et la signature dépendent
// de la faction émettrice.

// --- En-têtes officiels -----------------------------------------------------

const LETTERHEADS = {
    republic: {
        institution: 'Sénat Galactique',
        office: 'Commission des Affaires Étrangères · Bureau du Chancelier Suprême',
        prefix: 'SG',
        opening: 'Au nom du Sénat Galactique et des peuples libres de la République,',
        closing: 'Pour la paix, la justice et la liberté. Que la Force soit avec vous.',
        titles: { emperor: 'Chancelier Suprême', conseil: 'Sénateur du Conseil', general: 'Général de la République', diplomat: 'Ambassadeur de la République', admin: 'Haut Commandement' },
    },
    empire: {
        institution: 'Empire Sith',
        office: "Sphère de l'Expansion et de la Diplomatie · Conseil Noir",
        prefix: 'SED',
        opening: "Par la volonté de Sa Majesté l'Empereur et sous l'autorité du Conseil Noir,",
        closing: "La paix est un mensonge, il n'y a que la passion. Gloire à l'Empire.",
        titles: { emperor: 'Empereur', conseil: 'Seigneur du Conseil Noir', general: 'Moff de la Flotte Impériale', diplomat: 'Émissaire impérial', admin: 'Haut Commandement' },
    },
    mandalorians: {
        institution: 'Clans Mandaloriens',
        office: 'Conclave des Clans · Parole de Mandalore',
        prefix: 'MND',
        opening: 'Au nom de Mandalore et des clans réunis,',
        closing: "Ret'urcye mhi.",
        titles: { emperor: 'Mandalore', conseil: 'Chef de Clan', general: 'Chef de guerre', diplomat: 'Émissaire des clans', admin: 'Haut Commandement' },
    },
};

const DEFAULT_LETTERHEAD = {
    institution: 'Chancellerie',
    office: 'Service diplomatique',
    prefix: 'DIP',
    opening: 'Au nom de notre gouvernement,',
    closing: 'Avec nos salutations officielles.',
    titles: { emperor: 'Chef d\'État', conseil: 'Conseiller', general: 'Général', diplomat: 'Diplomate', admin: 'Haut Commandement' },
};

export function letterheadFor(factionId, factionName) {
    const base = LETTERHEADS[factionId] || DEFAULT_LETTERHEAD;
    return LETTERHEADS[factionId] ? base : { ...base, institution: factionName || base.institution };
}

/** Titre du signataire selon son rôle et sa faction. */
export function signatoryTitle(factionId, role) {
    const lh = LETTERHEADS[factionId] || DEFAULT_LETTERHEAD;
    return lh.titles[role] || lh.titles.diplomat;
}

/** Référence lisible : SG-T012-4F2A. */
export function documentReference(docData, docId) {
    const lh = LETTERHEADS[docData.fromFaction] || DEFAULT_LETTERHEAD;
    const turn = String(docData.turn ?? 0).padStart(3, '0');
    return `${lh.prefix}-T${turn}-${(docId || '----').slice(0, 4).toUpperCase()}`;
}

// --- Modèles ------------------------------------------------------------------

const p = (text) => ({ kind: 'p', text });
const art = (title, text) => ({ kind: 'article', title, text });
const or = (v, fallback) => (v && String(v).trim()) || fallback;
// « de » avec élision : d'Empire Sith, de République Galactique.
const de = (name) => (/^[aeiouyhéèêàâîôû]/i.test(name || '') ? `d'${name}` : `de ${name}`);

/**
 * Chaque modèle : id, nom, icône du pack, catégorie, description, nature
 * (ce que le destinataire peut faire : 'sign' = signer/rejeter,
 * 'ack' = accuser réception/rejeter), champs, et build(fields, ctx) qui
 * renvoie la liste des blocs du corps.
 */
export const DOCUMENT_TEMPLATES = [
    {
        id: 'note',
        name: 'Note diplomatique',
        icon: 'datapad',
        category: 'Correspondance',
        description: 'Communiqué officiel adressé à une puissance étrangère.',
        nature: 'ack',
        fields: [
            { key: 'subject', label: 'Objet', placeholder: 'Situation dans le secteur de Tython' },
            { key: 'message', label: 'Message', type: 'textarea', placeholder: 'Exposez la position de votre gouvernement…' },
        ],
        build: (f, ctx) => [
            p(`${ctx.opening} nous adressons au gouvernement ${de(ctx.toName)} la présente note concernant : ${or(f.subject, 'affaires courantes')}.`),
            p(or(f.message, '…')),
            p('Nous attendons une réponse par les canaux diplomatiques habituels.'),
        ],
    },
    {
        id: 'audience',
        name: "Demande d'audience",
        icon: 'beacon',
        category: 'Correspondance',
        description: 'Ouvrir un canal de négociation en terrain neutre.',
        nature: 'ack',
        fields: [
            { key: 'place', label: 'Lieu proposé', placeholder: 'Alderaan, palais royal' },
            { key: 'when', label: 'Échéance (tour)', type: 'number', placeholder: '12' },
            { key: 'agenda', label: 'Ordre du jour', type: 'textarea', placeholder: 'Statut des routes commerciales de la Bordure…' },
        ],
        build: (f, ctx) => [
            p(`${ctx.opening} nous sollicitons une audience auprès des représentants ${de(ctx.toName)}.`),
            art('Lieu', or(f.place, 'Un lieu neutre à convenir.')),
            art('Échéance', f.when ? `Au plus tard au tour ${f.when}.` : 'Dans les meilleurs délais.'),
            art('Ordre du jour', or(f.agenda, 'À définir entre les délégations.')),
            p("Les délégations seront protégées par l'immunité diplomatique durant toute la durée des pourparlers."),
        ],
    },
    {
        id: 'credentials',
        name: 'Lettres de créance',
        icon: 'claninsignia',
        category: 'Correspondance',
        description: 'Accréditer un ambassadeur auprès d\'une puissance étrangère.',
        nature: 'sign',
        fields: [
            { key: 'envoy', label: "Nom de l'ambassadeur", placeholder: 'Ambassadeur Saresh' },
            { key: 'mission', label: 'Mission', type: 'textarea', placeholder: 'Représenter nos intérêts sur Coruscant…' },
        ],
        build: (f, ctx) => [
            p(`${ctx.opening} nous accréditons ${or(f.envoy, ctx.authorName)} en qualité de représentant permanent auprès ${de(ctx.toName)}.`),
            art('Mission', or(f.mission, 'Représenter nos intérêts et maintenir un canal de dialogue permanent.')),
            p('Nous prions les autorités destinataires de lui accorder pleine foi et créance, ainsi que la protection due à son rang.'),
        ],
    },
    {
        id: 'protest',
        name: 'Note de protestation',
        icon: 'cbt_st_marked',
        category: 'Correspondance',
        description: 'Dénoncer un incident et exiger réparation.',
        nature: 'ack',
        fields: [
            { key: 'incident', label: 'Incident', placeholder: 'Interception d\'un convoi' },
            { key: 'system', label: 'Système', placeholder: 'Balmorra' },
            { key: 'demand', label: 'Réparation exigée', type: 'textarea', placeholder: 'Restitution de la cargaison et excuses officielles…' },
        ],
        build: (f, ctx) => [
            p(`${ctx.opening} nous élevons la plus vive protestation auprès ${de(ctx.toName)}.`),
            art('Incident', `${or(f.incident, 'Un incident grave')}${f.system ? `, survenu dans le système ${f.system}` : ''}.`),
            art('Réparation exigée', or(f.demand, 'Des explications officielles et des garanties de non-répétition.')),
            p('Faute de réponse satisfaisante, nous nous réservons le droit de prendre toute mesure appropriée.'),
        ],
    },
    {
        id: 'ceasefire',
        name: 'Cessez-le-feu',
        icon: 'sage_open_palm_6_0',
        category: 'Traités',
        description: 'Suspendre les hostilités sur un ou plusieurs fronts.',
        nature: 'sign',
        fields: [
            { key: 'systems', label: 'Systèmes concernés', placeholder: 'Corellia, Taris' },
            { key: 'duration', label: 'Durée (tours)', type: 'number', placeholder: '5' },
            { key: 'terms', label: 'Conditions', type: 'textarea', placeholder: 'Gel des positions, aucun mouvement de flotte…' },
        ],
        build: (f, ctx) => [
            p(`${ctx.opening} il est proposé à ${ctx.toName} la suspension immédiate des hostilités.`),
            art('Article I — Périmètre', or(f.systems, "L'ensemble des fronts ouverts entre les parties.")),
            art('Article II — Durée', f.duration ? `${f.duration} tours à compter de la signature.` : 'Jusqu\'à dénonciation par l\'une des parties.'),
            art('Article III — Conditions', or(f.terms, 'Les forces en présence conservent leurs positions et s\'abstiennent de tout acte hostile.')),
        ],
    },
    {
        id: 'non_aggression',
        name: 'Pacte de non-agression',
        icon: 'energyshield',
        category: 'Traités',
        description: 'Engagement mutuel à ne pas s\'attaquer.',
        nature: 'sign',
        fields: [
            { key: 'duration', label: 'Durée (tours)', type: 'number', placeholder: '10' },
            { key: 'zones', label: 'Zones démilitarisées', placeholder: 'Couloir hyperspatial de Hydian' },
            { key: 'clauses', label: 'Clauses particulières', type: 'textarea', placeholder: 'Préavis de trois tours avant toute dénonciation…' },
        ],
        build: (f, ctx) => [
            p(`${ctx.opening} les représentants ${de(ctx.fromName)} et ${de(ctx.toName)} s'engagent mutuellement à s'abstenir de tout acte d'agression.`),
            art('Article I — Durée', f.duration ? `Le présent pacte est conclu pour ${f.duration} tours.` : 'Le présent pacte est conclu pour une durée indéterminée.'),
            art('Article II — Zones démilitarisées', or(f.zones, 'Aucune zone n\'est démilitarisée.')),
            art('Article III — Clauses particulières', or(f.clauses, 'Néant.')),
        ],
    },
    {
        id: 'trade',
        name: 'Accord commercial',
        icon: 'galactictradekioskunlock',
        category: 'Traités',
        description: 'Ouvrir une route marchande et fixer ses termes.',
        nature: 'sign',
        fields: [
            { key: 'route', label: 'Route hyperspatiale', placeholder: 'Voie Perlemienne' },
            { key: 'goods', label: 'Marchandises', placeholder: 'Duracier, kolto, minerais' },
            { key: 'tariff', label: 'Droits de douane (%)', type: 'number', placeholder: '5' },
            { key: 'duration', label: 'Durée (tours)', type: 'number', placeholder: '8' },
        ],
        build: (f, ctx) => [
            p(`${ctx.opening} nous proposons à ${ctx.toName} l'ouverture d'échanges commerciaux réguliers.`),
            art('Article I — Route', or(f.route, 'Route à désigner par les autorités portuaires.')),
            art('Article II — Marchandises', or(f.goods, 'Toutes marchandises licites.')),
            art('Article III — Droits de douane', f.tariff ? `${f.tariff} % de la valeur déclarée.` : 'Exonération réciproque.'),
            art('Article IV — Durée', f.duration ? `${f.duration} tours, renouvelable.` : 'Durée indéterminée.'),
        ],
    },
    {
        id: 'prisoners',
        name: 'Échange de prisonniers',
        icon: 'cc_stay',
        category: 'Traités',
        description: 'Organiser la libération réciproque de captifs.',
        nature: 'sign',
        fields: [
            { key: 'count', label: 'Nombre de prisonniers', type: 'number', placeholder: '120' },
            { key: 'place', label: "Lieu de l'échange", placeholder: 'Station neutre de Nar Shaddaa' },
            { key: 'guarantees', label: 'Garanties', type: 'textarea', placeholder: 'Escorte d\'observateurs hutts…' },
        ],
        build: (f, ctx) => [
            p(`${ctx.opening} il est proposé à ${ctx.toName} un échange de prisonniers selon les termes suivants.`),
            art('Article I — Effectifs', f.count ? `${f.count} prisonniers de part et d'autre.` : 'Nombre égal de part et d\'autre.'),
            art('Article II — Lieu', or(f.place, 'Un lieu neutre à convenir.')),
            art('Article III — Garanties', or(f.guarantees, 'Aucune force armée ne sera présente au-delà des escortes convenues.')),
        ],
    },
    {
        id: 'peace_treaty',
        name: 'Traité de paix',
        icon: 'jedistonetablet',
        category: 'Traités',
        description: 'Mettre fin à une guerre, à la manière du Traité de Coruscant.',
        nature: 'sign',
        fields: [
            { key: 'borders', label: 'Frontières', type: 'textarea', placeholder: 'Les systèmes de la Bordure Médiane reviennent à…' },
            { key: 'reparations', label: 'Réparations (crédits)', type: 'number', placeholder: '5000' },
            { key: 'clauses', label: 'Clauses additionnelles', type: 'textarea', placeholder: 'Retrait des flottes de l\'orbite de Coruscant…' },
        ],
        build: (f, ctx) => [
            p(`${ctx.opening} les représentants ${de(ctx.fromName)} et ${de(ctx.toName)}, désireux de mettre un terme au conflit qui les oppose, conviennent de ce qui suit.`),
            art('Article I — Fin des hostilités', 'Toutes les opérations militaires entre les parties cessent dès la signature du présent traité.'),
            art('Article II — Frontières', or(f.borders, 'Les frontières sont fixées sur les positions tenues à la date de signature.')),
            art('Article III — Réparations', f.reparations ? `${Number(f.reparations).toLocaleString('fr-FR')} crédits versés par la partie désignée.` : 'Aucune réparation n\'est exigée.'),
            art('Article IV — Clauses additionnelles', or(f.clauses, 'Néant.')),
        ],
    },
    {
        id: 'ultimatum',
        name: 'Ultimatum',
        icon: 'orbitalbombardment',
        category: 'Menaces',
        description: 'Exiger des concessions sous peine de représailles.',
        nature: 'ack',
        fields: [
            { key: 'demands', label: 'Exigences', type: 'textarea', placeholder: 'Évacuation immédiate du système d\'Ilum…' },
            { key: 'deadline', label: 'Délai (tours)', type: 'number', placeholder: '2' },
            { key: 'consequences', label: 'Conséquences', placeholder: 'Bombardement orbital' },
        ],
        build: (f, ctx) => [
            p(`${ctx.opening} ${ctx.toName} est sommé de se conformer aux exigences suivantes.`),
            art('Exigences', or(f.demands, 'À préciser.')),
            art('Délai', f.deadline ? `${f.deadline} tours à compter de la réception.` : 'Effet immédiat.'),
            art('Conséquences', or(f.consequences, 'Toute mesure jugée nécessaire.')),
            p('Aucune autre sommation ne sera adressée.'),
        ],
    },
    {
        id: 'war_declaration',
        name: 'Déclaration de guerre',
        icon: 'clashing_lightsabers_6_0',
        category: 'Menaces',
        description: 'Notifier officiellement l\'ouverture des hostilités.',
        nature: 'ack',
        fields: [
            { key: 'casus', label: 'Casus belli', type: 'textarea', placeholder: 'Violation répétée de notre espace…' },
            { key: 'targets', label: 'Théâtres d\'opérations', placeholder: 'Bordure Extérieure' },
        ],
        build: (f, ctx) => [
            p(`${ctx.opening} nous déclarons solennellement l'état de guerre avec ${ctx.toName}.`),
            art('Motifs', or(f.casus, 'Les provocations répétées de la partie adverse.')),
            art('Théâtres d\'opérations', or(f.targets, 'Tous les secteurs revendiqués.')),
            p('Tous les accords antérieurs entre les parties sont dénoncés à compter de ce jour.'),
        ],
    },
];

export const TEMPLATE_CATEGORIES = ['Correspondance', 'Traités', 'Menaces'];

export function getTemplate(id) {
    return DOCUMENT_TEMPLATES.find((t) => t.id === id) || DOCUMENT_TEMPLATES[0];
}

/** Construit le contenu figé d'un document à partir d'un modèle et des champs. */
export function buildDocument(template, fields, ctx) {
    const lh = letterheadFor(ctx.fromFaction, ctx.fromName);
    const fullCtx = { ...ctx, opening: lh.opening };
    return {
        blocks: template.build(fields, fullCtx),
        closing: lh.closing,
    };
}

export const DOCUMENT_STATUS = {
    sent: { label: 'Transmis', color: 'var(--sw-info)' },
    read: { label: 'Lu', color: 'var(--sw-warn)' },
    signed: { label: 'Signé', color: 'var(--sw-success)' },
    acknowledged: { label: 'Reçu', color: 'var(--sw-success)' },
    rejected: { label: 'Rejeté', color: 'var(--sw-error)' },
};
