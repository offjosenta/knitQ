/**
 * Classic Liquid Glass accent colors for folders and projects.
 * @type {Array<{ id: string, label: string, hex: string }>}
 */
export const COLOR_PALETTE = [
  { id: 'green', label: 'Зелёный', hex: '#34c759' },
  { id: 'purple', label: 'Фиолетовый', hex: '#af52de' },
  { id: 'pink', label: 'Розовый', hex: '#ff2d55' },
  { id: 'blue', label: 'Голубой', hex: '#32ade6' },
  { id: 'gray', label: 'Серый', hex: '#8e8e93' },
  { id: 'red', label: 'Красный', hex: '#ff3b30' },
  { id: 'yellow', label: 'Жёлтый', hex: '#ffcc00' }
];

/**
 * 10 minimal vector icons for common knitted items.
 * @type {Array<{ id: string, label: string, paths: string }>}
 */
export const KNITTING_ICONS = [
  {
    id: 'yarn',
    label: 'Клубок',
    paths:
      '<circle cx="12" cy="12" r="7"/>' +
      '<path d="M7 9.5c2.8-.7 6.2.4 8.8 2.8"/>' +
      '<path d="M6.2 12.8c3.2-.8 6.8.4 9.3 3"/>' +
      '<path d="M16.5 16.5c1.5 1.2 2.8 1.2 4 .3"/>'
  },
  {
    id: 'hat',
    label: 'Шапка',
    paths:
      '<circle cx="12" cy="4.5" r="1.7"/>' +
      '<path d="M5.5 15c0-4.2 2.9-7.5 6.5-7.5s6.5 3.3 6.5 7.5"/>' +
      '<rect x="4" y="15" width="16" height="4" rx="1.8"/>'
  },
  {
    id: 'scarf',
    label: 'Шарф',
    paths:
      '<rect x="6" y="4" width="12" height="5" rx="2.5"/>' +
      '<path d="M8 9v10"/>' +
      '<path d="M12 9v8"/>' +
      '<path d="M16 9v10"/>' +
      '<path d="M8 15h8"/>'
  },
  {
    id: 'socks',
    label: 'Носки',
    paths:
      '<path d="M9 4h6v8.5l2.8 2.5a2.3 2.3 0 0 1-3 3.4l-4.5-3.4A2.5 2.5 0 0 1 9 12.8V4Z"/>' +
      '<path d="M9 7.5h6"/>'
  },
  {
    id: 'sweater',
    label: 'Свитер',
    paths:
      '<path d="M8.5 4h7l4 4-2.5 3-2-1.8V20H9V9.2L7 11 4.5 8l4-4Z"/>'
  },
  {
    id: 'mittens',
    label: 'Варежки',
    paths:
      '<path d="M8 10a4 4 0 0 1 8 0v4.5l2-1.8a1.5 1.5 0 0 1 2.2 2L16.5 19H8v-9Z"/>' +
      '<path d="M7.5 19h9.5v2H7.5z"/>'
  },
  {
    id: 'cardigan',
    label: 'Кардиган',
    paths:
      '<path d="M8.5 4 12 10l3.5-6h1l3.5 4-2.3 3-1.7-1.6V20H8V9.4L6.3 11 4 8l4.5-4Z"/>' +
      '<line x1="12" y1="10" x2="12" y2="20"/>'
  },
  {
    id: 'blanket',
    label: 'Плед',
    paths:
      '<rect x="5" y="5" width="14" height="14" rx="2.5"/>' +
      '<path d="M5 10h14"/>' +
      '<path d="M5 14h14"/>' +
      '<path d="M10 5v14"/>' +
      '<path d="M14 5v14"/>'
  },
  {
    id: 'bag',
    label: 'Сумка',
    paths:
      '<path d="M8.5 9V7a3.5 3.5 0 0 1 7 0v2"/>' +
      '<rect x="5" y="9" width="14" height="11" rx="2.5"/>'
  },
  {
    id: 'vest',
    label: 'Жилет',
    paths:
      '<path d="M8 4h2.2l1.8 4.2L13.8 4H16l2 5.5V20H6V9.5L8 4Z"/>'
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
