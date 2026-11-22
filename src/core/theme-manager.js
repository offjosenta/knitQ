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
      // Fallback silently if storage access fails
    }
  }

  // Apply to document element
  if (documentElement && typeof documentElement.setAttribute === 'function') {
    documentElement.setAttribute('data-theme', currentTheme);
  }

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
          // Ignore storage quota/permission errors
        }
      }

      if (documentElement && typeof documentElement.setAttribute === 'function') {
        documentElement.setAttribute('data-theme', currentTheme);
      }
    },

    /**
     * @returns {ReadonlyArray<{ id: ThemeId, name: string }>}
     */
    getAvailableThemes() {
      return THEMES;
    }
  };
}
