/**
 * @typedef {{
 *   stitchesCount?: number | null,
 *   rowsCount?: number | null,
 *   widthPreWashCm?: number | null,
 *   heightPreWashCm?: number | null,
 *   widthPostWashCm?: number | null,
 *   heightPostWashCm?: number | null
 * }} GaugeSampleInput
 *
 * @typedef {{
 *   widthChangePct: number | null,
 *   heightChangePct: number | null,
 *   stitchesPerCm: number | null,
 *   rowsPerCm: number | null
 * }} GaugeMetrics
 *
 * @typedef {{
 *   targetWidthCm?: number | null,
 *   targetHeightCm?: number | null,
 *   stitchesPerCm?: number | null,
 *   rowsPerCm?: number | null
 * }} TargetDimensionsInput
 *
 * @typedef {{
 *   castOnStitches: number | null,
 *   targetRows: number | null
 * }} TargetCountsResult
 */

/**
 * Checks if a value is a finite positive number.
 * @param {number | null | undefined} value
 * @returns {value is number}
 */
function isPositive(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * Computes percentage change from pre-wash to post-wash dimension.
 * Negative values indicate shrinkage; positive values indicate stretch.
 * @param {number | null | undefined} preCm
 * @param {number | null | undefined} postCm
 * @returns {number | null}
 */
function computeDimensionChangePct(preCm, postCm) {
  if (!isPositive(preCm) || !isPositive(postCm)) {
    return null;
  }
  return ((postCm - preCm) / preCm) * 100;
}

/**
 * Computes post-wash stitch/row density per 1 cm and wet-blocking (ВТО) shrinkage/stretch %.
 * @param {GaugeSampleInput} input
 * @returns {GaugeMetrics}
 */
export function calculateGaugeMetrics(input) {
  const widthChangePct = computeDimensionChangePct(input.widthPreWashCm, input.widthPostWashCm);
  const heightChangePct = computeDimensionChangePct(input.heightPreWashCm, input.heightPostWashCm);

  const stitchesPerCm =
    isPositive(input.stitchesCount) && isPositive(input.widthPostWashCm)
      ? input.stitchesCount / input.widthPostWashCm
      : null;

  const rowsPerCm =
    isPositive(input.rowsCount) && isPositive(input.heightPostWashCm)
      ? input.rowsCount / input.heightPostWashCm
      : null;

  return {
    widthChangePct,
    heightChangePct,
    stitchesPerCm,
    rowsPerCm
  };
}

/**
 * Calculates required cast-on stitches and target rows for desired garment dimensions.
 * @param {TargetDimensionsInput} input
 * @returns {TargetCountsResult}
 */
export function calculateTargetCounts(input) {
  const castOnStitches =
    isPositive(input.targetWidthCm) && isPositive(input.stitchesPerCm)
      ? Math.round(input.targetWidthCm * input.stitchesPerCm)
      : null;

  const targetRows =
    isPositive(input.targetHeightCm) && isPositive(input.rowsPerCm)
      ? Math.round(input.targetHeightCm * input.rowsPerCm)
      : null;

  return {
    castOnStitches,
    targetRows
  };
}
