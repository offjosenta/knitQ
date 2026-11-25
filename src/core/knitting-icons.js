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
      '<path d="M9.5 3.5c0-.6.5-1 1-1h3c.5 0 1 .4 1 1V6h-5V3.5Z"/>' +
      '<path d="M9.5 6 5 7.5 2.5 16.5l2.8.9L7.2 11v9h9.6v-9l1.9 6.4 2.8-.9L19 7.5 14.5 6"/>' +
      '<path d="M7.2 17.5h9.6"/>'
  },
  {
    id: 'longsleeve',
    label: 'Лонгслив / паутинка',
    paths:
      '<path d="M8 5.5c2 2 6 2 8 0l4.5 2.5-1.5 10.5-2.6-.4.8-7-.7 8.4H7.5l-.7-8.4.8 7-2.6.4L3.5 8 8 5.5Z"/>' +
      '<path d="M5.2 15.5l2.2.3M18.8 15.5l-2.2.3"/>'
  },
  {
    id: 'cardigan',
    label: 'Кардиган',
    paths:
      '<path d="M9.5 4.5 12 10.5l2.5-6L19 7l2.5 9.5-2.8.8-1.9-6.3v9H7.2v-9l-1.9 6.3-2.8-.8L5 7l4.5-2.5Z"/>' +
      '<path d="M12 10.5V20"/>' +
      '<circle cx="12" cy="13.2" r="0.5" fill="currentColor"/>' +
      '<circle cx="12" cy="16" r="0.5" fill="currentColor"/>' +
      '<circle cx="12" cy="18.5" r="0.5" fill="currentColor"/>'
  },
  {
    id: 'vest',
    label: 'Жилет',
    paths:
      '<path d="M8.5 4.5h1.8L12 9.5l1.7-5h1.8l1 2c-1 2.2-1 4.8.5 6.5V20H7v-7c1.5-1.7 1.5-4.3.5-6.5l1-2Z"/>' +
      '<path d="M7 17.5h10"/>'
  },
  {
    id: 'top',
    label: 'Топ / майка',
    paths:
      '<path d="M8.5 3.5v4M15.5 3.5v4"/>' +
      '<path d="M8.5 7.5c1.5 1.8 5.5 1.8 7 0l2 3.5c-.9 2.5-.9 5.5 0 8.5H6.5c.9-3 .9-6 0-8.5l2-3.5Z"/>'
  },
  {
    id: 'skirt',
    label: 'Юбка',
    paths:
      '<rect x="8" y="4.5" width="8" height="2.8" rx="1"/>' +
      '<path d="M8 7.3c-1.5 4-2.5 8-3 11.7 2.4.8 4.8.8 7 0 2.2.8 4.6.8 7 0-.5-3.7-1.5-7.7-3-11.7"/>' +
      '<path d="M10.5 7.3 9.7 19M13.5 7.3l.8 11.7"/>'
  },
  {
    id: 'shorts',
    label: 'Шорты',
    paths:
      '<rect x="6.5" y="5.5" width="11" height="2.8" rx="1"/>' +
      '<path d="M6.5 8.3 4.8 18c2 .7 3.8.7 5.4 0L12 13.5 13.8 18c1.6.7 3.4.7 5.4 0l-1.7-9.7"/>' +
      '<path d="M11 8.3l-.8 2.2M13 8.3l.8 2.2"/>'
  },
  {
    id: 'hat',
    label: 'Шапка',
    paths:
      '<circle cx="12" cy="4.2" r="1.6"/>' +
      '<path d="M5.5 14.5c0-4.4 2.9-7.8 6.5-7.8s6.5 3.4 6.5 7.8"/>' +
      '<path d="M9 7.5c-.8 2-1.2 4.5-1.2 7M15 7.5c.8 2 1.2 4.5 1.2 7M12 6.7v7.8"/>' +
      '<rect x="4" y="14.5" width="16" height="4.2" rx="2"/>'
  },
  {
    id: 'beret',
    label: 'Берет',
    paths:
      '<path d="M12 6l.5-2"/>' +
      '<path d="M4 14.5C3.5 10.5 7 6.5 12.5 6.5c5.2 0 8.5 3.5 7.5 7.5-.5 1.5-2 2.2-3.5 2.5H6.5C5 16.5 4.2 15.6 4 14.5Z"/>' +
      '<path d="M6.5 16.5v2c0 .6.4 1 1 1h9c.6 0 1-.4 1-1v-2"/>'
  },
  {
    id: 'scarf',
    label: 'Шарф',
    paths:
      '<path d="M6.5 8.2c0-2.5 2.5-4 5.5-4s5.5 1.5 5.5 4c0 2-1.8 3.2-4.5 3.5"/>' +
      '<path d="M7.5 10.2v7.8h4v-6.3M12.5 11.7v7.8h4v-9.3"/>' +
      '<path d="M8.5 18v2M10.5 18v2M13.5 19.5v2M15.5 19.5v2"/>'
  },
  {
    id: 'shawl',
    label: 'Шаль / бактус',
    paths:
      '<path d="M3.5 8.5c2.5-2 5-3 8.5-3s6 1 8.5 3L12 19.5 3.5 8.5Z"/>' +
      '<path d="M7 7c1.5 2.5 3.2 3.8 5 3.8S15.5 9.5 17 7"/>' +
      '<path d="M12 10.8v8.7"/>'
  },
  {
    id: 'socks',
    label: 'Носки',
    paths:
      '<path d="M8.5 4h5.5v6.5c0 1.2.8 2.2 2 2.8l2.5 1.2a2.4 2.4 0 0 1-2 4.4l-6.2-2.6A3.2 3.2 0 0 1 8.5 13.4V4Z"/>' +
      '<path d="M8.5 11.5a2.8 2.8 0 0 0 2.8 2.8"/>' +
      '<path d="M16.2 14.5a2.4 2.4 0 0 0-1.5 3.4"/>' +
      '<path d="M8.5 7h5.5"/>'
  },
  {
    id: 'mittens',
    label: 'Варежки',
    paths:
      '<path d="M7.5 10.5a4.2 4.2 0 0 1 8.4 0v3.2l1.7-1.6a1.4 1.4 0 0 1 2 2l-3.7 3.9H7.5v-7.5Z"/>' +
      '<path d="M7 18h9.5v2.5H7z"/>'
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
      '<path d="M8.5 9.5V6c0-1.4 1.5-2.5 3.5-2.5s3.5 1.1 3.5 2.5v3.5"/>' +
      '<path d="M5 9.5c2 .8 12 .8 14 0l-1 9.5a2 2 0 0 1-2 1.8H8a2 2 0 0 1-2-1.8L5 9.5Z"/>' +
      '<path d="M9 14h6"/>'
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
