import { createThemeManager } from './core/theme-manager.js';
import { createWakeLockManager } from './core/wake-lock-manager.js';

export function initApp() {
  // 1. Initialize Theme Manager
  const themeManager = createThemeManager();

  // 2. Initialize Wake Lock Manager
  const wakeLockManager = createWakeLockManager();

  // 3. Register Service Worker for PWA Offline Mode
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

  // 4. UI Elements
  const settingsModal = document.getElementById('settings-modal');
  const openSettingsBtn = document.getElementById('btn-open-settings');
  const quickSettingsBtn = document.getElementById('btn-quick-settings');
  const closeSettingsBtn = document.getElementById('btn-close-settings');
  const themeListContainer = document.getElementById('theme-options-list');
  const rowWakeLock = document.getElementById('row-wake-lock');
  const wakeLockToggle = /** @type {HTMLInputElement | null} */ (document.getElementById('toggle-wake-lock'));

  // Render themes (Dark & Light)
  function renderThemeList() {
    if (!themeListContainer) return;
    const currentTheme = themeManager.getTheme();
    const themes = themeManager.getAvailableThemes();

    themeListContainer.innerHTML = '';
    themes.forEach((theme) => {
      const option = document.createElement('div');
      option.className = `theme-card-option ${theme.id === currentTheme ? 'active' : ''}`;
      option.setAttribute('data-theme-id', theme.id);
      option.innerHTML = `<span class="theme-card-name">${theme.name}</span>`;

      option.addEventListener('click', () => {
        themeManager.setTheme(theme.id);
        renderThemeList();
      });

      themeListContainer.appendChild(option);
    });
  }

  renderThemeList();

  // Modal open/close handlers
  function openModal() {
    if (!settingsModal) return;
    settingsModal.style.display = 'flex';
    // Force reflow for CSS transition
    void settingsModal.offsetHeight;
    settingsModal.classList.add('open');
  }

  function closeModal() {
    if (!settingsModal) return;
    settingsModal.classList.remove('open');
    setTimeout(() => {
      if (!settingsModal.classList.contains('open')) {
        settingsModal.style.display = 'none';
      }
    }, 280);
  }

  openSettingsBtn?.addEventListener('click', openModal);
  quickSettingsBtn?.addEventListener('click', openModal);
  closeSettingsBtn?.addEventListener('click', closeModal);

  settingsModal?.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      closeModal();
    }
  });

  // Wake Lock preference in localStorage
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

  // Clicking anywhere on the row toggles the switch
  rowWakeLock?.addEventListener('click', async () => {
    if (!wakeLockToggle) return;
    const nextState = !wakeLockToggle.checked;
    await setWakeLockState(nextState);
  });

  if (shouldAutoWakeLock && wakeLockManager.isSupported()) {
    wakeLockManager.request();
  }

  return {
    themeManager,
    wakeLockManager
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
