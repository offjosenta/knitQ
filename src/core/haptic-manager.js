export const HAPTIC_STORAGE_KEY = 'knit_haptic_enabled';

/**
 * @typedef {{
 *   isEnabled: () => boolean,
 *   setEnabled: (enabled: boolean) => void,
 *   trigger: (pattern?: number | number[]) => boolean,
 *   isSupported: () => boolean
 * }} HapticManager
 */

/**
 * @param {object} [options]
 * @param {{ getItem: (key: string) => string | null, setItem: (key: string, value: string) => void } | null} [options.storage]
 * @param {{ vibrate?: (pattern: number | number[]) => boolean } | null} [options.navigator]
 * @returns {HapticManager}
 */
export function createHapticManager(options = {}) {
  const storage = options.storage !== undefined
    ? options.storage
    : (typeof localStorage !== 'undefined' ? localStorage : null);
  const nav = options.navigator !== undefined
    ? options.navigator
    : (typeof navigator !== 'undefined' ? navigator : null);

  let enabled = false;

  if (storage) {
    try {
      enabled = storage.getItem(HAPTIC_STORAGE_KEY) === 'true';
    } catch {
      enabled = false;
    }
  }

  const isSupported = () => {
    return Boolean(nav && typeof nav.vibrate === 'function');
  };

  return {
    isEnabled() {
      return enabled;
    },

    setEnabled(nextEnabled) {
      enabled = Boolean(nextEnabled);
      if (storage) {
        try {
          storage.setItem(HAPTIC_STORAGE_KEY, String(enabled));
        } catch {
          // Ignore storage quota errors
        }
      }
    },

    trigger(pattern = 10) {
      if (!enabled || !isSupported() || !nav?.vibrate) {
        return false;
      }
      try {
        return nav.vibrate(pattern);
      } catch {
        return false;
      }
    },

    isSupported
  };
}
