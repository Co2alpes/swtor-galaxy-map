"use client";

// Kit d'interface SWTOR : mêmes briques que le thème Lua des addons ERC
// (Fenêtre, Bouton, Onglets, Case, Icône, Barre...) habillées avec les
// textures rippées de public/ui/swtor et les icônes de public/ui/icons.
// Les styles vivent dans globals.css (classes .sw-*) ; l'accent suit la
// faction via l'attribut data-faction (republic, empire, sinon ambre).

const cx = (...parts) => parts.filter(Boolean).join(' ');

// --- Faction -------------------------------------------------------------

const KITS = {
    republic: { kit: 'jedi', logo: '/ui/swtor/jedi_logo.png', background: '/ui/swtor/background_jedi.webp', hud: '/ui/swtor/hud_jedi.png', portrait: '/ui/swtor/portrait_order.png', label: 'République Galactique' },
    empire: { kit: 'sith', logo: '/ui/swtor/sith_logo.png', background: '/ui/swtor/background_sith.webp', hud: '/ui/swtor/hud_sith.png', portrait: '/ui/swtor/portrait_dark.png', label: 'Empire Sith' },
    neutral: { kit: 'civil', logo: '/ui/swtor/civ_logo.png', background: '/ui/swtor/background_civil.webp', hud: '/ui/swtor/hud_civil.png', portrait: '/ui/swtor/portrait_civil.png', label: 'Neutre' },
};

/** Textures et logo de la faction (republic, empire, tout le reste = civil). */
export function factionKit(faction) {
    return KITS[faction] || KITS.neutral;
}

/** Fixe l'accent de couleur de tout ce qu'il contient. */
export function SwFaction({ faction, as: Tag = 'div', className, children, ...rest }) {
    const key = faction === 'republic' || faction === 'empire' ? faction : 'neutral';
    return <Tag data-faction={key} className={className} {...rest}>{children}</Tag>;
}

