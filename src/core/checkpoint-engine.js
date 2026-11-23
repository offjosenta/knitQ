/**
 * Determines whether a physical stitch count check should be triggered on the given row.
 * @param {number} rowNumber
 * @param {number | null | undefined} interval
 * @returns {boolean}
 */
export function shouldTriggerStitchCheck(rowNumber, interval) {
  if (!Number.isInteger(rowNumber) || rowNumber <= 0) {
    return false;
  }
  if (typeof interval !== 'number' || !Number.isInteger(interval) || interval <= 0) {
    return false;
  }
  return rowNumber % interval === 0;
}

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   everyNRows: number,
 *   startRow?: number,
 *   repeatCount?: number | null
 * }} RowRule
 *
 * @typedef {{
 *   ruleId: string,
 *   isAction: boolean,
 *   text: string,
 *   occurrence: number | null,
 *   totalRepeats: number | null
 * }} EvaluatedRowRule
 */

/**
 * Evaluates active rhythmic row rules (raglan increases, cable twists, toe decreases) for a given row.
 * @param {number} rowNumber
 * @param {RowRule[] | null | undefined} rules
 * @returns {EvaluatedRowRule[]}
 */
export function evaluateRowRules(rowNumber, rules) {
  if (!Number.isInteger(rowNumber) || rowNumber <= 0 || !Array.isArray(rules) || rules.length === 0) {
    return [];
  }

  /** @type {EvaluatedRowRule[]} */
  const results = [];

  for (const rule of rules) {
    if (!rule || typeof rule.everyNRows !== 'number' || rule.everyNRows <= 0) {
      continue;
    }

    const startRow = typeof rule.startRow === 'number' && rule.startRow >= 1
      ? Math.floor(rule.startRow)
      : 1;

    if (rowNumber < startRow) {
      continue;
    }

    const repeatCount = typeof rule.repeatCount === 'number' && rule.repeatCount > 0
      ? Math.floor(rule.repeatCount)
      : null;

    if (repeatCount !== null) {
      const lastActionRow = startRow + (repeatCount - 1) * rule.everyNRows;
      if (rowNumber > lastActionRow) {
        continue;
      }
    }

    const offset = rowNumber - startRow;
    const isAction = offset % rule.everyNRows === 0;
    const occurrence = isAction ? Math.floor(offset / rule.everyNRows) + 1 : null;

    results.push({
      ruleId: rule.id,
      isAction,
      text: isAction ? rule.label : 'Вяжем по рисунку',
      occurrence,
      totalRepeats: repeatCount
    });
  }

  return results;
}

/**
 * @typedef {{ id: string, rowNumber: number, text: string }} RowMarker
 */

/**
 * Returns all row markers attached to the specified row number.
 * @param {number} rowNumber
 * @param {RowMarker[] | null | undefined} markers
 * @returns {RowMarker[]}
 */
export function getRowMarkersForRow(rowNumber, markers) {
  if (!Number.isInteger(rowNumber) || rowNumber <= 0 || !Array.isArray(markers) || markers.length === 0) {
    return [];
  }
  return markers.filter((marker) => marker && marker.rowNumber === rowNumber);
}
