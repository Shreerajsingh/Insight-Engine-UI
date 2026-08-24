import type { Cell, ValueFormat } from '../types';

export function formatValue(value: Cell, format: ValueFormat = 'NUMBER'): string {
  if (value === null || value === '') return '—';

  if (format === 'TEXT' || typeof value === 'string') return String(value);

  switch (format) {
    case 'DURATION_MS':
      return formatDuration(value);
    case 'PERCENT':

      return `${round(value, 1)}%`;
    case 'MONEY':

      return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
    default:
      return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
  }
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms)) return '—';

  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${minutes}:${pad(seconds)}`;
}

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

export const formatMinutes = (seconds: number | null): string | null => {
  if (seconds === null) return null;
  if (seconds < 60) return `${seconds}s`;

  return `${Math.round(seconds / 60)} min`;
};

const pad = (value: number) => String(value).padStart(2, '0');
const round = (value: number, places: number) =>
  String(Number(value.toFixed(places)));
