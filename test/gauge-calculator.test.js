import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateGaugeMetrics,
  calculateTargetCounts
} from '../src/core/gauge-calculator.js';

test('calculateGaugeMetrics computes shrinkage, stretch, and post-wash density per cm', () => {
  // Sample: 22 stitches, 30 rows. Pre-wash: 10 x 10 cm. Post-wash: 9 x 11 cm.
  // Width shrinkage: (9 - 10) / 10 * 100 = -10%
  // Height stretch: (11 - 10) / 10 * 100 = +10%
  // Stitches per cm: 22 / 9 = 2.4444...
  // Rows per cm: 30 / 11 = 2.7272...
  const result = calculateGaugeMetrics({
    stitchesCount: 22,
    rowsCount: 30,
    widthPreWashCm: 10,
    heightPreWashCm: 10,
    widthPostWashCm: 9,
    heightPostWashCm: 11
  });

  assert.equal(result.widthChangePct, -10);
  assert.equal(result.heightChangePct, 10);
  assert.ok(result.stitchesPerCm !== null);
  assert.ok(result.rowsPerCm !== null);
  assert.ok(Math.abs(result.stitchesPerCm - 22 / 9) < 1e-6);
  assert.ok(Math.abs(result.rowsPerCm - 30 / 11) < 1e-6);
});

test('calculateGaugeMetrics handles zero or missing pre-wash dimensions gracefully', () => {
  const result = calculateGaugeMetrics({
    stitchesCount: 20,
    rowsCount: 28,
    widthPreWashCm: null,
    heightPreWashCm: 0,
    widthPostWashCm: 10,
    heightPostWashCm: 10
  });

  assert.equal(result.widthChangePct, null);
  assert.equal(result.heightChangePct, null);
  assert.equal(result.stitchesPerCm, 2);
  assert.equal(result.rowsPerCm, 2.8);
});

test('calculateTargetCounts computes rounded cast-on stitches and target rows for desired dimensions', () => {
  const counts = calculateTargetCounts({
    targetWidthCm: 52,
    targetHeightCm: 64,
    stitchesPerCm: 2.2,
    rowsPerCm: 3.0
  });

  // 52 * 2.2 = 114.4 -> 114
  // 64 * 3.0 = 192 -> 192
  assert.equal(counts.castOnStitches, 114);
  assert.equal(counts.targetRows, 192);
});
