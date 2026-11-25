/**
 * Agreed Liquid Glass 8-color palette for folders and projects.
 * @type {Array<{ id: string, label: string, hex: string }>}
 */
export const COLOR_PALETTE = [
  { id: 'soft-green', label: 'Мягкий зелёный', hex: '#86EFAC' },
  { id: 'warm-amber', label: 'Тёплый янтарь', hex: '#FBBF24' },
  { id: 'scarlet', label: 'Алый', hex: '#F87171' },
  { id: 'cornflower', label: 'Василёк', hex: '#5E81F4' },
  { id: 'sky-ice', label: 'Небесный лёд', hex: '#38BDF8' },
  { id: 'lavender', label: 'Лаванда', hex: '#A78BFA' },
  { id: 'dusty-rose', label: 'Пыльная роза', hex: '#F472B6' },
  { id: 'titanium', label: 'Титан', hex: '#94A3B8' }
];

export const DEFAULT_COLOR = '#94A3B8';
export const DEFAULT_ICON = 'sweater';

/**
 * 15 minimal single-silhouette vector icons for knitted garments and accessories.
 * Unified 24x24 grid, 1.9px stroke, no yarn balls, blankets, or needles/hooks.
 * @type {Array<{ id: string, label: string, paths: string }>}
 */
export const KNITTING_ICONS = [
  {
    id: 'sweater',
    label: 'Свитер',
    paths:
      '<path d="M9 2.5h6v3H9z"/>' +
      '<path d="M9 5.5 4 7.5 1.8 17l3 1 1.7-6.5V21h11v-9.5l1.7 6.5 3-1L20 7.5l-5-2"/>' +
      '<path d="M6.5 18.2h11"/>'
  },
  {
    id: 'longsleeve',
    label: 'Паутинка',
    paths:
      '<path d="M8 4.5c2 1.8 6 1.8 8 0l4.5 2.8-2 10.7-2.8-.5 1-6.5-.7 9.5H8l-.7-9.5 1 6.5-2.8.5-2-10.7L8 4.5Z"/>'
  },
  {
    id: 'cardigan',
    label: 'Кардиган',
    paths:
      '<path d="M9 3.5 12 10l3-6.5 5 3.2L22.2 17l-3 1-1.7-6.5V21h-11v-9.5L4.8 18l-3-1L4 6.7l5-3.2Z"/>' +
      '<path d="M12 10v11"/>' +
      '<circle cx="12" cy="13" r="0.55" fill="currentColor"/>' +
      '<circle cx="12" cy="16" r="0.55" fill="currentColor"/>' +
      '<circle cx="12" cy="19" r="0.55" fill="currentColor"/>'
  },
  {
    id: 'vest',
    label: 'Жилет',
    paths:
      '<path d="M7.5 3.5h2.2L12 9.5l2.3-6h2.2l1.2 2.2c-1.4 2.5-1.4 5.5.8 7.3V21H5.5v-8c2.2-1.8 2.2-4.8.8-7.3l1.2-2.2Z"/>' +
      '<path d="M5.5 18h13"/>'
  },
  {
    id: 'top',
    label: 'Топ',
    paths:
      '<path d="M8 2.5v4.5M16 2.5v4.5"/>' +
      '<path d="M8 7c1.8 2 6.2 2 8 0l2.5 4c-1.1 2.8-1.1 6 0 9.5H5.5c1.1-3.5 1.1-6.7 0-9.5L8 7Z"/>'
  },
  {
    id: 'skirt',
    label: 'Юбка',
    paths:
      '<rect x="7" y="3.5" width="10" height="3" rx="1"/>' +
      '<path d="M7 6.5C5.2 11 4 15.5 3.5 19.5c2.8 1 5.6 1 8.5 0 2.9 1 5.7 1 8.5 0C20 15.5 18.8 11 17 6.5"/>' +
      '<path d="M10 6.5 9 19.5M14 6.5l1 13"/>'
  },
  {
    id: 'shorts',
    label: 'Шорты',
    paths:
      '<rect x="5.5" y="4.5" width="13" height="3" rx="1"/>' +
      '<path d="M5.5 7.5 3.5 18.5c2.3.8 4.4.8 6.3 0L12 13.5l2.2 5c1.9.8 4 .8 6.3 0L18.5 7.5"/>' +
      '<path d="M10.8 7.5l-.8 2.5M13.2 7.5l.8 2.5"/>'
  },
  {
    id: 'hat',
    label: 'Шапка',
    paths:
      '<circle cx="12" cy="3.5" r="1.7"/>' +
      '<path d="M4.5 15c0-5 3.3-8.8 7.5-8.8s7.5 3.8 7.5 8.8"/>' +
      '<path d="M8.5 7c-1 2.4-1.4 5-1.4 8M15.5 7c1 2.4 1.4 5 1.4 8M12 6.2V15"/>' +
      '<rect x="3" y="15" width="18" height="4.8" rx="2.2"/>'
  },
  {
    id: 'collar',
    label: 'Манишка',
    paths:
      '<rect x="8" y="3" width="8" height="4.8" rx="1.4"/>' +
      '<path d="M8 7.8 4 12.5c-.5.6-.5 1.4 0 2l5.8 5.8c1.2 1.2 3.2 1.2 4.4 0l5.8-5.8c.5-.6.5-1.4 0-2L16 7.8"/>' +
      '<path d="M10.5 7.8v3.5M13.5 7.8v3.5"/>'
  },
  {
    id: 'scarf',
    label: 'Шарф',
    paths:
      '<path d="M7.5 3.2h9"/>' +
      '<path d="M9.3 6.2h5.4"/>' +
      '<path d="M7.5 3.2 4.8 6.8c-.9 1.2-.8 2.9.3 3.9l2.6 2.4"/>' +
      '<path d="M16.5 3.2l2.7 3.6c.9 1.2.8 2.9-.3 3.9l-7.2 6.8c-.9.8-2.2.8-3-.1-.8-.8-.8-2.2.1-3l6.2-5.9"/>' +
      '<path d="M10.5 16.8V21H15v-8.8"/>' +
      '<path d="M15 19.2h2.8v-7.5"/>' +
      '<path d="M11.5 21v1.5M14 21v1.5M17 19.2v1.5"/>'
  },
  {
    id: 'shawl',
    label: 'Платок Софи',
    paths:
      '<path d="M10.2 13.3C7 12.8 5 11 5 8.2 5 5.2 7.2 3 12 3s7 2.2 7 5.2c0 2.8-2 4.6-5.2 5.1"/>' +
      '<path d="M7.5 7.8c1.5-1.4 7.5-1.4 9 0-1.2 1.8-2.8 2.6-4.5 2.6S8.7 9.6 7.5 7.8Z"/>' +
      '<circle cx="12" cy="12.6" r="1.8"/>' +
      '<path d="M10.8 14.2c-2 2.2-2.6 4.5-2.1 6.8 1.5-1.3 2.5-3.3 2.7-6.3"/>' +
      '<path d="M13.2 14.2c2 2.4 2.6 5 2 7.8-1.5-1.5-2.5-3.8-2.6-7.3"/>'
  },
  {
    id: 'socks',
    label: 'Носки',
    paths:
      '<path d="M7 3h6.5v6.5c0 1.2.8 2.2 2 2.6l3 1a2.9 2.9 0 0 1-1.8 5.5l-7.2-2.4A3.6 3.6 0 0 1 7 12.8V3Z"/>' +
      '<path d="M7 6.5h6.5"/>' +
      '<path d="M7 11.2a3.3 3.3 0 0 1 3.3 3.3v1.8"/>' +
      '<path d="M17.2 12.7a3 3 0 0 0-1.6 5.4"/>'
  },
  {
    id: 'mittens',
    label: 'Варежки',
    paths:
      '<path d="M8 9.2a3.3 3.3 0 0 1 6.6 0v3.5l2-1.9a1.3 1.3 0 0 1 1.9 1.8l-3.9 4.6V18H8V9.2Z"/>' +
      '<rect x="7.5" y="18" width="7.6" height="3" rx="1"/>'
  },
  {
    id: 'gloves',
    label: 'Перчатки',
    paths:
      '<path d="M6.5 18V9.5a1.2 1.2 0 0 1 2.4 0V13V5.5a1.2 1.2 0 0 1 2.4 0V13V4.8a1.2 1.2 0 0 1 2.4 0V13V6.8a1.2 1.2 0 0 1 2.4 0v7.2l1.8-1.6a1.3 1.3 0 0 1 1.8 1.8l-3.6 3.8H6.5Z"/>' +
      '<rect x="6.5" y="18" width="9.8" height="3" rx="1"/>'
  },
  {
    id: 'bag',
    label: 'Сумка',
    paths:
      '<path d="M8 9.5V5.8C8 4 9.8 2.8 12 2.8s4 1.2 4 3v3.7"/>' +
      '<path d="M4 9.5c2.5.9 13.5.9 16 0l-1.2 9.8a2.2 2.2 0 0 1-2.2 2H7.4a2.2 2.2 0 0 1-2.2-2L4 9.5Z"/>' +
      '<path d="M9 14.5h6"/>'
  }
];

