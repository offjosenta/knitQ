import { createThemeManager } from './core/theme-manager.js';
import { createWakeLockManager } from './core/wake-lock-manager.js';
import { createKnitStore } from './core/knit-store.js';
import {
  shouldTriggerStitchCheck,
  evaluateRowRules,
  getRowMarkersForRow
} from './core/checkpoint-engine.js';
import { formatDuration, formatRowTimestamp } from './core/time-format.js';

/**
 * Helper to manage iOS-style modal sheets with smooth open/close transitions.
 * @param {HTMLElement | null} modalEl
 * @param {{ onOpen?: () => void, onClose?: () => void }} [options]
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
    if (!modalEl.classList.contains('open')) return;
    modalEl.classList.remove('open');
    options.onClose?.();
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

  // Part Settings, Checkpoints, Rules & Markers Elements
  const rowHintsBarEl = document.getElementById('row-hints-bar');
  const btnOpenPartSettings = document.getElementById('btn-open-part-settings');
  const partSettingsModalEl = document.getElementById('part-settings-modal');
  const partSettingsScrollEl = /** @type {HTMLElement | null} */ (partSettingsModalEl?.querySelector('.part-settings-scroll') ?? null);
  attachScrollFade(partSettingsScrollEl);
  const btnClosePartSettings = document.getElementById('btn-close-part-settings');
  const inputStitchInterval = /** @type {HTMLInputElement | null} */ (document.getElementById('input-stitch-interval'));
  const inputTargetStitches = /** @type {HTMLInputElement | null} */ (document.getElementById('input-target-stitches'));
  const actualStitchStatusRow = document.getElementById('actual-stitch-status-row');
  const intervalPresetChips = Array.from(document.querySelectorAll('.preset-chip[data-interval]'));
  const rowRulesListEl = document.getElementById('row-rules-list');
  const formAddRule = /** @type {HTMLFormElement | null} */ (document.getElementById('form-add-rule'));
  const inputRuleLabel = /** @type {HTMLInputElement | null} */ (document.getElementById('input-rule-label'));
  const inputRuleEvery = /** @type {HTMLInputElement | null} */ (document.getElementById('input-rule-every'));
  const inputRuleStart = /** @type {HTMLInputElement | null} */ (document.getElementById('input-rule-start'));
  const inputRuleRepeat = /** @type {HTMLInputElement | null} */ (document.getElementById('input-rule-repeat'));
  const rowMarkersListEl = document.getElementById('row-markers-list');
  const formAddMarker = /** @type {HTMLFormElement | null} */ (document.getElementById('form-add-marker'));
  const inputMarkerRow = /** @type {HTMLInputElement | null} */ (document.getElementById('input-marker-row'));
  const inputMarkerText = /** @type {HTMLInputElement | null} */ (document.getElementById('input-marker-text'));

  // Stitch Check Modal Elements
  const stitchCheckModalEl = document.getElementById('stitch-check-modal');
  const btnCloseStitchCheck = document.getElementById('btn-close-stitch-check');
  const stitchCheckDescEl = document.getElementById('stitch-check-desc');
  const inputStitchCheckActual = /** @type {HTMLInputElement | null} */ (document.getElementById('input-stitch-check-actual'));
  const btnStitchCheckConfirm = document.getElementById('btn-stitch-check-confirm');
  const btnStitchCheckSave = document.getElementById('btn-stitch-check-save');

  // Row Marker Alert Modal Elements
  const rowMarkerModalEl = document.getElementById('row-marker-modal');
  const btnCloseRowMarker = document.getElementById('btn-close-row-marker');
  const btnAckRowMarker = document.getElementById('btn-ack-row-marker');
  const rowMarkerModalTitleEl = document.getElementById('row-marker-modal-title');
  const rowMarkerModalBodyEl = document.getElementById('row-marker-modal-body');

  /** @param {HTMLElement} scrollEl */
  function updateScrollFadeMask(scrollEl) {
    const { scrollTop, scrollHeight, clientHeight } = scrollEl;
    const canScroll = scrollHeight > clientHeight + 2;
    const atTop = scrollTop <= 2;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 2;
    scrollEl.classList.toggle('fade-top', canScroll && !atTop);
    scrollEl.classList.toggle('fade-bottom', canScroll && !atBottom);
  }

  /** @param {HTMLElement | null} scrollEl */
  function attachScrollFade(scrollEl) {
    if (!scrollEl) return;
    scrollEl.classList.add('scroll-fade');
    scrollEl.addEventListener('scroll', () => updateScrollFadeMask(scrollEl), { passive: true });
    requestAnimationFrame(() => updateScrollFadeMask(scrollEl));
  }

  // Render Row Log inside modal
  function renderRowLog() {
    if (!rowLogContentEl) return;
    const { rowLog } = store.getActivePart();

    if (rowLog.length === 0) {
      rowLogContentEl.innerHTML = '<div class="row-log-empty">Пока нет отмеченных рядов. Нажмите на экран, чтобы начать отсчёт.</div>';
      return;
    }

    const cardEl = document.createElement('div');
    cardEl.className = 'ios-grouped-section row-log-card';

    const scrollEl = document.createElement('div');
    scrollEl.className = 'row-log-scroll';
    attachScrollFade(scrollEl);

    // Show newest rows first so the knitter can immediately verify the latest click
    const entries = [...rowLog].reverse();
    entries.forEach((entry, index) => {
      if (index > 0) {
        const divider = document.createElement('div');
        divider.className = 'ios-divider';
        scrollEl.appendChild(divider);
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
      scrollEl.appendChild(rowEl);
    });

    cardEl.appendChild(scrollEl);
    rowLogContentEl.replaceChildren(cardEl);
    scrollEl.scrollTop = 0;
    requestAnimationFrame(() => updateScrollFadeMask(scrollEl));
  }

  /** @type {import('./core/checkpoint-engine.js').RowMarker[]} */
  let pendingMarkersAfterCheck = [];

  function flushPendingMarkersAfterCheck() {
    if (pendingMarkersAfterCheck.length > 0) {
      const markersToShow = [...pendingMarkersAfterCheck];
      const rowNum = store.getActivePart().currentRow;
      pendingMarkersAfterCheck = [];
      setTimeout(() => openRowMarkerModal(rowNum, markersToShow), 200);
    }
  }

  // Modal Controllers
  const settingsModal = createModalController(settingsModalEl);
  const rowLogModal = createModalController(rowLogModalEl, { onOpen: renderRowLog });
  const resetConfirmModal = createModalController(resetConfirmModalEl);
  const partSettingsModal = createModalController(partSettingsModalEl, { onOpen: renderPartSettings });
  const stitchCheckModal = createModalController(stitchCheckModalEl, { onClose: flushPendingMarkersAfterCheck });
  const rowMarkerModal = createModalController(rowMarkerModalEl);

  /**
   * @param {{ title: string, subtitle?: string, ariaLabel: string, onRemove: () => void }} opts
   */
  function createSettingsListItem(opts) {
    const item = document.createElement('div');
    item.className = 'settings-list-item';

    const main = document.createElement('div');
    main.className = 'settings-list-item-main';

    const titleEl = document.createElement('span');
    titleEl.className = 'settings-list-item-title';
    titleEl.textContent = opts.title;
    main.appendChild(titleEl);

    if (opts.subtitle) {
      const subEl = document.createElement('span');
      subEl.className = 'settings-list-item-sub';
      subEl.textContent = opts.subtitle;
      main.appendChild(subEl);
    }

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn-remove-item';
    delBtn.setAttribute('aria-label', opts.ariaLabel);
    delBtn.textContent = '×';
    delBtn.addEventListener('click', opts.onRemove);

    item.append(main, delBtn);
    return item;
  }

  function renderPartSettings() {
    const part = store.getActivePart();
    const interval = part.stitchCheckInterval ?? 0;

    if (inputStitchInterval) {
      inputStitchInterval.value = interval > 0 ? String(interval) : '';
    }
    intervalPresetChips.forEach((chip) => {
      const chipVal = Number(chip.getAttribute('data-interval'));
      chip.classList.toggle('active', chipVal === interval);
    });

    if (inputTargetStitches) {
      inputTargetStitches.value = part.targetStitchCount !== null ? String(part.targetStitchCount) : '';
    }

    if (actualStitchStatusRow) {
      if (part.actualStitchCount !== null) {
        actualStitchStatusRow.hidden = false;
        actualStitchStatusRow.textContent = `Последний пересчёт на спицах: ${part.actualStitchCount} п.`;
      } else {
        actualStitchStatusRow.hidden = true;
      }
    }

    if (rowRulesListEl) {
      if (part.rowRules.length === 0) {
        rowRulesListEl.innerHTML = '<div class="ios-row-sub-info">Правила ряда пока не заданы.</div>';
      } else {
        rowRulesListEl.replaceChildren(
          ...part.rowRules.map((rule) => {
            const repeatText = rule.repeatCount ? `, ${rule.repeatCount} раз(а)` : '';
            return createSettingsListItem({
              title: rule.label,
              subtitle: `Каждые ${rule.everyNRows} р. с ${rule.startRow || 1}-го ряда${repeatText}`,
              ariaLabel: 'Удалить правило',
              onRemove: () => {
                store.removeRowRule(rule.id);
                renderPartSettings();
              }
            });
          })
        );
      }
    }

    if (rowMarkersListEl) {
      if (part.rowMarkers.length === 0) {
        rowMarkersListEl.innerHTML = '<div class="ios-row-sub-info">Маркеры рядов пока не заданы.</div>';
      } else {
        rowMarkersListEl.replaceChildren(
          ...part.rowMarkers.map((marker) =>
            createSettingsListItem({
              title: `Ряд ${marker.rowNumber}: ${marker.text}`,
              ariaLabel: 'Удалить маркер',
              onRemove: () => {
                store.removeRowMarker(marker.id);
                renderPartSettings();
              }
            })
          )
        );
      }
    }

    if (partSettingsScrollEl) {
      requestAnimationFrame(() => updateScrollFadeMask(partSettingsScrollEl));
    }
  }

  /**
   * @param {number} rowNumber
   * @param {import('./core/checkpoint-engine.js').RowMarker[]} markers
   */
  function openRowMarkerModal(rowNumber, markers) {
    if (rowMarkerModalTitleEl) {
      rowMarkerModalTitleEl.textContent = `Маркер ряда ${rowNumber}`;
    }
    if (rowMarkerModalBodyEl) {
      rowMarkerModalBodyEl.replaceChildren(
        ...markers.map((marker) => {
          const card = document.createElement('div');
          card.className = 'row-marker-alert-card';
          card.textContent = marker.text;
          return card;
        })
      );
    }
    rowMarkerModal.open();
  }

  btnOpenPartSettings?.addEventListener('click', partSettingsModal.open);
  btnClosePartSettings?.addEventListener('click', partSettingsModal.close);

  intervalPresetChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const val = Number(chip.getAttribute('data-interval'));
      store.updatePartCheckSettings({ stitchCheckInterval: val > 0 ? val : null });
      renderPartSettings();
    });
  });

  inputStitchInterval?.addEventListener('change', () => {
    const val = Number(inputStitchInterval.value);
    store.updatePartCheckSettings({ stitchCheckInterval: val > 0 ? val : null });
    renderPartSettings();
  });

  inputTargetStitches?.addEventListener('change', () => {
    const raw = inputTargetStitches.value.trim();
    const val = raw === '' ? null : Number(raw);
    store.updatePartCheckSettings({
      targetStitchCount: val !== null && !Number.isNaN(val) && val >= 0 ? val : null
    });
    renderPartSettings();
  });

  formAddRule?.addEventListener('submit', (e) => {
    e.preventDefault();
    const label = inputRuleLabel?.value.trim() || '';
    if (!label) return;
    const everyNRows = Number(inputRuleEvery?.value) || 2;
    const startRow = Number(inputRuleStart?.value) || 1;
    const repeatRaw = inputRuleRepeat?.value.trim() || '';
    const repeatCount = repeatRaw ? Number(repeatRaw) : null;

    store.addRowRule({ label, everyNRows, startRow, repeatCount });
    if (inputRuleLabel) inputRuleLabel.value = '';
    if (inputRuleRepeat) inputRuleRepeat.value = '';
    renderPartSettings();
  });

  formAddMarker?.addEventListener('submit', (e) => {
    e.preventDefault();
    const rowNum = Number(inputMarkerRow?.value);
    const text = inputMarkerText?.value.trim() || '';
    if (!rowNum || rowNum < 1 || !text) return;

    store.addRowMarker(rowNum, text);
    if (inputMarkerRow) inputMarkerRow.value = '';
    if (inputMarkerText) inputMarkerText.value = '';
    renderPartSettings();
  });

  btnCloseStitchCheck?.addEventListener('click', stitchCheckModal.close);
  btnStitchCheckConfirm?.addEventListener('click', () => {
    const target = store.getActivePart().targetStitchCount;
    if (target !== null) {
      store.setActualStitchCount(target);
    }
    stitchCheckModal.close();
  });
  btnStitchCheckSave?.addEventListener('click', () => {
    const raw = inputStitchCheckActual?.value.trim() ?? '';
    if (raw !== '') {
      const val = Number(raw);
      if (!Number.isNaN(val) && val >= 0) {
        store.setActualStitchCount(val);
      }
    }
    stitchCheckModal.close();
  });

  btnCloseRowMarker?.addEventListener('click', rowMarkerModal.close);
  btnAckRowMarker?.addEventListener('click', rowMarkerModal.close);

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

    if (rowHintsBarEl) {
      const evaluatedRules = evaluateRowRules(part.currentRow, part.rowRules);
      const activeMarkers = getRowMarkersForRow(part.currentRow, part.rowMarkers);
      /** @type {HTMLElement[]} */
      const pills = [];

      for (const ruleHint of evaluatedRules) {
        const pill = document.createElement('span');
        pill.className = `row-hint-pill ${ruleHint.isAction ? 'action' : ''}`;
        const progress = ruleHint.isAction && ruleHint.totalRepeats
          ? ` (${ruleHint.occurrence}/${ruleHint.totalRepeats})`
          : '';
        pill.textContent = `${ruleHint.text}${progress}`;
        pills.push(pill);
      }

      for (const marker of activeMarkers) {
        const pill = document.createElement('span');
        pill.className = 'row-hint-pill marker';
        pill.textContent = `Ряд ${marker.rowNumber}: ${marker.text}`;
        pills.push(pill);
      }

      if (pills.length > 0) {
        rowHintsBarEl.hidden = false;
        rowHintsBarEl.replaceChildren(...pills);
      } else {
        rowHintsBarEl.hidden = true;
        rowHintsBarEl.replaceChildren();
      }
    }

    renderTimer();
  }

  // Giant Tap Zone (+1 row)
  const tapZoneCard = tapZonePlus?.closest('.tap-zone-card');
  function handleTapIncrement() {
    store.incrementRow();
    if (tapZoneCard) {
      tapZoneCard.classList.add('tapped');
      setTimeout(() => tapZoneCard.classList.remove('tapped'), 130);
    }

    const part = store.getActivePart();
    const needsStitchCheck =
      part.targetStitchCount !== null
      && part.targetStitchCount > 0
      && shouldTriggerStitchCheck(part.currentRow, part.stitchCheckInterval);
    const activeMarkers = getRowMarkersForRow(part.currentRow, part.rowMarkers);

    if (needsStitchCheck) {
      pendingMarkersAfterCheck = activeMarkers;
      if (stitchCheckDescEl) {
        stitchCheckDescEl.textContent = `Ряд ${part.currentRow}: пора пересчитать петли на спицах! Должно быть: ${part.targetStitchCount} петель.`;
      }
      if (inputStitchCheckActual) {
        inputStitchCheckActual.value = String(part.targetStitchCount);
      }
      if (btnStitchCheckConfirm) {
        btnStitchCheckConfirm.textContent = `Всё сходится (${part.targetStitchCount})`;
      }
      stitchCheckModal.open();
    } else if (activeMarkers.length > 0) {
      openRowMarkerModal(part.currentRow, activeMarkers);
    }
  }

  tapZonePlus?.addEventListener('click', handleTapIncrement);

  // -1 Button
  btnRowMinus?.addEventListener('click', () => {
    store.decrementRow();
  });

  // Timer Play/Pause Button
  btnTimerToggle?.addEventListener('click', () => {
    store.toggleTimer();
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
