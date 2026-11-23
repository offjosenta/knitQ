import { createThemeManager } from './core/theme-manager.js';
import { createWakeLockManager } from './core/wake-lock-manager.js';
import { createHapticManager } from './core/haptic-manager.js';
import { createKnitStore } from './core/knit-store.js';
import { formatDuration, formatRowTimestamp } from './core/time-format.js';

const HAPTIC_PATTERNS = Object.freeze({
  ROW_INCREMENT: 12,
  ROW_DECREMENT: 8,
  TIMER_TOGGLE: 10,
  RESET: [15, 30, 15],
  SETTINGS_ENABLE: 12
});

/**
 * Helper to manage iOS-style modal sheets with smooth open/close transitions.
 * @param {HTMLElement | null} modalEl
 * @param {{ onOpen?: () => void }} [options]
 */
function createModalController(modalEl, options = {}) {
  const open = () => {
    if (!modalEl) return;
    options.onOpen?.();
    modalEl.style.display = 'flex';
    void modalEl.offsetHeight;
    modalEl.classList.add('open');
  };

  const close = () => {
    if (!modalEl) return;
    modalEl.classList.remove('open');
    setTimeout(() => {
      if (!modalEl.classList.contains('open')) {
        modalEl.style.display = 'none';
      }
    }, 280);
  };

  modalEl?.addEventListener('click', (e) => {
    if (e.target === modalEl) {
      close();
    }
  });

  return { open, close };
}