/** Fond plein écran : dégradé de faction + espace. */
export function SwBackdrop({ faction, className, dim = 0.55, children }) {
    const k = factionKit(faction);
    return (
        <div className={cx('absolute inset-0 overflow-hidden pointer-events-none', className)}>
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(/ui/swtor/backdrop.webp)` }} />
            <div className="absolute inset-0 bg-cover bg-bottom mix-blend-screen" style={{ backgroundImage: `url(${k.background})`, opacity: 0.9 }} />
            <div className="absolute inset-0" style={{ background: `rgb(0 0 0 / ${dim})` }} />
            {children}
        </div>
    );
}

// --- Textes ----------------------------------------------------------------

export function SwTitle({ as: Tag = 'h2', className, children, ...rest }) {
    return <Tag className={cx('sw-title', className)} {...rest}>{children}</Tag>;
}

export function SwLabel({ as: Tag = 'div', className, children, ...rest }) {
    return <Tag className={cx('sw-label', className)} {...rest}>{children}</Tag>;
}

export function SwDivider({ className }) {
    return <div className={cx('sw-divider', className)} />;
}

// --- Fenêtres ----------------------------------------------------------------

export function SwEmblem({ faction, size = 36, className, glow = true }) {
    // Sans faction explicite : l'emblème du SwFaction englobant (variable --sw-logo).
    if (!faction) {
        return (
            <span
                aria-hidden="true"
                className={cx('inline-block select-none shrink-0 bg-center bg-contain bg-no-repeat', className)}
                style={{ width: size, height: size, backgroundImage: 'var(--sw-logo)', ...(glow ? { filter: 'drop-shadow(0 0 6px rgb(var(--sw-accent-rgb) / 0.55))' } : null) }}
            />
        );
    }
    return (
        <img
            src={factionKit(faction).logo}
            alt=""
            width={size}
            height={size}
            draggable={false}
            className={cx('select-none shrink-0', className)}
            style={glow ? { filter: 'drop-shadow(0 0 6px rgb(var(--sw-accent-rgb) / 0.55))' } : undefined}
        />
    );
}

/**
 * Fenêtre SWTOR : contour lumineux, bandeau de titre avec emblème,
 * filet accent + or, croix de fermeture.
 */
export function SwWindow({ title, subtitle, faction, emblem = true, icon, onClose, actions, className, bodyClassName, headerClassName, children, ...rest }) {
    return (
        <div className={cx('sw-window flex flex-col animate-sw-open', className)} {...rest}>
            {(title || onClose || actions) && (
                <div className={cx('sw-window-header shrink-0', headerClassName)}>
                    {icon ? <SwIcon name={icon} size={34} /> : emblem && <SwEmblem faction={faction} size={34} />}
                    <div className="min-w-0 flex-1">
                        {title && <div className="sw-title text-lg leading-tight truncate">{title}</div>}
                        {subtitle && <div className="sw-label text-[0.65rem] truncate">{subtitle}</div>}
                    </div>
                    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
                    {onClose && <button type="button" aria-label="Fermer" className="sw-close ml-1" onClick={onClose} />}
                </div>
            )}
            <div className={cx('relative min-h-0 flex-1 p-4 pt-5', bodyClassName)}>{children}</div>
        </div>
    );
}

/** Fenêtre modale centrée sur un voile flouté. */
export function SwModal({ onClose, closeOnBackdrop = true, zIndex = 50, overlayClassName, className, ...windowProps }) {
    return (
        <div
            style={{ zIndex }}
            className={cx('fixed inset-0 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm', overlayClassName)}
            onMouseDown={closeOnBackdrop && onClose ? (e) => { if (e.target === e.currentTarget) onClose(); } : undefined}
        >
            <SwWindow onClose={onClose} className={cx('max-h-[92vh] w-full max-w-3xl', className)} {...windowProps} />
        </div>
    );
}

export function SwPanel({ dark, className, children, ...rest }) {
    return <div className={cx(dark ? 'sw-panel-dark' : 'sw-panel', className)} {...rest}>{children}</div>;
}

/** Encart « verre sombre » de la charte HUD (filet accent à gauche). */
export function SwGlass({ className, accent, children, style, ...rest }) {
    return (
        <div className={cx('sw-glass', className)} style={accent ? { ...style, boxShadow: `inset 2px 0 0 ${accent}` } : style} {...rest}>
            {children}
        </div>
    );
}

// --- Contrôles ---------------------------------------------------------------

export function SwButton({ variant = 'default', size, active, className, type = 'button', children, ...rest }) {
    return (
        <button
            type={type}
            data-active={active ? 'true' : undefined}
            className={cx('sw-btn', variant === 'accent' && 'sw-btn-accent', variant === 'danger' && 'sw-btn-danger', size === 'sm' && 'sw-btn-sm', className)}
            {...rest}
        >
            {children}
        </button>
    );
}

export function SwTabs({ tabs, value, onChange, className, tabClassName }) {
    return (
        <div className={cx('flex flex-wrap items-end gap-1', className)} role="tablist">
            {tabs.map((t) => (
                <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={value === t.id}
                    data-active={value === t.id ? 'true' : undefined}
                    className={cx('sw-tab', tabClassName)}
                    onClick={() => onChange(t.id)}
                >
                    {t.icon && <SwIcon name={t.icon} size={18} className="mr-2 -ml-1" />}
                    {t.label}
                    {t.badge != null && <span className="ml-2 text-sw-accent-light">{t.badge}</span>}
                </button>
            ))}
        </div>
    );
}

export function SwInput({ className, as: Tag = 'input', ...rest }) {
    return <Tag className={cx('sw-input', className)} {...rest} />;
}

// --- Icônes, cases, portraits -------------------------------------------------

/** Icône du pack SWTOR (public/ui/icons/<name>.png). */
export function SwIcon({ name, size = 32, className, alt = '', ...rest }) {
    if (!name) return null;
    const src = name.startsWith('/') ? name : `/ui/icons/${name}.png`;
    return <img src={src} alt={alt} width={size} height={size} draggable={false} className={cx('select-none shrink-0 rounded-[3px]', className)} {...rest} />;
}

/** Case d'objet : cadre cell_empty, icône du pack ou contenu libre. */
export function SwCell({ icon, size = 56, active, className, children, badge, title, onClick, style, ...rest }) {
    const Tag = onClick ? 'button' : 'div';
    return (
        <Tag
            type={onClick ? 'button' : undefined}
            title={title}
            onClick={onClick}
            data-active={active ? 'true' : undefined}
            className={cx('sw-cell', onClick && 'cursor-pointer hover:brightness-125', className)}
            style={{ ...style, width: size, height: size }}
            {...rest}
        >
            {icon ? <SwIcon name={icon} size={Math.round(size * 0.78)} /> : children}
            {badge != null && (
                <span className="absolute bottom-0.5 right-1 text-[10px] font-bold text-sw-text drop-shadow-[0_1px_1px_#000]">{badge}</span>
            )}
        </Tag>
    );
}

/** Portrait rond : cadre de faction (doré, rouge, argent) + anneau scanner. */
export function SwPortrait({ faction, src, size = 96, scanner = false, className, children }) {
    const k = factionKit(faction);
    return (
        <div className={cx('relative shrink-0', className)} style={{ width: size, height: size }}>
            {scanner && (
                <img src="/ui/swtor/scanner.png" alt="" draggable={false} className="absolute inset-[-18%] w-[136%] h-[136%] max-w-none opacity-70 pointer-events-none" />
            )}
            {/* Le médaillon est plein : le contenu se pose par-dessus, dans le disque central */}
            <img src={k.portrait} alt="" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" />
            <div className={cx('absolute inset-[20%] rounded-full overflow-hidden flex items-center justify-center', src && 'ring-1 ring-black/70')}>
                {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : children}
            </div>
        </div>
    );
}

// --- Jauges ------------------------------------------------------------------------

/** Barre fine de la charte HUD. */
export function SwBar({ value = 0, max = 100, color, className, height }) {
    const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
    return (
        <div className={cx('sw-bar', className)} style={height ? { height } : undefined}>
            <span style={{ width: `${pct}%`, ...(color ? { '--sw-bar-color': color } : null) }} />
        </div>
    );
}

/** Ligne « titre ... valeur » avec barre facultative. */
export function SwStat({ label, value, color, bar, max, className }) {
    return (
        <div className={cx('flex flex-col gap-1', className)}>
            <div className="flex items-baseline justify-between gap-3">
                <span className="sw-label">{label}</span>
                <span className="font-bold text-sm" style={color ? { color } : undefined}>{value}</span>
            </div>
            {bar != null && <SwBar value={bar} max={max} color={color} />}
        </div>
    );
}

/** Indicateur de chargement : anneau scanner qui tourne autour de l'emblème. */
export function SwSpinner({ faction, size = 96, label, className }) {
    return (
        <div className={cx('flex flex-col items-center gap-4', className)}>
            <div className="relative" style={{ width: size, height: size }}>
                <img src="/ui/swtor/scanner.png" alt="" className="absolute inset-0 w-full h-full animate-sw-spin opacity-80" style={{ animationDuration: '3s' }} />
                <SwEmblem faction={faction} size={Math.round(size * 0.46)} className="absolute inset-0 m-auto" />
            </div>
            {label && <div className="sw-label animate-pulse">{label}</div>}
        </div>
    );
}

/** Pastille de notification (couleurs d'état communes). */
export const SW_STATUS = {
    info: 'var(--sw-info)',
    success: 'var(--sw-success)',
    warn: 'var(--sw-warn)',
    error: 'var(--sw-error)',
};
