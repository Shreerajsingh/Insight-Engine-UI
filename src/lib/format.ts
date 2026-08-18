import type { Cell, ValueFormat } from '../types';

/**
 * How a value is printed, driven by the `format` the composing agent set on the series.
 *
 * It lives on the series rather than being sniffed from the value because a number cannot
 * tell you what it is: `61.4` is a percentage, `424000` is seven minutes, and both are
 * "number" to a formatter that only sees the value.
 */
export function formatValue(value: Cell, format: ValueFormat = 'NUMBER'): string {
  if (value === null || value === '') return '—';

  if (format === 'TEXT' || typeof value === 'string') return String(value);

  switch (format) {
    case 'DURATION_MS':
      return formatDuration(value);
    case 'PERCENT':
      // The column already holds 0-100 — every `*_percentage` in this schema does.
      return `${round(value, 1)}%`;
    case 'MONEY':
      // No currency symbol: the amount columns don't carry one, and the series label is
      // where the agent puts it. Guessing a symbol is worse than omitting it.
      return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
    default:
      return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
  }
}

/**
 * Milliseconds as a duration, at the precision the magnitude deserves: an offset into a
 * meeting reads as `23:04`, a short span as `48s`.
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms)) return '—';

  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${minutes}:${pad(seconds)}`;
}

/**
 * Axis ticks are tighter than tooltips: 12k rather than 12,000.
 *
 * `asClock` keeps a duration axis in one form. `formatDuration` drops to `48s` below a minute,
 * which is the right thing to say about one value and the wrong thing to put on an axis whose
 * other ticks read `1:40` — two notations on one scale reads as two units.
 */
export function formatTick(value: Cell, format: ValueFormat = 'NUMBER', asClock = false): string {
  if (typeof value !== 'number') return formatValue(value, format);

  if (format === 'DURATION_MS' && asClock) {
    const totalSeconds = Math.round(value / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    return `${minutes}:${pad(totalSeconds % 60)}`;
  }

  if (format === 'NUMBER' && Math.abs(value) >= 10_000) {
    return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 })
      .format(value);
  }
  return formatValue(value, format);
}

export function formatMeetingDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * A meeting's length, at a precision that carries information.
 *
 * Under a minute reads in seconds: "0 min" for a 41-second call says the duration is unknown or
 * broken, when it is neither.
 */
export const formatMinutes = (seconds: number | null): string | null => {
  if (seconds === null) return null;
  if (seconds < 60) return `${seconds}s`;

  return `${Math.round(seconds / 60)} min`;
};

const pad = (value: number) => String(value).padStart(2, '0');
const round = (value: number, places: number) =>
  String(Number(value.toFixed(places)));
