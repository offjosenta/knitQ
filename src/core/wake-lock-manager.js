/**
 * @typedef {{
 *   request: () => Promise<boolean>,
 *   release: () => Promise<void>,
 *   isActive: () => boolean,
 *   isSupported: () => boolean
 * }} WakeLockManager
 */

/**
 * @param {object} [options]
 * @param {Navigator | { wakeLock?: { request: (type: 'screen') => Promise<any> } }} [options.navigator]
 * @param {Document | { visibilityState: string, addEventListener: (event: string, handler: Function) => void, removeEventListener?: (event: string, handler: Function) => void }} [options.document]
 * @returns {WakeLockManager}
 */
export function createWakeLockManager(options = {}) {
  const nav = options.navigator || (typeof navigator !== 'undefined' ? navigator : null);
  const doc = options.document || (typeof document !== 'undefined' ? document : null);

  /** @type {any} */
  let wakeLockSentinel = null;
  let desiredActive = false;

  const isSupported = () => {
    return Boolean(nav && 'wakeLock' in nav && nav.wakeLock && typeof nav.wakeLock.request === 'function');
  };

  /**
   * @returns {Promise<boolean>}
   */
  const request = async () => {
    desiredActive = true;
    if (!isSupported() || !nav?.wakeLock) {
      return false;
    }

    try {
      if (wakeLockSentinel && !wakeLockSentinel.released) {
        return true;
      }

      wakeLockSentinel = await nav.wakeLock.request('screen');

      wakeLockSentinel.addEventListener?.('release', () => {
        wakeLockSentinel = null;
      });

      return true;
    } catch {
      wakeLockSentinel = null;
      return false;
    }
  };

  /**
   * @returns {Promise<void>}
   */
  const release = async () => {
    desiredActive = false;
    if (wakeLockSentinel) {
      try {
        await wakeLockSentinel.release();
      } catch {
        // Ignore release errors
      } finally {
        wakeLockSentinel = null;
      }
    }
  };

  const isActive = () => {
    return Boolean(wakeLockSentinel && !wakeLockSentinel.released);
  };

  // Re-acquire wake lock if tab regains visibility
  if (doc && typeof doc.addEventListener === 'function') {
    doc.addEventListener('visibilitychange', async () => {
      if (desiredActive && doc.visibilityState === 'visible') {
        if (!wakeLockSentinel || wakeLockSentinel.released) {
          wakeLockSentinel = null;
          await request();
        }
      }
    });
  }

  return {
    request,
    release,
    isActive,
    isSupported
  };
}
