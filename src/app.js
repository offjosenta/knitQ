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
  const wakeLockToggle = /** @type {HTMLInputElement | null} */ (document.getElementById('toggle-wake-lock'));
  const wakeLockStatus = document.getElementById('wake-lock-status-pill');
  const wakeLockDot = document.getElementById('wake-lock-dot');
  const wakeLockText = document.getElementById('wake-lock-text');
  const offlineStatusPill = document.getElementById('offline-status-pill');

  // Render themes
  function renderThemeList() {
    if (!themeListContainer) return;
    const currentTheme = themeManager.getTheme();
    const themes = themeManager.getAvailableThemes();

    themeListContainer.innerHTML = '';
    themes.forEach((theme) => {
      const option = document.createElement('div');
      option.className = `theme-card-option ${theme.id === currentTheme ? 'active' : ''}`;
      option.setAttribute('data-theme-id', theme.id);
      option.innerHTML = `
        <div class="theme-card-info">
          <span class="theme-card-name">${theme.name}</span>
          <span class="theme-card-sub">${theme.description}</span>
        </div>
        <div class="theme-check-icon"></div>
      `;

      option.addEventListener('click', () => {
        themeManager.setTheme(theme.id);
        renderThemeList();
      });

      themeListContainer.appendChild(option);
    });
  }

  renderThemeList();

  // Settings Modal handlers
  openSettingsBtn?.addEventListener('click', () => {
    settingsModal?.classList.add('open');
  });

  quickSettingsBtn?.addEventListener('click', () => {
    settingsModal?.classList.add('open');
  });

  closeSettingsBtn?.addEventListener('click', () => {
    settingsModal?.classList.remove('open');
  });

  settingsModal?.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.remove('open');
    }
  });

  // Screen Wake Lock UI Handling
  /**
   * @param {boolean} isActive
   */
  function updateWakeLockUI(isActive) {
    if (wakeLockDot) {
      wakeLockDot.classList.toggle('active', isActive);
    }
    if (wakeLockText) {
      wakeLockText.textContent = isActive ? 'Экран: активен' : 'Экран: авто';
    }
    if (wakeLockToggle) {
      wakeLockToggle.checked = isActive;
    }
  }

  // Wake Lock preference in localStorage (default to enabled for knitting)
  const WAKE_LOCK_PREF_KEY = 'knit_wake_lock_enabled';
  const shouldAutoWakeLock = localStorage.getItem(WAKE_LOCK_PREF_KEY) !== 'false';

  if (wakeLockToggle) {
    wakeLockToggle.checked = shouldAutoWakeLock;
    wakeLockToggle.addEventListener('change', async () => {
      const enabled = wakeLockToggle.checked;
      localStorage.setItem(WAKE_LOCK_PREF_KEY, String(enabled));
      if (enabled) {
        await wakeLockManager.request();
      } else {
        await wakeLockManager.release();
      }
      updateWakeLockUI(wakeLockManager.isActive());
    });
  }

  if (shouldAutoWakeLock && wakeLockManager.isSupported()) {
    wakeLockManager.request().then((active) => {
      updateWakeLockUI(active);
    });
  } else {
    updateWakeLockUI(false);
  }

  // Network Offline/Online status detection
  function updateOnlineStatus() {
    if (offlineStatusPill) {
      if (navigator.onLine) {
        offlineStatusPill.style.display = 'none';
      } else {
        offlineStatusPill.style.display = 'inline-flex';
      }
    }
  }

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  return {
    themeManager,
    wakeLockManager
  };
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initApp();
  });
}
