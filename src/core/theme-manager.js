/**
 * @typedef {'liquid-silver' | 'light-minimal'} ThemeId
 */

/**
 * @type {ReadonlyArray<{ id: ThemeId, name: string }>}
 */
export const THEMES = Object.freeze([
  {
    id: 'liquid-silver',
    name: 'Тёмная'
  },
  {
    id: 'light-minimal',
    name: 'Светлая'
  }
]);

export const DEFAULT_THEME = 'liquid-silver';
export const STORAGE_KEY = 'knit_theme';

export const THEME_COLORS = {
  'liquid-silver': '#000000',
  'light-minimal': '#f2f2f7'
};

/**
 * @param {object} [options]
 * @param {Storage | { getItem: (key: string) => string | null, setItem: (key: string, value: string) => void }} [options.storage]
 * @param {{ setAttribute: (name: string, value: string) => void, getAttribute?: (name: string) => string | null }} [options.documentElement]
 */
export function createThemeManager(options = {}) {
  const storage = options.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
  const documentElement = options.documentElement || (typeof document !== 'undefined' ? document.documentElement : null);

  /** @type {ThemeId} */
  let currentTheme = DEFAULT_THEME;

  const validThemeIds = new Set(THEMES.map((t) => t.id));

  // Initialize from storage if present
  if (storage) {
    try {
      const stored = storage.getItem(STORAGE_KEY);
      if (stored && validThemeIds.has(/** @type {ThemeId} */ (stored))) {
        currentTheme = /** @type {ThemeId} */ (stored);
      }
    } catch {
      // Fallback silently
    }
  }

  const applyTheme = (/** @type {ThemeId} */ themeId) => {
    if (documentElement && typeof documentElement.setAttribute === 'function') {
      documentElement.setAttribute('data-theme', themeId);
    }
    // Update theme-color meta tag for seamless iOS status bar matching
    if (typeof document !== 'undefined') {
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', THEME_COLORS[themeId] || '#000000');
      }
    }
  };

  applyTheme(currentTheme);

  return {
    /**
     * @returns {ThemeId}
     */
    getTheme() {
      return currentTheme;
    },

    /**
     * @param {ThemeId | string} themeId
     */
    setTheme(themeId) {
      if (!validThemeIds.has(/** @type {ThemeId} */ (themeId))) {
        throw new Error(`Invalid theme: "${themeId}". Valid themes are: ${Array.from(validThemeIds).join(', ')}`);
      }

      currentTheme = /** @type {ThemeId} */ (themeId);

      if (storage) {
        try {
          storage.setItem(STORAGE_KEY, currentTheme);
        } catch {
          // Ignore storage quota errors
        }
      }

      applyTheme(currentTheme);
    },

    /**
     * @returns {ReadonlyArray<{ id: ThemeId, name: string }>}
     */
    getAvailableThemes() {
      return THEMES;
    }
  };
}
