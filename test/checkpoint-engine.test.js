import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldTriggerStitchCheck,
  evaluateRowRules,
  getRowMarkersForRow
} from '../src/core/checkpoint-engine.js';

test('shouldTriggerStitchCheck triggers only on positive multiples of interval', () => {
  assert.equal(shouldTriggerStitchCheck(0, 10), false);
  assert.equal(shouldTriggerStitchCheck(5, 10), false);
  assert.equal(shouldTriggerStitchCheck(10, 10), true);
  assert.equal(shouldTriggerStitchCheck(20, 10), true);
  assert.equal(shouldTriggerStitchCheck(15, 15), true);
  assert.equal(shouldTriggerStitchCheck(10, 0), false);
  assert.equal(shouldTriggerStitchCheck(10, null), false);
});

test('evaluateRowRules evaluates periodic action vs rest rows and respects startRow and repeatCount', () => {
  const rules = [
    {
      id: 'rule-1',
      label: 'Сделайте прибавки реглана',
      everyNRows: 2,
      startRow: 1,
      repeatCount: 3
    }
  ];

  // Row 0: no active rules
  assert.deepEqual(evaluateRowRules(0, rules), []);

  // Row 1: 1st action
  assert.deepEqual(evaluateRowRules(1, rules), [
    {
      ruleId: 'rule-1',
      isAction: true,
      text: 'Сделайте прибавки реглана',
      occurrence: 1,
      totalRepeats: 3
    }
  ]);

  // Row 2: rest row between actions
  assert.deepEqual(evaluateRowRules(2, rules), [
    {
      ruleId: 'rule-1',
      isAction: false,
      text: 'Вяжем по рисунку',
      occurrence: null,
      totalRepeats: 3
    }
  ]);

  // Row 5: 3rd (final) action
  assert.deepEqual(evaluateRowRules(5, rules), [
    {
      ruleId: 'rule-1',
      isAction: true,
      text: 'Сделайте прибавки реглана',
      occurrence: 3,
      totalRepeats: 3
    }
  ]);

  // Row 6: rule is finished after 3rd action
  assert.deepEqual(evaluateRowRules(6, rules), []);
});

test('getRowMarkersForRow returns markers matching the target row number', () => {
  const markers = [
    { id: 'm1', rowNumber: 42, text: 'Разделить рукава' },
    { id: 'm2', rowNumber: 42, text: 'Поставить маркеры пройм' },
    { id: 'm3', rowNumber: 60, text: 'Начать резинку' }
  ];

  assert.deepEqual(getRowMarkersForRow(0, markers), []);
  assert.deepEqual(getRowMarkersForRow(41, markers), []);
  assert.deepEqual(getRowMarkersForRow(42, markers), [
    { id: 'm1', rowNumber: 42, text: 'Разделить рукава' },
    { id: 'm2', rowNumber: 42, text: 'Поставить маркеры пройм' }
  ]);
  assert.deepEqual(getRowMarkersForRow(60, null), []);
});