/**
 * Returns an inline SVG string for a knitting icon ID.
 * @param {string} iconId
 * @param {number} [size]
 * @returns {string}
 */
export function renderKnittingIconSvg(iconId, size = 20) {
  const found = KNITTING_ICONS.find((i) => i.id === iconId) || KNITTING_ICONS[0];
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${found.paths}</svg>`;
}

/**
 * Computes Liquid Glass badge styles for a pinned project's folder.
 * Returns empty strings for projects without a folder so default Liquid Silver CSS applies.
 * @param {string} folderName
 * @param {Array<{ name: string, color: string }>} folders
 * @returns {{ backgroundColor: string, borderColor: string, color: string }}
 */
export function getFolderBadgeStyle(folderName, folders) {
  const trimmed = String(folderName || '').trim();
  if (!trimmed) {
    return { backgroundColor: '', borderColor: '', color: '' };
  }
  const folder = Array.isArray(folders) ? folders.find((f) => f.name === trimmed) : null;
  const hex = folder && typeof folder.color === 'string' ? folder.color.trim() : '';
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!match) {
    return { backgroundColor: '', borderColor: '', color: '' };
  }
  const intVal = Number.parseInt(match[1], 16);
  const r = (intVal >> 16) & 255;
  const g = (intVal >> 8) & 255;
  const b = intVal & 255;
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.16)`,
    borderColor: `rgba(${r}, ${g}, ${b}, 0.42)`,
    color: hex
  };
}
