import { createThemeManager } from './core/theme-manager.js';
import { createWakeLockManager } from './core/wake-lock-manager.js';
import { createKnitStore } from './core/knit-store.js';
import { createBackupPayload, parseAndValidateBackup } from './core/backup-manager.js';
import {
  shouldTriggerStitchCheck,
  evaluateRowRules,
  getRowMarkersForRow
} from './core/checkpoint-engine.js';
import {
  calculateGaugeMetrics,
  calculateTargetCounts
} from './core/gauge-calculator.js';
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

  // Navigation & Dashboard Elements
  const dashboardViewEl = document.getElementById('dashboard-view');
  const dashboardScrollEl = document.getElementById('dashboard-scroll');
  attachScrollFade(dashboardScrollEl);
  const appMainEl = document.getElementById('app-main');
  const btnBackDashboard = document.getElementById('btn-back-dashboard');
  const btnContinueKnitting = document.getElementById('btn-continue-knitting');
  const heroFolderBadgeEl = document.getElementById('hero-folder-badge');
  const heroActiveTimeEl = document.getElementById('hero-active-time');
  const heroProjectTitleEl = document.getElementById('hero-project-title');
  const heroProjectMetaEl = document.getElementById('hero-project-meta');
  const statTodayRowsEl = document.getElementById('stat-today-rows');
  const statTodayTimeEl = document.getElementById('stat-today-time');
  const statMonthTimeEl = document.getElementById('stat-month-time');
  const statTotalTimeEl = document.getElementById('stat-total-time');
  const statCompletedCountEl = document.getElementById('stat-completed-count');
  const btnNewProject = document.getElementById('btn-new-project');
  const catalogStatusTabs = Array.from(document.querySelectorAll('[data-catalog-status]'));
  const catalogFolderChipsEl = document.getElementById('catalog-folder-chips');
  const catalogTagChipsEl = document.getElementById('catalog-tag-chips');
  const projectsCatalogListEl = document.getElementById('projects-catalog-list');

  // New Project Modal Elements
  const newProjectModalEl = document.getElementById('new-project-modal');
  const btnCloseNewProject = document.getElementById('btn-close-new-project');
  const formNewProject = /** @type {HTMLFormElement | null} */ (document.getElementById('form-new-project'));
  const inputNewProjectName = /** @type {HTMLInputElement | null} */ (document.getElementById('input-new-project-name'));
  const inputNewProjectTags = /** @type {HTMLInputElement | null} */ (document.getElementById('input-new-project-tags'));
  const inputNewProjectNeedle = /** @type {HTMLInputElement | null} */ (document.getElementById('input-new-project-needle'));
  const templateCardButtons = Array.from(document.querySelectorAll('[data-template]'));
  const newFolderChips = Array.from(document.querySelectorAll('[data-new-folder]'));
  const newToolChips = Array.from(document.querySelectorAll('[data-new-tool]'));

  // Settings & Backup Elements
  const settingsModalEl = document.getElementById('settings-modal');
  const openSettingsBtn = document.getElementById('btn-open-settings');
  const closeSettingsBtn = document.getElementById('btn-close-settings');
  const rowWakeLock = document.getElementById('row-wake-lock');
  const wakeLockToggle = /** @type {HTMLInputElement | null} */ (document.getElementById('toggle-wake-lock'));
  const rowThemeToggle = document.getElementById('row-theme-toggle');
  const btnExportBackup = document.getElementById('btn-export-backup');
  const inputImportBackup = /** @type {HTMLInputElement | null} */ (document.getElementById('input-import-backup'));
  const backupStatusMsgEl = document.getElementById('backup-status-msg');

  // Active Knitting Elements
  const activeProjectNameEl = document.getElementById('active-project-name');
  const activePartNameEl = document.getElementById('active-part-name');
  const activePartSelectWrap = document.getElementById('active-part-select-wrap');
  const activePartSelectLabel = document.getElementById('active-part-select-label');
  const activePartSelect = /** @type {HTMLSelectElement | null} */ (document.getElementById('active-part-select'));
  const tapZonePlus = document.getElementById('tap-zone-plus');
  const rowCounterValueEl = document.getElementById('row-counter-value');
  const rowGoalPillEl = document.getElementById('row-goal-pill');
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

  // Part Settings, Checkpoints, Rules & Markers Elements (inside Project Parameters sheet)
  const rowHintsBarEl = document.getElementById('row-hints-bar');
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

  // Gauge & Wet-Blocking Calculator Modal Elements
  const btnOpenGauge = document.getElementById('btn-open-gauge');
  const gaugeModalEl = document.getElementById('gauge-modal');
  const gaugeScrollEl = /** @type {HTMLElement | null} */ (gaugeModalEl?.querySelector('.gauge-scroll') ?? null);
  attachScrollFade(gaugeScrollEl);
  const btnCloseGauge = document.getElementById('btn-close-gauge');

  // Project Parameters Modal Elements
  const btnOpenPassport = document.getElementById('btn-open-passport');
  const passportModalEl = document.getElementById('passport-modal');
  const passportScrollEl = /** @type {HTMLElement | null} */ (passportModalEl?.querySelector('.passport-scroll') ?? null);
  attachScrollFade(passportScrollEl);
  const btnClosePassport = document.getElementById('btn-close-passport');
  const inputProjectName = /** @type {HTMLInputElement | null} */ (document.getElementById('input-project-name'));
  const passportStatusChips = Array.from(document.querySelectorAll('[data-passport-status]'));
  const passportFolderChips = Array.from(document.querySelectorAll('[data-passport-folder]'));
  const inputPassportTags = /** @type {HTMLInputElement | null} */ (document.getElementById('input-passport-tags'));
  const toolPresetChips = Array.from(document.querySelectorAll('.preset-chip[data-tool]'));
  const inputNeedleSize = /** @type {HTMLInputElement | null} */ (document.getElementById('input-needle-size'));
  const methodPresetChips = Array.from(document.querySelectorAll('.preset-chip[data-method]'));
  const patternPresetChips = Array.from(document.querySelectorAll('.preset-chip[data-pattern]'));
  const inputStitchPattern = /** @type {HTMLInputElement | null} */ (document.getElementById('input-stitch-pattern'));
  const passportPartsChips = document.getElementById('passport-parts-chips');
  const inputActivePartName = /** @type {HTMLInputElement | null} */ (document.getElementById('input-active-part-name'));
  const inputPartTargetRows = /** @type {HTMLInputElement | null} */ (document.getElementById('input-part-target-rows'));
  const removePartRow = document.getElementById('remove-part-row');
  const btnRemoveActivePart = document.getElementById('btn-remove-active-part');
  const formAddPart = /** @type {HTMLFormElement | null} */ (document.getElementById('form-add-part'));
  const inputNewPartName = /** @type {HTMLInputElement | null} */ (document.getElementById('input-new-part-name'));

  // Goal Reached Modal Elements
  const goalReachedModalEl = document.getElementById('goal-reached-modal');
  const btnCloseGoalReached = document.getElementById('btn-close-goal-reached');
  const btnAckGoalReached = document.getElementById('btn-ack-goal-reached');
  const goalReachedDescEl = document.getElementById('goal-reached-desc');
  const btnTogglePassportAdvanced = document.getElementById('btn-toggle-passport-advanced');
  const passportAdvancedPanel = document.getElementById('passport-advanced-panel');
  const btnClonePairedPart = document.getElementById('btn-clone-paired-part');
  const yarnListEl = document.getElementById('yarn-list');
  const formAddYarn = /** @type {HTMLFormElement | null} */ (document.getElementById('form-add-yarn'));
  const inputYarnName = /** @type {HTMLInputElement | null} */ (document.getElementById('input-yarn-name'));
  const inputYarnComposition = /** @type {HTMLInputElement | null} */ (document.getElementById('input-yarn-composition'));
  const inputYarnStrands = /** @type {HTMLInputElement | null} */ (document.getElementById('input-yarn-strands'));
  const inputYarnUsed = /** @type {HTMLInputElement | null} */ (document.getElementById('input-yarn-used'));
  const inputYarnTotal = /** @type {HTMLInputElement | null} */ (document.getElementById('input-yarn-total'));
  const inputGaugeStitches = /** @type {HTMLInputElement | null} */ (document.getElementById('input-gauge-stitches'));
  const inputGaugeRows = /** @type {HTMLInputElement | null} */ (document.getElementById('input-gauge-rows'));
  const inputGaugePreW = /** @type {HTMLInputElement | null} */ (document.getElementById('input-gauge-pre-w'));
  const inputGaugePreH = /** @type {HTMLInputElement | null} */ (document.getElementById('input-gauge-pre-h'));
  const inputGaugePostW = /** @type {HTMLInputElement | null} */ (document.getElementById('input-gauge-post-w'));
  const inputGaugePostH = /** @type {HTMLInputElement | null} */ (document.getElementById('input-gauge-post-h'));
  const inputGaugeTargetW = /** @type {HTMLInputElement | null} */ (document.getElementById('input-gauge-target-w'));
  const inputGaugeTargetH = /** @type {HTMLInputElement | null} */ (document.getElementById('input-gauge-target-h'));
  const gaugeMetricsSummaryEl = document.getElementById('gauge-metrics-summary');
  const gaugeTargetResultTextEl = document.getElementById('gauge-target-result-text');
  const btnApplyGaugeTargets = document.getElementById('btn-apply-gauge-targets');
  const inputProjectPhoto = /** @type {HTMLInputElement | null} */ (document.getElementById('input-project-photo'));
  const projectPhotoPreviewWrap = document.getElementById('project-photo-preview-wrap');
  const projectPhotoPreview = /** @type {HTMLImageElement | null} */ (document.getElementById('project-photo-preview'));
  const btnRemoveProjectPhoto = document.getElementById('btn-remove-project-photo');
  const inputProjectNotes = /** @type {HTMLTextAreaElement | null} */ (document.getElementById('input-project-notes'));

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

  /** @type {Array<() => void>} */
  let rowAlertQueue = [];

  function flushNextRowAlert() {
    if (rowAlertQueue.length > 0) {
      const next = rowAlertQueue.shift();
      if (next) {
        setTimeout(next, 220);
      }
    }
  }

  // Modal Controllers
  const settingsModal = createModalController(settingsModalEl);
  const rowLogModal = createModalController(rowLogModalEl, { onOpen: renderRowLog });
  const resetConfirmModal = createModalController(resetConfirmModalEl);
  const stitchCheckModal = createModalController(stitchCheckModalEl, { onClose: flushNextRowAlert });
  const rowMarkerModal = createModalController(rowMarkerModalEl, { onClose: flushNextRowAlert });
  const goalReachedModal = createModalController(goalReachedModalEl, { onClose: flushNextRowAlert });

  btnCloseGoalReached?.addEventListener('click', goalReachedModal.close);
  btnAckGoalReached?.addEventListener('click', goalReachedModal.close);

  /**
   * Creates a circular remove button with a perfectly centered SVG cross icon.
   * @param {string} ariaLabel
   * @param {() => void} onRemove
   * @returns {HTMLButtonElement}
   */
  function createRemoveButton(ariaLabel, onRemove) {
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn-remove-item';
    delBtn.setAttribute('aria-label', ariaLabel);
    delBtn.innerHTML =
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<line x1="18" y1="6" x2="6" y2="18"></line>' +
      '<line x1="6" y1="6" x2="18" y2="18"></line>' +
      '</svg>';
    delBtn.addEventListener('click', onRemove);
    return delBtn;
  }

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

    const delBtn = createRemoveButton(opts.ariaLabel, opts.onRemove);

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

    if (passportScrollEl) {
      requestAnimationFrame(() => updateScrollFadeMask(passportScrollEl));
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

  /**
   * Parses an optional positive number from an HTML input element.
   * @param {HTMLInputElement | null} inputEl
   * @returns {number | null}
   */
  function parseOptionalPositive(inputEl) {
    const raw = inputEl?.value.trim() ?? '';
    if (!raw) return null;
    const num = Number(raw);
    return Number.isFinite(num) && num > 0 ? num : null;
  }

  /**
   * Formats shrinkage/stretch percentage change into human-readable Russian text.
   * @param {string} axisLabel
   * @param {number | null} pct
   * @returns {string}
   */
  function formatChangePct(axisLabel, pct) {
    if (pct === null) return `${axisLabel}: —`;
    if (Math.abs(pct) < 0.05) return `${axisLabel}: без изменений (0%)`;
    const rounded = Math.abs(pct).toFixed(1);
    return pct < 0
      ? `${axisLabel}: усадка ${rounded}%`
      : `${axisLabel}: растяжение +${rounded}%`;
  }

  function renderGaugeResults() {
    const gaugeInput = {
      stitchesCount: parseOptionalPositive(inputGaugeStitches),
      rowsCount: parseOptionalPositive(inputGaugeRows),
      widthPreWashCm: parseOptionalPositive(inputGaugePreW),
      heightPreWashCm: parseOptionalPositive(inputGaugePreH),
      widthPostWashCm: parseOptionalPositive(inputGaugePostW),
      heightPostWashCm: parseOptionalPositive(inputGaugePostH)
    };
    const metrics = calculateGaugeMetrics(gaugeInput);
    const targetWidthCm = parseOptionalPositive(inputGaugeTargetW);
    const targetHeightCm = parseOptionalPositive(inputGaugeTargetH);
    const counts = calculateTargetCounts({
      targetWidthCm,
      targetHeightCm,
      stitchesPerCm: metrics.stitchesPerCm,
      rowsPerCm: metrics.rowsPerCm
    });

    if (gaugeMetricsSummaryEl) {
      if (
        metrics.stitchesPerCm === null
        && metrics.rowsPerCm === null
        && metrics.widthChangePct === null
        && metrics.heightChangePct === null
      ) {
        gaugeMetricsSummaryEl.textContent = 'Введите замеры образца для расчёта плотности и усадки ВТО.';
      } else {
        const densitySt = metrics.stitchesPerCm !== null ? `${metrics.stitchesPerCm.toFixed(2)} п/см` : '—';
        const densityRw = metrics.rowsPerCm !== null ? `${metrics.rowsPerCm.toFixed(2)} р/см` : '—';
        gaugeMetricsSummaryEl.innerHTML =
          `<span>Плотность: <strong>${densitySt}</strong> · <strong>${densityRw}</strong></span>` +
          `<span>${formatChangePct('Ширина', metrics.widthChangePct)} · ${formatChangePct('Высота', metrics.heightChangePct)}</span>`;
      }
    }

    if (gaugeTargetResultTextEl && btnApplyGaugeTargets) {
      if (counts.castOnStitches !== null || counts.targetRows !== null) {
        const parts = [];
        if (counts.castOnStitches !== null) parts.push(`Набрать: ${counts.castOnStitches} п.`);
        if (counts.targetRows !== null) parts.push(`Связать: ${counts.targetRows} р.`);
        gaugeTargetResultTextEl.textContent = parts.join(' · ');
        btnApplyGaugeTargets.hidden = false;
      } else {
        btnApplyGaugeTargets.hidden = true;
      }
    }

    return { gaugeInput, targetWidthCm, targetHeightCm, counts };
  }

  /**
   * Briefly highlights a button in green with a confirmation label so the user sees immediate feedback.
   * @param {HTMLElement | null} btnEl
   * @param {string} confirmedText
   * @param {string} defaultText
   */
  function flashButtonConfirmation(btnEl, confirmedText, defaultText) {
    if (!btnEl) return;
    const targetEl = btnEl.querySelector('span') || btnEl;
    btnEl.classList.add('is-confirmed');
    targetEl.textContent = confirmedText;
    setTimeout(() => {
      btnEl.classList.remove('is-confirmed');
      targetEl.textContent = defaultText;
    }, 1800);
  }

  function renderGaugeModal() {
    const g = store.getActiveProject().gauge;
    if (inputGaugeStitches) inputGaugeStitches.value = g.stitchesCount !== null ? String(g.stitchesCount) : '';
    if (inputGaugeRows) inputGaugeRows.value = g.rowsCount !== null ? String(g.rowsCount) : '';
    if (inputGaugePreW) inputGaugePreW.value = g.widthPreWashCm !== null ? String(g.widthPreWashCm) : '';
    if (inputGaugePreH) inputGaugePreH.value = g.heightPreWashCm !== null ? String(g.heightPreWashCm) : '';
    if (inputGaugePostW) inputGaugePostW.value = g.widthPostWashCm !== null ? String(g.widthPostWashCm) : '';
    if (inputGaugePostH) inputGaugePostH.value = g.heightPostWashCm !== null ? String(g.heightPostWashCm) : '';
    if (inputGaugeTargetW) inputGaugeTargetW.value = g.targetWidthCm !== null ? String(g.targetWidthCm) : '';
    if (inputGaugeTargetH) inputGaugeTargetH.value = g.targetHeightCm !== null ? String(g.targetHeightCm) : '';
    renderGaugeResults();
    if (gaugeScrollEl) {
      requestAnimationFrame(() => updateScrollFadeMask(gaugeScrollEl));
    }
  }

  const gaugeModal = createModalController(gaugeModalEl, {
    onOpen: renderGaugeModal
  });

  btnOpenGauge?.addEventListener('click', gaugeModal.open);
  btnCloseGauge?.addEventListener('click', gaugeModal.close);

  function renderPassportModal() {
    const project = store.getActiveProject();
    const activePart = store.getActivePart();

    if (inputProjectName) inputProjectName.value = project.name;
    passportStatusChips.forEach((chip) => {
      chip.classList.toggle('active', chip.getAttribute('data-passport-status') === project.status);
    });
    passportFolderChips.forEach((chip) => {
      chip.classList.toggle('active', (chip.getAttribute('data-passport-folder') ?? '') === (project.folder || ''));
    });
    if (inputPassportTags) inputPassportTags.value = project.tags.join(', ');
    toolPresetChips.forEach((chip) => {
      chip.classList.toggle('active', chip.getAttribute('data-tool') === project.toolType);
    });
    if (inputNeedleSize) inputNeedleSize.value = project.needleSize || '';
    methodPresetChips.forEach((chip) => {
      chip.classList.toggle('active', chip.getAttribute('data-method') === project.knittingMethod);
    });
    patternPresetChips.forEach((chip) => {
      chip.classList.toggle('active', chip.getAttribute('data-pattern') === project.stitchPattern);
    });
    if (inputStitchPattern) inputStitchPattern.value = project.stitchPattern || '';

    // Parts switcher & active part controls
    if (passportPartsChips) {
      passportPartsChips.replaceChildren();
      for (const p of project.parts) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = `preset-chip ${p.id === activePart.id ? 'active' : ''}`;
        chip.textContent = p.name;
        chip.addEventListener('click', () => {
          store.setActivePart(p.id);
          renderPassportModal();
        });
        passportPartsChips.appendChild(chip);
      }
    }
    if (inputActivePartName) inputActivePartName.value = activePart.name;
    if (inputPartTargetRows) {
      inputPartTargetRows.value = activePart.targetRows !== null ? String(activePart.targetRows) : '';
    }
    if (removePartRow) {
      removePartRow.hidden = project.parts.length <= 1;
    }

    // Yarns list
    if (yarnListEl) {
      yarnListEl.replaceChildren();
      if (project.yarns.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'ios-row-sub-info';
        empty.textContent = 'Пряжа пока не добавлена.';
        yarnListEl.appendChild(empty);
      } else {
        for (const yarn of project.yarns) {
          const item = document.createElement('div');
          item.className = 'settings-list-item';

          const main = document.createElement('div');
          main.className = 'settings-list-item-main';
          const title = document.createElement('span');
          title.className = 'settings-list-item-title';
          title.textContent = yarn.name;
          const sub = document.createElement('span');
          sub.className = 'settings-list-item-sub';
          const compText = yarn.composition ? `${yarn.composition} · ` : '';
          sub.textContent = `${compText}${yarn.strands} нит. · ${yarn.skeinsUsed} / ${yarn.skeinsTotal} мот.`;
          main.append(title, sub);

          const controls = document.createElement('div');
          controls.className = 'yarn-item-controls';

          const btnMinus = document.createElement('button');
          btnMinus.type = 'button';
          btnMinus.className = 'btn-skein-step';
          btnMinus.textContent = '−';
          btnMinus.setAttribute('aria-label', 'Уменьшить расход мотков');
          btnMinus.addEventListener('click', () => {
            store.updateYarnEntry(yarn.id, { skeinsUsed: Math.max(0, yarn.skeinsUsed - 0.5) });
            renderPassportModal();
          });

          const btnPlus = document.createElement('button');
          btnPlus.type = 'button';
          btnPlus.className = 'btn-skein-step';
          btnPlus.textContent = '+';
          btnPlus.setAttribute('aria-label', 'Увеличить расход мотков');
          btnPlus.addEventListener('click', () => {
            store.updateYarnEntry(yarn.id, { skeinsUsed: yarn.skeinsUsed + 0.5 });
            renderPassportModal();
          });

          const removeBtn = createRemoveButton(`Удалить пряжу ${yarn.name}`, () => {
            store.removeYarnEntry(yarn.id);
            renderPassportModal();
          });

          controls.append(btnMinus, btnPlus, removeBtn);
          item.append(main, controls);
          yarnListEl.appendChild(item);
        }
      }
    }

    // Stitch check, row rules & markers for active part
    renderPartSettings();

    // Photo preview
    if (projectPhotoPreviewWrap && projectPhotoPreview) {
      if (project.photoDataUrl) {
        projectPhotoPreview.src = project.photoDataUrl;
        projectPhotoPreviewWrap.hidden = false;
      } else {
        projectPhotoPreview.removeAttribute('src');
        projectPhotoPreviewWrap.hidden = true;
      }
    }

    // Notes
    if (inputProjectNotes) {
      inputProjectNotes.value = project.notes || '';
    }

    if (passportScrollEl) {
      requestAnimationFrame(() => updateScrollFadeMask(passportScrollEl));
    }
  }

  const passportModal = createModalController(passportModalEl, {
    onOpen: renderPassportModal
  });

  btnOpenPassport?.addEventListener('click', passportModal.open);
  btnClosePassport?.addEventListener('click', passportModal.close);

  inputProjectName?.addEventListener('change', () => {
    store.updateProjectPassport({ name: inputProjectName.value });
  });

  toolPresetChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const val = chip.getAttribute('data-tool');
      if (val === 'needles' || val === 'hook') {
        store.updateProjectPassport({ toolType: val });
        renderPassportModal();
      }
    });
  });

  inputNeedleSize?.addEventListener('change', () => {
    store.updateProjectPassport({ needleSize: inputNeedleSize.value });
  });

  methodPresetChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const val = chip.getAttribute('data-method');
      if (val) {
        store.updateProjectPassport({ knittingMethod: val });
        renderPassportModal();
      }
    });
  });

  patternPresetChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const val = chip.getAttribute('data-pattern');
      if (val) {
        store.updateProjectPassport({ stitchPattern: val });
        renderPassportModal();
      }
    });
  });

  inputStitchPattern?.addEventListener('change', () => {
    store.updateProjectPassport({ stitchPattern: inputStitchPattern.value });
    renderPassportModal();
  });

  inputActivePartName?.addEventListener('change', () => {
    store.renamePart(store.getActivePart().id, inputActivePartName.value);
    renderPassportModal();
  });

  inputPartTargetRows?.addEventListener('change', () => {
    store.updatePartTargetRows(parseOptionalPositive(inputPartTargetRows));
  });

  btnRemoveActivePart?.addEventListener('click', () => {
    store.removePart(store.getActivePart().id);
    renderPassportModal();
  });

  formAddPart?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = inputNewPartName?.value.trim() || '';
    if (!name) return;
    store.addPart(name);
    if (inputNewPartName) inputNewPartName.value = '';
    renderPassportModal();
  });

  btnTogglePassportAdvanced?.addEventListener('click', () => {
    const isOpen = passportAdvancedPanel?.classList.toggle('open') ?? false;
    btnTogglePassportAdvanced.setAttribute('aria-expanded', String(isOpen));
    const labelSpan = document.getElementById('disclosure-label-text');
    if (labelSpan) {
      labelSpan.textContent = isOpen ? 'Скрыть дополнительные параметры' : 'Дополнительные параметры';
    }
    if (passportScrollEl) {
      setTimeout(() => updateScrollFadeMask(passportScrollEl), 340);
    }
  });

  btnClonePairedPart?.addEventListener('click', () => {
    const cloned = store.clonePairedPart();
    renderPassportModal();
    flashButtonConfirmation(btnClonePairedPart, `✓ Создана: ${cloned.name}`, 'Связать парную деталь');
  });

  formAddYarn?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = inputYarnName?.value.trim() || '';
    if (!name) return;
    store.addYarnEntry({
      name,
      composition: inputYarnComposition?.value.trim() || '',
      strands: Number(inputYarnStrands?.value) || 1,
      skeinsUsed: Number(inputYarnUsed?.value) || 0,
      skeinsTotal: Number(inputYarnTotal?.value) || 0
    });
    if (inputYarnName) inputYarnName.value = '';
    if (inputYarnComposition) inputYarnComposition.value = '';
    if (inputYarnStrands) inputYarnStrands.value = '1';
    if (inputYarnUsed) inputYarnUsed.value = '0';
    if (inputYarnTotal) inputYarnTotal.value = '1';
    renderPassportModal();
  });

  const gaugeInputs = [
    inputGaugeStitches,
    inputGaugeRows,
    inputGaugePreW,
    inputGaugePreH,
    inputGaugePostW,
    inputGaugePostH,
    inputGaugeTargetW,
    inputGaugeTargetH
  ];
  gaugeInputs.forEach((inputEl) => {
    inputEl?.addEventListener('input', () => {
      const { gaugeInput, targetWidthCm, targetHeightCm } = renderGaugeResults();
      store.updateProjectPassport({
        gauge: { ...gaugeInput, targetWidthCm, targetHeightCm }
      });
    });
  });

  btnApplyGaugeTargets?.addEventListener('click', () => {
    const { counts } = renderGaugeResults();
    const defaultText = gaugeTargetResultTextEl?.textContent || '';
    if (counts.castOnStitches !== null) {
      store.updatePartCheckSettings({ targetStitchCount: counts.castOnStitches });
    }
    if (counts.targetRows !== null) {
      store.updatePartTargetRows(counts.targetRows);
    }
    flashButtonConfirmation(btnApplyGaugeTargets, 'Применено к активной детали', defaultText);
  });

  inputProjectPhoto?.addEventListener('change', () => {
    const file = inputProjectPhoto.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const rawDataUrl = reader.result;
      const img = new Image();
      img.onload = () => {
        const maxDim = 800;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          store.updateProjectPassport({ photoDataUrl: canvas.toDataURL('image/jpeg', 0.78) });
        } else {
          store.updateProjectPassport({ photoDataUrl: rawDataUrl });
        }
        renderPassportModal();
      };
      img.onerror = () => {
        store.updateProjectPassport({ photoDataUrl: rawDataUrl });
        renderPassportModal();
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });

  btnRemoveProjectPhoto?.addEventListener('click', () => {
    store.updateProjectPassport({ photoDataUrl: null });
    if (inputProjectPhoto) inputProjectPhoto.value = '';
    renderPassportModal();
  });

  inputProjectNotes?.addEventListener('change', () => {
    store.updateProjectPassport({ notes: inputProjectNotes.value });
  });

  passportStatusChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const status = chip.getAttribute('data-passport-status');
      if (status === 'active' || status === 'completed') {
        store.updateProjectPassport({ status });
        renderPassportModal();
      }
    });
  });

  passportFolderChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const folder = chip.getAttribute('data-passport-folder') ?? '';
      store.updateProjectPassport({ folder });
      renderPassportModal();
    });
  });

  /** @param {string} raw */
  function parseTagsInput(raw) {
    return raw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }

  /**
   * @param {string} label
   * @param {boolean} isActive
   * @param {() => void} onClick
   * @returns {HTMLButtonElement}
   */
  function createFilterChip(label, isActive, onClick) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `filter-chip ${isActive ? 'active' : ''}`;
    chip.textContent = label;
    chip.addEventListener('click', onClick);
    return chip;
  }

  inputPassportTags?.addEventListener('change', () => {
    store.updateProjectPassport({ tags: parseTagsInput(inputPassportTags.value) });
    renderPassportModal();
  });

  openSettingsBtn?.addEventListener('click', () => {
    if (backupStatusMsgEl) backupStatusMsgEl.hidden = true;
    settingsModal.open();
  });
  closeSettingsBtn?.addEventListener('click', settingsModal.close);

  // Backup Export & Import
  btnExportBackup?.addEventListener('click', () => {
    const payload = createBackupPayload(store.getState(), themeManager.getTheme());
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStamp = new Date().toISOString().slice(0, 10);
    const link = document.createElement('a');
    link.href = url;
    link.download = `knitq-backup-${dateStamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (backupStatusMsgEl) {
      backupStatusMsgEl.textContent = 'Резервная копия сохранена.';
      backupStatusMsgEl.className = 'backup-status-msg is-success';
      backupStatusMsgEl.hidden = false;
    }
  });

  inputImportBackup?.addEventListener('change', () => {
    const file = inputImportBackup.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const result = parseAndValidateBackup(text);
      if (!result.ok) {
        if (backupStatusMsgEl) {
          backupStatusMsgEl.textContent = result.error;
          backupStatusMsgEl.className = 'backup-status-msg is-error';
          backupStatusMsgEl.hidden = false;
        }
        return;
      }
      store.replaceState(result.data);
      if (result.theme) {
        themeManager.setTheme(result.theme);
      }
      if (backupStatusMsgEl) {
        backupStatusMsgEl.textContent = 'Данные успешно восстановлены.';
        backupStatusMsgEl.className = 'backup-status-msg is-success';
        backupStatusMsgEl.hidden = false;
      }
    };
    reader.readAsText(file);
    inputImportBackup.value = '';
  });

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

  // View Navigation & Catalog State
  let currentView = /** @type {'dashboard' | 'counter'} */ ('dashboard');
  let catalogStatus = /** @type {'active' | 'completed'} */ ('active');
  let catalogFolder = 'all';
  let catalogTag = 'all';

  /** @param {'dashboard' | 'counter'} view */
  function setActiveView(view) {
    currentView = view;
    const isDashboard = view === 'dashboard';
    if (dashboardViewEl) dashboardViewEl.hidden = !isDashboard;
    if (appMainEl) appMainEl.hidden = isDashboard;
    if (btnBackDashboard) btnBackDashboard.hidden = isDashboard;
    if (btnOpenGauge) btnOpenGauge.hidden = isDashboard;
    if (btnOpenPassport) btnOpenPassport.hidden = isDashboard;
    if (openSettingsBtn) openSettingsBtn.hidden = !isDashboard;
    if (isDashboard) {
      renderDashboard();
    }
  }

  /** @param {number} ms */
  function formatHoursMinutes(ms) {
    const totalMinutes = Math.floor(Math.max(0, ms) / 60_000);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours === 0) return `${mins} мин`;
    return mins > 0 ? `${hours} ч ${mins} м` : `${hours} ч`;
  }

  function renderDashboard() {
    const activeProject = store.getActiveProject();
    const activePart = store.getActivePart();
    const activeElapsed = store.getProjectTotalElapsedMs(activeProject.id);

    if (heroFolderBadgeEl) {
      heroFolderBadgeEl.textContent =
        activeProject.status === 'completed'
          ? 'Завершён'
          : (activeProject.folder || 'Сейчас в работе');
    }
    if (btnContinueKnitting) {
      const labelEl = btnContinueKnitting.querySelector('span');
      if (labelEl) {
        labelEl.textContent = activeProject.status === 'completed' ? 'Открыть проект' : 'Продолжить вязать';
      }
    }
    if (heroActiveTimeEl) {
      heroActiveTimeEl.textContent = formatDuration(activeElapsed);
    }
    if (heroProjectTitleEl) {
      heroProjectTitleEl.textContent = activeProject.name;
    }
    if (heroProjectMetaEl) {
      const targetPart = activePart.targetRows ? ` / ${activePart.targetRows}` : '';
      heroProjectMetaEl.textContent = `${activePart.name} · Ряд ${activePart.currentRow}${targetPart}`;
    }

    const stats = store.getActivityStats();
    if (statTodayRowsEl) statTodayRowsEl.textContent = String(stats.todayRows);
    if (statTodayTimeEl) statTodayTimeEl.textContent = formatHoursMinutes(stats.todayTimeMs);
    if (statMonthTimeEl) statMonthTimeEl.textContent = formatHoursMinutes(stats.monthTimeMs);
    if (statTotalTimeEl) statTotalTimeEl.textContent = formatHoursMinutes(stats.totalTimeMs);
    if (statCompletedCountEl) statCompletedCountEl.textContent = `${stats.completedProjectsCount} готово`;

    const allProjects = store.getState().projects;
    const statusProjects = allProjects.filter((p) => p.status === catalogStatus);

    // Folder filter chips
    const presetFolders = ['Шапки', 'Шарфы', 'Носки', 'Свитера'];
    const dynamicFolders = Array.from(
      new Set([...presetFolders, ...allProjects.map((p) => p.folder).filter(Boolean)])
    );
    if (catalogFolderChipsEl) {
      catalogFolderChipsEl.replaceChildren(
        createFilterChip('Все папки', catalogFolder === 'all', () => {
          catalogFolder = 'all';
          renderDashboard();
        }),
        ...dynamicFolders.map((folderName) =>
          createFilterChip(folderName, catalogFolder === folderName, () => {
            catalogFolder = folderName;
            renderDashboard();
          })
        )
      );
    }

    // Tag filter chips
    const allTags = Array.from(new Set(statusProjects.flatMap((p) => p.tags)));
    if (catalogTag !== 'all' && !allTags.includes(catalogTag)) {
      catalogTag = 'all';
    }
    if (catalogTagChipsEl) {
      if (allTags.length === 0) {
        catalogTagChipsEl.hidden = true;
        catalogTagChipsEl.replaceChildren();
      } else {
        catalogTagChipsEl.hidden = false;
        catalogTagChipsEl.replaceChildren(
          createFilterChip('Все теги', catalogTag === 'all', () => {
            catalogTag = 'all';
            renderDashboard();
          }),
          ...allTags.map((tag) =>
            createFilterChip(`#${tag}`, catalogTag === tag, () => {
              catalogTag = tag;
              renderDashboard();
            })
          )
        );
      }
    }

    // Filtered projects list
    const filtered = statusProjects.filter((p) => {
      if (catalogFolder !== 'all' && p.folder !== catalogFolder) return false;
      if (catalogTag !== 'all' && !p.tags.includes(catalogTag)) return false;
      return true;
    });

    if (projectsCatalogListEl) {
      projectsCatalogListEl.replaceChildren();
      if (filtered.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'catalog-empty';
        empty.textContent = catalogStatus === 'completed'
          ? 'Завершённых проектов по выбранным фильтрам пока нет.'
          : 'Нет активных проектов по выбранным фильтрам.';
        projectsCatalogListEl.appendChild(empty);
      } else {
        for (const proj of filtered) {
          const card = document.createElement('div');
          card.className = `project-card ${proj.id === activeProject.id ? 'is-active' : ''}`;
          card.setAttribute('role', 'button');
          card.tabIndex = 0;

          if (proj.status === 'completed' && proj.photoDataUrl) {
            const thumb = document.createElement('img');
            thumb.className = 'project-card-thumb';
            thumb.src = proj.photoDataUrl;
            thumb.alt = proj.name;
            card.appendChild(thumb);
          }

          const body = document.createElement('div');
          body.className = 'project-card-body';

          const title = document.createElement('div');
          title.className = 'project-card-title';
          title.textContent = proj.name;

          const meta = document.createElement('div');
          meta.className = 'project-card-meta';
          const projTime = formatHoursMinutes(store.getProjectTotalElapsedMs(proj.id));
          const totalRows = proj.parts.reduce((s, pt) => s + pt.currentRow, 0);
          const folderLabel = proj.folder ? `${proj.folder} · ` : '';
          meta.textContent = `${folderLabel}${proj.parts.length} дет. · ${totalRows} р. · ${projTime}`;

          body.append(title, meta);

          if (proj.tags.length > 0) {
            const tagsRow = document.createElement('div');
            tagsRow.className = 'project-card-tags';
            for (const tag of proj.tags) {
              const pill = document.createElement('span');
              pill.className = 'project-tag-pill';
              pill.textContent = `#${tag}`;
              tagsRow.appendChild(pill);
            }
            body.appendChild(tagsRow);
          }

          card.appendChild(body);

          const openProject = () => {
            store.setActiveProject(proj.id);
            setActiveView('counter');
          };
          card.addEventListener('click', openProject);
          card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openProject();
            }
          });

          projectsCatalogListEl.appendChild(card);
        }
      }
    }

    if (dashboardScrollEl) {
      requestAnimationFrame(() => updateScrollFadeMask(dashboardScrollEl));
    }
  }

  // New Project Modal Logic
  let newTemplate = /** @type {'simple' | 'paired' | 'complex'} */ ('simple');
  let newFolder = 'Шапки';
  let newTool = /** @type {'needles' | 'hook'} */ ('needles');

  const newProjectModal = createModalController(newProjectModalEl, {
    onOpen: () => {
      if (inputNewProjectName) inputNewProjectName.value = '';
      if (inputNewProjectTags) inputNewProjectTags.value = '';
      if (inputNewProjectNeedle) inputNewProjectNeedle.value = '';
    }
  });

  btnNewProject?.addEventListener('click', newProjectModal.open);
  btnCloseNewProject?.addEventListener('click', newProjectModal.close);

  templateCardButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tpl = btn.getAttribute('data-template');
      if (tpl === 'simple' || tpl === 'paired' || tpl === 'complex') {
        newTemplate = tpl;
        templateCardButtons.forEach((b) => b.classList.toggle('active', b === btn));
      }
    });
  });

  newFolderChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      newFolder = chip.getAttribute('data-new-folder') ?? '';
      newFolderChips.forEach((c) => c.classList.toggle('active', c === chip));
    });
  });

  newToolChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const tool = chip.getAttribute('data-new-tool');
      if (tool === 'needles' || tool === 'hook') {
        newTool = tool;
        newToolChips.forEach((c) => c.classList.toggle('active', c === chip));
      }
    });
  });

  formNewProject?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = inputNewProjectName?.value.trim() || '';
    if (!name) return;
    const tags = parseTagsInput(inputNewProjectTags?.value || '');
    store.createProject({
      name,
      template: newTemplate,
      folder: newFolder,
      tags,
      toolType: newTool,
      needleSize: inputNewProjectNeedle?.value.trim() || ''
    });
    newProjectModal.close();
    setActiveView('counter');
  });

  catalogStatusTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const status = tab.getAttribute('data-catalog-status');
      if (status === 'active' || status === 'completed') {
        catalogStatus = status;
        catalogStatusTabs.forEach((t) => {
          const isMatch = t === tab;
          t.classList.toggle('active', isMatch);
          t.setAttribute('aria-selected', String(isMatch));
        });
        renderDashboard();
      }
    });
  });

  btnContinueKnitting?.addEventListener('click', () => setActiveView('counter'));
  btnBackDashboard?.addEventListener('click', () => setActiveView('dashboard'));

  // Render active knitting UI
  function renderTimer() {
    if (timerDisplayEl) {
      timerDisplayEl.textContent = formatDuration(store.getElapsedMs());
    }
    if (heroActiveTimeEl && currentView === 'dashboard') {
      heroActiveTimeEl.textContent = formatDuration(store.getProjectTotalElapsedMs());
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
    if (project.parts.length > 1 && activePartSelectWrap && activePartSelect) {
      if (activePartNameEl) activePartNameEl.hidden = true;
      activePartSelectWrap.hidden = false;
      if (activePartSelectLabel) activePartSelectLabel.textContent = part.name;
      activePartSelect.replaceChildren(
        ...project.parts.map((p) => {
          const opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = p.name;
          return opt;
        })
      );
      activePartSelect.value = part.id;
    } else {
      if (activePartNameEl) {
        activePartNameEl.hidden = false;
        activePartNameEl.textContent = part.name;
      }
      if (activePartSelectWrap) activePartSelectWrap.hidden = true;
    }
    if (rowCounterValueEl) {
      rowCounterValueEl.textContent = String(part.currentRow);
    }
    if (rowGoalPillEl) {
      if (part.targetRows !== null) {
        rowGoalPillEl.hidden = false;
        rowGoalPillEl.textContent = `Цель: ${part.targetRows} р.`;
        rowGoalPillEl.classList.toggle('completed', part.currentRow >= part.targetRows);
      } else {
        rowGoalPillEl.hidden = true;
      }
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

    rowAlertQueue = [];

    if (part.targetRows !== null && part.currentRow === part.targetRows) {
      const goalRow = part.currentRow;
      const goalTarget = part.targetRows;
      const goalPartName = part.name;
      rowAlertQueue.push(() => {
        if (goalReachedDescEl) {
          goalReachedDescEl.textContent = `Деталь «${goalPartName}»: связано ${goalRow} из ${goalTarget} рядов!`;
        }
        goalReachedModal.open();
      });
    }

    if (needsStitchCheck && part.targetStitchCount !== null) {
      const checkRow = part.currentRow;
      const targetStitches = part.targetStitchCount;
      rowAlertQueue.push(() => {
        if (stitchCheckDescEl) {
          stitchCheckDescEl.textContent = `Ряд ${checkRow}: пора пересчитать петли на спицах! Должно быть: ${targetStitches} петель.`;
        }
        if (inputStitchCheckActual) {
          inputStitchCheckActual.value = String(targetStitches);
        }
        if (btnStitchCheckConfirm) {
          btnStitchCheckConfirm.textContent = `Всё сходится (${targetStitches})`;
        }
        stitchCheckModal.open();
      });
    }

    if (activeMarkers.length > 0) {
      const markerRow = part.currentRow;
      const markersCopy = [...activeMarkers];
      rowAlertQueue.push(() => {
        openRowMarkerModal(markerRow, markersCopy);
      });
    }

    const firstAlert = rowAlertQueue.shift();
    if (firstAlert) {
      firstAlert();
    }
  }

  activePartSelect?.addEventListener('change', () => {
    if (activePartSelect.value) {
      store.setActivePart(activePartSelect.value);
    }
  });

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

  store.subscribe(() => {
    renderKnittingState();
    if (currentView === 'dashboard') {
      renderDashboard();
    }
  });
  renderKnittingState();
  setActiveView('dashboard');

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
