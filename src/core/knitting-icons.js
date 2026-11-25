/**
 * Agreed Liquid Glass 8-color palette for folders and projects.
 * @type {Array<{ id: string, label: string, hex: string }>}
 */
export const COLOR_PALETTE = [
  { id: 'lime', label: 'Яркий лайм', hex: '#45FF38' },
  { id: 'tiffany', label: 'Тиффани', hex: '#0ABAB5' },
  { id: 'burgundy', label: 'Глубокий бордо', hex: '#B91C1C' },
  { id: 'cobalt', label: 'Кобальт', hex: '#3043FC' },
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
      '<path d="M8.5 4.5a3.5 3.5 0 0 0 7 0h1.5l3.5 4.5-2.5 2.8-1.8-1.6V19.5H7.8v-9.3L6 11.8 3.5 9 7 4.5h1.5Z"/>'
  },
  {
    id: 'longsleeve',
    label: 'Лонгслив / паутинка',
    paths:
      '<path d="M8 5c1.2 1.8 6.8 1.8 8 0l4.5 3.5-1.5 9.5-2.6-.5.8-6.8-.7 8.8H7.5l-.7-8.8.8 6.8-2.6.5L3.5 8.5 8 5Z"/>' +
      '<path d="M9.5 10.5h5"/>'
  },
  {
    id: 'cardigan',
    label: 'Кардиган',
    paths:
      '<path d="M8.5 4.5 12 10l3.5-5.5H17l3.5 4.5-2.4 2.8-1.6-1.5v9.2h-9v-9.2l-1.6 1.5L3.5 9 7 4.5h1.5Z"/>' +
      '<line x1="12" y1="10" x2="12" y2="19.5"/>'
  },
  {
    id: 'vest',
    label: 'Жилет',
    paths:
      '<path d="M8 4.5h2l2 4.5 2-4.5h2l2 5.5v9.5H6V10l2-5.5Z"/>' +
      '<path d="M6 16.5h12"/>'
  },
  {
    id: 'top',
    label: 'Топ / майка',
    paths:
      '<path d="M8 4v4.5a4 4 0 0 0 8 0V4"/>' +
      '<path d="M8 4h1.8M14.2 4H16"/>' +
      '<path d="M7 9.5 6 19.5h12l-1-10"/>' +
      '<path d="M7 9.5c.8-1 1-3 1-5.5"/>' +
      '<path d="M17 9.5c-.8-1-1-3-1-5.5"/>'
  },
  {
    id: 'dress',
    label: 'Платье',
    paths:
      '<path d="M9 4.5a3 3 0 0 0 6 0h1.5l1 5.5L15 11.5l3.5 8H5.5l3.5-8L6.5 10l1-5.5H9Z"/>' +
      '<path d="M9 11.5h6"/>'
  },
  {
    id: 'skirt',
    label: 'Юбка',
    paths:
      '<path d="M7.5 5h9l2.5 14H5L7.5 5Z"/>' +
      '<path d="M7 8h10"/>'
  },
  {
    id: 'shorts',
    label: 'Шорты',
    paths:
      '<path d="M6 6h12l1.5 12h-5.3l-2.2-5-2.2 5H4.5L6 6Z"/>' +
      '<path d="M5.7 9h12.6"/>'
  },
  {
    id: 'hat',
    label: 'Шапка',
    paths:
      '<circle cx="12" cy="4.5" r="1.6"/>' +
      '<path d="M5.5 15c0-4.1 2.9-7.4 6.5-7.4s6.5 3.3 6.5 7.4"/>' +
      '<rect x="4" y="15" width="16" height="4" rx="1.8"/>'
  },
  {
    id: 'scarf',
    label: 'Шарф',
    paths:
      '<rect x="6" y="4.5" width="12" height="5" rx="2.5"/>' +
      '<path d="M8 9.5v10"/>' +
      '<path d="M12 9.5v8"/>' +
      '<path d="M16 9.5v10"/>' +
      '<path d="M8 15.5h8"/>'
  },
  {
    id: 'shawl',
    label: 'Шаль / бактус',
    paths:
      '<path d="M4 6.5h16l-8 11.5-8-11.5Z"/>' +
      '<path d="M7.5 6.5 12 13l4.5-6.5"/>'
  },
  {
    id: 'socks',
    label: 'Носки',
    paths:
      '<path d="M9 4.5h6v8l2.8 2.4a2.3 2.3 0 0 1-3 3.5l-4.5-3.4A2.5 2.5 0 0 1 9 12.8V4.5Z"/>' +
      '<path d="M9 8h6"/>'
  },
  {
    id: 'mittens',
    label: 'Варежки',
    paths:
      '<path d="M8 10a4 4 0 0 1 8 0v4.3l1.9-1.7a1.5 1.5 0 0 1 2.1 2L16.5 19H8v-9Z"/>' +
      '<path d="M7.5 19h9.5v2H7.5z"/>'
  },
  {
    id: 'gloves',
    label: 'Перчатки',
    paths:
      '<path d="M7.5 17.5V10a1.1 1.1 0 0 1 2.2 0v3V6.5a1.1 1.1 0 0 1 2.2 0V13V5.8a1.1 1.1 0 0 1 2.2 0V13V7.5a1.1 1.1 0 0 1 2.2 0v6.5l1.6-1.4a1.2 1.2 0 0 1 1.7 1.7l-3.1 3.2H7.5Z"/>' +
      '<path d="M7.5 17.5h9v2.5h-9z"/>'
  },
  {
    id: 'bag',
    label: 'Сумка',
    paths:
      '<path d="M8.5 9V7a3.5 3.5 0 0 1 7 0v2"/>' +
      '<rect x="5" y="9" width="14" height="10.5" rx="2.5"/>'
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