export function initApp() {
  const themeManager = createThemeManager();
  const wakeLockManager = createWakeLockManager();
  const hapticManager = createHapticManager();
  const store = createKnitStore();

  // Register Service Worker for PWA Offline Mode
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    });
  }

  // Settings Elements
  const settingsModalEl = document.getElementById('settings-modal');
  const openSettingsBtn = document.getElementById('btn-open-settings');
  const closeSettingsBtn = document.getElementById('btn-close-settings');
  const rowWakeLock = document.getElementById('row-wake-lock');
  const wakeLockToggle = /** @type {HTMLInputElement | null} */ (document.getElementById('toggle-wake-lock'));
  const rowHaptic = document.getElementById('row-haptic');
  const hapticToggle = /** @type {HTMLInputElement | null} */ (document.getElementById('toggle-haptic'));
  const rowThemeToggle = document.getElementById('row-theme-toggle');

  // Active Knitting Elements
  const activeProjectNameEl = document.getElementById('active-project-name');
  const activePartNameEl = document.getElementById('active-part-name');
  const tapZonePlus = document.getElementById('tap-zone-plus');
  const rowCounterValueEl = document.getElementById('row-counter-value');
  const btnRowLog = document.getElementById('btn-row-log');
  const btnRowMinus = /** @type {HTMLButtonElement | null} */ (document.getElementById('btn-row-minus'));
  const btnTimerToggle = document.getElementById('btn-timer-toggle');
  const timerDisplayEl = document.getElementById('timer-display');
  const btnRowReset = /** @type {HTMLButtonElement | null} */ (document.getElementById('btn-row-reset'));

  // Row Log Modal Elements
  const rowLogModalEl = document.getElementById('row-log-modal');
  const btnCloseRowLog = document.getElementById('btn-close-row-log');
  const rowLogContentEl = document.getElementById('row-log-content');

  // Reset Confirm Modal Elements
  const resetConfirmModalEl = document.getElementById('reset-confirm-modal');
  const btnCloseResetConfirm = document.getElementById('btn-close-reset-confirm');
  const btnCancelReset = document.getElementById('btn-cancel-reset');
  const btnConfirmReset = document.getElementById('btn-confirm-reset');

  // Render Row Log inside modal
  function renderRowLog() {
    if (!rowLogContentEl) return;
    const { rowLog } = store.getActivePart();

    if (rowLog.length === 0) {
      rowLogContentEl.innerHTML = '<div class="row-log-empty">Пока нет отмеченных рядов. Нажмите на экран, чтобы начать отсчёт.</div>';
      return;
    }

    const listContainer = document.createElement('div');
    listContainer.className = 'ios-grouped-section';

    // Show newest rows first so the knitter can immediately verify the latest click
    const entries = [...rowLog].reverse();
    entries.forEach((entry, index) => {
      if (index > 0) {
        const divider = document.createElement('div');
        divider.className = 'ios-divider';
        listContainer.appendChild(divider);
      }

      const rowEl = document.createElement('div');
      rowEl.className = 'row-log-item';

      const numberEl = document.createElement('span');
      numberEl.className = 'row-log-number';
      numberEl.textContent = `Ряд ${entry.rowNumber}`;

      const metaEl = document.createElement('div');
      metaEl.className = 'row-log-meta';

      const formatted = formatRowTimestamp(entry.timestamp);
      const timeEl = document.createElement('span');
      timeEl.className = 'row-log-time';
      timeEl.textContent = formatted.time;

      const dateEl = document.createElement('span');
      dateEl.className = 'row-log-date';
      dateEl.textContent = formatted.date;

      metaEl.append(timeEl, dateEl);
      rowEl.append(numberEl, metaEl);
      listContainer.appendChild(rowEl);
    });

    rowLogContentEl.replaceChildren(listContainer);
  }

  // Modal Controllers
  const settingsModal = createModalController(settingsModalEl);
  const rowLogModal = createModalController(rowLogModalEl, { onOpen: renderRowLog });
  const resetConfirmModal = createModalController(resetConfirmModalEl);

  openSettingsBtn?.addEventListener('click', settingsModal.open);
  closeSettingsBtn?.addEventListener('click', settingsModal.close);

  btnRowLog?.addEventListener('click', (e) => {
    e.stopPropagation();
    rowLogModal.open();
  });
  btnCloseRowLog?.addEventListener('click', rowLogModal.close);

  btnRowReset?.addEventListener('click', (e) => {
    e.stopPropagation();
    resetConfirmModal.open();
  });
  btnCloseResetConfirm?.addEventListener('click', resetConfirmModal.close);
  btnCancelReset?.addEventListener('click', resetConfirmModal.close);
  btnConfirmReset?.addEventListener('click', () => {
    store.resetPart();
    hapticManager.trigger(HAPTIC_PATTERNS.RESET);
    resetConfirmModal.close();
  });

  // Theme Toggle
  rowThemeToggle?.addEventListener('click', () => {
    const nextTheme = themeManager.getTheme() === 'liquid-silver' ? 'light-minimal' : 'liquid-silver';
    themeManager.setTheme(nextTheme);
  });

  // Wake Lock preference
  const WAKE_LOCK_PREF_KEY = 'knit_wake_lock_enabled';
  const shouldAutoWakeLock = localStorage.getItem(WAKE_LOCK_PREF_KEY) !== 'false';

  async function setWakeLockState(/** @type {boolean} */ enabled) {
    if (wakeLockToggle) {
      wakeLockToggle.checked = enabled;
    }
    localStorage.setItem(WAKE_LOCK_PREF_KEY, String(enabled));
    if (enabled) {
      await wakeLockManager.request();
    } else {
      await wakeLockManager.release();
    }
  }

  if (wakeLockToggle) {
    wakeLockToggle.checked = shouldAutoWakeLock;
  }

  rowWakeLock?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!wakeLockToggle) return;
    await setWakeLockState(!wakeLockToggle.checked);
  });

  if (shouldAutoWakeLock && wakeLockManager.isSupported()) {
    wakeLockManager.request();
  }

  // Haptic preference (off by default)
  if (hapticToggle) {
    hapticToggle.checked = hapticManager.isEnabled();
  }

  rowHaptic?.addEventListener('click', (e) => {
    e.preventDefault();
    const nextState = !hapticManager.isEnabled();
    hapticManager.setEnabled(nextState);
    if (hapticToggle) {
      hapticToggle.checked = nextState;
    }
    if (nextState) {
      hapticManager.trigger(HAPTIC_PATTERNS.SETTINGS_ENABLE);
    }
  });

  // Render active knitting UI
  function renderTimer() {
    if (timerDisplayEl) {
      timerDisplayEl.textContent = formatDuration(store.getElapsedMs());
    }
    if (btnTimerToggle) {
      btnTimerToggle.classList.toggle('running', store.isTimerRunning());
    }
  }

  function renderKnittingState() {
    const project = store.getActiveProject();
    const part = store.getActivePart();

    if (activeProjectNameEl) {
      activeProjectNameEl.textContent = project.name;
    }
    if (activePartNameEl) {
      activePartNameEl.textContent = part.name;
    }
    if (rowCounterValueEl) {
      rowCounterValueEl.textContent = String(part.currentRow);
    }
    if (btnRowMinus) {
      btnRowMinus.disabled = part.currentRow <= 0;
    }
    if (btnRowReset) {
      btnRowReset.disabled = part.currentRow === 0 && store.getElapsedMs() === 0;
    }
    renderTimer();
  }

  // Giant Tap Zone (+1 row)
  const tapZoneCard = tapZonePlus?.closest('.tap-zone-card');
  function handleTapIncrement() {
    store.incrementRow();
    hapticManager.trigger(HAPTIC_PATTERNS.ROW_INCREMENT);
    if (tapZoneCard) {
      tapZoneCard.classList.add('tapped');
      setTimeout(() => tapZoneCard.classList.remove('tapped'), 130);
    }
  }

  tapZonePlus?.addEventListener('click', handleTapIncrement);

  // -1 Button
  btnRowMinus?.addEventListener('click', () => {
    store.decrementRow();
    hapticManager.trigger(HAPTIC_PATTERNS.ROW_DECREMENT);
  });

  // Timer Play/Pause Button
  btnTimerToggle?.addEventListener('click', () => {
    store.toggleTimer();
    hapticManager.trigger(HAPTIC_PATTERNS.TIMER_TOGGLE);
  });

  // Live timer tick
  setInterval(() => {
    if (store.isTimerRunning()) {
      renderTimer();
    }
  }, 500);

  store.subscribe(renderKnittingState);
  renderKnittingState();

  return {
    themeManager,
    wakeLockManager,
    hapticManager,
    store
  };
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initApp();
    });
  } else {
    initApp();
  }
}
