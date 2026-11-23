/**
 * @param {number} ms
 * @returns {string}
 */
export function formatDuration(ms) {
  const safeSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds]
    .map((unit) => String(unit).padStart(2, '0'))
    .join(':');
}

/**
 * @param {string} isoString
 * @returns {{ time: string, date: string }}
 */
export function formatRowTimestamp(isoString) {
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) {
    return { time: '--:--:--', date: '' };
  }

  const pad = (/** @type {number} */ n) => String(n).padStart(2, '0');
  const time = `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}:${pad(parsed.getSeconds())}`;
  const date = `${pad(parsed.getDate())}.${pad(parsed.getMonth() + 1)}.${parsed.getFullYear()}`;
  return { time, date };
}
